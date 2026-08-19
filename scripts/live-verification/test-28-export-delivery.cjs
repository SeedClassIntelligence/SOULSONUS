/**
 * Room 6 export: are the files real?
 *
 * Export used to write four lines of text and name it a WAV, and the delivery
 * manifest listed URLs like /export/master_24_48.wav that were never written.
 * This drives the real modal and then inspects the bytes it produced: magic
 * numbers, a decode through the browser's own audio decoder, the ZIP central
 * directory, and the provenance hashes recomputed over the exported bytes.
 */
const playwright = require('playwright');
const { launch, enterStudio, session } = require('./lib.cjs');

let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(48)} ${detail}`);
}

// Runs in the page: fetches an object URL and reports what the bytes actually
// are. Playwright ignores arguments when the evaluated code is a string, so the
// url is interpolated in rather than passed — a silently undefined argument
// here would read as the export having produced nothing.
const INSPECT_FN = `async (url) => {
  const buf = await (await fetch(url)).arrayBuffer();
  const b = new Uint8Array(buf);
  const ascii = (o, n) => String.fromCharCode(...b.slice(o, o + n));
  const digest = await crypto.subtle.digest('SHA-256', buf);
  const sha = Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, '0')).join('');
  let decoded = null;
  if (ascii(0, 4) === 'RIFF') {
    try {
      const ctx = new OfflineAudioContext(2, 1024, 48000);
      const audio = await ctx.decodeAudioData(buf.slice(0));
      const data = audio.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      decoded = { duration: audio.duration, channels: audio.numberOfChannels, rms: Math.sqrt(sum / data.length) };
    } catch (e) { decoded = { error: String(e).slice(0, 80) }; }
  }
  return { bytes: b.length, head: ascii(0, 4), wave: ascii(8, 4), sha, decoded };
}`;

const inspect = (page, url) => page.evaluate(`(${INSPECT_FN})(${JSON.stringify(url)})`);

(async () => {
  const { browser, page } = await launch(playwright, null);
  await enterStudio(page);

  console.log('=== EXPORT DELIVERY ===\n');

  await page.getByRole('button', { name: 'EXPORT', exact: true }).first().click({ force: true });
  await page.waitForTimeout(800);

  const renderBtn = page.locator('[data-testid="render-export-package"]').first();
  check('export modal offers a render', (await renderBtn.count()) > 0, '');
  if (!(await renderBtn.count())) { await browser.close(); process.exit(1); }

  // Nothing should be downloadable before anything is rendered.
  const preFiles = await page.locator('[data-testid^="export-download-"]').count();
  check('nothing offered before rendering', preFiles === 0, `files listed=${preFiles}`);

  await renderBtn.click({ force: true });
  await page.waitForSelector('[data-testid="export-summary"]', { timeout: 180000 }).catch(() => {});
  await page.waitForTimeout(500);

  const summary = await page.locator('[data-testid="export-summary"]').first().innerText().catch(() => '');
  console.log(`  summary: ${summary.replace(/\s+/g, ' ')}`);

  const pkg = await session(page, `s => {
    const p = s.deliveryPackage;
    if (!p) return null;
    return JSON.stringify({
      projectName: p.projectName,
      duration: p.durationSeconds,
      events: p.eventsRendered,
      lufs: p.measurement.integratedLufs,
      masters: p.masters.map(f => ({ name: f.name, url: f.url, bytes: f.byteLength, sha256: f.sha256 })),
      stems: p.stems.map(f => ({ name: f.name, url: f.url, bytes: f.byteLength, track: f.trackName })),
      zip: p.stemsZip ? { name: p.stemsZip.name, url: p.stemsZip.url, bytes: p.stemsZip.byteLength } : null,
      provenance: { name: p.provenance.name, url: p.provenance.url, bytes: p.provenance.byteLength },
      silent: p.silentTracks,
      tpl: p.truePeakLimiting,
    });
  }`);
  check('a package exists in session state', !!pkg, pkg ? '' : 'deliveryPackage is null');
  if (!pkg) { await browser.close(); process.exit(1); }
  const P = JSON.parse(pkg);

  console.log(`  project "${P.projectName}" • ${P.duration.toFixed(1)}s • ${P.events} voices • ${P.lufs} LUFS`);
  console.log(`  stems: ${P.stems.length}   silent (not exported): ${P.silent.join(', ') || 'none'}`);

  check('project name comes from the session', P.projectName !== 'Cyber Groove', `"${P.projectName}"`);
  check('three master formats', P.masters.length === 3, P.masters.map(m => m.name).join(', '));

  // --- the master WAV must be audio, not text with a .wav name ---
  const wav24 = P.masters.find(m => m.name.endsWith('_24bit.wav'));
  const info = await inspect(page, wav24.url);
  check('24-bit master is a RIFF/WAVE file', info.head === 'RIFF' && info.wave === 'WAVE', `head=${info.head} form=${info.wave} bytes=${info.bytes}`);
  check('24-bit master decodes as audio', !!info.decoded && !info.decoded.error && info.decoded.duration > 1,
        info.decoded && !info.decoded.error ? `${info.decoded.duration.toFixed(2)}s ${info.decoded.channels}ch rms=${info.decoded.rms.toFixed(4)}` : JSON.stringify(info.decoded));
  check('24-bit master is not silent', !!info.decoded && info.decoded.rms > 0.0005, info.decoded ? `rms=${info.decoded.rms.toFixed(5)}` : 'no decode');
  check('recorded hash matches the bytes', info.sha === wav24.sha256, `${info.sha.slice(0, 16)}… vs ${wav24.sha256.slice(0, 16)}…`);

  const flac = P.masters.find(m => m.name.endsWith('.flac'));
  const flacInfo = await inspect(page, flac.url);
  check('FLAC master carries the fLaC marker', flacInfo.head === 'fLaC', `head=${flacInfo.head} bytes=${flacInfo.bytes}`);

  // --- stems ---
  check('one stem per track that made sound', P.stems.length > 0, `${P.stems.length} stems`);
  if (P.stems.length) {
    const stem = P.stems[0];
    const stemInfo = await inspect(page, stem.url);
    check('first stem decodes as audio', !!stemInfo.decoded && !stemInfo.decoded.error && stemInfo.decoded.rms > 0,
          `${stem.track}: ${stemInfo.decoded && !stemInfo.decoded.error ? stemInfo.decoded.duration.toFixed(2) + 's rms=' + stemInfo.decoded.rms.toFixed(4) : JSON.stringify(stemInfo.decoded)}`);
    // A stem must not be the whole mix: the master should be louder than one part.
    const masterRms = info.decoded.rms;
    check('a stem is quieter than the full master', stemInfo.decoded.rms < masterRms,
          `stem=${stemInfo.decoded.rms.toFixed(4)} master=${masterRms.toFixed(4)}`);
  }

  // --- zip ---
  if (P.zip) {
    const zipInfo = await page.evaluate(`(async (url) => {
      const b = new Uint8Array(await (await fetch(url)).arrayBuffer());
      const ascii = (o, n) => String.fromCharCode(...b.slice(o, o + n));
      // Count central directory records; that is what a reader uses to list files.
      let entries = 0;
      for (let i = 0; i < b.length - 4; i++) {
        if (b[i] === 0x50 && b[i+1] === 0x4b && b[i+2] === 0x01 && b[i+3] === 0x02) entries++;
      }
      return { head: ascii(0, 4) === 'PK\\u0003\\u0004', bytes: b.length, entries };
    })(${JSON.stringify(P.zip.url)})`);
    check('stems zip has a local file header', zipInfo.head, `bytes=${zipInfo.bytes}`);
    check('zip lists every stem', zipInfo.entries === P.stems.length, `central records=${zipInfo.entries} stems=${P.stems.length}`);
  } else {
    check('stems zip produced', false, 'no zip in package');
  }

  // --- provenance ---
  const prov = await page.evaluate(`(async (url) => JSON.parse(await (await fetch(url)).text()))(${JSON.stringify(P.provenance.url)})`);
  check('provenance parses as JSON', !!prov && typeof prov === 'object', `${P.provenance.bytes} bytes`);
  const recorded = (prov.files || []).find(f => f.name === wav24.name);
  check('provenance hashes the exported bytes', !!recorded && recorded.sha256 === info.sha,
        recorded ? `${recorded.sha256.slice(0, 16)}… over ${recorded.bytes} bytes` : 'master not listed');
  check('provenance carries the real measurement', prov.loudness && prov.loudness.integratedLufs === P.lufs,
        prov.loudness ? `${prov.loudness.integratedLufs} LUFS, ${prov.loudness.truePeakDbtp} dBTP` : 'missing');
  check('provenance names no invented URLs', !JSON.stringify(prov).includes('/export/'), '');

  // --- the ceiling the chain advertises must be the ceiling the file respects ---
  const ceiling = await session(page, `s => s.masteringChain.targetDbtp`);
  console.log(`  true-peak stage: ${P.tpl ? `${P.tpl.inputTruePeakDbtp} -> ${P.tpl.outputTruePeakDbtp} dBTP, -${P.tpl.maxGainReductionDb} dB` : 'bypassed'}`);
  check('exported master respects the dBTP ceiling', P.lufs !== undefined && Number(prov.loudness.truePeakDbtp) <= ceiling + 0.05,
        `${prov.loudness.truePeakDbtp} dBTP against a ${ceiling} dBTP ceiling`);
  check('the limiter reports staying within the ceiling', !!P.tpl && P.tpl.withinCeiling,
        P.tpl ? `after ${P.tpl.maxGainReductionDb} dB of reduction` : 'no limiting reported');
  check('reduction is proportionate to the overshoot', !!P.tpl && P.tpl.maxGainReductionDb < (P.tpl.inputTruePeakDbtp - ceiling) + 1.5,
        P.tpl ? `-${P.tpl.maxGainReductionDb} dB for ${(P.tpl.inputTruePeakDbtp - ceiling).toFixed(2)} dB over` : '');

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})();
