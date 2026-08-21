/**
 * Can a creator sit down and record a beatbox?
 *
 * Both faults here came from someone actually trying it rather than from
 * reading the code, and both are the kind that make a working studio look
 * broken.
 *
 * The record button read "● REC" whether the microphone was live or not, and
 * it is the same control the capture row's BEATBOX button uses. So the obvious
 * order — pick BEATBOX, then press record — armed the mic and then switched it
 * off, with the button looking identical either way. Measured: BEATBOX, REC,
 * six seconds of performing, zero onsets.
 *
 * And the metronome was a button. Its tooltip promised an "Audible Metronome
 * Click Guide (on quarter beats 1, 2, 3, 4)"; its state lived in the header's
 * own `useState`, defaulting to on, and nothing anywhere read it or made a
 * sound.
 */
const playwright = require('playwright');
const { launch, enterStudio, session } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(52)} ${detail}`);
}

const STATE = `s => JSON.stringify({
  micOn: s.detectionSettings.enabled,
  metro: s.dawState.metronomeOn,
  captured: s.tracks.reduce((n,t) => n + (t.noteEvents||[]).filter(e => e.provenance && ['MOUTH','BODY'].includes(e.provenance.origin)).length, 0),
  notes: s.tracks.reduce((n,t) => n + (t.noteEvents||[]).length, 0),
})`;

(async () => {
  const { browser, page } = await launch(playwright, `${SP}/beatbox_ksh.wav`);
  await enterStudio(page);
  const st = async () => JSON.parse(await session(page, STATE));
  const recLabel = async () => (await page.locator('#btn-mic-arm').first().innerText()).trim();

  console.log('=== SITTING DOWN AND RECORDING ===\n');

  // ---- the empty start a creator needs ----
  console.log('-- starting from nothing --');
  const arrival = await st();
  check('the studio arrives with demo material', arrival.notes > 0, `${arrival.notes} notes on arrival`);
  await page.locator('#btn-blank-canvas').first().click();
  await page.waitForTimeout(1500);
  const blank = await st();
  check(
    'BLANK CANVAS clears it and leaves channels to record into',
    blank.notes === 0,
    `${blank.notes} notes, channels kept`
  );

  // ---- the record button says what it will do ----
  console.log('\n-- the record button --');
  check('it offers to record when the mic is off', (await recLabel()).includes('REC'), await recLabel());

  await page.locator('[data-testid="capture-mouth"]').first().click();
  await page.waitForTimeout(1200);
  const armed = await st();
  check('BEATBOX opens the microphone', armed.micOn === true, `micOn=${armed.micOn}`);
  check(
    'and the record button now offers to stop, not to start',
    (await recLabel()).includes('STOP'),
    `reads ${JSON.stringify(await recLabel())} — pressing it used to silently switch the mic off`
  );

  // ---- performing actually captures ----
  console.log('\n-- performing --');
  await page.waitForTimeout(6000);
  const during = await st();
  check(
    'six seconds of beatbox lands in the session',
    during.captured > 8,
    `${during.captured} onsets captured`
  );

  await page.locator('#btn-mic-arm').first().click();
  await page.waitForTimeout(2500);
  const stopped = await st();
  check('pressing it stops the microphone', stopped.micOn === false, `micOn=${stopped.micOn}`);
  check('and offers to record again', (await recLabel()).includes('REC'), await recLabel());
  check('the take is still there afterwards', stopped.captured >= during.captured, `${stopped.captured} onsets kept`);

  // ---- and the studio shows what the microphone is doing ----
  //
  // The case that produced forty seconds of performing and an empty session
  // was a microphone that never opened while the studio said it was
  // recording. Both halves of that are checked: what it says when the mic is
  // live, and what it says when the mic refuses.
  console.log('\n-- what the capture row says --');
  const statusText = async () => (await page.locator('#capture-status').first().innerText()).replace(/\s+/g, ' ').trim();
  check(
    'with the mic closed it says nothing is recorded yet',
    /Nothing is recorded until it does/.test(await statusText()),
    await statusText()
  );

  await page.locator('[data-testid="capture-mouth"]').first().click();
  await page.waitForTimeout(1200);
  check('with the mic open it says it is listening', /LISTENING/.test(await statusText()), await statusText());

  const readings = [];
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(500);
    readings.push(await statusText());
  }
  check(
    'and the level meter moves while a performance is happening',
    new Set(readings).size >= 3,
    `${new Set(readings).size} distinct readings in 3s — ${readings[1]}`
  );
  await page.locator('#btn-mic-arm').first().click();
  await page.waitForTimeout(2000);

  // ---- the metronome makes a sound ----
  console.log('\n-- the metronome --');
  check('it is off until asked for', stopped.metro === false, `metronomeOn=${stopped.metro}`);

  // Every click is one oscillator start, and nothing else is playing.
  await page.evaluate(`(() => {
    window.__clicks = 0;
    const p = window.OscillatorNode && window.OscillatorNode.prototype;
    if (p && !p.__mp) { const s = p.start; p.start = function (...a) { window.__clicks++; return s.apply(this, a); }; p.__mp = true; }
  })()`);
  const quiet = await page.evaluate('window.__clicks');
  await page.waitForTimeout(2000);
  const stillQuiet = await page.evaluate('window.__clicks');
  check('and it is silent while it is off', stillQuiet === quiet, `${stillQuiet - quiet} sounds in 2s with the click off`);

  await page.locator('#btn-metronome').first().click();
  await page.waitForTimeout(4000);
  const clicking = await page.evaluate('window.__clicks');
  const on = await st();
  check('turning it on makes it audible', on.metro === true && clicking - stillQuiet >= 4,
        `${clicking - stillQuiet} clicks in 4s at ${'110'} BPM — about 7 expected`);

  await page.locator('#btn-metronome').first().click();
  await page.waitForTimeout(2200);
  const afterOff = await page.evaluate('window.__clicks');
  await page.waitForTimeout(1500);
  const laterOff = await page.evaluate('window.__clicks');
  check(
    'and turning it off stops it',
    laterOff === afterOff && (await st()).metro === false,
    `${laterOff - afterOff} sounds in the 1.5s after switching it off`
  );

  console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})();
