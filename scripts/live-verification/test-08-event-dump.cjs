/** Dumps every classified capture event's features, to size the rejection guards. */
const playwright = require('playwright');
const { launch, enterStudio, armCapture } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

(async () => {
  for (const [modality, clip] of [['BEATBOX', 'beatbox_ks.wav'], ['CLAP_TAP', 'body_taps.wav']]) {
    const { browser, page } = await launch(playwright, `${SP}/${clip}`);
    await enterStudio(page);
    const t0 = await page.evaluate('Date.now()');
    await armCapture(page, modality);
    await page.locator('button[title="Play (Space)"]').first().click().catch(() => {});
    await page.waitForTimeout(11000);
    const events = await page.evaluate(`(() => {
      const buf = window.__soulsonusCaptureEvents || [];
      return buf.map(e => ({
        k: e.klass, c: +e.confidence.toFixed(3), se: +e.spectralEnergy.toFixed(4),
        rms: +e.rms.toFixed(4), cen: Math.round(e.centroidHz), bp: +e.bandPeak.toFixed(3), t: e.atMs }));
    })()`);
    console.log(`\n=== ${clip} — ${events.length} events ===`);
    const byClass = {};
    for (const e of events) (byClass[e.k] = byClass[e.k] || []).push(e);
    for (const [k, list] of Object.entries(byClass)) {
      const se = list.map(e => e.se), rms = list.map(e => e.rms), cen = list.map(e => e.cen);
      console.log(`  ${k.padEnd(10)} n=${String(list.length).padEnd(3)} spectralEnergy ${Math.min(...se).toFixed(4)}..${Math.max(...se).toFixed(4)}  rms ${Math.min(...rms).toFixed(4)}..${Math.max(...rms).toFixed(4)}  centroid ${Math.min(...cen)}..${Math.max(...cen)}`);
    }
    const odd = events.filter(e => byClass[e.k].length <= 2);
    for (const e of odd) console.log(`  OUTLIER ${JSON.stringify(e)}  (+${e.t - t0}ms after load)`);
    await browser.close();
  }
})();
