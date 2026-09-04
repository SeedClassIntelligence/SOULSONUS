/**
 * One performance, read by every processor at once.
 *
 * SRT-1 III, on singing: a sung input "can supply simultaneously" melody,
 * rhythm, emotional state, lyrical fragments, cadence, phrasing, vocal style
 * and structural clues -- "SoulSonus should not unnecessarily destroy the
 * multidimensional character of the input. A single performance can feed
 * several processors."
 *
 * The processors existed and each ran somewhere else. A pass was interpreted
 * for its role in one place, read for its affect in another, and read as a
 * lyric seed only when a workstation was opened -- each rebuilding its own
 * view of the same onsets, and each able to drift from the others. This is the
 * one place a performance is read, and it reads it every way at once.
 *
 * Nothing here is a new analysis. It is the fan-out itself: the same events go
 * to every processor, none of them consumes the events, and each result says
 * what it could not read rather than borrowing from a sibling. That last part
 * is the rule -- a fan-out whose branches fill each other's gaps is one
 * processor pretending to be four.
 */

import type { ExpressionState } from '../types/daw';
import { interpretPass, type Interpretation } from '../lib/interpretation';
import { deriveLyricSeed, type LyricSeed } from '../lib/lyricSeed';
import { deriveExpression, type ExpressionOnset } from './expressionState';
import type { CaptureEvent } from './detectionEngine';

export interface FanoutResult {
  /** What the pass appears to be, as a ranked set of roles (SRT-1 IV / VIII). */
  interpretation: Interpretation;
  /** The seven affective dimensions, as far as they were measured (SRT-1 V). */
  expression: ExpressionState;
  /** The same performance as a cadence to fit language to (SRT-1 VI, Mode B). */
  lyricSeed: LyricSeed;
  /** How many onsets every branch was given. The same number, by construction. */
  onsets: number;
}

/** The subset of a capture event each processor reads. */
const toExpressionOnsets = (events: CaptureEvent[]): ExpressionOnset[] =>
  events.map((e) => ({
    velocity: e.velocity,
    atSeconds:
      typeof e.atSeconds === 'number' ? e.atSeconds : (e.atMs - (events[0]?.atMs ?? 0)) / 1000,
    centroidHz: e.centroidHz,
    pitchHz: e.pitchHz,
    bands: e.bands as unknown as Record<string, number>,
  }));

/**
 * Runs every processor over one performance.
 *
 * `declaredTargetId` is the creator's own declaration of what they were
 * imitating, which the interpretation weighs as a prior and the others do not
 * see -- an affective reading is not more or less confident because someone
 * said "808".
 */
export function fanOutPerformance(
  events: CaptureEvent[],
  opts: {
    bpm: number;
    declaredTargetId?: string | null;
    /** What the creator says the take is about. Never inferred. */
    semanticIntent?: string | null;
  }
): FanoutResult {
  const onsets = toExpressionOnsets(events);
  const expression = deriveExpression(onsets);
  return {
    interpretation: interpretPass(events, opts.declaredTargetId ?? null),
    expression,
    // The lyric seed is given the affective reading because SRT-1 VI names
    // emotional tone among what Mode B preserves -- it is carried, not
    // re-derived, so there is one answer to what the take expresses.
    lyricSeed: deriveLyricSeed(
      onsets.map((o) => ({
        atSeconds: o.atSeconds,
        velocity: o.velocity,
        pitchHz: o.pitchHz,
      })),
      { bpm: opts.bpm, semanticIntent: opts.semanticIntent ?? null, expression }
    ),
    onsets: events.length,
  };
}

/**
 * What a second processor heard in material the creator routed to the first.
 *
 * An imported file goes down one path -- the spectral classifier, or the pitch
 * transcriber -- and whichever the creator picked, the other one is not asked.
 * The measurement recorded in the retrofit plan says both can be asked over
 * the same audio safely: percussion never drove the transcriber to produce a
 * note at any threshold, so running it alongside the classifier cannot steal
 * percussive hits.
 *
 * This reports the second reading rather than committing it. Nothing is
 * written to a track from here: the creator chose what to import as, and
 * silently doubling their material would be the fan-out destroying the take it
 * exists to protect. What they get is the sentence -- there is pitched
 * material in this file too, and here is how much.
 */
export interface SecondOpinion {
  /** Which processor was not the one the creator routed to. */
  processor: 'PITCH_TRANSCRIBER' | 'SPECTRAL_CLASSIFIER';
  /** What it heard, in counts. Zero is a real answer and is reported as one. */
  found: number;
  /** One sentence for the creator. Empty when there is nothing to say. */
  says: string;
}

export function secondOpinionOfPitch(noteCount: number): SecondOpinion {
  return {
    processor: 'PITCH_TRANSCRIBER',
    found: noteCount,
    says: noteCount
      ? `The pitch transcriber also heard ${noteCount} pitched note${noteCount === 1 ? '' : 's'} in this file. ` +
        `They were not written — you imported this as a performance. Import it again as a melody to keep them.`
      : 'The pitch transcriber found nothing pitched in this file, so nothing was lost by reading it as percussion.',
  };
}

export function secondOpinionOfPercussion(eventCount: number, classes: string[]): SecondOpinion {
  return {
    processor: 'SPECTRAL_CLASSIFIER',
    found: eventCount,
    says: eventCount
      ? `The classifier also heard ${eventCount} percussive hit${eventCount === 1 ? '' : 's'} ` +
        `(${classes.join(', ')}) in this file. They were not written — you imported this as a melody. ` +
        `Import it again as a performance to keep them.`
      : 'The classifier found no percussive hits in this file, so nothing was lost by reading it as a melody.',
  };
}
