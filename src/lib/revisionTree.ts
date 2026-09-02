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

/**
 * What "give me the drums from version 12" actually takes.
 *
 * A track holds two different kinds of thing, and conflating them loses work
 * either way round:
 *
 *   the performance -- noteEvents, steps, notes, velocities, audio clips.
 *                      What was played.
 *   the treatment   -- volume, mute, solo, DSP, instrument params,
 *                      automation, name, colour. How it is set up now.
 *
 * The sentence in the seed is about the drums, not about where the drum fader
 * was sitting eleven revisions ago. So 'performance' is the default: it brings
 * back what was played and leaves the mix you have built since alone.
 * 'whole_track' is there for when the older setup is the point, and it is named
 * rather than implied.
 */
export type AdoptScope = 'performance' | 'whole_track';

export interface AdoptResult {
  tracks: Track[];
  /** Ids that came across. */
  adopted: string[];
  /**
   * Ids asked for that the source revision does not have. Reported rather than
   * skipped: a recombination that quietly takes three of the four things you
   * named is worse than one that says which it could not find.
   */
  notFound: string[];
  /** Adopted tracks that did not exist in the current state at all. */
  added: string[];
  /**
   * Of the adopted ids, the ones whose content actually differs from what was
   * already here.
   *
   * Adopting a track that is already identical is a real outcome and it is not
   * a success. Without this the summary said "Took the drums from version 12"
   * over a state that had not moved, which is the kind of confident report
   * this project keeps having to take back out.
   */
  changed: string[];
  /** Plain description of what happened, for the history label. */
  summary: string;
}

/** The fields that are the performance. Everything else is treatment. */
const PERFORMANCE_FIELDS = [
  'noteEvents',
  'steps',
  'notes',
  'velocities',
  'audioClips',
] as const;

/**
 * Takes named tracks from another revision into the current state.
 *
 * The current state is never mutated and never wholesale replaced -- only the
 * named tracks change, in place, keeping their position. A track present in the
 * source but absent here is appended rather than dropped, because asking for
 * the drums from a revision that had a drum track you have since deleted is a
 * request to have it back.
 */
export function adoptFromRevision(
  current: Track[],
  source: Revision,
  trackIds: string[],
  scope: AdoptScope = 'performance'
): AdoptResult {
  const wanted = new Set(trackIds);
  const sourceById = new Map(source.tracks.map((t) => [t.id, t]));

  const notFound = trackIds.filter((id) => !sourceById.has(id));
  const presentHere = new Set(current.map((t) => t.id));
  const adopted: string[] = [];
  const added: string[] = [];

  const tracks = current.map((track) => {
    if (!wanted.has(track.id)) return track;
    const from = sourceById.get(track.id);
    if (!from) return track;
    adopted.push(track.id);
    if (scope === 'whole_track') return { ...from };
    // Each field is taken only when the source carries it, so adopting a
    // performance from a revision that had no clips does not erase the clips
    // that are here now.
    const next: Track = { ...track };
    for (const field of PERFORMANCE_FIELDS) {
      if (from[field] === undefined) continue;
      switch (field) {
        case 'noteEvents': next.noteEvents = from.noteEvents; break;
        case 'steps': next.steps = from.steps; break;
        case 'notes': next.notes = from.notes; break;
        case 'velocities': next.velocities = from.velocities; break;
        case 'audioClips': next.audioClips = from.audioClips; break;
      }
    }
    return next;
  });

  for (const id of trackIds) {
    const from = sourceById.get(id);
    if (from && !presentHere.has(id)) {
      tracks.push({ ...from });
      adopted.push(id);
      added.push(id);
    }
  }

  // What is different now, rather than what was asked for.
  const beforeById = new Map(current.map((t) => [t.id, t]));
  const afterById = new Map(tracks.map((t) => [t.id, t]));
  const changed = adopted.filter((id) => {
    const before = beforeById.get(id);
    const after = afterById.get(id);
    if (!before) return true;
    return JSON.stringify(before) !== JSON.stringify(after);
  });

  const nameOf = (id: string) => sourceById.get(id)?.name || id;
  const what = scope === 'whole_track' ? '' : ' performance';
  const missing = notFound.length ? ` (${notFound.length} not in that revision)` : '';

  let summary: string;
  if (!adopted.length) {
    summary = `Nothing to take from "${source.label}"${missing}`;
  } else if (!changed.length) {
    summary = `${adopted.map(nameOf).join(', ')} already matched "${source.label}" -- nothing changed${missing}`;
  } else {
    summary = `Took ${changed.map(nameOf).join(', ')}${what} from "${source.label}"${missing}`;
  }

  return { tracks, adopted, notFound, added, changed, summary };
}
