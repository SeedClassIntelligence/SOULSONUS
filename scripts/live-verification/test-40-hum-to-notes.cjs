/**
 * A hum becomes notes.
 *
 * The classifier that already works tells a kick from a snare and has no
 * opinion about whether you hummed a C or an E — which leaves the melodic half
 * of "beatbox my composition into its proper tracks" unreachable. A real Basic
 * Pitch model has been sitting in public/models/ the whole time, held by an
 * engine that no file imported, that fed the tensor under the wrong input name
 * so every call threw, and that discarded the result anyway while reporting
 * itself as neural.
 *
 * This drives the real modal with a hum whose contents are known exactly —
 * A4, C5, E5, C5, 1.2 s each — and checks the notes that land on the grid are
 * those notes, in that order, at those times.
 */
const playwright = require('playwright');
const { launch, enterStudio, session } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(52)} ${detail}`);
}

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const name = (m) => `${NAMES[m % 12]}${Math.floor(m / 12) - 1}`;

// What generate-test-audio.cjs actually writes into hum_melody.wav.
const PLAYED = [69, 72, 76, 72];
const SPACING_SEC = 1.2;

const NOTES = `s => JSON.stringify(
  s.tracks.flatMap(t => (t.noteEvents || [])
    .filter(e => e.provenance && e.provenance.origin === 'IMPORTED_MIDI')
    .map(e => ({
      track: t.id,
      startTick: e.startTick,
      midi: e.midiNote,
      velocity: e.velocity,
      confidence: e.provenance.detectionConfidence,
    })))
)`;

(async () => {
  const { browser, page } = await launch(playwright, null);
  await enterStudio(page);

  console.log('=== A HUM BECOMES NOTES ===\n');

  const before = JSON.parse(await session(page, NOTES));
  check('no transcribed notes to begin with', before.length === 0, `${before.length} notes`);

  // ---- open the real modal from the real control ----
  const openBtn = page.getByRole('button', { name: 'IMPORT AUDIO', exact: false }).first();
  await openBtn.scrollIntoViewIfNeeded();
  await openBtn.click();
  await page.waitForTimeout(1200);

  const tab = page.locator('#tab-melody').first();
  check('there is a melodic import path', (await tab.count()) === 1, `${await tab.count()} tab(s)`);
  if (!(await tab.count())) { console.log('\nFAILED'); await browser.close(); process.exit(1); }
  await tab.click();
  await page.waitForTimeout(400);

  await page.locator('input[type="file"]').first().setInputFiles(`${SP}/hum_melody.wav`);
  await page.waitForTimeout(1200);

  // ---- transcribe ----
  const go = page.getByRole('button', { name: 'TRANSCRIBE THE MELODY', exact: false }).first();
  check('the action names what it will do', (await go.count()) > 0, 'TRANSCRIBE THE MELODY');
  await go.click();

  // The model runs in wasm in the browser; give it room.
  let notes = [];
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(1000);
    notes = JSON.parse(await session(page, NOTES));
    if (notes.length) break;
  }

  console.log(`\n-- what came back --`);
  const heard = notes.map((n) => n.midi);
  check('notes reached the grid', notes.length > 0, `${notes.length} notes: ${heard.map(name).join(' ')}`);
  if (!notes.length) {
    const err = await page.locator('[data-testid="import-result"], .text-rose-300').first().innerText().catch(() => '');
    console.log(`  (screen said: ${err.slice(0, 160)})`);
    console.log('\nFAILED');
    await browser.close();
    process.exit(1);
  }

  check(
    'it heard the melody that was hummed',
    JSON.stringify(heard) === JSON.stringify(PLAYED),
    `${heard.map(name).join(' ')} vs ${PLAYED.map(name).join(' ')} played`
  );

  const bpm = JSON.parse(await session(page, `s => JSON.stringify({ bpm: s.dawState.bpm })`)).bpm || 110;
  const ticksPerSec = (bpm / 60) * 480;
  const gaps = notes.slice(1).map((n, i) => (n.startTick - notes[i].startTick) / ticksPerSec);
  check(
    'and placed them where they were hummed',
    gaps.every((g) => Math.abs(g - SPACING_SEC) < 0.15),
    `${gaps.map((g) => g.toFixed(2)).join('s, ')}s vs ${SPACING_SEC}s each, at ${bpm} BPM`
  );

  // ---- the numbers are model outputs, not constants ----
  console.log('\n-- the numbers came from the model --');
  const vels = [...new Set(notes.map((n) => n.velocity))];
  const confs = notes.map((n) => n.confidence);
  check(
    'velocity is not one constant for every note',
    vels.length > 1,
    `${vels.join(', ')} — a fabricator writes one number`
  );
  check(
    'each note carries the model\'s own confidence',
    confs.every((c) => typeof c === 'number' && c > 0 && c <= 1),
    confs.map((c) => c.toFixed(3)).join(', ')
  );
  check(
    'and those confidences are not all identical',
    new Set(confs).size > 1,
    `${new Set(confs).size} distinct values across ${confs.length} notes`
  );

  // ---- the panel states what ran ----
  const detail = await page.locator('#transcription-detail').first().innerText().catch(() => '');
  check('the panel names the range it heard', /A4|C5|E5/.test(detail), detail.replace(/\s+/g, ' ').slice(0, 70));
  check('and names the engine that ran', /basic pitch onnx/i.test(detail), 'basic pitch onnx');

  // ---- silence must not produce a melody ----
  console.log('\n-- and it refuses what it cannot hear --');
  const kept = notes.length;
  await page.locator('input[type="file"]').first().setInputFiles(`${SP}/beatbox_ksh.wav`);
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: 'TRANSCRIBE THE MELODY', exact: false }).first().click();
  await page.waitForTimeout(12000);
  const after = JSON.parse(await session(page, NOTES));
  const msg = await page.locator('[data-testid="import-result"]').first().innerText().catch(() => '');
  const errMsg = await page.locator('.text-rose-300, .text-rose-200').first().innerText().catch(() => '');
  check(
    'unpitched percussion does not become an invented melody',
    after.length - kept <= 2,
    `${after.length - kept} notes added from a beatbox file · "${(errMsg || msg).replace(/\s+/g, ' ').slice(0, 80)}"`
  );

  console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})();
