/**
 * Does the true-peak limiter hold its ceiling?
 *
 * Runs in node against the real module — no browser needed, because this is
 * arithmetic. The signal is deliberately the hard case: a high-frequency tone
 * hard-clipped in the sample domain, which is exactly what the master chain's
 * clipper produces and exactly what puts peaks between the samples.
 */

import { limitTruePeak } from '../../src/audio/truePeakLimiter';
import { channelTruePeak } from '../../src/audio/oversampling';

const SR = 48000;
const toDb = (v: number) => 20 * Math.log10(Math.max(v, 1e-12));

let failures = 0;
function check(label: string, ok: boolean, detail: string) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(46)} ${detail}`);
}

function clippedTone(freq: number, seconds: number, ceilingDb: number): Float32Array {
  const n = Math.round(SR * seconds);
  const out = new Float32Array(n);
  const ceiling = Math.pow(10, ceilingDb / 20);
  for (let i = 0; i < n; i++) {
    // Driven well over the ceiling, then clipped — the shape a hard limiter leaves.
    const x = Math.sin((2 * Math.PI * freq * i) / SR + 0.37) * 2.2;
    out[i] = Math.max(-ceiling, Math.min(ceiling, x));
  }
  return out;
}

console.log('=== TRUE-PEAK LIMITER ===\n');

// --- 1. the hard case: clipped high-frequency content ---
const ceilingDbtp = -1;
const left = clippedTone(11000, 0.5, ceilingDbtp);
const right = clippedTone(9500, 0.5, ceilingDbtp);

const beforeTp = toDb(Math.max(channelTruePeak(left), channelTruePeak(right)));
const beforeSp = toDb(Math.max(...Array.from(left).map(Math.abs), ...Array.from(right).map(Math.abs)));
console.log(`  input: sample peak ${beforeSp.toFixed(2)} dBFS, true peak ${beforeTp.toFixed(2)} dBTP`);
check('the test signal really does overshoot', beforeTp > ceilingDbtp + 0.2,
      `${beforeTp.toFixed(2)} dBTP against a ${ceilingDbtp} dBTP ceiling`);

const limited = limitTruePeak([left, right], { ceilingDbtp, sampleRate: SR });
console.log(`  output: true peak ${limited.outputTruePeakDbtp} dBTP after ${limited.passes} pass(es), ` +
            `max gain reduction ${limited.maxGainReductionDb} dB`);

check('output is under the ceiling', limited.outputTruePeakDbtp <= ceilingDbtp + 0.01,
      `${limited.outputTruePeakDbtp} dBTP <= ${ceilingDbtp} dBTP`);
check('the limiter reports the guarantee it made', limited.withinCeiling, `withinCeiling=${limited.withinCeiling}`);

const outSp = toDb(Math.max(
  ...Array.from(limited.channels[0]).map(Math.abs),
  ...Array.from(limited.channels[1]).map(Math.abs),
));
check('sample peak is under the ceiling too', outSp <= ceilingDbtp + 0.01, `${outSp.toFixed(2)} dBFS`);

check('the reduction is proportionate', limited.maxGainReductionDb < 4,
      `${limited.maxGainReductionDb} dB for a ${(beforeTp - ceilingDbtp).toFixed(2)} dB overshoot`);

// --- 2. material already under the ceiling must be left alone ---
const quiet = new Float32Array(SR / 4);
for (let i = 0; i < quiet.length; i++) quiet[i] = Math.sin((2 * Math.PI * 220 * i) / SR) * 0.3;
const untouched = limitTruePeak([quiet, quiet], { ceilingDbtp, sampleRate: SR });
let identical = true;
for (let i = 0; i < quiet.length; i++) if (untouched.channels[0][i] !== quiet[i]) { identical = false; break; }
check('signal under the ceiling passes untouched', identical && untouched.passes === 0,
      `passes=${untouched.passes} reduction=${untouched.maxGainReductionDb} dB`);

// --- 3. the gain envelope must not chop the waveform ---
// A limiter that jumps its gain adds distortion of its own. Measure the largest
// single-sample change in gain across the limited region.
const ratio = new Float32Array(left.length);
for (let i = 0; i < left.length; i++) ratio[i] = left[i] !== 0 ? limited.channels[0][i] / left[i] : 1;
let maxStep = 0;
for (let i = 1; i < ratio.length; i++) {
  const step = Math.abs(ratio[i] - ratio[i - 1]);
  if (isFinite(step) && step > maxStep) maxStep = step;
}
check('gain moves smoothly, not in steps', maxStep < 0.02, `largest per-sample gain change ${maxStep.toFixed(5)}`);

// --- 4. a lower ceiling must reduce more ---
const lower = limitTruePeak([left, right], { ceilingDbtp: -3, sampleRate: SR });
check('a lower ceiling is honoured too', lower.outputTruePeakDbtp <= -3 + 0.01,
      `${lower.outputTruePeakDbtp} dBTP against -3 dBTP`);

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
