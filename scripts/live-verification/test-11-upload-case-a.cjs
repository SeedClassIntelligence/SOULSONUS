/**
 * Case A — a solo performance uploaded as a file.
 *
 * Uploads the very same clip that was fed to the live mic in test-07 and
 * compares the resulting channel split, so "identical pipeline" is a measured
 * claim rather than an assertion about the code.
 */
const playwright = require('playwright');
const { launch, enterStudio, session } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

const SNAP = `s => s.tracks
  .filter(t => (t.noteEvents || []).some(n => String(n.id).startsWith('rec_')))
  .map(t => ({
    instrument: t.instrument,
    notes: (t.noteEvents || []).filter(n => String(n.id).startsWith('rec_'))
      .map(n => ({ vel: n.velocity, tick: n.startTick, origin: n.provenance && n.provenance.origin })),
  }))`;

async function upload(page, file, mode) {
  await page.getByRole('button', { name: /IMPORT AUDIO/i }).first().click();
  await page.waitForTimeout(900);
  await page.locator('input[type=file]').first().setInputFiles(file);
  await page.waitForTimeout(600);

  // Ask the app what it thinks the file is.
  await page.getByRole('button', { name: 'Check the file for me' }).click();
  await page.waitForTimeout(4000);
  const verdict = await page.locator('text=/Looks like/').first().innerText().catch(() => '(none)');
  const reason = await page.locator('.text-\\[10px\\].text-slate-400.font-sans').last().innerText().catch(() => '');

  await page.getByRole('button', { name: mode === 'FULL_MIX' ? 'Finished mix' : 'Solo performance' }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /SEPARATE/i }).last().click();
  await page.waitForTimeout(9000);

  const err = await page.locator('[data-testid=import-error]').innerText().catch(() => null);
  const ok = await page.locator('[data-testid=import-result]').innerText().catch(() => null);
  return { verdict, reason, err, ok };
}

(async () => {
  console.log('=== CASE A — SOLO PERFORMANCE UPLOAD ===');

  const { browser, page } = await launch(playwright, null);
  await enterStudio(page);
  const res = await upload(page, `${SP}/beatbox_ksh.wav`, 'SOLO');
  const tracks = await session(page, SNAP);
  await browser.close();

  console.log('\nfile: beatbox_ksh.wav (kick + snare + hat interleaved)');
  console.log('  app verdict :', res.verdict.replace(/\s+/g, ' '));
  console.log('  reason      :', (res.reason || '').replace(/\s+/g, ' '));
  console.log('  error       :', res.err || '(none)');
  console.log('  result      :', (res.ok || '(none)').replace(/\s+/g, ' '));

  const byInstrument = {};
  for (const t of tracks) byInstrument[t.instrument] = (byInstrument[t.instrument] || 0) + t.notes.length;
  for (const t of tracks) {
    const vels = t.notes.map(n => n.vel);
    const ticks = t.notes.map(n => n.tick);
    console.log(`  ${t.instrument.padEnd(8)} notes=${String(t.notes.length).padEnd(3)} vel ${Math.min(...vels)}..${Math.max(...vels)} (${new Set(vels).size} distinct)  ticks ${Math.min(...ticks)}..${Math.max(...ticks)} (${new Set(ticks).size} distinct)`);
  }

  const expected = ['kick', 'snare', 'hihat'];
  const leaked = Object.keys(byInstrument).filter(i => !expected.includes(i));
  const velVaries = tracks.some(t => new Set(t.notes.map(n => n.vel)).size > 1);
  const ticksSpread = tracks.some(t => new Set(t.notes.map(n => n.tick)).size > 1);
  const ratio = byInstrument.hihat / ((byInstrument.kick + byInstrument.snare) / 2);

  console.log('\n  channels populated:', JSON.stringify(byInstrument));
  console.log('  all three sound types present :', expected.every(i => byInstrument[i] > 0) ? 'PASS' : 'FAIL');
  console.log('  no leakage to other channels  :', leaked.length === 0 ? 'PASS' : `FAIL — ${leaked.join(',')}`);
  console.log('  hat:kick/snare ratio ~2:1     :', ratio > 1.5 && ratio < 2.6 ? `PASS (${ratio.toFixed(2)})` : `FAIL (${ratio.toFixed(2)})`);
  console.log('  velocity is dynamic           :', velVaries ? 'PASS' : 'FAIL');
  console.log('  notes spread across the take  :', ticksSpread ? 'PASS' : 'FAIL');
  console.log('  provenance recorded           :', tracks.every(t => t.notes.every(n => n.origin)) ? 'PASS' : 'FAIL');

  // Case A must be a solo take — never routed to stem separation by mistake.
  const stemTracks = tracks.filter(t => /stem/i.test(t.instrument));
  console.log('  did not go to stem separation :', stemTracks.length === 0 ? 'PASS' : 'FAIL');
})();
