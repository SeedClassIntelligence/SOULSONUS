/**
 * 0.5 — does Extract Stems use the actual take?
 *
 * It used to write the demo preset's fixed step arrays whatever was recorded.
 * Two things to prove: different performances now yield different stems, and a
 * seed with nothing in it says so rather than inventing a pattern.
 */
const playwright = require('playwright');
const { launch, enterStudio, session } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

const STUDIO = `window.__studio = () => {
  const root = document.getElementById('root');
  const key = Object.keys(root).find(k => k.startsWith('__reactContainer$'));
  const fr = root[key] && root[key].stateNode;
  const stack = [(fr && fr.current) || root[key]]; const seen = new Set();
  while (stack.length) {
    const f = stack.pop(); if (!f || seen.has(f)) continue; seen.add(f);
    const v = f.memoizedProps && f.memoizedProps.value;
    if (v && Array.isArray(v.tracks) && v.handleExtractStemsFromSource) return v;
    if (f.child) stack.push(f.child); if (f.sibling) stack.push(f.sibling);
  }
  throw new Error('ctx');
}`;

const STEMS = `s => s.tracks.filter(t => t.id.startsWith('t-ext-')).map(t => ({
  name: t.name, instrument: t.instrument,
  notes: (t.noteEvents || []).length,
  steps: t.steps.map((v,i)=>v?i:-1).filter(i=>i>=0),
}))`;

async function run(clip, seconds, label) {
  const { browser, page } = await launch(playwright, clip ? `${SP}/${clip}` : null);
  await enterStudio(page);
  await page.evaluate(STUDIO);
  await page.evaluate('window.__studio().handleNewProject()');
  await page.waitForTimeout(1200);

  if (clip) {
    await page.getByRole('button', { name: '🎤 BEATBOX (MOUTH)' }).first().click({ force: true });
    await page.waitForTimeout(1000);
  } else {
    // Create the seed without arming the mic. Chromium's fake device emits a
    // beep when no file is supplied, which would not be an empty take.
    await page.evaluate(`window.__studio().handleCreateSourceTrack('MOUTH')`);
    await page.waitForTimeout(800);
  }

  if (clip) {
    await page.locator('button[title="Play (Space)"]').first().click({ force: true }).catch(() => {});
    await page.waitForTimeout(seconds * 1000);
    await page.locator('button[title="Stop Playhead"]').first().click({ force: true }).catch(() => {});
  }
  if (clip) {
    await page.locator('button[title="Toggle Mic Recording Engine"]').first().click({ force: true }).catch(() => {});
    await page.waitForTimeout(900);
  }

  const res = await page.evaluate(`(async () => {
    const s = window.__studio();
    const seed = s.tracks.find(t => t.isSourceTrack);
    return await s.handleExtractStemsFromSource(seed.id);
  })()`);
  await page.waitForTimeout(1200);
  const stems = await session(page, STEMS);
  await browser.close();

  console.log(`\n-- ${label} --`);
  console.log(`  result: ok=${res.ok}  ${res.message}`);
  for (const st of stems) {
    console.log(`    ${st.instrument.padEnd(8)} "${st.name}"  ${st.notes} notes  steps ${JSON.stringify(st.steps.slice(0, 12))}${st.steps.length > 12 ? ' …' : ''}`);
  }
  return { res, stems };
}

(async () => {
  console.log('=== EXTRACT STEMS FROM THE ACTUAL TAKE ===');

  const a = await run('beatbox_ksh.wav', 9, 'kick + snare + hat performance');
  const b = await run('beatbox_ks.wav', 9, 'kick + snare only, no hi-hat');
  const c = await run(null, 0, 'empty seed — nothing performed');

  const sig = (x) => JSON.stringify(x.stems.map(s => [s.instrument, s.steps]).sort());
  const DEMO_KICK = [0,6,10,12,16,22,26,28,32,38,42,44,48,54,58,60];
  const kickA = (a.stems.find(s => s.instrument === 'kick') || {}).steps || [];

  console.log('\n-- results --');
  console.log(`  A produced stems                    : ${a.stems.length > 0 ? 'PASS' : 'FAIL'}`);
  console.log(`  B produced stems                    : ${b.stems.length > 0 ? 'PASS' : 'FAIL'}`);
  console.log(`  A and B differ (not a fixed pattern): ${sig(a) !== sig(b) ? 'PASS' : 'FAIL — identical output'}`);
  console.log(`  A's kick is not the demo pattern    : ${JSON.stringify(kickA) !== JSON.stringify(DEMO_KICK) ? 'PASS' : 'FAIL — wrote the preset'}`);
  console.log(`  no hi-hat stem when none performed  : ${!b.stems.some(s => s.instrument === 'hihat') ? 'PASS' : 'FAIL'}`);
  console.log(`  empty seed refuses honestly         : ${!c.res.ok && c.stems.length === 0 ? 'PASS' : 'FAIL'}`);
  console.log(`     -> "${c.res.message}"`);
})();
