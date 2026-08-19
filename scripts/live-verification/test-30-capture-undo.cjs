/**
 * Can a recorded take be undone?
 *
 * Captured notes were written straight to state, bypassing the history stack
 * entirely — a take could not be undone at all. They go through the history
 * writer now, grouped so one press removes the take rather than one note.
 * This records real takes through the synthetic microphone and then presses
 * the real keyboard shortcut.
 */
const playwright = require('playwright');
const { launch, enterStudio, session } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(44)} ${detail}`);
}

const COUNTS = `s => JSON.stringify({
  notes: s.tracks.reduce((n, t) => n + (t.noteEvents || []).length, 0),
  captured: s.tracks.reduce((n, t) => n + (t.noteEvents || []).filter(e => e.provenance && e.provenance.origin !== 'CREATOR_DRAWN').length, 0),
  tracks: s.tracks.length,
  canUndo: s.canUndo,
  canRedo: s.canRedo,
})`;

const counts = async (page) => JSON.parse(await session(page, COUNTS));

// Both ends of a take go through the real UI: the capture-row modality button
// arms the mic, the calibration drawer's own control stops it. The wait after
// stopping is longer than the history grouping window, so the next edit cannot
// join this take's entry.
async function recordTake(page, seconds) {
  await page.getByRole('button', { name: '🎤 BEATBOX (MOUTH)' }).first().click({ force: true });
  await page.waitForTimeout(seconds * 1000);

  await page.getByRole('button', { name: 'CALIBRATION', exact: false }).first().click({ force: true });
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'Stop Mic', exact: true }).first().click({ force: true });
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'CALIBRATION', exact: false }).first().click({ force: true });
  await page.waitForTimeout(2600);
}

(async () => {
  const { browser, page } = await launch(playwright, `${SP}/beatbox_ksh.wav`);
  await enterStudio(page);

  console.log('=== UNDOING A RECORDED TAKE ===\n');

  const start = await counts(page);
  console.log(`  start: ${start.notes} notes on ${start.tracks} tracks`);

  await recordTake(page, 5);
  const afterTake = await counts(page);
  const recorded = afterTake.notes - start.notes;
  console.log(`  after take 1: ${afterTake.notes} notes (+${recorded}), tracks ${afterTake.tracks}`);
  check('the take actually recorded something', recorded > 3, `${recorded} notes captured`);
  check('undo became available', afterTake.canUndo === true, `canUndo=${afterTake.canUndo}`);

  // ---- one press must remove the whole take ----
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(800);
  const undone = await counts(page);
  console.log(`  after one undo: ${undone.notes} notes, tracks ${undone.tracks}`);
  // Arming a modality also creates the channel to record into, and that is its
  // own action — so one undo takes back the take, not the channel.
  check('one undo removes the whole take', undone.notes === start.notes,
        `${undone.notes} notes vs ${start.notes} at the start (channel count ${undone.tracks}, kept deliberately)`);
  check('redo became available', undone.canRedo === true, `canRedo=${undone.canRedo}`);

  await page.keyboard.press('Control+Shift+z');
  await page.waitForTimeout(800);
  const redone = await counts(page);
  check('redo restores the take', redone.notes === afterTake.notes,
        `${redone.notes} notes vs ${afterTake.notes} after recording`);

  // ---- a second take is its own entry ----
  await recordTake(page, 4);
  const afterSecond = await counts(page);
  const secondCount = afterSecond.notes - redone.notes;
  console.log(`  after take 2: ${afterSecond.notes} notes (+${secondCount})`);
  check('the second take recorded', secondCount > 3, `${secondCount} notes`);

  await page.keyboard.press('Control+z');
  await page.waitForTimeout(800);
  const afterSecondUndo = await counts(page);
  check('undo removes only the second take', afterSecondUndo.notes === redone.notes,
        `${afterSecondUndo.notes} notes, expected ${redone.notes}`);

  // Arming for the second take created its own channel, which sits in the stack
  // between the two takes — so reaching take 1 is two presses, not one.
  let presses = 0;
  let reached = await counts(page);
  while (reached.notes !== start.notes && presses < 3) {
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(700);
    reached = await counts(page);
    presses++;
  }
  check('a further undo removes the first take too', reached.notes === start.notes,
        `${reached.notes} notes after ${presses} more press(es)`);

  // ---- the stack unwinds all the way, channels included ----
  for (let i = 0; i < 6; i++) {
    const state = await counts(page);
    if (!state.canUndo) break;
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(500);
  }
  const unwound = await counts(page);
  console.log(`  fully unwound: ${unwound.notes} notes on ${unwound.tracks} tracks`);
  check('the stack unwinds to where it started', unwound.notes === start.notes && unwound.tracks === start.tracks,
        `${unwound.notes} notes on ${unwound.tracks} tracks`);

  // ---- the shortcut must not fire while typing ----
  await page.getByRole('button', { name: '3. WRITE & RECORD', exact: false }).first().click({ force: true });
  await page.waitForTimeout(1500);
  const box = page.locator('textarea').first();
  if (await box.count()) {
    await box.click({ force: true });
    const notesBefore = (await counts(page)).notes;
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(600);
    const notesAfter = (await counts(page)).notes;
    check('typing keeps its own undo', notesAfter === notesBefore,
          `notes ${notesBefore} -> ${notesAfter} while focus was in a textarea`);
  } else {
    check('a text field was available to test', false, 'no textarea found');
  }

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})();
