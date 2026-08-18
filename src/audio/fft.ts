/**
 * Radix-2 FFT and an AnalyserNode-compatible byte spectrum.
 *
 * Offline analysis of an uploaded file has to produce the *same* feature input
 * as the live mic path, or the classifier would be scoring two different things.
 * AnalyserNode maps magnitudes in [minDecibels, maxDecibels] onto 0..255; this
 * reproduces that mapping so `extractFeatures` is fed identically either way.
 */

const DEFAULT_MIN_DB = -100;
const DEFAULT_MAX_DB = -30;

/** In-place iterative radix-2 FFT. `re`/`im` must have power-of-two length. */
export function fftInPlace(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  if (n <= 1) return;
  if ((n & (n - 1)) !== 0) throw new Error(`FFT size must be a power of two, got ${n}`);

  // Bit-reversal permutation.
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const aRe = re[i + k];
        const aIm = im[i + k];
        const bRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm;
        const bIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe;
        re[i + k] = aRe + bRe;
        im[i + k] = aIm + bIm;
        re[i + k + len / 2] = aRe - bRe;
        im[i + k + len / 2] = aIm - bIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

/** Precomputed Hann window, matching the one AnalyserNode applies. */
export function hannWindow(size: number): Float32Array {
  const w = new Float32Array(size);
  for (let i = 0; i < size; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1));
  return w;
}

/**
 * Converts one time-domain frame into the byte frequency data an AnalyserNode
 * of the same fftSize would report. Returns fftSize/2 bins.
 */
export function byteSpectrum(
  frame: Float32Array,
  window: Float32Array,
  minDecibels = DEFAULT_MIN_DB,
  maxDecibels = DEFAULT_MAX_DB
): Uint8Array {
  const n = window.length;
  const re = new Float32Array(n);
  const im = new Float32Array(n);
  for (let i = 0; i < n; i++) re[i] = (frame[i] || 0) * window[i];

  fftInPlace(re, im);

  const bins = n / 2;
  const out = new Uint8Array(bins);
  const range = maxDecibels - minDecibels;
  for (let k = 0; k < bins; k++) {
    const mag = Math.sqrt(re[k] * re[k] + im[k] * im[k]) / (n / 4);
    const db = 20 * Math.log10(mag + 1e-9);
    const scaled = ((db - minDecibels) / range) * 255;
    out[k] = Math.max(0, Math.min(255, Math.round(scaled)));
  }
  return out;
}

/** Downmixes an AudioBuffer to a single mono channel. */
export function toMono(buffer: AudioBuffer): Float32Array {
  const channels = buffer.numberOfChannels;
  const length = buffer.length;
  const mono = new Float32Array(length);
  for (let c = 0; c < channels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) mono[i] += data[i];
  }
  if (channels > 1) for (let i = 0; i < length; i++) mono[i] /= channels;
  return mono;
}
