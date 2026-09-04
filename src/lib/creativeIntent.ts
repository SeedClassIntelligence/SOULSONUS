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
import type { ArrangementSection, ExpressionState, RealizationScoreMap } from '../types/daw';
import { conditionGenre, grammarById, GENRE_DIMENSION_LABEL, type ConditionedGenre } from './genreGrammar';
import { DEFAULT_PRESERVE, type PreservableProperty } from './intentPolicy';

/** Where a value came from, so a reading can be checked rather than trusted. */
export interface IntentBasis {
  /** What was measured, in the creator's terms. */
  reads: string;
  /** The measurement behind it. Never empty when `reads` is set. */
  from: string;
}

export interface CreativeIntent {
  /**
   * The seven affective dimensions SRT-1 V names.
   *
   * Measured in `audio/expressionState` from the pass itself and passed in
   * here rather than re-derived, for the same reason pocket and velocity are:
   * two places computing the same answer is how a platform starts disagreeing
   * with itself. Null when no pass has been read; individual dimensions inside
   * it are null when the material could not support them.
   */
  expression: ExpressionState | null;

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
   * Genre as a set of rules rather than a label (SRT-1 XIV).
   *
   * Null until the creator names one. Nothing here classifies their material:
   * a studio that listened to a take and announced its genre would be
   * producing the output label the section rules out, and making a claim about
   * the person rather than a measurement of the audio.
   */
  genreGrammar: (IntentBasis & { conditioned: ConditionedGenre }) | null;

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
  /** The affective reading of the last pass, measured elsewhere. */
  expression?: ExpressionState | null;
  /** The production grammar the creator named, by id. Never inferred. */
  genreId?: string | null;
  /** What the creator's contract holds, so a grammar cannot reach past it. */
  preserve?: PreservableProperty[];
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

  // --- expression ------------------------------------------------------
  //
  // The state carries its own absences by dimension, so this only reports the
  // case where there is no reading at all. Anything else would restate what
  // the state already says, and restating it here is how the two would drift.
  const expression = input.expression ?? null;
  if (!expression) {
    notMeasured.push('emotion — no pass has been read yet, so there is nothing to say about it');
  } else if (expression.notMeasured.length) {
    for (const line of expression.notMeasured) notMeasured.push(`emotion: ${line}`);
  }
  // --- genre grammar ---------------------------------------------------
  const grammar = grammarById(input.genreId);
  const conditioned = grammar
    ? conditionGenre(grammar, input.preserve ?? DEFAULT_PRESERVE)
    : null;
  const genreGrammar = conditioned
    ? {
        conditioned,
        reads: `${conditioned.grammar.label} — ${conditioned.conditioned
          .map((d) => GENRE_DIMENSION_LABEL[d])
          .join(', ')}`,
        from: conditioned.withheld.length
          ? `named by you; ${conditioned.withheld
              .map((w) => GENRE_DIMENSION_LABEL[w.dimension])
              .join(' and ')} withheld because your contract holds ${conditioned.withheld
              .map((w) => w.property)
              .join(' and ')}`
          : 'named by you; the contract holds nothing this grammar needs',
      }
    : null;
  if (!genreGrammar) {
    notMeasured.push(
      'genre grammar — you have not named one, and nothing here classifies your material'
    );
  }

  return {
    expression,
    groove,
    energy,
    preserve,
    transform,
    arrangementTrajectory,
    genreGrammar,
    notMeasured,
  };
}

/** How much of the intent is actually known. Stated, never rounded up. */
export function intentCoverage(intent: CreativeIntent): { known: number; total: number } {
  // An expression state whose seven dimensions are all null is a field that
  // exists rather than a field that is known, and counting the object would
  // report the intent as more complete than it is.
  const expressionKnown =
    intent.expression &&
    (intent.expression.valence ||
      intent.expression.arousal ||
      intent.expression.tension ||
      intent.expression.confidence ||
      intent.expression.intimacy ||
      intent.expression.darkness ||
      intent.expression.movement)
      ? intent.expression
      : null;
  const fields = [
    expressionKnown,
    intent.groove,
    intent.energy,
    intent.preserve,
    intent.transform,
    intent.arrangementTrajectory,
    intent.genreGrammar,
  ];
  return { known: fields.filter(Boolean).length, total: fields.length };
}
