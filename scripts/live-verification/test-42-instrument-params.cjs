/**
 * Twelve controls that wrote a number and changed nothing.
 *
 * `Track.instrumentParams` was read by no file in `src/audio`. The whole
 * SYNTH/TIMBRE panel of the track workstation — attack, decay, sustain,
 * release, filter, drive, glide, sub weight, brightness — wrote state that
 * reached no audio node, sitting directly beside channel-strip controls that
 * do. Half a working drawer, with nothing on screen to tell the halves apart.
 *
 * Each check below solos one track, renders the project twice with one
 * parameter moved, and measures the difference. A control that changes nothing
 * fails here, which is the only way to know the wiring is real rather than
 * present.
 */
const playwright = require('playwright');
const { launch, enterStudio } = require('./lib.cjs');

let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(50)} ${detail}`);
}

const STUDIO = `window.__studio = () => {
  const root = document.getElementById('root');
  const key = Object.keys(root).find(k => k.startsWith('__reactContainer$'));
  const fiberRoot = root[key] && root[key].stateNode;
  const stack = [(fiberRoot && fiberRoot.current) || root[key]]; const seen = new Set();
  while (stack.length) {
    const f = stack.pop(); if (!f || seen.has(f)) continue; seen.add(f);
    const v = f.memoizedProps && f.memoizedProps.value;
    if (v && Array.isArray(v.tracks) && v.handleAnalyzeMaster) return v;
    if (f.child) stack.push(f.child); if (f.sibling) stack.push(f.sibling);
  }
  throw new Error('ctx not found');
}`;

const solo = (page, id) => page.evaluate(`(() => {
  const s = window.__studio();
  s.tracks.forEach(t => { if (t.solo && t.id !== ${JSON.stringify(id)}) s.handleToggleSolo(t.id); });
  const t = s.tracks.find(x => x.id === ${JSON.stringify(id)});
  if (t && !t.solo) s.handleToggleSolo(t.id);
})()`);

const setParams = (page, id, params) => page.evaluate(`(() => {
  const s = window.__studio();
  const t = s.tracks.find(x => x.id === ${JSON.stringify(id)});
  s.handleUpdateTrack(${JSON.stringify(id)}, { instrumentParams: { ...(t.instrumentParams || {}), ...${JSON.stringify(params)} } });
})()`);

const measure = (page) => page.evaluate(`window.__studio().handleAnalyzeMaster()`);

/**
 * Moves one parameter and reports what moved in the render.
 *
 * Compares integrated loudness and crest factor: a change in either is a
 * change in the audio. Comparing only loudness would miss a control that
 * reshapes an envelope without moving the average level.
 */
async function moves(page, label, trackId, key, from, to, detailFn) {
  await solo(page, trackId);
  await setParams(page, trackId, { [key]: from });
  await page.waitForTimeout(300);
  const a = await measure(page);
  await setParams(page, trackId, { [key]: to });
  await page.waitForTimeout(300);
  const b = await measure(page);
  const dLufs = Math.abs(b.integratedLufs - a.integratedLufs);
  const dCrest = Math.abs((b.crestFactorDb ?? 0) - (a.crestFactorDb ?? 0));
  const changed = dLufs > 0.1 || dCrest > 0.1;
  check(
    label,
    changed,
    detailFn
      ? detailFn(a, b)
      : `${from} → ${to}: ${a.integratedLufs} → ${b.integratedLufs} LUFS, crest ${a.crestFactorDb} → ${b.crestFactorDb} dB`
  );
  return { a, b };
}

(async () => {
  const { browser, page } = await launch(playwright, null);
  await enterStudio(page);
  await page.evaluate(STUDIO);

  console.log('=== THE INSTRUMENT PANEL ===\n');

  console.log('-- the amplitude envelope --');
  await moves(page, 'kick decay changes the render', 't-kick', 'decay', 650, 40);
  await moves(page, 'kick attack changes the render', 't-kick', 'attack', 1, 200);
  await moves(page, 'melody release changes the render', 't-melody', 'release', 320, 1500);
  await moves(page, 'melody sustain changes the render', 't-melody', 'sustain', 75, 5);

  console.log('\n-- timbre --');
  await moves(page, 'kick sub weight changes the render', 't-kick', 'subWeight', 3.5, -6);
  await moves(page, 'melody brightness changes the render', 't-melody', 'timbreBrightness', 45, 100);
  await moves(page, 'hi-hat brightness changes the render', 't-hat', 'timbreBrightness', 45, 100);
  await moves(page, 'bass filter cutoff changes the render', 't-bass', 'filterCutoff', 12400, 200);

  console.log('\n-- drive, which had no distortion to move --');
  await moves(page, 'drive changes the render', 't-bass', 'drive', 0, 95);

  console.log('\n-- expression scales the whole track --');
  const exp = await moves(page, 'expression changes the render', 't-melody', 'expression', 100, 30);
  check(
    'and it scales down, not arbitrarily',
    exp.b.integratedLufs < exp.a.integratedLufs,
    `${exp.a.integratedLufs} → ${exp.b.integratedLufs} LUFS at 30% expression`
  );

  console.log('\n-- an untouched parameter changes nothing --');
  {
    await solo(page, 't-kick');
    // The solo has to land before the first measurement, or this compares two
    // different soloed tracks and calls the difference a parameter change.
    await page.waitForTimeout(400);
    const a = await measure(page);
    await setParams(page, 't-kick', {});
    await page.waitForTimeout(300);
    const b = await measure(page);
    check(
      'writing no change renders identically',
      Math.abs(b.integratedLufs - a.integratedLufs) < 0.05,
      `${a.integratedLufs} → ${b.integratedLufs} LUFS — a test that passes on noise would pass here`
    );
  }

  console.log('\n-- controls that reach nothing on this voice say so --');
  {
    const state = await page.evaluate(`(() => {
      const s = window.__studio();
      s.setSelectionContext({ ...s.selectionContext, selectedTrackId: 't-kick' });
      return true;
    })()`);
    void state;
    await page.evaluate(`window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'workstation' }))`);
    await page.waitForTimeout(1400);
    const open = page.locator('[data-testid="open-sound-vault"]').first();
    if (await open.count()) { await open.click(); await page.waitForTimeout(500); }
    const timbre = page.getByRole('button', { name: /PUNCH|TIMBRE/, exact: false }).first();
    if (await timbre.count()) { await timbre.click(); await page.waitForTimeout(600); }

    const disabled = await page.evaluate(`(() => {
      const rows = [...document.querySelectorAll('input[type="range"]')];
      return { total: rows.length, off: rows.filter(r => r.disabled).length,
               titles: [...new Set(rows.filter(r => r.disabled).map(r => r.title))].slice(0, 2) };
    })()`);
    check(
      'inactive controls are disabled, with a reason',
      disabled.off > 0 && disabled.titles.every((t) => /Not a control on this voice/.test(t || '')),
      `${disabled.off} of ${disabled.total} disabled · e.g. "${(disabled.titles[0] || '').slice(0, 62)}"`
    );
  }

  console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})();
