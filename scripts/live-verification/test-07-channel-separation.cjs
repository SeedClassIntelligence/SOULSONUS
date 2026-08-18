/**
 * THE GATE TEST — per-sound-type channel separation.
 *
 * Feeds the live app one real clip containing several distinct sound types and
 * checks that each type's notes land on its own channel and nowhere else.
 */
const playwright = require('playwright');
const { launch, enterStudio, session } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

const PROJ = `s => ({
  tracks: s.tracks.map(t => ({
    id: t.id, name: t.name, instrument: t.instrument,
    rec: (t.noteEvents || []).filter(n => String(n.id).startsWith('rec_'))
      .map(n => ({ startTick: n.startTick, midiNote: n.midiNote, velocity: n.velocity,
                   origin: n.provenance && n.provenance.origin,
                   conf: n.provenance && n.provenance.detectionConfidence })),
  })).filter(t => t.rec.length > 0),
  isPlaying: s.dawState.isPlaying,
})`;

async function capture(button, audio, seconds) {
  const { browser, page } = await launch(playwright, audio);
  await enterStudio(page);
  await page.getByRole('button', { name: button }).first().click();
  await page.waitForTimeout(1200);
  await page.locator('button[title="Play (Space)"]').first().click().catch(() => {});
  await page.waitForTimeout(seconds * 1000);
  const state = await session(page, PROJ);
  await browser.close();
  return state;
}

function report(label, clip, state, expected, forbidden) {
  console.log(`\n--- ${label} :: ${clip} ---`);
  if (!state.tracks.length) { console.log('  NO notes captured on any channel.'); return false; }

  const byInstrument = {};
  for (const t of state.tracks) {
    byInstrument[t.instrument] = (byInstrument[t.instrument] || 0) + t.rec.length;
    const ticks = [...new Set(t.rec.map(n => n.startTick))];
    const vels = t.rec.map(n => n.velocity);
    console.log(`  ${t.instrument.padEnd(11)} "${t.name}"  notes=${t.rec.length}`);
    console.log(`      distinct startTicks: ${JSON.stringify(ticks.slice(0, 10))}${ticks.length > 10 ? ' …' : ''}`);
    console.log(`      velocity range: ${Math.min(...vels)}..${Math.max(...vels)}  distinct=${new Set(vels).size}`);
    console.log(`      provenance origin: ${JSON.stringify([...new Set(t.rec.map(n => n.origin))])}`);
  }

  const populated = Object.keys(byInstrument);
  const gotExpected = expected.every(i => byInstrument[i] > 0);
  const leaked = populated.filter(i => !expected.includes(i));
  const forbiddenHit = forbidden.filter(i => byInstrument[i] > 0);
  const allTicksZero = state.tracks.every(t => t.rec.every(n => n.startTick === 0));
  const velVaries = state.tracks.some(t => new Set(t.rec.map(n => n.velocity)).size > 1);

  console.log(`  channels populated : ${JSON.stringify(byInstrument)}`);
  console.log(`  expected present   : ${gotExpected ? 'PASS' : 'FAIL — missing ' + expected.filter(i => !byInstrument[i]).join(',')}`);
  console.log(`  no leakage         : ${leaked.length === 0 ? 'PASS' : 'FAIL — also wrote to ' + leaked.join(',')}`);
  console.log(`  forbidden channels : ${forbiddenHit.length === 0 ? 'PASS (none written)' : 'FAIL — wrote to ' + forbiddenHit.join(',')}`);
  console.log(`  startTick not stuck: ${allTicksZero ? 'FAIL — all notes at tick 0' : 'PASS'}`);
  console.log(`  velocity dynamic   : ${velVaries ? 'PASS' : 'FAIL — single fixed value'}`);
  return gotExpected && leaked.length === 0 && forbiddenHit.length === 0 && !allTicksZero && velVaries;
}

(async () => {
  console.log('=== CHANNEL SEPARATION — LIVE ===');
  const results = [];

  results.push(['MOUTH kick+snare+hat', report('BEATBOX (MOUTH)', 'beatbox_ksh.wav',
    await capture('🎤 BEATBOX (MOUTH)', `${SP}/beatbox_ksh.wav`, 12),
    ['kick', 'snare', 'hihat'], [])]);

  results.push(['MOUTH kick+snare only', report('BEATBOX (MOUTH)', 'beatbox_ks.wav — no hi-hat performed',
    await capture('🎤 BEATBOX (MOUTH)', `${SP}/beatbox_ks.wav`, 12),
    ['kick', 'snare'], ['hihat'])]);

  results.push(['BODY taps', report('CLAP / TAP (BODY)', 'body_taps.wav',
    await capture('👏 CLAP / TAP (BODY)', `${SP}/body_taps.wav`, 12),
    ['kick', 'snare'], ['hihat'])]);

  results.push(['HUM upper register', report('HUM / VOICE (MELODY)', 'hum_melody.wav',
    await capture('🎹 HUM / VOICE (MELODY)', `${SP}/hum_melody.wav`, 12),
    ['melody'], ['kick', 'snare', 'hihat'])]);

  results.push(['HUM low register', report('HUM / VOICE (MELODY)', 'hum_bass.wav',
    await capture('🎹 HUM / VOICE (MELODY)', `${SP}/hum_bass.wav`, 12),
    ['bass'], ['kick', 'snare', 'hihat'])]);

  console.log('\n=== SUMMARY ===');
  for (const [name, ok] of results) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`);
})();
