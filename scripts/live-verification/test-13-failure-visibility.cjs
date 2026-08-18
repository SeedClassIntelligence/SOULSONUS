/**
 * Neither upload path may silently fall back to the old broadcast behaviour.
 * When separation cannot happen, the creator must see it fail.
 */
const playwright = require('playwright');
const { launch, enterStudio, session } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

const COUNT = `s => s.tracks.reduce((a, t) => a + (t.noteEvents || []).filter(n => String(n.id).startsWith('rec_')).length, 0)`;
const TRACKCOUNT = `s => s.tracks.length`;

async function attempt(page, file, mode) {
  await page.getByRole('button', { name: /IMPORT AUDIO/i }).first().click();
  await page.waitForTimeout(900);
  await page.locator('input[type=file]').first().setInputFiles(file);
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: mode === 'FULL_MIX' ? 'Finished mix' : 'Solo performance' }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /SEPARATE/i }).last().click();
  await page.waitForTimeout(8000);
  const err = await page.locator('[data-testid=import-error]').innerText().catch(() => null);
  const ok = await page.locator('[data-testid=import-result]').innerText().catch(() => null);
  return { err, ok };
}

(async () => {
  console.log('=== FAILURE VISIBILITY ===');

  // 1. Full-mix path with no stem-separation service running.
  {
    const { browser, page } = await launch(playwright, null);
    await enterStudio(page);
    const before = await session(page, TRACKCOUNT);
    const notesBefore = await session(page, COUNT);
    const r = await attempt(page, `${SP}/full_mix.wav`, 'FULL_MIX');
    const after = await session(page, TRACKCOUNT);
    const notesAfter = await session(page, COUNT);
    await browser.close();

    console.log('\n-- full mix, stem service unreachable --');
    console.log('  error shown        :', r.err ? 'PASS' : 'FAIL (silent)');
    console.log('  message            :', (r.err || '').replace(/\s+/g, ' ').slice(0, 160));
    console.log('  names the endpoint :', /localhost:8010|endpoint/i.test(r.err || '') ? 'PASS' : 'FAIL');
    console.log('  no tracks invented :', after === before ? 'PASS' : `FAIL (${before} -> ${after})`);
    console.log('  no notes broadcast :', notesAfter === notesBefore ? 'PASS' : `FAIL (${notesBefore} -> ${notesAfter})`);
  }

  // 2. Solo path given a file containing nothing to detect.
  {
    const { browser, page } = await launch(playwright, null);
    await enterStudio(page);
    const notesBefore = await session(page, COUNT);
    const r = await attempt(page, `${SP}/silence.wav`, 'SOLO');
    const notesAfter = await session(page, COUNT);
    await browser.close();

    console.log('\n-- solo performance, silent file --');
    console.log('  error shown        :', r.err ? 'PASS' : 'FAIL (silent)');
    console.log('  message            :', (r.err || '').replace(/\s+/g, ' ').slice(0, 160));
    console.log('  no notes written   :', notesAfter === notesBefore ? 'PASS' : `FAIL (${notesBefore} -> ${notesAfter})`);
  }
})();
