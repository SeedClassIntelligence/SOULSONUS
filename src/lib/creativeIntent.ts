/**
 * Creative Intent: the middle of the sentence.
 *
 * Amendment A.8 puts it plainly -- the platform does performance and it does
 * realization, and what sits between them is not shown to anyone. Clause IV.4
 * asks for that middle to be a distinct, addressable representation rather
 * than an implication drawn from a track's settings, and C.4 names the six
 * things it carries.
 *
 * The rule this file follows is the one `realizationRouter.describeCreatorFeel`
 * established: only measured things become words. Every field is nullable, and
 * an unmeasured field says nothing rather than defaulting to something
 * plausible. `notMeasured` names each absence out loud, because an intent
 * model that quietly fills its own gaps is a worse object than one that has
 * gaps -- the gaps are the honest part, and they are what the next steps are
 * for.
 *
 * Phase 3a is read-only. Nothing here changes a realization; it states what
 * the platform already knows about what the creator is going for, derived from
 * measurements taken elsewhere and never re-derived here.
 */

import type { PocketMeasure, StyleProfile } from './styleProfile';
import type { ArrangementSection, RealizationScoreMap } from '../types/daw';

/** Where a value came from, so a reading can be checked rather than trusted. */
export interface IntentBasis {
  /** What was measured, in the creator's terms. */
  reads: string;
  /** The measurement behind it. Never empty when `reads` is set. */
  from: string;
}

export interface CreativeIntent {
  /**
   * The seven affective dimensions. Null until Step 6 measures them -- there
   * is no emotion analysis in this build, and a neutral default here would be
   * a reading of a creator nobody took.
   */
  expression: null;

  /** How the creator's onsets actually sit against the grid. */
  groove: (IntentBasis & { readsAs: PocketMeasure['reads']; meanOffsetMs: number }) | null;

  /** How hard they play, from measured velocity. */
  energy: (IntentBasis & { meanVelocity: number }) | null;

  /** What the realization contract will not let a model change. */
  preserve: (IntentBasis & { properties: (keyof RealizationScoreMap)[] }) | null;

  /** What it is permitted to change. */
  transform: (IntentBasis & { properties: string[] }) | null;

  /** The shape of the song across its sections. */
  arrangementTrajectory: (IntentBasis & { sections: string[] }) | null;

  /**
   * Genre as a set of rules rather than a label. Nothing in this build
   * measures it, so it stays null and is named below.
   */
  genreGrammar: null;

  /**
   * Every field above that has no measurement behind it, named. Read this
   * before believing the object is complete.
   */
  notMeasured: string[];
}

/** What the intent contract locks by default, and what it lets a model move. */
export const CONTRACT_PRESERVES: (keyof RealizationScoreMap)[] = [
  'rhythm',
  'timing',
  'pitchContour',
  'articulation',
];

/**
 * Reads the intent out of what has already been measured.
 *
 * Takes measurements rather than raw material on purpose: this must not become
 * a second place that computes pocket or velocity, because two answers to the
 * same question is how a platform starts disagreeing with itself.
 */
export function deriveCreativeIntent(input: {
  style: StyleProfile | null;
  sections: ArrangementSection[];
  /** What the active route permits a model to change. Empty when none is chosen. */
  transformable?: string[];
}): CreativeIntent {
  const notMeasured: string[] = [];

  // --- groove ---------------------------------------------------------
  const pocket = input.style?.performance?.pocket ?? null;
  const groove =
    pocket && pocket.onsets > 0
      ? {
          readsAs: pocket.reads,
          meanOffsetMs: pocket.meanOffsetMs,
          reads: pocket.reads,
          from: `${pocket.onsets} onsets, mean ${pocket.meanOffsetMs > 0 ? '+' : ''}${pocket.meanOffsetMs.toFixed(1)} ms against the 16th, spread ${pocket.spreadMs.toFixed(1)} ms`,
        }
      : null;
  if (!groove) notMeasured.push('groove — not enough onsets have been performed to read a pocket');

  // --- energy ---------------------------------------------------------
  const velocity = input.style?.performance?.velocity ?? null;
  const energy = velocity
    ? {
        meanVelocity: velocity.mean,
        reads:
          velocity.mean >= 100 ? 'played hard' : velocity.mean >= 70 ? 'played moderately' : 'played softly',
        from: `mean velocity ${Math.round(velocity.mean)} across ${velocity.min}-${velocity.max}`,
      }
    : null;
  if (!energy) notMeasured.push('energy — no performed note carries a velocity yet');

  // --- preserve -------------------------------------------------------
  // Not a preference and not a guess: these are the properties the intent
  // contract scores every candidate against, so they are what the platform
  // will actually hold on to.
  const preserve = {
    properties: CONTRACT_PRESERVES,
    reads: 'rhythm, timing, pitch contour and articulation are held',
    from: 'the intent contract scores every realization candidate against these four',
  };

  // --- transform ------------------------------------------------------
  const transformable = input.transformable ?? [];
  const transform = transformable.length
    ? {
        properties: transformable,
        reads: transformable.join(', ').replace(/_/g, ' ') + ' may change',
        from: 'declared mutable by the route currently selected',
      }
    : null;
  if (!transform) {
    notMeasured.push('transform — no realization route is selected, so nothing is permitted to change yet');
  }

  // --- arrangement trajectory -----------------------------------------
  const names = input.sections.map((s) => s.name).filter(Boolean);
  const arrangementTrajectory = names.length
    ? {
        sections: names,
        reads: names.join(' → '),
        from: `${names.length} sections in the arrangement`,
      }
    : null;
  if (!arrangementTrajectory) notMeasured.push('arrangement trajectory — the song has no sections yet');

  notMeasured.push('emotion — the seven affective dimensions are not measured in this build');
  notMeasured.push('genre grammar — nothing measures genre as a rule set yet');

  return {
    expression: null,
    groove,
    energy,
    preserve,
    transform,
    arrangementTrajectory,
    genreGrammar: null,
    notMeasured,
  };
}

/** How much of the intent is actually known. Stated, never rounded up. */
export function intentCoverage(intent: CreativeIntent): { known: number; total: number } {
  const fields = [
    intent.expression,
    intent.groove,
    intent.energy,
    intent.preserve,
    intent.transform,
    intent.arrangementTrajectory,
    intent.genreGrammar,
  ];
  return { known: fields.filter(Boolean).length, total: fields.length };
}
