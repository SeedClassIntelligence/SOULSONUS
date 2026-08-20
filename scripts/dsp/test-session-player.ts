/**
 * The Session Player seam: does a call actually get checked?
 *
 * `sessionBand.ts` already proved the grant checks can fail on hand-built
 * input. That is not the same as proving the call path runs them. The rule
 * this layer exists to enforce is that no take reaches the session without
 * being verified against the grant it was given, and the only way to show it
 * is to register a player that breaks its grant and watch the call refuse it.
 *
 * So this runs the real `callSessionPlayer` against the real registry, with
 * the real feel player, plus three deliberately bad players.
 */
import { BandBrief, BandTake, GRANT_TOLERANCE_MS } from '../../src/lib/sessionBand';
import {
  CallOutcome,
  FeelPlayer,
  SessionRoom,
  SessionPlayer,
  bandRoster,
  callSessionPlayer,
  installDefaultBand,
  registerSessionPlayer,
  sessionPlayerFor,
} from '../../src/lib/sessionPlayer';
import { NoteEvent } from '../../src/types/daw';

// The project compiles without `strict`, so a `ok: true | false` discriminant
// does not narrow on its own. This does the narrowing once, explicitly.
type Refused = Extract<CallOutcome, { ok: false }>;
const refusalOf = (o: CallOutcome): Refused['refusal'] | null => (o.ok ? null : (o as Refused).refusal);
const reasonOf = (o: CallOutcome): string | null => {
  const r = refusalOf(o);
  return r && r.kind === 'UNAVAILABLE' ? r.reason : null;
};
const detailOf = (o: CallOutcome): string => refusalOf(o)?.detail || 'the call returned a take';

let failures = 0;
function check(label: string, ok: boolean, detail: string) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(54)} ${detail}`);
}

const BPM = 96;
const LANE = 't-bass-1';

const note = (startTick: number, midiNote: number, velocity = 100): NoteEvent => ({
  id: `n${startTick}_${midiNote}`,
  startTick,
  durationTicks: 240,
  midiNote,
  velocity,
  provenance: { origin: 'MOUTH', creatorEdited: false },
});

// A hummed bassline: root on the downbeat, a passing tone, the fifth.
const PHRASE: NoteEvent[] = [
  note(0, 36, 110),
  note(480, 36, 78),
  note(960, 41, 96),
  note(1200, 43, 70),
  note(1920, 36, 108),
];

const room = (): SessionRoom => ({
  bpm: BPM,
  key: 'F',
  scale: 'minor',
  songTicks: 1920 * 4,
  parts: [
    { trackId: LANE, name: 'Bass', instrument: 'bass', notes: PHRASE },
    { trackId: 't-kick-1', name: 'Kick', instrument: 'kick', notes: [note(0, 36), note(960, 36)] },
  ],
});

const brief = (over: Partial<BandBrief> = {}): BandBrief => ({
  role: 'BASS',
  grant: { level: 'PLAY_EXACTLY', trackId: LANE },
  direction: 'Bass player, play exactly what I played.',
  bpm: BPM,
  key: 'F',
  scale: 'minor',
  source: PHRASE,
  ...over,
});

const ticksToMs = (t: number) => (t / 480) * (60000 / BPM);

(async () => {
  console.log('=== THE SESSION PLAYER SEAM ===\n');

  // ---- an empty registry answers honestly ----
  console.log('-- before anyone is wired --');
  const cold = await callSessionPlayer(brief(), room());
  check(
    'an unwired role refuses rather than inventing',
    reasonOf(cold) === 'NO_PLAYER',
    detailOf(cold)
  );

  installDefaultBand();
  check('the note roles now have a player', !!sessionPlayerFor('BASS'), sessionPlayerFor('BASS')?.renderer || 'none');
  check(
    'and the audio roles honestly do not',
    sessionPlayerFor('BACKING_VOCALS') === null && sessionPlayerFor('TEXTURE') === null,
    'no renderer claimed for parts that have no note form'
  );

  // ---- the real call ----
  console.log('\n-- the bass player takes the call --');
  const out = await callSessionPlayer(brief(), room(), { seed: 7 });
  check('a take came back', out.ok === true, out.ok ? out.description : detailOf(out));
  if (!out.ok) {
    console.log('\n1 FAILURE(S)');
    process.exit(1);
  }
  const take = out.take as Extract<BandTake, { kind: 'performance' }>;

  check(
    'it was verified, not asserted',
    out.check !== null && out.check.ok === true,
    out.check
      ? `${out.check.measured.takeNotes} notes vs ${out.check.measured.sourceNotes} played, worst drift ${out.check.measured.worstOnsetDriftMs} ms of ${out.check.measured.toleranceMs} allowed`
      : 'nothing was checked'
  );
  check(
    'the renderer is named, not implied',
    out.renderer === 'soulsonus-feel' && take.notes.every((n) => n.provenance.renderer === 'soulsonus-feel'),
    `renderer=${out.renderer}, and every note carries it`
  );
  check(
    'and the take is traceable to a player',
    take.notes.every((n) => n.provenance.origin === 'SESSION_PLAYER' && n.provenance.playerRole === 'BASS'),
    'origin=SESSION_PLAYER playerRole=BASS on every note'
  );

  // ---- what the feel model actually did, measured ----
  console.log('\n-- what changed, and what did not --');
  check(
    'not one pitch moved',
    take.notes.every((n, i) => n.midiNote === PHRASE[i].midiNote),
    take.notes.map((n) => n.midiNote).join(' ')
  );
  check(
    'not one note was added or dropped',
    take.notes.length === PHRASE.length,
    `${take.notes.length} notes`
  );
  const drifts = take.notes.map((n, i) => ticksToMs(n.startTick - PHRASE[i].startTick));
  check(
    'every onset stayed inside the grant',
    drifts.every((d) => Math.abs(d) <= GRANT_TOLERANCE_MS.exact),
    drifts.map((d) => `${d >= 0 ? '+' : ''}${d.toFixed(1)}`).join(' ') + ' ms'
  );
  check(
    'the bass actually sits behind the beat',
    drifts.filter((d) => d > 0).length >= 4,
    `${drifts.filter((d) => d > 0).length} of ${drifts.length} onsets late`
  );
  const vels = take.notes.map((n) => n.velocity);
  check(
    'the dynamics were performed, not flattened',
    new Set(vels).size >= 4 && vels.some((v, i) => v !== PHRASE[i].velocity),
    `${PHRASE.map((n) => n.velocity).join(' ')} -> ${vels.join(' ')}`
  );
  check(
    'the downbeat is still the loudest note',
    Math.max(...vels) === vels[0] || vels[0] >= vels[1],
    `bar 1 beat 1 = ${vels[0]}, off-beat = ${vels[1]}`
  );
  check(
    'the creator\'s own louder note is still louder',
    vels[2] > vels[3],
    `${PHRASE[2].velocity} > ${PHRASE[3].velocity} played, ${vels[2]} > ${vels[3]} performed`
  );

  // ---- reproducible, and a different take on a different seed ----
  const again = await callSessionPlayer(brief(), room(), { seed: 7 });
  const other = await callSessionPlayer(brief(), room(), { seed: 8 });
  const shape = (o: CallOutcome) =>
    o.ok && o.take.kind === 'performance' ? o.take.notes.map((n) => `${n.startTick}:${n.velocity}`).join(',') : '';
  check('the same seed is the same take', shape(again) === shape(out), 'seed 7 twice');
  check('a different seed is a different take', shape(other) !== shape(out), 'seed 8 differs — "give me another one"');

  // ---- the refusals ----
  console.log('\n-- what it refuses --');
  const around = await callSessionPlayer(brief({ grant: { level: 'PLAY_AROUND_IT', trackId: LANE } }), room());
  check(
    'it will not fake a grant it cannot honour',
    reasonOf(around) === 'GRANT_NEEDS_MODEL',
    detailOf(around)
  );
  const empty = await callSessionPlayer(brief({ source: [] }), room());
  check(
    'nothing played means nothing to play back',
    reasonOf(empty) === 'NO_SOURCE',
    detailOf(empty)
  );
  const noLane = await callSessionPlayer(brief({ grant: { level: 'PLAY_EXACTLY', trackId: 't-nowhere' } }), room());
  check(
    'a take needs somewhere to land',
    reasonOf(noLane) === 'NO_LANE',
    detailOf(noLane)
  );

  // ---- the load-bearing one: the seam checks the player, not just the input ----
  console.log('\n-- a player that breaks its grant --');

  class BadPlayer implements SessionPlayer {
    readonly hands = 'performance' as const;
    readonly label = 'Bad';
    constructor(
      readonly role: 'BASS',
      readonly renderer: string,
      private readonly make: (src: NoteEvent[]) => NoteEvent[]
    ) {}
    async availability() {
      return { available: true };
    }
    async play(b: BandBrief): Promise<BandTake> {
      return { kind: 'performance', role: this.role, notes: this.make(b.source || []), description: 'a bad take' };
    }
  }

  const cases: [string, (src: NoteEvent[]) => NoteEvent[], string][] = [
    [
      'a note added under PLAY EXACTLY',
      (src) => [...src, note(720, 38, 90)],
      'NOTE_ADDED',
    ],
    [
      'a pitch changed',
      (src) => src.map((n, i) => (i === 2 ? { ...n, midiNote: n.midiNote + 5 } : n)),
      'PITCH_CHANGED',
    ],
    [
      'an onset dragged past the window',
      // 40 ms at 96 BPM, comfortably past the 30 ms this grant allows.
      (src) => src.map((n, i) => (i === 1 ? { ...n, startTick: n.startTick + 31 } : n)),
      'ONSET_MOVED',
    ],
  ];

  for (const [label, make, expected] of cases) {
    registerSessionPlayer(new BadPlayer('BASS', 'bad-renderer', make) as unknown as SessionPlayer);
    const bad = await callSessionPlayer(brief(), room());
    const r = refusalOf(bad);
    const kinds = r && r.kind === 'GRANT_VIOLATED' ? r.violations.map((v) => v.kind) : [];
    check(
      `refused: ${label}`,
      !!r && r.kind === 'GRANT_VIOLATED' && kinds.includes(expected as never),
      r ? `${r.kind} — ${kinds.join(', ') || r.detail}` : 'the take was accepted'
    );
  }

  // ---- the roster tells the truth about the whole band ----
  console.log('\n-- the roster --');
  registerSessionPlayer(new FeelPlayer('BASS'));
  const roster = await bandRoster(brief(), room());
  for (const r of roster) {
    console.log(
      `  ${r.label.padEnd(20)} ${(r.renderer || '—').padEnd(18)} ${
        r.availability.available ? 'available' : `unavailable: ${r.availability.reason}`
      }`
    );
  }
  check(
    'every role is accounted for',
    roster.length === 7,
    `${roster.filter((r) => r.availability.available).length} available, ${
      roster.filter((r) => !r.availability.available).length
    } not — each with a reason`
  );
  check(
    'no role claims a renderer it does not have',
    roster.every((r) => (r.renderer === null) === (r.availability.reason === 'NO_PLAYER')),
    'renderer named only where one exists'
  );

  console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
  process.exit(failures === 0 ? 0 : 1);
})();
