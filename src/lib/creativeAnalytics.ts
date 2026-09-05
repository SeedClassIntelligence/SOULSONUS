/**
 * What the creator has actually been doing, read off what was recorded.
 *
 * SRT-1 XVI names six creative analytics -- iteration frequency, sections
 * repeatedly revised, abandoned ideas, preferred sounds, average project
 * completion time, creator workflow patterns -- and the section's point is
 * that this "creates a learning creative environment", not a dashboard.
 *
 * Everything here is counted from things the session already keeps: the
 * revision tree, the decision records, the relay gaps, and the tracks
 * themselves. Nothing is inferred about the person. The difference matters
 * more here than anywhere else in this codebase, because a number about
 * someone's working habits reads as a judgement of them, and one that was
 * guessed is a judgement of someone who does not exist.
 *
 * Three rules hold it honest.
 *
 * A measure with too little behind it is null and named, not a small number.
 * Two revisions are not a rhythm of work and one rejection is not a pattern.
 *
 * Every measure carries what it was counted from, so the creator can check it
 * or dismiss it. The house rule from `creativeIntent` and `expressionState`:
 * only measured things become words.
 *
 * And the one the seed lists that this build cannot measure -- average project
 * completion time -- is named as unmeasurable rather than approximated. A
 * project records when it was saved and never records when it was started, and
 * nothing marks a project finished, so any figure here would be invented.
 */

import type { GenerationDecisionRecord, RelayGapRecord, Track } from '../types/daw';
import type { Revision } from './revisionTree';
import { TICKS_PER_BAR } from '../utils/musicMath';

/** A counted thing, with what it was counted from. Never one without the other. */
export interface Measure<T> {
  value: T;
  /** What it says, in the creator's terms. */
  reads: string;
  /** The count behind it. Never empty. */
  from: string;
}

export interface SectionRevisits {
  sectionId: string;
  name: string;
  /** Revisions in which this section's material changed. */
  times: number;
}

export interface SoundUse {
  label: string;
  /** Revisions this sound was present in. */
  survived: number;
  /** True when it is still in the latest revision. */
  kept: boolean;
}

export interface CreativeAnalytics {
  iterationFrequency: Measure<{ revisions: number; spanMinutes: number; medianGapMinutes: number }> | null;
  sectionsRevised: Measure<SectionRevisits[]> | null;
  abandonedIdeas: Measure<{ rejectedCandidates: number; abandonedBranches: number; droppedSounds: string[] }> | null;
  preferredSounds: Measure<SoundUse[]> | null;
  /** Not measurable in this build. Always null, and always named below. */
  projectCompletionTime: null;
  workflowPatterns: Measure<{ step: string; times: number }[]> | null;
  /** Every measure with nothing behind it, named with the reason. */
  notMeasured: string[];
}

/** Below this a count is an accident rather than a habit. */
const MIN_REVISIONS = 3;

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/**
 * Which bars a revision's notes occupy, and what is in each, so a change can
 * be located.
 *
 * The fingerprint is sorted before it is joined. Built in array order, the same
 * notes stored in a different order fingerprint differently, and the studio
 * reports a section as reworked when nothing in it changed -- a count about
 * the creator's work that is not true of it. Note order is not musical
 * content, and several edit paths rewrite the array without moving a note.
 */
const barsTouched = (tracks: Track[]): Map<string, string> => {
  const parts = new Map<string, string[]>();
  for (const track of tracks) {
    for (const note of track.noteEvents || []) {
      const bar = Math.floor(note.startTick / TICKS_PER_BAR) + 1;
      const key = `${track.id}:${bar}`;
      const list = parts.get(key) || [];
      list.push(`${note.startTick}.${note.midiNote}.${note.velocity}`);
      parts.set(key, list);
    }
  }
  const byTrackBar = new Map<string, string>();
  for (const [key, list] of parts) byTrackBar.set(key, list.sort().join('|'));
  return byTrackBar;
};

const soundsIn = (tracks: Track[]): Set<string> => {
  const out = new Set<string>();
  for (const t of tracks) if (t.vaultLabel) out.add(t.vaultLabel);
  return out;
};

const ORIGIN_STEP: Record<string, string> = {
  capture: 'performed',
  edit: 'edited',
  realization: 'realized',
  root: 'opened',
};

/**
 * Reads the session's own record of itself.
 *
 * Takes what is already stored rather than watching anything: there is no
 * telemetry here and nothing is timed in the background. If the creator undoes
 * their way back to the start, the analytics go with it, because the tree is
 * the record.
 */
export function deriveCreativeAnalytics(input: {
  revisions: Revision[];
  decisionRecords: GenerationDecisionRecord[];
  relayGaps: RelayGapRecord[];
  currentRevisionId?: string | null;
}): CreativeAnalytics {
  const notMeasured: string[] = [];
  const revisions = [...input.revisions].sort((a, b) => a.at - b.at);

  // --- iteration frequency ---------------------------------------------
  let iterationFrequency: CreativeAnalytics['iterationFrequency'] = null;
  if (revisions.length >= MIN_REVISIONS) {
    const gaps = revisions.slice(1).map((r, i) => (r.at - revisions[i].at) / 60000);
    const spanMinutes = (revisions[revisions.length - 1].at - revisions[0].at) / 60000;
    const med = Math.round(median(gaps) * 10) / 10;
    iterationFrequency = {
      value: { revisions: revisions.length, spanMinutes: Math.round(spanMinutes * 10) / 10, medianGapMinutes: med },
      reads:
        med < 1
          ? 'you work in fast passes, a change every minute or less'
          : med < 5
            ? `you settle for about ${med} minutes between changes`
            : `you take your time — about ${med} minutes between changes`,
      // A span under a minute rounds to "over 0 minutes", which reads like a
      // measurement that failed rather than a session that moved fast.
      from:
        spanMinutes < 1
          ? `${revisions.length} revisions over ${Math.round(spanMinutes * 60)} seconds`
          : `${revisions.length} revisions over ${Math.round(spanMinutes)} minutes`,
    };
  } else {
    notMeasured.push(
      `iteration frequency — ${revisions.length} revision${revisions.length === 1 ? '' : 's'} is not a rhythm of work yet`
    );
  }

  // --- sections repeatedly revised --------------------------------------
  //
  // A section counts as revised when the notes inside its bars differ from the
  // previous revision. Comparing whole revisions would report every section on
  // every change.
  let sectionsRevised: CreativeAnalytics['sectionsRevised'] = null;
  const sections = revisions[revisions.length - 1]?.sections || [];
  if (revisions.length >= 2 && sections.length) {
    const counts = new Map<string, number>();
    for (let i = 1; i < revisions.length; i++) {
      const before = barsTouched(revisions[i - 1].tracks);
      const after = barsTouched(revisions[i].tracks);
      const changedBars = new Set<number>();
      for (const key of new Set([...before.keys(), ...after.keys()])) {
        if (before.get(key) !== after.get(key)) changedBars.add(Number(key.split(':')[1]));
      }
      for (const section of revisions[i].sections) {
        if (section.bars.some((b) => changedBars.has(b))) {
          counts.set(section.id, (counts.get(section.id) || 0) + 1);
        }
      }
    }
    const value = [...counts.entries()]
      .map(([sectionId, times]) => ({
        sectionId,
        name: sections.find((s) => s.id === sectionId)?.name || sectionId,
        times,
      }))
      .sort((a, b) => b.times - a.times);
    if (value.length) {
      const top = value[0];
      sectionsRevised = {
        value,
        reads:
          value.length > 1 && top.times > value[1].times
            ? `you keep coming back to ${top.name}`
            : `you have been working across ${value.length} section${value.length === 1 ? '' : 's'}`,
        from: value.map((v) => `${v.name} ${v.times}×`).join(', '),
      };
    } else {
      notMeasured.push('sections revised — no revision changed the notes inside a section');
    }
  } else {
    notMeasured.push(
      'sections revised — this needs at least two revisions and an arrangement with sections'
    );
  }

  // --- abandoned ideas ---------------------------------------------------
  const rejectedCandidates = input.decisionRecords.filter((d) => d.decision === 'REJECTED').length;
  // A revision nothing came after, that the creator is not on: they went back
  // and went a different way. That is the tree recording an abandonment.
  const hasChild = new Set(revisions.map((r) => r.parentRevisionId).filter(Boolean) as string[]);
  const abandonedBranches = revisions.filter(
    (r) => !hasChild.has(r.revisionId) && r.revisionId !== input.currentRevisionId && r.origin !== 'root'
  ).length;
  // The latest revision, not the live tracks. A sound chosen a second ago has
  // survived nothing yet, and preference here is measured by survival. This
  // also keeps the derivation off the session's hot path: `tracks` changes on
  // every captured onset, and taking it as an input meant recomputing the
  // whole history mid-take for a value that never depended on it.
  const latestSounds = soundsIn(revisions[revisions.length - 1]?.tracks || []);
  const everSounds = new Set<string>();
  for (const r of revisions) for (const s of soundsIn(r.tracks)) everSounds.add(s);
  const droppedSounds = [...everSounds].filter((s) => !latestSounds.has(s));

  let abandonedIdeas: CreativeAnalytics['abandonedIdeas'] = null;
  if (rejectedCandidates || abandonedBranches || droppedSounds.length) {
    const parts: string[] = [];
    if (rejectedCandidates) parts.push(`${rejectedCandidates} candidate${rejectedCandidates === 1 ? '' : 's'} turned down`);
    if (abandonedBranches) parts.push(`${abandonedBranches} branch${abandonedBranches === 1 ? '' : 'es'} left behind`);
    if (droppedSounds.length) parts.push(`${droppedSounds.length} sound${droppedSounds.length === 1 ? '' : 's'} dropped`);
    abandonedIdeas = {
      value: { rejectedCandidates, abandonedBranches, droppedSounds },
      reads: 'what you tried and moved on from is still here, not deleted',
      from: parts.join(', '),
    };
  } else {
    notMeasured.push('abandoned ideas — nothing has been turned down or left behind yet');
  }

  // --- preferred sounds --------------------------------------------------
  //
  // Preference measured by survival: a sound that stayed through many
  // revisions was chosen again every time the creator did not remove it.
  let preferredSounds: CreativeAnalytics['preferredSounds'] = null;
  if (revisions.length >= MIN_REVISIONS && everSounds.size) {
    const value: SoundUse[] = [...everSounds]
      .map((label) => ({
        label,
        survived: revisions.filter((r) => soundsIn(r.tracks).has(label)).length,
        kept: latestSounds.has(label),
      }))
      .sort((a, b) => b.survived - a.survived);
    const top = value.filter((v) => v.kept)[0];
    preferredSounds = {
      value,
      reads: top
        ? `${top.label} has stayed through ${top.survived} of ${revisions.length} revisions`
        : 'nothing you chose has stayed yet',
      from: value.map((v) => `${v.label} ${v.survived}/${revisions.length}${v.kept ? '' : ' (dropped)'}`).join(', '),
    };
  } else {
    notMeasured.push(
      'preferred sounds — this reads which sounds survive your revisions, and there are not enough yet'
    );
  }

  // --- workflow patterns -------------------------------------------------
  let workflowPatterns: CreativeAnalytics['workflowPatterns'] = null;
  if (revisions.length >= MIN_REVISIONS) {
    const steps = new Map<string, number>();
    for (let i = 1; i < revisions.length; i++) {
      const from = ORIGIN_STEP[revisions[i - 1].origin] || revisions[i - 1].origin;
      const to = ORIGIN_STEP[revisions[i].origin] || revisions[i].origin;
      const key = `${from} → ${to}`;
      steps.set(key, (steps.get(key) || 0) + 1);
    }
    const value = [...steps.entries()]
      .map(([step, times]) => ({ step, times }))
      .sort((a, b) => b.times - a.times);
    workflowPatterns = {
      value,
      reads: value.length ? `your commonest move is ${value[0].step}` : 'no pattern yet',
      from: value.map((v) => `${v.step} ${v.times}×`).join(', '),
    };
  } else {
    notMeasured.push('workflow patterns — a pattern needs more moves than this session has made');
  }

  // The one the seed lists that nothing here can measure. A project records
  // when it was saved and never when it was begun, and nothing marks one
  // finished, so any average would be invented.
  notMeasured.push(
    'average project completion time — nothing records when a project was begun or when it was finished'
  );

  return {
    iterationFrequency,
    sectionsRevised,
    abandonedIdeas,
    preferredSounds,
    projectCompletionTime: null,
    workflowPatterns,
    notMeasured,
  };
}

/** How much of the six is actually known. Stated, never rounded up. */
export function analyticsCoverage(a: CreativeAnalytics): { known: number; total: number } {
  const fields = [
    a.iterationFrequency,
    a.sectionsRevised,
    a.abandonedIdeas,
    a.preferredSounds,
    a.projectCompletionTime,
    a.workflowPatterns,
  ];
  return { known: fields.filter(Boolean).length, total: fields.length };
}
