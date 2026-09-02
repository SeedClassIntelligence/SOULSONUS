/**
 * What this studio actually knows about the creator.
 *
 * The profile it replaces was four literals and two more:
 * `soundPreferences: ['Fat 808 Sub', 'Crisp Acoustic Snare', 'Custom Root
 * Seeds']`, and `kickSensitivity: 0.45, snareSensitivity: 0.55` — identical
 * for every person who ever pressed the button, signed, and stored as though
 * it described them. It was the strongest claim in the product and the
 * emptiest.
 *
 * The ingredients were already being generated and thrown away. Calibration
 * measures the centre frequency of *this* creator's kick from their own
 * mouth. Every captured note carries where it came from and how confident the
 * detector was. Every accept and reject on a candidate is recorded. None of it
 * was ever read back.
 *
 * The measure worth the most is the pocket: where their onsets actually sit
 * against the grid, in milliseconds, ahead or behind. That is a real property
 * of a person's playing, it is arithmetic rather than opinion, and it is the
 * one number a session player could use to sound like them rather than like a
 * default. Today `ROLE_FEEL` in the player is a set of stylistic choices I
 * made; measured against a creator's own take, it does not have to stay that
 * way.
 *
 * Every field is derived or null. Nothing here has a default value, because a
 * default in a profile is a claim about a person that nobody checked.
 */

import { DetectionSettings, GenerationDecisionRecord, NoteEvent, Track } from '../types/daw';
import { TICKS_PER_BAR } from '../utils/musicMath';

/**
 * What the detector ships with.
 *
 * Named here because the difference between a threshold and *this creator's*
 * threshold is the whole point of a profile. A number that is still the
 * default says nothing about a person, and reporting it as though it did is
 * the same failure as the six literals, one layer down.
 */
export const DETECTION_DEFAULTS = { kickThreshold: 0.35, snareThreshold: 0.3, gain: 1.5 } as const;

/** Origins that mean the creator performed it rather than drew or generated it. */
const PERFORMED = new Set(['MOUTH', 'BODY', 'MIDI_KEYS']);

export interface PocketMeasure {
  /** Mean signed distance from the nearest 16th, in milliseconds. Negative is early. */
  meanOffsetMs: number;
  /** Spread of that distance. A tight player has a small one. */
  spreadMs: number;
  /** How many onsets the measure is over. Small samples are reported, not hidden. */
  onsets: number;
  /** In the creator's terms. */
  reads: 'ahead of the beat' | 'behind the beat' | 'on the grid';
}

export interface StyleProfile {
  creatorName: string;
  measuredAt: number;

  calibration: {
    /**
     * What the creator tuned the detector to. Null while it is still the
     * shipped default, because an untouched control describes nobody.
     */
    kickThreshold: number | null;
    snareThreshold: number | null;
    inputGain: number | null;
    /**
     * How high this creator's own pitched material drives the transcriber,
     * measured from a calibration take by `measurePitchResponse`.
     *
     * Basic Pitch's shipped gate is tuned for instruments. A mouth attack is
     * softer than a plucked string, so a hum that peaks the onset head at 0.48
     * is discarded by a 0.50 default while the frame head is reading 0.82 --
     * the pitch is plainly there and the gate throws it away. Percussion, by
     * contrast, does not drive either head: a kick measured 0.416 onset and
     * 0.323 frame and produced no note at any threshold down to 0.25, which is
     * what makes a lower per-creator gate safe rather than reckless.
     *
     * Null until they perform a calibration take. Never defaulted -- one
     * creator peaks at 0.48, another at 0.62, and a shared number is a claim
     * about neither of them.
     */
    pitchOnsetPeak: number | null;
    pitchFramePeak: number | null;
    /**
     * The onset gate this creator's own calibration take was shown to clear.
     * Verified by decoding at that value, not calculated from the peak -- the
     * note count is not monotonic in the threshold, so a computed gate can
     * land in a hole where the take returns nothing.
     */
    pitchGate: number | null;
    /** One entry per channel the creator actually calibrated against their own sound. */
    fingerprints: { trackId: string; name: string; centerFreq: number; q: number; threshold: number }[];
  };

  performance: {
    /** Notes the creator performed, by where they came from. */
    byOrigin: Record<string, number>;
    performedNotes: number;
    /** Mean detector confidence over performed notes, when any carry one. */
    meanConfidence: number | null;
    velocity: { min: number; max: number; mean: number } | null;
    /** Where their onsets sit against the grid. Null until there are enough to mean anything. */
    pocket: PocketMeasure | null;
    /** Which subdivisions of the bar they actually hit, most used first. */
    subdivisions: { label: string; onsets: number }[];
  };

  choices: {
    instruments: { instrument: string; tracks: number }[];
    sounds: string[];
    bpm: number | null;
  };

  decisions: { accepted: number; rejected: number; overrides: number };

  /**
   * What is not known, named.
   *
   * A profile that quietly omits what it could not measure reads as complete.
   * This one says which parts are empty and what would fill them.
   */
  gaps: string[];
}

export interface StyleProfileInput {
  creatorName: string;
  tracks: Track[];
  bpm: number;
  detectionSettings?: DetectionSettings | null;
  decisionRecords?: GenerationDecisionRecord[];
  /** Result of `measurePitchResponse` over a calibration take, when one exists. */
  pitchResponse?: { onsetPeak: number; framePeak: number; verifiedGate: number | null; notesAtGate: number } | null;
}

/** Enough onsets that a mean is a measurement rather than an anecdote. */
const MIN_POCKET_ONSETS = 8;

const ticksToMs = (ticks: number, bpm: number) => (ticks / 480) * (60000 / Math.max(1, bpm));

/**
 * The grid position a note is nearest, and which family that grid is.
 *
 * Both are needed because they answer different questions and one was
 * originally doing the work of both. A creator playing clean 16ths twelve
 * milliseconds late is playing 16ths -- measuring the subdivision from the
 * raw tick reported that take as "off the grid", which is a statement about
 * their timing masquerading as a statement about their rhythm.
 *
 * Straight and triplet grids are both offered, and whichever the note is
 * closer to wins. Snapping to 16ths first would have made a triplet
 * impossible to detect at all.
 */
const GRIDS: { ticks: number; family: string }[] = [
  { ticks: 120, family: 'straight' },
  { ticks: 160, family: 'triplet' },
];

function nearestGrid(startTick: number): { distanceTicks: number; family: string; position: number } {
  let best = { distanceTicks: Infinity, family: 'straight', position: 0 };
  for (const grid of GRIDS) {
    const position = Math.round(startTick / grid.ticks) * grid.ticks;
    const distance = startTick - position;
    if (Math.abs(distance) < Math.abs(best.distanceTicks)) {
      best = { distanceTicks: distance, family: grid.family, position };
    }
  }
  return best;
}

/**
 * Where a performance sits against the grid.
 *
 * Signed distance to the nearest grid position, so early is negative and late
 * is positive, and the mean over a take is the creator's pocket. Notes exactly
 * on a grid line contribute zero rather than being excluded -- a player who
 * lands dead on the grid has a pocket too, and it is zero.
 */
function measurePocket(notes: NoteEvent[], bpm: number): PocketMeasure | null {
  const offsets = notes.map((n) => ticksToMs(nearestGrid(n.startTick).distanceTicks, bpm));
  if (offsets.length < MIN_POCKET_ONSETS) return null;
  const mean = offsets.reduce((a, b) => a + b, 0) / offsets.length;
  const variance = offsets.reduce((s, v) => s + (v - mean) ** 2, 0) / offsets.length;
  const spread = Math.sqrt(variance);
  return {
    meanOffsetMs: Math.round(mean * 10) / 10,
    spreadMs: Math.round(spread * 10) / 10,
    onsets: offsets.length,
    // A threshold rather than a sign test: a mean of 0.4 ms is not a style,
    // it is rounding. Five milliseconds is about where a listener starts to
    // hear a player sitting somewhere on purpose.
    reads: mean < -5 ? 'ahead of the beat' : mean > 5 ? 'behind the beat' : 'on the grid',
  };
}

/**
 * Which subdivisions the creator's onsets actually land on.
 *
 * Measured from the grid position each onset is nearest rather than from its
 * raw tick, so a take is classified by what was played and not by how tightly
 * it was played. A note far from every grid offered is genuinely off the grid,
 * and 40 ms is the distance at which it stops being a placement and starts
 * being a different rhythm.
 */
const OFF_GRID_MS = 40;

function measureSubdivisions(notes: NoteEvent[], bpm: number): { label: string; onsets: number }[] {
  const buckets: Record<string, number> = {};
  for (const n of notes) {
    const grid = nearestGrid(n.startTick);
    let label: string;
    if (Math.abs(ticksToMs(grid.distanceTicks, bpm)) > OFF_GRID_MS) {
      label = 'off the grid';
    } else if (grid.family === 'triplet') {
      label = 'triplets';
    } else {
      const inBar = ((grid.position % TICKS_PER_BAR) + TICKS_PER_BAR) % TICKS_PER_BAR;
      label = inBar % 480 === 0 ? 'downbeats and beats' : inBar % 240 === 0 ? '8ths' : '16ths';
    }
    buckets[label] = (buckets[label] || 0) + 1;
  }
  return Object.entries(buckets)
    .map(([label, onsets]) => ({ label, onsets }))
    .sort((a, b) => b.onsets - a.onsets);
}

export function computeStyleProfile(input: StyleProfileInput): StyleProfile {
  const { creatorName, tracks, bpm } = input;
  const gaps: string[] = [];

  // --- what they performed -------------------------------------------
  const performed: NoteEvent[] = [];
  const byOrigin: Record<string, number> = {};
  for (const track of tracks) {
    for (const note of track.noteEvents || []) {
      const origin = note.provenance?.origin;
      if (!origin) continue;
      byOrigin[origin] = (byOrigin[origin] || 0) + 1;
      if (PERFORMED.has(origin)) performed.push(note);
    }
  }

  const confidences = performed
    .map((n) => n.provenance?.detectionConfidence)
    .filter((c): c is number => typeof c === 'number' && isFinite(c));

  const velocities = performed.map((n) => n.velocity).filter((v) => typeof v === 'number');

  const pocket = measurePocket(performed, bpm);
  if (!pocket) {
    gaps.push(
      performed.length === 0
        ? 'No performance yet, so there is no pocket to measure. Record a take by mouth, body or keys.'
        : `Only ${performed.length} performed onsets; the pocket needs at least ${MIN_POCKET_ONSETS} before a mean means anything.`
    );
  }

  // --- what they calibrated -------------------------------------------
  const fingerprints = tracks
    .filter((t) => t.detectionProfile)
    .map((t) => ({
      trackId: t.id,
      name: t.name,
      centerFreq: t.detectionProfile!.centerFreq,
      q: t.detectionProfile!.q,
      threshold: t.detectionProfile!.threshold,
    }));
  if (fingerprints.length === 0) {
    gaps.push('No channel has been calibrated, so nothing here describes the sound of this creator\'s own kick or snare.');
  }

  const detection = input.detectionSettings;
  // A setting the creator never moved is the app's opinion, not theirs.
  const tuned = <K extends keyof typeof DETECTION_DEFAULTS>(key: K): number | null => {
    if (!detection) return null;
    const value = detection[key];
    return value === DETECTION_DEFAULTS[key] ? null : value;
  };
  const kickThreshold = tuned('kickThreshold');
  const snareThreshold = tuned('snareThreshold');
  const inputGain = tuned('gain');
  if (!detection) {
    gaps.push('Detector settings were not supplied, so the thresholds this creator tuned are not part of the profile.');
  } else if (kickThreshold === null && snareThreshold === null && inputGain === null) {
    gaps.push('The detector is still on its shipped settings, so nothing here reflects how sensitive this creator needs it to be.');
  }

  if (!input.pitchResponse) {
    gaps.push(
      'No calibration take has been measured through the transcriber, so how loudly this creator\'s pitched material reads is unknown and the shipped instrument gate is being used for them.'
    );
  }

  // --- what they chose ------------------------------------------------
  const instrumentCounts: Record<string, number> = {};
  for (const t of tracks) instrumentCounts[t.instrument] = (instrumentCounts[t.instrument] || 0) + 1;
  const sounds = [...new Set(tracks.map((t) => t.vaultLabel).filter((s): s is string => !!s))];
  if (sounds.length === 0) {
    gaps.push('No sound has been chosen from the vault yet, so nothing is known about what this creator reaches for.');
  }

  // --- what they decided ------------------------------------------------
  const records = input.decisionRecords || [];
  const decisions = {
    accepted: records.filter((r) => r.decision === 'ACCEPTED').length,
    rejected: records.filter((r) => r.decision === 'REJECTED').length,
    overrides: records.filter((r) => r.overrideIntentContract).length,
  };
  if (records.length === 0) {
    gaps.push('No candidate has been accepted or rejected yet, so there is no preference signal to learn from.');
  }

  return {
    creatorName,
    measuredAt: Date.now(),
    calibration: {
      kickThreshold,
      snareThreshold,
      inputGain,
      pitchOnsetPeak: input.pitchResponse ? input.pitchResponse.onsetPeak : null,
      pitchFramePeak: input.pitchResponse ? input.pitchResponse.framePeak : null,
      pitchGate: input.pitchResponse ? input.pitchResponse.verifiedGate : null,
      fingerprints,
    },
    performance: {
      byOrigin,
      performedNotes: performed.length,
      meanConfidence: confidences.length
        ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 1000) / 1000
        : null,
      velocity: velocities.length
        ? {
            min: Math.min(...velocities),
            max: Math.max(...velocities),
            mean: Math.round(velocities.reduce((a, b) => a + b, 0) / velocities.length),
          }
        : null,
      pocket,
      subdivisions: measureSubdivisions(performed, bpm),
    },
    choices: {
      instruments: Object.entries(instrumentCounts)
        .map(([instrument, count]) => ({ instrument, tracks: count }))
        .sort((a, b) => b.tracks - a.tracks),
      sounds,
      bpm: bpm > 0 ? bpm : null,
    },
    decisions,
    gaps,
  };
}

/** The profile in a sentence or two, for a surface that has room for one line. */
export function describeStyleProfile(p: StyleProfile): string {
  const parts: string[] = [];
  if (p.performance.pocket) {
    const { meanOffsetMs, spreadMs, onsets, reads } = p.performance.pocket;
    parts.push(
      `Plays ${reads} — ${meanOffsetMs >= 0 ? '+' : ''}${meanOffsetMs} ms from the nearest 16th ` +
        `across ${onsets} onsets, ±${spreadMs} ms.`
    );
  }
  if (p.performance.subdivisions.length) {
    parts.push(`Mostly ${p.performance.subdivisions[0].label}.`);
  }
  if (p.calibration.fingerprints.length) {
    parts.push(
      `Calibrated against their own ${p.calibration.fingerprints
        .map((f) => `${f.name} at ${Math.round(f.centerFreq)} Hz`)
        .join(', ')}.`
    );
  }
  if (!parts.length) return 'Nothing has been measured about this creator yet.';
  return parts.join(' ');
}
