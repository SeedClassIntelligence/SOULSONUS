/**
 * 0.1 / 0.2 / 0.3 together: is the Master room measuring a real bounce, do the
 * mastering stages change that measurement, and does export produce real audio?
 */
const playwright = require('playwright');
const { launch, enterStudio, session } = require('./lib.cjs');

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

const analyze = (page) => page.evaluate('window.__studio().handleAnalyzeMaster()');
const setSlot = (page, type, params) => page.evaluate(`(() => {
  const s = window.__studio();
  const slot = s.masteringChain.slots.find(x => x.type === ${JSON.stringify(type)});
  s.handleUpdateMasteringProcessor(slot.id, ${JSON.stringify(params)});
})()`);

(async () => {
  const { browser, page } = await launch(playwright, null);
  await enterStudio(page);
  await page.evaluate(STUDIO);
  console.log('=== MASTER BOUNCE, MEASUREMENT & EXPORT ===\n');

  // 0.1 — is anything actually measured?
  const base = await analyze(page);
  console.log('-- 0.1 real measurement of a real bounce --');
  console.log(`  integrated ${base.integratedLufs} LUFS   samplePeak ${base.samplePeakDbfs} dBFS   truePeak ${base.truePeakDbtp} dBTP`);
  console.log(`  shortTerm ${base.shortTermLufs}   momentary ${base.momentaryLufs}   crest ${base.crestFactorDb} dB   phase ${base.phaseCorrelation}`);
  const literals = base.integratedLufs === -14.1 && base.truePeakDbtp === -1.0;
  console.log(`  differs from the old hardcoded -14.1 / -1.0 : ${literals ? 'FAIL (still the literals)' : 'PASS'}`);
  console.log(`  is a finite measurement                     : ${Number.isFinite(base.integratedLufs) ? 'PASS' : 'FAIL'}`);

  // 0.3 — do the stages change the measured result?
  console.log('\n-- 0.3 do the seven stages change the audio? --');
  const cases = [
    ['true_peak_limiter ceiling -1 -> -12 dB', 'true_peak_limiter', { ceilingDbtp: -12 }, 'samplePeakDbfs'],
    ['bus_comp makeup +0 -> +9 dB', 'bus_comp', { makeupDb: 9 }, 'integratedLufs'],
    ['corrective_eq high-pass 28 -> 2000 Hz', 'corrective_eq', { lowCutHz: 2000 }, 'integratedLufs'],
    ['saturation drive 18 -> 95', 'saturation', { drive: 95 }, 'integratedLufs'],
    ['stereo width 115% -> 200% (wide)', 'stereo_ms', { sideWidthPercent: 200 }, 'phaseCorrelation'],
  ];
  for (const [label, type, params, field] of cases) {
    const before = await analyze(page);
    await setSlot(page, type, params);
    await page.waitForTimeout(400);
    const after = await analyze(page);
    const changed = Math.abs(after[field] - before[field]) > 0.05;
    console.log(`  ${label.padEnd(42)} ${field} ${before[field]} -> ${after[field]}   ${changed ? 'PASS' : 'FAIL — no effect'}`);
  }

  // 0.2 — does export produce real encoded audio?
  console.log('\n-- 0.2 real encoded export --');
  for (const fmt of ['WAV_24', 'WAV_16', 'FLAC']) {
    const r = await page.evaluate(`window.__studio().handleBounceMaster(${JSON.stringify(fmt)})`);
    const head = r.url ? await page.evaluate(`(async () => {
      const b = await (await fetch(${JSON.stringify(r.url)})).arrayBuffer();
      const u = new Uint8Array(b.slice(0, 4));
      return { magic: String.fromCharCode(...u), bytes: b.byteLength };
    })()`) : null;
    console.log(`  ${fmt.padEnd(7)} ok=${r.ok} file=${r.fileName || '-'} size=${r.sizeBytes || 0} magic=${head ? JSON.stringify(head.magic) : '-'}`);
    console.log(`          ${r.message}`);
  }

  await browser.close();
})();
