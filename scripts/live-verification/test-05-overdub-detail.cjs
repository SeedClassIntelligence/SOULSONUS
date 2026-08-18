/** Focused: does [RECORD VOCAL OVERDUB] produce a real, playable take? */
const playwright = require('playwright');
const { launch, enterStudio, session } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

const PROJ = `s => ({ isRecording: s.vocalState.isRecording, blobSize: s.vocalState.audioBlob ? s.vocalState.audioBlob.size : 0,
  dur: s.vocalState.audioBuffer ? s.vocalState.audioBuffer.duration : 0,
  wf: (s.vocalState.waveformData||[]).length,
  wfPeak: Math.max(0, ...(s.vocalState.waveformData||[0])) })`;

(async () => {
  const { browser, page } = await launch(playwright, `${SP}/hum_A4.wav`);
  await enterStudio(page);
  await page.getByRole('button', { name: '3. WRITE & RECORD' }).first().click();
  await page.waitForTimeout(1800);
  await page.locator('#btn-record-vocal').first().evaluate(e => e.click());
  for (let i = 1; i <= 40; i++) {
    await page.waitForTimeout(250);
    const st = await session(page, PROJ);
    const btn = await page.locator('#btn-record-vocal, #btn-stop-vocal').first().innerText().catch(() => 'n/a');
    console.log(`t+${i*0.25}s`, JSON.stringify(st), 'button:', btn.replace(/\s+/g,' ').trim());
    if (st.blobSize > 0) break;
  }
  await page.screenshot({ path: `${SP}/06_overdub.png` });
  await browser.close();
})();
