/**
 * Adjustable quantization, in the three modes the seed names.
 *
 * SRT-1 VII is explicit: "Critically, the user should retain the feel of their
 * performance. Therefore quantization should be adjustable." It then names the
 * modes -- literal, assisted, groove -- and those are what this implements.
 *
 * The retrofit plan's Step 4 mockup offered "Keep my timing / Fix obvious
 * errors / Snap to 1/16". The first two are the seed's literal and assisted.
 * The third is not the seed's groove mode: a hard snap to 1/16 destroys
 * microtiming, and groove mode is defined as preserving it while regularizing
 * the beat. Where the plan and the seed disagree the seed governs, so the
 * third mode here is groove and not a hard snap.
 *
 * Nothing here invents a threshold. `OFF_GRID_MS` and `nearestGrid` come from
 * `styleProfile`, which already reasoned about the distance at which a note
 * "stops being a placement and starts being a different rhythm", and the
 * groove displacement is the creator's own measured pocket.
 *
 * Two properties make this safe to put a radio row in front of, and both come
 * from Amendment F -- the take is not lost because the creator tried a
 * setting:
 *
 *   lossless      the first pass that moves a note writes where it was played
 *                 into `provenance.capturedTick` and never overwrites it, so
 *                 the performance is still in the project after any number of
 *                 passes. `literal` restores from it exactly.
 *   uncompounded  every mode reads from the performed placement, not from the
 *                 previous mode's output. Groove after assisted is groove on
 *                 the take, not groove on a corrected take, so switching modes
 *                 is a choice and not an accumulation.
 */

import type { InterpretationMode, NoteEvent } from '../types/daw';
import { nearestGrid, ticksToMs, OFF_GRID_MS } from './styleProfile';

/**
 * The three of SRT-1 VII's four interpretation modes that re-place notes.
 *
 * Narrowed from `InterpretationMode` rather than restated, so the seed's list
 * has one definition. The fourth, reinterpretation, generates a production
 * pattern from the take instead of moving what was played; it is realization,
 * and it is reached from the same row in the panel.
 */
export type TimingMode = Exclude<InterpretationMode, 'reinterpretation'>;

export const TIMING_MODES: TimingMode[] = ['literal', 'assisted', 'groove'];

export const TIMING_MODE_LABEL: Record<TimingMode, string> = {
  literal: 'keep my timing',
  assisted: 'fix obvious errors',
  groove: 'keep my feel, straighten the beat',
};

export const TIMING_MODE_MEANING: Record<TimingMode, string> = {
  literal: 'Nothing moves. What you played is what stays.',
  assisted: `Only notes already within ${OFF_GRID_MS} ms of a grid line move onto it. A note further out is a different rhythm, not a mistake, and is left alone.`,
  groove: 'Every note goes onto the grid and is then pushed back by how far you sit off it on average, so the beat is even and your pocket survives.',
};

export interface TimingResult {
  notes: NoteEvent[];
  /**
   * Hits that ended up sharing a position with another hit and did not before.
   *
   * A roll faster than the grid cannot be straightened onto the grid without
   * some of its hits landing on top of each other, and a mono voice sounds
   * that as one hit. It is stated rather than absorbed: the notes are all
   * still in the project and `literal` brings them back, but the creator is
   * told that what they hear now has fewer hits in it than what they played.
   */
  collided: number;
  /** How many notes actually moved. Zero is a real and common answer. */
  moved: number;
  /** Notes left where they were because they are too far out to be errors. */
  leftAlone: number;
  /** The displacement groove mode applied, in ms. Null in the other modes. */
  pocketMs: number | null;
  /** One line for the creator, stating what happened rather than what was asked. */
  summary: string;
}

/** How many of these positions share a tick with another. */
const stacked = (ticks: number[]): number => ticks.length - new Set(ticks).size;

/**
 * Hits lost against the performance, not against whatever mode ran last.
 *
 * Measuring against the input would understate it: run assisted and then
 * groove, and the collisions assisted already caused would be counted as
 * "already there" and the creator would be told one hit was lost when three
 * were.
 */
const collidedAgainstTake = (notes: NoteEvent[], out: NoteEvent[]): number =>
  Math.max(0, stacked(out.map((n) => n.startTick)) - stacked(notes.map(performedTick)));

/**
 * What the creator needs to be told when hits land on top of each other, and
 * nothing when they do not.
 */
const collisionNote = (added: number): string =>
  added
    ? ` ${added} hit${added === 1 ? '' : 's'} landed on top of another — that part of the take is faster than the grid, so it now sounds with ${added === 1 ? 'one hit' : added + ' hits'} fewer. Keep my timing brings ${added === 1 ? 'it' : 'them'} back.`
    : '';

/** Ticks per millisecond at a tempo, for turning the measured pocket back into ticks. */
const msToTicks = (ms: number, bpm: number) => (ms / (60000 / Math.max(1, bpm))) * 480;

/**
 * Where the note was played.
 *
 * A note an earlier pass moved carries its performed tick; one nothing has
 * moved is still sitting on it.
 */
export const performedTick = (n: NoteEvent): number =>
  typeof n.provenance?.capturedTick === 'number' ? n.provenance.capturedTick : n.startTick;

/** Moves a note, remembering where it came from the first time and only then. */
const placeAt = (n: NoteEvent, tick: number): NoteEvent => ({
  ...n,
  startTick: tick,
  provenance: {
    ...n.provenance,
    capturedTick:
      typeof n.provenance?.capturedTick === 'number' ? n.provenance.capturedTick : n.startTick,
  },
});

/**
 * Applies a timing mode to a set of notes.
 *
 * Returns new notes; the input is never mutated. A mode that moves nothing
 * says so, because "quantized" over an unchanged take is the kind of report
 * this project has had to take back before.
 */
export function applyTimingMode(
  notes: NoteEvent[],
  mode: TimingMode,
  bpm: number
): TimingResult {
  if (notes.length === 0) {
    return { notes, moved: 0, leftAlone: 0, collided: 0, pocketMs: null, summary: 'Nothing to quantize.' };
  }

  if (mode === 'literal') {
    // Not a no-op after another mode has run: this is where the performance
    // comes back. Where nothing was ever moved it is genuinely a no-op and
    // the same array is returned.
    let restored = 0;
    const out = notes.map((n) => {
      const played = performedTick(n);
      if (played === n.startTick) return n;
      restored++;
      return { ...n, startTick: played };
    });
    return {
      notes: restored ? out : notes,
      moved: restored,
      leftAlone: notes.length - restored,
      collided: 0,
      pocketMs: null,
      summary: restored
        ? `Put ${restored} note${restored === 1 ? '' : 's'} back exactly where you played ${restored === 1 ? 'it' : 'them'}.`
        : `Left all ${notes.length} notes exactly where they were played.`,
    };
  }

  if (mode === 'assisted') {
    let moved = 0;
    let leftAlone = 0;
    const out = notes.map((n) => {
      const played = performedTick(n);
      const grid = nearestGrid(played);
      const offMs = Math.abs(ticksToMs(grid.distanceTicks, bpm));
      // Beyond this it is a different rhythm, not an error to correct.
      if (offMs > OFF_GRID_MS || grid.distanceTicks === 0) {
        if (grid.distanceTicks !== 0) leftAlone++;
        return played === n.startTick ? n : { ...n, startTick: played };
      }
      moved++;
      return placeAt(n, grid.position);
    });
    const collided = collidedAgainstTake(notes, out);
    return {
      notes: out,
      moved,
      leftAlone,
      collided,
      pocketMs: null,
      summary: moved
        ? `Moved ${moved} note${moved === 1 ? '' : 's'} onto the grid. ${leftAlone} left alone — further than ${OFF_GRID_MS} ms out is a different rhythm, not a mistake.${collisionNote(collided)}`
        : `Nothing moved. No note was close enough to a grid line to read as a slip.`,
    };
  }

  // groove: regularize the beat, keep the feel.
  const offsets = notes.map((n) => ticksToMs(nearestGrid(performedTick(n)).distanceTicks, bpm));
  const meanMs = offsets.reduce((a, b) => a + b, 0) / offsets.length;
  const shift = msToTicks(meanMs, bpm);
  let moved = 0;
  const out = notes.map((n) => {
    const grid = nearestGrid(performedTick(n));
    const next = Math.max(0, Math.round(grid.position + shift));
    if (next === n.startTick) return n;
    moved++;
    return placeAt(n, next);
  });
  const rounded = Math.round(meanMs * 10) / 10;
  const collided = collidedAgainstTake(notes, out);
  return {
    notes: out,
    moved,
    leftAlone: notes.length - moved,
    collided,
    pocketMs: rounded,
    summary:
      (Math.abs(rounded) < 0.05
        ? `Straightened the beat. You sit dead on the grid, so nothing was displaced to keep your feel.`
        : `Straightened the beat and kept your ${Math.abs(rounded)} ms ${rounded < 0 ? 'ahead of' : 'behind'} the grid. ${moved} note${moved === 1 ? '' : 's'} moved.`) +
      collisionNote(collided),
  };
}
