/**
 * Analytics turned into something worth saying, and never into an instruction.
 *
 * SRT-1 XVI's recommendation layer gives two examples and they are different
 * kinds of sentence:
 *
 *   "Your audience replayed the hook 2.4x more frequently than the verse."
 *   "You consistently reject brighter synth sounds; should I prioritize
 *    warmer timbres?"
 *
 * The first is audience analytics, which this build does not have -- nothing
 * is published and nobody is listening -- so nothing here will ever produce a
 * sentence of that shape. Claiming a listener is the worst thing this file
 * could do, and `audienceUnavailable` is the honest answer when asked.
 *
 * The second is the shape that is buildable, and note that the seed itself
 * writes it as a question. That is the rule here: an observation and a
 * question, never a directive and never an action. The section says this
 * "creates a learning creative environment", and an environment that acts on
 * what it inferred about you is not one -- it is one that has decided.
 *
 * Where the creator has already said why they turned something down, their
 * words are quoted rather than summarised. Amendment B: "that's not what I
 * heard" is the highest-value signal in the session, and a paraphrase of it is
 * a lower-value one. A relay gap is the creator speaking; this passes it on.
 */

import type { GenerationDecisionRecord, RelayGapRecord } from '../types/daw';
import type { CreativeAnalytics } from './creativeAnalytics';

export type RecommendationStrength = 'STRONG' | 'SUGGESTIVE';

export interface CreativeRecommendation {
  id: string;
  /** What was counted. Always a count, never an adjective. */
  observed: string;
  /**
   * The question it raises. Always a question: the creator answers it, and
   * nothing here acts on the answer by itself.
   */
  asks: string;
  /** What it was read from, so it can be checked or waved away. */
  from: string;
  /**
   * The creator's own words on the subject, verbatim, when they said any.
   * Never paraphrased and never summarised into the observation.
   */
  inTheirWords: string[];
  strength: RecommendationStrength;
}

/**
 * Below this, a count is a coincidence.
 *
 * The seed's own example word is "consistently", and two of anything is not
 * that. This is why a session that has rejected one candidate is told nothing.
 */
export const MIN_OBSERVATIONS = 3;

/** What is said when asked about listeners. There are none, and that is the answer. */
export const audienceUnavailable =
  'Nothing here knows anything about an audience. No track has been published from this ' +
  'build and nothing measures listens, replays or skips, so a sentence about what your ' +
  'listeners did would be one this studio made up.';

/**
 * Reads the analytics into questions worth asking.
 *
 * Ordered strongest first, so a caller showing one shows the one with the most
 * behind it. Returns an empty list when nothing has enough behind it, which is
 * the common case early in a session and is not a failure.
 */
export function recommendationsFrom(input: {
  analytics: CreativeAnalytics;
  decisionRecords: GenerationDecisionRecord[];
  relayGaps: RelayGapRecord[];
}): CreativeRecommendation[] {
  const out: CreativeRecommendation[] = [];
  const { analytics } = input;

  // --- what they turned down, in their words ----------------------------
  const rejected = input.decisionRecords.filter((d) => d.decision === 'REJECTED');
  const words = input.relayGaps
    .map((g) => g.inCreatorWords?.trim())
    .filter((w): w is string => !!w && w.length > 2);
  if (rejected.length >= MIN_OBSERVATIONS) {
    out.push({
      id: 'rejections',
      observed: `You have turned down ${rejected.length} candidates.`,
      asks: words.length
        ? 'You said what was wrong each time. Should the next proposal start from what you said instead?'
        : 'Should the next proposal come at this differently, or is it the route rather than the take?',
      from: `${rejected.length} rejected candidates${words.length ? `, ${words.length} with your own words on the record` : ', none with a reason recorded'}`,
      // Quoted, not condensed. This is the creator speaking, and a summary of
      // it would be the studio speaking about them.
      inTheirWords: words.slice(0, 5),
      strength: words.length >= 2 ? 'STRONG' : 'SUGGESTIVE',
    });
  }

  // --- a section they keep coming back to -------------------------------
  const sections = analytics.sectionsRevised?.value || [];
  if (sections.length >= 2 && sections[0].times >= MIN_OBSERVATIONS && sections[0].times > sections[1].times * 2) {
    out.push({
      id: 'section-revisits',
      observed: `You have reworked ${sections[0].name} ${sections[0].times} times, against ${sections[1].times} for ${sections[1].name}.`,
      asks: `Is ${sections[0].name} still not saying what you want, or is it carrying the song and the rest needs to catch up?`,
      from: sections.map((s) => `${s.name} ${s.times}x`).join(', '),
      inTheirWords: [],
      strength: 'STRONG',
    });
  }

  // --- a sound that keeps not surviving ---------------------------------
  const dropped = analytics.abandonedIdeas?.value.droppedSounds || [];
  if (dropped.length >= MIN_OBSERVATIONS) {
    out.push({
      id: 'dropped-sounds',
      observed: `${dropped.length} sounds you chose are not in the session any more.`,
      asks: 'Should the vault stop offering that kind first, or were they right for a version you moved on from?',
      from: dropped.join(', '),
      inTheirWords: [],
      strength: 'SUGGESTIVE',
    });
  }

  // --- how they work ----------------------------------------------------
  const pace = analytics.iterationFrequency;
  const steps = analytics.workflowPatterns?.value || [];
  if (pace && steps.length && steps[0].times >= MIN_OBSERVATIONS) {
    out.push({
      id: 'workflow',
      observed: `${pace.value.revisions} revisions, mostly ${steps[0].step}, about ${pace.value.medianGapMinutes} minutes apart.`,
      asks: 'Would you rather the studio stayed out of the way between those, or offered something each time?',
      from: `${pace.from}; ${analytics.workflowPatterns?.from}`,
      inTheirWords: [],
      strength: 'SUGGESTIVE',
    });
  }

  const rank: Record<RecommendationStrength, number> = { STRONG: 2, SUGGESTIVE: 1 };
  return out.sort((a, b) => rank[b.strength] - rank[a.strength]);
}

/**
 * One recommendation as the studio would say it.
 *
 * The question is kept last, so what a creator reads ends on something they
 * answer rather than something they are told.
 */
export function sayRecommendation(rec: CreativeRecommendation): string {
  const quoted = rec.inTheirWords.length
    ? ` You said: ${rec.inTheirWords.map((w) => `"${w}"`).join('; ')}.`
    : '';
  return `${rec.observed}${quoted} (${rec.from}) ${rec.asks}`;
}
