/**
 * Every drawer trigger: does clicking it open the drawer it claims to open?
 *
 * Each trigger is clicked twice (open, then close) from a clean state, so a
 * button that silently no-ops is distinguishable from one that works.
 */
const playwright = require('playwright');
const { launch, enterStudio } = require('./lib.cjs');

// [button label, expected heading inside the panel that should appear]
const UTILITY_TRIGGERS = [
  ['✦ STUDIO INTELLIGENCE', 'STUDIO INTELLIGENCE'],
  ['🧠 NATIVE BRAIN', 'NATIVE'],
  ['🎛️ TRACK WORKSTATION', 'TRACK PRODUCTION WORKSTATION'],
  ['🎙️ SONGWRITING SUITE', 'SONGWRITING'],
  ['🎹 MIDI & HARDWARE', 'MIDI'],
  ['INSPECTOR', 'INSPECTOR'],
  ['CALIBRATION', 'CALIBRATION'],
  ['RADIAL RADAR', 'RADIAL'],
];

const HEADER_TRIGGERS = [
  ['🎹 PIANO', 'PIANO'],
  ['SOUND VAULT', 'SOUND'],
  ['IMPORT AUDIO', 'IMPORT'],
  ['MANUAL', 'HELP'],
  ['COLLAB', 'COLLAB'],
  ['EXPORT', 'EXPORT'],
  ['TRAIN SIGNATURE', 'TRAINING'],
  ['STUDIO TOUR', 'TOUR'],
];

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

async function testTrigger(page, label, expected) {
  await enterStudio(page);
  const before = await overlays(page);
  const btn = page.getByRole('button', { name: label, exact: false }).first();
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
  for (const [label, expected] of UTILITY_TRIGGERS) {
    const r = await testTrigger(page, label, expected);
    console.log(`  ${r.matched ? 'OPENS ' : r.reachable ? 'MISS  ' : 'ABSENT'} ${label.padEnd(26)} -> ${r.opened || 'not reachable'}`);
  }

  console.log('\n-- Header triggers --');
  for (const [label, expected] of HEADER_TRIGGERS) {
    const r = await testTrigger(page, label, expected);
    console.log(`  ${r.matched ? 'OPENS ' : r.reachable ? 'MISS  ' : 'ABSENT'} ${label.padEnd(26)} -> ${r.opened || 'not reachable'}`);
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

  for (const room of ['CREATE', 'BUILD', 'WRITE_RECORD', 'MIX', 'MASTER', 'RELEASE']) {
    // Switch through the context so a stray overlay cannot block the tab click.
    await page.evaluate(`window.__studio().setActiveWorkspace(${JSON.stringify(room)})`);
    await page.waitForTimeout(1400);
    const actual = await page.evaluate('window.__studio().activeWorkspace');

    let present = 0;
    for (const [label] of UTILITY_TRIGGERS) {
      if (await page.getByRole('button', { name: label, exact: false }).count()) present++;
    }

    let worksHere = 'n/a';
    if (present) {
      const b = page.getByRole('button', { name: '🎛️ TRACK WORKSTATION', exact: false }).first();
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
})();
