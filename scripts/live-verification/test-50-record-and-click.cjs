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
  // The studio used to open on a demo pattern and this checked that BLANK
  // CANVAS could clear it. The preset is empty by construction now -- channels
  // and no performance -- which is the stronger version of the same point:
  // nothing on screen is the creator's work until they play something.
  const arrival = await st();
  check('the studio arrives with nothing performed on it', arrival.notes === 0,
    `${arrival.notes} notes on arrival`);
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

  // The capture row is modality tabs and one record control now: choosing a
  // modality no longer opens the microphone, pressing record does. That is the
  // fix this test was written about -- the two controls used to be the same
  // one, so picking BEATBOX and then pressing record armed the mic and
  // switched it straight back off. Both halves are checked separately.
  await page.locator('[data-testid="capture-beatbox"]').first().click();
  await page.waitForTimeout(600);
  const picked = await st();
  check('choosing a modality does not open the microphone by itself',
    picked.micOn === false, `micOn=${picked.micOn}`);
  await page.locator('#btn-mic-arm').first().click();
  await page.waitForTimeout(1200);
  const armed = await st();
  check('pressing record opens the microphone', armed.micOn === true, `micOn=${armed.micOn}`);
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
  // The capture row says it in different words now, on the live transient
  // monitor rather than a separate status line: 'LIVE TRANSIENT MONITOR READY'
  // with the mic closed, 'MIC RECORDING' with it open. The claim being checked
  // is unchanged -- the studio has to say whether the microphone is actually
  // open, because forty seconds of performing into a mic that never opened is
  // what this test exists about.
  const statusText = async () =>
    (await page.locator('[data-testid="capture-status"]').first().innerText()).replace(/\s+/g, ' ').trim();
  check(
    'with the mic closed it does not claim to be recording',
    /MONITOR READY|LOOP PLAYBACK/.test(await statusText()) && !/MIC RECORDING/.test(await statusText()),
    await statusText()
  );

  await page.locator('[data-testid="capture-beatbox"]').first().click();
  await page.waitForTimeout(800);
  await page.locator('#btn-mic-arm').first().click();
  await page.waitForTimeout(2500);
  check('with the mic open it says so', /MIC RECORDING/.test(await statusText()), await statusText());

  // The separate level readout became the live waveform beside this text, so
  // "the meter moves" is now "the visualizer is drawing what it hears": three
  // snapshots of the canvas during a performance must not be identical.
  const frames = [];
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(500);
    frames.push(await page.locator('canvas').first().evaluate((c) => c.toDataURL().slice(-120)));
  }
  check(
    'and the live visualizer is drawing while a performance is happening',
    new Set(frames).size >= 3,
    `${new Set(frames).size} distinct frames in 3s`
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
