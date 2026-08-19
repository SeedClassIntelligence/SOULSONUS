/**
 * Does the transcription actually hear what was played?
 *
 * The import path has written four literal NoteEvents for every file since it
 * was built, while a real Basic Pitch model sat in `public/models/`. Before
 * that model is allowed anywhere near the app, it has to be shown transcribing
 * signals whose contents are known exactly -- and shown *failing* on silence,
 * because an engine that returns notes for silence is a random note generator
 * with a model attached.
 */
import * as ort from 'onnxruntime-node';
import {
  BP_FRAME_SECONDS,
  BP_SAMPLE_RATE,
  decodeNotes,
  resampleTo22050,
} from '../../src/audio/basicPitch';

let failures = 0;
function check(label: string, ok: boolean, detail: string) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(50)} ${detail}`);
}

const MODEL = 'public/models/basic_pitch.onnx';
const INPUT = 'serving_default_input_2:0';
const WINDOW = 43844;
const midiToHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const name = (m: number) => `${NAMES[m % 12]}${Math.floor(m / 12) - 1}`;

/** A plucked-ish tone: a few harmonics under a decaying envelope. */
function tone(midi: number, seconds: number, sr: number): Float32Array {
  const hz = midiToHz(midi);
  const n = Math.round(seconds * sr);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const env = Math.min(1, t * 80) * Math.exp(-t * 1.4);
    out[i] =
      env *
      (0.6 * Math.sin(2 * Math.PI * hz * t) +
        0.25 * Math.sin(4 * Math.PI * hz * t) +
        0.1 * Math.sin(6 * Math.PI * hz * t));
  }
  return out;
}

/** Places tones at given times into one buffer, summing where they overlap. */
function place(events: [number, number, number][], seconds: number, sr: number): Float32Array {
  const buf = new Float32Array(Math.round(seconds * sr));
  for (const [midi, at, dur] of events) {
    const t = tone(midi, dur, sr);
    const off = Math.round(at * sr);
    for (let i = 0; i < t.length && off + i < buf.length; i++) buf[off + i] += t[i];
  }
  return buf;
}

(async () => {
  const sess = await ort.InferenceSession.create(MODEL);
  console.log('=== BASIC PITCH: DOES IT HEAR WHAT WAS PLAYED? ===\n');

  /** One window through the model, decoded. Enough for every case here. */
  async function run(audio: Float32Array, sr = BP_SAMPLE_RATE) {
    const rs = resampleTo22050(audio, sr);
    const chunk = new Float32Array(WINDOW);
    chunk.set(rs.subarray(0, Math.min(rs.length, WINDOW)));
    const out = await sess.run({ [INPUT]: new ort.Tensor('float32', chunk, [1, WINDOW, 1]) });
    const f = out['StatefulPartitionedCall:1'];
    const o = out['StatefulPartitionedCall:2'];
    const frames = f.dims[1] as number;
    const pitches = f.dims[2] as number;
    const frame: Float32Array[] = [];
    const onset: Float32Array[] = [];
    for (let i = 0; i < frames; i++) {
      const a = new Float32Array(pitches);
      const b = new Float32Array(pitches);
      for (let p = 0; p < pitches; p++) {
        a[p] = (f.data as Float32Array)[i * pitches + p];
        b[p] = (o.data as Float32Array)[i * pitches + p];
      }
      frame.push(a);
      onset.push(b);
    }
    return decodeNotes(frame, onset, { onsetThreshold: 0.5, frameThreshold: 0.3, minNoteMs: 58 });
  }

  console.log('-- a single known pitch --');
  {
    const notes = await run(place([[69, 0.1, 1.2]], 1.9, BP_SAMPLE_RATE));
    check('one note comes back', notes.length === 1, `${notes.length} notes: ${notes.map((n) => name(n.midiNote)).join(' ')}`);
    check('it is the pitch that was played', notes[0]?.midiNote === 69, `heard ${name(notes[0]?.midiNote ?? 0)}, played A4`);
    check(
      'it starts where it was played',
      Math.abs((notes[0]?.startSeconds ?? 0) - 0.1) < 0.05,
      `${(notes[0]?.startSeconds ?? 0).toFixed(3)}s vs 0.100s, frame is ${(BP_FRAME_SECONDS * 1000).toFixed(1)} ms`
    );
    check(
      'the strengths are model outputs in range',
      (notes[0]?.onsetStrength ?? 0) > 0.5 && (notes[0]?.sustainStrength ?? 0) > 0.3,
      `onset ${notes[0]?.onsetStrength} · sustain ${notes[0]?.sustainStrength}`
    );
  }

  console.log('\n-- a melody, in order --');
  {
    const played = [60, 64, 67, 72];
    const notes = await run(place(played.map((m, i) => [m, 0.08 + i * 0.42, 0.4] as [number, number, number]), 1.95, BP_SAMPLE_RATE));
    const heard = notes.map((n) => n.midiNote);
    check('four notes come back', notes.length === 4, `${notes.length}: ${notes.map((n) => name(n.midiNote)).join(' ')}`);
    check('the pitches match what was played', JSON.stringify(heard) === JSON.stringify(played), `${heard.map(name).join(' ')} vs ${played.map(name).join(' ')}`);
    const gaps = notes.slice(1).map((n, i) => n.startSeconds - notes[i].startSeconds);
    check(
      'they are spaced as they were played',
      gaps.every((g) => Math.abs(g - 0.42) < 0.06),
      gaps.map((g) => g.toFixed(3)).join(', ') + ' vs 0.420 each'
    );
  }

  console.log('\n-- a chord: three pitches at once --');
  {
    const played = [60, 64, 67];
    const notes = await run(place(played.map((m) => [m, 0.1, 1.4] as [number, number, number]), 1.9, BP_SAMPLE_RATE));
    const heard = [...new Set(notes.map((n) => n.midiNote))].sort((a, b) => a - b);
    check('it is polyphonic', heard.length >= 3, `heard ${heard.map(name).join(' ')}`);
    check('and it is the right chord', played.every((m) => heard.includes(m)), `C major triad, got ${heard.map(name).join(' ')}`);
    // Worth stating rather than hiding: a synthetic tone stack with strong
    // harmonics can light an extra bin. Reported, not silently tolerated.
    const spurious = heard.filter((m) => !played.includes(m));
    console.log(
      `        ${spurious.length ? `note: ${spurious.map(name).join(', ')} also detected — harmonic artefact of the synthetic stack` : 'no spurious pitches'}`
    );
  }

  console.log('\n-- an octave apart, which a naive pitch tracker confuses --');
  {
    const notes = await run(place([[48, 0.1, 0.8], [60, 1.0, 0.8]], 1.9, BP_SAMPLE_RATE));
    const heard = notes.map((n) => n.midiNote);
    check('both octaves are heard, distinctly', heard.includes(48) && heard.includes(60), heard.map(name).join(' '));
  }

  console.log('\n-- silence must produce nothing --');
  {
    const notes = await run(new Float32Array(Math.round(1.9 * BP_SAMPLE_RATE)));
    check('silence transcribes to no notes', notes.length === 0, `${notes.length} notes`);
  }

  console.log('\n-- noise is not a melody --');
  {
    const n = Math.round(1.9 * BP_SAMPLE_RATE);
    const noise = new Float32Array(n);
    let seed = 7;
    for (let i = 0; i < n; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      noise[i] = ((seed / 0x7fffffff) * 2 - 1) * 0.3;
    }
    const notes = await run(noise);
    check('white noise yields few or no notes', notes.length <= 2, `${notes.length} notes — a fabricator would return a tidy melody`);
  }

  console.log('\n-- the resampler --');
  {
    const at48k = place([[69, 0.1, 1.2]], 1.9, 48000);
    const notes = await run(at48k, 48000);
    check('a 48 kHz buffer transcribes correctly', notes.length === 1 && notes[0].midiNote === 69, `${notes.map((x) => name(x.midiNote)).join(' ') || 'nothing'} from 48 kHz`);
  }

  console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
  process.exit(failures === 0 ? 0 : 1);
})();
