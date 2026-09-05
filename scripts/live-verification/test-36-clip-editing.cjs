/**
 * Clips on the grid: drawn, dragged, trimmed.
 *
 * The previous round left this partial — clips existed and could be listed, but
 * nothing drew them on the sequencer and nothing could be dragged. This drives
 * the real lane with real pointer events and checks the two things that decide
 * whether it is an editor or a picture: does the audio move where it was
 * dropped, and is a whole gesture one entry in the undo stack rather than sixty.
 */
const playwright = require('playwright');
const { launch, enterStudio, session, goToRoom, openUtility, READ_SESSION } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(48)} ${detail}`);
}

const STATE = `s => JSON.stringify({
  clips: s.tracks.flatMap(t => (t.audioClips || []).map(c => ({
    id: c.id, startTick: c.startTick, durationTicks: c.durationTicks,
    offset: Math.round(c.sourceOffsetSeconds * 1000) / 1000,
    span: Math.round(c.sourceDurationSeconds * 1000) / 1000,
  }))),
  assets: Object.values(s.audioAssets || {}).map(a => ({ id: a.id, peaks: (a.peaks || []).length, duration: a.durationSeconds })),
  undoDepth: s.canUndo ? 1 : 0,
  undoLabel: s.undoLabel,
})`;
const state = async (page) => JSON.parse(await session(page, STATE));

const HISTORY = `s => JSON.stringify({ label: s.undoLabel, canUndo: s.canUndo })`;

async function openSuite(page, tab) {
  await openUtility(page, 'SONGWRITING', { settle: 0 });
  await page.waitForTimeout(1400);
  const panel = page.locator('div.fixed.right-0:has-text("SONGWRITING SUITE")').first();
  const t = panel.getByRole('button', { name: tab, exact: true }).first();
  if (await t.count()) { await t.click({ force: true }); await page.waitForTimeout(900); }
  return panel;
}

/** A real pointer drag, in steps, so the lane sees move events rather than a jump. */
async function drag(page, selector, dx) {
  // The lane can sit below the fold; mouse coordinates are viewport-relative,
  // so a press at an off-screen y lands on nothing at all.
  const target = page.locator(selector).first();
  await target.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const box = await target.boundingBox();
  if (!box) return false;
  const y = box.y + box.height / 2;
  const x = box.x + box.width / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(x + (dx * i) / 8, y);
    await page.waitForTimeout(25);
  }
  await page.mouse.up();
  await page.waitForTimeout(700);
  return true;
}

(async () => {
  const { browser, page } = await launch(playwright, `${SP}/hum_A4.wav`);
  await enterStudio(page);

  console.log('=== CLIPS ON THE GRID ===\n');

  // ---- get a clip onto the timeline ----
  const panel = await openSuite(page, '2. TAKES & POOL');
  const rec = panel.locator('[data-testid="record-loop-take"]').first();
  await rec.click({ force: true });
  await page.waitForTimeout(3000);
  await rec.click({ force: true });
  await page.waitForTimeout(2500);

  const takeId = await session(page, `s => {
    const t = s.tracks.find(x => (x.vocalTakes || []).some(v => /^blob:/.test(String(v.sourceAudioId || ''))));
    const v = t && t.vocalTakes.filter(x => /^blob:/.test(String(x.sourceAudioId || ''))).pop();
    return v ? v.id : null;
  }`);
  await panel.locator(`[data-testid="place-take-${takeId}"]`).first().click({ force: true });
  await page.waitForTimeout(2500);
  await openUtility(page, 'SONGWRITING', { settle: 0 });
  await page.waitForTimeout(900);

  const placed = await state(page);
  const clip = placed.clips[0];
  check('a clip is on the timeline', !!clip, clip ? `${clip.durationTicks} ticks at ${clip.startTick}` : 'none');
  if (!clip) { console.log('\nFAILED'); await browser.close(); process.exit(1); }

  // ---- it must be drawn, from real peaks ----
  check('the asset carries waveform peaks', placed.assets[0].peaks > 0,
        `${placed.assets[0].peaks} points over ${placed.assets[0].duration.toFixed(2)}s`);

  const block = page.locator(`[data-testid="clip-block-${clip.id}"]`).first();
  check('the clip is drawn on the grid', (await block.count()) > 0, '');
  const polylines = await block.locator('polyline').count();
  check('and drawn as a waveform, not a box', polylines >= 2, `${polylines} polylines`);

  const drawn = await page.evaluate(`(() => {
    const el = document.querySelector('[data-testid="clip-block-${clip.id}"] polyline');
    const pts = el ? el.getAttribute('points').split(' ') : [];
    const ys = pts.map(p => parseFloat(p.split(',')[1])).filter(n => !isNaN(n));
    return { points: ys.length, distinct: new Set(ys.map(y => Math.round(y))).size };
  })()`);
  check('the shape follows the audio', drawn.distinct > 3,
        `${drawn.points} points, ${drawn.distinct} distinct heights — a flat line would be 1`);

  // ---- drag to move ----
  await page.locator(`[data-testid="clip-block-${clip.id}"]`).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const lane = await page.locator(`[data-testid="clip-lane-t-vocal"]`).first().boundingBox();
  const beforeMove = (await state(page)).clips[0];
  await drag(page, `[data-testid="clip-block-${clip.id}"]`, lane ? lane.width / 4 : 120);
  const afterMove = (await state(page)).clips[0];
  check('dragging moves the clip', afterMove.startTick > beforeMove.startTick,
        `${beforeMove.startTick} -> ${afterMove.startTick} ticks`);
  check('and it lands on the snap grid', afterMove.startTick % 120 === 0, `${afterMove.startTick} ticks`);
  check('the move is named in the history', (await state(page)).undoLabel === 'Move clip',
        `undoLabel="${(await state(page)).undoLabel}"`);

  // ---- one gesture, one undo ----
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(800);
  const afterUndo = (await state(page)).clips[0];
  check('one undo takes back the whole drag', afterUndo.startTick === beforeMove.startTick,
        `${afterUndo.startTick} ticks — not one undo per pointer move`);

  // ---- trim the end ----
  await drag(page, `[data-testid="clip-block-${clip.id}"]`, lane ? lane.width / 4 : 120);
  await page.waitForTimeout(400);
  const beforeTrim = (await state(page)).clips[0];
  await drag(page, `[data-testid="clip-trim-end-${clip.id}"]`, -40);
  const afterTrim = (await state(page)).clips[0];
  check('dragging the end trims the clip', afterTrim.durationTicks < beforeTrim.durationTicks,
        `${beforeTrim.durationTicks} -> ${afterTrim.durationTicks} ticks`);
  check('and the source span follows the length', afterTrim.span < beforeTrim.span,
        `${beforeTrim.span}s -> ${afterTrim.span}s of audio`);
  check('the trim is named in the history', (await state(page)).undoLabel === 'Trim clip',
        `undoLabel="${(await state(page)).undoLabel}"`);

  // ---- trim the head: start moves and the offset follows ----
  const beforeHead = (await state(page)).clips[0];
  await drag(page, `[data-testid="clip-trim-start-${clip.id}"]`, 30);
  const afterHead = (await state(page)).clips[0];
  check('dragging the head moves the start', afterHead.startTick > beforeHead.startTick,
        `${beforeHead.startTick} -> ${afterHead.startTick} ticks`);
  check('and eats into the source offset', afterHead.offset > beforeHead.offset,
        `${beforeHead.offset}s -> ${afterHead.offset}s into the asset`);

  await page.keyboard.press('Control+z');
  await page.waitForTimeout(800);
  const undoneHead = (await state(page)).clips[0];
  check('one undo takes back the trim', undoneHead.offset === beforeHead.offset && undoneHead.startTick === beforeHead.startTick,
        `offset ${undoneHead.offset}s at ${undoneHead.startTick} ticks`);

  // ---- a clip past the grid is marked, not hidden ----
  await goToRoom(page, 'CREATE', { settle: 0 });
  await page.waitForTimeout(1500);
  // `TimelineAudioPanel` -- which owned the move-one-bar buttons this used --
  // is no longer rendered anywhere; the lane moves a clip by dragging it. The
  // move is driven through the session so what is measured is the off-grid
  // marker, not the drag.
  const id = (await state(page)).clips[0].id;
  for (let i = 0; i < 5; i++) {
    await page.evaluate(
      `(() => { const s = ${READ_SESSION}; s.handleMoveAudioClip(${JSON.stringify(id)}, 1920); })()`
    );
    await page.waitForTimeout(300);
  }
  await goToRoom(page, 'CREATE', { settle: 0 });
  await page.waitForTimeout(1500);
  const offGrid = await page.locator(`[data-testid="clip-offgrid-${id}"]`).count();
  check('a clip past four bars is marked, not hidden', offGrid > 0,
        `${(await state(page)).clips[0].startTick} ticks, marker rendered`);

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})();
