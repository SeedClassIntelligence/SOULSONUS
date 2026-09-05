/**
 * 0.4 — does a creator's work survive a reload?
 *
 * The whole point: capture, the mastering chain and the bounce are real now,
 * but until this existed a refresh discarded all of it.
 */
const playwright = require('playwright');
const { launch, enterStudio, session, recordTake } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

const STUDIO = `window.__studio = () => {
  const root = document.getElementById('root');
  const key = Object.keys(root).find(k => k.startsWith('__reactContainer$'));
  const fr = root[key] && root[key].stateNode;
  const stack = [(fr && fr.current) || root[key]]; const seen = new Set();
  while (stack.length) {
    const f = stack.pop(); if (!f || seen.has(f)) continue; seen.add(f);
    const v = f.memoizedProps && f.memoizedProps.value;
    if (v && Array.isArray(v.tracks) && v.handleSaveProjectAs) return v;
    if (f.child) stack.push(f.child); if (f.sibling) stack.push(f.sibling);
  }
  throw new Error('ctx');
}`;

const SNAP = `s => ({
  projectName: s.dawState.projectName,
  bpm: s.dawState.bpm,
  trackCount: s.tracks.length,
  notes: s.tracks.reduce((a,t)=>a+(t.noteEvents||[]).length,0),
  recorded: s.tracks.reduce((a,t)=>a+(t.noteEvents||[]).filter(n=>String(n.id).startsWith('rec_')).length,0),
  kickVol: (s.tracks.find(t=>t.instrument==='kick')||{}).volume,
  lowCut: (s.masteringChain.slots.find(x=>x.type==='corrective_eq')||{parameters:{}}).parameters.lowCutHz,
  seedRecords: (s.seedRecords||[]).length,
  workspace: s.activeWorkspace,
  lastSavedAt: s.lastSavedAt,
  hydrating: s.isHydrating,
  error: s.persistenceError,
})`;

const waitSettled = async (page) => {
  for (let i = 0; i < 40; i++) {
    const st = await session(page, SNAP);
    if (!st.hydrating) return st;
    await page.waitForTimeout(250);
  }
  return session(page, SNAP);
};

(async () => {
  console.log('=== PROJECT PERSISTENCE ===\n');
  const { browser, page } = await launch(playwright, `${SP}/beatbox_ksh.wav`);
  await enterStudio(page);
  await page.evaluate(STUDIO);
  await waitSettled(page);

  // Make real work: capture a take, change the mix and the mastering chain.
  console.log('-- making work in the session --');
  // The capture row is modality tabs and one record control now; this test was
  // waiting for a '🎤 BEATBOX (MOUTH)' button that no longer exists and timed
  // out before it made any work to persist.
  await recordTake(page, 'Oral Beatbox', 5, { play: true });
  await page.locator('button[title="Stop Playhead"]').first().click({ force: true }).catch(() => {});
  await page.waitForTimeout(800);

  await page.evaluate(`(() => {
    const s = window.__studio();
    s.handleChangeVolume(s.tracks.find(t=>t.instrument==='kick').id, -6);
    s.setDawState(p => ({ ...p, bpm: 132, projectName: 'Persistence Probe' }));
    const eq = s.masteringChain.slots.find(x=>x.type==='corrective_eq');
    s.handleUpdateMasteringProcessor(eq.id, { lowCutHz: 44 });
    s.setActiveWorkspace('MIX');
  })()`);
  await page.waitForTimeout(2500);

  const before = await session(page, SNAP);
  console.log(`  ${before.trackCount} tracks, ${before.notes} notes (${before.recorded} captured), bpm ${before.bpm}`);
  console.log(`  kick volume ${before.kickVol}, master lowCut ${before.lowCut} Hz, room ${before.workspace}`);
  console.log(`  autosave stamp: ${before.lastSavedAt ? new Date(before.lastSavedAt).toISOString() : 'none'}   error: ${before.error || 'none'}`);

  // The actual test: reload, same browser context, nothing carried in memory.
  console.log('\n-- reloading the page --');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  // A reload may land on the landing page or straight in the studio.
  const enter = page.getByRole('button', { name: 'ENTER THE STUDIO' }).first();
  if (await enter.count()) {
    await enter.click();
    await page.waitForTimeout(2000);
  }
  await page.evaluate(STUDIO);
  const after = await waitSettled(page);

  console.log(`  ${after.trackCount} tracks, ${after.notes} notes (${after.recorded} captured), bpm ${after.bpm}`);
  console.log(`  kick volume ${after.kickVol}, master lowCut ${after.lowCut} Hz, room ${after.workspace}`);
  console.log(`  error: ${after.error || 'none'}`);

  const check = (label, a, b) => console.log(`  ${label.padEnd(34)} ${String(a).padEnd(20)} -> ${String(b).padEnd(20)} ${a === b ? 'PASS' : 'FAIL'}`);
  console.log('\n-- survived the reload? --');
  check('captured notes', before.recorded, after.recorded);
  check('total notes', before.notes, after.notes);
  check('track count', before.trackCount, after.trackCount);
  check('bpm', before.bpm, after.bpm);
  check('project name', before.projectName, after.projectName);
  check('kick volume', before.kickVol, after.kickVol);
  check('mastering chain lowCut', before.lowCut, after.lowCut);
  check('room', before.workspace, after.workspace);
  // The recorded vocal take is covered separately by test-24.

  // Named versions.
  console.log('\n-- named versions --');
  await page.getByRole('button', { name: /PROJECTS/ }).first().click({ force: true });
  await page.waitForTimeout(800);
  await page.locator('[data-testid=project-name]').fill('Take One');
  await page.locator('[data-testid=save-project]').click();
  await page.waitForTimeout(1200);
  const rows = await page.locator('[data-testid=project-row]').count();
  console.log(`  saved versions listed: ${rows}   ${rows > 0 ? 'PASS' : 'FAIL'}`);

  // Start a new empty project, confirm it clears, then reopen the saved one.
  await page.locator('[data-testid=new-project]').click();
  await page.waitForTimeout(1500);
  const cleared = await session(page, SNAP);
  console.log(`  new project clears notes: ${cleared.notes} notes   ${cleared.notes === 0 ? 'PASS' : 'FAIL'}`);

  await page.getByRole('button', { name: 'OPEN' }).first().click({ force: true });
  await page.waitForTimeout(2500);
  const reopened = await session(page, SNAP);
  console.log(`  reopened saved version: ${reopened.recorded} captured notes, bpm ${reopened.bpm}   ${reopened.recorded === before.recorded ? 'PASS' : 'FAIL'}`);

  await browser.close();
})();
