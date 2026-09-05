/**
 * The seed track keeps the performance.
 *
 * Pressing BEATBOX created a track and armed the classifier, and nothing
 * recorded the audio. The classifier separates onsets onto the kick, snare and
 * hat channels — which is correct and stays — so the track the creator made by
 * pressing the button held no notes and no audio. It was empty in every sense,
 * and the take that produced the whole session existed nowhere afterwards.
 *
 * That matters twice over. The seed track is where this creator's work starts,
 * and it should visibly be the performance. And "extract stems from source"
 * can only re-analyse a performance that was kept — without the audio it can
 * do nothing but regroup notes that were already separated, so a better
 * extractor could never be applied to a take you already played.
 */
const playwright = require('playwright');
const { launch, enterStudio, session, armCapture, openUtility } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(52)} ${detail}`);
}

const STATE = `s => JSON.stringify((() => {
  const seed = s.tracks.find(t => t.isSourceTrack && t.sourceModality === 'MOUTH');
  const assets = Object.values(s.audioAssets || {});
  return {
    seed: seed ? {
      id: seed.id,
      name: seed.name,
      instrument: seed.instrument,
      hasAudio: !!seed.sourceTakeAudioUrl,
      clips: (seed.audioClips || []).length,
      notes: (seed.noteEvents || []).length,
    } : null,
    assets: assets.map(a => ({ id: a.id, name: a.name, origin: a.originType, secs: a.durationSeconds, sha: (a.sha256 || '').slice(0, 12), peaks: (a.peaks || []).length })),
    seeds: s.tracks.filter(t => t.isSourceTrack && t.sourceModality === 'MOUTH')
      .map(t => ({ name: t.name, hasAudio: !!t.sourceTakeAudioUrl, clips: (t.audioClips || []).length })),
    captured: s.tracks.reduce((n, t) => n + (t.noteEvents || []).filter(e => e.provenance && e.provenance.origin === 'MOUTH').length, 0),
    channels: s.tracks.filter(t => (t.noteEvents || []).some(e => e.provenance && e.provenance.origin === 'MOUTH')).map(t => t.instrument),
  };
})())`;
const state = async (page) => JSON.parse(await session(page, STATE));

(async () => {
  // A real beatbox performance through the fake capture device.
  const { browser, page } = await launch(playwright, `${SP}/beatbox_ksh.wav`);
  await enterStudio(page);

  console.log('=== THE SEED TRACK KEEPS THE PERFORMANCE ===\n');

  const before = await state(page);
  check('no seed track to begin with', before.seed === null, `${before.assets.length} assets`);

  // ---- perform ----
  // Choosing the modality and starting the take are two controls now; the
  // seed track is made when recording starts, not when the tab is picked.
  await armCapture(page, 'BEATBOX');

  const armed = await state(page);
  check('recording a mouth take makes a seed track', !!armed.seed, armed.seed ? armed.seed.name : 'none');
  check('and it is a MOUTH seed', armed.seed?.instrument === 'custom', `instrument=${armed.seed?.instrument}`);

  // Perform for a few seconds.
  await page.waitForTimeout(6000);

  const during = await state(page);
  check(
    'the classifier separates onto instrument channels',
    during.captured > 0,
    `${during.captured} notes across ${[...new Set(during.channels)].join(', ') || 'nothing'}`
  );
  check(
    'and not onto the seed track',
    (during.seed?.notes || 0) === 0,
    `seed holds ${during.seed?.notes} notes — a whole composition must not pile onto one track`
  );

  // ---- stop, which is where the take is kept ----
  const micBtn = page.locator('#btn-mic-arm').first();
  check('there is a control that stops capture', (await micBtn.count()) === 1, 'REC in the header');
  await micBtn.scrollIntoViewIfNeeded();
  await micBtn.click();
  // Encoding and hashing the take is real work; give it room.
  await page.waitForTimeout(6000);

  const after = await state(page);
  console.log('\n-- what was kept --');
  check('the seed track now carries audio', after.seed?.hasAudio === true, `sourceTakeAudioUrl set: ${after.seed?.hasAudio}`);
  check(
    'the performance is a clip on that track',
    (after.seed?.clips || 0) > 0,
    `${after.seed?.clips} clip(s) — drawn on the grid, draggable, and it reaches the bounce`
  );

  const asset = after.assets.find((a) => a.origin === 'RECORDED');
  check('and an immutable asset behind it', !!asset, asset ? `${asset.name} · ${asset.secs}s` : 'none registered');
  check(
    'measured, not claimed',
    !!asset && asset.secs > 1 && asset.peaks > 0 && asset.sha.length === 12,
    asset ? `${asset.secs}s · ${asset.peaks} peak points · sha ${asset.sha}` : ''
  );

  // ---- the point of keeping it: it can be extracted again ----
  console.log('\n-- it can be extracted again --');
  const extract = await page.evaluate(`(async () => {
    const root = document.getElementById('root');
    const key = Object.keys(root).find(k => k.startsWith('__reactContainer$'));
    const fiberRoot = root[key] && root[key].stateNode;
    const stack = [(fiberRoot && fiberRoot.current) || root[key]]; const seen = new Set();
    let ctx = null;
    while (stack.length) {
      const f = stack.pop(); if (!f || seen.has(f)) continue; seen.add(f);
      const v = f.memoizedProps && f.memoizedProps.value;
      if (v && Array.isArray(v.tracks) && v.handleExtractStemsFromSource) { ctx = v; break; }
      if (f.child) stack.push(f.child); if (f.sibling) stack.push(f.sibling);
    }
    const seed = ctx.tracks.find(t => t.isSourceTrack && t.sourceModality === 'MOUTH');
    return await ctx.handleExtractStemsFromSource(seed.id);
  })()`);

  check('extraction works from the seed', extract.ok === true, extract.message || '');
  check(
    'and it analysed the audio rather than regrouping notes',
    /onsets detected in the seed audio/.test(extract.message || ''),
    extract.message || ''
  );

  // ---- and it is kept whichever control ends the take ----
  //
  // Capture can be stopped from the header's REC button or from the
  // calibration drawer's own Stop Mic. When keeping the take was wired to the
  // first of those, the second still threw the performance away and left the
  // recorder running into the next arm. A performance must not depend on which
  // button the creator happened to reach for.
  console.log('\n-- stopped from the calibration drawer --');
  await armCapture(page, 'BEATBOX');
  await page.waitForTimeout(4000);

  await openUtility(page, 'CALIBRATION', { settle: 0 });
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'Stop Mic', exact: true }).first().click({ force: true });
  await page.waitForTimeout(6000);

  const both = await state(page);
  check(
    'a second performance made a second seed',
    both.seeds.length === 2,
    `${both.seeds.length} MOUTH seed track(s)`
  );
  check(
    'the drawer keeps the take as well',
    both.seeds.length === 2 && both.seeds.every((t) => t.hasAudio && t.clips > 0),
    both.seeds.map((t) => `${t.name}: audio=${t.hasAudio} clips=${t.clips}`).join(' | ')
  );
  const recorded = both.assets.filter((a) => a.origin === 'RECORDED');
  check(
    'two performances, two assets',
    recorded.length === 2 && recorded.every((a) => a.secs > 1),
    recorded.map((a) => `${a.secs}s/${a.sha}`).join(' + ')
  );

  console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})();
