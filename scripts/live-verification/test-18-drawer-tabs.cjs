/**
 * Walks every tab inside the two multi-tab workstation drawers and tests the
 * controls on each, rather than only whichever tab opens by default.
 */
const playwright = require('playwright');
const { launch, enterStudio, session, openUtility } = require('./lib.cjs');

const ACTION = /AUDITION|PREVIEW|PLAY|GENERATE|ANALYZ|APPLY|COMMIT|TRAIN|RENDER|PROPOSE|RUN|START|SCAN|TEST|HANDSHAKE|SAVE|BOUNCE|CAPTURE|DETECT/i;

const INSTRUMENT = `
  window.__audio = { nodes: [], params: 0 };
  const P = window.AudioContext && window.AudioContext.prototype;
  if (P && !P.__probed) {
    P.__probed = true;
    ['createBiquadFilter','createDynamicsCompressor','createGain','createWaveShaper','createStereoPanner',
     'createConvolver','createOscillator','createBufferSource','createDelay','createAnalyser']
      .forEach(m => { const o = P[m]; if (o) P[m] = function(){ window.__audio.nodes.push(m); return o.apply(this, arguments); }; });
    const AP = window.AudioParam.prototype;
    ['setValueAtTime','linearRampToValueAtTime','exponentialRampToValueAtTime','setTargetAtTime']
      .forEach(m => { const o = AP[m]; if (o) AP[m] = function(){ window.__audio.params++; return o.apply(this, arguments); }; });
  }
`;

// Everything the session holds that a drawer could plausibly write to.
const TRACKSTATE = `s => JSON.stringify({ tracks: s.tracks, lyrics: s.lyricSections, sections: s.sections })`;

async function exercise(page, panel, label) {
  const before = await session(page, TRACKSTATE);
  await page.evaluate('window.__audio.nodes.length = 0; window.__audio.params = 0;');

  const labels = (await panel.locator('button').allInnerTexts())
    .map(b => b.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const actions = [...new Set(labels.filter(l => ACTION.test(l)))];

  for (const a of actions.slice(0, 8)) {
    const b = panel.getByRole('button', { name: a, exact: true }).first();
    if (await b.count()) { await b.click({ force: true }).catch(() => {}); await page.waitForTimeout(600); }
  }
  const ranges = await panel.locator('input[type=range]').all();
  for (const r of ranges.slice(0, 8)) {
    await r.evaluate(e => {
      const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      set.call(e, String(Number(e.min || 0) + (Number(e.max || 100) - Number(e.min || 0)) * 0.75));
      e.dispatchEvent(new Event('input', { bubbles: true }));
      e.dispatchEvent(new Event('change', { bubbles: true }));
      // Several sliders commit to session state on pointer-up rather than on
      // change; without these a working control reads as inert.
      e.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      e.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      e.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    }).catch(() => {});
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(500);

  const audio = await page.evaluate('({ nodes: window.__audio.nodes.slice(), params: window.__audio.params })');
  const after = await session(page, TRACKSTATE);
  const verdict = audio.nodes.length || audio.params || before !== after ? 'REAL' : 'NO EFFECT';
  console.log(`   ${label.padEnd(26)} ctrls=${String(labels.length).padEnd(3)} sliders=${String(ranges.length).padEnd(2)} ` +
              `actions=[${actions.slice(0, 4).join(', ') || '-'}]`);
  console.log(`     ${verdict.padEnd(10)} audioNodes=${audio.nodes.length} params=${audio.params} stateChanged=${before !== after ? 'YES' : 'no'}`);
}

(async () => {
  const { browser, page } = await launch(playwright, null);

  // ---- Track Production Workstation: expand, then walk its 7 tabs ----
  console.log('=== TRACK PRODUCTION WORKSTATION ===');
  await enterStudio(page);
  await page.evaluate(INSTRUMENT);
  await openUtility(page, 'WORKSTATION', { settle: 0 });
  await page.waitForTimeout(1500);
  let panel = page.locator('div.fixed.right-0:has-text("TRACK PRODUCTION WORKSTATION")').first();

  const expand = panel.getByRole('button', { name: /OPEN WORKSTATION/i }).first();
  if (await expand.count()) {
    await expand.click({ force: true });
    await page.waitForTimeout(1200);
    console.log('   (expanded via "OPEN WORKSTATION")');
  }
  const wsTabs = (await panel.locator('button').allInnerTexts())
    .map(b => b.replace(/\s+/g, ' ').trim())
    .filter(b => /^(SOURCE|MATRIX|VAULT|PUNCH|LAYERS|AUTO|DSP)\b/i.test(b));
  console.log('   tabs found:', JSON.stringify(wsTabs));
  for (const tab of wsTabs) {
    const t = panel.getByRole('button', { name: tab, exact: true }).first();
    if (!(await t.count())) { console.log(`   ${tab.padEnd(26)} not clickable`); continue; }
    await t.click({ force: true }).catch(() => {});
    await page.waitForTimeout(1000);
    await exercise(page, panel, `tab: ${tab}`);
  }

  // ---- Songwriting Suite: walk its 8 numbered tabs ----
  console.log('\n=== SONGWRITING SUITE & VOCAL BOOTH ===');
  await enterStudio(page);
  await page.evaluate(INSTRUMENT);
  await openUtility(page, 'SONGWRITING', { settle: 0 });
  await page.waitForTimeout(1500);
  panel = page.locator('div.fixed.right-0:has-text("SONGWRITING SUITE")').first();

  const tabs = ['1. LYRICS & CADENCE', '2. TAKES & POOL', '3. COMP BUILDER', '4. PUNCH & OVERDUB',
                '5. PITCH & TIMING', '6. HARMONY & DOUBLES', '7. VOICE IDENTITY', '8. VOCAL DSP'];
  for (const tab of tabs) {
    const t = panel.getByRole('button', { name: tab, exact: true }).first();
    if (!(await t.count())) { console.log(`   ${tab.padEnd(26)} tab not found`); continue; }
    await t.click({ force: true }).catch(() => {});
    await page.waitForTimeout(900);
    await exercise(page, panel, tab);
  }

  // ---- Studio Intelligence: does COMMIT TO DAW change anything? ----
  console.log('\n=== STUDIO INTELLIGENCE — audition vs commit ===');
  await enterStudio(page);
  await page.evaluate(INSTRUMENT);
  await page.getByRole('button', { name: '✦ STUDIO INTELLIGENCE', exact: false }).first().click({ force: true });
  await page.waitForTimeout(1500);
  panel = page.locator('div.fixed.right-0:has-text("STUDIO INTELLIGENCE")').first();

  for (const [name, label] of [['AUDITION CANDIDATE', 'AUDITION'], ['COMMIT TO DAW', 'COMMIT']]) {
    const before = await session(page, TRACKSTATE);
    await page.evaluate('window.__audio.nodes.length = 0; window.__audio.params = 0;');
    const b = panel.getByRole('button', { name, exact: true }).first();
    if (!(await b.count())) { console.log(`   ${label}: control not found`); continue; }
    await b.click({ force: true });
    await page.waitForTimeout(2500);
    const audio = await page.evaluate('({ n: window.__audio.nodes.length, p: window.__audio.params })');
    const after = await session(page, TRACKSTATE);
    console.log(`   ${label.padEnd(10)} audioNodes=${String(audio.n).padEnd(4)} params=${String(audio.p).padEnd(4)} trackStateChanged=${before !== after ? 'YES' : 'no'}`);
  }

  await browser.close();
})();
