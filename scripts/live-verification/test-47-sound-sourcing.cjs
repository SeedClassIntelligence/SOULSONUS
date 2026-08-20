/**
 * The sourcing panel says what is actually there.
 *
 * The screen this replaces listed seven instruments that do not exist -- a
 * Rhodes SoundFont, an SFZ cello, a Surge XT patch -- each badged COMMERCIAL
 * APPROVED against admission records that were never written, over a footer
 * reading "All assets audited by E16 Dataset Admission Engine". Auditioning
 * the Rhodes started a Tone.PolySynth and played a triad. The button that
 * opened it promised "25,000+ Open-Source Instruments".
 *
 * The sourcing decision is a funnel now: a curated catalogue is the only way
 * in, and libraries compete for a small number of factory slots. This drives
 * the real panel and checks that it reports the funnel's real state -- an
 * empty factory, candidates blocked on rights nobody has read, and the ruled
 * out named with their reasons.
 */
const playwright = require('playwright');
const { launch, enterStudio } = require('./lib.cjs');

let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(52)} ${detail}`);
}

(async () => {
  const { browser, page } = await launch(playwright, null);
  await enterStudio(page);

  console.log('=== WHERE THE SOUNDS COME FROM ===\n');

  await page.locator('#btn-sound-sourcing').first().click();
  await page.waitForTimeout(900);
  const panel = page.locator('#sound-sourcing-panel');
  check('the panel opens', (await panel.count()) === 1, 'sound sourcing');
  if (!(await panel.count())) { console.log('\nFAILED'); await browser.close(); process.exit(1); }

  const text = async () => (await panel.innerText()).replace(/\s+/g, ' ');
  const stack = await text();

  console.log('\n-- the runtime, read from the engine --');
  const runtime = (await page.locator('#sourcing-runtime-state').innerText()).trim();
  check(
    'it reports whether a bank is loaded, rather than assuming one',
    /no sound bank loaded/.test(runtime) || /preset\(s\)/.test(runtime),
    runtime
  );

  console.log('\n-- the stack --');
  for (const [name, phrase] of [
    ['SpessaSynth', 'SpessaSynth'],
    ['sfizz', 'sfizz'],
    ['FaustWasm', 'FaustWasm'],
    ['ACE-Step', 'ACE-Step XL Base'],
    ['the native synths', 'SoulSonus native synths'],
    ['the mastering chain', 'existing mastering chain'],
  ]) {
    check(`the stack names ${name}`, stack.includes(phrase), phrase);
  }
  check(
    'nothing on this screen claims a bundled instrument count',
    !/\d{3,}\+? (open-source )?instruments/i.test(stack),
    'no "25,000+"'
  );

  console.log('\n-- the factory --');
  await page.getByRole('button', { name: 'Factory slots', exact: true }).click();
  await page.waitForTimeout(400);
  const factory = await text();
  check(
    'every family reports slots, and they are empty',
    /drum kit/i.test(factory) && /0\/2 slots/.test(factory) && /0\/3 slots/.test(factory),
    (factory.match(/\d\/\d slots/g) || []).join(' ')
  );
  check(
    'and it says so plainly rather than showing nothing',
    /no instrument admitted/.test(factory) && /catalogue holds no instruments yet/.test(factory),
    'empty state stated'
  );

  console.log('\n-- the candidates --');
  await page.getByRole('button', { name: 'Candidates', exact: true }).click();
  await page.waitForTimeout(400);
  const cands = await text();
  for (const lib of ['Versilian', 'Karoryfer', 'Virtuosity Drums', 'MuseScore General']) {
    check(`${lib} is listed as a candidate`, cands.includes(lib), lib);
  }
  check(
    'each is blocked on a licence nobody has read',
    (cands.match(/Nobody has read/g) || []).length >= 3,
    `${(cands.match(/Nobody has read/g) || []).length} candidates waiting on a rights check`
  );
  // The footer counts how many sources have been rights-checked, so the badge
  // itself is what has to be absent -- not the phrase anywhere on screen.
  const badges = await panel.locator('span', { hasText: /^rights checked$/ }).count();
  check(
    'no candidate is badged as cleared',
    badges === 0,
    `${badges} "rights checked" badge(s) among the candidates`
  );

  console.log('\n-- the ruled out --');
  await page.getByRole('button', { name: 'Ruled out', exact: true }).click();
  await page.waitForTimeout(400);
  const out = await text();
  for (const lib of ['Pianobook', 'Philharmonia', 'Freesound', 'OpenAIR', 'Pedalboard', 'Rubber Band', 'Surge XT', 'Dexed']) {
    check(`${lib} is ruled out, with a reason`, out.includes(lib), lib);
  }

  console.log('\n-- the search reaches the whole decision --');
  await page.locator('#sourcing-search').fill('per-asset');
  await page.waitForTimeout(400);
  const found = await text();
  check(
    'searching a reason finds the sources it belongs to',
    /OpenAIR/.test(found),
    'the reason text is searchable, not just the name'
  );

  console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})();
