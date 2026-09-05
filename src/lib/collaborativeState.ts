/**
 * The collaborative state model.
 *
 * Clause XV.1 quotes the seed exactly: "A serious implementation requires more
 * than Socket.io. It needs a collaborative state model." Everything else in
 * section XV -- join a project, contribute performances, propose changes,
 * compare versions, control permissions, preserve attribution -- is downstream
 * of that sentence, and the reason the clause has read absent for so long is
 * that the pieces which existed were the easy half: a role union, a
 * contribution record, a screen. What was missing is the part that makes those
 * mean anything when two people are working: a log of who did what, when, to
 * which track, producing which version, that two machines can exchange and
 * agree on.
 *
 * The seed states the shape and this file is that shape, in order:
 *
 *   Project -> participants -> roles -> permissions -> assets -> tracks ->
 *   revisions -> operations -> ownership/provenance.
 *
 * And it names what the model is for. A creator must be able to determine who
 * added something, what changed, when, which version produced the final asset,
 * and what creative contribution belongs to whom. Those five questions have
 * five functions at the bottom of this file, and none of them will answer from
 * anything but the log. Where the log does not know, the answer is that it
 * does not know -- section XV says this matters "technically, artistically,
 * financially, and legally", and a guessed attribution is worse in every one of
 * those four registers than an absent one.
 *
 * Three rules the merge holds to, because they are what "state model" means
 * rather than "messages over a socket":
 *
 *   Deterministic. Two peers holding the same operations compute the same
 *   state, byte for byte. Ordering is (time, operation id) and never arrival.
 *
 *   Idempotent. Receiving the same peer state twice changes nothing. A dropped
 *   connection that replays is not a duplicated take.
 *
 *   Commutative. a merged with b equals b merged with a. Who reconnected first
 *   does not decide whose work survives.
 *
 * Amendment F sits over the whole file: what the system hears is written, never
 * held, gated, or dropped. So a capture is never refused out of the log. A
 * participant without capture permission still has their take kept -- the
 * refusal is recorded next to it, and the recording is what gets resolved
 * later. Losing a take to a permission check would be exactly the failure the
 * amendment was written about. For the same reason the merge has no
 * last-write-wins path at all: it is a union, so there is no rule under which
 * one participant's captured take can replace another's.
 *
 * There is no transport in here. `SyncTransport` is the seam and
 * `unconfiguredTransport` is what this build actually has -- it reports itself
 * unconfigured rather than pretending, in the same way the realization seam
 * does. Clause XV.4 is the standing reminder of why: the collaboration screen
 * once showed people who were not there.
 */

import type { CollaboratorRole } from '../types/daw';

export type ParticipantId = string;

/**
 * Someone on the project.
 *
 * `presence` distinguishes a person who is actually in a shared session from
 * one the creator has named while there is nowhere to send an invitation. The
 * local creator is not marked here -- which participant is "you" is a property
 * of the machine reading the state, not of the state, and is held by the store.
 */
export interface Participant {
  participantId: ParticipantId;
  name: string;
  email?: string;
  role: CollaboratorRole;
  presence: 'joined' | 'invited_not_sent';
  /** When this record was last stated. The merge keeps the later statement. */
  statedAt: number;
}

/**
 * What a role is allowed to do -- and, identically, the kinds of operation the
 * log carries. They are one union on purpose: a permission that does not name
 * an operation cannot be enforced, and an operation with no matching permission
 * cannot be governed.
 */
export type Capability =
  | 'capture'
  | 'edit'
  | 'arrange'
  | 'mix'
  | 'propose'
  | 'comment'
  | 'accept'
  | 'invite'
  | 'assign_role'
  | 'export';

export type OperationKind = Capability;

/**
 * "control permissions" (XV), made concrete.
 *
 * A vocalist can perform, propose and comment; they cannot accept their own
 * proposal or re-mix the record. A viewer can only comment -- which is the one
 * row that has to be right, because it is the row that gets shared widest.
 */
export const ROLE_CAPABILITIES: Record<CollaboratorRole, readonly Capability[]> = {
  owner: ['capture', 'edit', 'arrange', 'mix', 'propose', 'comment', 'accept', 'invite', 'assign_role', 'export'],
  producer: ['capture', 'edit', 'arrange', 'mix', 'propose', 'comment', 'accept', 'invite', 'export'],
  engineer: ['edit', 'mix', 'propose', 'comment', 'export'],
  vocalist: ['capture', 'propose', 'comment'],
  rapper: ['capture', 'propose', 'comment'],
  writer: ['propose', 'comment'],
  viewer: ['comment'],
};

export const can = (role: CollaboratorRole, capability: Capability): boolean =>
  ROLE_CAPABILITIES[role].includes(capability);

/**
 * One thing somebody did.
 *
 * `revisionId` is the join between this log and the revision tree: the version
 * history question "which version produced the final asset" is answerable only
 * because an operation names both the asset it produced and the revision the
 * session stood on when it did.
 */
export interface Operation {
  operationId: string;
  authorId: ParticipantId;
  kind: OperationKind;
  at: number;
  summary: string;
  /** Tracks this operation touched. Sorted, so two peers hash the same thing. */
  trackIds: string[];
  /** The revision this operation produced, when it produced one. */
  revisionId?: string;
  /** An asset this operation produced or names: a bounce, a stem, an export. */
  assetId?: string;
  /** The captured take this operation wrote. Amendment F: never dropped. */
  takeId?: string;
}

/**
 * A permission check that said no, kept.
 *
 * Recorded rather than enforced-and-forgotten, because the creator has to be
 * able to see that someone tried. `keptAnyway` is true for captures: the
 * operation is in the log despite the refusal, and this is the record of why
 * it is there.
 */
export interface Refusal {
  operationId: string;
  authorId: ParticipantId;
  kind: OperationKind;
  role: CollaboratorRole | null;
  reason: string;
  at: number;
  keptAnyway: boolean;
}

export interface ProjectRecord {
  projectId: string;
  name: string;
  /** When the name was last set. The merge keeps the later naming. */
  namedAt: number;
}

export interface CollaborativeState {
  project: ProjectRecord;
  participants: Participant[];
  operations: Operation[];
  refusals: Refusal[];
}

/* ------------------------------------------------------------------ *
 * Construction
 * ------------------------------------------------------------------ */

let seq = 0;

/**
 * An operation id that is unique across machines without a coordinator.
 *
 * The author is in the id, so two peers generating at the same millisecond
 * cannot collide, and the id travels with the operation -- which is what makes
 * receiving the same log twice a no-op instead of a duplicate.
 */
export function operationId(authorId: ParticipantId, at: number): string {
  return `${authorId}#${at.toString(36)}#${(seq++).toString(36)}`;
}

export interface OperationDraft {
  kind: OperationKind;
  summary: string;
  trackIds?: string[];
  revisionId?: string;
  assetId?: string;
  takeId?: string;
  at?: number;
}

export function makeOperation(authorId: ParticipantId, draft: OperationDraft): Operation {
  const at = draft.at ?? Date.now();
  const op: Operation = {
    operationId: operationId(authorId, at),
    authorId,
    kind: draft.kind,
    at,
    summary: draft.summary,
    trackIds: [...(draft.trackIds || [])].sort(),
  };
  if (draft.revisionId) op.revisionId = draft.revisionId;
  if (draft.assetId) op.assetId = draft.assetId;
  if (draft.takeId) op.takeId = draft.takeId;
  return op;
}

export function emptyState(projectId: string, name: string, at = Date.now()): CollaborativeState {
  return {
    project: { projectId, name, namedAt: at },
    participants: [],
    operations: [],
    refusals: [],
  };
}

const sortParticipants = (list: Participant[]): Participant[] =>
  [...list].sort((a, b) => (a.participantId < b.participantId ? -1 : a.participantId > b.participantId ? 1 : 0));

/**
 * The canonical order: time, then operation id.
 *
 * Never arrival order. Two peers that received the same operations in opposite
 * orders have to land on the same list or none of the version history means
 * anything.
 */
export function orderOperations(ops: Operation[]): Operation[] {
  const byId = new Map<string, Operation>();
  for (const op of ops) if (!byId.has(op.operationId)) byId.set(op.operationId, op);
  return [...byId.values()].sort((a, b) =>
    a.at !== b.at ? a.at - b.at : a.operationId < b.operationId ? -1 : a.operationId > b.operationId ? 1 : 0
  );
}

const refusalKey = (r: Refusal) => `${r.operationId}|${r.reason}`;

function orderRefusals(list: Refusal[]): Refusal[] {
  const byKey = new Map<string, Refusal>();
  for (const r of list) if (!byKey.has(refusalKey(r))) byKey.set(refusalKey(r), r);
  return [...byKey.values()].sort((a, b) =>
    a.at !== b.at ? a.at - b.at : refusalKey(a) < refusalKey(b) ? -1 : refusalKey(a) > refusalKey(b) ? 1 : 0
  );
}

export function upsertParticipant(state: CollaborativeState, participant: Participant): CollaborativeState {
  const others = state.participants.filter((p) => p.participantId !== participant.participantId);
  return { ...state, participants: sortParticipants([...others, participant]) };
}

/* ------------------------------------------------------------------ *
 * Admission: permissions, enforced, and refusals, recorded
 * ------------------------------------------------------------------ */

export interface Admission {
  state: CollaborativeState;
  /** True when the operation is in the log. A refused capture is both. */
  admitted: boolean;
  refusal: Refusal | null;
}

/**
 * Puts one operation into the state, or records why it was refused.
 *
 * A capture is admitted whatever the permission check says, with the refusal
 * recorded beside it. That is Amendment F and it is not a loophole in the
 * permission model: the take is kept, and what the creator does about a
 * performance from someone who was not supposed to be performing is a decision
 * they get to make with the audio in front of them.
 */
export function admit(state: CollaborativeState, op: Operation): Admission {
  const author = state.participants.find((p) => p.participantId === op.authorId) || null;
  const isCapture = op.kind === 'capture';

  const reason = !author
    ? 'is not a participant on this project'
    : !can(author.role, op.kind)
      ? `is a ${author.role} on this project, and a ${author.role} cannot ${op.kind.replace('_', ' ')}`
      : null;

  if (!reason) {
    return {
      state: { ...state, operations: orderOperations([...state.operations, op]) },
      admitted: true,
      refusal: null,
    };
  }

  const refusal: Refusal = {
    operationId: op.operationId,
    authorId: op.authorId,
    kind: op.kind,
    role: author ? author.role : null,
    reason,
    at: op.at,
    keptAnyway: isCapture,
  };

  return {
    state: {
      ...state,
      operations: isCapture ? orderOperations([...state.operations, op]) : state.operations,
      refusals: orderRefusals([...state.refusals, refusal]),
    },
    admitted: isCapture,
    refusal,
  };
}

/* ------------------------------------------------------------------ *
 * Merge
 * ------------------------------------------------------------------ */

/**
 * Two views of one project, combined.
 *
 * Deterministic, idempotent and commutative, and there is no rule in here under
 * which one peer's work replaces another's -- operations and refusals are
 * unions, and the only field that resolves is the project name, by the later
 * naming. Participants resolve the same way: the later statement of a person's
 * role wins, and an exact tie is broken by comparing the two records so that
 * both peers break it identically.
 */
export function mergeStates(a: CollaborativeState, b: CollaborativeState): CollaborativeState {
  if (a.project.projectId !== b.project.projectId) {
    throw new Error(
      `Cannot merge two different projects: ${a.project.projectId} and ${b.project.projectId}`
    );
  }

  const project = pickProject(a.project, b.project);

  const byId = new Map<ParticipantId, Participant>();
  for (const p of [...a.participants, ...b.participants]) {
    const held = byId.get(p.participantId);
    byId.set(p.participantId, held ? pickParticipant(held, p) : p);
  }

  return {
    project,
    participants: sortParticipants([...byId.values()]),
    operations: orderOperations([...a.operations, ...b.operations]),
    refusals: orderRefusals([...a.refusals, ...b.refusals]),
  };
}

function pickProject(a: ProjectRecord, b: ProjectRecord): ProjectRecord {
  if (a.namedAt !== b.namedAt) return a.namedAt > b.namedAt ? a : b;
  return a.name <= b.name ? a : b;
}

function pickParticipant(a: Participant, b: Participant): Participant {
  if (a.statedAt !== b.statedAt) return a.statedAt > b.statedAt ? a : b;
  const ja = JSON.stringify(a);
  const jb = JSON.stringify(b);
  return ja <= jb ? a : b;
}

/**
 * Where two people captured onto the same track independently.
 *
 * Both takes are in the log -- the merge cannot do otherwise -- so this is not
 * a conflict to resolve automatically. It is a thing to show the creator, who
 * is the only one who can listen to both.
 */
export interface CaptureDivergence {
  trackId: string;
  operations: Operation[];
  authorIds: ParticipantId[];
}

export function divergentCaptures(state: CollaborativeState): CaptureDivergence[] {
  const byTrack = new Map<string, Operation[]>();
  for (const op of state.operations) {
    if (op.kind !== 'capture') continue;
    for (const trackId of op.trackIds) {
      byTrack.set(trackId, [...(byTrack.get(trackId) || []), op]);
    }
  }
  const out: CaptureDivergence[] = [];
  for (const [trackId, ops] of byTrack) {
    const authorIds = [...new Set(ops.map((o) => o.authorId))].sort();
    if (authorIds.length > 1) out.push({ trackId, operations: ops, authorIds });
  }
  return out.sort((x, y) => (x.trackId < y.trackId ? -1 : x.trackId > y.trackId ? 1 : 0));
}

/* ------------------------------------------------------------------ *
 * The five questions section XV says a creator must be able to answer
 * ------------------------------------------------------------------ */

/** What an operation can be asked about. */
export interface SubjectRef {
  trackId?: string;
  assetId?: string;
  takeId?: string;
  revisionId?: string;
}

const touches = (op: Operation, ref: SubjectRef): boolean => {
  if (ref.trackId && op.trackIds.includes(ref.trackId)) return true;
  if (ref.assetId && op.assetId === ref.assetId) return true;
  if (ref.takeId && op.takeId === ref.takeId) return true;
  if (ref.revisionId && op.revisionId === ref.revisionId) return true;
  return false;
};

export const operationsAbout = (state: CollaborativeState, ref: SubjectRef): Operation[] =>
  state.operations.filter((op) => touches(op, ref));

export const nameOf = (state: CollaborativeState, id: ParticipantId): string =>
  state.participants.find((p) => p.participantId === id)?.name || id;

/** 1. Who added something. */
export interface Attribution {
  participantId: ParticipantId;
  name: string;
  role: CollaboratorRole | null;
  firstAt: number;
  lastAt: number;
  operations: number;
}

export function whoAdded(state: CollaborativeState, ref: SubjectRef): Attribution[] {
  const byAuthor = new Map<ParticipantId, Operation[]>();
  for (const op of operationsAbout(state, ref)) {
    byAuthor.set(op.authorId, [...(byAuthor.get(op.authorId) || []), op]);
  }
  return [...byAuthor.entries()]
    .map(([participantId, ops]) => ({
      participantId,
      name: nameOf(state, participantId),
      role: state.participants.find((p) => p.participantId === participantId)?.role ?? null,
      firstAt: Math.min(...ops.map((o) => o.at)),
      lastAt: Math.max(...ops.map((o) => o.at)),
      operations: ops.length,
    }))
    .sort((a, b) => a.firstAt - b.firstAt);
}

/** 2 and 3. What changed, and when -- one list, because they are one answer. */
export interface HistoryEntry {
  at: number;
  who: string;
  authorId: ParticipantId;
  role: CollaboratorRole | null;
  kind: OperationKind;
  what: string;
  revisionId?: string;
  refused: Refusal | null;
}

export function historyOf(state: CollaborativeState, ref?: SubjectRef): HistoryEntry[] {
  const ops = ref ? operationsAbout(state, ref) : state.operations;
  return ops.map((op) => ({
    at: op.at,
    who: nameOf(state, op.authorId),
    authorId: op.authorId,
    role: state.participants.find((p) => p.participantId === op.authorId)?.role ?? null,
    kind: op.kind,
    what: op.summary,
    ...(op.revisionId ? { revisionId: op.revisionId } : {}),
    refused: state.refusals.find((r) => r.operationId === op.operationId) || null,
  }));
}

/** What a single revision was made of. */
export const whatChanged = (state: CollaborativeState, revisionId: string): Operation[] =>
  state.operations.filter((op) => op.revisionId === revisionId);

/**
 * 4. Which version produced the final asset.
 *
 * Null when the log does not know. An asset that arrived without an operation
 * naming it has no version behind it that this model can honestly point at, and
 * saying "the current one" would be a guess dressed as provenance.
 */
export function versionBehind(
  state: CollaborativeState,
  assetId: string
): { revisionId: string; operation: Operation } | null {
  const producing = state.operations.filter((op) => op.assetId === assetId && op.revisionId);
  if (producing.length === 0) return null;
  const last = producing[producing.length - 1];
  return { revisionId: last.revisionId as string, operation: last };
}

/**
 * 5. What creative contribution belongs to whom.
 *
 * Counts and the tracks they were made on, never a percentage. Section XV says
 * this becomes important financially and legally, which is exactly why a number
 * like "38% of this song" must not come out of an operation count -- one
 * capture can be the song and forty mix tweaks can be nothing. The ledger
 * reports what happened and leaves the weighing to people.
 */
export interface LedgerEntry {
  participantId: ParticipantId;
  name: string;
  role: CollaboratorRole | null;
  byKind: Partial<Record<OperationKind, number>>;
  trackIds: string[];
  captures: number;
  firstAt: number;
  lastAt: number;
}

export function contributionLedger(state: CollaborativeState): LedgerEntry[] {
  const byAuthor = new Map<ParticipantId, Operation[]>();
  for (const op of state.operations) {
    byAuthor.set(op.authorId, [...(byAuthor.get(op.authorId) || []), op]);
  }
  return [...byAuthor.entries()]
    .map(([participantId, ops]) => {
      const byKind: Partial<Record<OperationKind, number>> = {};
      for (const op of ops) byKind[op.kind] = (byKind[op.kind] || 0) + 1;
      return {
        participantId,
        name: nameOf(state, participantId),
        role: state.participants.find((p) => p.participantId === participantId)?.role ?? null,
        byKind,
        trackIds: [...new Set(ops.flatMap((o) => o.trackIds))].sort(),
        captures: ops.filter((o) => o.kind === 'capture').length,
        firstAt: Math.min(...ops.map((o) => o.at)),
        lastAt: Math.max(...ops.map((o) => o.at)),
      };
    })
    .sort((a, b) => a.firstAt - b.firstAt);
}

/**
 * The answer when there is nothing to answer with.
 *
 * Every query above returns an empty result for a subject the log never saw,
 * and an empty result is easy to render as though it meant "nobody
 * contributed". It means the opposite: nothing was recorded. This is the
 * sentence to show instead.
 */
export function nothingRecorded(ref: SubjectRef): string {
  const named = ref.trackId
    ? `track ${ref.trackId}`
    : ref.assetId
      ? `asset ${ref.assetId}`
      : ref.takeId
        ? `take ${ref.takeId}`
        : ref.revisionId
          ? `version ${ref.revisionId}`
          : 'this project';
  return `Nothing in this project's log names ${named}. That is an absence of record, not an absence of work.`;
}

/* ------------------------------------------------------------------ *
 * The transport seam
 * ------------------------------------------------------------------ */

export type SyncStatus =
  | { configured: false; reason: string }
  | { configured: true; connected: boolean; endpoint: string; reason?: string };

export interface SyncTransport {
  readonly name: string;
  /** Whether a shared session can be reached, and if not, why. Never throws. */
  status(): Promise<SyncStatus>;
  /** Sends operations to the shared session. Only called when configured. */
  publish(projectId: string, operations: Operation[]): Promise<void>;
  /** Peer state arriving. Returns the unsubscribe. */
  subscribe(projectId: string, onRemote: (state: CollaborativeState) => void): () => void;
}

/**
 * What this build has: nothing, said out loud.
 *
 * Not a stub that resolves successfully. `publish` throwing is deliberate --
 * if a caller ever skips the status check, it finds out immediately rather
 * than silently believing a take was shared.
 */
export const unconfiguredTransport: SyncTransport = {
  name: 'none',
  async status() {
    return {
      configured: false,
      reason:
        'No shared session is configured. The model, roles and history below are real and local; nothing is being sent or received.',
    };
  },
  async publish() {
    throw new Error('No sync transport is configured; nothing was published.');
  },
  subscribe() {
    return () => {};
  },
};

/* ------------------------------------------------------------------ *
 * The store
 * ------------------------------------------------------------------ */

export interface CollaborationStore {
  /** Which participant is this machine. A property of the viewpoint, not the state. */
  readonly selfId: ParticipantId;
  getState(): CollaborativeState;
  /** Records an operation by the local participant, through the permission check. */
  record(draft: OperationDraft): Admission;
  /** Names someone the creator wants on the project. Sends nothing. */
  invite(name: string, role: CollaboratorRole, email?: string): void;
  /** The project was renamed. Carried with the time, so a merge can resolve it. */
  rename(name: string): void;
  setRole(participantId: ParticipantId, role: CollaboratorRole): Admission;
  /** Takes in a peer's state. Idempotent. */
  receive(remote: CollaborativeState): void;
  subscribe(listener: (state: CollaborativeState) => void): () => void;
  status(): Promise<SyncStatus>;
  /** Stops listening to the transport. The log is untouched by this. */
  dispose(): void;
}

export interface StoreOptions {
  projectId: string;
  projectName: string;
  self: { participantId: ParticipantId; name: string; role?: CollaboratorRole; email?: string };
  transport?: SyncTransport;
  now?: () => number;
}

export function createCollaborationStore(opts: StoreOptions): CollaborationStore {
  const now = opts.now || (() => Date.now());
  const transport = opts.transport || unconfiguredTransport;
  const listeners = new Set<(state: CollaborativeState) => void>();

  let state = upsertParticipant(emptyState(opts.projectId, opts.projectName, now()), {
    participantId: opts.self.participantId,
    name: opts.self.name,
    role: opts.self.role || 'owner',
    presence: 'joined',
    statedAt: now(),
    ...(opts.self.email ? { email: opts.self.email } : {}),
  });

  const announce = () => {
    for (const listener of listeners) listener(state);
  };

  const publishIfConfigured = (operations: Operation[]) => {
    void transport
      .status()
      .then((s) => (s.configured ? transport.publish(opts.projectId, operations) : undefined))
      .catch(() => {
        // A transport that cannot publish does not get to lose the log. The
        // operations are already in local state; they go out on the next
        // successful publish or not at all, and status() is what the screen
        // reads to say which.
      });
  };

  const stopListening = transport.subscribe(opts.projectId, (remote) => {
    state = mergeStates(state, remote);
    announce();
  });

  return {
    selfId: opts.self.participantId,
    getState: () => state,
    record(draft) {
      const op = makeOperation(opts.self.participantId, { ...draft, at: draft.at ?? now() });
      const result = admit(state, op);
      state = result.state;
      announce();
      if (result.admitted) publishIfConfigured([op]);
      return result;
    },
    invite(name, role, email) {
      const at = now();
      // Keyed off the address when there is one: two people can share a first
      // name, and deriving the id from the name alone would have silently
      // replaced the first of them with the second.
      const seedText = (email || name).toLowerCase().replace(/[^a-z0-9]+/g, '_');
      let participantId = `p_${seedText}`;
      let n = 2;
      while (state.participants.some((p) => p.participantId === participantId && p.name !== name)) {
        participantId = `p_${seedText}_${n++}`;
      }
      state = upsertParticipant(state, {
        participantId,
        name,
        role,
        presence: 'invited_not_sent',
        statedAt: at,
        ...(email ? { email } : {}),
      });
      const op = makeOperation(opts.self.participantId, {
        kind: 'invite',
        summary: `Named ${name} as ${role}`,
        at,
      });
      state = admit(state, op).state;
      announce();
    },
    setRole(participantId, role) {
      const at = now();
      const op = makeOperation(opts.self.participantId, {
        kind: 'assign_role',
        summary: `Set ${nameOf(state, participantId)} to ${role}`,
        at,
      });
      const result = admit(state, op);
      state = result.state;
      if (result.admitted) {
        const held = state.participants.find((p) => p.participantId === participantId);
        if (held) state = upsertParticipant(state, { ...held, role, statedAt: at });
      }
      announce();
      return { ...result, state };
    },
    rename(name) {
      if (name === state.project.name) return;
      state = { ...state, project: { ...state.project, name, namedAt: now() } };
      announce();
    },
    receive(remote) {
      state = mergeStates(state, remote);
      announce();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    status: () => transport.status(),
    dispose() {
      listeners.clear();
      stopListening();
    },
  };
}
