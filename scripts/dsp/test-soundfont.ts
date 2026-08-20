/**
 * Does the SoundFont route actually play a sound bank?
 *
 * The file this replaces logged "Initializing SpessaSynth Core" without ever
 * importing it, carried six hand-written preset names for a .sf2 that is not
 * in this repository, and played two oscillators through a biquad — a synth
 * wearing a sampler's name, which is exactly the distinction the INSTRUMENT
 * route exists to make against the SYNTH route.
 *
 * So the checks are: does it read presets out of a real file rather than a
 * list we wrote, does the pitch follow the MIDI note, and does it refuse
 * clearly when there is no bank instead of falling back to a tone.
 */
import { SoundFontEngine, SoundFontUnavailableError } from '../../src/audio/soundFont';

let failures = 0;
function check(label: string, ok: boolean, detail: string) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(52)} ${detail}`);
}

/** Autocorrelation, because a sawtooth defeats zero-crossing counting. */
function pitchHz(x: Float32Array, sr: number): number {
  const min = Math.floor(sr / 1200);
  const max = Math.floor(sr / 60);
  let best = 0;
  let bestLag = 0;
  for (let lag = min; lag <= max; lag++) {
    let sum = 0;
    for (let i = 0; i + lag < x.length; i++) sum += x[i] * x[i + lag];
    if (sum > best) {
      best = sum;
      bestLag = lag;
    }
  }
  return bestLag ? sr / bestLag : 0;
}

const rms = (x: Float32Array) => {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  return Math.sqrt(s / x.length);
};

(async () => {
  console.log('=== SOUNDFONT PLAYBACK ===\n');

  console.log('-- with no bank loaded --');
  {
    const engine = new SoundFontEngine();
    check('it reports itself as not loaded', !engine.isLoaded, `isLoaded=${engine.isLoaded}`);
    let reason = '';
    try {
      await engine.renderNote({ midiNote: 69 });
    } catch (err) {
      reason = err instanceof SoundFontUnavailableError ? err.reason : 'wrong error type';
    }
    check(
      'playing refuses with a named reason',
      reason === 'NO_BANK_LOADED',
      `${reason} — the old engine would have played an oscillator here`
    );
  }

  console.log('\n-- loading a real file --');
  const engine = new SoundFontEngine();
  const file = SoundFontEngine.builtInSampleBank();
  const loaded = engine.load(file, 'built-in sample bank');
  check('a real sound bank file loads', engine.isLoaded, `${loaded.byteLength} bytes`);
  check(
    'the preset list comes out of the file',
    loaded.presets.length > 0,
    loaded.presets.map((p) => `${p.name} (prog ${p.program})`).join(', ')
  );
  check(
    'and it is not the six names the old engine invented',
    !loaded.presets.some((p) => /Concert Grand Piano|Vintage Rhodes/.test(p.name)),
    'no hand-written preset names survived'
  );

  console.log('\n-- it renders, and the pitch follows the note --');
  {
    const cases: [number, number][] = [
      [57, 220],
      [69, 440],
      [81, 880],
    ];
    for (const [midi, expect] of cases) {
      const out = await engine.renderNote({ midiNote: midi, holdSeconds: 0.5, tailSeconds: 0.1 });
      const seg = out.left.subarray(Math.floor(out.left.length * 0.2), Math.floor(out.left.length * 0.7));
      const hz = pitchHz(seg, out.sampleRate);
      const cents = 1200 * Math.log2(hz / expect);
      check(
        `MIDI ${midi} renders at ${expect} Hz`,
        Math.abs(cents) < 40,
        `${hz.toFixed(1)} Hz — ${cents >= 0 ? '+' : ''}${cents.toFixed(1)} cents`
      );
    }
  }

  console.log('\n-- the render is audio, and it is shaped --');
  {
    const out = await engine.renderNote({ midiNote: 69, holdSeconds: 0.4, tailSeconds: 0.4 });
    check('it produced non-silent audio', rms(out.left) > 0.001, `rms ${rms(out.left).toFixed(4)}`);
    const held = out.left.subarray(0, Math.floor(0.4 * out.sampleRate));
    const tail = out.left.subarray(Math.floor(0.45 * out.sampleRate));
    check(
      'the tail after note-off is quieter than the held note',
      rms(tail) < rms(held),
      `held ${rms(held).toFixed(4)} → tail ${rms(tail).toFixed(4)} — the key lifting is audible`
    );
    const loud = await engine.renderNote({ midiNote: 69, velocity: 127, holdSeconds: 0.3, tailSeconds: 0.1 });
    const soft = await engine.renderNote({ midiNote: 69, velocity: 30, holdSeconds: 0.3, tailSeconds: 0.1 });
    check(
      'velocity changes the output',
      rms(loud.left) > rms(soft.left) * 1.2,
      `127 → ${rms(loud.left).toFixed(4)} · 30 → ${rms(soft.left).toFixed(4)}`
    );
  }

  console.log('\n-- a program the bank does not have --');
  {
    let reason = '';
    let message = '';
    try {
      await engine.renderNote({ midiNote: 69, program: 99 });
    } catch (err) {
      if (err instanceof SoundFontUnavailableError) {
        reason = err.reason;
        message = err.message;
      }
    }
    check(
      'is refused, and the message names what the bank has',
      reason === 'PRESET_NOT_IN_BANK' && /contains/.test(message),
      message.slice(0, 74)
    );
  }

  console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
  process.exit(failures === 0 ? 0 : 1);
})();
