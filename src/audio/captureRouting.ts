/**
 * Routes one classified capture event to exactly one channel.
 *
 * Kept pure and separate from the detection engine so the decision can be made
 * inside a React state updater against the authoritative track list — a channel
 * created on demand for a newly-heard sound type is visible to the very next
 * event, with no races against async state.
 */

import { Track, InstrumentType, SourceModality } from '../types/daw';
import { PerformanceClass } from './performanceClassifier';
import { CaptureEvent } from './detectionEngine';

/** Instrument that owns each performance class when no calibrated profile matches. */
const CLASS_INSTRUMENT: Record<PerformanceClass, InstrumentType[]> = {
  kick: ['kick'],
  snare: ['snare'],
  hihat: ['hihat'],
  tonal_low: ['bass'],
  tonal_high: ['melody', 'vocal_synth'],
};

/** Channel spec used when a performed sound type has nowhere to land yet. */
export interface ChannelRequest {
  klass: PerformanceClass;
  name: string;
  instrument: InstrumentType;
  pitch: string;
  color: string;
}

const CHANNEL_SPEC: Record<PerformanceClass, Omit<ChannelRequest, 'klass'>> = {
  kick: { name: 'Kick (Captured)', instrument: 'kick', pitch: 'C1', color: '#f59e0b' },
  snare: { name: 'Snare (Captured)', instrument: 'snare', pitch: 'C2', color: '#06b6d4' },
  hihat: { name: 'Hi-Hat (Captured)', instrument: 'hihat', pitch: 'F#3', color: '#10b981' },
  tonal_low: { name: 'Sub / Bass (Captured)', instrument: 'bass', pitch: 'C1', color: '#f43f5e' },
  tonal_high: { name: 'Lead / Voice (Captured)', instrument: 'melody', pitch: 'C3', color: '#a855f7' },
};

export type RouteDecision =
  | { kind: 'track'; trackId: string; reason: 'calibrated' | 'source_track' | 'instrument' }
  | { kind: 'create'; request: ChannelRequest }
  | { kind: 'drop'; reason: string };

/**
 * Scores how well a calibrated track profile explains this event: the event's
 * energy must sit inside the profile's band and clear the profile's threshold.
 */
function calibratedScore(track: Track, event: CaptureEvent): number {
  const profile = track.detectionProfile;
  if (!profile || !(profile.centerFreq > 0)) return 0;
  const q = profile.q || 2.0;
  const width = profile.centerFreq / q;
  const lo = profile.centerFreq - width / 2;
  const hi = profile.centerFreq + width / 2;
  if (event.centroidHz < lo || event.centroidHz > hi) return 0;
  if (event.bandPeak < profile.threshold) return 0;
  // Closer to the calibrated centre is a better explanation.
  const octaves = Math.abs(Math.log2(Math.max(1, event.centroidHz) / profile.centerFreq));
  return 1 / (1 + octaves);
}

export function resolveCaptureTarget(tracks: Track[], event: CaptureEvent): RouteDecision {
  const audible = tracks.filter((t) => !t.mute);
  if (!audible.length) return { kind: 'drop', reason: 'all_tracks_muted' };

  // 1. A track the creator personally calibrated wins over any default mapping.
  let bestCalibrated: { track: Track; score: number } | null = null;
  for (const track of audible) {
    const score = calibratedScore(track, event);
    if (score > 0 && (!bestCalibrated || score > bestCalibrated.score)) {
      bestCalibrated = { track, score };
    }
  }
  if (bestCalibrated) {
    return { kind: 'track', trackId: bestCalibrated.track.id, reason: 'calibrated' };
  }

  const instruments = CLASS_INSTRUMENT[event.klass];

  // 2. Prefer the seed track just armed for this modality, so a hum lands on the
  //    channel the creator visibly created by pressing the button.
  const modalitySource = audible.find(
    (t) =>
      t.isSourceTrack &&
      t.sourceModality === (event.modality as SourceModality | null) &&
      instruments.includes(t.instrument)
  );
  if (modalitySource) return { kind: 'track', trackId: modalitySource.id, reason: 'source_track' };

  // 3. Otherwise the project's channel for that instrument.
  for (const instrument of instruments) {
    const match = audible.find((t) => t.instrument === instrument);
    if (match) return { kind: 'track', trackId: match.id, reason: 'instrument' };
  }

  // 4. Nothing can host this sound type yet — ask for a dedicated channel.
  return { kind: 'create', request: { klass: event.klass, ...CHANNEL_SPEC[event.klass] } };
}
