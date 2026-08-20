/**
 * Does the profile measure the creator, or describe one?
 *
 * The profile this replaces was the same six literals for everybody, signed
 * and stored as though it described a person. So the test that matters is not
 * "does it produce a profile" — it is whether two different creators produce
 * two different profiles, and whether a creator who has done nothing produces
 * an empty one that says so.
 *
 * The pocket is checked hardest, because it is the measure a session player
 * could eventually use to sound like this creator rather than like a default.
 * A take built to sit 12 ms behind the grid has to read as behind, the same
 * take built 12 ms ahead has to read as ahead, and the identical tick offset
 * has to read differently at two tempos — otherwise the milliseconds are
 * decoration on a tick count.
 */
import { computeStyleProfile, describeStyleProfile } from '../../src/lib/styleProfile';
import { DetectionSettings, GenerationDecisionRecord, NoteEvent, Track } from '../../src/types/daw';

let failures = 0;
const check = (label: string, ok: boolean, detail: string) => {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(52)} ${detail}`);
};

const BPM = 100;
/** One millisecond in ticks at 100 BPM: 480 ticks per beat, 600 ms per beat. */
const msToTicks = (ms: number, bpm = BPM) => Math.round((ms / (60000 / bpm)) * 480);

const note = (startTick: number, over: Partial<NoteEvent> = {}): NoteEvent => ({
  id: `n${startTick}_${Math.random()}`,
  startTick,
  durationTicks: 120,
  midiNote: 36,
  velocity: 100,
  provenance: { origin: 'MOUTH', creatorEdited: false, detectionConfidence: 0.8 },
  ...over,
});

/** Sixteen 16ths, each displaced by the same amount. */
const takeAt = (offsetMs: number, count = 16): NoteEvent[] =>
  Array.from({ length: count }, (_, i) => note(i * 120 + msToTicks(offsetMs)));

const track = (over: Partial<Track> = {}): Track => ({
  id: 't1',
  name: 'Kick',
  instrument: 'kick',
  steps: [],
  mute: false,
  solo: false,
  volume: 0,
  pitch: 'C1',
  color: '#f00',
  ...over,
});

const settings = (over: Partial<DetectionSettings> = {}): DetectionSettings => ({
  enabled: false,
  micConnected: false,
  kickThreshold: 0.31,
  snareThreshold: 0.62,
  gain: 2.4,
  currentLowLevel: 0,
  currentHighLevel: 0,
  lastKickTriggerTime: 0,
  lastSnareTriggerTime: 0,
  autoRecordToGrid: false,
  ...over,
});

console.log('=== THE STYLE PROFILE ===\n');

// ---- the empty case, which used to be the confident one ----
console.log('-- a creator who has done nothing --');
const empty = computeStyleProfile({ creatorName: 'Nobody', tracks: [track()], bpm: BPM });
check('no pocket is claimed', empty.performance.pocket === null, 'pocket is null, not a default');
check('no thresholds are claimed', empty.calibration.kickThreshold === null, 'null rather than 0.45');
check(
  'a detector still on its shipped settings is not a fingerprint',
  computeStyleProfile({ creatorName: 'x', tracks: [track()], bpm: BPM, detectionSettings: settings({ kickThreshold: 0.35, snareThreshold: 0.3, gain: 1.5 }) })
    .calibration.kickThreshold === null,
  'untouched defaults report as null, not as this creator\'s numbers'
);
check('no sounds are claimed', empty.choices.sounds.length === 0, 'no "Fat 808 Sub"');
check(
  'and it says what is missing',
  empty.gaps.length >= 4 && empty.gaps.every((g) => g.length > 30),
  `${empty.gaps.length} gaps named`
);
check(
  'the one-line description refuses to invent one',
  describeStyleProfile(empty) === 'Nothing has been measured about this creator yet.',
  describeStyleProfile(empty)
);

// ---- the pocket ----
console.log('\n-- the pocket, which is the point --');
const behind = computeStyleProfile({
  creatorName: 'Drags',
  tracks: [track({ noteEvents: takeAt(12) })],
  bpm: BPM,
});
const ahead = computeStyleProfile({
  creatorName: 'Pushes',
  tracks: [track({ noteEvents: takeAt(-12) })],
  bpm: BPM,
});
const onGrid = computeStyleProfile({
  creatorName: 'Tight',
  tracks: [track({ noteEvents: takeAt(0) })],
  bpm: BPM,
});

check(
  'a take played late reads as behind the beat',
  behind.performance.pocket?.reads === 'behind the beat' && behind.performance.pocket.meanOffsetMs > 8,
  `${behind.performance.pocket?.meanOffsetMs} ms`
);
check(
  'a take played early reads as ahead of the beat',
  ahead.performance.pocket?.reads === 'ahead of the beat' && ahead.performance.pocket.meanOffsetMs < -8,
  `${ahead.performance.pocket?.meanOffsetMs} ms`
);
check(
  'a take on the grid reads as on the grid',
  onGrid.performance.pocket?.reads === 'on the grid' && Math.abs(onGrid.performance.pocket.meanOffsetMs) < 1,
  `${onGrid.performance.pocket?.meanOffsetMs} ms`
);
check(
  'a tight player has a small spread',
  (onGrid.performance.pocket?.spreadMs ?? 99) < 1,
  `±${onGrid.performance.pocket?.spreadMs} ms`
);

// A loose player: same mean, scattered around it.
const scattered = [0, 9, -7, 14, -11, 5, -3, 12, -9, 6, -13, 8, 2, -6, 11, -4].map((ms, i) =>
  note(i * 120 + msToTicks(ms))
);
const loose = computeStyleProfile({ creatorName: 'Loose', tracks: [track({ noteEvents: scattered })], bpm: BPM });
check(
  'a loose player has a large one',
  (loose.performance.pocket?.spreadMs ?? 0) > 5 * (onGrid.performance.pocket?.spreadMs ?? 0.01),
  `±${loose.performance.pocket?.spreadMs} ms against ±${onGrid.performance.pocket?.spreadMs} ms`
);

// The same tick offset is a different musical error at two tempos.
const ticks = msToTicks(12, 100);
const slow = computeStyleProfile({ creatorName: 'x', tracks: [track({ noteEvents: Array.from({ length: 16 }, (_, i) => note(i * 120 + ticks)) })], bpm: 60 });
const fast = computeStyleProfile({ creatorName: 'x', tracks: [track({ noteEvents: Array.from({ length: 16 }, (_, i) => note(i * 120 + ticks)) })], bpm: 180 });
check(
  'the same tick offset reads differently at two tempos',
  Math.abs((slow.performance.pocket?.meanOffsetMs ?? 0) - (fast.performance.pocket?.meanOffsetMs ?? 0)) > 5,
  `${slow.performance.pocket?.meanOffsetMs} ms at 60 BPM vs ${fast.performance.pocket?.meanOffsetMs} ms at 180 BPM`
);

check(
  'too few onsets is reported, not averaged',
  computeStyleProfile({ creatorName: 'x', tracks: [track({ noteEvents: takeAt(12, 4) })], bpm: BPM }).performance.pocket === null,
  '4 onsets is not a pocket'
);

// ---- what else is measured ----
console.log('\n-- the rest of it --');
const full = computeStyleProfile({
  creatorName: 'Real',
  bpm: BPM,
  detectionSettings: settings(),
  decisionRecords: [
    { decisionId: 'd1', commitTransactionId: 'c', candidateId: 'a', decision: 'ACCEPTED', overrideIntentContract: false, timestamp: 1 },
    { decisionId: 'd2', commitTransactionId: 'c', candidateId: 'b', decision: 'REJECTED', overrideIntentContract: false, timestamp: 2 },
    { decisionId: 'd3', commitTransactionId: 'c', candidateId: 'c', decision: 'ACCEPTED', overrideIntentContract: true, timestamp: 3 },
  ] as GenerationDecisionRecord[],
  tracks: [
    track({
      noteEvents: takeAt(12).map((n, i) => ({ ...n, velocity: 60 + i * 4 })),
      vaultLabel: 'TR-808 Sub Kick',
      detectionProfile: { centerFreq: 63.5, q: 2.1, threshold: 0.31 },
    }),
    track({ id: 't2', name: 'Snare', instrument: 'snare', vaultLabel: 'Crispy Vintage Snare' }),
    track({ id: 't3', name: 'Bass', instrument: 'bass' }),
  ],
});

check(
  'the thresholds are the ones the creator tuned',
  full.calibration.kickThreshold === 0.31 && full.calibration.snareThreshold === 0.62 && full.calibration.inputGain === 2.4,
  `kick ${full.calibration.kickThreshold} · snare ${full.calibration.snareThreshold} · gain ${full.calibration.inputGain}`
);
check(
  'a calibrated channel carries its own centre frequency',
  full.calibration.fingerprints.length === 1 && full.calibration.fingerprints[0].centerFreq === 63.5,
  `${full.calibration.fingerprints[0]?.name} at ${full.calibration.fingerprints[0]?.centerFreq} Hz`
);
check(
  'dynamics are measured, not assumed',
  full.performance.velocity?.min === 60 && full.performance.velocity.max === 120,
  `${full.performance.velocity?.min}–${full.performance.velocity?.max}, mean ${full.performance.velocity?.mean}`
);
check(
  'the sounds are the ones actually chosen',
  full.choices.sounds.length === 2 && full.choices.sounds.includes('TR-808 Sub Kick'),
  full.choices.sounds.join(', ')
);
check(
  'accepts, rejects and overrides are counted',
  full.decisions.accepted === 2 && full.decisions.rejected === 1 && full.decisions.overrides === 1,
  `${full.decisions.accepted} accepted · ${full.decisions.rejected} rejected · ${full.decisions.overrides} override`
);
check(
  'drawn and generated notes are not counted as performance',
  computeStyleProfile({
    creatorName: 'x',
    bpm: BPM,
    tracks: [track({ noteEvents: takeAt(12).map((n) => ({ ...n, provenance: { origin: 'SESSION_PLAYER' as const, creatorEdited: false } })) })],
  }).performance.performedNotes === 0,
  'a session player\'s take is not the creator\'s pocket'
);

// ---- the subdivision is what was played, not how tightly ----
console.log('\n-- what was played, against how tightly --');
check(
  'clean 16ths played late are still 16ths',
  behind.performance.subdivisions[0].label !== 'off the grid',
  `${behind.performance.subdivisions.map((s) => `${s.label} ${s.onsets}`).join(', ')} — displaced 12 ms`
);
check(
  'and the displacement shows up in the pocket instead',
  behind.performance.pocket?.reads === 'behind the beat',
  `${behind.performance.pocket?.meanOffsetMs} ms`
);

// Eighth-note triplets: 160 ticks apart, which no 16th grid can express.
const triplets = Array.from({ length: 12 }, (_, i) => note(i * 160));
check(
  'a triplet take is read as triplets, not as off the grid',
  computeStyleProfile({ creatorName: 'x', tracks: [track({ noteEvents: triplets })], bpm: BPM })
    .performance.subdivisions[0].label === 'triplets',
  computeStyleProfile({ creatorName: 'x', tracks: [track({ noteEvents: triplets })], bpm: BPM })
    .performance.subdivisions.map((s) => `${s.label} ${s.onsets}`).join(', ')
);

// Genuinely between the grids: 60 ticks is 75 ms at 100 BPM, far from both.
const between = Array.from({ length: 12 }, (_, i) => note(i * 480 + 60));
check(
  'a take between the grids is reported as off the grid',
  computeStyleProfile({ creatorName: 'x', tracks: [track({ noteEvents: between })], bpm: BPM })
    .performance.subdivisions[0].label === 'off the grid',
  computeStyleProfile({ creatorName: 'x', tracks: [track({ noteEvents: between })], bpm: BPM })
    .performance.subdivisions.map((s) => `${s.label} ${s.onsets}`).join(', ')
);

// ---- two creators, two profiles ----
console.log('\n-- and it tells two people apart --');
console.log(`  A: ${describeStyleProfile(behind)}`);
console.log(`  B: ${describeStyleProfile(ahead)}`);
check(
  'two different takes give two different descriptions',
  describeStyleProfile(behind) !== describeStyleProfile(ahead),
  'which the six literals never did'
);

console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
process.exit(failures === 0 ? 0 : 1);
