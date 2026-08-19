/**
 * Layer 1.2 — what survives switching rooms and coming back?
 *
 * The canvas unmounts on a switch to a room that renders a different
 * workspace. Editor preferences reset silently; the Write & Record room's
 * lyrics were destroyed outright and replaced with the demo text.
 */
const playwright = require('playwright');
const { launch, enterStudio, session } = require('./lib.cjs');

const STUDIO = `window.__studio = () => {
  const root = document.getElementById('root');
  const key = Object.keys(root).find(k => k.startsWith('__reactContainer$'));
  const fr = root[key] && root[key].stateNode;
  const stack = [(fr && fr.current) || root[key]]; const seen = new Set();
  while (stack.length) {
    const f = stack.pop(); if (!f || seen.has(f)) continue; seen.add(f);
    const v = f.memoizedProps && f.memoizedProps.value;
    if (v && Array.isArray(v.tracks) && v.setActiveWorkspace) return v;
    if (f.child) stack.push(f.child); if (f.sibling) stack.push(f.sibling);
  }
  throw new Error('ctx');
}`;

const SNAP = `s => ({
  tool: s.editorPrefs.universalTool,
  bar: s.editorPrefs.activeBarView,
  velLane: s.editorPrefs.showVelocityLane,
  lyrics: s.writeRoomDraft.lyrics.slice(0, 60),
  lyricsLen: s.writeRoomDraft.lyrics.length,
  takes: s.writeRoomDraft.takes.length,
  hydrating: s.isHydrating,
})`;

const go = async (page, room) => {
  await page.evaluate(`window.__studio().setActiveWorkspace(${JSON.stringify(room)})`);
  await page.waitForTimeout(1100);
};

(async () => {
  console.log('=== ROOM SWITCH: WHAT SURVIVES ===\n');
  const { browser, page } = await launch(playwright, null);
  await enterStudio(page);
  await page.evaluate(STUDIO);
  for (let i = 0; i < 30; i++) {
    if (!(await session(page, SNAP)).hydrating) break;
    await page.waitForTimeout(250);
  }

  // Set editor state through the real UI in room 1.
  await go(page, 'CREATE');
  await page.getByRole('button', { name: 'DRAW (B)' }).first().click({ force: true });
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'BAR 2', exact: true }).first().click({ force: true });
  await page.waitForTimeout(400);

  // Write real lyrics in room 3, the way a creator would.
  await go(page, 'WRITE_RECORD');
  const written = 'MY OWN LYRICS — written by the creator, not the demo text.';
  const box = page.locator('textarea').first();
  await box.fill(written);
  await page.waitForTimeout(700);

  const before = await session(page, SNAP);
  console.log(`  before: tool=${before.tool} bar=${before.bar} lyrics="${before.lyrics}" (${before.lyricsLen} chars) takes=${before.takes}`);

  // Leave to a room that renders a different workspace, then come back.
  await go(page, 'MIX');
  await go(page, 'MASTER');
  await go(page, 'CREATE');
  const afterCanvas = await session(page, SNAP);
  await go(page, 'WRITE_RECORD');
  const after = await session(page, SNAP);

  console.log(`  after : tool=${after.tool} bar=${after.bar} lyrics="${after.lyrics}" (${after.lyricsLen} chars) takes=${after.takes}`);

  // The textarea itself must show the creator's text, not just the session.
  const shown = await page.locator('textarea').first().inputValue();

  const chk = (l, a, b) => console.log(`  ${l.padEnd(30)} ${String(a).padEnd(14)} -> ${String(b).padEnd(14)} ${a === b ? 'PASS' : 'FAIL'}`);
  console.log('\n-- survived CREATE -> MIX -> MASTER -> back? --');
  chk('selected tool', before.tool, afterCanvas.tool);
  chk('bar view', before.bar, afterCanvas.bar);
  chk('lyrics length', before.lyricsLen, after.lyricsLen);
  chk('takes', before.takes, after.takes);
  console.log(`  ${'textarea shows the creator text'.padEnd(30)} ${shown.startsWith('MY OWN LYRICS') ? 'PASS' : 'FAIL — showing: ' + JSON.stringify(shown.slice(0, 40))}`);

  // They are session state now, so they should also outlive a reload.
  await page.waitForTimeout(2000);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const enter = page.getByRole('button', { name: 'ENTER THE STUDIO' }).first();
  if (await enter.count()) { await enter.click(); await page.waitForTimeout(2000); }
  await page.evaluate(STUDIO);
  for (let i = 0; i < 40; i++) {
    if (!(await session(page, SNAP)).hydrating) break;
    await page.waitForTimeout(250);
  }
  const reloaded = await session(page, SNAP);
  console.log('\n-- and after a full reload? --');
  chk('selected tool', before.tool, reloaded.tool);
  chk('bar view', before.bar, reloaded.bar);
  chk('lyrics length', before.lyricsLen, reloaded.lyricsLen);

  await browser.close();
})();
