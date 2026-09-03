/**
 * Item 3: end-to-end live capture. Feeds Chromium a synthetic beatbox / hum clip
 * through --use-file-for-fake-audio-capture and checks whether real NoteEvents
 * appear that are derived from the audio (rather than a canned pattern).
 */
const playwright = require('playwright');
const { launch, enterStudio, session, recordTake } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

const PROJ = `s => ({
  tracks: s.tracks.map(t => ({
    id: t.id, name: t.name, instrument: t.instrument, sourceModality: t.sourceModality || null,
    activeSteps: (t.steps||[]).filter(Boolean).length,
    notes: (t.noteEvents||[]).length,
    recorded: (t.noteEvents||[]).filter(n => String(n.id).startsWith('rec_'))
      .map(n => ({ startTick: n.startTick, midiNote: n.midiNote, velocity: n.velocity, dur: n.durationTicks })),
  })),
  isPlaying: s.dawState.isPlaying,
})`;

async function capture(label, tab, audio, { play = true, seconds = 8 } = {}) {
  const { browser, page } = await launch(playwright, audio);
  await enterStudio(page);

  const baseline = await session(page, PROJ);

  // The transport runs during the take so the playhead (and therefore
  // startTick) advances.
  await recordTake(page, tab, seconds, { play });

  const after = await session(page, PROJ);
  await page.screenshot({ path: `${SP}/04_${label}.png` });
  await browser.close();
  return { baseline, after };
}

function newOrChanged(baseline, after) {
  const b = Object.fromEntries(baseline.tracks.map(t => [t.id, t]));
  return after.tracks
    .map(t => ({ t, was: b[t.id] }))
    .filter(({ t, was }) => !was || t.notes !== was.notes || t.activeSteps !== was.activeSteps || t.recorded.length);
}

(async () => {
  console.log('\n=== ITEM 3: LIVE CAPTURE END-TO-END ===');

  console.log('\n-- Baseline: what does a fresh project already contain? --');
  const { browser, page } = await launch(playwright, null);
  await enterStudio(page);
  const fresh = await session(page, PROJ);
  await browser.close();
  fresh.tracks.forEach(t =>
    console.log(`  ${t.id.padEnd(12)} ${String(t.instrument).padEnd(12)} steps=${t.activeSteps} noteEvents=${t.notes} recorded=${t.recorded.length}`));

  for (const [label, button, audio] of [
    ['beatbox', 'Oral Beatbox', `${SP}/beatbox_A.wav`],
    ['clap',    'Clap / Tap', `${SP}/beatbox_B.wav`],
    ['hum',     'Hum / Voice', `${SP}/hum_A4.wav`],
    ['hum_bass', 'Hum / Voice', `${SP}/hum_bass.wav`],
  ]) {
    const r = await capture(label, button, audio);
    console.log(`\n-- ${label.toUpperCase()} (${audio.split('/').pop()}) --`);
    const changed = newOrChanged(r.baseline, r.after);
    if (!changed.length) { console.log('  NO track gained any note from the fed audio.'); continue; }
    changed.forEach(({ t, was }) => {
      console.log(`  ${t.id} "${t.name}" modality=${t.sourceModality} instrument=${t.instrument}`);
      console.log(`    noteEvents ${was ? was.notes : 0} -> ${t.notes}; activeSteps ${was ? was.activeSteps : 0} -> ${t.activeSteps}`);
      if (t.recorded.length) {
        console.log(`    recorded NoteEvents (${t.recorded.length}), first 8:`, JSON.stringify(t.recorded.slice(0, 8)));
        console.log(`    distinct midiNotes:`, JSON.stringify([...new Set(t.recorded.map(n => n.midiNote))]));
        console.log(`    distinct startTicks:`, JSON.stringify([...new Set(t.recorded.map(n => n.startTick))].slice(0, 12)));
        console.log(`    distinct velocities:`, JSON.stringify([...new Set(t.recorded.map(n => n.velocity))]));
      }
    });
  }
})();
