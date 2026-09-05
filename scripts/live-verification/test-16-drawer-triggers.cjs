/**
 * Every drawer trigger: does clicking it open the drawer it claims to open?
 *
 * Each trigger is clicked twice (open, then close) from a clean state, so a
 * button that silently no-ops is distinguishable from one that works.
 */
const playwright = require('playwright');
const { launch, enterStudio, UTILITY_TITLE } = require('./lib.cjs');

// Addressed by the title each control carries rather than its visible label:
// the labels lost their emoji prefixes and several of these moved from the
// header to the utilities rail, so every entry read ABSENT while this file
// still exited 0.
// [{ how to find it }, expected heading inside the panel that should appear]
const UTILITY_TRIGGERS = [
  [{ label: 'STUDIO INTELLIGENCE', name: '✦ STUDIO INTELLIGENCE' }, 'STUDIO INTELLIGENCE'],
  [{ label: 'NATIVE BRAIN', title: UTILITY_TITLE.NATIVE_BRAIN }, 'NATIVE'],
  [{ label: 'WORKSTATION', title: UTILITY_TITLE.WORKSTATION }, 'TRACK PRODUCTION WORKSTATION'],
  [{ label: 'SONGWRITING', title: UTILITY_TITLE.SONGWRITING }, 'SONGWRITING'],
  [{ label: 'MIDI HARDWARE', title: UTILITY_TITLE.MIDI_HARDWARE }, 'MIDI'],
  [{ label: 'INSPECTOR', title: UTILITY_TITLE.INSPECTOR }, 'INSPECTOR'],
  [{ label: 'CALIBRATION', title: UTILITY_TITLE.CALIBRATION }, 'CALIBRATION'],
  [{ label: 'RADIAL RADAR', title: UTILITY_TITLE.RADAR }, 'RADIAL'],
];

// The headings are what these panels actually say -- PIANO opens VIRTUAL
// KEYBOARD and MANUAL opens the studio manual, and both were being reported as
// misses against headings from an older build.
const HEADER_TRIGGERS = [
  [{ label: 'PIANO', title: UTILITY_TITLE.PIANO }, 'VIRTUAL KEYBOARD'],
  [{ label: 'SOURCING', title: UTILITY_TITLE.SOURCING }, 'SOUND'],
  [{ label: 'IMPORT AUDIO', title: UTILITY_TITLE.IMPORT_AUDIO }, 'IMPORT'],
  [{ label: 'MANUAL', name: 'MANUAL' }, 'MANUAL'],
  [{ label: 'COLLAB', title: UTILITY_TITLE.COLLAB }, 'COLLAB'],
  [{ label: 'EXPORT', name: 'EXPORT' }, 'EXPORT'],
  [{ label: 'SIGNATURE', title: UTILITY_TITLE.SIGNATURE }, 'TRAINING'],
  [{ label: 'STUDIO TOUR', name: 'STUDIO TOUR' }, 'TOUR'],
];

const triggerLocator = (page, t) =>
  t.title
    ? page.locator(`button[title="${t.title}"]`).first()
    : page.getByRole('button', { name: t.name, exact: false }).first();

let missing = 0;

/** Every fixed overlay currently on screen, with its heading text. */
async function overlays(page) {
  return page.$$eval('div.fixed', els =>
    els
      .filter(e => {
        const r = e.getBoundingClientRect();
        const cs = getComputedStyle(e);
        return r.width > 200 && r.height > 200 && cs.visibility !== 'hidden' && cs.opacity !== '0';
      })
      .map(e => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 70))
      .filter(Boolean)
  );
}

async function testTrigger(page, trigger, expected) {
  const label = trigger.label;
  await enterStudio(page);
  const before = await overlays(page);
  const btn = triggerLocator(page, trigger);
  if (!(await btn.count())) return { label, reachable: false };

  await btn.click({ force: true });
  await page.waitForTimeout(1100);
  const afterOpen = await overlays(page);
  const opened = afterOpen.filter(t => !before.includes(t));
  const matched = opened.some(t => t.toUpperCase().includes(expected.toUpperCase()));

  return { label, reachable: true, opened: opened[0] || '(nothing appeared)', matched };
}

(async () => {
  const { browser, page } = await launch(playwright, null);
  await enterStudio(page);

  console.log('=== DRAWER TRIGGERS ===\n');
  console.log('-- STUDIO UTILITIES row (Room 1 CREATE) --');
  for (const [trigger, expected] of UTILITY_TRIGGERS) {
    const r = await testTrigger(page, trigger, expected);
    if (!r.matched) missing++;
    console.log(`  ${r.matched ? 'OPENS ' : r.reachable ? 'MISS  ' : 'ABSENT'} ${trigger.label.padEnd(26)} -> ${r.opened || 'not reachable'}`);
  }

  console.log('\n-- Header triggers --');
  for (const [trigger, expected] of HEADER_TRIGGERS) {
    const r = await testTrigger(page, trigger, expected);
    if (!r.matched) missing++;
    console.log(`  ${r.matched ? 'OPENS ' : r.reachable ? 'MISS  ' : 'ABSENT'} ${trigger.label.padEnd(26)} -> ${r.opened || 'not reachable'}`);
  }

  // Which rooms even show the utilities row?
  console.log('\n-- Where is the STUDIO UTILITIES row reachable? --');
  await enterStudio(page);
  await page.evaluate(`window.__studio = () => {
    const root = document.getElementById('root');
    const key = Object.keys(root).find(k => k.startsWith('__reactContainer$'));
    const fiberRoot = root[key] && root[key].stateNode;
    const stack = [(fiberRoot && fiberRoot.current) || root[key]]; const seen = new Set();
    while (stack.length) {
      const f = stack.pop(); if (!f || seen.has(f)) continue; seen.add(f);
      const v = f.memoizedProps && f.memoizedProps.value;
      if (v && Array.isArray(v.tracks) && v.setActiveWorkspace) return v;
      if (f.child) stack.push(f.child); if (f.sibling) stack.push(f.sibling);
    }
    throw new Error('no ctx');
  }`);

  for (const room of ['CREATE', 'WRITE_RECORD', 'MIX', 'MASTER', 'RELEASE']) {
    // Switch through the context so a stray overlay cannot block the tab click.
    await page.evaluate(`window.__studio().setActiveWorkspace(${JSON.stringify(room)})`);
    await page.waitForTimeout(1400);
    const actual = await page.evaluate('window.__studio().activeWorkspace');

    let present = 0;
    for (const [trigger] of UTILITY_TRIGGERS) {
      if (await triggerLocator(page, trigger).count()) present++;
    }

    let worksHere = 'n/a';
    if (present) {
      const b = page.locator(`button[title="${UTILITY_TITLE.WORKSTATION}"]`).first();
      if (await b.count()) {
        await b.click({ force: true }).catch(() => {});
        await page.waitForTimeout(1200);
        worksHere = (await page.locator('div.fixed.right-0:has-text("TRACK PRODUCTION WORKSTATION")').count()) > 0 ? 'WORKS' : 'FAILS';
        await b.click({ force: true }).catch(() => {});
        await page.waitForTimeout(800);
      }
    }
    console.log(`  ${room.padEnd(13)} (actual room: ${String(actual).padEnd(13)}) ${present}/${UTILITY_TRIGGERS.length} triggers present   opens from here: ${worksHere}`);
  }

  await browser.close();
  // It used to exit 0 whatever it found, so a run where half the triggers were
  // unreachable still counted as a pass.
  console.log(`\n  ${missing === 0 ? 'every trigger opened what it claims to open' : missing + ' trigger(s) did not'}`);
  process.exit(missing === 0 ? 0 : 1);
})();
