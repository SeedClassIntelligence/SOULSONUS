/**
 * The rule that language fits the performance, and not the reverse.
 *
 * Amendment E.3 and the retrofit plan state it as the binding constraint of
 * this workstation: "a proposal that changes the syllable count, the stress
 * pattern or the rhyme position is rejected before it is shown. The creator
 * performed the cadence; language fits it, not the reverse."
 *
 * So this is a gate, not a score. A candidate that breaks the cadence does not
 * appear as an option with a warning on it -- it does not appear. What the
 * creator sees instead is that something was refused and why, which is the
 * difference between a studio that protects their performance and one that
 * asks them to notice a problem in a list.
 *
 * Three checks, and they are not equally certain, which is stated here rather
 * than hidden behind one verdict:
 *
 *   syllable count   Exact and decidable. A phrase performed with nine
 *                    syllables takes nine.
 *   rhyme position   Exact and decidable. The rhyme lands on the last
 *                    syllable of the phrase, so a candidate must end its
 *                    phrase where the performance ended it.
 *   stress           Decidable only in one direction. English stress is not
 *                    recoverable from spelling without a pronunciation
 *                    dictionary this build does not have, so the check does
 *                    not claim to know which syllable of a word is stressed.
 *                    It enforces the one thing that is knowable: a beat the
 *                    creator hit lands on the start of a word. That is the
 *                    rule, named, and it is wrong about "ig-NITE" -- a word
 *                    whose stress is on its second syllable will be refused
 *                    on a stressed beat. Refusing a good line costs the
 *                    creator a suggestion; accepting a line that moves their
 *                    beat costs them the take's cadence.
 */

import type { LyricSeed } from './lyricSeed';
import { countLine, syllabify } from './syllables';

export type CadenceViolationKind = 'SYLLABLE_COUNT' | 'STRESS_PATTERN' | 'RHYME_POSITION';

export interface CadenceViolation {
  kind: CadenceViolationKind;
  /** What is wrong, in the creator's terms. Never a code. */
  says: string;
}

export interface CadenceCheck {
  ok: boolean;
  violations: CadenceViolation[];
  /** What the candidate was measured to carry. */
  syllableCount: number;
  /** What the performance carries. */
  performedCount: number;
  /** The stress pattern the candidate would impose, where it is knowable. */
  stressPattern: string;
}

/**
 * Checks one candidate line against one performed phrase.
 *
 * `phraseIndex` is which line of the take this is meant to be. A candidate
 * checked against a phrase that does not exist is refused rather than passed:
 * there is no cadence to have preserved.
 */
export function checkAgainstCadence(
  text: string,
  seed: LyricSeed,
  phraseIndex: number
): CadenceCheck {
  const phrase = seed.phrases[phraseIndex];
  const units = syllabify(text);
  const syllableCount = countLine(text);
  const violations: CadenceViolation[] = [];

  if (!phrase) {
    return {
      ok: false,
      violations: [
        {
          kind: 'RHYME_POSITION',
          says: `there is no performed line ${phraseIndex + 1} to fit this to`,
        },
      ],
      syllableCount,
      performedCount: 0,
      stressPattern: '',
    };
  }

  const positions = seed.positions.filter((p) => p.phrase === phraseIndex);
  const performedCount = phrase.syllableCount;

  if (syllableCount !== performedCount) {
    violations.push({
      kind: 'SYLLABLE_COUNT',
      says:
        `${syllableCount} syllable${syllableCount === 1 ? '' : 's'} against the ${performedCount} you sang` +
        (syllableCount > performedCount
          ? ` — ${syllableCount - performedCount} would have nowhere to land`
          : ` — ${performedCount - syllableCount} of your syllables would go silent`),
    });
  }

  // Stress: only where the candidate lines up one-for-one. With the wrong
  // number of syllables there is no alignment to judge, and reporting a
  // second violation off a broken alignment would be inventing a reason.
  const stressPattern = positions
    .map((_, i) => (units[i] ? (units[i].wordInitial ? '/' : 'x') : '?'))
    .join('');
  if (syllableCount === performedCount) {
    const misplaced: number[] = [];
    positions.forEach((position, i) => {
      const unit = units[i];
      if (!unit) return;
      if (position.stressed && !unit.wordInitial) misplaced.push(i + 1);
    });
    if (misplaced.length) {
      violations.push({
        kind: 'STRESS_PATTERN',
        says:
          `beat${misplaced.length === 1 ? '' : 's'} ${misplaced.join(', ')} of this line ` +
          `land${misplaced.length === 1 ? 's' : ''} inside a word instead of on one — ` +
          `you hit ${misplaced.length === 1 ? 'that one' : 'those'} hard`,
      });
    }
  }

  // The rhyme lands on the phrase's last syllable, so a candidate has to end a
  // word there. A line whose final performed position falls mid-word has moved
  // the rhyme off the beat it was sung on.
  //
  // Checked only when the counts match, for the same reason the stress check
  // is: with the wrong number of syllables there is no alignment, and a second
  // reason read off a broken one would be a reason the studio made up.
  if (syllableCount === performedCount) {
    const lastUnit = units[positions.length - 1];
    const followsInSameWord = units[positions.length];
    if (lastUnit && followsInSameWord && followsInSameWord.wordIndex === lastUnit.wordIndex) {
      violations.push({
        kind: 'RHYME_POSITION',
        says: `the rhyme falls in the middle of "${lastUnit.word}" instead of at the end of the line`,
      });
    }
  }

  return { ok: violations.length === 0, violations, syllableCount, performedCount, stressPattern };
}

export interface CandidateLine {
  id: string;
  text: string;
  phraseIndex: number;
  /** Where the line came from, so an accepted one is never mistaken for the creator's. */
  from: 'CREATOR' | 'STUDIO_INTELLIGENCE';
}

export interface CadenceGateResult {
  accepted: { candidate: CandidateLine; check: CadenceCheck }[];
  /**
   * Refused, and why -- without the text.
   *
   * The clause says rejected before it is shown, so what is reported is that
   * something was refused and the reason, not the line itself. A creator can
   * see the studio protecting their cadence without the studio getting the
   * refused words in front of them anyway.
   */
  rejected: { phraseIndex: number; violations: CadenceViolation[] }[];
}

/**
 * The gate. Nothing that breaks the cadence comes out of this function with
 * its text attached.
 */
export function preserveCadence(candidates: CandidateLine[], seed: LyricSeed): CadenceGateResult {
  const accepted: CadenceGateResult['accepted'] = [];
  const rejected: CadenceGateResult['rejected'] = [];
  for (const candidate of candidates) {
    const check = checkAgainstCadence(candidate.text, seed, candidate.phraseIndex);
    if (check.ok) accepted.push({ candidate, check });
    else rejected.push({ phraseIndex: candidate.phraseIndex, violations: check.violations });
  }
  return { accepted, rejected };
}

/** One line stating what the gate did, for a creator who sees only counts. */
export function describeGate(result: CadenceGateResult): string {
  const { accepted, rejected } = result;
  if (!accepted.length && !rejected.length) return 'Nothing was proposed.';
  const reasons = new Set(rejected.flatMap((r) => r.violations.map((v) => v.kind)));
  const named: Record<CadenceViolationKind, string> = {
    SYLLABLE_COUNT: 'changed the syllable count',
    STRESS_PATTERN: 'moved a beat inside a word',
    RHYME_POSITION: 'moved the rhyme off the end of the line',
  };
  if (!rejected.length) {
    return `${accepted.length} line${accepted.length === 1 ? '' : 's'} fit the cadence you performed.`;
  }
  return (
    `${accepted.length} fit your cadence. ${rejected.length} ${rejected.length === 1 ? 'was' : 'were'} ` +
    `refused before you saw ${rejected.length === 1 ? 'it' : 'them'}: ${[...reasons]
      .map((k) => named[k])
      .join(', ')}.`
  );
}
