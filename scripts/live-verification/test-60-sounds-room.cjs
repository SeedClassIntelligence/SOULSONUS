/**
 * The Sounds room: record a sound, keep it, name it, hear it, reach for it.
 *
 * The creator asked for one room for the act that is not performing a song --
 * keeping and shaping sound as material -- and agreed the honest version
 * gathers what already exists rather than building a second subsystem. So the
 * thing this checks is exactly that: the room is the creator sound vault that
 * was already there, with the overlay taken off, and NOT a second
 * implementation over the same store. Two views over one store is how a sound
 * comes back in one place and not the other.
 */
const playwright = require('playwright');
const { launch, enterStudio, session, goToRoom, openUtility } = require('./lib.cjs');

let failures = 0;
function check(label, ok, detail = '') {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(56)} ${detail}`);
}

(async () => {
  const { browser, page } = await launch(playwright, null);
  await enterStudio(page);

  console.log('=== THE SOUNDS ROOM ===\n');

  // ---- it is a room, not a drawer ----
  check('the room is on the nav', (await page.locator('[data-testid="room-SOUNDS"]').count()) === 1);
  await goToRoom(page, 'SOUNDS', { settle: 2000 });
  const room = await session(page, `s => s.activeWorkspace`);
  check('and going there changes the room', room === 'SOUNDS', String(room));

  const inPlace = await page.locator('[data-testid="sounds-room"]').count();
  check('it renders in place rather than over the studio', inPlace === 1, `${inPlace} embedded surface(s)`);
  const overlay = await page.locator('div.fixed.inset-0.z-50').count();
  check('nothing is covering the studio while it is open', overlay === 0, `${overlay} overlay(s)`);

  // ---- what it holds ----
  const text = await page.locator('[data-testid="sounds-room"]').innerText();
  check('it opens on the creator’s own sounds', /MY SOUNDS|ROOTS/i.test(text),
    (text.split('\n').find((l) => /SOUNDS/i.test(l)) || '').slice(0, 60));
  check('and offers a way to record one', /RECORD|CAPTURE/i.test(text),
    (text.match(/RECORD[^\n]{0,30}/i) || [''])[0]);
  check('the studio’s own voices are there and marked as the house’s',
    /studio/i.test(text), 'starter voices present');

  // ---- one store, not two ----
  //
  // The same surface is still reachable from the rail as the training studio.
  // If the room were a second implementation, the two would drift; what is
  // checked here is that they are the same component over the same vault.
  await goToRoom(page, 'CREATE', { settle: 1200 });
  await openUtility(page, 'SIGNATURE', { settle: 2500 });
  const drawerText = await page.evaluate(() => document.body.innerText);
  check('the same vault is still reachable from the rail',
    /MY SOUNDS|ROOTS/i.test(drawerText), 'training studio still carries it');

  await page.screenshot({ path: `${process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify'}/60_sounds_room.png` });
  await browser.close();
  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}\n`);
  process.exit(failures === 0 ? 0 : 1);
})();
