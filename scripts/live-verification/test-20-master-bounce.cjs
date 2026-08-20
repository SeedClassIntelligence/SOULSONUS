/**
 * 0.1 / 0.2 / 0.3 together: is the Master room measuring a real bounce, do the
 * mastering stages change that measurement, and does export produce real audio?
 *
 * This suite printed PASS and FAIL and then exited 0 either way, so a
 * regression here would have been visible only to whoever read the output --
 * and invisible to anything that runs it automatically. It counts failures
 * now and exits on the count, and the export section asserts rather than
 * reporting: an export is checked for its container's magic bytes and a
 * plausible size, because `ok=true` over a zero-byte file is exactly the kind
 * of pass this project keeps finding.
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

let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures++;
  console.log(`  ${label.padEnd(42)} ${detail}   ${ok ? 'PASS' : 'FAIL'}`);
}

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
  check('differs from the old hardcoded -14.1 / -1.0', !literals, literals ? 'still the literals' : 'measured');
  check('is a finite measurement', Number.isFinite(base.integratedLufs), `${base.integratedLufs} LUFS`);

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
    check(label, changed, `${field} ${before[field]} -> ${after[field]}`);
  }

  // 0.2 — does export produce real encoded audio?
  console.log('\n-- 0.2 real encoded export --');
  // The container's own magic bytes, so a file that says .flac and holds a
  // WAV is caught. The size floor is a second of 16-bit stereo at 44.1 kHz --
  // far below any real bounce of this project, and far above an empty file.
  const MAGIC = { WAV_24: 'RIFF', WAV_16: 'RIFF', FLAC: 'fLaC' };
  const MIN_BYTES = 176400;
  for (const fmt of ['WAV_24', 'WAV_16', 'FLAC']) {
    const r = await page.evaluate(`window.__studio().handleBounceMaster(${JSON.stringify(fmt)})`);
    const head = r.url ? await page.evaluate(`(async () => {
      const b = await (await fetch(${JSON.stringify(r.url)})).arrayBuffer();
      const u = new Uint8Array(b.slice(0, 4));
      return { magic: String.fromCharCode(...u), bytes: b.byteLength };
    })()`) : null;
    check(
      `${fmt} exports a real ${MAGIC[fmt]} file`,
      r.ok === true && !!head && head.magic === MAGIC[fmt] && head.bytes >= MIN_BYTES,
      `${r.fileName || 'no file'} · ${head ? head.bytes : 0} bytes · magic ${head ? JSON.stringify(head.magic) : '-'}`
    );
    console.log(`          ${r.message}`);
  }

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})();
