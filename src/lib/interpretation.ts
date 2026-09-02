/**
 * What SoulSonus believes a captured pass meant.
 *
 * The step between hearing a performance and rendering it. Today the system
 * makes this decision silently: `resolveCaptureTarget` routes a class to a
 * channel and the creator sees the result without ever seeing the question.
 * "Bummm-bum-ba-bumm" is not self-evidently a bass line, and the creator is
 * the only one who knows what it was.
 *
 * Two rules govern everything here, both from Amendment F.
 *
 * Interpretation never blocks capture. Every function in this file runs on
 * events that are already committed to tracks. Deleting this module returns
 * the app to its current behaviour exactly; nothing downstream waits on it.
 *
 * And nothing is invented. Every field of every hypothesis is derived from a
 * measurement the capture path already made -- the classifier's own margin,
 * its band ratios, the tracked fundamental, the onset spacing. `basis` is
 * required rather than optional because a percentage with no stated reason is
 * the invented-score failure this codebase already corrected once, in
 * `realizationRouter.describeCreatorFeel`.
 */

import { CaptureEvent } from '../audio/detectionEngine';
import { PERCUSSIVE_CLASSES, TONAL_SPLIT_HZ } from '../audio/performanceClassifier';
import { InstrumentType } from '../types/daw';

export interface RoleHypothesis {
  /** What to call this to the creator. */
  role: string;
  /** The channel kind it would become. */
  instrument: InstrumentType;
  /** What `RealizationRequest.targetRole` would carry if they choose it. */
  targetRole: string;
  /** 0..1. Derived from measurements, never assigned. */
  confidence: number;
  /** The measurements that produced it. Never empty. */
  basis: string[];
}

export interface Interpretation {
  /** Ranked, most likely first. Empty when the pass carried nothing to read. */
  hypotheses: RoleHypothesis[];
  /** Plain description of what was captured, in the creator's terms. */
  summary: string;
  /** What was measured, so the reading can be checked rather than trusted. */
  measured: {
    onsets: number;
    pitchedOnsets: number;
    percussiveOnsets: number;
    meanPitchHz: number | null;
    lowestPitchHz: number | null;
    highestPitchHz: number | null;
    meanConfidence: number;
    velocityRange: [number, number] | null;
    spanSeconds: number | null;
  };
}

const round = (n: number, places = 2) => Math.round(n * 10 ** places) / 10 ** places;

/**
 * How strongly a set of onsets supports a reading.
 *
 * Confidence is a statement about the evidence for this role, not about how
 * much of the pass it occupies. The first version multiplied by the share of
 * the pass, which meant a creator who beatboxed a kit and hummed a bassline in
 * one take got a *less* confident reading of each because the other existed.
 * That is backwards: a pass carrying both should read as confidently drums and
 * confidently bass. Share is still worth knowing, so it is stated in `basis`
 * rather than folded into the number.
 *
 * Sufficiency ramps from two supporting onsets to four. Two is the minimum
 * that can describe an interval or a rhythm at all; below four the reading is
 * held down because a handful of onsets is a fragment, not a phrase.
 */
function strengthOf(support: CaptureEvent[]): number {
  if (support.length < 2) return 0;
  const mean = support.reduce((a, e) => a + e.confidence, 0) / support.length;
  const sufficiency = Math.min(1, (support.length - 1) / 3);
  return round(mean * sufficiency, 3);
}

/**
 * True when percussive and pitched onsets sit on top of each other in time.
 *
 * A hybrid reading -- one gesture that is both a thump and a note -- only makes
 * sense when the two kinds of onset are the same events. A pass with drums in
 * one layer and a bassline in another is two parts, not one ambiguous one, and
 * offering "kick / bass hybrid" for it would be reading the take wrong.
 */
function overlapsInTime(a: CaptureEvent[], b: CaptureEvent[], windowSeconds = 0.06): boolean {
  const at = (e: CaptureEvent) => (typeof e.atSeconds === 'number' ? e.atSeconds : e.atMs / 1000);
  return a.some((x) => b.some((y) => Math.abs(at(x) - at(y)) <= windowSeconds));
}

const noteName = (hz: number) => {
  const midi = Math.round(12 * Math.log2(hz / 440) + 69);
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return `${names[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
};

/**
 * Reads a committed pass.
 *
 * Returns an empty interpretation rather than a guess when there is nothing to
 * read. A pass of one onset does not support a statement about what a creator
 * was playing, and saying so is more useful than a confident number.
 */
export function interpretPass(events: CaptureEvent[]): Interpretation {
  const empty: Interpretation = {
    hypotheses: [],
    summary: 'Nothing was captured in this pass.',
    measured: {
      onsets: 0,
      pitchedOnsets: 0,
      percussiveOnsets: 0,
      meanPitchHz: null,
      lowestPitchHz: null,
      highestPitchHz: null,
      meanConfidence: 0,
      velocityRange: null,
      spanSeconds: null,
    },
  };
  if (!events.length) return empty;

  const pitched = events.filter((e) => e.pitchHz > 0);
  const percussive = events.filter((e) => PERCUSSIVE_CLASSES.includes(e.klass));
  const pitches = pitched.map((e) => e.pitchHz);
  const velocities = events.map((e) => e.velocity);
  const times = events.map((e) => (typeof e.atSeconds === 'number' ? e.atSeconds : e.atMs / 1000));

  const measured: Interpretation['measured'] = {
    onsets: events.length,
    pitchedOnsets: pitched.length,
    percussiveOnsets: percussive.length,
    meanPitchHz: pitches.length ? round(pitches.reduce((a, b) => a + b, 0) / pitches.length, 1) : null,
    lowestPitchHz: pitches.length ? round(Math.min(...pitches), 1) : null,
    highestPitchHz: pitches.length ? round(Math.max(...pitches), 1) : null,
    meanConfidence: round(events.reduce((a, e) => a + e.confidence, 0) / events.length, 3),
    velocityRange: velocities.length ? [Math.min(...velocities), Math.max(...velocities)] : null,
    spanSeconds: times.length > 1 ? round(Math.max(...times) - Math.min(...times), 2) : null,
  };

  if (events.length < 2) {
    return {
      ...empty,
      measured,
      summary: 'One onset. Too little to read a musical role from -- perform a phrase and it can be.',
    };
  }

  const hypotheses: RoleHypothesis[] = [];
  const pitchStrength = strengthOf(pitched);
  const percStrength = strengthOf(percussive);
  const low = measured.meanPitchHz !== null && measured.meanPitchHz < TONAL_SPLIT_HZ;

  // --- pitched readings -------------------------------------------------
  if (pitched.length >= 2 && measured.meanPitchHz !== null) {
    const range = `${noteName(measured.lowestPitchHz!)} to ${noteName(measured.highestPitchHz!)}`;
    const pitchBasis = [
      `${pitched.length} of ${events.length} onsets carried a tracked fundamental`,
      ...(pitched.length < events.length ? ['the rest of the pass read percussive and is offered separately'] : []),
      `range ${range}`,
      `mean ${measured.meanPitchHz} Hz`,
    ];

    if (low) {
      hypotheses.push({
        role: 'Bass line',
        instrument: 'bass',
        targetRole: 'electric_bass',
        confidence: pitchStrength,
        basis: [...pitchBasis, `below the ${round(TONAL_SPLIT_HZ, 1)} Hz register split`],
      });
      hypotheses.push({
        role: 'Low synth',
        instrument: 'bass',
        targetRole: 'sub_synth',
        confidence: round(pitchStrength * 0.8, 3),
        basis: [...pitchBasis, 'same contour, rendered as synthesis rather than a played string'],
      });
      // Only when the two readings are the same gesture. Separate layers in
      // one take are two parts, not one ambiguous one.
      if (percussive.length && overlapsInTime(percussive, pitched)) {
        hypotheses.push({
          role: 'Kick / bass hybrid',
          instrument: 'kick',
          targetRole: 'studio_drum_kit',
          confidence: round(Math.min(pitchStrength, percStrength) * 0.9, 3),
          basis: ['percussive and pitched onsets land together, so one gesture may be both', `range ${range}`],
        });
      }
    } else {
      hypotheses.push({
        role: 'Lead line',
        instrument: 'melody',
        targetRole: 'lead_synth',
        confidence: pitchStrength,
        basis: [...pitchBasis, `above the ${round(TONAL_SPLIT_HZ, 1)} Hz register split`],
      });
      hypotheses.push({
        role: 'Keys / Rhodes',
        instrument: 'melody',
        targetRole: 'vintage_rhodes',
        confidence: round(pitchStrength * 0.85, 3),
        basis: [...pitchBasis, 'sustained register suits a struck key'],
      });
      hypotheses.push({
        role: 'Vocal line',
        instrument: 'vocal_synth',
        targetRole: 'lead_vocal',
        confidence: round(pitchStrength * 0.7, 3),
        basis: [...pitchBasis, 'kept as sung rather than rendered as an instrument'],
      });
    }
  }

  // --- percussive readings ----------------------------------------------
  if (percussive.length >= 2) {
    const kinds = [...new Set(percussive.map((e) => e.klass))];
    const perBar = measured.spanSeconds ? round(percussive.length / Math.max(1, measured.spanSeconds), 1) : null;
    const percBasis = [
      `${percussive.length} percussive onsets across ${kinds.length} sound ${kinds.length === 1 ? 'type' : 'types'} (${kinds.join(', ')})`,
      ...(perBar !== null ? [`${perBar} per second`] : []),
      ...(measured.velocityRange ? [`velocity ${measured.velocityRange[0]}-${measured.velocityRange[1]}`] : []),
    ];
    hypotheses.push({
      role: kinds.length > 1 ? 'Drum kit' : `${kinds[0]} layer`,
      instrument: kinds[0] as InstrumentType,
      targetRole: kinds.length > 1 ? 'studio_drum_kit' : `acoustic_${kinds[0]}`,
      confidence: percStrength,
      basis: percBasis,
    });
    if (kinds.length > 1) {
      hypotheses.push({
        role: 'Percussion layer',
        instrument: 'percussion',
        targetRole: 'hand_percussion',
        confidence: round(percStrength * 0.6, 3),
        basis: [...percBasis, 'read as texture beside a kit rather than as the kit'],
      });
    }
  }

  hypotheses.sort((a, b) => b.confidence - a.confidence);

  const parts: string[] = [`${events.length} onsets`];
  if (measured.spanSeconds) parts.push(`over ${measured.spanSeconds}s`);
  if (pitched.length) parts.push(`${pitched.length} pitched, ${noteName(measured.lowestPitchHz!)} to ${noteName(measured.highestPitchHz!)}`);
  if (percussive.length) parts.push(`${percussive.length} percussive`);

  return {
    hypotheses,
    summary: hypotheses.length
      ? `${parts.join(', ')}.`
      : `${parts.join(', ')}. Nothing in this pass reads as a musical role yet.`,
    measured,
  };
}
