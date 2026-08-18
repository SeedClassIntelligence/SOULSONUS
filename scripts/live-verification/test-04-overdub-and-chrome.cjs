/**
 * Item 3 (vocal overdub) + item 4 (page title, SEEDSIGNATURE footer state).
 */
const playwright = require('playwright');
const { launch, enterStudio, session } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

const PROJ = `s => ({
  vocal: { isRecording: s.vocalState.isRecording, hasBlob: !!s.vocalState.audioBlob,
           blobSize: s.vocalState.audioBlob ? s.vocalState.audioBlob.size : 0,
           hasBuffer: !!s.vocalState.audioBuffer,
           bufferDuration: s.vocalState.audioBuffer ? s.vocalState.audioBuffer.duration : 0,
           waveformPoints: (s.vocalState.waveformData||[]).length,
           waveformNonZero: (s.vocalState.waveformData||[]).filter(v => v > 0.02).length,
           duration: s.vocalState.duration },
  takes: (s.vocalTakes || []).length,
  seedRecords: (s.seedRecords || []).length,
})`;

(async () => {
  const { browser, page } = await launch(playwright, `${SP}/hum_A4.wav`);
  console.log('\n=== ITEM 4a: PAGE TITLE ===');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  console.log('document.title =', JSON.stringify(await page.title()));

  await page.getByRole('button', { name: 'ENTER THE STUDIO' }).first().click();
  await page.waitForTimeout(2500);

  console.log('\n=== ITEM 4b: SEEDSIGNATURE FOOTER ===');
  const footerBefore = await page.locator('footer').innerText();
  console.log('footer (before signing):', footerBefore.replace(/\s+/g, ' ').trim());
  console.log('seedRecords in session:', (await session(page, PROJ)).seedRecords);

  // Sign in the Master/Release room and see whether the footer follows.
  for (const room of ['5. MASTER', '6. RELEASE']) {
    await page.getByRole('button', { name: room }).first().click();
    await page.waitForTimeout(1800);
    for (const tab of ['GATE CHECK']) {
      const t = page.getByRole('button', { name: tab, exact: true }).first();
      if (await t.count()) { await t.click({ force: true }).catch(()=>{}); await page.waitForTimeout(600); }
    }
    const signBtn = page.getByRole('button', { name: /LOCK & SIGN/i }).first();
    console.log(room, '- LOCK & SIGN button found:', await signBtn.count() > 0);
    if (await signBtn.count()) { await signBtn.click({ force: true }); await page.waitForTimeout(3500); break; }
  }
  const after = await session(page, PROJ);
  console.log('seedRecords after signing:', after.seedRecords);
  const footerAfter = await page.locator('footer').innerText();
  console.log('footer (after signing):', footerAfter.replace(/\s+/g, ' ').trim());
  await page.screenshot({ path: `${SP}/05_release.png` });

  console.log('\n=== ITEM 3d: VOCAL OVERDUB ===');
  await page.getByRole('button', { name: '3. WRITE & RECORD' }).first().click();
  await page.waitForTimeout(1800);
  const labels = await page.$$eval('button', els => els.map(e => e.innerText.replace(/\s+/g,' ').trim()).filter(t => /RECORD|OVERDUB|VOCAL|TAKE/i.test(t)));
  console.log('record-ish buttons:', JSON.stringify(labels));
  console.log('empty-state text present:', (await page.content()).includes('No vocal recording yet'));

  const rec = page.locator('#btn-record-vocal').first();
  if (await rec.count()) {
    console.log('#btn-record-vocal count:', await page.locator('#btn-record-vocal').count());
    console.log('clicking:', (await rec.innerText()).replace(/\s+/g,' ').trim());
    await rec.evaluate(e => e.click());
    await page.waitForTimeout(1000);
    console.log('state while recording:', JSON.stringify((await session(page, PROJ)).vocal));
    await page.waitForTimeout(5000);
    await page.locator('button:has-text("STOP"), #btn-stop-vocal').first().evaluate(e => e.click()).catch(async () => { await rec.evaluate(e => e.click()); });
    await page.waitForTimeout(4000);
    console.log('state after stopping :', JSON.stringify((await session(page, PROJ)).vocal));
    console.log('empty-state text still present:', (await page.content()).includes('No vocal recording yet'));
    // Is there a real, decodable take you can play back?
    const audioEls = await page.$$eval('audio', els => els.map(e => ({ src: (e.src||'').slice(0,40), dur: e.duration })));
    console.log('<audio> elements:', JSON.stringify(audioEls));
    await page.screenshot({ path: `${SP}/06_overdub.png` });
  } else {
    console.log('no overdub record button found');
  }
  await browser.close();
})();
