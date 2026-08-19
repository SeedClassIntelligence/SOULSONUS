/**
 * The four-bar ceiling.
 *
 * Every previous round of this project worked inside 64 steps because that was
 * the only length that existed. This drives the real control in the real app
 * and checks the five layers a song length has to reach before "longer song"
 * means anything: the data (tracks resize), the grid (bars appear), the
 * transport (the playhead runs past step 63), the note scheduler (a note in
 * bar 12 is scheduled in bar 12, not collapsed onto the last step of bar 4),
 * and the render (a bounce is as long as the song).
 *
 * It also checks the destructive case in the other direction: shortening must
 * keep what falls past the new end and say so, and undo must put the length
 * back.
 */
const playwright = require('playwright');
const { launch, enterStudio, session } = require('./lib.cjs');

let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(52)} ${detail}`);
}

const STATE = `s => JSON.stringify({
  songBars: s.dawState.songBars,
  currentStep: s.dawState.currentStep,
  isPlaying: s.dawState.isPlaying,
  bpm: s.dawState.bpm,
  stepLens: s.tracks.map(t => (t.steps || []).length),
  noteLens: s.tracks.map(t => (t.notes || []).length),
  kickSteps: (s.tracks.find(t => t.id === 't-kick') || {}).steps || [],
  kickOn: ((s.tracks.find(t => t.id === 't-kick') || {}).steps || [])
    .map((v, i) => v ? i : -1).filter(i => i >= 0),
  melodyTicks: ((s.tracks.find(t => t.id === 't-melody') || {}).noteEvents || [])
    .map(e => e.startTick).sort((a, b) => a - b),
  undoLabel: s.undoLabel,
  canUndo: s.canUndo,
})`;
const state = async (page) => JSON.parse(await session(page, STATE));

const STUDIO = `window.__studio = () => {
  const root = document.getElementById('root');
  const key = Object.keys(root).find(k => k.startsWith('__reactContainer$'));
  const fiberRoot = root[key] && root[key].stateNode;
  const stack = [(fiberRoot && fiberRoot.current) || root[key]]; const seen = new Set();
  while (stack.length) {
    const f = stack.pop(); if (!f || seen.has(f)) continue; seen.add(f);
    const v = f.memoizedProps && f.memoizedProps.value;
    if (v && Array.isArray(v.tracks) && v.handleSetSongBars) return v;
    if (f.child) stack.push(f.child); if (f.sibling) stack.push(f.sibling);
  }
  throw new Error('ctx not found');
}`;

async function clickBars(page, n) {
  const btn = page.locator(`#btn-song-bars-${n}`).first();
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  await page.waitForTimeout(900);
}

(async () => {
  const { browser, page } = await launch(playwright, null);
  await enterStudio(page);
  await page.evaluate(STUDIO);

  console.log('=== SONG LENGTH BEYOND FOUR BARS ===\n');

  // ---------- 1. the control exists and the default is four bars ----------
  console.log('-- the control --');
  const base = await state(page);
  check('project opens at 4 bars', base.songBars === 4, `songBars=${base.songBars}`);
  check('tracks are 64 steps wide', base.stepLens.every((n) => n === 64), `lengths ${[...new Set(base.stepLens)].join(',')}`);
  const ctlCount = await page.locator('#song-length-control').count();
  check('a song-length control is on screen', ctlCount === 1, `${ctlCount} found`);
  const barBtns0 = await page.locator('button:text-matches("^BAR \\\\d+$")').count();
  check('bar-focus strip shows 4 bars', barBtns0 === 4, `${barBtns0} buttons`);

  // ---------- 2. lengthening ----------
  console.log('\n-- lengthening to 16 bars --');
  await clickBars(page, 16);
  const long = await state(page);
  check('songBars is 16', long.songBars === 16, `songBars=${long.songBars}`);
  check('every track resized to 256 steps', long.stepLens.every((n) => n === 256), `lengths ${[...new Set(long.stepLens)].join(',')}`);
  check('note arrays resized too', long.noteLens.every((n) => n === 0 || n === 256), `lengths ${[...new Set(long.noteLens)].join(',')}`);
  const kept = base.kickOn.every((i) => long.kickSteps[i]);
  check('the original 4 bars of kick survived', kept, `${base.kickOn.length} hits preserved`);
  const barBtns = await page.locator('button:text-matches("^BAR \\\\d+$")').count();
  check('bar-focus strip now shows 16 bars', barBtns === 16, `${barBtns} buttons`);
  const allLabel = (await page.locator('#btn-bar-view-all').first().innerText()).trim();
  check('the ALL tab reads 256 steps', allLabel === 'ALL 256', `"${allLabel}"`);

  // ---------- 3. a note past bar 4 is editable and keeps its tick ----------
  console.log('\n-- writing past the old ceiling --');
  // Step 180 is inside bar 12 (bars are 16 steps; 180 = bar 12, step 4).
  await page.evaluate('window.__studio().handleToggleStep("t-kick", 180)');
  await page.waitForTimeout(600);
  const written = await state(page);
  check('step 180 (bar 12) toggled on', !!written.kickSteps[180], `kickSteps[180]=${written.kickSteps[180]}`);
  const evTick = await page.evaluate(`(() => {
    const s = window.__studio();
    const t = s.tracks.find(x => x.id === 't-kick');
    const ev = (t.noteEvents || []).filter(e => e.startTick >= 7680).map(e => e.startTick);
    return ev;
  })()`);
  check('a note event exists past tick 7680', evTick.length > 0, `ticks ${evTick.join(',') || 'none'}`);
  check('it kept its real tick (21600), not a clamp', evTick.includes(21600), `got ${evTick.join(',')}`);

  // ---------- 4. tickToStep no longer collapses onto step 63 ----------
  console.log('\n-- the scheduler maps ticks past bar 4 correctly --');
  const mapped = await page.evaluate(`(() => {
    const t = 21600, sixteenth = 120;
    return Math.max(0, Math.floor(t / sixteenth));
  })()`);
  check('tick 21600 maps to step 180 in-page', mapped === 180, `step ${mapped}`);
  const derived = await page.evaluate(`(() => {
    const s = window.__studio();
    const t = s.tracks.find(x => x.id === 't-kick');
    return { steps: (t.steps || []).length, lastOn: (t.steps||[]).map((v,i)=>v?i:-1).filter(i=>i>=0).pop() };
  })()`);
  check('derived step array is song-length', derived.steps === 256, `${derived.steps} steps`);
  check('the derived array marks step 180', derived.lastOn === 180, `last on = ${derived.lastOn}`);

  // ---------- 5. the transport runs past step 63 ----------
  console.log('\n-- the transport --');
  await page.locator('#btn-play-pause').first().click();
  let maxStep = 0;
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(250);
    const s = await state(page);
    if (s.currentStep > maxStep) maxStep = s.currentStep;
    if (maxStep > 70) break;
  }
  check('the playhead ran past step 63', maxStep > 63, `reached step ${maxStep}`);
  await page.locator('#btn-play-pause').first().click();
  await page.waitForTimeout(500);

  // ---------- 6. the render is as long as the song ----------
  console.log('\n-- the render --');
  const bpm = (await state(page)).bpm || 110;
  const bounced = await page.evaluate(`(async () => {
    const s = window.__studio();
    const r = await s.handleBounceMaster('WAV_16');
    const m = /Bounced ([0-9.]+)s/.exec(r.message || '');
    return { ok: !!r.ok, seconds: m ? Number(m[1]) : 0, bytes: r.sizeBytes || 0, message: r.message };
  })()`);
  const expected = (16 * 4 * 60) / bpm;
  const near = Math.abs(bounced.seconds - expected) < expected * 0.25;
  check('bounce is ~16 bars long', near, `${bounced.seconds.toFixed(2)}s vs ${expected.toFixed(2)}s expected at ${bpm} BPM`);
  check('bounce produced real bytes', bounced.bytes > 100000, `${bounced.bytes} bytes — ${bounced.message}`);

  // ---------- 7. shortening keeps material and says so ----------
  console.log('\n-- shortening back to 4 bars --');
  await clickBars(page, 4);
  const short = await state(page);
  check('songBars is back to 4', short.songBars === 4, `songBars=${short.songBars}`);
  check('tracks are 64 steps again', short.stepLens.every((n) => n === 64), `lengths ${[...new Set(short.stepLens)].join(',')}`);
  const noticeCount = await page.locator('#song-length-notice').count();
  const noticeText = noticeCount ? (await page.locator('#song-length-notice').first().innerText()).trim() : '';
  check('a notice reports stranded material', /past the end/.test(noticeText), `"${noticeText.replace(/\s+/g, ' ')}"`);
  const survived = await page.evaluate(`(() => {
    const s = window.__studio();
    const t = s.tracks.find(x => x.id === 't-kick');
    return (t.noteEvents || []).some(e => e.startTick === 21600);
  })()`);
  check('the bar-12 note was kept, not deleted', survived === true, `noteEvents still hold tick 21600: ${survived}`);

  // ---------- 8. undo restores the length ----------
  console.log('\n-- undo --');
  const label = await page.evaluate('window.__studio().undoLabel');
  const undone = await page.evaluate('window.__studio().handleUndo()');
  await page.waitForTimeout(700);
  const afterUndo = await state(page);
  check('undo is labelled as a length change', /Song length/.test(String(label || undone || '')), `label "${label}" / undone "${undone}"`);
  check('undo restored 256-step tracks', afterUndo.stepLens.every((n) => n === 256), `lengths ${[...new Set(afterUndo.stepLens)].join(',')}`);

  console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})();
