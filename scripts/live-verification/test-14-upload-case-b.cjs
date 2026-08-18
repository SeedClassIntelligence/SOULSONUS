/**
 * Case B — a finished multi-instrument mix routes to stem separation.
 *
 * Verifies the app's side end to end: the real file is uploaded over the real
 * service protocol, the returned stem files are fetched and decoded, and each
 * becomes a distinct track carrying the audio that actually came back.
 *
 * The service behind it here is the transport stub, because this environment
 * cannot download the htdemucs weights. Separation *quality* is therefore not
 * under test — the app's integration is.
 */
const playwright = require('playwright');
const { launch, enterStudio, session } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

const SNAP = `s => ({
  stemTracks: s.tracks.filter(t => t.sourceTakeAudioUrl).map(t => ({
    name: t.name, instrument: t.instrument, url: t.sourceTakeAudioUrl,
    takes: (t.waveformTakes || []).map(w => ({
      duration: Number(w.duration.toFixed(2)),
      points: w.waveformData.length,
      peak: Number(Math.max(...w.waveformData).toFixed(4)),
      energy: Number((w.waveformData.reduce((a, b) => a + b, 0) / w.waveformData.length).toFixed(4)),
      shape: w.waveformData.slice(0, 12).map(v => Number(v.toFixed(3))),
    })),
  })),
  noteCount: s.tracks.reduce((a, t) => a + (t.noteEvents || []).filter(n => String(n.id).startsWith('rec_')).length, 0),
})`;

(async () => {
  console.log('=== CASE B — FULL MIX → STEM SEPARATION ===');

  const { browser, page } = await launch(playwright, null);
  await enterStudio(page);

  await page.getByRole('button', { name: /IMPORT AUDIO/i }).first().click();
  await page.waitForTimeout(900);
  await page.locator('input[type=file]').first().setInputFiles(`${SP}/full_mix.wav`);
  await page.waitForTimeout(600);

  await page.getByRole('button', { name: 'Check the file for me' }).click();
  await page.waitForTimeout(6000);
  const verdict = await page.locator('[data-testid=content-verdict]').innerText().catch(() => '(none)');

  await page.getByRole('button', { name: 'Finished mix' }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /SEPARATE/i }).last().click();
  await page.waitForTimeout(20000);

  const err = await page.locator('[data-testid=import-error]').innerText().catch(() => null);
  const ok = await page.locator('[data-testid=import-result]').innerText().catch(() => null);
  const state = await session(page, SNAP);
  await browser.close();

  console.log('\n  app verdict :', verdict.replace(/\s+/g, ' '));
  console.log('  error       :', err || '(none)');
  console.log('  result      :', (ok || '(none)').replace(/\s+/g, ' '));
  console.log(`\n  stem tracks created: ${state.stemTracks.length}`);
  for (const t of state.stemTracks) {
    const w = t.takes[0] || {};
    console.log(`    ${t.instrument.padEnd(12)} "${t.name}"`);
    console.log(`        audio ${t.url}`);
    console.log(`        duration ${w.duration}s  peak ${w.peak}  mean ${w.energy}  first points ${JSON.stringify(w.shape)}`);
  }

  const shapes = state.stemTracks.map(t => JSON.stringify(t.takes[0] && t.takes[0].shape));
  const distinct = new Set(shapes).size;
  const allHaveAudio = state.stemTracks.every(t => t.url && t.takes[0] && t.takes[0].points > 0);
  const allNonSilent = state.stemTracks.every(t => t.takes[0] && t.takes[0].peak > 0.001);
  const instruments = new Set(state.stemTracks.map(t => t.instrument));

  console.log('\n-- results --');
  console.log('  went to stem separation      :', state.stemTracks.length >= 4 ? 'PASS' : `FAIL (${state.stemTracks.length} stems)`);
  console.log('  each stem carries real audio :', allHaveAudio ? 'PASS' : 'FAIL');
  console.log('  stems are non-silent         :', allNonSilent ? 'PASS' : 'FAIL');
  console.log('  stems are distinct from each other:', distinct === state.stemTracks.length ? `PASS (${distinct} distinct waveforms)` : `FAIL (${distinct}/${state.stemTracks.length})`);
  console.log('  landed on separate channels  :', instruments.size === state.stemTracks.length ? `PASS (${[...instruments].join(', ')})` : `FAIL (${[...instruments].join(', ')})`);
  console.log('  not one blob on one track    :', state.stemTracks.length > 1 ? 'PASS' : 'FAIL');
  console.log('  classifier NOT used          :', state.noteCount === 0 ? 'PASS (no classified note events)' : `FAIL (${state.noteCount} notes written)`);
})();
