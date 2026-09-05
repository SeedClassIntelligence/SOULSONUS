/**
 * The studio explaining its musical reasoning, in the creator's terms.
 *
 * Amendment A.12 gives the sentence it wants:
 *
 *   "I preserved that lift by widening the harmony and increasing rhythmic
 *    density rather than increasing tempo."
 *
 * Read it again and it is three things, not one: what was done, the reason it
 * was done, and what was deliberately *not* done instead. The third is the
 * part that makes it an explanation rather than an announcement -- anyone can
 * say what they changed; saying what you refused to change is what shows you
 * were reasoning about the creator's work rather than about your own output.
 *
 * The platform had six functions producing sentences like this and no shared
 * shape between them, so the third part appeared in one of the six and by
 * accident. This is the shape, and the rule that comes with it: a rationale
 * with nothing in `because` is not built. An explanation whose reason is empty
 * is an assertion, and this codebase has had to take those back before.
 */

export interface MusicalRationale {
  /** What was done or proposed, in the creator's terms. */
  says: string;
  /**
   * The measurements behind it, each one checkable on its own. Never empty --
   * `rationaleFrom` returns null rather than build a reason-free explanation.
   */
  because: string[];
  /**
   * What was deliberately left alone, and it is not padding: a change explained
   * without naming what it refused to touch tells the creator nothing about
   * whether their performance survived it.
   */
  ratherThan: string[];
}

/**
 * Builds one, or returns null when there is nothing to stand on.
 *
 * Null is the common and correct answer early in a session, and every caller
 * treats it the same way: say nothing rather than say something empty.
 */
export function rationaleFrom(input: {
  says: string;
  because: (string | null | undefined | false)[];
  ratherThan?: (string | null | undefined | false)[];
}): MusicalRationale | null {
  const because = input.because.filter((b): b is string => !!b && b.trim().length > 0);
  if (!input.says.trim() || !because.length) return null;
  return {
    says: input.says.trim(),
    because,
    ratherThan: (input.ratherThan || []).filter((r): r is string => !!r && r.trim().length > 0),
  };
}

/**
 * The rationale as one sentence, in the order A.12 writes it: the change, the
 * reason, and then what it refused to do instead.
 */
export function sayRationale(rationale: MusicalRationale): string {
  const because = rationale.because.join('; ');
  const rather = rationale.ratherThan.length
    ? ` rather than ${rationale.ratherThan.join(' or ')}`
    : '';
  return `${rationale.says}${rather}, because ${because}.`;
}

/** The same thing as lines, for a surface with room to show the reasons apart. */
export function rationaleLines(rationale: MusicalRationale): string[] {
  return [
    `**${rationale.says}**`,
    ...rationale.because.map((b) => `• because ${b}`),
    ...rationale.ratherThan.map((r) => `• rather than ${r}`),
  ];
}
