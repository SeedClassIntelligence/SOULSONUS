/**
 * Do vocal takes carry audio, and can they be played?
 *
 * Takes were records with no audio attached and no way to play them. The pool's
 * "record take" button was a setTimeout that produced a take with a literal
 * waveform and nothing behind it; the overdub recorder captured real audio but
 * drew its waveform with Math.random().
 *
 * This records through the real controls, plays the take back, and reloads the
 * page to see whether the audio is still there.
 */
const playwright = require('playwright');
const { launch, enterStudio, session } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(46)} ${detail}`);
}

const PROBE = `
  window.__audio = { started: 0 };
  [window.AudioBufferSourceNode, window.OscillatorNode].forEach(C => {
    if (!C || C.prototype.__probed) return;
    C.prototype.__probed = true;
    const o = C.prototype.start;
    C.prototype.start = function(){ window.__audio.started++; return o.apply(this, arguments); };
  });
`;

const TAKES = `s => JSON.stringify(s.tracks.flatMap(t => (t.vocalTakes || []).map(v => ({
  track: t.id,
  id: v.id,
  name: v.name,
  duration: v.duration,
  waveform: v.waveformData || [],
  playable: /^(blob:|data:audio)/.test(String(v.sourceAudioId || '')),
}))))`;

const takes = async (page) => JSON.parse(await session(page, TAKES));

async function openSuite(page, tab) {
  await page.getByRole('button', { name: '🎙️ SONGWRITING SUITE', exact: false }).first().click({ force: true });
  await page.waitForTimeout(1400);
  const panel = page.locator('div.fixed.right-0:has-text("SONGWRITING SUITE")').first();
  const t = panel.getByRole('button', { name: tab, exact: true }).first();
  if (await t.count()) { await t.click({ force: true }); await page.waitForTimeout(900); }
  return panel;
}

(async () => {
  const { browser, page } = await launch(playwright, `${SP}/hum_A4.wav`);
  await enterStudio(page);
  await page.evaluate(PROBE);

  console.log('=== TAKE AUDIO ===\n');

  const before = await takes(page);
  console.log(`  starting pool: ${before.length} takes, ${before.filter(t => t.playable).length} with audio`);
  check('preset takes carry no audio', before.every(t => !t.playable), `${before.length} preset takes`);

  // ---- record through the take pool's own button ----
  const panel = await openSuite(page, '2. TAKES & POOL');
  const recBtn = panel.locator('[data-testid="record-loop-take"]').first();
  check('the pool has a record control', (await recBtn.count()) > 0, '');
  await recBtn.click({ force: true });
  await page.waitForTimeout(3000);
  const stopLabel = (await recBtn.innerText()).replace(/\s+/g, ' ').trim();
  check('recording is a held state, not a timer', /STOP/i.test(stopLabel), `button reads "${stopLabel}"`);
  await recBtn.click({ force: true });
  await page.waitForTimeout(2500);

  const after = await takes(page);
  const fresh = after.filter((t) => !before.some((b) => b.id === t.id));
  check('a take was added', fresh.length === 1, `${fresh.length} new take(s)`);
  if (!fresh.length) { console.log('\n1 CHECK(S) FAILED'); await browser.close(); process.exit(1); }

  const take = fresh[0];
  console.log(`  new take: "${take.name}" ${take.duration}s, ${take.waveform.length} waveform points`);
  check('the take carries real audio', take.playable, `sourceAudioId is a blob`);
  check('its length was measured, not assumed', take.duration > 1 && take.duration < 30, `${take.duration}s`);
  check('its waveform came from the audio', take.waveform.length > 0 && new Set(take.waveform).size > 1,
        `${take.waveform.length} points, ${new Set(take.waveform).size} distinct`);

  // ---- play it ----
  await page.evaluate('window.__audio.started = 0;');
  const playBtn = panel.locator(`[data-testid="play-take-${take.id}"]`).first();
  check('the new take has a play control', (await playBtn.count()) > 0, '');
  await playBtn.click({ force: true });
  await page.waitForTimeout(2500);
  const played = await page.evaluate('window.__audio.started');
  check('playing the take starts a source', played > 0, `${played} source(s) started`);

  // a preset take must refuse rather than pretend
  const preset = before[0];
  if (preset) {
    const presetBtn = panel.locator(`[data-testid="play-take-${preset.id}"]`).first();
    if (await presetBtn.count()) {
      const disabled = await presetBtn.isDisabled();
      await page.evaluate('window.__audio.started = 0;');
      await presetBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1200);
      const presetPlayed = await page.evaluate('window.__audio.started');
      check('a take with no audio refuses to play', disabled && presetPlayed === 0,
            `disabled=${disabled} sources=${presetPlayed}`);
    } else {
      check('the preset take has a play control', false, 'not rendered');
    }
  }

  // ---- and survive a reload ----
  await page.waitForTimeout(2500);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);
  await page.evaluate(PROBE);

  const reloaded = await takes(page);
  const restored = reloaded.find((t) => t.id === take.id);
  check('the take is still in the pool after a reload', !!restored, restored ? restored.name : 'gone');
  check('and still carries audio', !!restored && restored.playable,
        restored ? `playable=${restored.playable}` : '');

  if (restored && restored.playable) {
    const panel2 = await openSuite(page, '2. TAKES & POOL');
    await page.evaluate('window.__audio.started = 0;');
    const btn2 = panel2.locator(`[data-testid="play-take-${restored.id}"]`).first();
    if (await btn2.count()) {
      await btn2.click({ force: true });
      await page.waitForTimeout(2500);
      const playedAgain = await page.evaluate('window.__audio.started');
      check('the restored take plays', playedAgain > 0, `${playedAgain} source(s) started`);
    } else {
      check('the restored take has a play control', false, 'not rendered');
    }
  }

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})();
