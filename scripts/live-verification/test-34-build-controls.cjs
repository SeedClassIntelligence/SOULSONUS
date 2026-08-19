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
const { launch, enterStudio, session } = require('./lib.cjs');

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

  console.log('=== BUILD ROOM CONTROLS ===\n');

  await page.getByRole('button', { name: '2. BUILD', exact: false }).first().click({ force: true });
  await page.waitForTimeout(1600);

  const before = await state(page);
  console.log(`  start: ${before.total} active steps across ${before.steps.length} tracks`);

  // ---- INVERT: what was silent should play, and the reverse ----
  const invert = page.getByRole('button', { name: /INVERT/i }).first();
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
  const nudge = page.getByRole('button', { name: 'NUDGE >>', exact: true }).first();
  if (await nudge.count()) {
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
  const clear = page.getByRole('button', { name: 'CLEAR GRID', exact: true }).first();
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
  await page.getByRole('button', { name: '1. CREATE', exact: false }).first().click({ force: true });
  await page.waitForTimeout(1400);
  const beforeQuantize = await state(page);
  const quantize = page.getByRole('button', { name: /QUANTIZE/i }).first();
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
