/**
 * The Session Player seam.
 *
 * `sessionBand.ts` says who the players are and what authority each is given.
 * It stops short of the part that matters to a creator: someone actually
 * plays. This is that layer, and it is deliberately an interface rather than a
 * feature.
 *
 * The reason is a rule set at the start of this build. A generative engine is
 * not the product abstraction; the player is. A creator asks for the bass
 * player, and what renders the bass -- a feel model today, a hosted
 * generative model tomorrow, something native after that -- is a deployment
 * detail that must be swappable without the Co-Producer, the dock or the
 * timeline learning a new word. Wire the engine to the UI and the product
 * becomes the engine; wire it here and the product stays the band.
 *
 * Two things this layer refuses to do.
 *
 * It will not hand back a take that failed the grant it was given. The check
 * in `sessionBand.ts` is arithmetic and can fail; running it and returning the
 * take anyway would make the grant decorative, which is the exact failure this
 * project has already shipped once.
 *
 * And it will not describe a player it does not have. A role with nothing
 * behind it reports unavailable and says precisely what is missing, in the
 * creator's terms. Silence and a plausible-looking result are the same lie.
 */

import { NoteEvent, NoteProvenance } from '../types/daw';
import { TICKS_PER_BAR } from '../utils/musicMath';
import {
  BandBrief,
  BandRole,
  BandTake,
  GrantCheck,
  GrantViolation,
  SESSION_BAND,
  TakeKind,
  checkGrant,
  playerFor,
} from './sessionBand';

/**
 * What everyone else has already played.
 *
 * A player who cannot hear the band is not a player. The brief is what the
 * creator asked for; this is what the room sounds like when the player walks
 * into it, and the two are kept apart because they change for different
 * reasons -- the brief per call, the room per session.
 */
export interface SessionRoom {
  bpm: number;
  /** Unknown until something in the session establishes it. See `BandBrief`. */
  key?: string;
  scale?: string;
  /** The song's length, so a player never writes past the end of it. */
  songTicks: number;
  parts: {
    trackId: string;
    name: string;
    instrument: string;
    notes: NoteEvent[];
  }[];
  /**
   * A rendered reference of the session so far. Note players do not need it;
   * a player that hands back audio has nothing else to play along to.
   */
  reference?: Blob;
}

export type PlayerUnavailableReason =
  /** No player is registered for this role at all. */
  | 'NO_PLAYER'
  /** The player performs a phrase and none was given. */
  | 'NO_SOURCE'
  /** This grant asks for invention, and nothing that can invent is wired yet. */
  | 'GRANT_NEEDS_MODEL'
  /** A renderer exists but cannot be reached or is not configured. */
  | 'SERVICE_UNAVAILABLE'
  /** The grant names a track that is not in the room. */
  | 'NO_LANE';

export interface PlayerAvailability {
  available: boolean;
  reason?: PlayerUnavailableReason;
  /** Safe to show a creator, and specific enough to act on. */
  detail?: string;
}

export interface PlayOptions {
  /**
   * Makes a take reproducible. The same seed on the same brief gives the same
   * take; a different seed is a different take of the same part, which is what
   * "give me another one" means to a musician.
   */
  seed?: number;
  signal?: AbortSignal;
}

export interface SessionPlayer {
  readonly role: BandRole;
  readonly label: string;
  readonly hands: TakeKind;
  /**
   * What is actually behind this player, named plainly. Shown to the creator,
   * so a take is never mistaken for something it is not.
   */
  readonly renderer: string;
  /** Never throws. A player that cannot take the call says why. */
  availability(brief: BandBrief, room: SessionRoom): Promise<PlayerAvailability>;
  play(brief: BandBrief, room: SessionRoom, opts?: PlayOptions): Promise<BandTake>;
}

export type CallRefusal =
  | { kind: 'UNAVAILABLE'; reason: PlayerUnavailableReason; detail: string }
  | { kind: 'GRANT_VIOLATED'; detail: string; violations: GrantViolation[]; check: GrantCheck }
  | { kind: 'PLAYER_FAILED'; detail: string };

export type CallOutcome =
  | {
      ok: true;
      role: BandRole;
      renderer: string;
      take: BandTake;
      /**
       * How the take was verified. Null for an audio take, which carries no
       * notes to compare against a note grant -- stated rather than implied,
       * because "no violations" and "nothing was checked" must not look alike.
       */
      check: GrantCheck | null;
      /** What the player did, in the creator's terms. */
      description: string;
    }
  | { ok: false; role: BandRole; renderer: string | null; refusal: CallRefusal };

// --- the registry ------------------------------------------------------
//
// One place that answers "who is behind this role", so the answer can change
// per deployment without any caller changing.

const registry = new Map<BandRole, SessionPlayer>();

export const registerSessionPlayer = (player: SessionPlayer) => {
  registry.set(player.role, player);
};

export const sessionPlayerFor = (role: BandRole): SessionPlayer | null => registry.get(role) || null;

/** Every role and what is behind it right now. The honest state of the band. */
export async function bandRoster(
  brief: BandBrief,
  room: SessionRoom
): Promise<{ role: BandRole; label: string; renderer: string | null; availability: PlayerAvailability }[]> {
  return Promise.all(
    SESSION_BAND.map(async (p) => {
      const player = registry.get(p.role);
      if (!player) {
        return {
          role: p.role,
          label: p.label,
          renderer: null,
          availability: {
            available: false,
            reason: 'NO_PLAYER' as const,
            detail: `No one is playing ${p.label.toLowerCase()} yet.`,
          },
        };
      }
      return {
        role: p.role,
        label: p.label,
        renderer: player.renderer,
        availability: await player.availability({ ...brief, role: p.role }, room),
      };
    })
  );
}

/**
 * Calls a player and verifies what comes back before anyone sees it.
 *
 * This is the whole point of the seam being a function rather than a call to
 * `player.play` at each site: the grant check is not optional, cannot be
 * forgotten, and a take that broke its lane never reaches the session.
 */
export async function callSessionPlayer(
  brief: BandBrief,
  room: SessionRoom,
  opts?: PlayOptions
): Promise<CallOutcome> {
  const player = sessionPlayerFor(brief.role);
  const label = playerFor(brief.role).label;
  if (!player) {
    return {
      ok: false,
      role: brief.role,
      renderer: null,
      refusal: {
        kind: 'UNAVAILABLE',
        reason: 'NO_PLAYER',
        detail: `No one is playing ${label.toLowerCase()} yet. The brief, the grant and the check that enforces it are real; nothing is behind them.`,
      },
    };
  }

  if (!room.parts.some((p) => p.trackId === brief.grant.trackId)) {
    return {
      ok: false,
      role: brief.role,
      renderer: player.renderer,
      refusal: {
        kind: 'UNAVAILABLE',
        reason: 'NO_LANE',
        detail: `The grant names a channel that is not in this session. A take needs somewhere to land.`,
      },
    };
  }

  const availability = await player.availability(brief, room);
  if (!availability.available) {
    return {
      ok: false,
      role: brief.role,
      renderer: player.renderer,
      refusal: {
        kind: 'UNAVAILABLE',
        reason: availability.reason || 'NO_PLAYER',
        detail: availability.detail || `The ${label.toLowerCase()} cannot take this call.`,
      },
    };
  }

  let take: BandTake;
  try {
    take = await player.play(brief, room, opts);
  } catch (err) {
    return {
      ok: false,
      role: brief.role,
      renderer: player.renderer,
      refusal: {
        kind: 'PLAYER_FAILED',
        detail: err instanceof Error ? err.message : 'The take failed and produced nothing.',
      },
    };
  }

  if (take.kind === 'audio') {
    // Nothing to compare against a note grant. The lane still holds -- an
    // audio take belongs to one track -- but that is placement, not content.
    return {
      ok: true,
      role: brief.role,
      renderer: player.renderer,
      take,
      check: null,
      description: take.description,
    };
  }

  const check = checkGrant(brief.grant, brief.source || [], take.notes, room.bpm, brief.grant.trackId);
  if (!check.ok) {
    return {
      ok: false,
      role: brief.role,
      renderer: player.renderer,
      refusal: {
        kind: 'GRANT_VIOLATED',
        detail: `The take broke the grant it was given: ${check.violations[0].detail}`,
        violations: check.violations,
        check,
      },
    };
  }

  return {
    ok: true,
    role: brief.role,
    renderer: player.renderer,
    take,
    check,
    description: take.description,
  };
}

// --- the one player that exists today ----------------------------------

/**
 * Where each player sits against the click.
 *
 * These are stylistic choices, not measurements, and the comment says so
 * because everything else in this project that looked like a number has had
 * to earn it. What they encode is ordinary session vocabulary: a bassist sits
 * behind the kick, comping leans forward, bowed strings speak late. Positive
 * is late.
 */
const ROLE_FEEL: Record<BandRole, { pushMs: number; how: string }> = {
  DRUMS: { pushMs: 4, how: 'just behind the click, which is what a pocket is' },
  BASS: { pushMs: 6, how: 'behind the kick, so the low end lands after the hit' },
  KEYS: { pushMs: -3, how: 'leaning forward, the way comping does' },
  GUITAR: { pushMs: -4, how: 'ahead of the beat, where a strum wants to be' },
  STRINGS: { pushMs: 8, how: 'late, because a bowed attack speaks late' },
  BACKING_VOCALS: { pushMs: 0, how: 'with the lead' },
  TEXTURE: { pushMs: 0, how: 'with the bar' },
};

/**
 * The timing budget, in milliseconds.
 *
 * PLAY EXACTLY allows 30 ms of drift. Spending all of it would put every take
 * one rounding error from failing its own check, so the feel model works
 * inside 24 and the check has room to mean something.
 */
const FEEL_BUDGET_MS = 24;

/** Deterministic, so the same seed gives the same take and a test can assert it. */
function hashUnit(seed: number, index: number): number {
  let h = (seed ^ (index * 0x9e3779b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x21f0aaad) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x735a2d97) >>> 0;
  h = (h ^ (h >>> 15)) >>> 0;
  return h / 0x100000000;
}

/** Where a note falls in the bar, as an accent multiplier on what was played. */
function metricAccent(startTick: number): number {
  const inBar = ((startTick % TICKS_PER_BAR) + TICKS_PER_BAR) % TICKS_PER_BAR;
  if (inBar === 0) return 0.12;
  if (inBar === TICKS_PER_BAR / 2) return 0.06;
  if (inBar % 480 === 0) return 0.0;
  if (inBar % 240 === 0) return -0.06;
  return -0.12;
}

const msToTicks = (ms: number, bpm: number) => Math.round((ms / (60000 / Math.max(1, bpm))) * 480);

/**
 * The player who plays your part.
 *
 * This is not a generative model and does not pretend to be one. It does the
 * narrowest real thing a session musician does: takes the phrase the creator
 * played and performs it -- accent where the bar wants accent, sit where the
 * instrument sits, no two notes mechanically identical -- without adding,
 * removing or repitching a single note. That is exactly the PLAY EXACTLY
 * grant, so it is the one grant this player accepts. Asked to play around a
 * phrase or to invent one, it says what is missing instead of improvising an
 * answer.
 */
export class FeelPlayer implements SessionPlayer {
  readonly renderer = 'soulsonus-feel';
  readonly label: string;
  readonly hands: TakeKind = 'performance';

  constructor(readonly role: BandRole) {
    this.label = playerFor(role).label;
  }

  async availability(brief: BandBrief): Promise<PlayerAvailability> {
    if (brief.grant.level !== 'PLAY_EXACTLY') {
      return {
        available: false,
        reason: 'GRANT_NEEDS_MODEL',
        detail:
          `This ${this.label.toLowerCase()} performs the phrase you played. Playing around it, or inventing a part, ` +
          `needs a model that is not wired yet — so ask for PLAY EXACTLY, or wait for one.`,
      };
    }
    if (!brief.source || brief.source.length === 0) {
      return {
        available: false,
        reason: 'NO_SOURCE',
        detail: `There is no phrase on that channel to play. Perform something first, and this ${this.label.toLowerCase()} will play it.`,
      };
    }
    return { available: true };
  }

  async play(brief: BandBrief, room: SessionRoom, opts?: PlayOptions): Promise<BandTake> {
    const source = brief.source || [];
    const seed = opts?.seed ?? 1;
    const feel = ROLE_FEEL[this.role];
    const budgetTicks = Math.max(1, msToTicks(FEEL_BUDGET_MS, room.bpm));

    // Accenting a phrase that was already played hard would clip every
    // downbeat at 127 and flatten exactly the dynamics this is meant to
    // perform. The whole take is scaled to fit instead, so the relationships
    // the creator played survive the ceiling.
    const peak = source.reduce(
      (m, n, i) => Math.max(m, n.velocity * (1 + metricAccent(n.startTick) + (hashUnit(seed, i + 977) - 0.5) * 0.08)),
      0
    );
    const headroom = peak > 127 ? 127 / peak : 1;

    const notes: NoteEvent[] = source.map((n, i) => {
      // Timing: where the instrument sits, plus a small variation so no two
      // notes land identically. Both clamped inside the budget, so the grant
      // check is a real test and not a formality this player is exempt from.
      const jitterMs = (hashUnit(seed, i) - 0.5) * 6;
      const offsetTicks = Math.max(
        -budgetTicks,
        Math.min(budgetTicks, msToTicks(feel.pushMs + jitterMs, room.bpm))
      );

      // Dynamics: the creator's own relative dynamics are scaled, never
      // replaced. What they played louder stays louder.
      const accent = metricAccent(n.startTick);
      const breath = (hashUnit(seed, i + 977) - 0.5) * 0.08;
      const velocity = n.velocity * (1 + accent + breath) * headroom;

      const provenance: NoteProvenance = {
        ...n.provenance,
        origin: 'SESSION_PLAYER',
        playerRole: this.role,
        renderer: this.renderer,
        creatorEdited: false,
      };

      return {
        ...n,
        id: `play_${seed}_${i}_${Math.random().toString(36).slice(2, 8)}`,
        startTick: Math.max(0, Math.min(room.songTicks - 1, n.startTick + offsetTicks)),
        velocity: Math.max(1, Math.min(127, Math.round(velocity))),
        provenance,
      };
    });

    return {
      kind: 'performance',
      role: this.role,
      notes,
      description:
        `Played your ${source.length}-note phrase back — ${feel.how}, accented to the bar, ` +
        `nothing added or moved beyond ${FEEL_BUDGET_MS} ms.`,
    };
  }
}

/**
 * The band as it stands.
 *
 * Every role that hands back notes gets the feel player, because performing a
 * given phrase is instrument-agnostic. The two roles that hand back audio get
 * nothing yet -- there is no symbolic form of a stacked "ooh" or a riser, so
 * those genuinely wait on a generative renderer, and saying so is more useful
 * than registering a player that refuses every call.
 */
export function installDefaultBand() {
  for (const p of SESSION_BAND) {
    if (p.hands === 'performance') registerSessionPlayer(new FeelPlayer(p.role));
  }
}
