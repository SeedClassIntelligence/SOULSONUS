/**
 * Audio to notes, through Spotify's Basic Pitch.
 *
 * `public/models/basic_pitch.onnx` has been in this repository the whole time,
 * and `transcriptionEngine.ts` held a session for it that no file imported.
 * Worse, where that engine did run the model it fed the tensor under the name
 * `input` -- the graph's input is `serving_default_input_2:0`, so the call
 * threw every time -- and it discarded the result regardless, producing its
 * notes from autocorrelation while reporting the engine as
 * `ONNX_BASIC_PITCH_NEURAL`. Meanwhile the import modal wrote four literal
 * NoteEvents whatever file you gave it.
 *
 * This is the real path. The three heads and their meanings were established
 * by running the model on a synthesised A4 followed by a C5 and reading which
 * output moved -- the onset head lit 5 cells at exactly MIDI 69 and 72, the
 * frame head lit 153 -- not by assuming an export order.
 */

import * as ort from 'onnxruntime-web';

/** Basic Pitch's own constants. Everything else here is derived from them. */
export const BP_SAMPLE_RATE = 22050;
/** One inference window, ~1.988 s. */
export const BP_WINDOW = 43844;
/** CQT hop, so one output frame is 256/22050 = 11.61 ms. */
export const BP_HOP = 256;
/** Frames of overlap between windows, half trimmed from each side. */
export const BP_OVERLAP_FRAMES = 30;
export const BP_OVERLAP_SAMPLES = BP_OVERLAP_FRAMES * BP_HOP;
/** 88 piano keys, starting at A0. */
export const BP_MIN_MIDI = 21;

export const BP_FRAME_SECONDS = BP_HOP / BP_SAMPLE_RATE;

const INPUT_NAME = 'serving_default_input_2:0';
/**
 * Output names, and which head each one is.
 *
 * `:0` is the 264-bin pitch contour, which this decoder does not use -- it is
 * for sub-semitone pitch bend, and claiming bend we do not compute would be
 * the same fault as the engine this replaces.
 */
const HEAD_FRAME = 'StatefulPartitionedCall:1';
const HEAD_ONSET = 'StatefulPartitionedCall:2';

export interface TranscribedNote {
  midiNote: number;
  startSeconds: number;
  durationSeconds: number;
  /** The onset head's activation at the attack, 0..1. A model output, not a guess. */
  onsetStrength: number;
  /** Mean frame activation across the note's life, 0..1. */
  sustainStrength: number;
}

export interface TranscriptionOptions {
  /** Model URL. Defaults to the copy already in this repository. */
  modelUrl?: string;
  /** Onset head threshold. Basic Pitch's own default is 0.5. */
  onsetThreshold?: number;
  /** Frame head threshold for sustaining a note. Basic Pitch's default is 0.3. */
  frameThreshold?: number;
  /** Notes shorter than this are dropped as detection noise. */
  minNoteMs?: number;
}

export interface Transcription {
  notes: TranscribedNote[];
  /** How long the analysed audio actually was. */
  durationSeconds: number;
  windows: number;
  /** Where the notes came from. There is exactly one possible value, on purpose. */
  engine: 'BASIC_PITCH_ONNX';
  thresholds: { onset: number; frame: number; minNoteMs: number };
}

/** Linear resample to Basic Pitch's rate. The model has no opinion about ours. */
export function resampleTo22050(input: Float32Array, sampleRate: number): Float32Array {
  if (sampleRate === BP_SAMPLE_RATE) return input;
  const ratio = BP_SAMPLE_RATE / sampleRate;
  const out = new Float32Array(Math.max(1, Math.round(input.length * ratio)));
  for (let i = 0; i < out.length; i++) {
    const src = i / ratio;
    const a = Math.floor(src);
    const b = Math.min(input.length - 1, a + 1);
    const t = src - a;
    out[i] = (input[a] || 0) * (1 - t) + (input[b] || 0) * t;
  }
  return out;
}

let session: ort.InferenceSession | null = null;
let loading: Promise<ort.InferenceSession> | null = null;

/**
 * Loads the model once.
 *
 * Throws if it cannot be loaded. There is deliberately no fallback path: the
 * engine this replaces fell back to autocorrelation while still reporting
 * itself as neural, and a caller that cannot tell which one answered has been
 * told nothing.
 */
export async function loadBasicPitch(modelUrl = '/models/basic_pitch.onnx'): Promise<ort.InferenceSession> {
  if (session) return session;
  if (!loading) {
    ort.env.wasm.numThreads = 1;
    // Serve the runtime's own wasm from a path we control.
    //
    // Left to itself onnxruntime-web fetches its .wasm relative to the page,
    // the SPA catch-all answers with index.html, and the loader reports
    // "expected magic word 00 61 73 6d, found 3c 21 64 6f" -- which is the
    // first four bytes of `<!do`. The same redirect that would have made the
    // realization service answer with a web page.
    // Named explicitly rather than as a directory: given only a directory the
    // loader reaches for the WebGPU (`jsep`) build, which is 27 MB and which
    // we have no use for -- this is a 230 KB model on the CPU. Pointing at the
    // two files by name settles the choice.
    ort.env.wasm.wasmPaths = {
      wasm: '/ort/ort-wasm-simd-threaded.wasm',
      mjs: '/ort/ort-wasm-simd-threaded.mjs',
    };
    loading = ort.InferenceSession.create(modelUrl, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    }).then((s) => {
      session = s;
      return s;
    });
  }
  return loading;
}

/** Frame-major activation grid: `[frame][pitch]`, 88 pitches from A0. */
type Grid = Float32Array[];

/**
 * Runs the model across the whole signal.
 *
 * Windows overlap by 30 frames and half of that is trimmed from each side of
 * every interior window, which is what stops a note that straddles a window
 * boundary from being cut in two.
 */
async function activations(
  audio: Float32Array,
  sess: ort.InferenceSession
): Promise<{ frame: Grid; onset: Grid; windows: number }> {
  const half = BP_OVERLAP_SAMPLES / 2;
  const padded = new Float32Array(audio.length + half);
  padded.set(audio, half);

  const hop = BP_WINDOW - BP_OVERLAP_SAMPLES;
  const frame: Grid = [];
  const onset: Grid = [];
  let windows = 0;

  for (let start = 0; start < padded.length; start += hop) {
    const chunk = new Float32Array(BP_WINDOW);
    chunk.set(padded.subarray(start, Math.min(padded.length, start + BP_WINDOW)));
    const out = await sess.run({ [INPUT_NAME]: new ort.Tensor('float32', chunk, [1, BP_WINDOW, 1]) });
    windows++;

    const f = out[HEAD_FRAME];
    const o = out[HEAD_ONSET];
    const frames = f.dims[1] as number;
    const pitches = f.dims[2] as number;
    const trim = BP_OVERLAP_FRAMES / 2;

    for (let i = trim; i < frames - trim; i++) {
      const fr = new Float32Array(pitches);
      const on = new Float32Array(pitches);
      for (let p = 0; p < pitches; p++) {
        fr[p] = (f.data as Float32Array)[i * pitches + p];
        on[p] = (o.data as Float32Array)[i * pitches + p];
      }
      frame.push(fr);
      onset.push(on);
    }
    if (start + BP_WINDOW >= padded.length) break;
  }
  return { frame, onset, windows };
}

/**
 * Turns activation grids into notes.
 *
 * A note begins where the onset head crosses its threshold on a rising edge,
 * and lives while the frame head stays above its own. This is a plain reading
 * of the two heads rather than Basic Pitch's full polyphonic decoder, which
 * also does energy-based note splitting -- a simplification, and named as one
 * rather than presented as the reference implementation.
 */
export function decodeNotes(
  frame: Grid,
  onset: Grid,
  opts: Required<Pick<TranscriptionOptions, 'onsetThreshold' | 'frameThreshold' | 'minNoteMs'>>
): TranscribedNote[] {
  const notes: TranscribedNote[] = [];
  if (!frame.length) return notes;
  const pitches = frame[0].length;
  const minFrames = Math.max(1, Math.round(opts.minNoteMs / 1000 / BP_FRAME_SECONDS));

  for (let p = 0; p < pitches; p++) {
    let f = 0;
    while (f < frame.length) {
      const rising = onset[f][p] >= opts.onsetThreshold && (f === 0 || onset[f - 1][p] < opts.onsetThreshold);
      if (!rising) {
        f++;
        continue;
      }
      const startFrame = f;
      const onsetStrength = onset[f][p];
      let end = f + 1;
      let sustainSum = frame[f][p];
      while (end < frame.length && frame[end][p] >= opts.frameThreshold) {
        // A fresh onset on the same pitch ends the previous note rather than
        // extending it -- a repeated note is two notes, not one long one.
        if (onset[end][p] >= opts.onsetThreshold && onset[end - 1][p] < opts.onsetThreshold) break;
        sustainSum += frame[end][p];
        end++;
      }
      const length = end - startFrame;
      if (length >= minFrames) {
        notes.push({
          midiNote: p + BP_MIN_MIDI,
          startSeconds: startFrame * BP_FRAME_SECONDS,
          durationSeconds: length * BP_FRAME_SECONDS,
          onsetStrength: Math.round(onsetStrength * 1000) / 1000,
          sustainStrength: Math.round((sustainSum / length) * 1000) / 1000,
        });
      }
      f = Math.max(end, startFrame + 1);
    }
  }
  return notes.sort((a, b) => a.startSeconds - b.startSeconds || a.midiNote - b.midiNote);
}

/** The whole path: audio in, notes out, nothing invented in between. */
export async function transcribe(
  audio: Float32Array,
  sampleRate: number,
  options: TranscriptionOptions = {}
): Promise<Transcription> {
  const onsetThreshold = options.onsetThreshold ?? 0.5;
  const frameThreshold = options.frameThreshold ?? 0.3;
  const minNoteMs = options.minNoteMs ?? 58; // five frames
  const sess = await loadBasicPitch(options.modelUrl);
  const resampled = resampleTo22050(audio, sampleRate);
  const { frame, onset, windows } = await activations(resampled, sess);
  const notes = decodeNotes(frame, onset, { onsetThreshold, frameThreshold, minNoteMs });
  return {
    notes,
    durationSeconds: audio.length / sampleRate,
    windows,
    engine: 'BASIC_PITCH_ONNX',
    thresholds: { onset: onsetThreshold, frame: frameThreshold, minNoteMs },
  };
}
