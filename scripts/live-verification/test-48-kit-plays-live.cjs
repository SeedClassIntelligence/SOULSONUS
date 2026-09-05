/**
 * The kit plays, rather than only rendering.
 *
 * The factory kit could be rendered onto the timeline — notes in, an audio
 * clip out. That is what a sampler does and it is not what an instrument
 * does: a creator beatboxing over their track heard the synthesised kick
 * while the sampled one existed only after a render, which makes the good
 * sound something you commit to rather than something you play.
 *
 * Two things have to be true and they are separate claims. The kit has to
 * sound under the transport, and it has to survive the bounce — a voice that
 * plays live and vanishes from the export makes the file a different piece of
 * music from the one that was heard.
 */
const playwright = require('playwright');
const { launch, enterStudio, session, seedPattern } = require('./lib.cjs');

let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(52)} ${detail}`);
}

/**
 * Counts what actually starts.
 *
 * `AudioBufferSourceNode.start` is the sampled path and nothing else in the
 * drum chain uses it; the Tone synths are oscillators and noise. Counting
 * both separates "the kit played" from "something played".
 */
const INSTRUMENT = `(() => {
  window.__kitCounts = { buffers: 0, synths: 0 };
  const proto = window.AudioBufferSourceNode && window.AudioBufferSourceNode.prototype;
  if (proto && !proto.__kitPatched) {
    const start = proto.start;
    proto.start = function (...args) { window.__kitCounts.buffers++; return start.apply(this, args); };
    proto.__kitPatched = true;
  }
  const osc = window.OscillatorNode && window.OscillatorNode.prototype;
  if (osc && !osc.__kitPatched) {
    const start = osc.start;
    osc.start = function (...args) { window.__kitCounts.synths++; return start.apply(this, args); };
    osc.__kitPatched = true;
  }
  return true;
})()`;

const ctx = async (page, expr) => page.evaluate(`(async () => {
  const root = document.getElementById('root');
  const key = Object.keys(root).find(k => k.startsWith('__reactContainer$'));
  const fiberRoot = root[key] && root[key].stateNode;
  const stack = [(fiberRoot && fiberRoot.current) || root[key]]; const seen = new Set();
  let c = null;
  while (stack.length) {
    const f = stack.pop(); if (!f || seen.has(f)) continue; seen.add(f);
    const v = f.memoizedProps && f.memoizedProps.value;
    if (v && Array.isArray(v.tracks) && v.handleLoadFactoryInstrument) { c = v; break; }
    if (f.child) stack.push(f.child); if (f.sibling) stack.push(f.sibling);
  }
  if (!c) return { error: 'no session context' };
  return await (${expr})(c);
})()`);

(async () => {
  const { browser, page } = await launch(playwright, null);
  await enterStudio(page);

  console.log('=== THE KIT PLAYS LIVE ===\n');

  // The session opens with channels and nothing on them now, so pressing play
  // here used to measure silence and report the engine dead. A plain pattern
  // goes in first: kick on the beats, snare on 2 and 4, hats on the 8ths.
  const seeded = await seedPattern(page);
  check('there is a pattern to play', !!seeded && seeded.kick === 4,
    seeded ? `kick ${seeded.kick}, snare ${seeded.snare}, hats ${seeded.hat}` : 'no session');

  // ---- before the kit: the drums are synthesised ----
  await page.evaluate(INSTRUMENT);
  const play = page.locator('#btn-play-pause').first();
  await play.click();
  await page.waitForTimeout(3500);
  await play.click();
  const before = await page.evaluate('window.__kitCounts');
  console.log(`  synth-only playback: ${before.synths} oscillator starts, ${before.buffers} buffer starts`);
  check(
    'without a kit the drums are synthesised',
    before.synths > 0,
    `${before.synths} oscillators started — the studio's own voices`
  );

  // ---- load the kit ----
  const loaded = await ctx(page, `async (c) => await c.handleLoadFactoryInstrument('soulsonus-factory-kit')`);
  check('the kit loads', loaded.ok === true, loaded.message || loaded.error || '');
  check(
    'and it is prepared for live play, not just rendering',
    /Playing live on 16 zones/.test(loaded.message || ''),
    (loaded.message || '').replace(/^.*Playing/, 'Playing')
  );

  // ---- after the kit: the drums are samples ----
  await page.evaluate(INSTRUMENT);
  await play.click();
  await page.waitForTimeout(3500);
  await play.click();
  const after = await page.evaluate('window.__kitCounts');
  console.log(`  with the kit:        ${after.synths} oscillator starts, ${after.buffers} buffer starts`);
  check(
    'the kit sounds under the transport',
    after.buffers > 10,
    `${after.buffers} sampled hits played live`
  );
  check(
    'and the drum synths stood down for it',
    after.synths < before.synths,
    `${before.synths} oscillator starts before, ${after.synths} after — the bass and melody still use theirs`
  );

  // ---- and it survives the bounce ----
  //
  // The offline renderer builds its own voices and knew nothing about the
  // kit, so a bounce would have quietly reverted the drums to synths. The two
  // renders below are of the same project with the kit off and on.
  console.log('\n-- and it survives the bounce --');
  const bounced = await ctx(page, `async (c) => {
    const { renderMasterBounce } = await import('/src/audio/masterRender.ts');
    const { getCurrentSampledKit } = await import('/src/audio/sampledInstrument.ts');
    const opts = { tracks: c.tracks, bpm: c.dawState.bpm || 110, chain: c.masteringChain, bars: c.dawState.songBars || 4, audioAssets: c.audioAssets };
    const withKit = await renderMasterBounce({ ...opts });
    const without = await renderMasterBounce({ ...opts, sampledKit: null });
    const stats = (r) => {
      const d = r.buffer.getChannelData(0);
      let peak = 0, sum = 0;
      for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; sum += d[i] * d[i]; }
      return { peak: +peak.toFixed(4), rms: +Math.sqrt(sum / d.length).toFixed(5), events: r.eventsRendered, secs: +r.durationSeconds.toFixed(2) };
    };
    let diff = 0;
    const a = withKit.buffer.getChannelData(0), b = without.buffer.getChannelData(0);
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) diff = Math.max(diff, Math.abs(a[i] - b[i]));
    return { kitLoaded: !!getCurrentSampledKit(), withKit: stats(withKit), without: stats(without), maxDiff: +diff.toFixed(4) };
  }`);

  check('the bounce sees the loaded kit', bounced.kitLoaded === true, `getCurrentSampledKit() is ${bounced.kitLoaded}`);
  check(
    'the bounce renders the same number of events either way',
    !bounced.error && bounced.withKit.events === bounced.without.events,
    bounced.error || `${bounced.withKit.events} events with the kit, ${bounced.without.events} without`
  );
  check(
    'but it is audibly a different record',
    !bounced.error && bounced.maxDiff > 0.01,
    bounced.error || `largest sample difference ${bounced.maxDiff} — peak ${bounced.without.peak} -> ${bounced.withKit.peak}, rms ${bounced.without.rms} -> ${bounced.withKit.rms}`
  );
  check(
    'and it is not silence',
    !bounced.error && bounced.withKit.peak > 0.05 && bounced.withKit.rms > 0.001,
    bounced.error || `${bounced.withKit.secs}s, peak ${bounced.withKit.peak}, rms ${bounced.withKit.rms}`
  );

  console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})();
