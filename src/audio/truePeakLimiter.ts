/**
 * A true-peak limiter that actually limits true peak.
 *
 * The master chain's final stage is a hard clip in the sample domain. It holds
 * sample peak exactly on its ceiling — and let inter-sample peaks through at
 * +0.8 dBTP against a -1.0 dBTP setting, because clipping a waveform creates
 * overshoots between the samples it clipped. The control was named in dBTP and
 * the chain target was in dBTP; only sample peak was ever controlled.
 *
 * This stage measures with the same 4x reconstruction the meter uses, derives a
 * gain envelope that pulls the reconstructed signal under the ceiling, and
 * smooths that envelope over the stage's own lookahead and release times. It is
 * applied to the rendered buffer, so it governs what is measured and what is
 * exported — the two places where the number has to be true.
 */

import { truePeakEnvelope } from './oversampling';

export interface TruePeakLimitOptions {
  /** Ceiling in dBTP. -1 means no reconstructed peak may exceed -1 dBTP. */
  ceilingDbtp: number;
  /** Needed to turn the stage's millisecond times into samples. */
  sampleRate: number;
  /** How far ahead the gain starts coming down. */
  lookaheadMs?: number;
  /** How long it takes to return to unity. */
  releaseMs?: number;
  /** Safety bound on refinement passes. */
  maxPasses?: number;
}

export interface TruePeakLimitResult {
  /** Limited channels. The input arrays are not modified. */
  channels: Float32Array[];
  inputTruePeakDbtp: number;
  outputTruePeakDbtp: number;
  /** Deepest gain reduction applied, in dB (0 when nothing was over). */
  maxGainReductionDb: number;
  passes: number;
  /** True when the output sits at or under the ceiling. */
  withinCeiling: boolean;
}

const toDb = (v: number) => 20 * Math.log10(Math.max(v, 1e-12));

/**
 * Gain envelope for one pass.
 *
 * Both passes over the envelope shape the same curve. Going backwards limits
 * how fast the gain may fall as time moves forward, which is what makes the
 * reduction arrive before the peak rather than on it. Going forwards limits how
 * fast it may rise, which is the release.
 */
function buildGainEnvelope(
  magnitude: Float32Array,
  ceiling: number,
  attackSamples: number,
  releaseSamples: number,
): Float32Array {
  const n = magnitude.length;
  const gain = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const m = magnitude[i];
    gain[i] = m > ceiling ? ceiling / m : 1;
  }

  const attackStep = 1 / Math.max(1, attackSamples);
  for (let i = n - 2; i >= 0; i--) {
    const bound = gain[i + 1] + attackStep;
    if (gain[i] > bound) gain[i] = bound;
  }

  const releaseStep = 1 / Math.max(1, releaseSamples);
  for (let i = 1; i < n; i++) {
    const bound = gain[i - 1] + releaseStep;
    if (gain[i] > bound) gain[i] = bound;
  }

  return gain;
}

/**
 * Limits the reconstructed peak of a stereo (or mono) buffer to `ceilingDbtp`.
 *
 * Gain is linked across channels so the stereo image does not shift when one
 * side is louder. Because modulating gain can itself introduce a small new
 * overshoot, the result is re-measured and refined until it is under the
 * ceiling or `maxPasses` is reached; the outcome is reported either way rather
 * than assumed.
 */
export function limitTruePeak(
  input: Float32Array[],
  options: TruePeakLimitOptions,
): TruePeakLimitResult {
  const { ceilingDbtp, sampleRate, lookaheadMs = 4.5, releaseMs = 80, maxPasses = 4 } = options;
  const ceiling = Math.pow(10, ceilingDbtp / 20);
  const attackSamples = Math.max(1, Math.round((lookaheadMs / 1000) * sampleRate));
  const releaseSamples = Math.max(1, Math.round((releaseMs / 1000) * sampleRate));

  const channels = input.map((c) => Float32Array.from(c));

  // Linked across channels, so the stereo image does not shift when one side
  // is louder. The envelope doubles as the measurement — reading the peak off
  // it costs nothing, where measuring separately would repeat the whole
  // reconstruction.
  const linkedEnvelope = (): { linked: Float32Array; peak: number } => {
    const linked = truePeakEnvelope(channels[0]);
    for (let c = 1; c < channels.length; c++) {
      const other = truePeakEnvelope(channels[c]);
      for (let i = 0; i < linked.length; i++) if (other[i] > linked[i]) linked[i] = other[i];
    }
    let peak = 0;
    for (let i = 0; i < linked.length; i++) if (linked[i] > peak) peak = linked[i];
    return { linked, peak };
  };

  let { linked, peak } = linkedEnvelope();
  const inputTruePeak = peak;
  let passes = 0;
  let lowestGain = 1;

  while (peak > ceiling && passes < maxPasses) {
    const gain = buildGainEnvelope(linked, ceiling, attackSamples, releaseSamples);
    for (let i = 0; i < gain.length; i++) {
      if (gain[i] < lowestGain) lowestGain = gain[i];
      for (const c of channels) c[i] *= gain[i];
    }
    ({ linked, peak } = linkedEnvelope());
    passes++;
  }

  // Whatever the envelope passes leave behind is closed exactly here. True peak
  // is linear in gain, so scaling by ceiling/peak lands on the ceiling rather
  // than approaching it — the residual after four passes is a few hundredths of
  // a dB, which is inaudible as a trim and decisive as a guarantee.
  if (peak > ceiling && peak > 0) {
    const trim = ceiling / peak;
    for (const c of channels) for (let i = 0; i < c.length; i++) c[i] *= trim;
    lowestGain *= trim;
    peak = ceiling;
  }

  return {
    channels,
    inputTruePeakDbtp: Number(toDb(inputTruePeak).toFixed(2)),
    outputTruePeakDbtp: Number(toDb(peak).toFixed(2)),
    maxGainReductionDb: Number((-toDb(lowestGain)).toFixed(2)),
    passes,
    withinCeiling: peak <= ceiling * 1.0001,
  };
}
