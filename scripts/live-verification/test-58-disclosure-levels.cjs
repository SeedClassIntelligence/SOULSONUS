/**
 * Amendment A §17's four levels, in the running app -- and §16 as the fence.
 *
 * §16 rejects the obvious wrong version of this outright: "the professional
 * DAW controls should NOT disappear... we should not turn SoulSonus into six
 * giant buttons. That would destroy much of what you've already built." So the
 * first thing checked here is that nothing left. §17's complaint is different
 * and narrower -- "it is too simultaneous" -- and its fix is hierarchy: level 2
 * follows the work, and level 4 is filed rather than hidden.
 *
 * The last check is the one that matters most: the creator's own choice beats
 * the hierarchy. A level that moved a bench out from under them would be the
 * organizing layer entering the room, which Amendment D forbids.
 */
const playwright = require('playwright');
const { launch, enterStudio, session } = require('./lib.cjs');

let failures = 0;
function check(label, ok, detail = '') {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(58)} ${detail}`);
}

const railLabels = (page) =>
  page.$$eval('aside button', (bs) => bs.map((b) => (b.innerText || '').trim()).filter(Boolean));

// Read off the component's own state rather than guessed from a class name:
// the inactive styles share their colour with the active ones, so a class
// probe reported the first bench as selected whatever was actually selected.
const benchOf = (page) =>
  page.$$eval('[data-testid^="bench-"]', (bs) => {
    const on = bs.find((b) => b.getAttribute('data-active') === 'true');
    return on ? on.getAttribute('data-testid').replace('bench-', '') : null;
  });

(async () => {
  const { browser, page } = await launch(playwright, null);
  await enterStudio(page);

  console.log('=== FOUR DECLARED LEVELS ===\n');

  // ---- §16: nothing disappeared ----
  console.log('-- what is still there --');
  const rail = await railLabels(page);
  const expected = ['🎹 PIANO', 'INSTRUMENT', 'SIGNATURE', 'SOURCING', 'COLLAB', 'NATIVE BRAIN',
    'WORKSTATION', 'SONGWRITING', 'VOCAL TO LYRIC', 'MIDI HARDWARE', 'INSPECTOR', 'CALIBRATION',
    'RADIAL RADAR', 'IMPORT AUDIO', 'PIPELINE'];
  const missing = expected.filter((e) => !rail.some((r) => r.includes(e)));
  check('every specialist utility is still on the rail', missing.length === 0,
    missing.join(', ') || `${rail.length} entries, none missing`);
  check('and the rail says what it is, rather than calling itself a simplification',
    await page.locator('[data-testid="level-4-label"]').isVisible().catch(() => false));

  const level1 = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      rooms: /CREATE/.test(text) && /MIX/.test(text) && /MASTER/.test(text),
      intelligence: /STUDIO INTELLIGENCE/.test(text),
      transport: !!document.querySelector('button[title^="Play"]'),
    };
  });
  check('level 1 is on screen: the rooms, the transport, the intelligence',
    level1.rooms && level1.intelligence && level1.transport, JSON.stringify(level1));

  // ---- §17: level 2 follows the work ----
  console.log('\n-- level 2 follows the activity --');
  check('arriving in CREATE, the expression engine is the activity',
    (await benchOf(page)) === 'UNIFIED', String(await benchOf(page)));

  await page.getByRole('button', { name: '2. WRITE & RECORD', exact: false }).first().click();
  await page.waitForTimeout(1200);
  const room = JSON.parse(await session(page, `s => JSON.stringify(s.activeWorkspace)`));
  check('the room changed', room === 'WRITE_RECORD', room);
  check('and reading a take as lyrics is offered with the writing, not only from the rail',
    await page.locator('[data-testid="write-room-vocal-to-lyric"]').isVisible().catch(() => false));

  await page.getByRole('button', { name: '1. CREATE', exact: false }).first().click();
  await page.waitForTimeout(1000);
  check('back in CREATE, the activity is the expression engine again',
    (await benchOf(page)) === 'UNIFIED', String(await benchOf(page)));

  // ---- Amendment D: their choice beats the hierarchy ----
  console.log('\n-- and the creator outranks the level --');
  await page.locator('[data-testid="bench-SECTIONS"]').first().click();
  await page.waitForTimeout(600);
  check('choosing a bench selects it', (await benchOf(page)) === 'SECTIONS',
    String(await benchOf(page)));

  await page.getByRole('button', { name: '2. WRITE & RECORD', exact: false }).first().click();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: '1. CREATE', exact: false }).first().click();
  await page.waitForTimeout(900);
  check('and the level never takes it back off them across rooms',
    (await benchOf(page)) === 'SECTIONS',
    `${await benchOf(page)} — chosen, and still chosen after two room changes`);

  const railAfter = await railLabels(page);
  check('nothing left the rail while any of that happened',
    railAfter.length === rail.length, `${rail.length} -> ${railAfter.length}`);

  await browser.close();
  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}\n`);
  process.exit(failures === 0 ? 0 : 1);
})();
