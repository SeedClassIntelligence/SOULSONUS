/**
 * Does the Case A / Case B suggestion actually tell the two apart?
 *
 * The suggestion pre-selects the upload mode but never decides on its own —
 * this measures how well it would do if it did.
 */
const playwright = require('playwright');
const { launch, enterStudio } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

const CLIPS = [
  ['beatbox_ksh.wav', 'SOLO_PERFORMANCE', 'solo beatbox: kick + snare + hat'],
  ['beatbox_ks.wav', 'SOLO_PERFORMANCE', 'solo beatbox: kick + snare'],
  ['body_taps.wav', 'SOLO_PERFORMANCE', 'solo body percussion'],
  ['hum_melody.wav', 'SOLO_PERFORMANCE', 'solo hum, upper register'],
  ['hum_bass.wav', 'SOLO_PERFORMANCE', 'solo hum, low register'],
  ['full_mix.wav', 'FULL_MIX', 'drums + bass + chords + hats together'],
];

(async () => {
  const { browser, page } = await launch(playwright, null);
  await enterStudio(page);
  await page.evaluate(`window.__studio = () => {
    const root = document.getElementById('root');
    const key = Object.keys(root).find(k => k.startsWith('__reactContainer$'));
    const fiberRoot = root[key] && root[key].stateNode;
    const stack = [(fiberRoot && fiberRoot.current) || root[key]]; const seen = new Set();
    while (stack.length) {
      const f = stack.pop(); if (!f || seen.has(f)) continue; seen.add(f);
      const v = f.memoizedProps && f.memoizedProps.value;
      if (v && Array.isArray(v.tracks) && v.handleAnalyzeAudioFile) return v;
      if (f.child) stack.push(f.child); if (f.sibling) stack.push(f.sibling);
    }
    throw new Error('studio context not found');
  }`);

  console.log('=== CASE A / CASE B DISCRIMINATION ===\n');
  let correct = 0;
  let ambiguous = 0;
  for (const [file, expected, desc] of CLIPS) {
    await page.locator('input[type=file]').first().setInputFiles(`${SP}/${file}`).catch(async () => {
      await page.getByRole('button', { name: /IMPORT AUDIO/i }).first().click();
      await page.waitForTimeout(800);
      await page.locator('input[type=file]').first().setInputFiles(`${SP}/${file}`);
    });
    await page.waitForTimeout(400);
    const analysis = await page.evaluate(`(async () => {
      const input = document.querySelector('input[type=file]');
      const file = input.files[0];
      return await window.__studio().handleAnalyzeAudioFile(file);
    })()`);
    // A recommendation only counts when the app actually made one.
    const ok = analysis.ambiguous ? null : analysis.suggestion === expected;
    if (ok) correct++;
    if (analysis.ambiguous) ambiguous++;
    const tag = analysis.ambiguous ? 'ASK ' : ok ? 'OK  ' : 'WRONG';
    console.log(`${tag} ${file.padEnd(18)} ${desc}`);
    console.log(`       ${analysis.ambiguous ? 'defers to the creator' : 'recommends ' + analysis.suggestion + ' (' + Math.round(analysis.confidence * 100) + '% confident)'}, actually ${expected}`);
    console.log(`       duty ${(analysis.metrics.activityDutyCycle * 100).toFixed(0)}%  bands ${analysis.metrics.meanConcurrentBands.toFixed(2)}  onsets ${analysis.metrics.onsetCount}\n`);
  }
  console.log(`recommended and right: ${correct}   deferred to creator: ${ambiguous}   recommended and WRONG: ${CLIPS.length - correct - ambiguous}`);
  await browser.close();
})();
