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
import { agreementWith, targetById, type MimicryTarget } from './mimicryTarget';

export interface RoleHypothesis {
  /** What to call this to the creator. */
  role: string;
  /** True when this reading exists because the creator declared the target. */
  declared?: boolean;
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
  /** The target the creator declared before performing, when they declared one. */
  declaredTarget?: MimicryTarget | null;
  /**
   * Set when the take measurably contradicts what the creator said they were
   * imitating. Never suppresses anything -- it is said alongside the readings,
   * because a declaration the audio disagrees with is worth knowing about at
   * the moment it happens rather than three mixes later.
   */
  disagreement?: string | null;
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
export function interpretPass(
  events: CaptureEvent[],
  /**
   * Optional. Section VIII.2 forbids requiring an instrument up front, so this
   * only ever reweights a ranking the measurements produce anyway.
   */
  declaredTargetId?: string | null
): Interpretation {
  const declaredTarget = targetById(declaredTargetId);
  const empty: Interpretation = {
    hypotheses: [],
    declaredTarget,
    disagreement: null,
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
      declaredTarget,
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

  // --- the declared target ----------------------------------------------
  // Added last, on the same terms as every reading above it: a confidence
  // derived from the same strength numbers, scaled by how far the take agrees
  // with what the target should measure like. It is appended to the list and
  // then sorted with the rest -- it does not displace anything, and it does not
  // win by being declared. Where the evidence for it is thin it sorts low,
  // which is the honest outcome and the one VIII.2 asks for.
  let disagreement: string | null = null;
  if (declaredTarget) {
    const agreement = agreementWith(declaredTarget, measured);
    disagreement = agreement.contradicts;
    const base = declaredTarget.expects.pitched ? pitchStrength : percStrength;
    const confidence = round(base * agreement.score, 3);

    const declaredBasis = [
      `you said you were imitating a ${declaredTarget.label.toLowerCase()}`,
      ...agreement.reasons,
      ...(agreement.contradicts ? ['which the take does not support'] : []),
    ];

    // The measurements may already have found this exact reading. Listing it
    // twice -- once measured, once declared, same words, same number -- reads as
    // a fault in the studio, so the existing row is marked instead of doubled.
    const already = hypotheses.find((h) => h.targetRole === declaredTarget.targetRole);
    if (already) {
      // Both numbers come from the same evidence, by different routes; neither
      // can exceed the strength of the pass. Taking the higher lets a
      // declaration lift a reading the measurement ranked conservatively,
      // without inventing confidence that the take does not carry.
      already.confidence = Math.max(already.confidence, confidence);
      already.declared = true;
      already.basis = [...already.basis, ...declaredBasis];
    } else {
      hypotheses.push({
        role: declaredTarget.label,
        instrument: declaredTarget.instrument,
        targetRole: declaredTarget.targetRole,
        confidence,
        declared: true,
        basis: declaredBasis,
      });
    }
  }

  // Ranked on confidence. Where two readings are equally supported, the one the
  // creator declared goes first -- that is the entire job of a prior, and it
  // still never outranks better evidence.
  hypotheses.sort(
    (a, b) => b.confidence - a.confidence || Number(!!b.declared) - Number(!!a.declared)
  );

  const parts: string[] = [`${events.length} onsets`];
  if (measured.spanSeconds) parts.push(`over ${measured.spanSeconds}s`);
  if (pitched.length) parts.push(`${pitched.length} pitched, ${noteName(measured.lowestPitchHz!)} to ${noteName(measured.highestPitchHz!)}`);
  if (percussive.length) parts.push(`${percussive.length} percussive`);

  return {
    hypotheses,
    declaredTarget,
    disagreement,
    summary: hypotheses.length
      ? `${parts.join(', ')}.`
      : `${parts.join(', ')}. Nothing in this pass reads as a musical role yet.`,
    measured,
  };
}


/**
 * Rebuilds readable events from notes already on a track.
 *
 * Amendment F.iv makes re-interpretation a permanent affordance on all
 * captured material -- "not a prompt shown once at capture time" -- and until
 * this existed it was exactly that prompt, offered after a pass and gone.
 *
 * The honest limitation, stated because it changes what the reading means: a
 * stored note does not carry the percussive class the detector gave it. What
 * it carries is the track it landed on, which is the system's own decision
 * about what it was. So this reads the class from the channel rather than from
 * the audio. Re-running the classifier over the recorded take would be a
 * stronger answer and needs the audio, not the notes.
 */
export function eventsFromTrack(
  track: { instrument: string; noteEvents?: NoteEventLike[] },
  bpm: number
): CaptureEvent[] {
  const notes = track.noteEvents || [];
  const percussive: Record<string, string> = {
    kick: 'kick',
    snare: 'snare',
    hihat: 'hihat',
    percussion: 'snare',
  };
  return notes.map((n) => {
    const hz = 440 * Math.pow(2, (n.midiNote - 69) / 12);
    const klass =
      percussive[track.instrument] ??
      (hz > 0 && hz < TONAL_SPLIT_HZ ? 'tonal_low' : 'tonal_high');
    const isPerc = klass in { kick: 1, snare: 1, hihat: 1 };
    return {
      klass,
      pitchHz: isPerc ? 0 : Math.round(hz * 10) / 10,
      velocity: n.velocity,
      confidence: n.provenance?.detectionConfidence ?? 0.7,
      atSeconds: (n.startTick / 480) * (60 / Math.max(1, bpm)),
      atMs: (n.startTick / 480) * (60000 / Math.max(1, bpm)),
    } as unknown as CaptureEvent;
  });
}

interface NoteEventLike {
  midiNote: number;
  velocity: number;
  startTick: number;
  provenance?: { detectionConfidence?: number };
}
