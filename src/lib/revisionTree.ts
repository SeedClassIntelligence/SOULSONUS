/**
 * Revisions as a tree, because a line throws work away.
 *
 * The history stack this sits beside is honest and well built: grouped undo,
 * labels, tracks and arrangement moved together. It has one lossy moment, and
 * it is the moment every producer meets. Undo three times to hear where a take
 * was going, decide the older version was right, make one edit -- and the three
 * states you just walked back through are gone. `setFuture([])`. They were real
 * work and there is now no way back to them.
 *
 * Clause XI.4 says versions are branchable, not linear. This is that: every
 * committed state keeps the id of the state it came from, so the abandoned redo
 * path is not discarded, it is a branch. The linear stack still behaves exactly
 * as it did -- undo and redo walk the current path and nothing about them
 * changes -- but the path is now one route through a tree rather than the only
 * thing that exists.
 *
 * Recombining across branches ("drums from 12, bass from 16", clause XI.7) is
 * deliberately not here. The retrofit plan defers it, and the reason is right:
 * a tree has to exist and be trusted before anything is allowed to reach across
 * it.
 */

import type { ArrangementSection, Track } from '../types/daw';

export type RevisionOrigin =
  /** The state the session opened on. */
  | 'root'
  /** An ordinary edit: notes, mix, arrangement. */
  | 'edit'
  /** A performance landed. */
  | 'capture'
  /** A realization candidate was accepted. */
  | 'realization';

export interface Revision {
  revisionId: string;
  /**
   * Null only for a root. Everything else names where it came from, and that
   * single field is the whole difference between a tree and a stack.
   */
  parentRevisionId: string | null;
  label: string;
  at: number;
  origin: RevisionOrigin;
  tracks: Track[];
  sections: ArrangementSection[];
}

/**
 * How many revisions are kept.
 *
 * Each one holds a full copy of the tracks, so this is a memory bound, not a
 * preference. The existing undo stack caps at 50 for the same reason.
 */
export const MAX_REVISIONS = 60;

let seq = 0;
const nextId = () => `rev_${Date.now().toString(36)}_${(seq++).toString(36)}`;

export function newRevision(
  parentRevisionId: string | null,
  label: string,
  origin: RevisionOrigin,
  tracks: Track[],
  sections: ArrangementSection[]
): Revision {
  return {
    revisionId: nextId(),
    parentRevisionId,
    label,
    at: Date.now(),
    origin,
    tracks,
    sections,
  };
}

/**
 * Trims the oldest revisions past the cap.
 *
 * A child whose parent was trimmed becomes a root rather than a node pointing
 * at nothing. The history is then honestly shorter -- which is what happened --
 * instead of holding a reference that resolves to nowhere.
 */
export function capTree(revisions: Revision[], max = MAX_REVISIONS): Revision[] {
  if (revisions.length <= max) return revisions;
  const kept = revisions.slice(revisions.length - max);
  const ids = new Set(kept.map((r) => r.revisionId));
  return kept.map((r) =>
    r.parentRevisionId && !ids.has(r.parentRevisionId) ? { ...r, parentRevisionId: null } : r
  );
}

export const revisionById = (revisions: Revision[], id: string | null): Revision | null =>
  (id && revisions.find((r) => r.revisionId === id)) || null;

export const childrenOf = (revisions: Revision[], id: string | null): Revision[] =>
  revisions.filter((r) => r.parentRevisionId === id);

/**
 * A revision with more than one child. This is where the creator went back and
 * took a different route, and it is the only reason the tree is worth having.
 */
export const isBranchPoint = (revisions: Revision[], id: string): boolean =>
  childrenOf(revisions, id).length > 1;

/** From a revision back to its root, oldest first. */
export function pathToRoot(revisions: Revision[], id: string | null): Revision[] {
  const out: Revision[] = [];
  const seen = new Set<string>();
  let cur = revisionById(revisions, id);
  while (cur && !seen.has(cur.revisionId)) {
    seen.add(cur.revisionId);
    out.unshift(cur);
    cur = revisionById(revisions, cur.parentRevisionId);
  }
  return out;
}

/** How deep a revision sits. Used only for laying the tree out. */
export const depthOf = (revisions: Revision[], id: string): number =>
  Math.max(0, pathToRoot(revisions, id).length - 1);
