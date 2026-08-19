/**
 * 4× band-limited reconstruction, shared by the true-peak meter and the
 * true-peak limiter.
 *
 * These two must use the same reconstruction or they disagree: a limiter built
 * on a different interpolation would leave peaks the meter still reports, which
 * is exactly the failure this module exists to prevent.
 */

export const TP_TAPS = 24;
export const TP_PHASES = 4;

function buildPolyphaseKernels(): Float32Array[] {
  const kernels: Float32Array[] = [];
  for (let phase = 0; phase < TP_PHASES; phase++) {
    const frac = phase / TP_PHASES;
    const k = new Float32Array(TP_TAPS);
    let sum = 0;
    for (let n = 0; n < TP_TAPS; n++) {
      const x = n - TP_TAPS / 2 + 1 - frac;
      // Normalised sinc, band-limited to Nyquist.
      const sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
      // Blackman-Harris window keeps the stopband down so the reconstruction
      // does not invent peaks that are not in the signal.
      const w = n / (TP_TAPS - 1);
      const win =
        0.35875 -
        0.48829 * Math.cos(2 * Math.PI * w) +
        0.14128 * Math.cos(4 * Math.PI * w) -
        0.01168 * Math.cos(6 * Math.PI * w);
      k[n] = sinc * win;
      sum += k[n];
    }
    // Unity DC gain per phase, so a constant signal reconstructs to itself.
    if (sum !== 0) for (let n = 0; n < TP_TAPS; n++) k[n] /= sum;
    kernels.push(k);
  }
  return kernels;
}

export const TP_KERNELS = buildPolyphaseKernels();

/** Peak of one channel after genuine 4× band-limited upsampling. */
export function channelTruePeak(x: Float32Array): number {
  let peak = 0;
  const half = TP_TAPS / 2;
  for (let i = 0; i < x.length; i++) {
    const a = Math.abs(x[i]);
    if (a > peak) peak = a;
    for (let phase = 1; phase < TP_PHASES; phase++) {
      const k = TP_KERNELS[phase];
      let acc = 0;
      for (let n = 0; n < TP_TAPS; n++) {
        const idx = i - half + 1 + n;
        if (idx >= 0 && idx < x.length) acc += x[idx] * k[n];
      }
      const av = Math.abs(acc);
      if (av > peak) peak = av;
    }
  }
  return peak;
}

/**
 * Per-sample reconstructed magnitude: for each base sample, the largest
 * absolute value of that sample and the three interpolated points that follow
 * it. This is what a true-peak meter reads at that position, so a limiter
 * driven by it targets the same number the meter reports.
 */
export function truePeakEnvelope(x: Float32Array, out?: Float32Array): Float32Array {
  const env = out && out.length === x.length ? out : new Float32Array(x.length);
  const half = TP_TAPS / 2;
  for (let i = 0; i < x.length; i++) {
    let peak = Math.abs(x[i]);
    for (let phase = 1; phase < TP_PHASES; phase++) {
      const k = TP_KERNELS[phase];
      let acc = 0;
      for (let n = 0; n < TP_TAPS; n++) {
        const idx = i - half + 1 + n;
        if (idx >= 0 && idx < x.length) acc += x[idx] * k[n];
      }
      const av = acc < 0 ? -acc : acc;
      if (av > peak) peak = av;
    }
    env[i] = peak;
  }
  return env;
}
