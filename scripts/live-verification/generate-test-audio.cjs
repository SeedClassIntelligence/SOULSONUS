/**
 * Synthesises the test clips used by the live verification harness.
 * Each percussive voice is band-shaped so the clip contains genuinely distinct
 * spectral content per sound type — the point is to test separation, so the
 * kick, snare and hat must actually be separable in the audio itself.
 */
const fs = require('fs');
const SR = 48000;

function writeWav(path, samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32000), 44 + i * 2);
  }
  fs.writeFileSync(path, buf);
}

// --- minimal biquads, so each voice really occupies its own band -------------
function biquad(x, { b0, b1, b2, a1, a2 }) {
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const out = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = out; y[i] = out;
  }
  return y;
}
function lowpass(x, f0, Q = 0.707) {
  const w = 2 * Math.PI * f0 / SR, c = Math.cos(w), al = Math.sin(w) / (2 * Q);
  const a0 = 1 + al;
  return biquad(x, { b0: (1 - c) / 2 / a0, b1: (1 - c) / a0, b2: (1 - c) / 2 / a0, a1: -2 * c / a0, a2: (1 - al) / a0 });
}
function highpass(x, f0, Q = 0.707) {
  const w = 2 * Math.PI * f0 / SR, c = Math.cos(w), al = Math.sin(w) / (2 * Q);
  const a0 = 1 + al;
  return biquad(x, { b0: (1 + c) / 2 / a0, b1: -(1 + c) / a0, b2: (1 + c) / 2 / a0, a1: -2 * c / a0, a2: (1 - al) / a0 });
}

function noise(n) { const o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = Math.random() * 2 - 1; return o; }
function env(n, decay) { const o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = Math.exp(-(i / SR) * decay); return o; }
function apply(a, b) { const o = new Float32Array(a.length); for (let i = 0; i < a.length; i++) o[i] = a[i] * b[i]; return o; }

/** Beatbox kick: sub sine with a pitch drop. Energy almost entirely < 150 Hz. */
function kick(f0 = 58) {
  const n = Math.floor(SR * 0.22), o = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = f0 + 65 * Math.exp(-t * 45); // click-to-thump pitch envelope
    o[i] = Math.sin(2 * Math.PI * f * t);
  }
  return lowpass(apply(o, env(n, 16)), 220);
}

/** Beatbox snare: 200 Hz body plus band-limited noise crack, 300 Hz - 5 kHz. */
function snare() {
  const n = Math.floor(SR * 0.16);
  const body = new Float32Array(n);
  for (let i = 0; i < n; i++) body[i] = 0.45 * Math.sin(2 * Math.PI * 200 * (i / SR));
  const crack = lowpass(highpass(noise(n), 700), 4200);
  const mix = new Float32Array(n);
  for (let i = 0; i < n; i++) mix[i] = body[i] * 0.5 + crack[i] * 0.9;
  return apply(mix, env(n, 26));
}

/** Beatbox hi-hat: short high-passed sizzle, energy almost entirely > 6 kHz. */
function hat() {
  const n = Math.floor(SR * 0.06);
  return apply(highpass(highpass(noise(n), 7000), 7000), env(n, 70));
}

/** Places voices on a grid, one event every `stepMs`. */
function pattern(seconds, stepMs, voices) {
  const n = SR * seconds, out = new Float32Array(n);
  const step = Math.floor(SR * stepMs / 1000);
  for (let e = 0; e * step < n; e++) {
    const v = voices[e % voices.length];
    if (!v) continue;
    const s = v(), start = e * step;
    for (let i = 0; i < s.length && start + i < n; i++) out[start + i] += s[i] * 0.9;
  }
  return out;
}

/** Sustained pitched tone with light harmonics. */
function tone(seconds, hz) {
  const n = Math.floor(SR * seconds), o = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    o[i] = 0.55 * (Math.sin(2 * Math.PI * hz * t) + 0.3 * Math.sin(4 * Math.PI * hz * t) + 0.12 * Math.sin(6 * Math.PI * hz * t)) / 1.42;
  }
  // Gentle fade so successive tones read as separate events.
  const fade = Math.floor(SR * 0.02);
  for (let i = 0; i < fade; i++) { o[i] *= i / fade; o[n - 1 - i] *= i / fade; }
  return o;
}

function melody(notes, secondsEach) {
  const parts = notes.map((hz) => tone(secondsEach, hz));
  const n = parts.reduce((a, p) => a + p.length, 0), out = new Float32Array(n);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

/**
 * A finished multi-instrument mix: kick, sustained bass, a chord pad and hats
 * all sounding at once and continuously. This is Case B — several instruments
 * playing simultaneously, which no onset classifier can pull apart.
 */
function fullMix(seconds) {
  const n = SR * seconds;
  const out = new Float32Array(n);

  // Continuous chord pad (three voices) — keeps mids busy the whole time.
  const chord = [220, 277.18, 329.63];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = 0;
    for (const f of chord) v += Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t);
    out[i] += (v / chord.length) * 0.16;
  }

  // Sustained bass line, changing note every bar — keeps lows busy throughout.
  const bassNotes = [55, 55, 73.42, 65.41];
  const barLen = Math.floor(SR * 2);
  for (let b = 0; b * barLen < n; b++) {
    const f = bassNotes[b % bassNotes.length];
    for (let i = 0; i < barLen && b * barLen + i < n; i++) {
      const t = i / SR;
      out[b * barLen + i] += 0.3 * Math.sin(2 * Math.PI * f * t) * (1 - Math.exp(-t * 40));
    }
  }

  // Drums over the top.
  const step = Math.floor(SR * 0.25);
  for (let e = 0; e * step < n; e++) {
    const start = e * step;
    const voices = e % 4 === 0 ? [kick, hat] : e % 4 === 2 ? [snare, hat] : [hat];
    for (const v of voices) {
      const sample = v();
      for (let i = 0; i < sample.length && start + i < n; i++) out[start + i] += sample[i] * 0.55;
    }
  }

  // Normalise to avoid clipping the sum.
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 0) for (let i = 0; i < n; i++) out[i] = (out[i] / peak) * 0.9;
  return out;
}

const dir = process.argv[2] || process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';
fs.mkdirSync(dir, { recursive: true });

// Three genuinely distinct sound types, interleaved in one performance.
writeWav(`${dir}/beatbox_ksh.wav`, pattern(14, 250, [kick, hat, snare, hat]));
// Same performance minus the hi-hat: nothing should land on a hat channel.
writeWav(`${dir}/beatbox_ks.wav`, pattern(14, 250, [kick, null, snare, null]));
// Body percussion: low thumps and claps, no sizzle.
writeWav(`${dir}/body_taps.wav`, pattern(14, 300, [() => kick(72), snare]));
// Pitched material, upper register, stepping so a held note re-fires on change.
writeWav(`${dir}/hum_melody.wav`, melody([440, 523.25, 659.25, 523.25], 1.2));
// Pitched material, low register.
writeWav(`${dir}/hum_bass.wav`, melody([55, 65.41, 82.41, 65.41], 1.2));
// Case B: a finished multi-instrument mix.
writeWav(`${dir}/full_mix.wav`, fullMix(12));
// Legacy clips kept so earlier tests still run.
writeWav(`${dir}/hum_A4.wav`, melody([440], 10));
writeWav(`${dir}/beatbox_A.wav`, pattern(12, 500, [kick, hat]));
writeWav(`${dir}/beatbox_B.wav`, pattern(12, 500, [() => kick(95), snare]));

console.log('wrote test clips to', dir);

function writeFileRaw(path, buf) {
  require('fs').writeFileSync(path, buf);
}

// A real sound bank file, for the R02 INSTRUMENT route. The library ships one
// for its own tests -- 890 bytes, a single saw-wave preset -- which is enough
// to prove the path reads presets out of a file rather than a list we wrote.
try {
  const { BasicSoundBank } = require('spessasynth_core');
  writeFileRaw(`${dir}/sample_bank.sf2`, Buffer.from(BasicSoundBank.getSampleSoundBankFile()));
} catch (err) {
  console.warn('[generate-test-audio] no sound bank written:', err.message);
}
