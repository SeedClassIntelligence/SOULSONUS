/** Does starting the transport give recorded notes real, distinct startTicks? */
const playwright = require('playwright');
const { launch, enterStudio, session } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

const PROJ = `s => ({
  isPlaying: s.dawState.isPlaying, currentStep: s.dawState.currentStep,
  rec: s.tracks.filter(t => (t.noteEvents||[]).some(n => String(n.id).startsWith('rec_')))
    .map(t => ({ id: t.id, ticks: [...new Set((t.noteEvents||[]).filter(n => String(n.id).startsWith('rec_')).map(n => n.startTick))],
                 vels: [...new Set((t.noteEvents||[]).filter(n => String(n.id).startsWith('rec_')).map(n => n.velocity))] })),
})`;

(async () => {
  const { browser, page } = await launch(playwright, `${SP}/beatbox_A.wav`);
  await enterStudio(page);
  await page.getByRole('button', { name: '🎤 BEATBOX (MOUTH)' }).first().click();
  await page.waitForTimeout(1200);

  // Find and press the real transport play control.
  const playBtn = page.locator('button[title="Play (Space)"]').first();
  if (await playBtn.count()) {
    console.log('clicking play:', await playBtn.getAttribute('title'));
    await playBtn.click();
  }
  await page.waitForTimeout(1500);
  const mid = await session(page, PROJ);
  console.log('after play -> isPlaying:', mid.isPlaying, 'currentStep:', mid.currentStep);
  await page.waitForTimeout(7000);
  const after = await session(page, PROJ);
  console.log('isPlaying:', after.isPlaying, 'currentStep:', after.currentStep);
  console.log('recorded per track:');
  after.rec.forEach(r => console.log(`  ${r.id}: distinct startTicks=${JSON.stringify(r.ticks.slice(0,20))} velocities=${JSON.stringify(r.vels)}`));
  await browser.close();
})();
