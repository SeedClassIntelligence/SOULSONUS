/**
 * The three wired ACE routes, against a real ACE-Step 1.5 host.
 *
 * Every other check in this directory that touches realization runs against
 * `ace-stub.mjs`, which returns a fixed tone. So nothing in this repository
 * has ever measured what ACE actually does with a creator's take -- and every
 * statement about what it preserves has been unfounded.
 *
 * This is the first measurement. It records rather than grades: no threshold
 * is asserted on a preservation score, because no one has seen one yet and a
 * number invented here would be exactly the thing this file exists to stop.
 * What it does assert is structural -- that a candidate came back, that its
 * scores are measured against the creator's own take rather than entailed by
 * construction, and that three different operations did not return one
 * identical set of numbers.
 *
 * The verdict on whether the sound is right is the creator's (Amendment B.v).
 * This prints what was measured so they can make it.
 *
 * Needs a real host:
 *   uv run acestep-api                 (its own window, on :8001)
 *   npm run studio                     (another)
 *   node scripts/live-verification/test-61-three-routes-real-ace.cjs
 */
const playwright = require('playwright');
const { launch, enterStudio, session, recordTake } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

/** Generous: a 3.5B model on a consumer card is not a stub. */
const PER_ROUTE_MS = Number(process.env.ACE_ROUTE_TIMEOUT_MS || 5 * 60 * 1000);

const ROUTES = [
  { route: 'ACE_PERFORMANCE_TRANSFER', task: 'cover',
    says: 'turn my mouth performance into a studio drum kit',
    prompt: 'Perform this as a studio drum kit' },
  { route: 'ACE_STEM_EXTRACTION', task: 'extract',
    says: 'pull the kick out of this recording',
    prompt: 'Extract the kick' },
  { route: 'ACE_REPAINT', task: 'repaint',
    says: 'change only bar two',
    prompt: 'Rework this passage, keeping the groove', bars: [2, 2] },
];

let failures = 0;
const check = (label, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(58)} ${detail}`);
};

/**
 * The candidate itself, not the panel that draws it.
 *
 * The scorecard renders numbers and no identity -- no route, no candidate id --
 * so three reads of it cannot distinguish "the host returned the same thing
 * three times" from "the drawer never changed and we read one candidate
 * three times". Those are opposite findings. This reads the object.
 */
const READ_CANDIDATE = `(() => {
  const root = document.getElementById('root');
  const key = Object.keys(root).find(k => k.startsWith('__reactContainer$'));
  const fr = root[key] && root[key].stateNode;
  const stack = [(fr && fr.current) || root[key]]; const seen = new Set();
  while (stack.length) {
    const f = stack.pop(); if (!f || seen.has(f)) continue; seen.add(f);
    const v = f.memoizedProps && f.memoizedProps.value;
    if (v && Array.isArray(v.tracks) && v.activeCandidate) {
      const c = v.activeCandidate;
      return {
        id: c.id || null,
        route: c.route || null,
        backend: c.realizerBackend || null,
        model: c.modelVersion || null,
        seed: c.resolvedSeed ?? null,
        basis: c.scoreBasis || null,
        keys: Object.keys(c).join(','),
      };
    }
    if (f.child) stack.push(f.child); if (f.sibling) stack.push(f.sibling);
  }
  return null;
})()`;

/**
 * Waits for the scorecard the creator actually sees.
 *
 * The first version of this walked the fiber tree for `activeCandidate`, the
 * way test-56 does. That state lives in App's own useState and is on no
 * context value, so the predicate is never true -- it polls until it times
 * out, and a `.catch` turns the timeout into a silent pass. Worse, the
 * timeout it ran on was never the one passed: `waitForFunction(fn, x)` reads
 * `x` as the ARGUMENT to fn, not as options, so it has always used the 30s
 * default. That is where an identical "30s" for three different jobs came
 * from -- not from the host.
 */
const waitForScorecard = async (page, ms, previousId) => {
  const started = Date.now();
  while (Date.now() - started < ms) {
    const id = await page.locator('#preservation-scorecard').first()
      .getAttribute('data-candidate-id').catch(() => null);
    if (id && id !== previousId) return id;
    await page.waitForTimeout(2000);
  }
  return null;
};

(async () => {
  console.log('=== THE THREE WIRED ROUTES, AGAINST A REAL ACE ===\n');

  // Is there actually a host? Said plainly, because "no candidate came back"
  // reads as a broken route when it is a missing deployment.
  const status = await fetch('http://localhost:3000/api/e05?action=status')
    .then((r) => r.json())
    .catch(() => null);
  if (!status || status.available !== true) {
    console.log(`  No ACE host answering.  ${status ? status.reason + ': ' + status.detail : 'the studio is not running'}\n`);
    console.log('  Start it, then run this again:\n    uv run acestep-api      (:8001)\n    npm run studio\n');
    process.exit(1);
  }
  console.log('  A host is answering. Measuring.\n');

  const { browser, page } = await launch(playwright, `${SP}/beatbox_ksh.wav`);
  await enterStudio(page);

  // A real take, because all three of these operate on one.
  await recordTake(page, 'Oral Beatbox', 8);
  const takes = JSON.parse(await session(page, `s => JSON.stringify(
    s.tracks.filter(t => t.sourceTakeAudioUrl).map(t => ({ id: t.id, name: t.name })))`));
  check('a take was captured and kept as audio', takes.length > 0,
    takes.map((t) => t.name).join(', ') || 'none');
  if (!takes.length) { await browser.close(); process.exit(1); }
  const trackId = takes[0].id;
  console.log('');

  const results = [];
  let lastId = null;
  for (const r of ROUTES) {
    console.log(`-- "${r.says}"  (${r.task}) --`);
    const started = Date.now();

    await page.evaluate(
      ({ id, route, prompt, bars }) =>
        window.dispatchEvent(
          new CustomEvent('soulsonus:openDrawer', {
            detail: { type: 'realization', trackId: id, route, prompt, ...(bars ? { bars } : {}) },
          })
        ),
      { id: trackId, route: r.route, prompt: r.prompt, bars: r.bars || null }
    );

    const candidateId = await waitForScorecard(page, PER_ROUTE_MS, lastId);
    const seconds = Math.round((Date.now() - started) / 1000);

    const drawer = await page.locator('#preservation-scorecard').first().innerText().catch(() => '');
    const error = await page
      .locator('text=/Realization failed|could not|refused|timed out/i')
      .first().innerText().catch(() => '');
    const numbers = (drawer.match(/\d+(\.\d+)?%/g) || []).map((v) => parseFloat(v));
    const measured = /measured vs source/i.test(drawer);
    const card = page.locator('#preservation-scorecard').first();
    const cand = candidateId
      ? { id: candidateId,
          route: await card.getAttribute('data-route').catch(() => null),
          basis: await card.getAttribute('data-basis').catch(() => null) }
      : null;
    lastId = candidateId || lastId;

    results.push({ ...r, seconds, numbers, measured, error, cand, got: drawer.length > 0 });

    console.log(`   ${seconds}s   ${drawer.length ? drawer.split('\n')[0] : (error || 'nothing came back')}`);
    console.log(`   candidate: ${cand ? `${cand.route} · ${cand.basis} · id ${String(cand.id).slice(-10)}` : 'unreadable'}`);
    if (numbers.length) console.log(`   scores: ${numbers.join(', ')}`);
    console.log('');

    // Clear the drawer before the next one, or the previous candidate is read
    // again and three routes report one result.
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(1200);
  }

  console.log('-- what was measured --');
  for (const r of results) {
    check(`${r.task}: a candidate came back`, r.got && !r.error, r.error || `${r.seconds}s`);
    if (r.got) {
      check(`${r.task}: scored against the creator's own take, not by construction`,
        r.measured, r.measured ? r.numbers.join(', ') : 'no "measured vs source"');
    }
  }

  // Before any claim about the numbers: is each one a NEW candidate for the
  // route that was asked for? A stale drawer read three times produces
  // identical scores and so does a host that returns one fixed thing, and
  // those are opposite findings.
  const ids = results.map((r) => r.cand && r.cand.id).filter(Boolean);
  check('each request produced its own candidate, not one read three times',
    new Set(ids).size === ids.length && ids.length === results.length,
    ids.length ? `${new Set(ids).size} distinct of ${results.length}` : 'no candidate ids');

  for (const r of results) {
    check(`${r.task}: the candidate is for the route that was asked for`,
      !!r.cand && r.cand.route === r.route, r.cand ? r.cand.route : 'unreadable');
  }

  // Only now does an identical-score reading mean anything about the host.
  const sets = results.filter((r) => r.numbers.length).map((r) => r.numbers.join(','));
  check('the three operations did not return identical scores',
    new Set(sets).size === sets.length || sets.length < 2,
    sets.length ? `${new Set(sets).size} distinct of ${sets.length}` : 'nothing to compare');

  console.log('\n-- the numbers, for the creator to judge --');
  for (const r of results) {
    console.log(`  ${r.task.padEnd(10)} ${r.seconds}s   ${r.numbers.length ? r.numbers.join(', ') : '(none)'}`);
  }
  console.log('\n  No threshold is asserted above. Whether these are good is not');
  console.log('  something this file can know -- that measurement belongs to the');
  console.log('  creator (Amendment B.v).\n');

  await browser.close();
  console.log(failures === 0 ? 'ALL STRUCTURAL CHECKS PASSED\n' : `${failures} CHECK(S) FAILED\n`);
  process.exit(failures === 0 ? 0 : 1);
})();
