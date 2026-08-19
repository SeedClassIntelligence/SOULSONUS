/**
 * Per-track EQ: do the three EQ sliders change the audio?
 *
 * lowGain, midGain and highGain have always been written into track state and
 * read by nothing — the live strip was one filter, a compressor and a channel.
 * This moves the real sliders in the Mix room, then renders and measures the
 * per-track stems the export produces: the edited band on the edited track must
 * move, and an untouched track must not.
 */
const playwright = require('playwright');
const { launch, enterStudio, session } = require('./lib.cjs');

let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(44)} ${detail}`);
}

// Band energy of a rendered file, measured by filtering it in the browser's own
// audio graph rather than by trusting a spectrum drawn on screen.
const BAND_RMS = `async (url, type, freq) => {
  const bytes = await (await fetch(url)).arrayBuffer();
  const probe = new OfflineAudioContext(1, 1024, 48000);
  const decoded = await probe.decodeAudioData(bytes);
  const ctx = new OfflineAudioContext(1, decoded.length, decoded.sampleRate);
  const src = ctx.createBufferSource();
  src.buffer = decoded;
  // Two identical sections give a steeper skirt, so the measured band is the
  // band and not its neighbours.
  const f1 = ctx.createBiquadFilter();
  const f2 = ctx.createBiquadFilter();
  f1.type = type; f1.frequency.value = freq; f1.Q.value = 0.707;
  f2.type = type; f2.frequency.value = freq; f2.Q.value = 0.707;
  src.connect(f1); f1.connect(f2); f2.connect(ctx.destination);
  src.start();
  const out = await ctx.startRendering();
  const d = out.getChannelData(0);
  let sum = 0;
  for (let i = 0; i < d.length; i++) sum += d[i] * d[i];
  return Math.sqrt(sum / d.length);
}`;

const bandRms = (page, url, type, freq) =>
  page.evaluate(`(${BAND_RMS})(${JSON.stringify(url)}, ${JSON.stringify(type)}, ${freq})`);

const STEMS = `s => {
  const p = s.deliveryPackage;
  if (!p) return null;
  return JSON.stringify(Object.fromEntries(p.stems.map(st => [st.trackId, st.url])));
}`;

async function renderPackage(page) {
  await page.getByRole('button', { name: 'EXPORT', exact: true }).first().click({ force: true });
  await page.waitForTimeout(600);
  await page.locator('[data-testid="render-export-package"]').first().click({ force: true });
  await page.waitForSelector('[data-testid="export-summary"]', { timeout: 240000 });
  await page.waitForTimeout(600);
  const stems = JSON.parse((await session(page, STEMS)) || 'null');
  await page.keyboard.press('Escape').catch(() => {});
  await page.locator('div.fixed.inset-0 button').first().click({ force: true }).catch(() => {});
  await page.waitForTimeout(500);
  return stems;
}

const db = (a, b) => 20 * Math.log10(Math.max(a, 1e-12) / Math.max(b, 1e-12));

(async () => {
  const { browser, page } = await launch(playwright, null);
  await enterStudio(page);

  console.log('=== PER-TRACK EQ ===\n');

  // ---- baseline render, EQ flat ----
  const before = await renderPackage(page);
  check('stems rendered for the baseline', !!before && Object.keys(before).length > 0,
        before ? `${Object.keys(before).length} stems` : 'none');
  if (!before) { await browser.close(); process.exit(1); }

  const beforeSnareHigh = await bandRms(page, before['t-snare'], 'highpass', 8000);
  const beforeKickLow = await bandRms(page, before['t-kick'], 'lowpass', 120);
  const beforeMelodyMid = await bandRms(page, before['t-melody'], 'bandpass', 1200);
  const beforeHatHigh = await bandRms(page, before['t-hat'], 'highpass', 6000);
  console.log(`  baseline: snare >8k ${beforeSnareHigh.toFixed(5)}   kick <120 ${beforeKickLow.toFixed(5)}   melody ~1.2k ${beforeMelodyMid.toFixed(5)}   hat >6k ${beforeHatHigh.toFixed(5)}`);

  // ---- move the real sliders in the Mix room ----
  await page.getByRole('button', { name: '4. MIX', exact: false }).first().click({ force: true });
  await page.waitForTimeout(1500);

  const setSlider = async (label, value) => {
    const panel = page.locator(`div:has(> div > span:text-is("${label}"))`).first();
    const input = panel.locator('input[type=range]').first();
    if (!(await input.count())) return false;
    await input.evaluate((e, v) => {
      const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      set.call(e, String(v));
      e.dispatchEvent(new Event('input', { bubbles: true }));
      e.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
    await page.waitForTimeout(400);
    return true;
  };

  const focusTrack = async (name) => {
    const strip = page.getByText(name, { exact: false }).first();
    await strip.click({ force: true }).catch(() => {});
    await page.waitForTimeout(700);
    return session(page, `s => s.focusedTrackId`);
  };

  const snareFocused = await focusTrack('Snare');
  check('focusing a channel works', snareFocused === 't-snare', `focusedTrackId=${snareFocused}`);
  const movedHigh = await setSlider('AIR HIGH SHELF', 12);
  check('the AIR HIGH SHELF slider is reachable', movedHigh, '');

  const kickFocused = await focusTrack('Kick');
  check('focusing a second channel works', kickFocused === 't-kick', `focusedTrackId=${kickFocused}`);
  const movedLow = await setSlider('LOW SHELF', -12);
  check('the LOW SHELF slider is reachable', movedLow, '');

  const melodyFocused = await focusTrack('Lead Synth');
  check('focusing a third channel works', melodyFocused === 't-melody', `focusedTrackId=${melodyFocused}`);
  const movedMid = await setSlider('PARAMETRIC MID', 12);
  check('the PARAMETRIC MID slider is reachable', movedMid, '');

  const state = JSON.parse(await session(page, `s => JSON.stringify(Object.fromEntries(
    s.tracks.map(t => [t.id, t.dspSettings ? { low: t.dspSettings.lowGain, mid: t.dspSettings.midGain, high: t.dspSettings.highGain } : null])
  ))`));
  console.log(`  state: snare ${JSON.stringify(state['t-snare'])}  kick ${JSON.stringify(state['t-kick'])}  melody ${JSON.stringify(state['t-melody'])}  hat ${JSON.stringify(state['t-hat'])}`);
  check('slider writes reached track state',
        state['t-snare'] && state['t-snare'].high === 12 &&
        state['t-kick'] && state['t-kick'].low === -12 &&
        state['t-melody'] && state['t-melody'].mid === 12,
        `snare.high=${state['t-snare'] && state['t-snare'].high} kick.low=${state['t-kick'] && state['t-kick'].low} melody.mid=${state['t-melody'] && state['t-melody'].mid}`);

  // ---- render again and measure ----
  const after = await renderPackage(page);
  check('stems rendered after the edit', !!after && Object.keys(after).length > 0, after ? `${Object.keys(after).length} stems` : 'none');
  if (!after) { await browser.close(); process.exit(1); }

  const afterSnareHigh = await bandRms(page, after['t-snare'], 'highpass', 8000);
  const afterKickLow = await bandRms(page, after['t-kick'], 'lowpass', 120);
  const afterMelodyMid = await bandRms(page, after['t-melody'], 'bandpass', 1200);
  const afterHatHigh = await bandRms(page, after['t-hat'], 'highpass', 6000);

  const snareDelta = db(afterSnareHigh, beforeSnareHigh);
  const kickDelta = db(afterKickLow, beforeKickLow);
  const melodyDelta = db(afterMelodyMid, beforeMelodyMid);
  const hatDelta = db(afterHatHigh, beforeHatHigh);
  console.log(`  after:    snare >8k ${afterSnareHigh.toFixed(5)} (${snareDelta.toFixed(2)} dB)   kick <120 ${afterKickLow.toFixed(5)} (${kickDelta.toFixed(2)} dB)   melody ~1.2k ${afterMelodyMid.toFixed(5)} (${melodyDelta.toFixed(2)} dB)   hat >6k ${afterHatHigh.toFixed(5)} (${hatDelta.toFixed(2)} dB)`);

  // The strip is EQ into a compressor, so a +12 dB boost does not arrive as
  // +12 dB of level — 4:1 above -18 dB is doing its job. Direction and
  // materiality are what the sliders promise.
  check('+12 dB air shelf lifts the snare top end', snareDelta > 2, `${snareDelta.toFixed(2)} dB after 4:1 compression`);
  check('-12 dB low shelf cuts the kick bottom', kickDelta < -3, `${kickDelta.toFixed(2)} dB`);
  check('+12 dB parametric mid lifts 1.2 kHz', melodyDelta > 2, `${melodyDelta.toFixed(2)} dB`);
  check('the untouched track is untouched', Math.abs(hatDelta) < 1.5, `hat moved ${hatDelta.toFixed(2)} dB`);


  // ---- and the same controls must reach the live graph, not only the bounce ----
  console.log('\n-- live playback --');
  await page.evaluate(`
    window.__audio = { params: 0, biquads: 0 };
    const P = window.AudioContext && window.AudioContext.prototype;
    if (P && !P.__eqProbed) {
      P.__eqProbed = true;
      const o = P.createBiquadFilter;
      P.createBiquadFilter = function () { window.__audio.biquads++; return o.apply(this, arguments); };
      const AP = window.AudioParam.prototype;
      ['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setTargetAtTime']
        .forEach(m => { const f = AP[m]; if (f) AP[m] = function () { window.__audio.params++; return f.apply(this, arguments); }; });
    }
  `);

  await page.getByRole('button', { name: '1. CREATE', exact: false }).first().click({ force: true });
  await page.waitForTimeout(800);
  await page.locator('#btn-play-pause').first().click({ force: true }).catch(() => {});
  await page.waitForTimeout(2500);
  const built = await page.evaluate('window.__audio.biquads');
  check('live strips build EQ nodes', built > 0, `${built} biquads created once playback started`);

  await page.getByRole('button', { name: '4. MIX', exact: false }).first().click({ force: true });
  await page.waitForTimeout(1200);
  await focusTrack('Snare');
  await page.evaluate('window.__audio.params = 0; window.__audio.biquads = 0;');
  await setSlider('AIR HIGH SHELF', -12);
  await page.waitForTimeout(800);
  const moved = await page.evaluate('({ p: window.__audio.params, b: window.__audio.biquads })');
  check('moving a band automates the live graph', moved.p > 0, `${moved.p} AudioParam writes`);
  check('and does not rebuild the strip', moved.b === 0, `${moved.b} new biquads`);

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})();
