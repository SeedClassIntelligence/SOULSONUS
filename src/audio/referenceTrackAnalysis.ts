/**
 * Real measurement for a reference track and for the current mix, so the
 * two can be honestly compared.
 *
 * referenceTrack used to default to a fabricated object -- "Commercial
 * Top-40 Reference (Urban / Hip-Hop)", -13.8 LUFS, 82% stereo width, none
 * of it measured from any file, presented as already loaded before a
 * creator had ever uploaded anything. This is the real replacement: the
 * same band-energy analysis already proven in maskingAnalysis.ts (byte
 * spectrum, Hann-windowed frames, the same six bands), plus a genuine
 * mid/side stereo-width measurement, run on whatever audio is actually
 * given to it -- a reference file, or the project's own bounce.
 */

import { byteSpectrum, hannWindow } from './fft';
import { BAND_EDGES, BAND_NAMES, BandName } from './performanceClassifier';

const FFT_SIZE = 1024;
const HOP_SIZE = 512;

export interface MixSpectralProfile {
  /** Side-channel share of mid/side energy, 0..100. Real stereo width, not a guess. */
  stereoWidthScore: number;
  /** Energy in the sub+low bands (20-260Hz) relative to the whole spectrum, in dB. */
  lowEndEnergyDb: number;
  /** Energy in the 2.6-6kHz presence band relative to the whole spectrum, in dB. */
  vocalPresenceDb: number;
  /** Every band's share of the whole spectrum, in dB, for drawing a real RTA curve. */
  bandDb: Record<BandName, number>;
}

function bandEnergyShares(mono: Float32Array, sampleRate: number): Record<BandName, number> {
  const window = hannWindow(FFT_SIZE);
  const frames = Math.max(0, Math.floor((mono.length - FFT_SIZE) / HOP_SIZE) + 1);
  const totals = {} as Record<BandName, number>;
  for (const n of BAND_NAMES) totals[n] = 0;
  let grandTotal = 0;
  const binHz = sampleRate / FFT_SIZE;

  for (let f = 0; f < frames; f++) {
    const frame = mono.subarray(f * HOP_SIZE, f * HOP_SIZE + FFT_SIZE);
    let rms = 0;
    for (let i = 0; i < frame.length; i++) rms += frame[i] * frame[i];
    rms = Math.sqrt(rms / frame.length);
    if (rms < 0.002) continue; // silence contributes nothing

    const spec = byteSpectrum(frame, window);
    // Same noise-floor subtraction as the masking analyzer, so a quiet
    // frame's bin noise doesn't register as spectral content.
    const sorted = Array.from(spec).sort((a, b) => a - b);
    const floor = sorted[Math.floor(sorted.length * 0.4)] ?? 0;

    for (const name of BAND_NAMES) {
      const [lo, hi] = BAND_EDGES[name];
      let sum = 0;
      for (let b = Math.floor(lo / binHz); b <= Math.min(spec.length - 1, Math.ceil(hi / binHz)); b++) {
        sum += Math.max(0, spec[b] - floor);
      }
      totals[name] += sum;
      grandTotal += sum;
    }
  }

  const shares = {} as Record<BandName, number>;
  for (const name of BAND_NAMES) shares[name] = grandTotal > 0 ? totals[name] / grandTotal : 0;
  return shares;
}

/** Real mid/side energy split -- not derived from phase correlation, which measures coherence, not width. */
function stereoWidthScore(left: Float32Array, right: Float32Array): number {
  let midEnergy = 0;
  let sideEnergy = 0;
  const n = Math.min(left.length, right.length);
  for (let i = 0; i < n; i++) {
    const mid = (left[i] + right[i]) / 2;
    const side = (left[i] - right[i]) / 2;
    midEnergy += mid * mid;
    sideEnergy += side * side;
  }
  const total = midEnergy + sideEnergy;
  return total > 0 ? Math.round((sideEnergy / total) * 100) : 0;
}

const dbFromShare = (share: number) => (share > 0 ? 10 * Math.log10(share) : -60);

export function analyzeMixSpectralProfile(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number
): MixSpectralProfile {
  const mono = new Float32Array(left.length);
  for (let i = 0; i < left.length; i++) mono[i] = (left[i] + (right[i] ?? left[i])) / 2;
  const shares = bandEnergyShares(mono, sampleRate);
  const bandDb = {} as Record<BandName, number>;
  for (const name of BAND_NAMES) bandDb[name] = Math.round(dbFromShare(shares[name]) * 10) / 10;
  return {
    stereoWidthScore: stereoWidthScore(left, right),
    lowEndEnergyDb: Math.round(dbFromShare(shares.sub + shares.low) * 10) / 10,
    vocalPresenceDb: Math.round(dbFromShare(shares.high) * 10) / 10,
    bandDb,
  };
}
