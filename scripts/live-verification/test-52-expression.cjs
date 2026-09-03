/**
 * Step 6: emotion as measured dimensions, driven in the browser.
 *
 * SRT-1 V asks for a multidimensional reading derived from measured expression
 * and used as compositional control variables -- explicitly not "detect
 * emotion -> select a mode". Four things have to be true and they are separate
 * claims:
 *
 *   1. Nothing performed reads as nothing. Not a neutral seven.
 *   2. A real take produces dimensions with the measurement behind each one,
 *      and names the ones the material could not support.
 *   3. The creator's own reading replaces the studio's on that dimension.
 *   4. The intelligence explains a change in those terms, and what it cannot
 *      apply it says it cannot apply.
 */
const playwright = require('playwright');
const { launch, enterStudio, session } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

let failures = 0;
function check(label, ok, detail = '') {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(58)} ${detail}`);
}

const STATE = `s => JSON.stringify({
  expression: s.expressionState,
  said: s.creatorExpressionReadings || {},
  notes: s.tracks.reduce((n, t) => n + (t.noteEvents || []).length, 0),
})`;

async function ask(page, text) {
  await page.fill('#intelligence-input', text);
  await page.click('#intelligence-ask');
  await page.waitForTimeout(1500);
  const bubbles = await page.$$eval('#intelligence-log, .intelligence-message, body', () => null).catch(() => null);
  return page.evaluate(() => document.body.innerText);
}

(async () => {
  const { browser, page } = await launch(playwright, `${SP}/hum_melody.wav`);
  await enterStudio(page);
  const st = async () => JSON.parse(await session(page, STATE));

  console.log('=== STEP 6: EMOTION AS MEASURED DIMENSIONS ===\n');

  // ---- before anything is performed ----
  console.log('-- before a pass --');
  await page.locator('#btn-blank-canvas').first().click();
  await page.waitForTimeout(1200);
  const fresh = await st();
  check('nothing performed reads as no state at all', fresh.expression === null,
    JSON.stringify(fresh.expression));

  await page.getByRole('button', { name: '✦ STUDIO INTELLIGENCE' }).first().click();
  await page.waitForTimeout(800);
  const beforeAnswer = await ask(page, 'what did you hear in the feel of this?');
  check('and the intelligence says so rather than reading a creator nobody took',
    /Nothing yet/.test(beforeAnswer) && !/valence|arousal/.test(beforeAnswer.split('Nothing yet')[1] || ''),
    (beforeAnswer.match(/Nothing yet[^\n]*/) || [''])[0].slice(0, 90));
  await page.getByRole('button', { name: '✦ STUDIO INTELLIGENCE' }).first().click();
  await page.waitForTimeout(500);

  // ---- a hummed take: pitch and spectrum both present ----
  console.log('\n-- a hummed take --');
  await page.getByRole('button', { name: 'Hum / Voice' }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: '● RECORD LOOP' }).first().click();
  await page.waitForTimeout(9000);
  await page.getByRole('button', { name: /STOP RECORDING/ }).first().click();
  await page.waitForTimeout(2500);
  const after = await st();
  const ex = after.expression;
  check('the pass produced a reading', !!ex, ex ? `${ex.measuredFrom.onsets} onsets` : 'none');
  if (!ex) { await browser.close(); process.exit(1); }

  const DIMS = ['valence', 'arousal', 'tension', 'confidence', 'intimacy', 'darkness', 'movement'];
  const read = DIMS.filter((d) => ex[d]);
  check('several dimensions are read, not one label', read.length >= 3, read.join(', '));
  check('every dimension read carries the measurement behind it',
    read.every((d) => typeof ex[d].from === 'string' && ex[d].from.length > 8),
    read.map((d) => `${d}: ${ex[d].from}`).join(' | ').slice(0, 150));
  check('every value sits on the axis, never outside it',
    read.every((d) => ex[d].value >= -1 && ex[d].value <= 1),
    read.map((d) => `${d}=${ex[d].value}`).join(' '));
  const unread = DIMS.filter((d) => !ex[d]);
  check('and any dimension the take could not support is named with its reason',
    unread.every((d) => ex.notMeasured.some((n) => n.startsWith(d))),
    unread.length ? ex.notMeasured.join(' | ').slice(0, 140) : 'all seven were readable');
  check('the reading says what it was taken from',
    ex.measuredFrom.onsets > 0 && ex.measuredFrom.spanSeconds > 0,
    JSON.stringify(ex.measuredFrom));

  // ---- the panel ----
  console.log('\n-- on screen --');
  await page.locator('[data-testid="creative-intent-toggle"]').first().click();
  await page.waitForTimeout(400);
  const rows = await page.locator('[data-testid^="expression-"]:not([data-testid="expression-dimensions"])').count();
  check('all seven dimensions are on the panel', rows === 7, `${rows} rows`);
  const panelText = await page.locator('[data-testid="expression-dimensions"]').innerText();
  check('a dimension that was measured shows what it was measured from',
    read.some((d) => panelText.includes(ex[d].from.slice(0, 20))), panelText.split('\n')[1] || '');
  check('and one that was not says why, instead of showing a zero',
    unread.length === 0 || unread.every((d) => new RegExp(d, 'i').test(panelText)),
    unread.join(', ') || 'none unread');

  // ---- the creator's own reading ----
  console.log('\n-- what the creator says --');
  const subject = read.includes('darkness') ? 'darkness' : read[0];
  const measuredValue = ex[subject].value;
  await page.locator(`[data-testid="say-${subject}-low"]`).first().click();
  await page.waitForTimeout(500);
  const said = await st();
  check('their reading replaces the measurement on that dimension',
    said.expression[subject].value === -0.8 && said.expression[subject].fromCreator === true,
    `${measuredValue} -> ${said.expression[subject].value}`);
  check('and is attributed to them, not presented as a measurement',
    /you said/.test(said.expression[subject].from), said.expression[subject].from);
  const others = read.filter((d) => d !== subject);
  check('nothing else moves', others.every((d) => said.expression[d].value === ex[d].value),
    `${others.length} other dimensions unchanged`);
  await page.locator(`[data-testid="clear-${subject}"]`).first().click();
  await page.waitForTimeout(500);
  const handedBack = await st();
  check('and it can be handed back to what was measured',
    handedBack.expression[subject].value === measuredValue && !handedBack.expression[subject].fromCreator,
    `${handedBack.expression[subject].value}`);

  // ---- a change explained in those terms ----
  console.log('\n-- a change explained in those terms --');
  await page.getByRole('button', { name: '✦ STUDIO INTELLIGENCE' }).first().click();
  await page.waitForTimeout(800);
  const answer = await ask(page, 'what does this take feel like?');
  check('the answer names the dimensions it read', read.some((d) => answer.includes(ex[d].reads)),
    read.map((d) => ex[d].reads).join(', ').slice(0, 80));
  check('and states the measurement behind them, not just the verdict',
    read.some((d) => answer.includes(ex[d].from.slice(0, 18))), 'measurement quoted');
  check('it explains what the reading argues for', /argues for/.test(answer));
  check('and refuses to move the tempo on the strength of a feeling',
    /tempo is untouched/.test(answer),
    (answer.match(/tempo is untouched[^\n]*/) || [''])[0]);
  check('what it cannot apply, it says it cannot apply',
    !/harmonic tension/.test(answer) || /cannot make the change for you/.test(answer));

  await page.screenshot({ path: `${SP}/52_expression.png` });
  await browser.close();
  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}\n`);
  process.exit(failures === 0 ? 0 : 1);
})();
