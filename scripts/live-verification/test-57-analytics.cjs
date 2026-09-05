/**
 * SRT-1 XVI: the session reading its own record, and asking about it.
 *
 * The clause's own phrasing is the constraint -- "You consistently reject
 * brighter synth sounds; should I prioritize warmer timbres?" is a question,
 * and the section calls the result "a learning creative environment". So what
 * is checked here is not that numbers exist. It is that they are counted off
 * things the creator actually did, that nothing is claimed about an audience
 * this build has never had, and that what comes back ends on a question rather
 * than a decision.
 */
const playwright = require('playwright');
const { launch, enterStudio, session, recordTake } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

let failures = 0;
function check(label, ok, detail = '') {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(58)} ${detail}`);
}

const ask = async (page, text) => {
  await page.fill('#intelligence-input', text);
  await page.click('#intelligence-ask');
  await page.waitForTimeout(1500);
  return page.evaluate(() => document.body.innerText);
};

const A = `s => JSON.stringify({
  known: [s.creativeAnalytics.iterationFrequency, s.creativeAnalytics.sectionsRevised,
          s.creativeAnalytics.abandonedIdeas, s.creativeAnalytics.preferredSounds,
          s.creativeAnalytics.projectCompletionTime, s.creativeAnalytics.workflowPatterns]
         .filter(Boolean).length,
  iteration: s.creativeAnalytics.iterationFrequency,
  workflow: s.creativeAnalytics.workflowPatterns,
  notMeasured: s.creativeAnalytics.notMeasured,
  recs: (s.creativeRecommendations || []).map(r => ({ id: r.id, asks: r.asks, words: r.inTheirWords })),
  revisions: (s.revisions || []).length,
})`;

(async () => {
  const { browser, page } = await launch(playwright, `${SP}/beatbox_ksh.wav`);
  await enterStudio(page);

  console.log('=== XVI: WHAT THE SESSION HAS NOTICED ===\n');

  // ---- before anything has happened ----
  console.log('-- an empty session --');
  await page.locator('#btn-blank-canvas').first().click();
  await page.waitForTimeout(1200);
  const before = JSON.parse(await session(page, A));
  check('nothing is counted from a session with no work in it', before.known === 0,
    `${before.known} of 6 measured, ${before.revisions} revisions`);
  check('and each absence says why', before.notMeasured.length >= 4,
    (before.notMeasured[0] || '').slice(0, 80));
  check('including the one the seed asks for that nothing here can measure',
    before.notMeasured.some((n) => /average project completion time/.test(n)),
    (before.notMeasured.find((n) => /completion/.test(n)) || '').slice(0, 90));
  check('no question is raised off nothing', before.recs.length === 0, `${before.recs.length}`);

  await page.getByRole('button', { name: '✦ STUDIO INTELLIGENCE' }).first().click();
  await page.waitForTimeout(800);
  const emptyAnswer = await ask(page, 'what have you noticed about how I am working?');
  check('and asked, it says there is no record to read rather than inventing one',
    /not enough has happened yet|there is no record to read/.test(emptyAnswer),
    (emptyAnswer.match(/[^\n]*(no record to read|not enough has happened)[^\n]*/) || [''])[0].slice(0, 90));
  await page.getByRole('button', { name: '✦ STUDIO INTELLIGENCE' }).first().click();
  await page.waitForTimeout(400);

  // ---- do some work, so there is something to count ----
  console.log('\n-- after actually working --');
  await recordTake(page, 'Oral Beatbox', 8);
  // Three timing changes on one channel: real edits, each a revision.
  const subject = JSON.parse(await session(page, `s => JSON.stringify(
    s.tracks.filter(t => (t.noteEvents||[]).length).map(t => t.id))`))[0];
  for (const mode of ['assisted', 'groove', 'literal']) {
    await page.evaluate(
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
          if (v && Array.isArray(v.tracks) && v.applyTrackTiming) { c = v; break; }
          if (f.child) stack.push(f.child);
          if (f.sibling) stack.push(f.sibling);
        }
        return c && eval('(' + src + ')')(c, arg);
      },
      { src: '(c, a) => c.applyTrackTiming(a.id, a.mode)', arg: { id: subject, mode } }
    );
    await page.waitForTimeout(700);
  }

  const after = JSON.parse(await session(page, A));
  check('the revisions the creator made are what gets counted', after.revisions >= 3,
    `${after.revisions} revisions`);
  check('iteration frequency is measured from them', !!after.iteration,
    after.iteration ? after.iteration.from : 'null');
  check('and it states the count behind it, not just a verdict',
    /revisions over \d+ (seconds|minutes)/.test(after.iteration?.from || ''),
    `${after.iteration?.from} — ${after.iteration?.reads}`);
  check('the workflow pattern is the move actually repeated', !!after.workflow,
    after.workflow ? after.workflow.from : 'null');
  check('and completion time is still null, because nothing records it',
    after.notMeasured.some((n) => /average project completion time/.test(n)));

  // ---- asked ----
  console.log('\n-- asked --');
  await page.getByRole('button', { name: '✦ STUDIO INTELLIGENCE' }).first().click();
  await page.waitForTimeout(800);
  const answer = await ask(page, 'what patterns have you noticed?');
  check('the answer carries the counts it read', /revisions over/.test(answer),
    (answer.match(/[^\n]*revisions over[^\n]*/) || [''])[0].slice(0, 90));
  check('and names what it could not measure', /Not measured/.test(answer));
  check('it never claims a number it did not count',
    !/audience|listeners|replay/i.test(answer.split('What I have noticed')[1] || ''));

  const audience = await ask(page, 'what did my audience think of the hook?');
  check('asked about listeners, it says there are none rather than inventing them',
    /knows anything about an audience/.test(audience),
    (audience.match(/[^\n]*audience[^\n]*/) || [''])[0].slice(0, 90));
  check('and says a sentence about them would be made up',
    /made up/.test(audience));

  await browser.close();
  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}\n`);
  process.exit(failures === 0 ? 0 : 1);
})();
