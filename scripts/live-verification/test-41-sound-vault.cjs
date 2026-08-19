/**
 * Choosing a sound changes the sound.
 *
 * The vault browser listed sixteen presets with frequency ranges and character
 * descriptions, and committing one renamed the track. Nothing else. The panel
 * above it read "LIVE IN-CONTEXT AUDITION (SONG LOOPING)" over a pulsing play
 * icon and constructed no audio nodes at all, so a creator could pick "90s
 * BoomBap Gritty Kick" over "Analog 909 Tight Dance Kick" and get the same
 * kick with a different label.
 *
 * This drives the real vault and checks the three things that decide whether
 * it is a browser or a catalogue: does auditioning make a sound, does
 * committing change the channel, and do two presets differ in the render.
 */
const playwright = require('playwright');
const { launch, enterStudio, session } = require('./lib.cjs');

let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(54)} ${detail}`);
}

const KICK = `s => JSON.stringify((() => {
  const t = s.tracks.find(x => x.id === 't-kick') || {};
  return { name: t.name, pitch: t.pitch, dsp: t.dspSettings || null, undoLabel: s.undoLabel };
})())`;
const kick = async (page) => JSON.parse(await session(page, KICK));

/** Counts source nodes actually started, so a silent audition cannot pass. */
const STARTED = `(() => {
  const ctx = window.__auditionCtx;
  return ctx ? ctx.started : 0;
})()`;

async function openVault(page) {
  await page.evaluate(`window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'workstation' }))`);
  await page.waitForTimeout(1500);
  // The strip opens collapsed; the VAULT badge expands it straight to the tab.
  const open = page.locator('[data-testid="open-sound-vault"]').first();
  if (await open.count()) {
    await open.scrollIntoViewIfNeeded();
    await open.click();
    await page.waitForTimeout(700);
  }
  const tab = page.locator('[data-testid="tab-sound-vault"]').first();
  await tab.scrollIntoViewIfNeeded();
  await tab.click();
  await page.waitForTimeout(700);
}

(async () => {
  const { browser, page } = await launch(playwright, null);
  await enterStudio(page);

  console.log('=== THE SOUND VAULT ===\n');

  // Count every source that actually starts, from before anything is clicked.
  await page.evaluate(`(() => {
    window.__auditionCtx = { started: 0 };
    const proto = (window.AudioBufferSourceNode && window.AudioBufferSourceNode.prototype);
    const osc = (window.OscillatorNode && window.OscillatorNode.prototype);
    for (const p of [proto, osc]) {
      if (!p) continue;
      const orig = p.start;
      p.start = function (...a) { window.__auditionCtx.started++; return orig.apply(this, a); };
    }
  })()`);

  await openVault(page);

  const before = await kick(page);
  check('the vault is reachable', true, `focused on ${before.name}`);

  const cards = await page.locator('[data-testid^="vault-sound-snd_k"]').count();
  check('kick presets are listed', cards >= 4, `${cards} presets`);

  // ---- 1. auditioning makes a sound ----
  console.log('\n-- auditioning --');
  const startedBefore = await page.evaluate(STARTED);
  await page.locator('[data-testid="vault-sound-snd_k3"]').first().click();
  await page.waitForTimeout(1500);
  const startedAfter = await page.evaluate(STARTED);
  check(
    'auditioning a preset starts real audio sources',
    startedAfter > startedBefore,
    `${startedAfter - startedBefore} sources started — the old panel started 0`
  );

  const midAudition = await kick(page);
  check(
    'and does not commit anything yet',
    midAudition.name === before.name,
    `track still named ${midAudition.name}`
  );

  // ---- 2. committing changes the channel ----
  console.log('\n-- committing --');
  await page.locator('[data-testid="commit-sound"]').first().click();
  await page.waitForTimeout(1200);
  const boombap = await kick(page);
  check('the track takes the preset name', /BoomBap/i.test(boombap.name || ''), boombap.name);
  check(
    'and the channel settings actually changed',
    JSON.stringify(boombap.dsp) !== JSON.stringify(before.dsp),
    `filterFreq ${before.dsp?.filterFreq ?? '—'} → ${boombap.dsp?.filterFreq}, highGain ${before.dsp?.highGain ?? '—'} → ${boombap.dsp?.highGain}`
  );

  // ---- 3. two presets are two sounds ----
  console.log('\n-- two presets are two sounds --');
  await page.locator('[data-testid="vault-sound-snd_k4"]').first().click();
  await page.waitForTimeout(600);
  await page.locator('[data-testid="commit-sound"]').first().click();
  await page.waitForTimeout(1200);
  const nineOhNine = await kick(page);
  check('the second preset lands', /909/.test(nineOhNine.name || ''), nineOhNine.name);
  check(
    'and it is a different channel from the first',
    nineOhNine.dsp.filterFreq !== boombap.dsp.filterFreq && nineOhNine.dsp.highGain !== boombap.dsp.highGain,
    `boombap ${boombap.dsp.filterFreq}Hz / ${boombap.dsp.highGain}dB air · 909 ${nineOhNine.dsp.filterFreq}Hz / ${nineOhNine.dsp.highGain}dB air`
  );

  // ---- 4. it reaches the render ----
  console.log('\n-- it reaches the render --');
  const measure = async () =>
    page.evaluate(`(async () => {
      const root = document.getElementById('root');
      const key = Object.keys(root).find(k => k.startsWith('__reactContainer$'));
      const fiberRoot = root[key] && root[key].stateNode;
      const stack = [(fiberRoot && fiberRoot.current) || root[key]]; const seen = new Set();
      let ctx = null;
      while (stack.length) {
        const f = stack.pop(); if (!f || seen.has(f)) continue; seen.add(f);
        const v = f.memoizedProps && f.memoizedProps.value;
        if (v && Array.isArray(v.tracks) && v.handleAnalyzeMaster) { ctx = v; break; }
        if (f.child) stack.push(f.child); if (f.sibling) stack.push(f.sibling);
      }
      const m = await ctx.handleAnalyzeMaster();
      return { lufs: m.integratedLufs, peak: m.samplePeakDbfs };
    })()`);

  const with909 = await measure();
  await page.locator('[data-testid="vault-sound-snd_k1"]').first().click();
  await page.waitForTimeout(600);
  await page.locator('[data-testid="commit-sound"]').first().click();
  await page.waitForTimeout(1200);
  const with808 = await measure();
  check(
    'a different kick sound renders differently',
    Math.abs(with909.lufs - with808.lufs) > 0.05 || Math.abs(with909.peak - with808.peak) > 0.05,
    `909 ${with909.lufs} LUFS / ${with909.peak} dBFS · 808 sub ${with808.lufs} LUFS / ${with808.peak} dBFS`
  );

  // ---- 5. it is one undo ----
  console.log('\n-- and it is undoable --');
  const committed = await kick(page);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(1000);
  const undone = await kick(page);
  check(
    'one undo takes back the name',
    undone.name !== committed.name,
    `"${committed.name}" → "${undone.name}"`
  );
  check(
    'and the channel goes back with it',
    undone.dsp?.filterFreq !== committed.dsp?.filterFreq,
    `filterFreq ${committed.dsp?.filterFreq} → ${undone.dsp?.filterFreq}`
  );

  console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})();
