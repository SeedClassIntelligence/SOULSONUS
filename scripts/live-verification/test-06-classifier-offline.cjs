/**
 * Offline check of the classifier itself: decode each test clip, run a real FFT
 * per onset, and confirm the three percussive families land in distinct classes.
 * Browser-free, so a routing failure can be told apart from a detection failure.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

// Compile the TS classifier to CJS so it can be exercised directly.
const out = '/tmp/pc-bundle.cjs';
execFileSync('npx', ['esbuild', 'src/audio/performanceClassifier.ts', '--bundle', '--platform=node',
  '--format=cjs', `--outfile=${out}`, '--log-level=warning'], { cwd: process.cwd() });
const { extractFeatures, classifyOnset, PERCUSSIVE_CLASSES, TONAL_CLASSES } = require(out);

function readWav(file) {
  const b = fs.readFileSync(file);
  const sampleRate = b.readUInt32LE(24);
  let off = 12;
  while (off < b.length - 8) {
    const id = b.toString('ascii', off, off + 4);
    const size = b.readUInt32LE(off + 4);
    if (id === 'data') {
      const n = size / 2, s = new Float32Array(n);
      for (let i = 0; i < n; i++) s[i] = b.readInt16LE(off + 8 + i * 2) / 32768;
      return { sampleRate, samples: s };
    }
    off += 8 + size;
  }
  throw new Error('no data chunk');
}

// Naive DFT magnitude -> the byte spectrum an AnalyserNode would report.
function spectrumBytes(frame, fftSize) {
  const bins = fftSize / 2;
  const out = new Uint8Array(bins);
  const win = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) win[i] = frame[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (fftSize - 1)));
  for (let k = 0; k < bins; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < fftSize; n++) {
      const a = (-2 * Math.PI * k * n) / fftSize;
      re += win[n] * Math.cos(a); im += win[n] * Math.sin(a);
    }
    const mag = Math.sqrt(re * re + im * im) / (fftSize / 4);
    const db = 20 * Math.log10(mag + 1e-9);
    // AnalyserNode maps [minDecibels,maxDecibels] = [-100,-30] onto 0..255.
    out[k] = Math.max(0, Math.min(255, Math.round(((db + 100) / 70) * 255)));
  }
  return out;
}

function onsets(samples, sampleRate, hop, fftSize) {
  const found = [];
  let prevRms = 0, lastAt = -1e9;
  for (let i = 0; i + fftSize < samples.length; i += hop) {
    const frame = samples.subarray(i, i + fftSize);
    let sq = 0;
    for (let j = 0; j < frame.length; j++) sq += frame[j] * frame[j];
    const rms = Math.sqrt(sq / frame.length);
    const tMs = (i / sampleRate) * 1000;
    if (rms >= 0.02 && (rms > prevRms * 1.35 || prevRms < 0.02) && tMs - lastAt >= 70) {
      found.push({ index: i, tMs, rms });
      lastAt = tMs;
    }
    prevRms = rms;
  }
  return found;
}

// Mirrors DetectionEngine.autoCorrelate so the tonal path is tested for real.
function autoCorrelate(buf, sampleRate) {
  let SIZE = buf.length, rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1;
  let r1 = 0, r2 = SIZE - 1;
  for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < 0.2) { r1 = i; break; }
  for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < 0.2) { r2 = SIZE - i; break; }
  const sliced = buf.slice(r1, r2); SIZE = sliced.length;
  const c = new Float32Array(SIZE);
  for (let i = 0; i < SIZE; i++) for (let j = 0; j < SIZE - i; j++) c[i] += sliced[j] * sliced[j + i];
  let d = 0; while (c[d] > c[d + 1]) d++;
  let maxval = -1, maxpos = -1;
  for (let i = d; i < SIZE; i++) if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  let T0 = maxpos;
  if (T0 <= 0 || T0 >= SIZE - 1) return -1;
  const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
  const a = (x1 + x3 - 2 * x2) / 2, b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);
  return sampleRate / T0;
}

const CLIPS = [
  ['beatbox_ksh.wav', PERCUSSIVE_CLASSES, 'kick + snare + hat interleaved'],
  ['beatbox_ks.wav', PERCUSSIVE_CLASSES, 'kick + snare only, NO hat performed'],
  ['body_taps.wav', PERCUSSIVE_CLASSES, 'body thumps + claps'],
  ['hum_melody.wav', TONAL_CLASSES, 'pitched, upper register'],
  ['hum_bass.wav', TONAL_CLASSES, 'pitched, low register'],
];

console.log('=== OFFLINE CLASSIFIER CHECK ===\n');
const FFT = 1024;
for (const [file, eligible, desc] of CLIPS) {
  const { sampleRate, samples } = readWav(path.join(SP, file));
  const hits = onsets(samples, sampleRate, 256, FFT);
  const counts = {};
  const confs = [];
  const pitches = [];
  for (const h of hits) {
    const frame = samples.subarray(h.index, h.index + FFT);
    const freq = spectrumBytes(frame, FFT);
    let pitchHz = -1;
    if (eligible === TONAL_CLASSES) {
      pitchHz = autoCorrelate(frame, sampleRate);
      if (!(pitchHz > 45 && pitchHz < 1500)) pitchHz = -1;
    }
    const f = extractFeatures(freq, frame, sampleRate, FFT, pitchHz);
    const c = classifyOnset(f, eligible);
    counts[c.klass] = (counts[c.klass] || 0) + 1;
    confs.push(c.confidence);
    if (pitchHz > 0) pitches.push(Math.round(pitchHz));
  }
  const avgConf = confs.length ? (confs.reduce((a, b) => a + b, 0) / confs.length) : 0;
  console.log(`${file}  (${desc})`);
  console.log(`  onsets: ${hits.length}   classes: ${JSON.stringify(counts)}   mean confidence: ${avgConf.toFixed(3)}`);
  if (pitches.length) console.log(`  detected f0 (Hz): ${JSON.stringify([...new Set(pitches)].slice(0, 8))}`);
  console.log('');
}
