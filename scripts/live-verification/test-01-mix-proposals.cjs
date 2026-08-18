/**
 * Item 1: Acoustic Masking & Balance Telemetry (Mix room).
 * Asks: are the "% Match" scores and dB/Hz recommendations measured from the
 * actual track audio, and do AUDITION / COMMIT do anything to the signal path?
 */
const playwright = require('playwright');
const { launch, enterStudio, session } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

const PROJ = `s => ({
  trackIds: s.tracks.map(t => t.id),
  noteCounts: Object.fromEntries(s.tracks.map(t => [t.id, (t.noteEvents||[]).length + '/' + (t.steps||[]).filter(Boolean).length])),
  dsp: Object.fromEntries(s.tracks.map(t => [t.id, t.dspSettings || null])),
})`;

async function run(preset, audio) {
  const { browser, page } = await launch(playwright, audio);
  await enterStudio(page);

  // Optionally switch the loaded project so the underlying audio differs.
  if (preset === 'BLANK') {
    page.once('dialog', d => d.accept());
    await page.getByRole('button', { name: '✦ BLANK CANVAS' }).first().click();
    await page.waitForTimeout(1500);
  }

  await page.getByRole('button', { name: '4. MIX' }).first().click();
  await page.waitForTimeout(1800);

  const advisor = page.getByRole('button', { name: 'AI ADVISOR' }).first();
  if (await advisor.count()) { await advisor.click(); await page.waitForTimeout(600); }

  const cards = await page.$$eval('h5', els =>
    els.map(e => e.innerText.replace(/\s+/g, ' ').trim())
       .filter(t => /Ducking|Air Shelf/.test(t)));
  const matches = await page.$$eval('span', els =>
    els.map(e => e.innerText.trim()).filter(t => /^\d+% Match$/.test(t)));

  const before = await session(page, PROJ);

  // AUDITION: does anything audible change? Track whether any Tone/WebAudio
  // node is created or reconnected while auditioning.
  await page.evaluate(`window.__auditionNodes = 0;
    const P = window.AudioContext && window.AudioContext.prototype;
    if (P && !P.__patched) {
      P.__patched = true;
      ['createBiquadFilter','createDynamicsCompressor','createGain','createWaveShaper']
        .forEach(m => { const o = P[m]; P[m] = function(){ window.__auditionNodes++; return o.apply(this, arguments); }; });
    }`);
  const auditionBtn = page.getByRole('button', { name: 'AUDITION', exact: true }).first();
  const hadAudition = await auditionBtn.count() > 0;
  if (hadAudition) { await auditionBtn.click(); await page.waitForTimeout(1500); }
  const auditionNodes = await page.evaluate('window.__auditionNodes');

  // COMMIT proposal 1 (the 808/kick ducking one) and diff session state.
  const commitBtns = await page.getByRole('button', { name: 'COMMIT' }).all();
  if (commitBtns.length) { await commitBtns[0].click(); await page.waitForTimeout(800); }
  const afterFirst = await session(page, PROJ);
  if (commitBtns.length > 1) { await commitBtns[1].click(); await page.waitForTimeout(800); }
  const afterSecond = await session(page, PROJ);

  await browser.close();
  return { cards, matches, before, afterFirst, afterSecond, auditionNodes, hadAudition };
}

(async () => {
  const A = await run(null, `${SP}/beatbox_A.wav`);
  const B = await run('BLANK', `${SP}/beatbox_B.wav`);

  console.log('\n=== ITEM 1: MIX-ROOM MASKING PROPOSALS ===');
  console.log('Session A proposals :', JSON.stringify(A.cards));
  console.log('Session A match %   :', JSON.stringify(A.matches));
  console.log('Session B proposals :', JSON.stringify(B.cards));
  console.log('Session B match %   :', JSON.stringify(B.matches));
  console.log('Identical across two different sessions/audio? ',
    JSON.stringify(A.cards) === JSON.stringify(B.cards) && JSON.stringify(A.matches) === JSON.stringify(B.matches));

  console.log('\n-- AUDITION --');
  console.log('AUDITION button present:', A.hadAudition);
  console.log('WebAudio nodes created while auditioning:', A.auditionNodes);

  console.log('\n-- COMMIT --');
  console.log('Track ids in session   :', JSON.stringify(A.before.trackIds));
  console.log('dspSettings before     :', JSON.stringify(A.before.dsp));
  console.log('after COMMIT proposal 1:', JSON.stringify(A.afterFirst.dsp));
  console.log('after COMMIT proposal 2:', JSON.stringify(A.afterSecond.dsp));
  console.log('Proposal 1 changed anything?', JSON.stringify(A.before.dsp) !== JSON.stringify(A.afterFirst.dsp));
  console.log('Proposal 2 changed anything?', JSON.stringify(A.afterFirst.dsp) !== JSON.stringify(A.afterSecond.dsp));
})();
