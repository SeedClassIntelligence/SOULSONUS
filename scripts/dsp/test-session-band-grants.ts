/**
 * The three grants, and whether their checks can actually fail.
 *
 * This project has already shipped a control that reported success while
 * changing nothing, so a freedom level is worth nothing until its check is
 * shown refusing something. Every case below is built to violate exactly one
 * rule, and the check has to name that rule and no other.
 *
 * The tolerances are in milliseconds, so the same test also has to show that
 * the same tick error passes at one tempo and fails at another -- otherwise
 * the conversion is decoration.
 */
import {
  BandRole,
  CALL_ORDER,
  GRANT_TOLERANCE_MS,
  SESSION_BAND,
  checkGrant,
  handsBackNotes,
  readAddress,
  sortByCallOrder,
} from '../../src/lib/sessionBand';
import { NoteEvent } from '../../src/types/daw';

let failures = 0;
function check(label: string, ok: boolean, detail: string) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(56)} ${detail}`);
}

let seq = 0;
const n = (startTick: number, midiNote: number, velocity = 100): NoteEvent => ({
  id: `n${seq++}`,
  startTick,
  durationTicks: 120,
  midiNote,
  velocity,
  provenance: { origin: 'MOUTH', creatorEdited: false },
});

const BPM = 120; // one 16th (120 ticks) = 125 ms
const GRANT = { trackId: 't-bass' } as const;
const kinds = (r: ReturnType<typeof checkGrant>) => r.violations.map((v) => v.kind);

console.log('=== SESSION BAND GRANTS ===\n');

// The phrase the creator played.
const source = [n(0, 36), n(480, 38), n(960, 36), n(1440, 41)];

console.log('-- PLAY EXACTLY: the phrase is the performance --');
{
  const grant = { level: 'PLAY_EXACTLY' as const, ...GRANT };

  // Same notes, different velocity and duration: the player's to choose.
  const expressive = source.map((s) => ({ ...s, velocity: 60, durationTicks: 240 }));
  const r = checkGrant(grant, source, expressive, BPM, 't-bass');
  check('velocity and duration are the player\'s', r.ok, `${r.violations.length} violations`);

  // 20 ms of push at 120 BPM is inside the 30 ms window.
  const nudged = source.map((s) => ({ ...s, startTick: s.startTick + 19 })); // 19 ticks ≈ 19.8 ms
  const r2 = checkGrant(grant, source, nudged, BPM, 't-bass');
  check('micro-timing inside 30 ms is allowed', r2.ok, `worst drift ${r2.measured.worstOnsetDriftMs} ms`);

  // 60 ticks ≈ 62.5 ms at 120 BPM: outside it.
  const shoved = source.map((s) => ({ ...s, startTick: s.startTick + 60 }));
  const r3 = checkGrant(grant, source, shoved, BPM, 't-bass');
  check('a shifted phrase is refused', !r3.ok && kinds(r3).includes('ONSET_MOVED'), `${kinds(r3)[0]} at ${r3.measured.worstOnsetDriftMs} ms`);

  // The same 60 ticks at 40 BPM is 187 ms; at 400 BPM it is 18.75 ms.
  const slow = checkGrant(grant, source, shoved, 40, 't-bass');
  const fast = checkGrant(grant, source, shoved, 400, 't-bass');
  check(
    'the window is wall-clock, not ticks',
    !slow.ok && fast.ok,
    `same 60 ticks: ${slow.measured.worstOnsetDriftMs} ms at 40 BPM (refused), ${fast.measured.worstOnsetDriftMs} ms at 400 BPM (allowed)`
  );

  // An added passing note.
  const embellished = [...source, n(240, 43)];
  const r4 = checkGrant(grant, source, embellished, BPM, 't-bass');
  check('an added note is refused', !r4.ok && kinds(r4).includes('NOTE_ADDED'), kinds(r4).join(', '));

  // A transposed note.
  const transposed = source.map((s, i) => (i === 2 ? { ...s, midiNote: 48 } : s));
  const r5 = checkGrant(grant, source, transposed, BPM, 't-bass');
  check('a changed pitch is refused', !r5.ok && kinds(r5).includes('PITCH_CHANGED'), kinds(r5).join(', '));

  // A dropped note.
  const r6 = checkGrant(grant, source, source.slice(0, 3), BPM, 't-bass');
  check('a dropped note is refused', !r6.ok && kinds(r6).includes('NOTE_COUNT_CHANGED'), kinds(r6).join(', '));
}

console.log('\n-- PLAY AROUND IT: the skeleton survives --');
{
  const grant = { level: 'PLAY_AROUND_IT' as const, ...GRANT };

  const embellished = [...source, n(240, 43), n(720, 45), n(1200, 43)];
  const r = checkGrant(grant, source, embellished, BPM, 't-bass');
  check('passing notes are the point', r.ok, `${embellished.length} notes back from ${source.length} played`);

  // Every onset kept, every pitch changed, and not one original note left in.
  // This is the statement: at this level the phrase is the rhythm, not the notes.
  const reharmonised = source.map((s) => ({ ...s, id: `re${s.id}`, midiNote: s.midiNote + 7 }));
  const r2 = checkGrant(grant, source, reharmonised, BPM, 't-bass');
  check(
    'pitch is not locked at this level',
    r2.ok && !reharmonised.some((r) => source.some((s) => s.midiNote === r.midiNote)),
    `all ${reharmonised.length} onsets kept, every pitch moved, ${r2.violations.length} violations`
  );

  // The same take under PLAY EXACTLY must be refused, or the two levels are
  // the same rule with different names.
  const r2b = checkGrant({ level: 'PLAY_EXACTLY', ...GRANT }, source, reharmonised, BPM, 't-bass');
  check('the same take is refused one level up', !r2b.ok, kinds(r2b).join(', '));

  // 40 ticks ≈ 41.7 ms: inside the looser 60 ms window.
  const leaning = source.map((s) => ({ ...s, startTick: s.startTick + 40 }));
  const r3 = checkGrant(grant, source, leaning, BPM, 't-bass');
  check('leaning on the beat within 60 ms is allowed', r3.ok, `worst drift ${r3.measured.worstOnsetDriftMs} ms`);

  // Dropping one of the creator's own onsets is not.
  const gutted = [source[0], source[1], n(2000, 50)];
  const r4 = checkGrant(grant, source, gutted, BPM, 't-bass');
  check('a removed source onset is refused', !r4.ok && kinds(r4).includes('ONSET_REMOVED'), `${r4.violations.length} onsets lost`);

  check(
    'the two levels have genuinely different windows',
    GRANT_TOLERANCE_MS.exact < GRANT_TOLERANCE_MS.around,
    `${GRANT_TOLERANCE_MS.exact} ms vs ${GRANT_TOLERANCE_MS.around} ms`
  );
}

console.log('\n-- PLAY WHAT YOU FEEL: unlimited inside the lane, zero outside --');
{
  const grant = { level: 'PLAY_WHAT_YOU_FEEL' as const, trackId: 't-bass', bars: [3, 4] as [number, number] };

  // Bars 3-4 are ticks 3840..7680. Anything goes in there.
  const invented = [n(3840, 31), n(4200, 38), n(5000, 45), n(7000, 33)];
  const r = checkGrant(grant, [], invented, BPM, 't-bass');
  check('it may invent freely inside its bars', r.ok, `${invented.length} notes, ${r.violations.length} violations`);

  // One note in bar 5 is out of lane.
  const spilled = [...invented, n(7680, 40)];
  const r2 = checkGrant(grant, [], spilled, BPM, 't-bass');
  check('a note past the granted bars is refused', !r2.ok && kinds(r2).includes('OUT_OF_LANE_BARS'), r2.violations[0]?.detail || '');

  // Right notes, wrong track.
  const r3 = checkGrant(grant, [], invented, BPM, 't-keys');
  check('writing to another track is refused', !r3.ok && kinds(r3).includes('OUT_OF_LANE_TRACK'), r3.violations[0]?.detail || '');

  // The lane binds every level, not only this one.
  const r4 = checkGrant({ level: 'PLAY_EXACTLY', trackId: 't-bass', bars: [1, 1] }, [], [n(1920, 36)], BPM, 't-bass');
  check('the lane binds PLAY EXACTLY too', !r4.ok && kinds(r4).includes('OUT_OF_LANE_BARS'), kinds(r4).join(', '));
}

console.log('\n-- the roster --');
{
  check('seven players', SESSION_BAND.length === 7, SESSION_BAND.map((p) => p.label).join(', '));
  const notes = SESSION_BAND.filter((p) => p.hands === 'performance').map((p) => p.role);
  const audio = SESSION_BAND.filter((p) => p.hands === 'audio').map((p) => p.role);
  check('five hand back notes', notes.length === 5, notes.join(', '));
  check(
    'two can only hand back audio',
    audio.length === 2 && audio.includes('BACKING_VOCALS') && audio.includes('TEXTURE'),
    `${audio.join(', ')} — a note grid cannot express a stacked "ooh"`
  );
  check(
    'and the engine-swap move is only offered where it is real',
    handsBackNotes('BASS') && !handsBackNotes('TEXTURE'),
    'bass yes, texture no'
  );

  const scrambled: BandRole[] = ['TEXTURE', 'KEYS', 'BASS', 'DRUMS'];
  const ordered = sortByCallOrder(scrambled);
  check(
    'call order puts the rhythm section first',
    ordered[0] === 'DRUMS' && ordered[1] === 'BASS',
    ordered.join(' → ')
  );
  check('and colour last', ordered[ordered.length - 1] === 'TEXTURE', `of ${CALL_ORDER.length} roles`);
}

console.log('\n-- reading an address out of what was typed --');
{
  const cases: [string, string | undefined, string | undefined][] = [
    ['Bass player, play what you feel in the hook', 'BASS', 'PLAY_WHAT_YOU_FEEL'],
    ['Drummer, play exactly what I beatboxed', 'DRUMS', 'PLAY_EXACTLY'],
    ['Guitarist, play around it', 'GUITAR', 'PLAY_AROUND_IT'],
    ['Give me backing vocals on the chorus', 'BACKING_VOCALS', undefined],
    // The one that matters: a verb about a track must not acquire a player.
    ['Make the kick fatter', undefined, undefined],
    ['The bass is masking the kick', undefined, undefined],
    ['Redo the guitar in bars 17-24', undefined, undefined],
  ];
  for (const [text, role, grant] of cases) {
    const got = readAddress(text);
    check(
      `"${text.slice(0, 38)}"`,
      got.role === role && got.grant === grant,
      `role=${got.role ?? '-'} grant=${got.grant ?? '-'}`
    );
  }
}

console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
process.exit(failures === 0 ? 0 : 1);
