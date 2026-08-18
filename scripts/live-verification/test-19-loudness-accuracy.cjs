/**
 * Validates the loudness engine against signals whose correct answer is known
 * independently of this codebase, so the numbers can be trusted before any UI
 * displays them.
 */
const { execFileSync } = require('child_process');
const out = '/tmp/lufs-bundle.cjs';
execFileSync('npx', ['esbuild', 'src/audio/masteringTelemetryEngine.ts', '--bundle', '--platform=node',
  '--format=cjs', `--outfile=${out}`, '--log-level=warning'], { cwd: process.cwd() });
const { masteringTelemetryEngine } = require(out);

const SR = 48000;
const sine = (sec, hz, amp) => {
  const n = Math.round(SR * sec), a = new Float32Array(n);
  for (let i = 0; i < n; i++) a[i] = amp * Math.sin(2 * Math.PI * hz * (i / SR));
  return a;
};
const silence = (sec) => new Float32Array(Math.round(SR * sec));
const concat = (...parts) => {
  const n = parts.reduce((a, p) => a + p.length, 0), o = new Float32Array(n);
  let off = 0; for (const p of parts) { o.set(p, off); off += p.length; }
  return o;
};
const m = (l, r) => masteringTelemetryEngine.measureLoudness(l, r, SR);
const near = (got, want, tol) => Math.abs(got - want) <= tol;

console.log('=== LOUDNESS ENGINE ACCURACY ===\n');
let pass = 0, total = 0;
const check = (label, got, want, tol, unit = '') => {
  total++;
  const ok = near(got, want, tol);
  if (ok) pass++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(52)} got ${got.toFixed(2)}${unit}  expected ${want}${unit} ±${tol}`);
};

// EBU Tech 3341 compliance case 1: a 1 kHz sine at -23 dBFS (PEAK amplitude,
// which is how the standards state it) in both channels reads -23.0 LUFS.
// Because BS.1770 sums the channels with unity weight, the stereo reading for
// an identical-in-both-channels sine works out to exactly its peak dBFS — this
// is the test that catches summing-vs-averaging.
{
  const amp = Math.pow(10, -23 / 20);
  const s = sine(5, 1000, amp);
  const r = m(s, s);
  check('EBU 3341-1: 1 kHz -23 dBFS both channels', r.integratedLufs, -23.0, 0.35, ' LUFS');
}

// ITU-R BS.1770-4 §3.2: a 0 dBFS 1 kHz sine in a single channel reads
// -3.01 LKFS. This pins the -0.691 offset against the K-weighting gain at 1 kHz.
{
  const s = sine(5, 1000, 1.0);
  const r = m(s, silence(5));
  check('BS.1770 §3.2: 0 dBFS 1 kHz, left only', r.integratedLufs, -3.01, 0.35, ' LKFS');
}

// The same tone in one channel must read 3.01 LU below the stereo case.
{
  const amp = Math.pow(10, -23 / 20);
  const s = sine(5, 1000, amp);
  check('single channel reads 3.01 LU below stereo', m(s, silence(5)).integratedLufs, -26.01, 0.35, ' LUFS');
}

// Gating: 5 s of tone plus 15 s of silence must still read like the tone,
// because the silent blocks fall below the -70 LKFS absolute gate. An ungated
// mean would read roughly 6 dB lower.
{
  const amp = Math.pow(10, -23 / 20);
  const s = concat(sine(5, 1000, amp), silence(15));
  const r = m(s, s);
  check('absolute gate: tone + 15 s silence', r.integratedLufs, -23.0, 0.5, ' LUFS');
}

// Relative gate: a quiet passage 25 LU below the body sits under the -10 LU
// relative threshold and must not drag the number down.
{
  const loud = Math.pow(10, -23 / 20);
  const quiet = Math.pow(10, -48 / 20);
  const s = concat(sine(5, 1000, loud), sine(10, 1000, quiet));
  const r = m(s, s);
  check('relative gate: loud body + quiet passage', r.integratedLufs, -23.0, 0.6, ' LUFS');
}

// True peak: a full-scale sine landing between samples has an inter-sample
// peak above 0 dBFS. Linear interpolation cannot see it; 4x oversampling can.
{
  // 1 kHz at 48 k with a phase offset that puts the crest between samples.
  const n = SR * 2, a = new Float32Array(n);
  for (let i = 0; i < n; i++) a[i] = 0.999 * Math.sin(2 * Math.PI * 1000 * (i / SR) + Math.PI / 4);
  const r = m(a, a);
  check('near-full-scale sine -> true peak', r.truePeakDbtp, 0.0, 0.35, ' dBTP');
}

// A DC-free constant-amplitude square is the classic inter-sample overshoot
// case; true peak must exceed the sample peak of 0 dBFS.
{
  const n = SR, a = new Float32Array(n);
  for (let i = 0; i < n; i++) a[i] = (Math.floor(i / 6) % 2 === 0 ? 1 : -1) * 0.9;
  const r = m(a, a);
  const samplePeakDb = 20 * Math.log10(0.9);
  console.log(`      inter-sample overshoot: sample peak ${samplePeakDb.toFixed(2)} dBFS -> true peak ${r.truePeakDbtp.toFixed(2)} dBTP ` +
              `(${r.truePeakDbtp > samplePeakDb ? 'PASS — overshoot detected' : 'FAIL — reads no higher than sample peak'})`);
  total++; if (r.truePeakDbtp > samplePeakDb) pass++;
}

// Phase correlation endpoints.
{
  const s = sine(2, 500, 0.5);
  const inv = new Float32Array(s.length); for (let i = 0; i < s.length; i++) inv[i] = -s[i];
  check('identical channels -> correlation', m(s, s).phaseCorrelation, 1.0, 0.02);
  check('inverted channels -> correlation', m(s, inv).phaseCorrelation, -1.0, 0.02);
}

console.log(`\n${pass}/${total} checks passed`);
