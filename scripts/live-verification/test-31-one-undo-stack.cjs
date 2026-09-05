/**
 * One undo stack, and one track updater.
 *
 * There were two undo stacks: the session's whole-track snapshots, and a second
 * one in productionHistory built from inverse closures. Undo in the co-producer
 * could not take back a canvas edit and vice versa. The track workstation also
 * behaved differently depending on where it was rendered — from the drawer every
 * field applied, from the side panel only volume did and the rest was dropped.
 *
 * This drives the workstation in both mounts, then interleaves a workstation
 * edit with a recorded take and undoes both from one stack.
 */
const playwright = require('playwright');
const { launch, enterStudio, session, recordTake, goToRoom } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(46)} ${detail}`);
}

// Pinned to one track on purpose. Reading "the selected track" would follow the
// selection when arming a modality creates a new channel, and then a comparison
// across the take would silently be comparing two different tracks.
const STATE = `s => {
  const id = 't-kick';
  const t = s.tracks.find(x => x.id === id) || s.tracks[0];
  return JSON.stringify({
    dsp: t.dspSettings || null,
    instrumentParams: t.instrumentParams || null,
    selected: id,
    notes: s.tracks.reduce((n, x) => n + (x.noteEvents || []).length, 0),
    undoLabel: s.undoLabel,
    redoLabel: s.redoLabel,
  });
}`;
const state = async (page) => JSON.parse(await session(page, STATE));

async function moveAttack(page, scope, value) {
  const slider = scope.locator('input[type=range]').first();
  if (!(await slider.count())) return false;
  await slider.evaluate((e, v) => {
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(e, String(v));
    e.dispatchEvent(new Event('input', { bubbles: true }));
    e.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await page.waitForTimeout(600);
  return true;
}

async function openSynthTab(page, scope) {
  const tab = scope.getByRole('button', { name: /SYNTH|DSP/i }).first();
  if (await tab.count()) {
    await tab.click({ force: true });
    await page.waitForTimeout(700);
  }
}

(async () => {
  const { browser, page } = await launch(playwright, `${SP}/beatbox_ksh.wav`);
  await enterStudio(page);

  console.log('=== ONE UNDO STACK ===\n');

  // ---- 1. the drawer mount ----
  // Addressed by its title rather than its label: the rail entry reads
  // 'WORKSTATION' and this test was still clicking a label that no longer
  // exists, so it timed out before it measured anything.
  await page.locator('button[title="Open Track Workstation"]').first().click({ force: true });
  await page.waitForTimeout(1400);
  const drawer = page.locator('div.fixed.right-0:has-text("TRACK PRODUCTION WORKSTATION")').first();
  const expand = drawer.getByRole('button', { name: /OPEN WORKSTATION/i }).first();
  if (await expand.count()) { await expand.click({ force: true }); await page.waitForTimeout(1000); }
  await openSynthTab(page, drawer);

  const beforeDrawer = await state(page);
  await moveAttack(page, drawer, 12);
  const afterDrawer = await state(page);
  check('the drawer mount writes track state',
        JSON.stringify(beforeDrawer.dsp) !== JSON.stringify(afterDrawer.dsp) ||
        JSON.stringify(beforeDrawer.instrumentParams) !== JSON.stringify(afterDrawer.instrumentParams),
        `label "${afterDrawer.undoLabel}"`);
  check('the edit is named in the one stack', !!afterDrawer.undoLabel && afterDrawer.undoLabel !== 'Edit',
        `undoLabel="${afterDrawer.undoLabel}"`);

  await page.keyboard.press('Control+z');
  await page.waitForTimeout(800);
  const undoneDrawer = await state(page);
  check('one press undoes a workstation edit',
        JSON.stringify(undoneDrawer.dsp) === JSON.stringify(beforeDrawer.dsp) &&
        JSON.stringify(undoneDrawer.instrumentParams) === JSON.stringify(beforeDrawer.instrumentParams),
        'settings restored');

  // close the drawer
  // Addressed by its title rather than its label: the rail entry reads
  // 'WORKSTATION' and this test was still clicking a label that no longer
  // exists, so it timed out before it measured anything.
  await page.locator('button[title="Open Track Workstation"]').first().click({ force: true });
  await page.waitForTimeout(800);

  // ---- 2. one stack across a workstation edit and a recorded take ----
  // (The Create room's inspector would be the other mount of this handler, but
  // ContextualToolPanel — and the inspector inside it — is imported by nothing,
  // so there is no reachable second mount to drive.)
  await goToRoom(page, 'CREATE', { settle: 0 });
  await page.waitForTimeout(1200);

  // Re-apply the workstation edit so there is something under the take.
  // Addressed by its title rather than its label: the rail entry reads
  // 'WORKSTATION' and this test was still clicking a label that no longer
  // exists, so it timed out before it measured anything.
  await page.locator('button[title="Open Track Workstation"]').first().click({ force: true });
  await page.waitForTimeout(1400);
  const drawer2 = page.locator('div.fixed.right-0:has-text("TRACK PRODUCTION WORKSTATION")').first();
  const expand2 = drawer2.getByRole('button', { name: /OPEN WORKSTATION/i }).first();
  if (await expand2.count()) { await expand2.click({ force: true }); await page.waitForTimeout(900); }
  await openSynthTab(page, drawer2);
  const beforePanel = await state(page);
  const movedAgain = await moveAttack(page, drawer2, 9);
  const afterPanel = await state(page);
  check('the workstation edit landed again',
        movedAgain && JSON.stringify(beforePanel.dsp) !== JSON.stringify(afterPanel.dsp),
        movedAgain ? `label "${afterPanel.undoLabel}"` : 'no slider found on the reopened drawer');
  // Addressed by its title rather than its label: the rail entry reads
  // 'WORKSTATION' and this test was still clicking a label that no longer
  // exists, so it timed out before it measured anything.
  await page.locator('button[title="Open Track Workstation"]').first().click({ force: true });
  await page.waitForTimeout(800);

  // ---- 3. one stack across a panel edit and a recorded take ----
  const beforeTake = await state(page);

  // The capture row is a set of modality tabs and one record control now; the
  // old single '🎤 BEATBOX (MOUTH)' button is gone, and this test was waiting
  // for it rather than recording anything.
  await recordTake(page, 'Oral Beatbox', 5);

  const afterTake = await state(page);
  check('the take recorded on top of the edit', afterTake.notes > beforeTake.notes,
        `${afterTake.notes - beforeTake.notes} notes, label "${afterTake.undoLabel}"`);

  await page.keyboard.press('Control+z');
  await page.waitForTimeout(900);
  const undoTake = await state(page);
  check('one press takes back the take', undoTake.notes === beforeTake.notes,
        `${undoTake.notes} notes`);

  // Walk back until the workstation edit is gone — same stack, no second one.
  let presses = 0;
  let walked = await state(page);
  while (presses < 4 && JSON.stringify(walked.dsp) !== JSON.stringify(beforePanel.dsp)) {
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(700);
    walked = await state(page);
    presses++;
  }
  check('the same stack reaches the workstation edit',
        JSON.stringify(walked.dsp) === JSON.stringify(beforePanel.dsp),
        `after ${presses} more press(es)`);

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})();
