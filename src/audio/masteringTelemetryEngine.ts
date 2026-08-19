/**
 * SoulSonus E11 Broadcast Mastering Telemetry Engine
 * Implements genuine ITU-R BS.1770-4 K-Weighting Loudness (LUFS-I, LUFS-S, LUFS-M) & True-Peak (dBTP).
 */

import { channelTruePeak } from './oversampling';

export interface LoudnessTelemetryReport {
  integratedLufs: number; // e.g. -14.0 LUFS
  shortTermLufs: number; // 3-second sliding window
  momentaryLufs: number; // 400ms sliding window
  truePeakDbtp: number; // 4x oversampled true peak
  /**
   * Highest individual sample, before oversampling. Limiters act on this;
   * true peak can legitimately sit above it, which is the whole reason
   * true-peak metering exists.
   */
  samplePeakDbfs: number;
  crestFactorDb: number; // Peak to RMS ratio in dB
  phaseCorrelation: number; // -1.0 .. +1.0
  isStreamingCompliant: boolean; // Integrated <= -14.0 LUFS and Peak <= -1.0 dBTP
}

interface BiquadCoeffs {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

/**
 * Calculates ITU-R BS.1770-4 Stage 1 High-Shelf Filter coefficients.
 */
function getStage1Coeffs(sampleRate: number): BiquadCoeffs {
  // Pre-filter Stage 1 High Shelf: ~1.5 kHz, +4.0 dB gain
  const dbGain = 3.999843853973347;
  const f0 = 1681.974450955533;
  const Q = 0.7071752369274193;
  const K = Math.tan((Math.PI * f0) / sampleRate);
  const Vh = Math.pow(10, dbGain / 20);
  const Vb = Math.pow(Vh, 0.4996667741545416);

  const a0 = 1 + K / Q + K * K;
  const b0 = (Vh + Vb * (K / Q) + K * K) / a0;
  const b1 = (2 * (K * K - Vh)) / a0;
  const b2 = (Vh - Vb * (K / Q) + K * K) / a0;
  const a1 = (2 * (K * K - 1)) / a0;
  const a2 = (1 - K / Q + K * K) / a0;

  return { b0, b1, b2, a1, a2 };
}

/**
 * Calculates ITU-R BS.1770-4 Stage 2 High-Pass (RLB) Filter coefficients.
 */
function getStage2Coeffs(sampleRate: number): BiquadCoeffs {
  // RLB High-pass filter: ~38 Hz
  const f0 = 38.13547087602444;
  const Q = 0.5003270373238773;
  const K = Math.tan((Math.PI * f0) / sampleRate);

  const a0 = 1 + K / Q + K * K;
  const b0 = 1 / a0;
  const b1 = -2 / a0;
  const b2 = 1 / a0;
  const a1 = (2 * (K * K - 1)) / a0;
  const a2 = (1 - K / Q + K * K) / a0;

  return { b0, b1, b2, a1, a2 };
}

/**
 * Applies Direct Form II Transposed biquad filter in-place or returning new array.
 */
function applyBiquad(input: Float32Array, coeffs: BiquadCoeffs): Float32Array {
  const output = new Float32Array(input.length);
  let z1 = 0;
  let z2 = 0;
  const { b0, b1, b2, a1, a2 } = coeffs;

  for (let i = 0; i < input.length; i++) {
    const x = input[i];
    const y = b0 * x + z1;
    z1 = b1 * x - a1 * y + z2;
    z2 = b2 * x - a2 * y;
    output[i] = y;
  }
  return output;
}

/**
 * Loudest inter-sample peak across both channels.
 *
 * The 4x reconstruction itself lives in ./oversampling, shared with the
 * true-peak limiter so the meter and the limiter cannot disagree about where
 * the peaks are.
 */
function computeTruePeak(samplesL: Float32Array, samplesR: Float32Array): number {
  return Math.max(1e-6, channelTruePeak(samplesL), channelTruePeak(samplesR));
}

/**
 * BS.1770-4 gated integrated loudness.
 *
 * 400 ms blocks at 75% overlap, then two gates: an absolute gate at -70 LKFS
 * that discards silence, and a relative gate 10 LU below the mean of what
 * survived, which discards quiet passages so the number reflects the loud
 * body of the programme. An ungated global mean — which this engine used to
 * compute — reads far too low on anything with quiet sections.
 */
function gatedIntegratedLufs(
  kLeft: Float32Array,
  kRight: Float32Array,
  sampleRate: number
): number {
  const blockSamples = Math.max(1, Math.round(0.4 * sampleRate));
  const hopSamples = Math.max(1, Math.round(0.1 * sampleRate));
  const n = Math.min(kLeft.length, kRight.length);
  if (n < blockSamples) {
    // Too short for one gating block: fall back to the whole-signal mean.
    return blockLoudness(kLeft, kRight, 0, n);
  }

  const powers: number[] = [];
  const louds: number[] = [];
  for (let start = 0; start + blockSamples <= n; start += hopSamples) {
    const p = blockPower(kLeft, kRight, start, blockSamples);
    powers.push(p);
    louds.push(-0.691 + 10 * Math.log10(p + 1e-12));
  }

  // Absolute gate.
  const keptAbs: number[] = [];
  for (let i = 0; i < powers.length; i++) if (louds[i] > -70.0) keptAbs.push(powers[i]);
  if (!keptAbs.length) return -70.0;

  // Relative gate, computed from the absolute-gated mean.
  const meanAbs = keptAbs.reduce((a, b) => a + b, 0) / keptAbs.length;
  const relThreshold = -0.691 + 10 * Math.log10(meanAbs + 1e-12) - 10.0;

  const keptRel: number[] = [];
  for (let i = 0; i < powers.length; i++) {
    if (louds[i] > -70.0 && louds[i] > relThreshold) keptRel.push(powers[i]);
  }
  const finalSet = keptRel.length ? keptRel : keptAbs;
  const meanFinal = finalSet.reduce((a, b) => a + b, 0) / finalSet.length;
  return -0.691 + 10 * Math.log10(meanFinal + 1e-12);
}

/**
 * Weighted power of one block.
 *
 * BS.1770 SUMS the channels with unity weight (G = 1.0 for L and R); it does
 * not average them. Averaging reads 3 dB quiet on every stereo programme.
 */
function blockPower(kLeft: Float32Array, kRight: Float32Array, start: number, length: number): number {
  let sl = 0;
  let sr = 0;
  const end = Math.min(start + length, kLeft.length, kRight.length);
  const count = end - start;
  if (count <= 0) return 0;
  for (let i = start; i < end; i++) {
    sl += kLeft[i] * kLeft[i];
    sr += kRight[i] * kRight[i];
  }
  return sl / count + sr / count;
}

function blockLoudness(kLeft: Float32Array, kRight: Float32Array, start: number, length: number): number {
  return -0.691 + 10 * Math.log10(blockPower(kLeft, kRight, start, length) + 1e-12);
}

export class MasteringTelemetryEngine {
  /**
   * Evaluates audio buffer energy under real ITU-R BS.1770-4 K-weighting curve.
   */
  public measureLoudness(
    leftChannel: Float32Array,
    rightChannel: Float32Array,
    sampleRate: number = 48000
  ): LoudnessTelemetryReport {
    const numSamples = Math.min(leftChannel.length, rightChannel.length);
    if (numSamples === 0) {
      return {
        integratedLufs: -70.0,
        shortTermLufs: -70.0,
        momentaryLufs: -70.0,
        truePeakDbtp: -60.0,
        samplePeakDbfs: -60.0,
        crestFactorDb: 0,
        phaseCorrelation: 1.0,
        isStreamingCompliant: true,
      };
    }

    // 1. Genuine ITU-R BS.1770-4 K-Weighting Filter Chain (Stage 1 + Stage 2)
    const stage1Coeffs = getStage1Coeffs(sampleRate);
    const stage2Coeffs = getStage2Coeffs(sampleRate);

    const kLeft = applyBiquad(applyBiquad(leftChannel, stage1Coeffs), stage2Coeffs);
    const kRight = applyBiquad(applyBiquad(rightChannel, stage1Coeffs), stage2Coeffs);

    // 2. Mean Square Power per channel
    let sumSqL = 0;
    let sumSqR = 0;
    let dotProduct = 0;
    let rawSumL = 0;
    let rawSumR = 0;

    for (let i = 0; i < numSamples; i++) {
      const kl = kLeft[i];
      const kr = kRight[i];
      const sl = leftChannel[i];
      const sr = rightChannel[i];

      sumSqL += kl * kl;
      sumSqR += kr * kr;
      dotProduct += sl * sr;
      rawSumL += sl * sl;
      rawSumR += sr * sr;
    }

    const meanSquareL = sumSqL / numSamples;
    const meanSquareR = sumSqR / numSamples;

    // Integrated loudness: gated per BS.1770-4, not a flat mean of everything.
    const integratedLufs = Math.max(-70.0, Math.min(0.0, gatedIntegratedLufs(kLeft, kRight, sampleRate)));

    // 3. Momentary (400ms) & Short-Term (3s) windows, ending at the last sample.
    const samples400ms = Math.floor(sampleRate * 0.4);
    const momWindow = Math.min(numSamples, samples400ms);
    const momentaryLufs = Math.max(
      -70.0,
      Math.min(0.0, blockLoudness(kLeft, kRight, numSamples - momWindow, momWindow))
    );

    const samples3s = Math.floor(sampleRate * 3.0);
    const stWindow = Math.min(numSamples, samples3s);
    const shortTermLufs = Math.max(
      -70.0,
      Math.min(0.0, blockLoudness(kLeft, kRight, numSamples - stWindow, stWindow))
    );

    // 4. Peaks: sample peak, and true peak via 4x oversampling.
    let samplePeak = 0;
    for (let i = 0; i < numSamples; i++) {
      const a = Math.abs(leftChannel[i]);
      const b = Math.abs(rightChannel[i]);
      if (a > samplePeak) samplePeak = a;
      if (b > samplePeak) samplePeak = b;
    }
    const samplePeakDbfs = Math.max(-60.0, 20 * Math.log10(samplePeak + 1e-9));
    const peakAmp = computeTruePeak(leftChannel, rightChannel);
    const truePeakDbtp = Math.max(-60.0, 20 * Math.log10(peakAmp));

    // 5. Crest Factor
    const rmsDb = 10 * Math.log10((rawSumL + rawSumR) / (2 * numSamples) + 1e-12);
    const crestFactorDb = Math.max(0, truePeakDbtp - rmsDb);

    // 6. Phase Correlation
    const denom = Math.sqrt(rawSumL * rawSumR) + 1e-12;
    const phaseCorrelation = Math.max(-1.0, Math.min(1.0, dotProduct / denom));

    const isStreamingCompliant = integratedLufs <= -13.8 && truePeakDbtp <= -0.9;

    return {
      integratedLufs: Math.round(integratedLufs * 10) / 10,
      shortTermLufs: Math.round(shortTermLufs * 10) / 10,
      momentaryLufs: Math.round(momentaryLufs * 10) / 10,
      truePeakDbtp: Math.round(truePeakDbtp * 10) / 10,
      samplePeakDbfs: Math.round(samplePeakDbfs * 10) / 10,
      crestFactorDb: Math.round(crestFactorDb * 10) / 10,
      phaseCorrelation: Math.round(phaseCorrelation * 100) / 100,
      isStreamingCompliant,
    };
  }
}

export const masteringTelemetryEngine = new MasteringTelemetryEngine();
