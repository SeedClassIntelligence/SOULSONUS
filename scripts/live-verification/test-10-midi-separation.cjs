/**
 * MIDI hardware input → per-channel separation.
 *
 * No MIDI device exists in this environment, so the browser's Web MIDI
 * transport is stubbed: `navigator.requestMIDIAccess` returns a fake port that
 * this test pushes raw MIDI bytes into. Everything above the transport — the
 * engine's byte parsing, the GM mapping, the shared router and the note commit
 * — is the app's real code.
 */
const playwright = require('playwright');
const { launch, enterStudio, session } = require('./lib.cjs');

const SNAP = `s => s.tracks
  .filter(t => (t.noteEvents || []).some(n => String(n.id).startsWith('rec_')))
  .map(t => ({
    instrument: t.instrument, name: t.name,
    notes: (t.noteEvents || []).filter(n => String(n.id).startsWith('rec_'))
      .map(n => ({ midi: n.midiNote, vel: n.velocity, tick: n.startTick,
                   origin: n.provenance && n.provenance.origin,
                   conf: n.provenance && n.provenance.detectionConfidence })),
  }))`;

// [class expectation, midi note, velocity, channel]
const PATTERN = [
  ['kick',       36,  120, 10],
  ['hihat',      42,   70, 10],
  ['snare',      38,  105, 10],
  ['hihat',      42,   65, 10],
  ['kick',       36,  118, 10],
  ['hihat',      46,   80, 10],
  ['snare',      40,  100, 10],
  ['tonal_low',  36,   95,  1],   // same note number, melodic channel
  ['tonal_low',  40,   88,  1],
  ['tonal_high', 60,  110,  1],
  ['tonal_high', 67,  102,  1],
];

const MIDI_STUB = `
  const listeners = [];
  const port = {
    id: 'stub-in-1', name: 'Stub MIDI Keyboard', manufacturer: 'SoulSonus Test',
    type: 'input', state: 'connected',
    set onmidimessage(fn) { this._fn = fn; }, get onmidimessage() { return this._fn; },
  };
  const inputs = new Map([['stub-in-1', port]]);
  const outputs = new Map();
  inputs.forEach = Map.prototype.forEach.bind(inputs);
  navigator.requestMIDIAccess = async () => ({
    inputs, outputs, onstatechange: null,
    sysex: false,
  });
  window.__sendMidi = (status, d1, d2) => {
    if (port._fn) port._fn({ data: new Uint8Array([status, d1, d2]) });
  };
`;

(async () => {
  const { browser, page } = await launch(playwright, null);
  await page.addInitScript(MIDI_STUB);
  await enterStudio(page);

  // Arm MIDI capture through the real context handler.
  await page.evaluate(`window.__studio = () => {
    const root = document.getElementById('root');
    const key = Object.keys(root).find(k => k.startsWith('__reactContainer$'));
    const fiberRoot = root[key] && root[key].stateNode;
    const stack = [(fiberRoot && fiberRoot.current) || root[key]]; const seen = new Set();
    while (stack.length) {
      const f = stack.pop(); if (!f || seen.has(f)) continue; seen.add(f);
      const v = f.memoizedProps && f.memoizedProps.value;
      if (v && Array.isArray(v.tracks) && v.handleToggleMidiCapture) return v;
      if (f.child) stack.push(f.child); if (f.sibling) stack.push(f.sibling);
    }
    throw new Error('studio context not found');
  }`);

  const armed = await page.evaluate('window.__studio().handleToggleMidiCapture()');
  console.log('=== MIDI CHANNEL SEPARATION ===');
  console.log('capture armed:', armed);

  await page.locator('button[title="Play (Space)"]').first().click().catch(() => {});
  await page.waitForTimeout(400);

  for (const [, note, vel, ch] of PATTERN) {
    const status = 0x90 | (ch - 1);
    await page.evaluate(`window.__sendMidi(${status}, ${note}, ${vel})`);
    await page.waitForTimeout(220);
  }
  await page.waitForTimeout(900);

  const tracks = await session(page, SNAP);
  await browser.close();

  const expected = {};
  for (const [klass, , , ] of PATTERN) expected[klass] = (expected[klass] || 0) + 1;
  const CLASS_INSTRUMENT = { kick: 'kick', snare: 'snare', hihat: 'hihat', tonal_low: 'bass', tonal_high: 'melody' };
  const wantByInstrument = {};
  for (const [k, n] of Object.entries(expected)) wantByInstrument[CLASS_INSTRUMENT[k]] = n;

  const gotByInstrument = {};
  for (const t of tracks) gotByInstrument[t.instrument] = (gotByInstrument[t.instrument] || 0) + t.notes.length;

  console.log('\nsent      :', JSON.stringify(wantByInstrument));
  console.log('landed on :', JSON.stringify(gotByInstrument));
  for (const t of tracks) {
    const vels = t.notes.map(n => n.vel);
    console.log(`  ${t.instrument.padEnd(8)} "${t.name}" notes=${t.notes.length}`);
    console.log(`      midi=${JSON.stringify([...new Set(t.notes.map(n => n.midi))])} vel=${JSON.stringify([...new Set(vels)])}`);
    console.log(`      ticks=${JSON.stringify([...new Set(t.notes.map(n => n.tick))])} origin=${JSON.stringify([...new Set(t.notes.map(n => n.origin))])}`);
  }

  const sentVels = PATTERN.map(p => p[2]).sort((a, b) => a - b);
  const gotVels = tracks.flatMap(t => t.notes.map(n => n.vel)).sort((a, b) => a - b);
  const untouched = Object.keys(gotByInstrument).filter(i => !wantByInstrument[i]);

  console.log('\n-- results --');
  console.log('  every played instrument populated :', Object.keys(wantByInstrument).every(i => gotByInstrument[i] > 0) ? 'PASS' : 'FAIL');
  console.log('  counts match exactly              :', JSON.stringify(wantByInstrument) === JSON.stringify(
    Object.fromEntries(Object.keys(wantByInstrument).map(k => [k, gotByInstrument[k]]))) ? 'PASS' : 'FAIL');
  console.log('  no unplayed instrument written    :', untouched.length === 0 ? 'PASS' : `FAIL — ${untouched.join(',')}`);
  console.log('  velocities are the performed ones :', JSON.stringify(sentVels) === JSON.stringify(gotVels) ? 'PASS' : `FAIL sent=${sentVels} got=${gotVels}`);
  console.log('  provenance recorded               :', tracks.every(t => t.notes.every(n => n.origin === 'MIDI_KEYS')) ? 'PASS' : 'FAIL');
  console.log('  confidence recorded               :', tracks.every(t => t.notes.every(n => typeof n.conf === 'number')) ? 'PASS' : 'FAIL');
})();
