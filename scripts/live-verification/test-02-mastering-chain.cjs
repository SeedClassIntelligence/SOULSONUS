/**
 * Item 2: 7-stage modular mastering chain (Master room).
 * Asks: do the stage sliders reach a DSP graph that processes the audio buffer,
 * and do the LUFS / True-Peak readouts respond to them?
 */
const playwright = require('playwright');
const { launch, enterStudio, session } = require('./lib.cjs');

const PROJ = `s => ({
  chainName: s.masteringChain.name,
  slots: s.masteringChain.slots.map(x => ({ id: x.id, name: x.name, type: x.type, bypassed: x.bypassed, parameters: x.parameters })),
  candidates: s.masterCandidates.map(c => ({ id: c.candidateId, name: c.name, lufs: c.measuredLufs, dbtp: c.measuredDbtp })),
})`;

(async () => {
  const { browser, page } = await launch(playwright, null);
  await enterStudio(page);

  // Count every audio node the app ever builds, so we can tell whether moving a
  // mastering slider constructs or reconfigures any DSP.
  await page.evaluate(`
    window.__nodeLog = [];
    window.__paramSets = [];
    const P = window.AudioContext.prototype;
    ['createBiquadFilter','createDynamicsCompressor','createGain','createWaveShaper','createStereoPanner','createConvolver','createChannelSplitter','createChannelMerger','createIIRFilter']
      .forEach(m => { const o = P[m]; P[m] = function(){ window.__nodeLog.push(m); return o.apply(this, arguments); }; });
    const AP = window.AudioParam.prototype;
    ['setValueAtTime','linearRampToValueAtTime','exponentialRampToValueAtTime','setTargetAtTime']
      .forEach(m => { const o = AP[m]; AP[m] = function(v){ window.__paramSets.push(v); return o.apply(this, arguments); }; });
  `);

  await page.getByRole('button', { name: '5. MASTER' }).first().click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: (process.env.SOULSONUS_VERIFY_DIR||'/tmp') + '/03_master.png' });

  const before = await session(page, PROJ);
  console.log('\n=== ITEM 2: 7-STAGE MASTERING CHAIN ===');
  console.log('Chain:', before.chainName);
  before.slots.forEach((s, i) => console.log(` stage ${i+1}: ${s.name} [${s.type}] ${JSON.stringify(s.parameters)}`));
  console.log('Master candidates (LUFS/dBTP shown in UI):', JSON.stringify(before.candidates));

  // Find the stage-1 (corrective EQ) sliders and move one.
  const sliders = await page.$$('input[type=range]');
  console.log('\nRange inputs on Master screen:', sliders.length);

  await page.evaluate('window.__nodeLog.length = 0; window.__paramSets.length = 0;');

  let moved = null;
  for (const sl of sliders) {
    const info = await sl.evaluate(e => ({ min: e.min, max: e.max, step: e.step, value: e.value,
      label: (e.closest('div')?.previousElementSibling?.innerText || e.closest('div')?.innerText || '').replace(/\s+/g,' ').trim().slice(0,80) }));
    // Drive it to a clearly different value
    const target = String(Number(info.min) + (Number(info.max) - Number(info.min)) * 0.9);
    await sl.evaluate((e, v) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(e, v);
      e.dispatchEvent(new Event('input', { bubbles: true }));
      e.dispatchEvent(new Event('change', { bubbles: true }));
    }, target);
    await page.waitForTimeout(250);
    if (!moved) moved = { ...info, target };
  }

  await page.waitForTimeout(1200);
  const after = await session(page, PROJ);
  const nodeLog = await page.evaluate('window.__nodeLog');
  const paramSets = await page.evaluate('window.__paramSets');

  console.log('\nFirst slider moved:', JSON.stringify(moved));
  console.log('Chain parameters changed in state?', JSON.stringify(before.slots) !== JSON.stringify(after.slots));
  console.log('Parameters after moving every slider:');
  after.slots.forEach((s, i) => console.log(` stage ${i+1}: ${JSON.stringify(s.parameters)}`));
  console.log('\nWebAudio nodes constructed while moving sliders:', nodeLog.length, JSON.stringify(nodeLog.slice(0,10)));
  console.log('AudioParam automation calls while moving sliders:', paramSets.length);
  console.log('LUFS/dBTP readouts after slider moves:', JSON.stringify(after.candidates));
  console.log('LUFS readouts changed?', JSON.stringify(before.candidates) !== JSON.stringify(after.candidates));

  // Is the verified-real telemetry engine reachable from the running bundle?
  const telemetryUsed = await page.evaluate(`(async () => {
    const mods = performance.getEntriesByType('resource').map(r => r.name);
    return mods.filter(n => /masteringTelemetryEngine/.test(n));
  })()`);
  console.log('masteringTelemetryEngine module loaded by the app?', JSON.stringify(telemetryUsed));

  await browser.close();
})();
