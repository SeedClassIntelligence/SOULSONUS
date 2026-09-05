/**
 * The INSTRUMENT route plays a real sound bank.
 *
 * `soundfontEngine.ts` claimed to be a "SpessaSynth Core SF2 Instrument
 * Realizer". It never imported spessasynth_core. `initialize()` logged
 * "Initializing SpessaSynth Core" and set a boolean; `setProgram()` logged
 * "Loaded SF2 Instrument" having loaded nothing; its six presets — "Concert
 * Grand Piano", "Vintage Rhodes Electric Piano" — all pointed at
 * `/soundfonts/general_midi.sf2`, a file that is not in this repository; and
 * `playNote()` was two oscillators through a biquad filter. A synth wearing a
 * sampler's name, which is exactly the distinction the INSTRUMENT route exists
 * to make against the SYNTH route.
 *
 * This drives the real panel: no bank, then a real .sf2, then a render, and
 * checks the audio that lands on the timeline came from the file.
 */
const playwright = require('playwright');
const { launch, enterStudio, session, seedMelody } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(52)} ${detail}`);
}

const STATE = `s => JSON.stringify({
  bank: s.loadedSoundBank,
  clips: s.tracks.flatMap(t => (t.audioClips || []).map(c => ({ track: t.id, id: c.id, startTick: c.startTick, assetId: c.assetId }))),
  assets: Object.values(s.audioAssets || {}).map(a => ({
    id: a.id, name: a.name, origin: a.originType, seconds: a.durationSeconds, peaks: (a.peaks || []).length,
  })),
  melodyNotes: (s.tracks.find(t => t.id === 't-melody') || {}).noteEvents?.length || 0,
  undoLabel: s.undoLabel,
})`;
const state = async (page) => JSON.parse(await session(page, STATE));

async function openVault(page) {
  await page.evaluate(`window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'workstation' }))`);
  await page.waitForTimeout(1500);
  const open = page.locator('[data-testid="open-sound-vault"]').first();
  if (await open.count()) { await open.scrollIntoViewIfNeeded(); await open.click(); await page.waitForTimeout(600); }
  const tab = page.locator('[data-testid="tab-sound-vault"]').first();
  await tab.scrollIntoViewIfNeeded();
  await tab.click();
  await page.waitForTimeout(600);
}

(async () => {
  const { browser, page } = await launch(playwright, null);
  await enterStudio(page);

  console.log('=== THE SAMPLED INSTRUMENT ROUTE ===\n');

  // Focus a track that has notes to render.
  await page.evaluate(`(() => {
    const root = document.getElementById('root');
    const key = Object.keys(root).find(k => k.startsWith('__reactContainer$'));
    const fiberRoot = root[key] && root[key].stateNode;
    const stack = [(fiberRoot && fiberRoot.current) || root[key]]; const seen = new Set();
    while (stack.length) {
      const f = stack.pop(); if (!f || seen.has(f)) continue; seen.add(f);
      const v = f.memoizedProps && f.memoizedProps.value;
      if (v && Array.isArray(v.tracks) && v.setSelectionContext) {
        v.setSelectionContext({ ...v.selectionContext, selectedTrackId: 't-melody' });
        return;
      }
      if (f.child) stack.push(f.child); if (f.sibling) stack.push(f.sibling);
    }
  })()`);
  // The melody channel arrives with no notes, so the render had nothing to
  // render and every check below read as a broken sound bank.
  await seedMelody(page);
  await page.waitForTimeout(600);
  await openVault(page);

  const before = await state(page);
  check('the panel is reachable', (await page.locator('[data-testid="load-sound-bank"]').count()) === 1, 'LOAD .SF2');
  check('no sound bank is loaded to begin with', before.bank === null, `${before.bank ? before.bank.name : 'none'}`);
  check('the melody track has notes to render', before.melodyNotes > 0, `${before.melodyNotes} notes`);

  // ---- 1. rendering with no bank refuses, and says what to do ----
  console.log('\n-- with no bank --');
  await page.locator('[data-testid="render-with-sound-bank"]').first().click();
  await page.waitForTimeout(1500);
  const err = await page.locator('[data-testid="sound-bank-error"]').first().innerText().catch(() => '');
  check(
    'it refuses rather than playing an oscillator',
    /No sound bank is loaded/.test(err),
    err.replace(/\s+/g, ' ').slice(0, 66)
  );
  const afterRefusal = await state(page);
  check('and nothing landed on the timeline', afterRefusal.clips.length === before.clips.length, `${afterRefusal.clips.length} clips`);

  // ---- 2. a real file loads, and its presets come from the file ----
  console.log('\n-- loading a real .sf2 --');
  await page.locator('#root input[type="file"][accept*="sf2"]').first().setInputFiles(`${SP}/sample_bank.sf2`);
  await page.waitForTimeout(1500);
  const loaded = await state(page);
  check('the bank loads', !!loaded.bank, loaded.bank ? `${loaded.bank.name}, ${loaded.bank.byteLength} bytes` : 'none');
  check(
    'its presets were read out of the file',
    (loaded.bank?.presets || []).length > 0,
    (loaded.bank?.presets || []).map((p) => `${p.name} (${p.program})`).join(', ')
  );
  check(
    'not the six names the old engine invented',
    !(loaded.bank?.presets || []).some((p) => /Concert Grand Piano|Vintage Rhodes/.test(p.name)),
    'no hand-written preset names'
  );
  const options = await page.locator('[data-testid="sound-bank-preset"] option').allInnerTexts();
  check('and the picker shows them', options.some((o) => /Saw Wave/.test(o)), options.join(' | ').slice(0, 60));

  // ---- 3. rendering puts real audio on the timeline ----
  console.log('\n-- rendering the track --');
  await page.locator('[data-testid="render-with-sound-bank"]').first().click();
  let after = loaded;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000);
    after = await state(page);
    if (after.clips.length > before.clips.length) break;
  }
  const notice = await page.locator('[data-testid="sound-bank-notice"]').first().innerText().catch(() => '');
  check('a clip lands on the track', after.clips.length > before.clips.length, `${after.clips.length} clips · "${notice.replace(/\s+/g, ' ').slice(0, 54)}"`);

  const newAsset = after.assets.find((a) => !before.assets.some((b) => b.id === a.id));
  check('it is backed by a real asset', !!newAsset, newAsset ? `${newAsset.name}` : 'none');
  if (newAsset) {
    check('the asset is marked as generated', newAsset.origin === 'GENERATED', `originType=${newAsset.origin}`);
    check('with real duration', newAsset.seconds > 0.5, `${newAsset.seconds.toFixed(2)}s`);
    check(
      'and a waveform taken from the audio',
      newAsset.peaks > 0,
      `${newAsset.peaks} peak points — a silent render would have none above zero`
    );
    check(
      'the name says which preset made it',
      /Saw Wave/.test(newAsset.name),
      newAsset.name
    );
  }

  // ---- 4. the audio is not silence ----
  console.log('\n-- and it is audible --');
  const level = await page.evaluate(`(async () => {
    const root = document.getElementById('root');
    const key = Object.keys(root).find(k => k.startsWith('__reactContainer$'));
    const fiberRoot = root[key] && root[key].stateNode;
    const stack = [(fiberRoot && fiberRoot.current) || root[key]]; const seen = new Set();
    let ctx = null;
    while (stack.length) {
      const f = stack.pop(); if (!f || seen.has(f)) continue; seen.add(f);
      const v = f.memoizedProps && f.memoizedProps.value;
      if (v && Array.isArray(v.tracks) && v.audioAssets) { ctx = v; break; }
      if (f.child) stack.push(f.child); if (f.sibling) stack.push(f.sibling);
    }
    const asset = Object.values(ctx.audioAssets).filter(a => a.originType === 'GENERATED').pop();
    if (!asset) return { rms: 0, peak: 0 };
    const buf = await fetch(asset.url).then(r => r.arrayBuffer());
    const AC = window.AudioContext || window.webkitAudioContext;
    const decoded = await new AC().decodeAudioData(buf);
    const d = decoded.getChannelData(0);
    let s = 0, p = 0;
    for (let i = 0; i < d.length; i++) { s += d[i]*d[i]; p = Math.max(p, Math.abs(d[i])); }
    return { rms: Math.sqrt(s/d.length), peak: p, seconds: decoded.duration };
  })()`);
  check(
    'the rendered audio is not silence',
    level.rms > 0.0005,
    `rms ${level.rms.toFixed(5)} · peak ${level.peak.toFixed(4)} over ${(level.seconds || 0).toFixed(2)}s`
  );

  // ---- 5. it is one undo ----
  console.log('\n-- and it is undoable --');
  check('the render is named in the history', /Render/.test(after.undoLabel || ''), `undoLabel="${after.undoLabel}"`);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(1200);
  const undone = await state(page);
  check('one undo removes the clip', undone.clips.length === before.clips.length, `${undone.clips.length} clips`);
  check(
    'but keeps the asset',
    undone.assets.length === after.assets.length,
    `${undone.assets.length} assets — the audio was still rendered, and can be placed again`
  );

  console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})();
