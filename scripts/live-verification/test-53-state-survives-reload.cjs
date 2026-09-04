/**
 * Does what this session added actually survive a reload?
 *
 * Three pieces of state were added to the project snapshot -- which timing
 * mode each track sits in, the affective reading of the take, and the
 * creator's own corrections to it -- and a field written into a snapshot that
 * is never read back is the same defect as a setting nobody applies. This
 * saves a project through the session's own save, reopens it in a fresh page,
 * and reads the state back.
 *
 * The reading matters most: it describes the take that is in the project, and
 * a creator who said "this is heavy" and came back to find the studio's own
 * number in its place would have been overruled by a reload.
 */
const playwright = require('playwright');
const { launch, enterStudio, session, recordTake } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

let failures = 0;
function check(label, ok, detail = '') {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(58)} ${detail}`);
}

const STATE = `s => JSON.stringify({
  modes: s.trackTimingModes || {},
  said: s.creatorExpressionReadings || {},
  expression: s.expressionState,
  ticks: s.tracks.filter(t => (t.noteEvents||[]).length)
    .map(t => ({ id: t.id, ticks: (t.noteEvents||[]).map(n => n.startTick),
                 captured: (t.noteEvents||[]).map(n => (n.provenance && n.provenance.capturedTick) ?? null) })),
})`;

function ctxCall(page, fn, arg) {
  return page.evaluate(
    ({ src, arg }) => {
      const root = document.getElementById('root');
      const key = Object.keys(root).find((k) => k.startsWith('__reactContainer$'));
      const fr = root[key] && root[key].stateNode;
      const stack = [(fr && fr.current) || root[key]];
      const seen = new Set();
      let c = null;
      while (stack.length) {
        const f = stack.pop();
        if (!f || seen.has(f)) continue;
        seen.add(f);
        const v = f.memoizedProps && f.memoizedProps.value;
        if (v && Array.isArray(v.tracks) && v.setTracks && v.dawState) { c = v; break; }
        if (f.child) stack.push(f.child);
        if (f.sibling) stack.push(f.sibling);
      }
      if (!c) return null;
      return eval('(' + src + ')')(c, arg);
    },
    { src: fn.toString(), arg }
  );
}

(async () => {
  const { browser, page } = await launch(playwright, `${SP}/hum_melody.wav`);
  await enterStudio(page);
  const st = async () => JSON.parse(await session(page, STATE));

  console.log('=== WHAT SURVIVES A RELOAD ===\n');

  await page.locator('#btn-blank-canvas').first().click();
  await page.waitForTimeout(1200);
  await recordTake(page, 'Hum / Voice', 8);

  const captured = await st();
  const track = captured.ticks[0];
  check('a take is on a channel', !!track && track.ticks.length > 1,
    track ? `${track.ticks.length} notes on ${track.id}` : 'none');
  check('and it was read', !!captured.expression, `${captured.expression?.measuredFrom.onsets} onsets`);

  // Quantize it, and say something about it, so there is state to lose.
  const applied = await ctxCall(page, (c, a) => c.applyTrackTiming(a.id, 'groove'), { id: track.id });
  check('groove applied', !!applied && applied.moved > 0, applied ? applied.summary.slice(0, 60) : 'no result');
  await ctxCall(page, (c) => c.setExpressionReading('darkness', -0.8));
  await page.waitForTimeout(600);

  const before = await st();
  check('the mode is recorded against the track', before.modes[track.id] === 'groove',
    JSON.stringify(before.modes));
  check('and the creator overruled a dimension', before.said.darkness === -0.8,
    JSON.stringify(before.said));

  const saved = await ctxCall(page, (c) => c.handleSaveProjectAs('reload check').then((s) => s && s.id));
  check('the project saved', !!saved, String(saved));
  if (!saved) { await browser.close(); process.exit(1); }

  // A genuinely fresh page, then reopen.
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: 'ENTER THE STUDIO' }).first().click().catch(() => {});
  await page.waitForTimeout(2500);
  const reopened = await ctxCall(page, (c, a) => c.handleOpenProject(a.id), { id: saved });
  check('and reopens', reopened === true, String(reopened));
  await page.waitForTimeout(2000);

  const after = await st();
  const afterTrack = after.ticks.find((t) => t.id === track.id);
  check('the notes come back where the mode left them',
    !!afterTrack && JSON.stringify(afterTrack.ticks) === JSON.stringify(before.ticks[0].ticks),
    afterTrack ? afterTrack.ticks.slice(0, 5).join(', ') : 'track missing');
  check('and each note still remembers where it was played',
    !!afterTrack && JSON.stringify(afterTrack.captured) === JSON.stringify(before.ticks[0].captured),
    'capturedTick preserved');
  check('the timing mode survives, so the row does not lie about what is applied',
    after.modes[track.id] === 'groove', JSON.stringify(after.modes));
  check('the affective reading survives', !!after.expression,
    after.expression ? `${after.expression.measuredFrom.onsets} onsets` : 'lost');
  check('and it is the same reading, not a fresh one',
    !!after.expression &&
      JSON.stringify(after.expression.measuredFrom) === JSON.stringify(before.expression.measuredFrom),
    JSON.stringify(after.expression?.measuredFrom));
  check('what the creator said about the take survives a reload',
    after.said.darkness === -0.8 && after.expression.darkness.fromCreator === true,
    `${JSON.stringify(after.said)} / ${after.expression?.darkness?.from}`);

  await browser.close();
  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}\n`);
  process.exit(failures === 0 ? 0 : 1);
})();
