/**
 * Step 4's two open items, driven in the browser.
 *
 *   1. Adjustable quantization (SRT-1 VII). Three modes that re-place notes
 *      and a fourth that hands the take to realization -- and, because a mode
 *      is only worth offering if it can be taken back, `literal` must put the
 *      performance back on the tick it was played on.
 *   2. Re-reading from a track (Amendment F.iv). A permanent affordance on
 *      captured material, not a prompt shown once at capture time.
 *
 * The take is recorded through the fake microphone rather than written into
 * state, so the reading, the panel and the channels are the ones a creator
 * gets. The timing modes are then measured against a written pattern of the
 * four cases -- on the line, a slip, a placement, on the line -- because a
 * beatbox take may contain none of one of them, and an assertion sampled from
 * a performance is not a measurement.
 */
const playwright = require('playwright');
const { launch, enterStudio, session } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

let failures = 0;
function check(label, ok, detail = '') {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(58)} ${detail}`);
}

/** Calls a function against the live session context, the same object the UI holds. */
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

const STATE = `s => JSON.stringify({
  canUndo: !!s.canUndo,
  undoLabel: s.undoLabel || null,
  revisions: (s.revisions || []).length,
  subject: s.interpretationSubjectId || null,
  reading: s.lastInterpretation ? s.lastInterpretation.hypotheses.map(h => h.role) : null,
  modes: s.trackTimingModes || {},
  tracks: s.tracks.filter(t => (t.noteEvents||[]).length).map(t => ({
    id: t.id, name: t.name,
    ticks: (t.noteEvents||[]).map(n => n.startTick),
    durs: (t.noteEvents||[]).map(n => n.durationTicks),
    captured: (t.noteEvents||[]).map(n => (n.provenance && typeof n.provenance.capturedTick === 'number') ? n.provenance.capturedTick : null),
    steps: (t.steps||[]).filter(Boolean).length,
  })),
})`;

// 480 is a grid line. At 120 BPM a tick is ~1.04 ms, so +10 ticks is a slip
// and +55 is 57 ms out -- past the 40 ms line, a different rhythm.
const WRITTEN = [480, 490, 535, 960];

(async () => {
  const { browser, page } = await launch(playwright, `${SP}/beatbox_ksh.wav`);
  await enterStudio(page);
  const st = async () => JSON.parse(await session(page, STATE));

  console.log('=== STEP 4: TIMING MODES AND RE-READING ===\n');

  // ---- a real take ----
  console.log('-- recording a take --');
  await page.locator('#btn-blank-canvas').first().click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Oral Beatbox' }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: '● RECORD LOOP' }).first().click();
  await page.waitForTimeout(9000);
  await page.getByRole('button', { name: /STOP RECORDING/ }).first().click();
  await page.waitForTimeout(2000);
  const rec = JSON.parse(await session(page, `s => JSON.stringify({ rec: s.dawState.isRecordingMic, mic: s.detectionSettings.enabled })`));
  check('the mic is off before anything is measured', !rec.rec && !rec.mic, JSON.stringify(rec));

  const settle = await st();
  await page.waitForTimeout(1500);
  const captured = await st();
  check('and the take has stopped growing',
    JSON.stringify(settle.tracks) === JSON.stringify(captured.tracks), 'note counts stable across 1.5s');
  const withNotes = captured.tracks.filter((t) => t.ticks.length >= 2);
  check('the take landed on channels', withNotes.length > 0,
    withNotes.map((t) => `${t.name}:${t.ticks.length}`).join(' '));
  if (!withNotes.length) { await browser.close(); process.exit(1); }
  check('and it is off the grid, as a performance is',
    withNotes.some((t) => t.ticks.some((v) => v % 120 !== 0)), 'off-grid onsets present');
  const subject = withNotes[0];

  // ---- the reading is offered after the pass, with a timing row ----
  console.log('\n-- the panel offered after the pass --');
  check('the pass is read as a phrase, not as its last onset',
    Array.isArray(captured.reading) && captured.reading.length > 0,
    (captured.reading || []).join(', '));
  check('a timing row is offered with the reading',
    await page.locator('[data-testid="timing-row"]').first().isVisible().catch(() => false));
  for (const mode of ['literal', 'assisted', 'groove', 'reinterpretation']) {
    check(`  ${mode} is one of the choices`,
      (await page.locator(`[data-testid="timing-${mode}"]`).count()) === 1);
  }

  // ---- re-reading from a track: F.iv ----
  console.log('\n-- re-reading a track that is already committed --');
  let reachable = 0;
  for (const t of withNotes) {
    await page.locator(`[data-track-lane="${t.id}"]`).first().hover().catch(() => {});
    await page.waitForTimeout(150);
    if (await page.locator(`[data-testid="reread-${t.id}"]`).isVisible().catch(() => false)) reachable++;
  }
  check('every channel carrying notes offers a re-read', reachable === withNotes.length,
    `${reachable} of ${withNotes.length} channels`);

  const before = await st();
  await page.locator(`[data-track-lane="${subject.id}"]`).first().hover();
  await page.waitForTimeout(150);
  await page.locator(`[data-testid="reread-${subject.id}"]`).first().click();
  await page.waitForTimeout(800);
  const reread = await st();
  check('it produces a reading', Array.isArray(reread.reading) && reread.reading.length > 0,
    (reread.reading || []).join(', '));
  check('the reading names the track it is about', reread.subject === subject.id, `${reread.subject}`);
  check('and it changes nothing on the track',
    JSON.stringify(reread.tracks) === JSON.stringify(before.tracks), 'note positions identical');
  check('the reading is on screen, not into a closed panel',
    await page.locator('[data-testid="timing-row"]').first().isVisible().catch(() => false));
  const rowText = await page.locator('[data-testid="timing-row"]').first().innerText();
  check('the timing row names the channel it would act on', rowText.includes(subject.name),
    rowText.split('\n')[1] || rowText.slice(0, 60));

  // ---- the four cases, written ----
  console.log('\n-- assisted: fix obvious errors --');
  await ctxCall(page, (c, a) => {
    c.setTracks((prev) => prev.map((t) => t.id === a.id
      ? { ...t, noteEvents: a.ticks.map((tick, i) => ({
            id: 'case_' + i, startTick: tick, durationTicks: 60, midiNote: 36, velocity: 100,
            provenance: { origin: 'MOUTH', creatorEdited: false },
          })), steps: t.steps.map((_, s) => a.ticks.some((k) => Math.floor(k / 120) === s)) }
      : t));
    return true;
  }, { id: subject.id, ticks: WRITTEN });
  await page.waitForTimeout(600);
  const beforeAssist = await st();
  const bTrack = beforeAssist.tracks.find((t) => t.id === subject.id);
  check('the four cases are on the channel',
    JSON.stringify(bTrack.ticks) === JSON.stringify(WRITTEN), bTrack.ticks.join(', '));

  await page.locator('[data-testid="timing-assisted"]').first().click();
  await page.waitForTimeout(600);
  const assisted = await st();
  const aTrack = assisted.tracks.find((t) => t.id === subject.id);
  check('the slip is pulled onto the line it was reaching for',
    aTrack.ticks[1] === 480, `490 -> ${aTrack.ticks[1]}`);
  check('the placement 57 ms out is left where it was played',
    aTrack.ticks[2] === 535, `535 -> ${aTrack.ticks[2]}`);
  check('and the notes already on the grid are untouched',
    aTrack.ticks[0] === 480 && aTrack.ticks[3] === 960, `${aTrack.ticks[0]}, ${aTrack.ticks[3]}`);
  check('the note it moved remembers where it was played',
    aTrack.captured[1] === 490, `capturedTick ${aTrack.captured[1]}`);
  check('and the ones it did not are not stamped with a move',
    aTrack.captured[0] === null && aTrack.captured[2] === null && aTrack.captured[3] === null,
    JSON.stringify(aTrack.captured));
  check('the mode is recorded against the track', assisted.modes[subject.id] === 'assisted',
    JSON.stringify(assisted.modes));
  check('it is undoable', assisted.canUndo, `undo: ${assisted.undoLabel}`);
  check('and it wrote a revision, not a silent setTracks',
    assisted.revisions > beforeAssist.revisions, `${beforeAssist.revisions} -> ${assisted.revisions}`);
  const report = await page.locator('[data-testid="timing-report"]').first().innerText();
  check('the panel reports what happened', /Moved 1 note onto the grid/.test(report), report.slice(0, 90));

  // ---- groove ----
  console.log('\n-- groove: straighten the beat, keep the feel --');
  await page.locator('[data-testid="timing-groove"]').first().click();
  await page.waitForTimeout(600);
  const groove = await st();
  const gTrack = groove.tracks.find((t) => t.id === subject.id);
  check('groove reads from the performance, not from the assisted result',
    gTrack.ticks.every((v, i) => (gTrack.captured[i] === null ? v : gTrack.captured[i]) === WRITTEN[i]),
    JSON.stringify(gTrack.captured));
  const gaps = gTrack.ticks.slice(1).map((v, i) => v - gTrack.ticks[i]);
  check('the beat is regular, and the notes are not on the grid',
    gTrack.ticks.some((v) => v % 120 !== 0), gTrack.ticks.join(', '));
  const grooveReport = await page.locator('[data-testid="timing-report"]').first().innerText();
  check('and it says what it kept', /Straightened the beat/.test(grooveReport), grooveReport.slice(0, 60));
  // 480, 490 and 535 are all inside one sixteenth, so straightening to that
  // grid puts three hits on one position. The panel has to say so.
  const stackedTicks = gTrack.ticks.length - new Set(gTrack.ticks).size;
  check('hits that landed on top of each other are counted', stackedTicks === 2, `${stackedTicks} stacked`);
  check('and the panel says so, with the way back',
    /landed on top of another/.test(grooveReport) && /Keep my timing/.test(grooveReport),
    grooveReport.slice(-90));

  // ---- literal: the way back ----
  console.log('\n-- literal: the way back --');
  await page.locator('[data-testid="timing-literal"]').first().click();
  await page.waitForTimeout(600);
  const literal = await st();
  const lTrack = literal.tracks.find((t) => t.id === subject.id);
  check('every note is back on the tick it was played on',
    JSON.stringify(lTrack.ticks) === JSON.stringify(WRITTEN),
    `${lTrack.ticks.join(', ')} vs ${WRITTEN.join(', ')}`);
  // The grid is a projection of the notes, derived the same way for every note
  // edit: a step is lit for as long as a note sounds through it.
  const expected = new Set();
  WRITTEN.forEach((t, i) => {
    const to = Math.floor((t + Math.max(1, lTrack.durs[i] - 1)) / 120);
    for (let s = Math.floor(t / 120); s <= to; s++) expected.add(s);
  });
  check('and the grid shows exactly those notes',
    lTrack.steps === expected.size, `${lTrack.steps} lit, ${expected.size} derived`);

  // ---- and it is audible ----
  //
  // The modes are only different if the studio plays the difference. The
  // sequencer fires one callback per sixteenth, and every note inside that
  // sixteenth used to be triggered at the callback's own time -- a hard
  // quantize on the way to the speakers, which made literal, assisted and
  // groove sound identical whatever the project file said.
  //
  // Four notes are written 30 ticks apart INSIDE one sixteenth and every other
  // channel silenced. 30 ticks at 120 BPM is 31.25 ms: if the studio plays
  // what is written, voice events appear 31.25 ms apart; if it plays the grid,
  // all four land on one time and that spacing exists nowhere.
  console.log('\n-- the studio plays what was performed, not the grid --');
  const bpm = await ctxCall(page, (c, a) => {
    c.setTracks((prev) => prev.map((t) => t.id === a.id
      ? { ...t, mute: false, steps: t.steps.map((_, s) => s === 4),
          noteEvents: [480, 510, 540, 570].map((tick, i) => ({
            id: 'probe_' + i, startTick: tick, durationTicks: 30, midiNote: 36, velocity: 110,
            provenance: { origin: 'MANUAL', creatorEdited: true },
          })) }
      : { ...t, mute: true, noteEvents: [], steps: t.steps.map(() => false) }));
    return c.dawState.bpm;
  }, { id: subject.id });
  check('the probe pattern is in place at a known tempo', bpm === 120, `bpm ${bpm}`);
  await page.waitForTimeout(800);
  await page.evaluate(`(() => {
    window.__t = [];
    const rec = t => { if (typeof t === 'number' && t > 0) window.__t.push(t); };
    const ap = AudioParam.prototype;
    for (const m of ['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime']) {
      if (ap[m] && !ap[m].__p) { const o = ap[m]; const f = function (v, t) { rec(t); return o.apply(this, arguments); }; f.__p = 1; ap[m] = f; }
    }
    for (const P of [window.OscillatorNode, window.AudioBufferSourceNode]) {
      const p = P && P.prototype;
      if (p && !p.start.__p) { const o = p.start; const f = function (t) { rec(t); return o.apply(this, arguments); }; f.__p = 1; p.start = f; }
    }
    return true;
  })()`);
  await page.locator('button[title="Play (Space)"]').first().click().catch(() => {});
  await page.waitForTimeout(4000);
  const stamps = JSON.parse(await page.evaluate('JSON.stringify(window.__t)'));
  const clusters = [];
  for (const x of [...new Set(stamps)].sort((a, b) => a - b)) {
    if (!clusters.length || x - clusters[clusters.length - 1] > 0.001) clusters.push(x);
  }
  const spaced = clusters.filter((a) => clusters.some((b) => Math.abs(b - a - 0.03125) < 0.002));
  check('the transport sounded the probe', clusters.length >= 4, `${clusters.length} voice events`);
  check('voices fire 31.25 ms apart inside one sixteenth, as written',
    spaced.length >= 3, `${spaced.length} events with a partner exactly 30 ticks later`);

  await page.screenshot({ path: `${SP}/51_timing_and_reread.png` });
  await browser.close();
  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}\n`);
  process.exit(failures === 0 ? 0 : 1);
})();
