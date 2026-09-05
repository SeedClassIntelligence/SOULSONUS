/**
 * The four levels, declared.
 *
 * Amendment A §17 is the whole of this file's brief, and §16 is the fence
 * around it. §16 first, because it is the one that gets forgotten:
 *
 *   "The professional DAW controls should NOT disappear... We should not turn
 *    SoulSonus into six giant buttons... That would destroy much of what
 *    you've already built."
 *
 * So this is not a simplification, and nothing here hides anything. §17 says
 * what the actual problem is: "Your screenshot is not fundamentally wrong. It
 * is too simultaneous." Every subsystem announcing itself at once is not the
 * same complaint as too much being available, and the fix for it is hierarchy,
 * not removal:
 *
 *   Level 1  Creative context. Always visible: project, transport, the rooms,
 *            Studio Intelligence.
 *   Level 2  Current creative activity. Follows what the creator is doing --
 *            beatboxing shows the expression engine, writing shows lyrics and
 *            structure, mixing shows the mixer.
 *   Level 3  Production workspace. The timeline, tracks, clips, sections.
 *   Level 4  Specialist utilities. "Available instantly -- but not permanently
 *            demanding attention."
 *
 * And the sentence that decides whether an implementation of this is right or
 * wrong: "That preserves everything while making SoulSonus feel substantially
 * calmer." Preserves everything. Amendment D says the same thing in general
 * terms -- organizing is not replacing, and depth already earned is not up for
 * renegotiation.
 *
 * This module therefore declares where each surface sits and what follows what.
 * It has no power to remove one, and `unreachableSurfaces` exists so that a
 * future level assignment which stranded something would fail a test rather
 * than ship quietly.
 */

import type { WorkspaceTab } from '../types/daw';

export type DisclosureLevel = 1 | 2 | 3 | 4;

export const LEVEL_NAME: Record<DisclosureLevel, string> = {
  1: 'creative context',
  2: 'current creative activity',
  3: 'production workspace',
  4: 'specialist utilities',
};

export const LEVEL_MEANING: Record<DisclosureLevel, string> = {
  1: 'Always visible. Where you are, what is playing, and who you can ask.',
  2: 'Follows what you are doing right now. It changes when the work changes.',
  3: 'The song itself: timeline, tracks, clips, sections. Always there to work on.',
  4: 'One reach away, and never in the way. Nothing here is hidden — it is filed.',
};

/**
 * Every surface this application puts in front of a creator, and its level.
 *
 * A surface missing from this table is not "level 0" -- it is an omission, and
 * `unreachableSurfaces` reports it as one.
 */
export const SURFACE_LEVELS = {
  // Level 1 -- always visible.
  project: 1,
  transport: 1,
  rooms: 1,
  studioIntelligence: 1,
  export: 1,

  // Level 2 -- the activity at hand.
  liveExpressionEngine: 2,
  performInstrument: 2,
  patternControls: 2,
  sectionBuilder: 2,
  lyricCadenceStudio: 2,
  vocalToLyric: 2,
  mixer: 2,
  masteringChain: 2,
  deliveryAndSign: 2,

  // Level 3 -- the song.
  timeline: 3,
  trackLanes: 3,
  clips: 3,
  sections: 3,

  // Level 4 -- filed, not hidden.
  piano: 4,
  instrumentRoom: 4,
  soundVault: 4,
  sourcing: 4,
  calibration: 4,
  midiHardware: 4,
  inspector: 4,
  radar: 4,
  collaboration: 4,
  nativeBrain: 4,
  seedSignature: 4,
  training: 4,
  soulFlow: 4,
  trackWorkstation: 4,
  songwritingSuite: 4,
  importAudio: 4,
} as const satisfies Record<string, DisclosureLevel>;

export type SurfaceName = keyof typeof SURFACE_LEVELS;

export const levelOf = (surface: SurfaceName): DisclosureLevel => SURFACE_LEVELS[surface];

export const surfacesAt = (level: DisclosureLevel): SurfaceName[] =>
  (Object.keys(SURFACE_LEVELS) as SurfaceName[]).filter((s) => SURFACE_LEVELS[s] === level);

/**
 * The benches Level 2 can show, in the terms the canvas already uses.
 *
 * Not a new vocabulary: these are the four the bench selector has always had.
 */
export type BenchId = 'UNIFIED' | 'PERFORM' | 'PATTERN' | 'SECTIONS';

/**
 * What Level 2 opens on when a creator arrives in a room.
 *
 * Amendment A §17 gives the mapping by example -- "If you're beatboxing:
 * Expression Engine + Beatbox controls. If you're writing: Lyrics + melody +
 * structure" -- and this is that, for the rooms this build has.
 *
 * A suggestion, and only ever a suggestion. The bench selector still offers all
 * four everywhere, and a creator who picks one has picked it: `benchForRoom` is
 * consulted when they have not chosen, never to override them. A level that
 * moved a creator's own choice out from under them would be the organizing
 * layer entering the room, which Amendment D forbids.
 */
export const benchForRoom = (room: WorkspaceTab): BenchId | null => {
  switch (room) {
    case 'CREATE':
      return 'UNIFIED';
    case 'BUILD':
      return 'SECTIONS';
    case 'WRITE_RECORD':
      return 'PERFORM';
    case 'MIX':
    case 'MASTER':
    case 'RELEASE':
    case 'FINISH':
      // These rooms carry their own surfaces; the canvas benches are not what
      // a creator came here for, and opening one would be the studio deciding
      // what they are doing.
      return null;
    default:
      return null;
  }
};

/**
 * Surfaces that no level accounts for.
 *
 * The guard on this whole idea. Progressive disclosure fails the moment a
 * surface belongs to no level, because then nothing says where it lives and it
 * is one refactor from being dropped. Pass the application's own list of
 * surfaces; anything not in the table comes back.
 */
export function unreachableSurfaces(present: readonly string[]): string[] {
  return present.filter((name) => !(name in SURFACE_LEVELS));
}

/**
 * What a creator is told about a level, if they ask why something is not on
 * screen. Never "it is hidden": it is filed, and here is where.
 */
export function whereToFind(surface: SurfaceName): string {
  const level = levelOf(surface);
  if (level === 4) {
    return 'in the workstations rail — one reach away, and it never demands attention while you work';
  }
  if (level === 2) {
    return 'with the work you are doing; it comes up with the activity, and the bench selector offers it in any room';
  }
  if (level === 3) return 'on the canvas, always';
  return 'always on screen';
}
