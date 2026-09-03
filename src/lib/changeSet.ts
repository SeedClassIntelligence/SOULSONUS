/**
 * What a proposal will change, and what it guarantees it will not.
 *
 * Clause C.6 names the shape: "what it proposes to change, what it guarantees
 * it will not change, Preview, Apply, Alternative and Reject." The drawer had
 * the first two as data and presented neither as a promise -- two boxes headed
 * LOCKED INVARIANTS and MUTABLE ATTRIBUTES, each rendering `array.join(' • ')`.
 * An empty array under a heading reading LOCKED INVARIANTS says nothing is
 * locked, which is the opposite of the guarantee the heading implies.
 *
 * The guarantee is the whole point of the object. Amendment A.13 calls it the
 * sentence that makes the intelligence trustworthy, so it has to be true, and
 * a promise is only worth what is behind it. Three things can be behind one
 * here and they are not equal:
 *
 *   MEASURED         the contract scored rendered audio and this property
 *                    held. The strongest, and the only one that has actually
 *                    been checked.
 *   BY_CONTRACT      the contract will hold it, and there is no audio yet to
 *                    check. A promise, honestly labelled as one.
 *   BY_CONSTRUCTION  the change cannot touch it. A DSP patch writes the keys
 *                    it names and no others, so everything else on that track
 *                    is untouched by the shape of the operation rather than by
 *                    anyone's assurance.
 *
 * A checkmark next to a property nobody measured, with no note saying so,
 * would be the same defect as a signature hash typed into a source file.
 */

import type { GenerationCandidate, TrackDspSettings } from '../types/daw';
import { DEFAULT_PRESERVE, type PreservableProperty } from './intentPolicy';

export type GuaranteeBasis = 'MEASURED' | 'BY_CONTRACT' | 'BY_CONSTRUCTION';

export interface ChangeGuarantee {
  property: string;
  basis: GuaranteeBasis;
  /** Why this guarantee holds, in one line. Never empty. */
  detail: string;
}

/** The four C.6 names. Nothing else belongs on a proposal's action row. */
export type ChangeSetAction = 'PREVIEW' | 'APPLY' | 'ALTERNATIVE' | 'REJECT';

export const CHANGESET_ACTIONS: ChangeSetAction[] = ['PREVIEW', 'APPLY', 'ALTERNATIVE', 'REJECT'];

export const ACTION_MEANING: Record<ChangeSetAction, string> = {
  PREVIEW: 'Hear it without committing anything.',
  APPLY: 'Commit it to the session as a new revision.',
  ALTERNATIVE: 'Ask the same question again, without this answer.',
  REJECT: 'Turn it down, and say what you heard instead.',
};

export interface ChangeSet {
  /** What it proposes to change, in the creator's terms. */
  willChange: string[];
  /** What it guarantees it will not, each with what is behind the guarantee. */
  willNotChange: ChangeGuarantee[];
  actions: ChangeSetAction[];
  /**
   * Said when there is nothing to promise. An empty guarantee list under a
   * heading is worse than a sentence admitting the proposal makes no promise,
   * because the heading implies one.
   */
  note: string | null;
}

const PROPERTY_LABEL: Record<string, string> = {
  rhythm: 'your rhythm',
  timing: 'your timing',
  pitchContour: 'your pitch contour',
  articulation: 'your articulation',
};

const label = (p: string) => PROPERTY_LABEL[p] || p.replace(/_/g, ' ');

/**
 * Builds the contract for one proposal.
 *
 * `preserve` is the creator's own preserve set from Step 3b, so an unlocked
 * property is not promised back to them: they took it out of the contract, and
 * claiming the studio will hold it anyway would be a promise nothing enforces.
 */
export function buildChangeSet(input: {
  candidate?: GenerationCandidate | null;
  dspSettings?: Partial<TrackDspSettings> | null;
  /** The creator's preserve set. Defaults to the contract's long-standing four. */
  preserve?: PreservableProperty[];
  trackName?: string;
}): ChangeSet {
  const preserve = input.preserve ?? DEFAULT_PRESERVE;
  const willChange: string[] = [];
  const willNotChange: ChangeGuarantee[] = [];

  const candidate = input.candidate;
  if (candidate) {
    for (const p of candidate.modifiedProperties || []) willChange.push(label(p));

    // Measured beats promised, and the difference is stated rather than
    // flattened into one list of ticks.
    const measured = new Set(candidate.preservedProperties || []);
    for (const p of preserve) {
      if (measured.has(p)) {
        const score = candidate.preservationScores?.[p];
        willNotChange.push({
          property: label(p),
          basis: 'MEASURED',
          detail:
            typeof score === 'number'
              ? `scored ${score.toFixed(2)} against the contract on the rendered audio`
              : 'the contract scored the rendered audio and this held',
        });
      } else {
        willNotChange.push({
          property: label(p),
          basis: 'BY_CONTRACT',
          detail:
            candidate.scoreBasis === 'NOT_MEASURED'
              ? 'nothing has been rendered yet, so this is the contract’s promise and not a reading'
              : 'held by the intent contract; not confirmed on audio yet',
        });
      }
    }
  }

  const dsp = input.dspSettings;
  if (dsp && Object.keys(dsp).length) {
    for (const key of Object.keys(dsp)) willChange.push(label(key));
    willNotChange.push({
      property: input.trackName ? `everything else on ${input.trackName}` : 'every other setting',
      basis: 'BY_CONSTRUCTION',
      detail: `this writes ${Object.keys(dsp).length} named setting${Object.keys(dsp).length === 1 ? '' : 's'} and touches nothing else`,
    });
    willNotChange.push({
      property: 'your performance',
      basis: 'BY_CONSTRUCTION',
      detail: 'a mix setting does not alter a single note you played',
    });
  }

  const note =
    willNotChange.length === 0
      ? 'This proposal makes no guarantee, because nothing here declares what it would leave alone.'
      : null;

  return { willChange, willNotChange, actions: CHANGESET_ACTIONS, note };
}

/** How strong the strongest guarantee is, for ordering and for colour. */
export const BASIS_RANK: Record<GuaranteeBasis, number> = {
  MEASURED: 3,
  BY_CONSTRUCTION: 2,
  BY_CONTRACT: 1,
};

export const BASIS_LABEL: Record<GuaranteeBasis, string> = {
  MEASURED: 'measured',
  BY_CONSTRUCTION: 'by construction',
  BY_CONTRACT: 'promised, not yet checked',
};
