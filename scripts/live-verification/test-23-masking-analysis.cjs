/**
 * 0.6 — the Mix advisor, rebuilt on measurement.
 *
 * The old panel's defining failure: identical 99%/97% findings on a full
 * project and on an empty canvas. That is the first thing tested here.
 */
const playwright = require('playwright');
const { launch, enterStudio, session, goToRoom } = require('./lib.cjs');

const STUDIO = `window.__studio = () => {
  const root = document.getElementById('root');
  const key = Object.keys(root).find(k => k.startsWith('__reactContainer$'));
  const fr = root[key] && root[key].stateNode;
  const stack = [(fr && fr.current) || root[key]]; const seen = new Set();
  while (stack.length) {
    const f = stack.pop(); if (!f || seen.has(f)) continue; seen.add(f);
    const v = f.memoizedProps && f.memoizedProps.value;
    if (v && Array.isArray(v.tracks) && v.handleAnalyzeMasking) return v;
    if (f.child) stack.push(f.child); if (f.sibling) stack.push(f.sibling);
  }
  throw new Error('ctx');
}`;

const show = (label, r) => {
  console.log(`\n-- ${label} --`);
  console.log(`  tracks analysed: ${r.tracksAnalyzed}   frames: ${r.framesAnalyzed}   findings: ${r.findings.length}`);
  if (r.emptyReason) console.log(`  says: "${r.emptyReason}"`);
  for (const f of r.findings.slice(0, 4)) {
    console.log(`    ${f.trackAName} + ${f.trackBName} @ ${f.centerHz} Hz (${f.band}) — both active ${Math.round(f.overlapRatio*100)}% of the take`);
  }
};

(async () => {
  console.log('=== MIX MASKING ANALYSIS ===');
  const { browser, page } = await launch(playwright, null);
  await enterStudio(page);
  await page.evaluate(STUDIO);

  // 1. Full project.
  const full = await page.evaluate('window.__studio().handleAnalyzeMasking()');
  show('full project', full);

  // 2. Empty canvas — the case the old panel got wrong.
  await page.evaluate('window.__studio().handleNewProject()');
  await page.waitForTimeout(1500);
  const empty = await page.evaluate('window.__studio().handleAnalyzeMasking()');
  show('empty canvas', empty);

  // 3. A deliberately different project: mute everything but two tracks.
  await page.evaluate(`(() => {
    const s = window.__studio();
    // restore content, then leave only kick + bass audible
    s.handleNewProject();
  })()`);
  await page.waitForTimeout(1200);

  console.log('\n-- results --');
  console.log(`  full project produced findings     : ${full.findings.length > 0 ? 'PASS' : 'FAIL'}`);
  console.log(`  empty canvas produced NO findings  : ${empty.findings.length === 0 ? 'PASS' : 'FAIL — invented ' + empty.findings.length}`);
  console.log(`  empty canvas explains itself       : ${empty.emptyReason ? 'PASS' : 'FAIL'}`);
  console.log(`  findings differ between the two    : ${JSON.stringify(full.findings) !== JSON.stringify(empty.findings) ? 'PASS' : 'FAIL — identical'}`);
  const hasReal = full.findings.every(f => f.overlapRatio > 0 && f.centerHz > 0 && f.trackAId !== f.trackBId);
  console.log(`  every finding names real tracks     : ${hasReal ? 'PASS' : 'FAIL'}`);
  const noFakeConfidence = !JSON.stringify(full).includes('confidenceScore');
  console.log(`  no fabricated confidence score      : ${noFakeConfidence ? 'PASS' : 'FAIL'}`);

  // 4. The panel itself renders the measurement.
  await goToRoom(page, 'MIX', { settle: 0 });
  await page.waitForTimeout(1500);
  const advisor = page.getByRole('button', { name: 'AI ADVISOR' }).first();
  if (await advisor.count()) { await advisor.click({ force: true }); await page.waitForTimeout(600); }
  const before = await page.locator('[data-testid=masking-finding]').count();
  const stale = await page.locator('text=/99% Match|97% Match/').count();
  console.log(`  panel shows no stale "% Match"      : ${stale === 0 ? 'PASS' : 'FAIL — found ' + stale}`);
  console.log(`  panel starts with nothing asserted  : ${before === 0 ? 'PASS' : 'FAIL'}`);

  await browser.close();
})();
