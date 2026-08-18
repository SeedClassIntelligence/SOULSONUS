/**
 * SoulSonus Performance Onset Classifier
 *
 * Turns a single analyser frame into one classified performance event, so a
 * captured performance can be separated per sound type instead of every track
 * independently thresholding its own band.
 *
 * This is a feature-based (spectral) classifier, not a learned model: band
 * energy ratios + spectral centroid, scored against fixed prototypes. It
 * separates the three broad percussive families (low thump / broadband crack /
 * high sizzle) and pitched material by register. It does NOT resolve subtler
 * distinctions within a family (rimshot vs. side-stick, closed vs. pedal hat,
 * "puh" vs. "tuh") — those overlap heavily in this feature space and would
 * need a trained model.
 */

export const PERFORMANCE_CLASSES = ['kick', 'snare', 'hihat', 'tonal_low', 'tonal_high'] as const;
export type PerformanceClass = (typeof PERFORMANCE_CLASSES)[number];

export const PERCUSSIVE_CLASSES: PerformanceClass[] = ['kick', 'snare', 'hihat'];
export const TONAL_CLASSES: PerformanceClass[] = ['tonal_low', 'tonal_high'];

export type BandName = 'sub' | 'low' | 'lowMid' | 'mid' | 'high' | 'air';
export const BAND_NAMES: BandName[] = ['sub', 'low', 'lowMid', 'mid', 'high', 'air'];

/** Band edges in Hz. Chosen so a beatbox kick, snare and hat land in distinct groups. */
export const BAND_EDGES: Record<BandName, [number, number]> = {
  sub: [20, 120],
  low: [120, 260],
  lowMid: [260, 800],
  mid: [800, 2600],
  high: [2600, 6000],
  air: [6000, 14000],
};

export type BandEnergies = Record<BandName, number>;

export interface OnsetFeatures {
  /** Mean normalised magnitude (0..1) per band. */
  bands: BandEnergies;
  /** Per-band share of total spectral energy, sums to 1. */
  ratios: BandEnergies;
  spectralEnergy: number;
  centroidHz: number;
  /** Time-domain RMS of the frame — drives velocity. */
  rms: number;
  /** Fundamental in Hz, or -1 when no confident pitch was found. */
  pitchHz: number;
}

export interface Classification {
  klass: PerformanceClass;
  /** Margin between the winning score and the runner-up, 0..1. */
  confidence: number;
  scores: Partial<Record<PerformanceClass, number>>;
}

/** Prototype band-ratio vectors, ordered as BAND_NAMES. */
const PROTOTYPES: Record<'kick' | 'snare' | 'hihat', number[]> = {
  kick: [0.46, 0.28, 0.16, 0.07, 0.02, 0.01],
  snare: [0.06, 0.12, 0.26, 0.32, 0.18, 0.06],
  hihat: [0.01, 0.02, 0.05, 0.12, 0.3, 0.5],
};

/** Expected spectral centroid per percussive family, in Hz. */
const PROTOTYPE_CENTROID_HZ: Record<'kick' | 'snare' | 'hihat', number> = {
  kick: 110,
  snare: 1800,
  hihat: 9000,
};

/** Width of the centroid prior, in octaves. */
const CENTROID_SIGMA_OCTAVES = 1.35;

/** Bins at or below this percentile are treated as the frame's noise floor. */
const NOISE_FLOOR_PERCENTILE = 0.4;

/** Pitched material below this splits to the low register channel (C3 = 130.81 Hz). */
export const TONAL_SPLIT_HZ = 130.81;

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom > 0 ? dot / denom : 0;
}

/** Gaussian prior on log-frequency distance between observed and prototype centroid. */
function centroidPrior(centroidHz: number, prototypeHz: number): number {
  if (centroidHz <= 0) return 0;
  const octaves = Math.log2(centroidHz / prototypeHz);
  return Math.exp(-0.5 * (octaves / CENTROID_SIGMA_OCTAVES) ** 2);
}

/**
 * Extracts band energies, centroid and RMS from one analyser frame.
 * `freqData` is byte frequency data (0..255), `timeData` float time-domain.
 */
export function extractFeatures(
  freqData: Uint8Array,
  timeData: Float32Array,
  sampleRate: number,
  fftSize: number,
  pitchHz = -1
): OnsetFeatures {
  const binHz = sampleRate / fftSize;
  const bins = freqData.length;

  // Subtract the frame's own noise floor before measuring anything.
  // The analyser's byte spectrum maps roughly -100..-30 dB onto 0..255, so even
  // silent bins report a substantial value. Left in, that floor dominates the
  // wide upper bands and drags every spectral centroid toward ~6 kHz, which
  // makes a snare crack and a hi-hat sizzle statistically indistinguishable.
  const sorted = Array.from(freqData).sort((a, b) => a - b);
  const noiseFloor = sorted[Math.floor(sorted.length * NOISE_FLOOR_PERCENTILE)] ?? 0;
  const clean = (v: number) => Math.max(0, v - noiseFloor);

  const bands = {} as BandEnergies;
  for (const name of BAND_NAMES) {
    const [startHz, endHz] = BAND_EDGES[name];
    const startBin = Math.max(0, Math.floor(startHz / binHz));
    const endBin = Math.min(bins - 1, Math.ceil(endHz / binHz));
    let sum = 0;
    let count = 0;
    for (let i = startBin; i <= endBin; i++) {
      sum += clean(freqData[i]);
      count++;
    }
    bands[name] = count > 0 ? sum / count / 255 : 0;
  }

  const spectralEnergy = BAND_NAMES.reduce((acc, n) => acc + bands[n], 0);
  const ratios = {} as BandEnergies;
  for (const name of BAND_NAMES) {
    ratios[name] = spectralEnergy > 0 ? bands[name] / spectralEnergy : 0;
  }

  // Magnitude-weighted spectral centroid over the analysed range.
  let weighted = 0;
  let total = 0;
  const maxBin = Math.min(bins - 1, Math.ceil(BAND_EDGES.air[1] / binHz));
  for (let i = 1; i <= maxBin; i++) {
    const mag = clean(freqData[i]) / 255;
    weighted += mag * i * binHz;
    total += mag;
  }
  const centroidHz = total > 0 ? weighted / total : 0;

  let sumSq = 0;
  for (let i = 0; i < timeData.length; i++) sumSq += timeData[i] * timeData[i];
  const rms = Math.sqrt(sumSq / Math.max(1, timeData.length));

  return { bands, ratios, spectralEnergy, centroidHz, rms, pitchHz };
}

/**
 * Classifies one onset. `eligible` restricts the taxonomy to the classes the
 * armed capture modality can produce — a beatbox take cannot emit a tonal
 * class, a hum take cannot emit a kick — which removes the hardest and least
 * reliable discrimination (percussive vs. pitched) from the feature space.
 */
export function classifyOnset(
  features: OnsetFeatures,
  eligible: PerformanceClass[] = [...PERFORMANCE_CLASSES]
): Classification {
  const scores: Partial<Record<PerformanceClass, number>> = {};
  const observed = BAND_NAMES.map((n) => features.ratios[n]);

  for (const klass of eligible) {
    if (klass === 'tonal_low' || klass === 'tonal_high') {
      let isLow: boolean;
      let margin: number;
      if (features.pitchHz > 0) {
        // A tracked fundamental is authoritative for register.
        const octaves = Math.abs(Math.log2(features.pitchHz / TONAL_SPLIT_HZ));
        isLow = features.pitchHz < TONAL_SPLIT_HZ;
        margin = Math.min(1, octaves / 2);
      } else {
        // No usable fundamental: fall back to where the energy actually sits.
        // Raw centroid is unreliable here — a broadband noise floor drags it
        // upwards even for a sub-bass tone — so compare band mass directly.
        const lowMass = features.ratios.sub + features.ratios.low;
        const highMass = features.ratios.lowMid + features.ratios.mid + features.ratios.high + features.ratios.air;
        isLow = lowMass > highMass;
        margin = Math.min(1, Math.abs(lowMass - highMass) * 2);
      }
      scores[klass] = (klass === 'tonal_low' ? isLow : !isLow) ? 0.5 + 0.5 * margin : 0.5 - 0.5 * margin;
      continue;
    }
    const proto = PROTOTYPES[klass as 'kick' | 'snare' | 'hihat'];
    const shape = cosineSimilarity(observed, proto);
    const prior = centroidPrior(features.centroidHz, PROTOTYPE_CENTROID_HZ[klass as 'kick' | 'snare' | 'hihat']);
    scores[klass] = 0.65 * shape + 0.35 * prior;
  }

  const ranked = (Object.entries(scores) as [PerformanceClass, number][]).sort((a, b) => b[1] - a[1]);
  const [best, bestScore] = ranked[0] ?? (['snare', 0] as [PerformanceClass, number]);
  const runnerUp = ranked[1]?.[1] ?? 0;
  const confidence = bestScore > 0 ? Math.max(0, Math.min(1, (bestScore - runnerUp) / bestScore)) : 0;

  return { klass: best, confidence, scores };
}

/** Maps an onset's RMS to a MIDI velocity, normalised against a running peak. */
export function rmsToVelocity(rms: number, referencePeak: number): number {
  const ref = Math.max(0.02, referencePeak);
  const norm = Math.min(1, rms / ref);
  // Slight compression so quiet hits stay usable without flattening dynamics.
  const shaped = Math.pow(norm, 0.7);
  return Math.max(1, Math.min(127, Math.round(12 + shaped * 115)));
}


/**
 * Autocorrelation pitch detector. Returns the fundamental in Hz, or -1 when the
 * frame is too quiet or too noisy to give a confident answer.
 *
 * Lives here so the live mic path and the offline file path use one
 * implementation rather than drifting copies.
 */
export function autoCorrelate(buf: Float32Array, sampleRate: number): number {
  let SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1;

  let r1 = 0;
  let r2 = SIZE - 1;
  const thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
  }

  const sliced = buf.slice(r1, r2);
  SIZE = sliced.length;
  if (SIZE < 8) return -1;

  const c = new Float32Array(SIZE);
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE - i; j++) c[i] = c[i] + sliced[j] * sliced[j + i];
  }

  let d = 0;
  while (d < SIZE - 1 && c[d] > c[d + 1]) d++;
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < SIZE; i++) {
    if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  }
  let T0 = maxpos;
  if (T0 <= 0 || T0 >= SIZE - 1) return -1;

  const x1 = c[T0 - 1];
  const x2 = c[T0];
  const x3 = c[T0 + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  return sampleRate / T0;
}

/** Lowest fundamental worth trusting from `autoCorrelate` at typical frame sizes. */
export const MIN_TRACKABLE_HZ = 45;
export const MAX_TRACKABLE_HZ = 1500;

/** Converts a frequency to the nearest note name, clamped to the playable range. */
export function freqToNoteName(freq: number): string {
  if (freq < 40 || freq > 2000) return 'C3';
  const noteNum = Math.round(12 * Math.log2(freq / 440) + 69);
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(noteNum / 12) - 1;
  const noteName = noteNames[((noteNum % 12) + 12) % 12];
  return `${noteName}${Math.max(1, Math.min(6, octave))}`;
}
