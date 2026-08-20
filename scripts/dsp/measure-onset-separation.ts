/**
 * How many sounds does the analyser hear when several are played at once?
 *
 * A measurement, not a test. It prints what was played against what came back
 * and asserts nothing, because the honest answer today is that this is worse
 * than the documentation claimed and the number is the point.
 *
 * The material is deliberately unambiguous: a 70 Hz burst and a band-limited
 * noise burst above 6 kHz occupy band groups that cannot be confused with each
 * other. That makes the count meaningful even though the *labels* are not:
 * the classifier's prototypes are for mouth-made kick, snare and hi-hat
 * sounds, and neither a sine nor a noise burst nor an acoustic drum recording
 * is beatboxing. What this can settle is whether two things sounding at once
 * are noticed as two things. What it cannot settle is whether a label is
 * right, and nothing here pretends otherwise.
 *
 * Run:  npx esbuild scripts/dsp/measure-onset-separation.ts --bundle --platform=node | node
 */
import { analyzePerformanceBuffer } from '../../src/audio/offlinePerformanceAnalysis';

const SR = 44100;

/** A low burst: 70 Hz, in the sub/low group and essentially nowhere else. */
function low(out: Float32Array, atSec: number, gain = 0.8, dur = 0.12) {
  const start = Math.floor(atSec * SR);
  const len = Math.floor(dur * SR);
  for (let i = 0; i < len && start + i < out.length; i++) {
    const t = i / SR;
    out[start + i] += Math.sin(2 * Math.PI * 70 * t) * Math.min(1, t * 400) * Math.exp(-t * 24) * gain;
  }
}

/** A high burst: noise above roughly 6 kHz, in the air group and nowhere else. */
function high(out: Float32Array, atSec: number, gain = 0.5, dur = 0.04) {
  const start = Math.floor(atSec * SR);
  const len = Math.floor(dur * SR);
  let p1 = 0;
  let p2 = 0;
  for (let i = 0; i < len && start + i < out.length; i++) {
    const t = i / SR;
    const w = Math.random() * 2 - 1;
    const h1 = w - p1 * 0.55;
    p1 = w;
    const h2 = h1 - p2 * 0.55;
    p2 = h1;
    out[start + i] += h2 * Math.min(1, t * 2000) * Math.exp(-t * 120) * gain;
  }
}

const buffer = (seconds: number, paint: (o: Float32Array) => void) => {
  const data = new Float32Array(Math.floor(seconds * SR));
  paint(data);
  return {
    sampleRate: SR,
    length: data.length,
    duration: seconds,
    numberOfChannels: 1,
    getChannelData: () => data,
  } as unknown as AudioBuffer;
};

let played = 0;
let heard = 0;

const measure = (label: string, seconds: number, paint: (o: Float32Array) => void, sounds: number) => {
  const { events } = analyzePerformanceBuffer(buffer(seconds, paint), 'MOUTH');
  played += sounds;
  heard += events.length;
  const mark = events.length === sounds ? ' ' : events.length < sounds ? '-' : '+';
  console.log(
    `  ${mark} ${label.padEnd(40)} played ${String(sounds).padStart(2)}   heard ${String(events.length).padStart(2)}   ` +
      events.map((e) => `${e.klass}@${e.atSeconds.toFixed(3)}`).join(' ')
  );
};

console.log('=== ONSET SEPARATION, MEASURED ===\n');
console.log('  - heard fewer than were played     + heard more than were played\n');

console.log('-- one sound at a time --');
measure('a low burst alone', 1.2, (o) => low(o, 0.2), 1);
measure('a high burst alone', 1.2, (o) => high(o, 0.2), 1);
measure('two low bursts, 400 ms apart', 1.4, (o) => { low(o, 0.2); low(o, 0.6); }, 2);

console.log('\n-- two sounds close together, which is how a groove is played --');
measure('low + high at the same instant', 1.2, (o) => { low(o, 0.2); high(o, 0.2); }, 2);
measure('low, then high 30 ms later', 1.2, (o) => { low(o, 0.2); high(o, 0.23); }, 2);
measure('low, then high 80 ms later', 1.2, (o) => { low(o, 0.2); high(o, 0.28); }, 2);

console.log('\n-- a bar where most of them coincide --');
measure('4 lows on beats, 8 highs on 8ths', 2.8, (o) => {
  const beat = 0.6;
  for (let i = 0; i < 8; i++) high(o, 0.2 + (i * beat) / 2);
  for (let i = 0; i < 4; i++) low(o, 0.2 + i * beat);
}, 12);

console.log(`\n  ${played} sounds played, ${heard} heard — ${played - heard} lost.`);
console.log('  A sound played underneath another one is not mislabelled. It is gone.');
