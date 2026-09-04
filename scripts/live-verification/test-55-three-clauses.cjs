/**
 * The three clauses that were absent and small, closed and checked in the app.
 *
 *   XVIII.4  Synthetic media disclosure reaches the release manifest.
 *   XIV.1    Genre is a conditioning parameter, not an output label.
 *   III.4    One performance feeds several processors simultaneously.
 *
 * Each is checked where a creator would meet it, not only where its function
 * is defined: the disclosure inside a rendered package and on the export
 * screen before anything is sent, the genre on the intent panel and in session
 * state, and the fan-out as three readings of one take with the same onsets
 * under them.
 */
const playwright = require('playwright');
const { launch, enterStudio, session, recordTake } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

let failures = 0;
function check(label, ok, detail = '') {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(58)} ${detail}`);
}

(async () => {
  const { browser, page } = await launch(playwright, `${SP}/hum_melody.wav`);
  await enterStudio(page);

  console.log('=== III.4, XIV.1, XVIII.4 ===\n');

  // ---- XIV.1: genre as a parameter ----
  console.log('-- genre is named, never classified --');
  await page.locator('[data-testid="creative-intent-toggle"]').first().click();
  await page.waitForTimeout(400);
  const before = JSON.parse(await session(page, `s => JSON.stringify(s.genreId)`));
  check('nothing has classified the creator\'s material', before === null, String(before));
  const panelBefore = await page.locator('[data-testid="creative-intent-body"]').innerText();
  check('and the panel says that rather than showing a guess',
    /nothing here classifies your material/.test(panelBefore),
    (panelBefore.match(/[^\n]*classifies your material[^\n]*/) || [''])[0]);

  await page.selectOption('[data-testid="genre-select"]', 'neo_soul');
  await page.waitForTimeout(500);
  const named = JSON.parse(await session(page, `s => JSON.stringify(s.genreId)`));
  check('naming one puts it in session state, where a realization can reach it',
    named === 'neo_soul', String(named));
  const withheld = await page.locator('[data-testid="genre-withheld"]').innerText().catch(() => '');
  check('the contract holds what the creator plays, and the panel says which parts',
    /rhythm/.test(withheld) && /harmonic language/.test(withheld), withheld.replace(/\n/g, ' '));
  check('while the production grammar it does get is named',
    /instrumentation/.test(await page.locator('[data-testid="creative-intent-body"]').innerText()),
    'instrumentation listed');

  // ---- III.4: one performance, several processors ----
  console.log('\n-- one performance, several processors --');
  await recordTake(page, 'Hum / Voice', 9);
  const fan = JSON.parse(await session(page, `s => JSON.stringify({
    interpretation: s.lastInterpretation ? s.lastInterpretation.measured.onsets : null,
    expression: s.expressionState ? s.expressionState.measuredFrom.onsets : null,
    cadence: s.lastPassLyricSeed ? s.lastPassLyricSeed.positions.length : null,
    roles: s.lastInterpretation ? s.lastInterpretation.hypotheses.length : 0,
    phrases: s.lastPassLyricSeed ? s.lastPassLyricSeed.phrases.length : 0,
  })`));
  check('the pass was read for what it is', fan.roles > 0, `${fan.roles} role readings`);
  check('read for what it expresses', fan.expression !== null, `${fan.expression} onsets`);
  check('and read as a cadence, in the same moment', fan.cadence !== null, `${fan.cadence} positions`);
  check('all three read the same performance, not three different views of it',
    fan.interpretation === fan.expression && fan.expression === fan.cadence,
    `${fan.interpretation} / ${fan.expression} / ${fan.cadence}`);
  check('and the cadence came out as lines, not a list of onsets', fan.phrases >= 1, `${fan.phrases}`);

  await page.getByRole('button', { name: 'VOCAL TO LYRIC' }).first().click();
  await page.waitForTimeout(700);
  const takeOptions = await page.locator('[data-testid="vtl-take"]').innerText();
  check('the workstation offers the take at the fidelity the microphone heard it',
    /take you just performed/.test(takeOptions), takeOptions.split('\n')[0]);
  await page.locator('[data-testid="vtl-close"]').first().click();
  await page.waitForTimeout(400);

  // ---- XVIII.4: the disclosure in the manifest ----
  console.log('\n-- what a machine made, in the record --');
  await page.getByRole('button', { name: 'EXPORT', exact: true }).first().click({ force: true });
  await page.waitForTimeout(800);
  await page.locator('[data-testid="render-export-package"]').first().click({ force: true });
  await page.waitForSelector('[data-testid="export-summary"]', { timeout: 240000 }).catch(() => {});
  await page.waitForTimeout(800);

  const disclosed = await page.locator('[data-testid="synthetic-disclosure"]').innerText().catch(() => '');
  check('the export screen states it before anything is sent',
    /Synthetic media disclosure/i.test(disclosed), disclosed.split('\n')[1] || '');
  check('and it is true for this project, which nobody generated into',
    /No synthetic material/.test(disclosed), (disclosed.split('\n')[1] || '').slice(0, 90));
  check('with the file it is written into named',
    /provenance/.test(disclosed), (disclosed.match(/written into[^\n]*/) || [''])[0]);

  const inFile = await page.evaluate(async () => {
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
      if (v && Array.isArray(v.tracks) && v.deliveryPackage) { c = v; break; }
      if (f.child) stack.push(f.child);
      if (f.sibling) stack.push(f.sibling);
    }
    if (!c) return null;
    const res = await fetch(c.deliveryPackage.provenance.url);
    const body = await res.json();
    return body.syntheticDisclosure || null;
  });
  check('and the record that ships carries it, not just the screen',
    !!inFile && typeof inFile.statement === 'string',
    inFile ? inFile.statement.slice(0, 80) : 'absent from the provenance file');
  check('with the counts a reader can check it against',
    !!inFile && typeof inFile.totalNotes === 'number' && Array.isArray(inFile.tracks),
    inFile ? `${inFile.tracks.length} tracks, ${inFile.totalNotes} notes` : '');
  check('and what it cannot see, stated in the file itself',
    !!inFile && Array.isArray(inFile.limits) && inFile.limits.length >= 2,
    inFile ? `${inFile.limits.length} limits` : '');

  await browser.close();
  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}\n`);
  process.exit(failures === 0 ? 0 : 1);
})();
