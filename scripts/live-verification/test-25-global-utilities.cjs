/**
 * Layer 1.1 — are the utility triggers and Import Audio reachable from every room?
 *
 * They used to live inside StudioCanvas, which renders only for rooms 1-2, so
 * eight workstations and the audio import were unreachable from the other four.
 */
const playwright = require('playwright');
const { launch, enterStudio, UTILITY_TITLE } = require('./lib.cjs');

// Addressed by the title each control carries, which says what it opens. The
// visible labels lost their emoji prefixes in a relabelling and every entry
// here went to ABSENT -- while this file still exited 0, so the suite stayed
// green while reporting that four utilities could not be reached from any room.
const TRIGGERS = [
  [{ label: 'STUDIO INTELLIGENCE', name: '✦ STUDIO INTELLIGENCE' }, 'STUDIO INTELLIGENCE'],
  [{ label: 'NATIVE BRAIN', title: UTILITY_TITLE.NATIVE_BRAIN }, 'NATIVE STUDIO BRAIN'],
  [{ label: 'WORKSTATION', title: UTILITY_TITLE.WORKSTATION }, 'TRACK PRODUCTION WORKSTATION'],
  [{ label: 'SONGWRITING', title: UTILITY_TITLE.SONGWRITING }, 'SONGWRITING SUITE'],
  [{ label: 'MIDI HARDWARE', title: UTILITY_TITLE.MIDI_HARDWARE }, 'EXTERNAL HARDWARE'],
  [{ label: 'INSPECTOR', title: UTILITY_TITLE.INSPECTOR }, 'QUICK PRODUCTION INSPECTOR'],
  [{ label: 'CALIBRATION', title: UTILITY_TITLE.CALIBRATION }, 'FFT & Detection Calibration'],
  [{ label: 'RADIAL RADAR', title: UTILITY_TITLE.RADAR }, 'Radial Step Visualizer'],
  [{ label: 'IMPORT AUDIO', title: UTILITY_TITLE.IMPORT_AUDIO }, 'IMPORT AUDIO & MULTITRACK STEMS'],
];

const triggerLocator = (page, t) =>
  t.title
    ? page.locator(`button[title="${t.title}"]`).first()
    : page.getByRole('button', { name: t.name, exact: false }).first();

// BUILD was fused into CREATE; the room list is what the app actually has.
const ROOMS = [['CREATE'], ['WRITE_RECORD'], ['MIX'], ['MASTER'], ['RELEASE']];

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

const overlayFor = async (page, expect) =>
  (await page.locator(`div.fixed:has-text("${expect}")`).count()) > 0;

(async () => {
  console.log('=== UTILITY REACHABILITY, EVERY ROOM ===\n');
  const { browser, page } = await launch(playwright, null);
  await enterStudio(page);
  await page.evaluate(STUDIO);

  const grid = {};
  for (const [room] of ROOMS) {
    await page.evaluate(`window.__studio().setActiveWorkspace(${JSON.stringify(room)})`);
    await page.waitForTimeout(1200);
    const actual = await page.evaluate('window.__studio().activeWorkspace');

    const results = [];
    for (const [trigger, expect] of TRIGGERS) {
      const label = trigger.label;
      const btn = triggerLocator(page, trigger);
      if (!(await btn.count())) { results.push(`${label}:ABSENT`); continue; }
      // Some rooms auto-open their panel on arrival, so a drawer may already be
      // showing. Close it first, or the click under test would just close it.
      if (await overlayFor(page, expect)) {
        await btn.click({ force: true }).catch(() => {});
        await page.waitForTimeout(700);
      }
      await btn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(850);
      const opened = await overlayFor(page, expect);
      if (opened) {
        const close = page.locator('div.fixed button').first();
        await close.click({ force: true }).catch(() => {});
        await page.waitForTimeout(600);
        if (await overlayFor(page, expect)) {
          await btn.click({ force: true }).catch(() => {});
          await page.waitForTimeout(600);
        }
      }
      results.push(`${label}:${opened ? 'OPENS' : 'FAILED'}`);
    }
    grid[room] = { actual, results };
    const ok = results.filter(r => r.endsWith(':OPENS')).length;
    console.log(`  ${room.padEnd(13)} (room=${String(actual).padEnd(13)}) ${ok}/${TRIGGERS.length} open`);
    const bad = results.filter(r => !r.endsWith(':OPENS'));
    if (bad.length) console.log(`      not working: ${bad.join(', ')}`);
  }

  const allOk = Object.values(grid).every(g => g.results.every(r => r.endsWith(':OPENS')));
  console.log(`\n  every trigger works in every room : ${allOk ? 'PASS' : 'FAIL'}`);
  await browser.close();
  // This file used to exit 0 whatever it found, so a run reporting four
  // unreachable utilities in every room still counted as a pass.
  process.exit(allOk ? 0 : 1);
})();
