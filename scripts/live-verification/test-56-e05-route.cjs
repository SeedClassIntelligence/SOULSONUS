/**
 * The realization seam, end to end, for the first time.
 *
 * `e05Provider.ts` has addressed `/api/e05` since it was written and nothing
 * implemented it, so the fetch fell through to the SPA, came back as
 * index.html, and the provider's guard reported NO_SERVICE_ROUTE. Every
 * realization badge read NO ANSWER because of that -- not because ACE-Step was
 * missing. This drives the whole path with the route in place.
 *
 * The host here is `ace-stub.mjs`, which is NOT a model: it answers ACE's wire
 * protocol with a fixed tone. So what this proves is the wiring -- that our
 * request lands on ACE's field names, that its integer status is read, that a
 * produced file comes back as bytes, and that the studio turns all that into a
 * candidate whose scores are measured rather than asserted. What it cannot
 * prove is anything about realization quality, because nothing in this test
 * realizes anything.
 *
 * Run with the stub on :8099 and the dev server started with
 * ACE_STEP_ENDPOINT=http://127.0.0.1:8099.
 */
const playwright = require('playwright');
const { launch, enterStudio, session, recordTake } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

let failures = 0;
function check(label, ok, detail = '') {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(58)} ${detail}`);
}

(async () => {
  const { browser, page } = await launch(playwright, `${SP}/beatbox_ksh.wav`);
  await enterStudio(page);

  console.log('=== E05: THE ROUTE THAT WAS NEVER THERE ===\n');

  // ---- the seam reports a host instead of a missing route ----
  console.log('-- what the studio can see --');
  const status = JSON.parse(
    await page.evaluate(`fetch('/api/e05?action=status').then(r => r.text())`)
  );
  check('the route answers a status, where the SPA used to answer a page',
    typeof status.available === 'boolean', JSON.stringify(status));
  check('and it reports the host as available', status.available === true, JSON.stringify(status));
  check('with no endpoint or key in anything the browser can read',
    !/8099|127\.0\.0\.1|localhost:8/.test(JSON.stringify(status)), JSON.stringify(status));

  const badge = await page.evaluate(`(async () => {
    const r = await fetch('/api/e05?action=status');
    const type = r.headers.get('content-type') || '';
    return { ok: r.ok, isHtml: type.includes('text/html'), type };
  })()`);
  check('the answer is a service answer, not the app shell',
    badge.ok && !badge.isHtml, JSON.stringify(badge));

  // ---- a realization, all the way through ----
  console.log('\n-- a realization that actually runs --');
  await page.locator('#btn-blank-canvas').first().click();
  await page.waitForTimeout(1200);
  await recordTake(page, 'Oral Beatbox', 8);

  const takes = JSON.parse(await session(page, `s => JSON.stringify(
    s.tracks.filter(t => t.sourceTakeAudioUrl).map(t => ({ id: t.id, name: t.name })))`));
  check('the take was kept as audio, which is what a transfer needs',
    takes.length > 0, takes.map((t) => t.name).join(', ') || 'no take audio');
  if (!takes.length) { await browser.close(); process.exit(1); }

  await page.evaluate(
    ({ id }) =>
      window.dispatchEvent(
        new CustomEvent('soulsonus:openDrawer', {
          detail: { type: 'realization', trackId: id, route: 'ACE_PERFORMANCE_TRANSFER',
                    prompt: 'Perform this as a studio drum kit' },
        })
      ),
    { id: takes[0].id }
  );

  // The stub holds a job running for one poll, so this exercises the real
  // polling loop rather than a synchronous answer.
  await page.waitForFunction(
    `(() => {
      const root = document.getElementById('root');
      const key = Object.keys(root).find(k => k.startsWith('__reactContainer$'));
      const fr = root[key] && root[key].stateNode;
      const stack = [(fr && fr.current) || root[key]]; const seen = new Set();
      while (stack.length) {
        const f = stack.pop(); if (!f || seen.has(f)) continue; seen.add(f);
        const v = f.memoizedProps && f.memoizedProps.value;
        if (v && Array.isArray(v.tracks) && v.activeCandidate) return true;
        if (f.child) stack.push(f.child); if (f.sibling) stack.push(f.sibling);
      }
      return false;
    })()`,
    { timeout: 90000 }
  ).catch(() => {});

  // The candidate lives in App's own state rather than the session, so it is
  // read where a creator reads it: the drawer it opens.
  const drawer = await page
    .locator('#preservation-scorecard')
    .first()
    .innerText()
    .catch(() => '');
  const errorBanner = await page
    .locator('text=/Realization failed|could not|refused|timed out/i')
    .first()
    .innerText()
    .catch(() => '');
  check('a candidate came back from the host, and no failure was reported',
    drawer.length > 0 && !errorBanner, errorBanner || drawer.split('\n')[0]);
  if (!drawer.length) { await browser.close(); process.exit(1); }

  check('its scores are measured against the creator\'s own take',
    /measured vs source/i.test(drawer), drawer.split('\n')[1] || '');
  const numbers = (drawer.match(/\d+(\.\d+)?%/g) || []).map((v) => parseFloat(v));
  check('and they are numbers from that comparison, not a fixed set',
    numbers.length >= 2 && new Set(numbers).size > 1, numbers.slice(0, 6).join(', '));
  // A one-second tone is not a beatbox. A contract that passed this would be a
  // contract that passes anything.
  check('a tone that is nothing like the take does not score as preserved',
    numbers.some((n) => n < 90), numbers.slice(0, 6).join(', '));

  // ---- what the host was actually sent ----
  console.log('\n-- what reached the host --');
  // Asked from here rather than from the page: the stub is another origin, and
  // a browser would be refused before the question was asked -- which is the
  // same reason the browser does not address ACE directly either.
  const received = await fetch('http://127.0.0.1:8099/__received').then((r) => r.json());
  const last = received[received.length - 1];
  check('the request arrived under ACE\'s own field names',
    last && last.fields.task_type === 'cover', JSON.stringify(last && last.fields).slice(0, 120));
  check('the creator\'s instruction reached the model host',
    last && typeof last.fields.instruction === 'string' && last.fields.instruction.length > 0,
    (last && last.fields.instruction || '').slice(0, 90));
  check('and the take itself was uploaded, not a path the host cannot read',
    last && last.audioBytes > 1000, `${last && last.audioBytes} bytes as ${last && last.audioName}`);

  await browser.close();
  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}\n`);
  process.exit(failures === 0 ? 0 : 1);
})();
