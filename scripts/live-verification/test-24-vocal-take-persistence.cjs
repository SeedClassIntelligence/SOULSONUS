/**
 * Does a recorded vocal take survive a reload?
 *
 * It is stored as the encoded Blob and decoded back to an AudioBuffer on load,
 * which is the most fragile part of persistence — an AudioBuffer itself cannot
 * be stored at all.
 */
const playwright = require('playwright');
const { launch, enterStudio, session } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

const SNAP = `s => ({
  hydrating: s.isHydrating,
  bytes: s.vocalState.audioBlob ? s.vocalState.audioBlob.size : 0,
  decoded: s.vocalState.audioBuffer ? Number(s.vocalState.audioBuffer.duration.toFixed(2)) : 0,
  peak: (s.vocalState.waveformData||[]).length ? Number(Math.max(...s.vocalState.waveformData).toFixed(3)) : 0,
  points: (s.vocalState.waveformData||[]).length,
  error: s.persistenceError,
})`;

const settle = async (page) => {
  for (let i = 0; i < 40; i++) {
    const st = await session(page, SNAP);
    if (!st.hydrating) return st;
    await page.waitForTimeout(250);
  }
  return session(page, SNAP);
};

(async () => {
  console.log('=== VOCAL TAKE PERSISTENCE ===\n');
  const { browser, page } = await launch(playwright, `${SP}/hum_melody.wav`);
  await enterStudio(page);
  await settle(page);

  await page.getByRole('button', { name: '3. WRITE & RECORD' }).first().click({ force: true });
  await page.waitForTimeout(1800);
  await page.locator('#btn-record-vocal').first().evaluate(e => e.click());

  let before = null;
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(500);
    const st = await session(page, SNAP);
    if (st.bytes > 0) { before = st; break; }
  }
  if (!before) { console.log('  no take was recorded — cannot test persistence'); await browser.close(); return; }
  console.log(`  recorded: ${before.bytes} bytes, ${before.decoded}s decoded, ${before.points} waveform points, peak ${before.peak}`);

  await page.waitForTimeout(2500);

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const enter = page.getByRole('button', { name: 'ENTER THE STUDIO' }).first();
  if (await enter.count()) { await enter.click(); await page.waitForTimeout(2000); }
  const after = await settle(page);

  console.log(`  restored: ${after.bytes} bytes, ${after.decoded}s decoded, ${after.points} waveform points, peak ${after.peak}`);
  console.log(`  error: ${after.error || 'none'}`);

  const chk = (l, a, b) => console.log(`  ${l.padEnd(30)} ${String(a).padEnd(12)} -> ${String(b).padEnd(12)} ${a === b ? 'PASS' : 'FAIL'}`);
  console.log('\n-- survived the reload? --');
  chk('blob bytes', before.bytes, after.bytes);
  chk('decoded duration', before.decoded, after.decoded);
  chk('waveform points', before.points, after.points);
  chk('waveform peak', before.peak, after.peak);
  console.log(`  ${'buffer rebuilt from blob'.padEnd(30)} ${after.decoded > 0 ? 'PASS' : 'FAIL'}`);

  await browser.close();
})();
