/**
 * The Session Band.
 *
 * The Co-Producer does not play bass. It turns to the bass player and says:
 * here is the groove, the key, the vocal phrasing, and what the creator asked
 * for -- give us a take. The player reads the session and hands back a
 * performance, not a sound.
 *
 * This file is the part of that concept which needs no model: who the players
 * are, what each can hand back, what authority a player is granted, and --
 * the load-bearing half -- how that grant is *checked*. This project has
 * already shipped a control that reported success while changing nothing. A
 * freedom level written into a prompt and never verified is the same failure
 * wearing a nicer name, so every grant here has a check that can fail, and the
 * checks are arithmetic rather than judgement.
 *
 * That is also the quiet argument for symbolic takes. "Did it keep my phrase?"
 * is arithmetic on NoteEvent[] and guesswork on a rendered waveform.
 */

import { NoteEvent } from '../types/daw';
import { TICKS_PER_BAR } from '../utils/musicMath';

/**
 * Who is being addressed.
 *
 * The router is typed by operation -- TIMBRE_SCULPT, REGIONAL_REPAINT and so
 * on -- which are all *whats*. "Bass player, play what you feel" is addressed
 * to a who, and there was nowhere to put one.
 */
export type BandRole =
  | 'BASS'
  | 'DRUMS'
  | 'KEYS'
  | 'GUITAR'
  | 'STRINGS'
  | 'BACKING_VOCALS'
  | 'TEXTURE';

/**
 * What a player hands back.
 *
 * Not a cosmetic distinction. A player that returns notes can have its engine
 * swapped after the fact -- "I like take B, but make it fretless" keeps the
 * take and changes only the renderer. A player that returns audio cannot: a
 * note grid cannot express a stacked "ooh", and there is no symbolic form of a
 * riser. Putting this in the shape from the first commit is cheaper than
 * discovering it when the vocal arranger arrives.
 */
export type TakeKind = 'performance' | 'audio';

export interface BandPlayer {
  role: BandRole;
  label: string;
  hands: TakeKind;
  /** Instruments on an existing track that this player would be writing for. */
  instruments: string[];
  /** What this player is listening for in the session. Shapes its brief, not its authority. */
  attends: string[];
}

export const SESSION_BAND: readonly BandPlayer[] = [
  {
    role: 'BASS',
    label: 'Bass',
    hands: 'performance',
    instruments: ['bass'],
    attends: ['pocket', 'root movement', 'chord tones', 'kick interaction', 'register'],
  },
  {
    role: 'DRUMS',
    label: 'Drummer',
    hands: 'performance',
    instruments: ['kick', 'snare', 'hihat'],
    attends: ['groove', 'subdivision', 'kick-snare relationship', 'velocity', 'fills'],
  },
  {
    role: 'KEYS',
    label: 'Keys',
    hands: 'performance',
    instruments: ['melody', 'keys'],
    attends: ['voicings', 'extensions', 'comping density', 'voice leading'],
  },
  {
    role: 'GUITAR',
    label: 'Guitar',
    hands: 'performance',
    instruments: ['guitar', 'melody'],
    attends: ['voicing', 'strumming', 'fretboard range', 'crowding the keys'],
  },
  {
    role: 'STRINGS',
    label: 'Strings',
    hands: 'performance',
    instruments: ['strings', 'melody'],
    attends: ['range', 'divisi', 'articulation', 'countermelody', 'ensemble spacing'],
  },
  {
    role: 'BACKING_VOCALS',
    label: 'Background vocals',
    hands: 'audio',
    instruments: ['vocal_synth', 'vocal'],
    attends: ['words', 'timbre', 'breath', 'blend'],
  },
  {
    role: 'TEXTURE',
    label: 'Texture / FX',
    hands: 'audio',
    instruments: ['custom'],
    attends: ['risers', 'impacts', 'atmospheres'],
  },
] as const;

export const playerFor = (role: BandRole): BandPlayer =>
  SESSION_BAND.find((p) => p.role === role) as BandPlayer;

/** True when this player's take can have its engine swapped after the fact. */
export const handsBackNotes = (role: BandRole) => playerFor(role).hands === 'performance';

/**
 * How much authority the player is given.
 *
 * Freedom is unlimited inside the lane and zero outside it, which is what
 * makes it safe to grant at all.
 */
export type GrantLevel = 'PLAY_EXACTLY' | 'PLAY_AROUND_IT' | 'PLAY_WHAT_YOU_FEEL';

export interface PerformanceGrant {
  level: GrantLevel;
  /** The one track this player may write to. Anything else is out of lane. */
  trackId: string;
  /** Bar range, 1-based and inclusive. Omit for the whole song. */
  bars?: [number, number];
}

/**
 * The tolerances the grants are checked against.
 *
 * Milliseconds rather than ticks, because what a creator hears as "that is my
 * phrase" is a wall-clock judgement: the same tick error is a different
 * musical error at 70 BPM and at 170.
 */
export const GRANT_TOLERANCE_MS = {
  /** PLAY EXACTLY: this is the creator's own phrasing, so the window is tight. */
  exact: 30,
  /** PLAY AROUND IT: the skeleton must survive, but it may be leaned on. */
  around: 60,
} as const;

export type GrantViolationKind =
  | 'OUT_OF_LANE_TRACK'
  | 'OUT_OF_LANE_BARS'
  | 'ONSET_MOVED'
  | 'ONSET_REMOVED'
  | 'NOTE_ADDED'
  | 'PITCH_CHANGED'
  | 'NOTE_COUNT_CHANGED';

export interface GrantViolation {
  kind: GrantViolationKind;
  detail: string;
  /** Where it happened, in ticks, when a single note is at fault. */
  atTick?: number;
}

export interface GrantCheck {
  ok: boolean;
  level: GrantLevel;
  violations: GrantViolation[];
  /** What was actually compared, so a pass is legible rather than asserted. */
  measured: {
    sourceNotes: number;
    takeNotes: number;
    /** Largest distance any surviving source onset moved, in milliseconds. */
    worstOnsetDriftMs: number;
    toleranceMs: number | null;
  };
}

const ticksToMs = (ticks: number, bpm: number) => (ticks / 480) * (60000 / Math.max(1, bpm));

const barRangeTicks = (bars?: [number, number]): [number, number] | null => {
  if (!bars) return null;
  const [a, b] = bars;
  return [(Math.max(1, a) - 1) * TICKS_PER_BAR, Math.max(a, b) * TICKS_PER_BAR];
};

/**
 * Checks a returned take against the grant it was given.
 *
 * `source` is what the creator played -- the phrase the grant is defined
 * against. `take` is what came back. For PLAY_WHAT_YOU_FEEL there may be no
 * source at all, because the player was asked to invent within a lane; the
 * lane is still checked.
 */
export function checkGrant(
  grant: PerformanceGrant,
  source: NoteEvent[],
  take: NoteEvent[],
  bpm: number,
  /** The track the take actually landed on. Compared against the grant's lane. */
  takeTrackId: string
): GrantCheck {
  const violations: GrantViolation[] = [];
  const lane = barRangeTicks(grant.bars);
  const tolerance =
    grant.level === 'PLAY_EXACTLY'
      ? GRANT_TOLERANCE_MS.exact
      : grant.level === 'PLAY_AROUND_IT'
        ? GRANT_TOLERANCE_MS.around
        : null;

  // --- the lane, which every grant shares ---
  if (takeTrackId !== grant.trackId) {
    violations.push({
      kind: 'OUT_OF_LANE_TRACK',
      detail: `Wrote to ${takeTrackId}; the grant covers ${grant.trackId} only.`,
    });
  }
  if (lane) {
    for (const n of take) {
      if (n.startTick < lane[0] || n.startTick >= lane[1]) {
        violations.push({
          kind: 'OUT_OF_LANE_BARS',
          detail: `A note at bar ${Math.floor(n.startTick / TICKS_PER_BAR) + 1} falls outside bars ${grant.bars?.[0]}-${grant.bars?.[1]}.`,
          atTick: n.startTick,
        });
      }
    }
  }

  // Only notes inside the lane are the take's own business; anything the
  // player left untouched elsewhere is not evidence about this grant.
  const inLane = (n: NoteEvent) => !lane || (n.startTick >= lane[0] && n.startTick < lane[1]);
  const src = source.filter(inLane);
  const tk = take.filter(inLane);

  let worstDriftMs = 0;

  if (grant.level === 'PLAY_EXACTLY') {
    // The creator's phrase *is* the performance. Velocity, articulation and
    // micro-timing are the player's; the notes are not.
    if (src.length !== tk.length) {
      violations.push({
        kind: 'NOTE_COUNT_CHANGED',
        detail: `PLAY EXACTLY returned ${tk.length} notes against ${src.length} played.`,
      });
    }
    const remaining = [...tk];
    for (const s of src) {
      let bestIdx = -1;
      let bestDrift = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].midiNote !== s.midiNote) continue;
        const drift = Math.abs(ticksToMs(remaining[i].startTick - s.startTick, bpm));
        if (drift < bestDrift) {
          bestDrift = drift;
          bestIdx = i;
        }
      }
      if (bestIdx === -1) {
        violations.push({
          kind: 'PITCH_CHANGED',
          detail: `No note of pitch ${s.midiNote} came back for the one played at tick ${s.startTick}.`,
          atTick: s.startTick,
        });
        continue;
      }
      worstDriftMs = Math.max(worstDriftMs, bestDrift);
      if (bestDrift > GRANT_TOLERANCE_MS.exact) {
        violations.push({
          kind: 'ONSET_MOVED',
          detail: `An onset moved ${bestDrift.toFixed(1)} ms, past the ${GRANT_TOLERANCE_MS.exact} ms this grant allows.`,
          atTick: s.startTick,
        });
      }
      remaining.splice(bestIdx, 1);
    }
    for (const extra of remaining) {
      violations.push({
        kind: 'NOTE_ADDED',
        detail: `A note was added at tick ${extra.startTick}; PLAY EXACTLY adds nothing.`,
        atTick: extra.startTick,
      });
    }
  } else if (grant.level === 'PLAY_AROUND_IT') {
    // The skeleton survives; the flesh is the player's. Added notes are the
    // point. A source onset that vanished is not.
    for (const s of src) {
      let bestDrift = Infinity;
      for (const t of tk) {
        const drift = Math.abs(ticksToMs(t.startTick - s.startTick, bpm));
        if (drift < bestDrift) bestDrift = drift;
      }
      if (bestDrift === Infinity || bestDrift > GRANT_TOLERANCE_MS.around) {
        violations.push({
          kind: 'ONSET_REMOVED',
          detail: `The onset at tick ${s.startTick} has nothing within ${GRANT_TOLERANCE_MS.around} ms of it.`,
          atTick: s.startTick,
        });
      } else {
        worstDriftMs = Math.max(worstDriftMs, bestDrift);
      }
    }
  }
  // PLAY_WHAT_YOU_FEEL adds no further check: the lane above is the whole
  // grant. Freedom inside it is the point, and a check that constrained the
  // notes would be a different grant wearing this one's name.

  return {
    ok: violations.length === 0,
    level: grant.level,
    violations,
    measured: {
      sourceNotes: src.length,
      takeNotes: tk.length,
      worstOnsetDriftMs: Math.round(worstDriftMs * 10) / 10,
      toleranceMs: tolerance,
    },
  };
}

/** What the Co-Producer hands a player. */
export interface BandBrief {
  role: BandRole;
  grant: PerformanceGrant;
  /** The creator's own words, unedited. */
  direction: string;
  bpm: number;
  /**
   * The key and scale, when the session has established one. Nothing in the
   * DAW asks a creator for a key yet, so this is genuinely often unknown --
   * and a player that needs one has to say so rather than assume C minor.
   */
  key?: string;
  scale?: string;
  /**
   * The phrase this grant is defined against, when there is one. Absent for a
   * PLAY_WHAT_YOU_FEEL brief on an empty track.
   */
  source?: NoteEvent[];
}

/** What a player hands back. Two shapes, because two kinds of player. */
export type BandTake =
  | { kind: 'performance'; role: BandRole; notes: NoteEvent[]; description: string }
  | { kind: 'audio'; role: BandRole; audio: Blob; description: string };

/**
 * Who plays first.
 *
 * A real band plays at once; agents cannot. If the bassist is to read the
 * drums, the drums must already exist, so call order is a musical opinion and
 * not an implementation detail: rhythm section, then harmony, then colour.
 */
export const CALL_ORDER: readonly BandRole[] = [
  'DRUMS',
  'BASS',
  'KEYS',
  'GUITAR',
  'STRINGS',
  'BACKING_VOCALS',
  'TEXTURE',
] as const;

export const sortByCallOrder = (roles: BandRole[]): BandRole[] =>
  [...roles].sort((a, b) => CALL_ORDER.indexOf(a) - CALL_ORDER.indexOf(b));

/** Words that address a player rather than describe an operation. */
const ROLE_WORDS: Record<BandRole, string[]> = {
  BASS: ['bass player', 'bassist', 'bass, ', 'on bass'],
  DRUMS: ['drummer', 'drums, ', 'on drums', 'drum player'],
  KEYS: ['keys player', 'keyboardist', 'pianist', 'keys, ', 'on keys'],
  GUITAR: ['guitarist', 'guitar player', 'guitar, ', 'on guitar'],
  STRINGS: ['string section', 'strings, ', 'on strings', 'string player'],
  BACKING_VOCALS: ['backing vocal', 'background vocal', 'bgv', 'backup singer'],
  TEXTURE: ['sound designer', 'texture, ', 'fx player'],
};

const GRANT_WORDS: Record<GrantLevel, string[]> = {
  PLAY_EXACTLY: ['play exactly', 'exactly what i', 'follow my notes', 'play it as i', 'note for note'],
  PLAY_AROUND_IT: ['play around', 'around it', 'embellish', 'add to it', 'fill it in', 'play off'],
  PLAY_WHAT_YOU_FEEL: ['what you feel', 'your call', 'do your thing', 'play something', 'take it away'],
};

/**
 * Reads a role and a grant out of what the creator actually typed.
 *
 * Deliberately narrow. "Make the kick fatter" is an operation on a track and
 * must not acquire a role just because it says kick -- the whole point of the
 * role dimension is that it sits beside the verb rather than swallowing it, so
 * a phrase that addresses nobody returns nothing.
 */
export function readAddress(prompt: string): { role?: BandRole; grant?: GrantLevel } {
  const q = ` ${prompt.toLowerCase()} `;
  let role: BandRole | undefined;
  for (const [r, words] of Object.entries(ROLE_WORDS) as [BandRole, string[]][]) {
    if (words.some((w) => q.includes(w))) {
      role = r;
      break;
    }
  }
  let grant: GrantLevel | undefined;
  for (const [g, words] of Object.entries(GRANT_WORDS) as [GrantLevel, string[]][]) {
    if (words.some((w) => q.includes(w))) {
      grant = g;
      break;
    }
  }
  return { role, grant };
}

/** Human-readable name for a grant, for anything that has to show one. */
export const GRANT_LABEL: Record<GrantLevel, string> = {
  PLAY_EXACTLY: 'PLAY EXACTLY',
  PLAY_AROUND_IT: 'PLAY AROUND IT',
  PLAY_WHAT_YOU_FEEL: 'PLAY WHAT YOU FEEL',
};

/** What each grant permits, in the creator's terms. */
export const GRANT_MEANING: Record<GrantLevel, string> = {
  PLAY_EXACTLY: `your notes and rhythm, kept — the player chooses velocity, articulation and micro-timing within ${GRANT_TOLERANCE_MS.exact} ms`,
  PLAY_AROUND_IT: `your phrase survives and gets leaned on — every onset you played still has a note within ${GRANT_TOLERANCE_MS.around} ms, and anything may be added around it`,
  PLAY_WHAT_YOU_FEEL: `the player's call, on one track and inside the bars you name, and nowhere else`,
};
