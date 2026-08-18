/**
 * Does the "single permanent multitrack canvas" claim hold across room switches?
 *
 * Three separate questions, tested separately, because they can have different
 * answers: does session DATA survive, do open DRAWERS survive, and does the
 * workspace COMPONENT survive (or unmount and remount, losing its local state)?
 */
const playwright = require('playwright');
const { launch, enterStudio, session } = require('./lib.cjs');

const STATE = `s => ({
  workspace: s.activeWorkspace,
  isPlaying: s.dawState.isPlaying,
  currentStep: s.dawState.currentStep,
  bpm: s.dawState.bpm,
  micArmed: s.detectionSettings ? s.detectionSettings.enabled : null,
  trackCount: s.tracks.length,
  kickVolume: (s.tracks.find(t => t.instrument === 'kick') || {}).volume,
  kickDsp: (s.tracks.find(t => t.instrument === 'kick') || {}).dspSettings || null,
  recordedNotes: s.tracks.reduce((a, t) => a + (t.noteEvents || []).filter(n => String(n.id).startsWith('rec_')).length, 0),
})`;

const STUDIO = `window.__studio = () => {
  const root = document.getElementById('root');
  const key = Object.keys(root).find(k => k.startsWith('__reactContainer$'));
  const fiberRoot = root[key] && root[key].stateNode;
  const stack = [(fiberRoot && fiberRoot.current) || root[key]]; const seen = new Set();
  while (stack.length) {
    const f = stack.pop(); if (!f || seen.has(f)) continue; seen.add(f);
    const v = f.memoizedProps && f.memoizedProps.value;
    if (v && Array.isArray(v.tracks) && v.setActiveWorkspace) return v;
    if (f.child) stack.push(f.child); if (f.sibling) stack.push(f.sibling);
  }
  throw new Error('studio context not found');
}`;

const ROOMS = { CREATE: '1. CREATE', BUILD: '2. BUILD', WRITE_RECORD: '3. WRITE & RECORD', MIX: '4. MIX', MASTER: '5. MASTER', RELEASE: '6. RELEASE' };

async function go(page, room) {
  await page.getByRole('button', { name: ROOMS[room] }).first().click();
  await page.waitForTimeout(1400);
}

// Reads the local (non-context) UI state of the CREATE canvas.
async function canvasLocalState(page) {
  return page.evaluate(`(() => {
    const active = (label) => {
      const b = [...document.querySelectorAll('button')].find(x => x.innerText.replace(/\\s+/g,' ').trim() === label);
      if (!b) return null;
      return /bg-(amber|cyan|emerald|purple|blue)-[45]00|text-slate-950/.test(b.className);
    };
    return {
      pointer: active('SELECT (V)'), pencil: active('DRAW (B)'),
      barAll: active('ALL 64'), bar2: active('BAR 2'),
    };
  })()`);
}

// The drawer is a fixed right-hand panel; count its heading rather than a
// bare text match, which can hit an off-screen node mid-animation.
const drawerOpen = async (page, title) => {
  const n = await page.locator(`div.fixed.right-0:has-text("${title}")`).count().catch(() => 0);
  return n > 0;
};

(async () => {
  const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';
  const { browser, page } = await launch(playwright, `${SP}/beatbox_ksh.wav`);
  await enterStudio(page);
  await page.evaluate(STUDIO);

  console.log('=== CROSS-ROOM PERSISTENCE ===');

  // ---------- 1. Session data ----------
  console.log('\n-- 1. Does session DATA survive a room switch? --');
  await page.evaluate(`window.__studio().handleChangeVolume(
    window.__studio().tracks.find(t => t.instrument === 'kick').id, -7)`);
  await page.evaluate(`window.__studio().handleCommitMixProposal({
    id: 'probe', title: 'probe', description: '', targetTrackIds: [],
    operationType: 'PROBE', lockedInvariants: [], confidenceScore: 1,
    proposedDspChanges: { [window.__studio().tracks.find(t => t.instrument === 'kick').id]: { lowGain: -4.25 } } })`);
  await page.waitForTimeout(600);
  const before = await session(page, STATE);

  for (const room of ['BUILD', 'WRITE_RECORD', 'MIX', 'MASTER', 'RELEASE', 'CREATE']) await go(page, room);
  const after = await session(page, STATE);

  console.log(`  kick volume     : ${before.kickVolume} -> ${after.kickVolume}  ${before.kickVolume === after.kickVolume ? 'PASS' : 'FAIL'}`);
  console.log(`  kick dsp lowGain: ${before.kickDsp && before.kickDsp.lowGain} -> ${after.kickDsp && after.kickDsp.lowGain}  ${JSON.stringify(before.kickDsp) === JSON.stringify(after.kickDsp) ? 'PASS' : 'FAIL'}`);
  console.log(`  track count     : ${before.trackCount} -> ${after.trackCount}  ${before.trackCount === after.trackCount ? 'PASS' : 'FAIL'}`);
  console.log(`  bpm             : ${before.bpm} -> ${after.bpm}  ${before.bpm === after.bpm ? 'PASS' : 'FAIL'}`);

  // ---------- 2. Open drawers ----------
  console.log('\n-- 2. Does an OPEN DRAWER survive a room switch? --');
  await page.getByRole('button', { name: '🎛️ TRACK WORKSTATION' }).first().click();
  await page.waitForTimeout(2000);
  const openInCreate = await drawerOpen(page, 'TRACK PRODUCTION WORKSTATION');
  await go(page, 'BUILD');
  const openInBuild = await drawerOpen(page, 'TRACK PRODUCTION WORKSTATION');
  await go(page, 'MIX');
  const openInMix = await drawerOpen(page, 'TRACK PRODUCTION WORKSTATION');
  await go(page, 'CREATE');
  const openBack = await drawerOpen(page, 'TRACK PRODUCTION WORKSTATION');
  console.log(`  opened in CREATE : ${openInCreate}`);
  console.log(`  still open in BUILD : ${openInBuild}  ${openInBuild === openInCreate ? 'persists' : 'CLOSED on switch'}`);
  console.log(`  still open in MIX   : ${openInMix}`);
  console.log(`  still open back in CREATE : ${openBack}`);
  console.log(`  drawer persists across rooms : ${openInCreate && openInBuild && openInMix && openBack ? 'YES' : 'see values above'}`);

  // Close it so it stops intercepting clicks on the canvas beneath.
  await page.locator('div.fixed.right-0 button').first().click({ force: true }).catch(() => {});
  await page.waitForTimeout(1200);

  // ---------- 3. Workspace component identity ----------
  console.log('\n-- 3. Does the CANVAS COMPONENT survive, or unmount and remount? --');
  await page.getByRole('button', { name: 'DRAW (B)' }).first().click({ force: true });
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'BAR 2', exact: true }).first().click({ force: true });
  await page.waitForTimeout(500);
  const localBefore = await canvasLocalState(page);
  console.log('  local canvas state set   :', JSON.stringify(localBefore));

  await go(page, 'MIX');
  await go(page, 'CREATE');
  const localAfter = await canvasLocalState(page);
  console.log('  after CREATE->MIX->CREATE:', JSON.stringify(localAfter));
  const kept = JSON.stringify(localBefore) === JSON.stringify(localAfter);
  console.log(`  canvas local state kept  : ${kept ? 'PASS — component stayed mounted' : 'FAIL — component was unmounted and rebuilt'}`);

  // Same probe for a room switch that does NOT change the rendered workspace.
  await page.getByRole('button', { name: 'DRAW (B)' }).first().click({ force: true });
  await page.waitForTimeout(300);
  const beforeSibling = await canvasLocalState(page);
  await go(page, 'BUILD');
  const afterSibling = await canvasLocalState(page);
  console.log(`  CREATE -> BUILD (same component): ${JSON.stringify(beforeSibling) === JSON.stringify(afterSibling) ? 'state kept' : 'state lost'}`);

  // ---------- 4. Playback across rooms ----------
  console.log('\n-- 4. Does PLAYBACK survive a room switch? --');
  await go(page, 'CREATE');
  await page.locator('button[title="Play (Space)"]').first().click({ force: true });
  await page.waitForTimeout(1500);
  const playing1 = await session(page, STATE);
  await go(page, 'MIX');
  const playing2 = await session(page, STATE);
  await page.waitForTimeout(1200);
  const playing3 = await session(page, STATE);
  console.log(`  before switch : isPlaying=${playing1.isPlaying} step=${playing1.currentStep}`);
  console.log(`  after switch  : isPlaying=${playing2.isPlaying} step=${playing2.currentStep}`);
  console.log(`  1.2s later    : isPlaying=${playing3.isPlaying} step=${playing3.currentStep}`);
  console.log(`  playback kept running : ${playing2.isPlaying && playing3.currentStep !== playing2.currentStep ? 'PASS' : 'FAIL'}`);

  // ---------- 5. Live mic capture across rooms ----------
  console.log('\n-- 5. Does an ARMED MIC / in-progress capture survive a room switch? --');
  await go(page, 'CREATE');
  await page.getByRole('button', { name: '🎤 BEATBOX (MOUTH)' }).first().click({ force: true });
  await page.waitForTimeout(2500);
  const armed1 = await session(page, STATE);
  await go(page, 'MIX');
  const armed2 = await session(page, STATE);
  await page.waitForTimeout(3000);
  const armed3 = await session(page, STATE);
  console.log(`  in CREATE  : micArmed=${armed1.micArmed} capturedNotes=${armed1.recordedNotes}`);
  console.log(`  in MIX     : micArmed=${armed2.micArmed} capturedNotes=${armed2.recordedNotes}`);
  console.log(`  3s later   : micArmed=${armed3.micArmed} capturedNotes=${armed3.recordedNotes}`);
  console.log(`  mic stayed armed        : ${armed2.micArmed ? 'PASS' : 'FAIL'}`);
  console.log(`  capture kept recording  : ${armed3.recordedNotes > armed2.recordedNotes ? 'PASS' : 'FAIL — capture stopped on room switch'}`);
  console.log(`  captured notes retained : ${armed3.recordedNotes >= armed1.recordedNotes ? 'PASS' : 'FAIL'}`);

  await browser.close();
})();
