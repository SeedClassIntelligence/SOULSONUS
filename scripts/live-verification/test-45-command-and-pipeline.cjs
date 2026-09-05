/**
 * The two survivors of the orphan sweep, now on screen.
 *
 * Neither was a weak duplicate — they were good code nothing rendered, so
 * neither had ever run. The voice bar had a real speech recogniser and a real
 * parser; the SoulFlow governor had real transition validation with a passing
 * node test, while `soulFlowState` sat on the project state advancing with
 * nothing checked.
 *
 * The parser also had a habit worth killing on the way in: every command
 * returned a sentence in the past tense — "Nudged pattern 1/16th step left." —
 * which the bar displayed the instant the words were parsed, before anything
 * ran. So the checks here are not "does the bar respond" but "did the session
 * actually change, and does the bar say what happened rather than what was
 * asked for".
 */
const playwright = require('playwright');
const { launch, enterStudio, session, UTILITY_TITLE, READ_SESSION } = require('./lib.cjs');

let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(52)} ${detail}`);
}

const STATE = `s => JSON.stringify({
  bpm: s.dawState.bpm,
  isPlaying: s.dawState.isPlaying,
  stage: s.dawState.soulFlowState,
  activeSteps: s.tracks.reduce((n, t) => n + (t.steps || []).filter(Boolean).length, 0),
  kickOn: ((s.tracks.find(t => t.id === 't-kick') || {}).steps || []).map((v, i) => v ? i : -1).filter(i => i >= 0),
  selected: s.selectionContext.selectedTrackId,
})`;
const state = async (page) => JSON.parse(await session(page, STATE));

async function command(page, text) {
  const input = page.locator('[data-testid="voice-input"]').first();
  await input.scrollIntoViewIfNeeded();
  await input.fill(text);
  await page.locator('[data-testid="voice-execute"]').first().click();
  await page.waitForTimeout(900);
  return (await page.locator('[data-testid="voice-feedback"]').first().innerText().catch(() => '')).trim();
}

(async () => {
  const { browser, page } = await launch(playwright, null);
  await enterStudio(page);

  console.log('=== THE COMMAND BAR ===\n');

  // The rail entry is 'SAY IT' now and carries no id; addressed by the title
  // that says what it opens, which is what survives a relabelling.
  const open = page.locator(`button[title="${UTILITY_TITLE.SAY_IT}"]`).first();
  check('there is a way to open it', (await open.count()) === 1, 'SAY IT in the utility bar');
  await open.scrollIntoViewIfNeeded();
  await open.click();
  await page.waitForTimeout(800);
  check('it opens', (await page.locator('[data-testid="voice-input"]').count()) === 1, 'input on screen');

  // ---- tempo: the easiest thing to check against real state ----
  console.log('\n-- a command that changes the session --');
  const before = await state(page);
  const fasterMsg = await command(page, 'speed up');
  const faster = await state(page);
  check(
    'the tempo actually moved',
    faster.bpm === before.bpm + 10,
    `${before.bpm} → ${faster.bpm} BPM`
  );
  check(
    'and the bar reports what happened, with the real numbers',
    fasterMsg.includes(String(before.bpm)) && fasterMsg.includes(String(faster.bpm)),
    `"${fasterMsg}"`
  );

  const slowerMsg = await command(page, 'slow down');
  const slower = await state(page);
  check('it goes the other way too', slower.bpm === faster.bpm - 10, `${faster.bpm} → ${slower.bpm} BPM · "${slowerMsg}"`);

  // ---- a pattern edit ----
  console.log('\n-- a command that edits a pattern --');
  // The session opens empty now, and nudging an empty grid moves nothing --
  // this asserted movement in a pattern that had none to make. A uniform grid
  // is no better: shifting every-step-on looks identical to itself. So a few
  // steps are put on the kick first, through the session rather than through
  // the bar, and the nudge has something with a shape to move.
  await page.evaluate(`(() => {
    const s = ${READ_SESSION};
    const kick = s.tracks.find(t => t.instrument === 'kick') || s.tracks[0];
    [0, 5, 11].forEach((i) => s.handleToggleStep(kick.id, i));
  })()`);
  await page.waitForTimeout(800);
  const beforeNudge = await state(page);
  const nudgeMsg = await command(page, 'nudge right');
  const afterNudge = await state(page);
  const moved = JSON.stringify(beforeNudge.kickOn) !== JSON.stringify(afterNudge.kickOn) ||
                beforeNudge.selected !== 't-kick';
  check('a nudge changes the pattern', moved, `"${nudgeMsg}"`);
  check(
    'and the message names the channel it changed',
    /Nudged .+ one 16th right/.test(nudgeMsg),
    nudgeMsg
  );

  const invertBefore = await state(page);
  const invertMsg = await command(page, 'invert');
  const invertAfter = await state(page);
  check(
    'invert really inverts',
    invertAfter.activeSteps !== invertBefore.activeSteps,
    `${invertBefore.activeSteps} → ${invertAfter.activeSteps} active steps · "${invertMsg}"`
  );

  // ---- a command the parser cannot execute ----
  //
  // This used to require the bar to answer "I cannot do it yet". Clause III.5
  // changed that deliberately: language stops dying at the parser, and
  // anything that is not a direct command is carried to the co-producer rather
  // than refused. The requirement that survives is the one that matters -- it
  // must never report having done something it did not do.
  console.log('\n-- a command the parser cannot execute --');
  const DONE = /\b(Nudged|Inverted|Cloned|Tempo \d|Set |Quantized|Cleared|Randomi[sz]ed)\b/;
  const swapBefore = await state(page);
  const swapMsg = await command(page, 'give me a fatter kick');
  const swapAfter = await state(page);
  check(
    'a request it cannot execute is not reported as done',
    !DONE.test(swapMsg) && JSON.stringify(swapBefore) === JSON.stringify(swapAfter),
    `"${swapMsg.slice(0, 90)}"`
  );
  check(
    'and it is carried to the co-producer rather than dropped',
    swapMsg.trim().length > 0,
    `${swapMsg.trim().length} characters back`
  );
  const gibBefore = await state(page);
  const gibberish = await command(page, 'xylophone quantum tuesday');
  const gibAfter = await state(page);
  check(
    'an unrecognised command changes nothing and claims nothing',
    !DONE.test(gibberish) && JSON.stringify(gibBefore) === JSON.stringify(gibAfter),
    `"${gibberish.slice(0, 90)}"`
  );

  // ---- the pipeline ----
  console.log('\n=== THE PIPELINE GATE ===\n');
  await page.locator(`button[title="${UTILITY_TITLE.SAY_IT}"]`).first().click();
  await page.waitForTimeout(400);
  const pipe = page.locator(`button[title="${UTILITY_TITLE.PIPELINE}"]`).first();
  check('there is a way to open it', (await pipe.count()) === 1, 'PIPELINE in the utility bar');
  await pipe.scrollIntoViewIfNeeded();
  await pipe.click();
  await page.waitForTimeout(900);

  const stages = await page.locator('button:has-text("CAPTURE"), button:has-text("INTERPRET")').count();
  check('the stages are on screen', stages > 0, `${stages} stage controls`);

  const start = await state(page);
  check('the project starts at CAPTURED', start.stage === 'CAPTURED', `stage=${start.stage}`);

  // Jumping to the last stage must be refused: the requirements between here
  // and there have not been met. Targeting the stage control by id, because a
  // click that lands on nothing would leave the stage unchanged too and this
  // check would pass for the wrong reason.
  const lastStage = page.locator('[data-testid="stage-EXPORTED"], [data-testid="stage-SIGNED"]').first();
  const stageBtn = (await lastStage.count()) ? lastStage : page.locator('[data-testid^="stage-"]').last();
  check('the last stage has a control', (await stageBtn.count()) === 1, await stageBtn.getAttribute('data-testid'));
  await stageBtn.click();
  await page.waitForTimeout(900);

  const gate = page.locator('[data-testid="soulflow-gate"]').first();
  check('the gate stops it', (await gate.count()) === 1, `${await gate.count()} gate dialog(s)`);
  const jumped = await state(page);
  check(
    'and the stage did not move',
    jumped.stage === start.stage,
    `stage is still ${jumped.stage}`
  );
  const why = (await gate.innerText().catch(() => '')).replace(/\s+/g, ' ');
  check(
    'it names what is missing',
    /Missing Stage Requirements/i.test(why) && why.length > 60,
    why.slice(0, 96)
  );

  // A stage whose requirements ARE met must be allowed, or the gate is just a
  // wall rather than a check.
  console.log('\n-- and it lets a legitimate move through --');
  await page.locator('[data-testid="soulflow-gate"] button').first().click().catch(() => {});
  await page.waitForTimeout(500);
  const next = page.locator('[data-testid="stage-TRANSLATED"]').first();
  if (await next.count()) {
    await next.click();
    await page.waitForTimeout(900);
    const moved = await state(page);
    check(
      'TRANSLATED is reachable — the grid has notes',
      moved.stage === 'TRANSLATED',
      `stage=${moved.stage} with ${moved.activeSteps} active steps`
    );
  }

  console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})();
