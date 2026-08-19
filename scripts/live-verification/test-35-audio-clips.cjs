/**
 * Audio on the timeline — the abstraction, proved without ACE.
 *
 * A track could hold notes but not audio, so a recorded take, an imported file,
 * a separated stem and anything a model returns all had nowhere to live. This
 * places a take the microphone actually captured, and then asks the questions
 * that decide whether the type is real: does it play, does it move, does it
 * undo, does it survive a reload, and does it reach the export.
 */
const playwright = require('playwright');
const { launch, enterStudio, session } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(46)} ${detail}`);
}

// Counting every started source would also count the sequencer's own voices,
// which proves nothing about the clip. Buffer durations are recorded so the
// check can look for a source carrying the asset's own length.
const PROBE = `
  window.__audio = { started: 0, durations: [] };
  [window.AudioBufferSourceNode, window.OscillatorNode].forEach(C => {
    if (!C || C.prototype.__clipProbed) return;
    C.prototype.__clipProbed = true;
    const o = C.prototype.start;
    C.prototype.start = function(){
      window.__audio.started++;
      try { if (this.buffer && this.buffer.duration) window.__audio.durations.push(this.buffer.duration); } catch (e) {}
      return o.apply(this, arguments);
    };
  });
`;

const STATE = `s => JSON.stringify({
  clips: s.tracks.flatMap(t => (t.audioClips || []).map(c => ({
    id: c.id, track: t.id, assetId: c.assetId, startTick: c.startTick,
    durationTicks: c.durationTicks, origin: c.provenance.origin, edited: c.provenance.creatorEdited,
  }))),
  assets: Object.values(s.audioAssets || {}).map(a => ({
    id: a.id, name: a.name, sampleRate: a.sampleRate, channels: a.channels,
    duration: Math.round(a.durationSeconds * 100) / 100, bytes: a.byteLength,
    sha: a.sha256, origin: a.originType, hasUrl: !!a.url,
  })),
  undoLabel: s.undoLabel,
})`;
const state = async (page) => JSON.parse(await session(page, STATE));

async function openSuite(page, tab) {
  await page.getByRole('button', { name: '🎙️ SONGWRITING SUITE', exact: false }).first().click({ force: true });
  await page.waitForTimeout(1400);
  const panel = page.locator('div.fixed.right-0:has-text("SONGWRITING SUITE")').first();
  const t = panel.getByRole('button', { name: tab, exact: true }).first();
  if (await t.count()) { await t.click({ force: true }); await page.waitForTimeout(900); }
  return panel;
}

(async () => {
  const { browser, page } = await launch(playwright, `${SP}/hum_A4.wav`);
  await enterStudio(page);
  await page.evaluate(PROBE);

  console.log('=== AUDIO ON THE TIMELINE ===\n');

  const start = await state(page);
  check('a project starts with no clips', start.clips.length === 0 && start.assets.length === 0,
        `${start.clips.length} clips, ${start.assets.length} assets`);

  // ---- record a take, then send it to the timeline ----
  const panel = await openSuite(page, '2. TAKES & POOL');
  const rec = panel.locator('[data-testid="record-loop-take"]').first();
  await rec.click({ force: true });
  await page.waitForTimeout(3000);
  await rec.click({ force: true });
  await page.waitForTimeout(2500);

  const takeId = await session(page, `s => {
    const t = s.tracks.find(x => (x.vocalTakes || []).some(v => /^blob:/.test(String(v.sourceAudioId || ''))));
    const v = t && t.vocalTakes.filter(x => /^blob:/.test(String(x.sourceAudioId || ''))).pop();
    return v ? v.id : null;
  }`);
  check('a take with audio was recorded', !!takeId, takeId || 'none');
  if (!takeId) { console.log('\n1 CHECK(S) FAILED'); await browser.close(); process.exit(1); }

  const placeBtn = panel.locator(`[data-testid="place-take-${takeId}"]`).first();
  check('the take offers a timeline control', (await placeBtn.count()) > 0, '');
  await placeBtn.click({ force: true });
  await page.waitForTimeout(2500);

  const placed = await state(page);
  check('an asset was registered', placed.assets.length === 1, JSON.stringify(placed.assets[0] || {}).slice(0, 120));
  check('a clip was placed', placed.clips.length === 1, JSON.stringify(placed.clips[0] || {}));

  const asset = placed.assets[0];
  const clip = placed.clips[0];
  if (!asset || !clip) { console.log('\nFAILED'); await browser.close(); process.exit(1); }

  console.log(`  asset: ${asset.name} · ${asset.duration}s · ${asset.sampleRate}Hz ${asset.channels}ch · ${asset.bytes}B · ${asset.sha.slice(0, 12)}`);

  // ---- the asset must describe the real bytes, not the caller's claim ----
  check('the asset was measured, not asserted', asset.sampleRate >= 8000 && asset.duration > 0.5 && asset.channels >= 1,
        `${asset.sampleRate}Hz, ${asset.duration}s, ${asset.channels}ch`);
  check('the asset hashes its own bytes', /^[0-9a-f]{64}$/.test(asset.sha), `${asset.sha.length} hex chars`);
  const recomputed = await page.evaluate(`(async () => {
    const s = ${require('./lib.cjs').READ_SESSION};
    const a = Object.values(s.audioAssets)[0];
    const buf = await (await fetch(a.url)).arrayBuffer();
    const d = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(d)).map(x => x.toString(16).padStart(2,'0')).join('');
  })()`);
  check('the hash matches the audio it points at', recomputed === asset.sha, `${recomputed.slice(0, 12)} vs ${asset.sha.slice(0, 12)}`);

  // ---- the clip's length must come from the audio ----
  const bpm = await session(page, `s => s.dawState.bpm`);
  const expectedTicks = Math.round((asset.duration * bpm * 480) / 60);
  check('clip length derives from the audio and tempo', Math.abs(clip.durationTicks - expectedTicks) <= 2,
        `${clip.durationTicks} ticks vs ${expectedTicks} expected at ${bpm} BPM`);
  check('the clip is in the note tick domain', clip.startTick % 120 === 0, `startTick ${clip.startTick}`);

  // ---- it must play ----
  // Close the suite by its own trigger: an open drawer sits over the Build
  // room's controls, and a covered control is not a control.
  await page.getByRole('button', { name: '🎙️ SONGWRITING SUITE', exact: false }).first().click({ force: true });
  await page.waitForTimeout(900);
  await page.evaluate('window.__audio.started = 0;');
  await page.locator('#btn-play-pause').first().click({ force: true });
  await page.waitForTimeout(3000);
  const probe = await page.evaluate('({ started: window.__audio.started, durations: window.__audio.durations.slice() })');
  const clipVoice = probe.durations.find((d) => Math.abs(d - asset.duration) < 0.05);
  check('the clip itself plays, not just the sequencer', clipVoice !== undefined,
        `a source of ${clipVoice ? clipVoice.toFixed(2) : '—'}s against an asset of ${asset.duration}s, among ${probe.started} sources`);
  await page.locator('#btn-stop').first().click({ force: true }).catch(() => {});
  await page.waitForTimeout(600);

  // ---- it must move, and the move must undo ----
  await page.getByRole('button', { name: '2. BUILD', exact: false }).first().click({ force: true });
  await page.waitForTimeout(1600);
  const panelPresent = await page.locator('[data-testid="timeline-audio"]').count();
  check('the timeline shows what is on it', panelPresent > 0, '');

  const before = (await state(page)).clips[0];
  await page.locator(`[data-testid="clip-right-${clip.id}"]`).first().click();
  await page.waitForTimeout(800);
  const moved = (await state(page)).clips[0];
  check('a clip moves by a bar', moved.startTick === before.startTick + 1920,
        `${before.startTick} -> ${moved.startTick} ticks`);
  check('and is marked as edited', moved.edited === true, `creatorEdited=${moved.edited}`);

  await page.keyboard.press('Control+z');
  await page.waitForTimeout(800);
  const undone = (await state(page)).clips[0];
  check('the move undoes', undone.startTick === before.startTick, `${undone.startTick} ticks`);

  await page.keyboard.press('Control+z');
  await page.waitForTimeout(800);
  const afterSecondUndo = await state(page);
  check('undoing again removes the clip', afterSecondUndo.clips.length === 0, `${afterSecondUndo.clips.length} clips`);
  check('but keeps the asset', afterSecondUndo.assets.length === 1,
        `${afterSecondUndo.assets.length} asset — the bytes were still recorded`);

  await page.keyboard.press('Control+Shift+z');
  await page.waitForTimeout(800);
  const redone = await state(page);
  check('redo puts it back', redone.clips.length === 1, `${redone.clips.length} clips`);

  // ---- it must survive a reload ----
  await page.waitForTimeout(2500);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(4500);
  await page.evaluate(PROBE);

  const reloaded = await state(page);
  const survivor = reloaded.clips[0];
  const survivingAsset = reloaded.assets[0];
  check('the clip survives a reload', !!survivor && survivor.startTick === before.startTick,
        survivor ? `${survivor.startTick} ticks` : 'gone');
  check('the asset survives with its hash', !!survivingAsset && survivingAsset.sha === asset.sha,
        survivingAsset ? `${survivingAsset.sha.slice(0, 12)}` : 'gone');
  check('and has a fresh, usable url', !!survivingAsset && survivingAsset.hasUrl, '');

  await page.evaluate('window.__audio.started = 0;');
  await page.locator('#btn-play-pause').first().click({ force: true });
  await page.waitForTimeout(3000);
  const probe2 = await page.evaluate('({ started: window.__audio.started, durations: window.__audio.durations.slice() })');
  const restoredVoice = probe2.durations.find((d) => Math.abs(d - asset.duration) < 0.05);
  check('the restored clip itself plays', restoredVoice !== undefined,
        `a source of ${restoredVoice ? restoredVoice.toFixed(2) : '—'}s among ${probe2.started} sources`);
  await page.locator('#btn-stop').first().click({ force: true }).catch(() => {});


  // ---- and it must reach the export ----
  // Pushed past the end of the four-bar note grid first: a bounce sized only by
  // the grid would truncate it, and the check would otherwise pass on a render
  // that was already long enough for other reasons.
  await page.getByRole('button', { name: '2. BUILD', exact: false }).first().click({ force: true });
  await page.waitForTimeout(1500);
  const survivorId = (await state(page)).clips[0].id;
  for (let i = 0; i < 5; i++) {
    await page.locator(`[data-testid="clip-right-${survivorId}"]`).first().click();
    await page.waitForTimeout(350);
  }
  const pushed = (await state(page)).clips[0];
  check('the clip can be pushed past the note grid', pushed.startTick === 9600,
        `startTick ${pushed.startTick} — bar 6`);

  await page.getByRole('button', { name: 'EXPORT', exact: true }).first().click({ force: true });
  await page.waitForTimeout(800);
  await page.locator('[data-testid="render-export-package"]').first().click({ force: true });
  await page.waitForSelector('[data-testid="export-summary"]', { timeout: 240000 });
  await page.waitForTimeout(600);

  const master = await session(page, `s => s.deliveryPackage ? s.deliveryPackage.masters[0].url : null`);
  const rendered = await page.evaluate(`(async (url) => {
    const bytes = await (await fetch(url)).arrayBuffer();
    const ctx = new OfflineAudioContext(1, 1024, 48000);
    const decoded = await ctx.decodeAudioData(bytes);
    return { duration: decoded.duration };
  })(${JSON.stringify('PLACEHOLDER')})`.replace('"PLACEHOLDER"', JSON.stringify(master)));
  const clipEndSeconds = ((pushed.startTick + pushed.durationTicks) * 60) / (bpm * 480);
  const gridSeconds = (64 * 60) / (bpm * 4);
  check('the bounce grows to contain a clip past the grid', rendered.duration >= clipEndSeconds,
        `${rendered.duration.toFixed(2)}s rendered · clip ends at ${clipEndSeconds.toFixed(2)}s · note grid is only ${gridSeconds.toFixed(2)}s`);

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})();
