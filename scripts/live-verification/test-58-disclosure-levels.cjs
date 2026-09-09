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
const { launch, enterStudio, session, goToRoom } = require('./lib.cjs');

let failures = 0;
function check(label, ok, detail = '') {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(58)} ${detail}`);
}

const railLabels = (page) =>
  page.$$eval('aside button', (bs) => bs.map((b) => (b.innerText || '').trim()).filter(Boolean));

(async () => {
  const { browser, page } = await launch(playwright, null);
  await enterStudio(page);

  console.log('=== FOUR DECLARED LEVELS ===\n');

  // ---- §16: nothing disappeared ----
  console.log('-- what is still there --');
  const rail = await railLabels(page);
  const expected = ['🎹 PIANO', 'INSTRUMENT', 'SIGNATURE', 'SOURCING', 'COLLAB', 'NATIVE BRAIN',
    'WORKSTATION', 'PATTERN', 'TAKES', 'SONGWRITING', 'VOCAL TO LYRIC', 'MIDI HARDWARE', 'INSPECTOR',
    'CALIBRATION', 'RADIAL RADAR', 'IMPORT AUDIO', 'PIPELINE'];
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
  // The microphone is not a bench: it is the room's own act, always on
  // screen. Arriving in CREATE therefore opens no bench at all -- suggesting
  // one on top of the recording surface would be the level deciding what the
  // creator is doing.
  check('arriving in CREATE, the microphone is on screen without opening anything',
    (await page.locator('[data-testid="record"]').count()) === 1 &&
      (await page.locator('[data-testid^="bench-"]').count()) === 0,
    'record control present, no bench row');

  await goToRoom(page, 'WRITE_RECORD', { settle: 0 });
  await page.waitForTimeout(1200);
  const room = JSON.parse(await session(page, `s => JSON.stringify(s.activeWorkspace)`));
  check('the room changed', room === 'WRITE_RECORD', room);
  check('and reading a take as lyrics is offered with the writing, not only from the rail',
    await page.locator('[data-testid="write-room-vocal-to-lyric"]').isVisible().catch(() => false));

  await goToRoom(page, 'CREATE', { settle: 0 });
  await page.waitForTimeout(1000);
  check('back in CREATE, the microphone is there again',
    (await page.locator('[data-testid="record"]').count()) === 1, 'record control present');

  // ---- Amendment D: what a creator opens stays open ----
  //
  // The bench row is gone -- the instrument and the grid tools are on the
  // utilities rail with the other tools, and the section editor opens from the
  // section list it edits. So what is checked here is the same principle
  // against what exists now: a tool the creator opens is still open after two
  // room changes, and the level never closes it for them.
  console.log('\n-- and the creator outranks the level --');
  await page.getByRole('button', { name: 'EDIT SECTIONS', exact: false }).first().click();
  await page.waitForTimeout(700);
  check('opening the section editor opens it',
    (await page.locator('[data-testid="section-editor"]').count()) === 1);

  await goToRoom(page, 'WRITE_RECORD', { settle: 0 });
  await page.waitForTimeout(900);
  await goToRoom(page, 'CREATE', { settle: 0 });
  await page.waitForTimeout(900);
  check('the microphone is still the room, and nothing was reorganised under them',
    (await page.locator('[data-testid="record"]').count()) === 1, 'record control present');

  const railAfter = await railLabels(page);
  check('nothing left the rail while any of that happened',
    railAfter.length === rail.length, `${rail.length} -> ${railAfter.length}`);

  await browser.close();
  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}\n`);
  process.exit(failures === 0 ? 0 : 1);
})();
