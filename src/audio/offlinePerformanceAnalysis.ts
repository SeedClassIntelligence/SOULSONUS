/**
 * Offline analysis of a decoded audio file.
 *
 * Case A of audio upload — a solo performance recorded elsewhere — is the same
 * problem the live mic path already solves, only sourced from a decoded buffer
 * instead of a MediaStream. So this runs the identical onset detection,
 * feature extraction and classification, and emits the same CaptureEvent the
 * mic emits, which then goes through the same router. The only difference is
 * that a file carries its own timeline, so events are positioned by their
 * offset in the file rather than by the playhead.
 *
 * It also measures how dense the material is, which is what tells a solo take
 * apart from a finished multi-instrument mix.
 */

import {
  CaptureEvent,
  CaptureModality,
} from './detectionEngine';
import {
  BAND_NAMES,
  MAX_TRACKABLE_HZ,
  MIN_TRACKABLE_HZ,
  PERCUSSIVE_CLASSES,
  PERFORMANCE_CLASSES,
  PerformanceClass,
  TONAL_CLASSES,
  autoCorrelate,
  classifyOnset,
  extractFeatures,
  freqToNoteName,
  rmsToVelocity,
} from './performanceClassifier';
import { byteSpectrum, hannWindow, toMono } from './fft';

const FFT_SIZE = 1024;
const HOP_SIZE = 256;
const ONSET_DEBOUNCE_MS = 70;

export interface ContentAnalysis {
  /** What the material looks like. Advisory — the creator makes the final call. */
  suggestion: 'SOLO_PERFORMANCE' | 'FULL_MIX';
  /** True when the audio cannot support a recommendation and the creator must choose. */
  ambiguous: boolean;
  /** 0..1. Zero whenever `ambiguous` is set. */
  confidence: number;
  /** Plain-language explanation shown to the creator. */
  reason: string;
  metrics: {
    durationSec: number;
    /** Fraction of frames carrying signal. A mix runs continuously; a take breathes. */
    activityDutyCycle: number;
    /** Mean number of well-separated bands active at once. */
    meanConcurrentBands: number;
    onsetCount: number;
  };
}

export interface OfflineAnalysisResult {
  events: CaptureEvent[];
  content: ContentAnalysis;
}

function eligibleFor(modality: CaptureModality | null): PerformanceClass[] {
  // Kept identical to DetectionEngine.eligibleClasses: an imported file and a
  // live take must be read by the same taxonomy, or the same performance
  // separates two different ways depending on how it arrived.
  if (modality === 'KEYS' || modality === 'VOICE') return TONAL_CLASSES;
  if (modality === 'MOUTH' || modality === 'BODY') return PERCUSSIVE_CLASSES;
  return [...PERFORMANCE_CLASSES];
}

/**
 * Runs onset detection and classification across a decoded buffer.
 * `modality` constrains the eligible classes exactly as the armed capture
 * button does for the live path; pass null to allow the full taxonomy.
 */
export function analyzePerformanceBuffer(
  buffer: AudioBuffer,
  modality: CaptureModality | null = null
): OfflineAnalysisResult {
  const sampleRate = buffer.sampleRate;
  const mono = toMono(buffer);
  const window = hannWindow(FFT_SIZE);
  const eligible = eligibleFor(modality);
  const tonalMode = eligible === TONAL_CLASSES;

  // A file's absolute level is arbitrary, so the onset floor is set relative to
  // the material's own peak rather than to a fixed threshold.
  let globalPeak = 0;
  for (let i = 0; i < mono.length; i++) {
    const a = Math.abs(mono[i]);
    if (a > globalPeak) globalPeak = a;
  }
  const floor = Math.max(0.008, globalPeak * 0.07);

  const events: CaptureEvent[] = [];
  let prevRms = 0;
  let lastOnsetMs = -1e9;
  let peakRms = floor;

  let activeFrames = 0;
  let totalFrames = 0;
  let concurrencySum = 0;

  for (let start = 0; start + FFT_SIZE <= mono.length; start += HOP_SIZE) {
    const frame = mono.subarray(start, start + FFT_SIZE);
    let sumSq = 0;
    for (let i = 0; i < FFT_SIZE; i++) sumSq += frame[i] * frame[i];
    const rms = Math.sqrt(sumSq / FFT_SIZE);
    const atSeconds = start / sampleRate;
    const atMs = atSeconds * 1000;

    totalFrames++;
    peakRms = Math.max(rms, peakRms * 0.9995);

    const isActive = rms >= floor;
    if (isActive) {
      activeFrames++;
      const freq = byteSpectrum(frame, window);
      const f = extractFeatures(freq, frame, sampleRate, FFT_SIZE, -1);
      // Count bands carrying a meaningful share of this frame's energy.
      let concurrent = 0;
      for (const name of BAND_NAMES) if (f.ratios[name] >= 0.12) concurrent++;
      concurrencySum += concurrent;
    }

    const rising = rms > prevRms * 1.35 || (prevRms < floor && rms >= floor);
    if (isActive && rising && atMs - lastOnsetMs >= ONSET_DEBOUNCE_MS) {
      lastOnsetMs = atMs;

      let pitchHz = -1;
      if (tonalMode) {
        pitchHz = autoCorrelate(frame, sampleRate);
        if (!(pitchHz > MIN_TRACKABLE_HZ && pitchHz < MAX_TRACKABLE_HZ)) pitchHz = -1;
      }

      const freq = byteSpectrum(frame, window);
      const features = extractFeatures(freq, frame, sampleRate, FFT_SIZE, pitchHz);
      const { klass, confidence } = classifyOnset(features, eligible);

      const bandPeak = Math.max(
        features.bands.sub,
        features.bands.low,
        features.bands.lowMid,
        features.bands.mid,
        features.bands.high,
        features.bands.air
      );

      events.push({
        klass,
        velocity: rmsToVelocity(rms, peakRms),
        confidence,
        centroidHz: features.centroidHz,
        pitchHz,
        pitch: pitchHz > 0 ? freqToNoteName(pitchHz) : undefined,
        bands: features.bands,
        bandPeak,
        spectralEnergy: features.spectralEnergy,
        rms,
        modality,
        atMs,
        atSeconds,
        source: 'FILE',
      });
    }

    prevRms = rms;
  }

  const durationSec = buffer.duration;
  const activityDutyCycle = totalFrames > 0 ? activeFrames / totalFrames : 0;
  const meanConcurrentBands = activeFrames > 0 ? concurrencySum / activeFrames : 0;

  return {
    events,
    content: describeContent({
      durationSec,
      activityDutyCycle,
      meanConcurrentBands,
      onsetCount: events.length,
    }),
  };
}

/**
 * Turns the measurements into a suggestion — and admits when it cannot tell.
 *
 * One signal here is reliable in one direction: material that stops between
 * hits is not a finished mix, because a mix does not go quiet. That makes
 * "breathes therefore solo" a sound inference.
 *
 * The reverse does not hold. Continuous material is either a sustained solo
 * take or a full mix, and separating those needs a polyphony estimate. A
 * single-harmonic-series fit was tried and removed: at a low fundamental the
 * harmonic comb is finer than the FFT resolution, so it "explains" any dense
 * spectrum and scores a full mix higher than a solo hum. Rather than pre-select
 * a mode on a measurement that cannot support it, this reports the ambiguity
 * and leaves the choice where it already sat — with the creator.
 */
export function describeContent(metrics: ContentAnalysis['metrics']): ContentAnalysis {
  const { activityDutyCycle, meanConcurrentBands } = metrics;

  if (activityDutyCycle < 0.6) {
    return {
      suggestion: 'SOLO_PERFORMANCE',
      ambiguous: false,
      confidence: Math.max(0, Math.min(1, (0.6 - activityDutyCycle) / 0.4)),
      reason:
        `Sound stops between hits — only ${Math.round(activityDutyCycle * 100)}% of the file carries signal. ` +
        `A finished mix does not go quiet, so this is a solo performance.`,
      metrics,
    };
  }

  return {
    suggestion: 'FULL_MIX',
    ambiguous: true,
    confidence: 0,
    reason:
      `Sound runs continuously (${Math.round(activityDutyCycle * 100)}% of the file, ` +
      `${meanConcurrentBands.toFixed(1)} bands busy at once). That is true both of a held vocal or hum and ` +
      `of a finished mix, and the audio alone cannot tell them apart — pick whichever this is.`,
    metrics,
  };
}
