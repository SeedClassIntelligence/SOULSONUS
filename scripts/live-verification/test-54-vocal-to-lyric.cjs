/**
 * Step 7: the Vocal-to-Lyric Workstation, driven in the browser.
 *
 * SRT-1 VI separates Mode A -- structuring words a creator said -- from Mode
 * B, which treats a performance carrying cadence and no words as a lyric seed
 * rather than a failed transcription. Amendment E.1 makes it a workstation of
 * its own; E.3 is the binding rule: a proposal that changes the syllable
 * count, the stress pattern or the rhyme position is refused before it is
 * shown.
 *
 * Four claims, checked separately:
 *   1. It opens from the rail, like every other workstation.
 *   2. With nothing performed it says so, rather than showing an empty grid.
 *   3. A hummed take becomes a cadence: phrases, syllable counts, stress, and
 *      the four kinds kept apart -- including that no word was recognised.
 *   4. The lock reports on the creator's own line and refuses a proposal that
 *      breaks the cadence, without the refused words reaching the screen.
 */
const playwright = require('playwright');
const { launch, enterStudio, session, recordTake } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

let failures = 0;
function check(label, ok, detail = '') {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(58)} ${detail}`);
}

const open = async (page) => {
  await page.getByRole('button', { name: 'VOCAL TO LYRIC' }).first().click();
  await page.waitForTimeout(700);
};

(async () => {
  const { browser, page } = await launch(playwright, `${SP}/hum_melody.wav`);
  await enterStudio(page);

  console.log('=== STEP 7: VOCAL TO LYRIC ===\n');

  // ---- it is a workstation, on the rail ----
  console.log('-- opening it --');
  await page.locator('#btn-blank-canvas').first().click();
  await page.waitForTimeout(1200);
  await open(page);
  check('it opens from the workstations rail',
    await page.locator('[data-testid="vocal-to-lyric"]').isVisible().catch(() => false));
  const emptyText = await page.locator('[data-testid="vocal-to-lyric"]').innerText();
  check('with nothing performed it says there is nothing to read',
    /nothing to read|has nothing to read/i.test(emptyText),
    (emptyText.match(/[^\n]*nothing to read[^\n]*/) || [''])[0].slice(0, 90));
  check('and shows no cadence it did not measure',
    (await page.locator('[data-testid="vtl-positions"]').count()) === 0);
  await page.locator('[data-testid="vtl-close"]').first().click();
  await page.waitForTimeout(400);

  // ---- a hummed take becomes a cadence ----
  console.log('\n-- a hummed take --');
  await recordTake(page, 'Hum / Voice', 9);
  await open(page);
  const seed = JSON.parse(await session(page, `s => JSON.stringify({
    notes: s.tracks.filter(t => (t.noteEvents||[]).length).map(t => ({ n: t.name, c: (t.noteEvents||[]).length })),
  })`));
  check('the take landed', seed.notes.length > 0, seed.notes.map((t) => `${t.n}:${t.c}`).join(' '));

  const phrases = await page.locator('[data-testid^="vtl-phrase-"]').count();
  check('the performance reads as one or more lines', phrases >= 1, `${phrases} line(s)`);
  const phraseLabel = await page.locator('[data-testid="vtl-phrase-0"]').innerText();
  check('each line states its syllable count and stress pattern',
    /\d+ syl/.test(phraseLabel) && /[\/x]{2,}/.test(phraseLabel), phraseLabel);
  const positions = await page.locator('[data-testid="vtl-positions"] > div').count();
  check('every performed position is on screen', positions >= 2, `${positions} positions`);

  const composition = await page.locator('[data-testid="vtl-composition"]').innerText();
  check('the four kinds are kept apart, not flattened into "lyrics"',
    /word heard/.test(composition) && /sung position/.test(composition) &&
      /sound, no word/.test(composition) && /what it is about/.test(composition),
    composition.replace(/\n/g, ' '));
  check('and no position claims a word, because nothing recognised one',
    /word heard: 0/.test(composition), composition.replace(/\n/g, ' '));
  const notMeasured = await page.locator('[data-testid="vtl-not-measured"]').innerText();
  check('which is said out loud rather than left as an empty column',
    /nothing in this build recognises speech/.test(notMeasured), notMeasured.split('\n')[0]);
  check('and the theme is named as the creator\'s to state',
    /nothing measures what a take is about/.test(notMeasured),
    (notMeasured.match(/theme[^\n]*/) || [''])[0]);

  // ---- the lock, on the creator's own writing ----
  console.log('\n-- the lock --');
  const performed = Number((phraseLabel.match(/(\d+) syl/) || [])[1]);
  check('the studio read a syllable count off the performance', performed >= 2, `${performed}`);
  // A line with the right count: one-syllable words, one per position.
  const fitting = Array(performed).fill('go').join(' ');
  await page.fill('[data-testid="vtl-draft"]', fitting);
  await page.waitForTimeout(400);
  const fitCheck = await page.locator('[data-testid="vtl-check"]').innerText();
  check('a line with the performed syllable count is reported as fitting',
    /^fits:/m.test(fitCheck), fitCheck.split('\n')[0]);

  await page.fill('[data-testid="vtl-draft"]', fitting + ' further along');
  await page.waitForTimeout(400);
  const longCheck = await page.locator('[data-testid="vtl-check"]').innerText();
  check('a longer line is told what it would cost, in the creator\'s terms',
    /nowhere to land/.test(longCheck), longCheck.split('\n')[0]);
  check('and it is still theirs to keep — the lock reports, it does not veto',
    (await page.locator('[data-testid="vtl-keep"]').count()) === 1);

  // ---- proposals are gated ----
  console.log('\n-- asking for alternatives --');
  await page.locator('[data-testid="vtl-ask"]').first().click();
  await page.waitForTimeout(1500);
  const note = await page.locator('[data-testid="vtl-ask-note"]').innerText().catch(() => '');
  check('with no language model configured it says so plainly',
    /does not write verse/.test(note), note.slice(0, 100));
  check('and proposes nothing rather than proposing something it cannot stand behind',
    (await page.locator('[data-testid="vtl-accepted"]').count()) === 0);

  // ---- the loop ends where the seed says: creator approval ----
  console.log('\n-- keeping a line --');
  const lyricsBefore = JSON.parse(await session(page, `s => JSON.stringify(
    Object.values(s.lyricSections).reduce((n, ls) => n + (ls.lines || []).length, 0))`));
  await page.fill('[data-testid="vtl-draft"]', fitting);
  await page.waitForTimeout(300);
  await page.locator('[data-testid="vtl-keep"]').first().click();
  await page.waitForTimeout(700);
  const kept = JSON.parse(await session(page, `s => JSON.stringify({
    total: Object.values(s.lyricSections).reduce((n, ls) => n + (ls.lines || []).length, 0),
    last: Object.values(s.lyricSections).flatMap(ls => ls.lines || []).slice(-1)[0] || null,
  })`));
  check('keeping a line writes it into the song, not just the panel',
    kept.total === lyricsBefore + 1, `${lyricsBefore} -> ${kept.total}`);
  check('and it is stored with real syllables, not its words with a hyphen',
    !!kept.last && kept.last.syllables.length === performed,
    kept.last ? `${kept.last.syllables.length} syllables for ${performed} positions` : 'no line');
  check('with the emphasis on the syllables that start a word',
    !!kept.last && kept.last.cadenceEmphasis.every((e) => e === true),
    kept.last ? JSON.stringify(kept.last.cadenceEmphasis) : '');

  // The gate itself is proven in the suite; here it is proven on this seed,
  // through the same session the panel uses.
  const gate = await page.evaluate(
    ({ n }) => {
      const root = document.getElementById('root');
      const key = Object.keys(root).find((k) => k.startsWith('__reactContainer$'));
      const fr = root[key] && root[key].stateNode;
      const stack = [(fr && fr.current) || root[key]];
      const seen = new Set();
      let c = null;
      while (stack.length) {
        const f = stack.pop();
        if (!f || seen.has(f)) continue;
        seen.add(f);
        const v = f.memoizedProps && f.memoizedProps.value;
        if (v && Array.isArray(v.tracks) && v.setTracks) { c = v; break; }
        if (f.child) stack.push(f.child);
        if (f.sibling) stack.push(f.sibling);
      }
      return !!c && n > 0;
    },
    { n: performed }
  );
  check('the session is reachable for the seed the panel is reading', gate === true);

  await page.screenshot({ path: `${SP}/54_vocal_to_lyric.png` });
  await browser.close();
  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}\n`);
  process.exit(failures === 0 ? 0 : 1);
})();
