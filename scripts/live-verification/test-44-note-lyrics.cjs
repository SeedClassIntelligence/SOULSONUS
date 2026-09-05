/**
 * Writing a syllable onto a note.
 *
 * The track lane has always *drawn* a note's lyric and never had a way to
 * write one: the only editor for it lived in a 684-line piano roll that no
 * file rendered. `handleSetNoteLyric` sat on the session, reachable from
 * nothing. When that piano roll was deleted as the weaker of two editors,
 * this was the one thing it had that the mounted lane did not, so it moved
 * across rather than going with it.
 */
const playwright = require('playwright');
const { launch, enterStudio, session, seedMelody } = require('./lib.cjs');

let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(50)} ${detail}`);
}

const LYRICS = `s => JSON.stringify(
  (s.tracks.find(t => t.id === 't-melody')?.noteEvents || [])
    .map(e => ({ id: e.id, tick: e.startTick, lyric: e.lyric || null }))
)`;
const lyrics = async (page) => JSON.parse(await session(page, LYRICS));

(async () => {
  const { browser, page } = await launch(playwright, null);
  await enterStudio(page);

  console.log('=== A SYLLABLE ON A NOTE ===\n');

  // The melody channel arrives empty now -- the preset carries channels and no
  // performance -- so this used to stop at "0 notes" before it wrote a
  // syllable onto anything.
  await seedMelody(page);

  const before = await lyrics(page);
  check('the melody track has notes', before.length > 0, `${before.length} notes`);
  check('none of them carries a lyric yet', before.every((n) => !n.lyric), `${before.filter((n) => n.lyric).length} with lyrics`);

  // Alt-click anywhere on the note: a plain click drags it, a double-click
  // deletes it, and on a short note the stretch handle covers the chip
  // entirely — so the hit target is the note, not a chip inside it.
  const target = before[0];
  const noteEl = page.locator(`[data-testid="note-${target.id}"]`).first();
  const count = await noteEl.count();
  check('the note is on screen', count === 1, `${count} element for the note at tick ${target.tick}`);
  if (!count) { console.log('\nFAILED'); await browser.close(); process.exit(1); }
  await noteEl.scrollIntoViewIfNeeded();
  await noteEl.click({ modifiers: ['Alt'], position: { x: 3, y: 3 } });
  await page.waitForTimeout(500);

  const input = page.locator('[data-testid="lyric-input"]').first();
  check('alt-click opens an editor', (await input.count()) === 1, `${await input.count()} input(s)`);

  await input.fill('soul');
  await input.press('Enter');
  await page.waitForTimeout(700);

  const after = await lyrics(page);
  const written = after.find((n) => n.id === target.id);
  check('the syllable is on the note', written?.lyric === 'soul', `lyric="${written?.lyric}"`);
  check(
    'and only on that note',
    after.filter((n) => n.lyric).length === 1,
    `${after.filter((n) => n.lyric).length} note(s) carry a lyric`
  );

  const shown = await page.locator(`[data-testid="note-lyric-${target.id}"]`).first().innerText().catch(() => '');
  check('the lane draws it', /soul/.test(shown), `"${shown.trim()}"`);

  // ---- a second syllable, and undo ----
  console.log('\n-- a second one, and undo --');
  const second = before[1];
  const noteEl2 = page.locator(`[data-testid="note-${second.id}"]`).first();
  await noteEl2.scrollIntoViewIfNeeded();
  await noteEl2.click({ modifiers: ['Alt'], position: { x: 3, y: 3 } });
  await page.waitForTimeout(400);
  await page.locator('[data-testid="lyric-input"]').first().fill('sonus');
  await page.locator('[data-testid="lyric-input"]').first().press('Enter');
  await page.waitForTimeout(700);

  const two = await lyrics(page);
  check(
    'both syllables are written',
    two.filter((n) => n.lyric).length === 2,
    two.filter((n) => n.lyric).map((n) => `"${n.lyric}"`).join(' ')
  );

  await page.keyboard.press('Control+z');
  await page.waitForTimeout(900);
  const undone = await lyrics(page);
  check(
    'one undo takes back the last syllable only',
    undone.filter((n) => n.lyric).length === 1 && undone.find((n) => n.id === target.id)?.lyric === 'soul',
    `${undone.filter((n) => n.lyric).map((n) => `"${n.lyric}"`).join(' ') || 'none'} left`
  );

  console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})();
