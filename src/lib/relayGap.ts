/**
 * The gap between what the creator heard inside and what came back.
 *
 * Amendment B is the part of the seed that is most the owner's own and was
 * least built. Its demand is narrow and hard: when a creator says "that's not
 * what I heard", that sentence has to survive, in their words, attached to the
 * thing it was said about, and it has to stay open until they say it is
 * closed.
 *
 * What this module is careful not to do:
 *
 *   It does not classify the creator's words. There is no sentiment read, no
 *   keyword match, no mapping onto a fixed vocabulary of complaints. B.6 says
 *   unformalized knowing is not deficient data, and the fastest way to break
 *   that clause is to "helpfully" normalize it.
 *
 *   It does not invent the studio's half of the conversation. There is no
 *   language model on this path -- III.6 is still an open violation, language
 *   dies at a regex table -- so the studio answers with measurements it
 *   actually holds, or it does not answer. A fabricated co-producer reply
 *   would read as understanding and be nothing of the kind.
 *
 *   It does not close a gap. Only the creator closes it. A later candidate
 *   that scores better does not settle what someone heard.
 */

import type {
  GenerationCandidate,
  RelayExchange,
  RelayGapRecord,
} from '../types/daw';

const id = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * Opens a gap on a candidate.
 *
 * `inCreatorWords` is stored exactly as given, trimmed of surrounding
 * whitespace and otherwise untouched. An empty statement is refused rather
 * than stored as a blank record, because a gap with nothing in it is the
 * single bit B.2 forbids, wearing a record's clothes.
 */
export function openRelayGap(
  candidateId: string,
  inCreatorWords: string,
  attributedTo: string
): RelayGapRecord | null {
  const words = inCreatorWords.trim();
  if (!words) return null;
  return {
    gapId: id('gap'),
    candidateId,
    openedAt: Date.now(),
    attributedTo: attributedTo.trim() || 'the creator',
    inCreatorWords: words,
    exchange: [
      { exchangeId: id('ex'), at: Date.now(), from: 'creator', words },
    ],
    resolvedByCreator: false,
  };
}

/** Adds a turn. Returns a new record; nothing here mutates what is stored. */
export function addExchange(
  gap: RelayGapRecord,
  turn: Omit<RelayExchange, 'exchangeId' | 'at'>
): RelayGapRecord {
  const words = turn.words.trim();
  if (!words) return gap;
  return {
    ...gap,
    exchange: [
      ...gap.exchange,
      { exchangeId: id('ex'), at: Date.now(), from: turn.from, words, basis: turn.basis },
    ],
  };
}

/**
 * Closes a gap, on the creator's say-so and no one else's.
 *
 * There is deliberately no counterpart that closes it any other way. B.5 puts
 * relay fidelity above every self-referential machine metric, and a scoring
 * pass that could mark a creator's stated gap as settled would invert exactly
 * that ordering.
 */
export function resolveByCreator(gap: RelayGapRecord): RelayGapRecord {
  return { ...gap, resolvedByCreator: true, resolvedAt: Date.now() };
}

/**
 * What the studio can honestly say back about a candidate.
 *
 * Every line is a measurement already held on the candidate, restated. Where
 * there is no measurement, it says that instead of filling the space -- a
 * candidate whose scores were never taken says so, which is the most useful
 * true thing available when a creator says it came back wrong.
 *
 * Returns null when there is nothing measured to offer. A silent thread is
 * honest; a padded one is not.
 */
export function studioAccountOf(candidate: GenerationCandidate): RelayExchange | null {
  const basis: string[] = [];

  if (candidate.realizationRoute) basis.push(`route: ${candidate.realizationRoute}`);
  if (candidate.targetRole) basis.push(`asked for: ${candidate.targetRole}`);

  if (candidate.preservationScores) {
    const entries = Object.entries(candidate.preservationScores);
    for (const [k, v] of entries) {
      if (typeof v === 'number') basis.push(`${k}: ${v}`);
    }
    basis.push(`scores measured by: ${candidate.scoreBasis}`);
  } else {
    basis.push(
      `no preservation scores were taken for this candidate (basis: ${candidate.scoreBasis}), so there is no measurement of what it kept`
    );
  }

  if (candidate.preservedProperties?.length) {
    basis.push(`kept: ${candidate.preservedProperties.join(', ')}`);
  }
  if (candidate.modifiedProperties?.length) {
    basis.push(`changed: ${candidate.modifiedProperties.join(', ')}`);
  }

  if (!basis.length) return null;

  return {
    exchangeId: id('ex'),
    at: Date.now(),
    from: 'studio',
    // Deliberately not an interpretation of what the creator said. The studio
    // does not yet have a path that could understand it, so it reports what it
    // did rather than pretending to answer.
    words:
      'Here is what was actually done to your take. Nothing here answers what you heard -- it is what there is to compare against.',
    basis,
  };
}

/** Gaps the creator has not closed, newest first. */
export const openGaps = (gaps: RelayGapRecord[]): RelayGapRecord[] =>
  gaps.filter((g) => !g.resolvedByCreator).sort((a, b) => b.openedAt - a.openedAt);
