/**
 * Inside each drawer: do the controls do anything real?
 *
 * Same instrumentation that proved the Mix room's AUDITION decorative — patch
 * AudioContext node constructors and AudioParam automation, then click every
 * action-shaped control and move every slider, and see what actually happened.
 */
const playwright = require('playwright');
const { launch, enterStudio, session } = require('./lib.cjs');

const DRAWERS = [
  ['✦ STUDIO INTELLIGENCE', 'STUDIO INTELLIGENCE'],
  ['🧠 NATIVE BRAIN', 'NATIVE STUDIO BRAIN'],
  ['🎛️ TRACK WORKSTATION', 'TRACK PRODUCTION WORKSTATION'],
  ['🎙️ SONGWRITING SUITE', 'SONGWRITING SUITE'],
  ['🎹 MIDI & HARDWARE', 'EXTERNAL HARDWARE'],
  ['INSPECTOR', 'QUICK PRODUCTION INSPECTOR'],
  ['CALIBRATION', 'FFT & Detection Calibration'],
  ['RADIAL RADAR', 'Radial Step Visualizer'],
];

const ACTION_WORDS = /AUDITION|PREVIEW|PLAY|GENERATE|ANALYZ|APPLY|COMMIT|TRAIN|RENDER|PROPOSE|RUN|START|SCAN|EXPORT|BOUNCE/i;

const INSTRUMENT = `
  window.__audio = { nodes: [], params: 0 };
  const P = window.AudioContext && window.AudioContext.prototype;
  if (P && !P.__probed) {
    P.__probed = true;
    ['createBiquadFilter','createDynamicsCompressor','createGain','createWaveShaper',
     'createStereoPanner','createConvolver','createOscillator','createBufferSource',
     'createDelay','createAnalyser','createChannelSplitter','createChannelMerger']
      .forEach(m => { const o = P[m]; if (o) P[m] = function(){ window.__audio.nodes.push(m); return o.apply(this, arguments); }; });
    const AP = window.AudioParam.prototype;
    ['setValueAtTime','linearRampToValueAtTime','exponentialRampToValueAtTime','setTargetAtTime']
      .forEach(m => { const o = AP[m]; if (o) AP[m] = function(){ window.__audio.params++; return o.apply(this, arguments); }; });
  }
`;

const TRACKSTATE = `s => JSON.stringify(s.tracks.map(t => ({
  id: t.id, vol: t.volume, mute: t.mute, pitch: t.pitch,
  dsp: t.dspSettings || null, notes: (t.noteEvents || []).length, prof: t.detectionProfile || null,
})))`;

async function panel(page, title) {
  return page.locator(`div.fixed:has-text("${title}")`).first();
}

(async () => {
  const { browser, page } = await launch(playwright, null);

  console.log('=== DRAWER CONTENTS ===\n');

  for (const [trigger, title] of DRAWERS) {
    await enterStudio(page);
    await page.evaluate(INSTRUMENT);
    await page.getByRole('button', { name: trigger, exact: false }).first().click({ force: true });
    await page.waitForTimeout(1400);

    const p = await panel(page, title);
    if (!(await p.count())) { console.log(`-- ${title}: DID NOT OPEN --\n`); continue; }

    // Tabs / section headers inside the panel.
    const buttons = await p.locator('button').allInnerTexts();
    const labels = buttons.map(b => b.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const actions = labels.filter(l => ACTION_WORDS.test(l));
    const sliders = await p.locator('input[type=range]').count();

    const before = await session(page, TRACKSTATE);
    await page.evaluate('window.__audio.nodes.length = 0; window.__audio.params = 0;');

    // Click every action-shaped control.
    for (const label of actions.slice(0, 12)) {
      const b = p.getByRole('button', { name: label, exact: true }).first();
      if (await b.count()) { await b.click({ force: true }).catch(() => {}); await page.waitForTimeout(650); }
    }
    const afterActions = await page.evaluate('({ nodes: window.__audio.nodes.slice(), params: window.__audio.params })');
    const stateAfterActions = await session(page, TRACKSTATE);

    // Move every slider to 80% of its range.
    await page.evaluate('window.__audio.nodes.length = 0; window.__audio.params = 0;');
    const ranges = await p.locator('input[type=range]').all();
    for (const r of ranges.slice(0, 10)) {
      await r.evaluate(e => {
        const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        const target = String(Number(e.min || 0) + (Number(e.max || 100) - Number(e.min || 0)) * 0.8);
        set.call(e, target);
        e.dispatchEvent(new Event('input', { bubbles: true }));
        e.dispatchEvent(new Event('change', { bubbles: true }));
      }).catch(() => {});
      await page.waitForTimeout(220);
    }
    const afterSliders = await page.evaluate('({ nodes: window.__audio.nodes.slice(), params: window.__audio.params })');
    const stateAfterSliders = await session(page, TRACKSTATE);

    console.log(`-- ${title} --`);
    console.log(`   controls: ${labels.length} buttons, ${sliders} sliders`);
    console.log(`   tabs/sections: ${labels.slice(0, 10).join(' | ')}`);
    console.log(`   action controls clicked (${actions.length}): ${actions.slice(0, 8).join(' | ') || '(none found)'}`);
    console.log(`     -> audio nodes created: ${afterActions.nodes.length} ${afterActions.nodes.length ? JSON.stringify([...new Set(afterActions.nodes)]) : ''}`);
    console.log(`     -> AudioParam automations: ${afterActions.params}`);
    console.log(`     -> track state changed: ${before !== stateAfterActions ? 'YES' : 'no'}`);
    console.log(`   sliders moved: ${Math.min(ranges.length, 10)}`);
    console.log(`     -> audio nodes created: ${afterSliders.nodes.length}   AudioParam automations: ${afterSliders.params}`);
    console.log(`     -> track state changed: ${stateAfterActions !== stateAfterSliders ? 'YES' : 'no'}`);
    console.log('');
  }

  await browser.close();
})();
