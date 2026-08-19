/**
 * The four vocal-suite AUDITION controls: do they play anything now?
 *
 * Each one used to be setState(true) -> setTimeout -> setState(false). This
 * drives the real UI and counts not only the audio nodes constructed but the
 * source nodes actually STARTED — a graph that is built and never triggered is
 * still silence, and node count alone would not catch that.
 *
 * It also checks the two honesty cases: the comp controls must refuse when no
 * take has audio behind it, and the character chips must move real numbers.
 */
const playwright = require('playwright');
const { launch, enterStudio, session } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

const INSTRUMENT = `
  window.__audio = { nodes: [], params: 0, started: 0 };
  const P = window.AudioContext && window.AudioContext.prototype;
  if (P && !P.__probed) {
    P.__probed = true;
    ['createBiquadFilter','createDynamicsCompressor','createGain','createWaveShaper','createStereoPanner',
     'createConvolver','createOscillator','createBufferSource','createDelay','createAnalyser']
      .forEach(m => { const o = P[m]; if (o) P[m] = function(){ window.__audio.nodes.push(m); return o.apply(this, arguments); }; });
    const AP = window.AudioParam.prototype;
    ['setValueAtTime','linearRampToValueAtTime','exponentialRampToValueAtTime','setTargetAtTime']
      .forEach(m => { const o = AP[m]; if (o) AP[m] = function(){ window.__audio.params++; return o.apply(this, arguments); }; });
    // A source that is never started makes no sound, however many nodes exist.
    [window.AudioBufferSourceNode, window.OscillatorNode].forEach(C => {
      if (!C) return;
      const o = C.prototype.start;
      C.prototype.start = function(){ window.__audio.started++; return o.apply(this, arguments); };
    });
  }
`;

const reset = (page) => page.evaluate('window.__audio.nodes.length = 0; window.__audio.params = 0; window.__audio.started = 0;');
const probe = (page) => page.evaluate('({ n: window.__audio.nodes.length, p: window.__audio.params, s: window.__audio.started })');

let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(46)} ${detail}`);
}

let suitePanel = null;

// The drawer trigger toggles, so it is opened once and the tabs are switched
// inside it — clicking the trigger again would close what the last check opened.
async function openSuite(page, tab) {
  if (!suitePanel) {
    await page.getByRole('button', { name: '🎙️ SONGWRITING SUITE', exact: false }).first().click({ force: true });
    await page.waitForTimeout(1500);
    suitePanel = page.locator('div.fixed.right-0:has-text("SONGWRITING SUITE")').first();
  }
  const t = suitePanel.getByRole('button', { name: tab, exact: true }).first();
  if (await t.count()) {
    await t.click({ force: true });
    await page.waitForTimeout(1000);
  }
  return suitePanel;
}

(async () => {
  // A real fake-mic file, so the overdub below produces a take with audio behind
  // it and the positive comp case can be tested rather than only the refusal.
  const { browser, page } = await launch(playwright, `${SP}/hum_A4.wav`);
  await enterStudio(page);
  await page.evaluate(INSTRUMENT);

  console.log('=== VOCAL SUITE AUDITIONS ===\n');

  // ---- 1. Cadence ----
  console.log('-- AUDITION CADENCE (Lyrics & Cadence) --');
  let panel = await openSuite(page, '1. LYRICS & CADENCE');
  const cadenceBtn = panel.locator('[data-testid="audition-cadence"]').first();
  const cadenceFound = await cadenceBtn.count();
  check('cadence audition control present', cadenceFound > 0, cadenceFound ? '' : 'not rendered');
  if (cadenceFound) {
    const disabled = await cadenceBtn.isDisabled();
    const title = await cadenceBtn.getAttribute('title');
    await reset(page);
    await cadenceBtn.click({ force: true });
    await page.waitForTimeout(2600);
    const a = await probe(page);
    check('cadence audition plays', !disabled && a.s > 0, `nodes=${a.n} params=${a.p} sourcesStarted=${a.s}`);
    console.log(`        title: ${title}`);
  }

  // ---- 2. Harmony ----
  console.log('\n-- AUDITION (Harmony & Doubles) --');
  panel = await openSuite(page, '6. HARMONY & DOUBLES');
  for (const interval of ['third_above', 'double']) {
    const btn = panel.locator(`[data-testid="audition-harmony-${interval}"]`).first();
    if (!(await btn.count())) { check(`harmony ${interval} control present`, false, 'not rendered'); continue; }
    await reset(page);
    await btn.click({ force: true });
    await page.waitForTimeout(2600);
    const a = await probe(page);
    check(`harmony ${interval} plays`, a.s > 0, `nodes=${a.n} params=${a.p} sourcesStarted=${a.s}`);
  }
  // The card label must agree with the key the panel is in, not a fixed string.
  const scale = await session(page, `s => {
    const t = s.tracks.find(x => x.id === 't-vocal') || s.tracks[0];
    return (t && t.vocalState && t.vocalState.pitchSettings && t.vocalState.pitchSettings.scale) || 'MINOR';
  }`);
  const cardText = (await panel.innerText()).replace(/\s+/g, ' ');
  const expected = /min/i.test(String(scale)) ? '3rd Above (+3st)' : '3rd Above (+4st)';
  check('interval label derived from scale', cardText.includes(expected), `scale=${scale} expected "${expected}"`);

  // ---- 3. Voice character ----
  console.log('\n-- AUDITION (Voice Identity & Character) --');
  panel = await openSuite(page, '7. VOICE IDENTITY');
  // Read every track, not just the assumed one: the panel is handed whichever
  // track the suite has focus on, and guessing wrong would read an untouched
  // record and report a working control as inert.
  const readChar = () => session(page, `s => JSON.stringify(s.tracks
    .map(t => t.vocalState && t.vocalState.voiceIdentitySettings && t.vocalState.voiceIdentitySettings.characterSettings)
    .filter(Boolean))`);
  const beforeChar = await readChar();
  const raspy = panel.getByRole('button', { name: 'RASPY', exact: false }).first();
  if (await raspy.count()) {
    await raspy.click({ force: true });
    await page.waitForTimeout(700);
  }
  const afterRaspy = await readChar();
  const smooth = panel.getByRole('button', { name: 'SMOOTH', exact: false }).first();
  if (await smooth.count()) {
    await smooth.click({ force: true });
    await page.waitForTimeout(700);
  }
  const afterSmooth = await readChar();
  check('character chip changes real settings', afterRaspy !== afterSmooth && afterRaspy !== null,
        `raspy=${afterRaspy} smooth=${afterSmooth}`);
  console.log(`        before: ${beforeChar}`);

  const charBtn = panel.locator('[data-testid="audition-voice-character"]').first();
  if (await charBtn.count()) {
    const title = await charBtn.getAttribute('title');
    await reset(page);
    await charBtn.click({ force: true });
    await page.waitForTimeout(3000);
    const a = await probe(page);
    check('character audition plays', a.s > 0, `nodes=${a.n} params=${a.p} sourcesStarted=${a.s}`);
    console.log(`        title: ${title}`);
  } else {
    check('character audition control present', false, 'not rendered');
  }

  // ---- 4. Comp builder: must refuse rather than mime ----
  console.log('\n-- COMP BUILDER (no take audio behind the preset takes) --');
  panel = await openSuite(page, '3. COMP BUILDER');
  const compBtn = panel.locator('[data-testid="audition-master-comp"]').first();
  if (await compBtn.count()) {
    const disabled = await compBtn.isDisabled();
    const label = (await compBtn.innerText()).replace(/\s+/g, ' ').trim();
    const title = await compBtn.getAttribute('title');
    await reset(page);
    await compBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(1500);
    const a = await probe(page);
    check('comp audition refuses without take audio', disabled && a.s === 0,
          `disabled=${disabled} label="${label}" sourcesStarted=${a.s}`);
    console.log(`        title: ${title}`);
  } else {
    check('comp audition control present', false, 'not rendered');
  }


  // ---- 5. Record a take, then the same comp control must play it ----
  console.log('\n-- COMP BUILDER (after recording a take that has audio) --');
  panel = await openSuite(page, '4. PUNCH & OVERDUB');
  const rec = panel.getByRole('button', { name: /RECORD (OVERDUB|PUNCH-IN) TAKE/i }).first();
  if (await rec.count()) {
    await rec.click({ force: true });
    await page.waitForTimeout(2500);
    const stop = panel.getByRole('button', { name: /STOP & COMMIT TAKE/i }).first();
    if (await stop.count()) await stop.click({ force: true });
    await page.waitForTimeout(1500);
  }

  const recorded = await session(page, `s => JSON.stringify(s.tracks.flatMap(t =>
    (t.vocalTakes || [])
      .filter(v => /^(blob:|data:audio)/.test(String(v.sourceAudioId || '')))
      .map(v => ({ track: t.id, id: v.id, name: v.name }))))`);
  const takesWithAudio = JSON.parse(recorded || '[]');
  check('overdub produced a take with real audio', takesWithAudio.length > 0, `takes=${recorded}`);

  if (takesWithAudio.length) {
    const newest = takesWithAudio[takesWithAudio.length - 1];
    panel = await openSuite(page, '3. COMP BUILDER');
    const takeBlock = panel.locator(`[data-testid="comp-take-1-${newest.id}"]`).first();
    check('recorded take appears in the comp matrix', (await takeBlock.count()) > 0, `take ${newest.name}`);
    if (await takeBlock.count()) {
      await takeBlock.click({ force: true });
      await page.waitForTimeout(900);
      const phraseBtn = panel.locator('[data-testid="audition-phrase-1"]').first();
      const stillDisabled = await phraseBtn.isDisabled();
      await reset(page);
      await phraseBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(2500);
      const a = await probe(page);
      check('phrase audition plays the assigned take', !stillDisabled && a.s > 0,
            `disabled=${stillDisabled} nodes=${a.n} sourcesStarted=${a.s}`);
    }

    // And the character audition should now reach for the take, not a test tone.
    panel = await openSuite(page, '7. VOICE IDENTITY');
    const charBtn2 = panel.locator('[data-testid="audition-voice-character"]').first();
    if (await charBtn2.count()) {
      const label = (await charBtn2.innerText()).replace(/\s+/g, ' ').trim();
      await reset(page);
      await charBtn2.click({ force: true });
      await page.waitForTimeout(3000);
      const a = await probe(page);
      const playing = (await charBtn2.innerText()).replace(/\s+/g, ' ').trim();
      check('character audition uses the recorded take', label === 'AUDITION TAKE' && a.s > 0,
            `label="${label}" whilePlaying="${playing}" sourcesStarted=${a.s}`);
    }
  }

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})();
