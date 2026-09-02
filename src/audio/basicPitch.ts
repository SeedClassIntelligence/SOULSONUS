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

// The wasm-only subpath, not the package root: the root resolves to
// onnxruntime-web's full bundle, which references the WebGPU/JSEP backend
// and its 26.8 MB wasm file. Vite's build-time asset scanner copies that
// file into dist/assets regardless of whether it is ever fetched -- and it
// never is here, since wasmPaths below is pinned to the plain build and
// executionProviders never asks for anything but 'wasm'. Cloudflare Pages
// enforces a 25 MiB per-file limit on deployed assets, which is what
// actually surfaced this; Netlify's limit is high enough that the dead
// 26.8 MB file went unnoticed.
import * as ort from 'onnxruntime-web/wasm';

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
  /**
   * This creator's measured response, from `measurePitchResponse`. When it
   * carries a verified gate, that gate is used instead of the shipped
   * instrument default. An explicit threshold above still wins over it.
   */
  creatorPeaks?: { verifiedGate?: number | null } | null;
}

export interface Transcription {
  notes: TranscribedNote[];
  /** How long the analysed audio actually was. */
  durationSeconds: number;
  windows: number;
  /** Where the notes came from. There is exactly one possible value, on purpose. */
  engine: 'BASIC_PITCH_ONNX';
  thresholds: { onset: number; frame: number; minNoteMs: number };
  /**
   * Where the gate came from. A creator reading a disappointing transcription
   * deserves to know whether it was measured against them or against a
   * plucked string.
   */
  gateSource: 'creator' | 'default' | 'explicit';
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
/**
 * What this creator's voice actually reaches, measured from one calibration
 * take.
 *
 * A global threshold cannot serve two people. One creator's hum peaks the
 * onset head at 0.48, another's at 0.62, a third's at 0.35 -- and the
 * instrument-tuned default of 0.50 silently discards two of the three. This
 * returns their measured peaks so a gate can be set relative to the person
 * performing, the same way `rmsToVelocity` already normalises velocity against
 * a running peak rather than an absolute.
 *
 * Returns peaks only. It deliberately does not choose a threshold: that is a
 * decision about a person, and it belongs in their signature where it can be
 * seen, not buried in a constant.
 */
export async function measurePitchResponse(
  samples: Float32Array,
  sampleRate: number,
  modelUrl?: string
): Promise<PitchResponse> {
  const session = await loadBasicPitch(modelUrl);
  const mono = resampleTo22050(samples, sampleRate);
  const { frame, onset, windows } = await activations(mono, session);

  let onsetPeak = 0;
  let framePeak = 0;
  for (const row of onset) for (const v of row) if (v > onsetPeak) onsetPeak = v;
  for (const row of frame) for (const v of row) if (v > framePeak) framePeak = v;

  // Search downward from just under their peak, keeping the first threshold
  // that actually returns notes. Highest-that-works is deliberate: it is the
  // strictest gate this voice clears, so it admits their playing without
  // opening the door any wider than their playing needs.
  let verifiedGate: number | null = null;
  let notesAtGate = 0;
  for (let t = Math.min(BP_DEFAULT_ONSET, onsetPeak); t >= GATE_FLOOR; t -= GATE_SEARCH_STEP) {
    const found = decodeNotes(frame, onset, {
      onsetThreshold: t,
      frameThreshold: BP_DEFAULT_FRAME,
      minNoteMs: 58,
    });
    if (found.length > 0) {
      // Floor, never round. Rounding a working threshold upward makes the
      // stored gate marginally stricter than the one just verified, and a peak
      // sitting exactly on the boundary then fails `onset[f] >= t` -- the
      // search reports a gate that returns nothing when it is used. Flooring
      // can only ever loosen by less than a thousandth.
      verifiedGate = Math.floor(t * 1000) / 1000;
      notesAtGate = found.length;
      break;
    }
  }

  return { onsetPeak, framePeak, verifiedGate, notesAtGate, windows };
}

/** Basic Pitch's own shipped gate, tuned for instruments. */
export const BP_DEFAULT_ONSET = 0.5;
export const BP_DEFAULT_FRAME = 0.3;

/**
 * Below this the transcriber stops measuring and starts inventing.
 *
 * A one-note bass seed returns one note from 0.50 down to 0.30, then three at
 * 0.25 and six at 0.20. Nothing below this is offered to a creator as their
 * own playing.
 */
export const GATE_FLOOR = 0.28;

/**
 * Why the gate is searched for rather than calculated.
 *
 * The obvious design is a fraction of the creator's measured peak. It does not
 * work, and the reason is in `decodeNotes`: a note is found on a rising edge,
 * `onset[f] >= t && onset[f - 1] < t`. Lower the threshold past the value of
 * the frame *before* the peak and that edge disappears, so the note vanishes
 * -- until the threshold drops far enough that an earlier frame becomes the
 * edge and it reappears. The count is not monotonic in the threshold.
 *
 * Measured on one mouth take, frame held at 0.30:
 *
 *     onset 0.450 -> 1 note
 *     onset 0.420 -> 0 notes
 *     onset 0.411 -> 0 notes
 *     onset 0.400 -> 1 note
 *
 * A computed 0.85 x 0.484 = 0.411 lands squarely in that hole. Where the hole
 * sits depends on the shape of that creator's activations, so no ratio is safe
 * for everyone. The gate is therefore found by trying real values against the
 * creator's own calibration take and keeping the highest one that actually
 * yields notes -- an outcome that was observed rather than predicted.
 */
export const GATE_SEARCH_STEP = 0.01;

export interface PitchResponse {
  /** Highest activation this creator's voice produced on each head. */
  onsetPeak: number;
  framePeak: number;
  /**
   * The highest onset threshold that actually returned notes on their
   * calibration take. Null when no threshold above the floor did -- which is
   * the honest answer for a take with no pitched material in it.
   */
  verifiedGate: number | null;
  /** How many notes that gate found. Zero whenever `verifiedGate` is null. */
  notesAtGate: number;
  windows: number;
}

/**
 * The transcription gate for one creator.
 *
 * A verified gate is used when one was found. Otherwise the shipped instrument
 * defaults, unchanged -- a creator who has not calibrated is transcribed
 * exactly as before. The gate is never raised above the default: the point is
 * to stop discarding soft attacks, not to raise the bar on loud ones.
 */
export function gateForCreator(
  measured?: { verifiedGate?: number | null } | null
): { onsetThreshold: number; frameThreshold: number; measured: boolean } {
  const gate = measured?.verifiedGate;
  if (typeof gate !== 'number' || !(gate >= GATE_FLOOR)) {
    return { onsetThreshold: BP_DEFAULT_ONSET, frameThreshold: BP_DEFAULT_FRAME, measured: false };
  }
  return {
    onsetThreshold: Math.min(BP_DEFAULT_ONSET, gate),
    frameThreshold: BP_DEFAULT_FRAME,
    measured: true,
  };
}

export async function transcribe(
  audio: Float32Array,
  sampleRate: number,
  options: TranscriptionOptions = {}
): Promise<Transcription> {
  // An explicit threshold still wins -- this is a default, not an override.
  const gate = gateForCreator(options.creatorPeaks);
  const onsetThreshold = options.onsetThreshold ?? gate.onsetThreshold;
  const frameThreshold = options.frameThreshold ?? gate.frameThreshold;
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
    gateSource: options.onsetThreshold !== undefined ? 'explicit' : gate.measured ? 'creator' : 'default',
  };
}
