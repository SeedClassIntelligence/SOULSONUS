/**
 * The E05 contract, without a network.
 *
 * These are the translation rules between SoulSonus and ACE. They are worth
 * testing on their own because the previous client got one of them wrong in a
 * way no type could catch: it compared ACE's status against the strings
 * 'SUCCESS' and 'FAILED', while the server sends integers, so a finished job
 * would have polled until it timed out.
 */
import {
  E05_TASKS,
  e05StateFromAceStatus,
  isDurationLocked,
  requiresSourceAudio,
  toAceTaskBody,
  validateE05Request,
} from '../../src/lib/inference/e05Contract';

let failures = 0;
function check(label: string, ok: boolean, detail: string) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(52)} ${detail}`);
}

console.log('=== E05 CONTRACT ===\n');

console.log('-- ACE reports status as an integer --');
check('0 is running', e05StateFromAceStatus(0) === 'RUNNING', e05StateFromAceStatus(0));
check('1 is succeeded', e05StateFromAceStatus(1) === 'SUCCEEDED', e05StateFromAceStatus(1));
check('2 is failed', e05StateFromAceStatus(2) === 'FAILED', e05StateFromAceStatus(2));
check(
  'a string status is not mistaken for success',
  e05StateFromAceStatus('SUCCESS') === 'QUEUED',
  `"SUCCESS" -> ${e05StateFromAceStatus('SUCCESS')} (the old client read this as done)`
);

console.log('\n-- which tasks align to the timeline by construction --');
check('all six tasks are named', E05_TASKS.length === 6, E05_TASKS.join(', '));
for (const t of ['cover', 'repaint', 'extract', 'lego'] as const) {
  check(`${t} locks duration to the source`, isDurationLocked(t), 'output lands where the clip sits');
}
check('text2music does not', !isDurationLocked('text2music'), 'it invents a length, so it must be placed');

console.log('\n-- what each task needs --');
check('extract needs source audio', requiresSourceAudio('extract'), 'src_audio required');
check('text2music does not', !requiresSourceAudio('text2music'), 'prompt only');
check(
  'extract without audio is refused before the network',
  validateE05Request({ task: 'extract', instruction: 'extract the drums' }, false) !== null,
  String(validateE05Request({ task: 'extract', instruction: 'extract the drums' }, false))
);
check(
  'extract with audio is accepted',
  validateE05Request({ task: 'extract', instruction: 'extract the drums' }, true) === null,
  'no complaint'
);
check(
  'an empty instruction is refused',
  validateE05Request({ task: 'extract', instruction: '  ' }, true) !== null,
  String(validateE05Request({ task: 'extract', instruction: '  ' }, true))
);
check(
  'a backwards repaint region is refused',
  validateE05Request(
    { task: 'repaint', instruction: 'redo the hook', repaintStartSeconds: 8, repaintEndSeconds: 4 },
    true
  ) !== null,
  'end before start'
);

console.log('\n-- the wire body --');
const extractBody = toAceTaskBody({ task: 'extract', instruction: 'extract the drums' }, '/srv/take.wav');
check('extract carries task and instruction', extractBody.task === 'extract' && !!extractBody.instruction, JSON.stringify(extractBody));
check('source path is passed as src_audio', extractBody.src_audio === '/srv/take.wav', String(extractBody.src_audio));
check(
  'a duration is not smuggled into a duration-locked task',
  toAceTaskBody({ task: 'extract', instruction: 'x', durationSeconds: 30 }).duration === undefined,
  'extract takes its length from the source'
);
check(
  'text2music does carry its duration',
  toAceTaskBody({ task: 'text2music', instruction: 'x', durationSeconds: 30 }).duration === 30,
  'the one task that needs one'
);
const repaintBody = toAceTaskBody({
  task: 'repaint',
  instruction: 'redo the hook',
  repaintStartSeconds: 4,
  repaintEndSeconds: 8,
});
check('repaint carries its region', repaintBody.repaint_start === 4 && repaintBody.repaint_end === 8, JSON.stringify(repaintBody));

console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
process.exit(failures === 0 ? 0 : 1);
