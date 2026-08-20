/**
 * Does the signature describe this creator, or every creator?
 *
 * What it sealed was six literals: `kickSensitivity: 0.45`,
 * `snareSensitivity: 0.55`, and `['Fat 808 Sub', 'Crisp Acoustic Snare',
 * 'Custom Root Seeds']` — the same for everybody who ever pressed the button,
 * signed with a real SHA-256 and stored as though it described them. The
 * strongest claim in the product and the emptiest.
 *
 * So this drives the real modal twice: once before the creator has done
 * anything, where it has to say plainly that nothing is known, and once after
 * a real beatbox take through the synthetic microphone, where the numbers
 * have to be that performance's numbers.
 */
const playwright = require('playwright');
const { launch, enterStudio, session } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(52)} ${detail}`);
}

async function openTraining(page) {
  await page.locator('#btn-train-signature').first().click();
  await page.waitForTimeout(1200);
  // The signing pillar is the last one; the preview lives there.
  const seal = page.getByRole('button', { name: /seed lock|7/i }).first();
  if (await seal.count()) { await seal.click({ force: true }); await page.waitForTimeout(600); }
}

const previewText = async (page) => {
  const el = page.locator('#style-profile-preview');
  return (await el.count()) ? (await el.innerText()).replace(/\s+/g, ' ') : '';
};

(async () => {
  const { browser, page } = await launch(playwright, `${SP}/beatbox_ksh.wav`);
  await enterStudio(page);

  console.log('=== WHAT THE SIGNATURE ACTUALLY KNOWS ===\n');

  // ---- before the creator has performed anything ----
  await openTraining(page);
  let preview = await previewText(page);
  check('the profile is shown before it is signed', preview.length > 0, preview.slice(0, 70));
  check(
    'it does not claim thresholds nobody tuned',
    /not tuned/.test(preview),
    (preview.match(/kick threshold [^ ]+/) || ['-'])[0]
  );
  check(
    'and it names what it could not measure',
    /not known yet/i.test(preview) && /no pocket to measure/.test(preview),
    (preview.match(/NOT KNOWN YET.{0,80}/i) || ['-'])[0]
  );
  check(
    'none of the retired literals appear anywhere',
    !/Fat 808 Sub|Crisp Acoustic Snare|Custom Root Seeds|0\.45|0\.55/.test(preview),
    'no "Fat 808 Sub", no 0.45 / 0.55'
  );

  await page.locator('#btn-close-training').first().click();
  await page.waitForTimeout(800);

  // ---- perform, then look again ----
  console.log('\n-- after a real take --');
  await page.locator('[data-testid="capture-mouth"]').first().click();
  await page.waitForTimeout(7000);
  await page.locator('#btn-mic-arm').first().click();
  await page.waitForTimeout(3000);

  const captured = JSON.parse(await session(page, `s => JSON.stringify({
    performed: s.tracks.reduce((n, t) => n + (t.noteEvents || []).filter(e => e.provenance && ['MOUTH','BODY','MIDI_KEYS'].includes(e.provenance.origin)).length, 0),
  })`));
  console.log(`  the take put ${captured.performed} performed onsets in the session`);

  await openTraining(page);
  preview = await previewText(page);
  const onsets = Number((preview.match(/performed onsets (\d+)/) || [0, 0])[1]);
  check(
    'the profile counts the onsets that were actually performed',
    onsets === captured.performed && onsets > 0,
    `${onsets} in the profile against ${captured.performed} in the session`
  );
  check(
    'and it now measures where they sit against the grid',
    /ahead of the beat|behind the beat|on the grid/.test(preview),
    (preview.match(/Plays [^.]*\./) || ['no pocket measured'])[0]
  );
  check(
    'the pocket is stated in milliseconds, from a stated number of onsets',
    /[-+]?[\d.]+ ms from the nearest 16th across \d+ onsets/.test(preview),
    (preview.match(/[-+]?[\d.]+ ms from the nearest 16th across \d+ onsets/) || ['-'])[0]
  );
  check(
    'the pocket gap is gone now that there is a performance',
    !/there is no pocket to measure/.test(preview),
    'measured rather than missing'
  );

  // ---- and what gets signed is what was shown ----
  console.log('\n-- what gets sealed --');
  const sealed = await page.evaluate(`(async () => {
    const root = document.getElementById('root');
    const key = Object.keys(root).find(k => k.startsWith('__reactContainer$'));
    const fiberRoot = root[key] && root[key].stateNode;
    const stack = [(fiberRoot && fiberRoot.current) || root[key]]; const seen = new Set();
    let ctx = null;
    while (stack.length) {
      const f = stack.pop(); if (!f || seen.has(f)) continue; seen.add(f);
      const v = f.memoizedProps && f.memoizedProps.value;
      if (v && Array.isArray(v.tracks) && v.detectionSettings) { ctx = v; break; }
      if (f.child) stack.push(f.child); if (f.sibling) stack.push(f.sibling);
    }
    if (!ctx) return { error: 'no context' };
    const { computeStyleProfile } = await import('/src/lib/styleProfile.ts');
    const p = computeStyleProfile({
      creatorName: 'probe', tracks: ctx.tracks, bpm: ctx.dawState.bpm || 110,
      detectionSettings: ctx.detectionSettings, decisionRecords: ctx.decisionRecords,
    });
    return {
      performed: p.performance.performedNotes,
      pocket: p.performance.pocket,
      subdivisions: p.performance.subdivisions,
      velocity: p.performance.velocity,
      confidence: p.performance.meanConfidence,
      kick: p.calibration.kickThreshold,
    };
  })()`);
  console.log('  ' + JSON.stringify(sealed));
  check(
    'the sealed profile carries the same performance',
    !sealed.error && sealed.performed === captured.performed,
    `${sealed.performed} onsets`
  );
  check(
    'with real dynamics from the take',
    !sealed.error && !!sealed.velocity && sealed.velocity.min !== sealed.velocity.max,
    sealed.velocity ? `velocity ${sealed.velocity.min}–${sealed.velocity.max}, mean ${sealed.velocity.mean}` : 'none'
  );
  check(
    'and the detector confidence the classifier actually reported',
    !sealed.error && typeof sealed.confidence === 'number' && sealed.confidence > 0 && sealed.confidence <= 1,
    `mean confidence ${sealed.confidence}`
  );

  console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})();
