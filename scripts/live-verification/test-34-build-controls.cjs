/**
 * The Build room's transformation cluster, and the quantize button.
 *
 * Installing the React type packages showed that ShootAroundControls was being
 * called with four prop names it does not declare and without a fifth it
 * requires, so every button in that cluster called undefined; and that the
 * quantize button passed its division where the note ids belong. Neither could
 * be seen before, because without @types/react JSX props were never checked.
 *
 * This drives those controls and reads the session state they claim to change.
 */
const playwright = require('playwright');
const { launch, enterStudio, session, goToRoom } = require('./lib.cjs');

let failures = 0;
const errors = [];
function check(label, ok, detail) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(44)} ${detail}`);
}

const STATE = `s => JSON.stringify({
  steps: s.tracks.map(t => (t.steps || []).filter(Boolean).length),
  // A nudge rotates the pattern, so counts stay put — the shape has to be
  // compared, not the totals.
  shape: s.tracks.map(t => (t.steps || []).map(x => x ? 1 : 0).join('')).join('|'),
  total: s.tracks.reduce((n, t) => n + (t.steps || []).filter(Boolean).length, 0),
  notes: s.tracks.reduce((n, t) => n + (t.noteEvents || []).length, 0),
  undoLabel: s.undoLabel,
})`;
const state = async (page) => JSON.parse(await session(page, STATE));

(async () => {
  const { browser, page } = await launch(playwright, null);
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 140)));
  await enterStudio(page);

  console.log('=== PATTERN TRANSFORMATION CONTROLS ===\n');

  // The transformation cluster moved into CREATE's PATTERN bench when Create
  // and Build were fused; this test was still opening a BUILD room that no
  // longer exists and timed out before touching a control.
  await goToRoom(page, 'CREATE', { settle: 0 });
  await page.waitForTimeout(1400);
  await page.locator('[data-testid="bench-PATTERN"]').first().click();
  await page.waitForTimeout(900);

  const before = await state(page);
  console.log(`  start: ${before.total} active steps across ${before.steps.length} tracks`);

  // The cluster is behind one labelled disclosure now ("Pattern"), and the
  // buttons inside it carry ids rather than the shouted labels this test was
  // matching on. Addressed by id, which is what survives a relabelling.
  // By id: the bench tab is also called PATTERN, and matching on the label
  // closed the bench instead of opening the cluster inside it.
  await page.locator('#btn-pattern-ops').first().click();
  await page.waitForTimeout(700);

  // ---- INVERT: what was silent should play, and the reverse ----
  const invert = page.locator('#btn-invert-pattern').first();
  check('an invert control exists', (await invert.count()) > 0, '');
  if (await invert.count()) {
    await invert.click();
    await page.waitForTimeout(800);
    const inverted = await state(page);
    const expected = before.steps.map((n, i) => 64 - n);
    check('invert flips every step', JSON.stringify(inverted.steps) === JSON.stringify(expected),
          `${before.total} -> ${inverted.total} active steps`);
    check('and is named in the history', inverted.undoLabel === 'Invert pattern',
          `undoLabel="${inverted.undoLabel}"`);
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(700);
    const restored = await state(page);
    check('and can be undone', restored.total === before.total, `${restored.total} active steps`);
  }

  // ---- NUDGE: the pattern should move ----
  // Nudging an empty grid moves nothing, and so does nudging a full one --
  // this ran on a session that now starts blank, so it was asserting movement
  // in a pattern that had none to make. A random bar gives it something with a
  // shape to shift.
  const nudge = page.locator('#btn-nudge-right').first();
  if (await nudge.count()) {
    await page.locator('#btn-randomize-bar1').first().click();
    await page.waitForTimeout(800);
    const pre = await state(page);
    await nudge.click();
    await page.waitForTimeout(800);
    const post = await state(page);
    check('a nudge control moves the pattern', post.shape !== pre.shape,
          `${pre.total} active steps, pattern ${post.shape === pre.shape ? 'unchanged' : 'shifted'}`);
  } else {
    check('a nudge control exists', false, 'not found');
  }

  // ---- CLEAR ALL ----
  const clear = page.locator('#btn-clear-all').first();
  if (await clear.count()) {
    await clear.click();
    await page.waitForTimeout(800);
    const cleared = await state(page);
    check('clear grid empties the pattern', cleared.total === 0, `${cleared.total} active steps`);
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(700);
  } else {
    check('a clear control exists', false, 'not found');
  }

  // ---- quantize, in the Create canvas ----
  await goToRoom(page, 'CREATE', { settle: 0 });
  await page.waitForTimeout(1400);
  const beforeQuantize = await state(page);
  // Quantize sits inside the note-settings disclosure ("Notes"), which has to
  // be open before the control is on screen.
  await page.locator('#btn-note-settings').first().click().catch(() => {});
  await page.waitForTimeout(700);
  const quantize = page.locator('#btn-quantize-track').first();
  if (await quantize.count()) {
    const errsBefore = errors.length;
    await quantize.click({ force: true });
    await page.waitForTimeout(900);
    const afterQuantize = await state(page);
    check('quantize runs without error', errors.length === errsBefore,
          errors.slice(errsBefore).join(' | ') || 'clean');
    check('quantize keeps every note', afterQuantize.notes === beforeQuantize.notes,
          `${beforeQuantize.notes} -> ${afterQuantize.notes} notes`);
  } else {
    check('a quantize control exists', false, 'not found');
  }

  check('no page errors anywhere in the run', errors.length === 0, errors.join(' | ') || 'clean');

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})();
