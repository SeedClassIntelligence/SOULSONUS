/**
 * The candidate path stops inventing numbers.
 *
 * The realization drawer has always opened on a candidate carrying four
 * literal preservation scores and an `audioArtifactUrl` built from
 * `Date.now()` — a filename that had never been written, so the audition it
 * offered could never have played. The scorecard rendered 97.8% / 97.0% /
 * 96.5% in confident green for every creator, every performance and every
 * take, because those were constants in the source.
 *
 * This drives the real drawer and checks that what it now shows matches what
 * actually happened: nothing realized, nothing measured, nothing committable.
 * It also checks the service seam reports "not available" rather than throwing
 * something generic, since a realization that was never attempted is not a
 * realization that failed.
 */
const playwright = require('playwright');
const { launch, enterStudio } = require('./lib.cjs');

let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(54)} ${detail}`);
}

const openProposal = (page) =>
  page.evaluate(`window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'proposal' }))`);

(async () => {
  const { browser, page } = await launch(playwright, null);
  await enterStudio(page);

  console.log('=== THE CANDIDATE PATH TELLS THE TRUTH ===\n');

  // ---------- 1. the drawer opens on an honest proposal ----------
  console.log('-- the realization drawer --');
  await openProposal(page);
  await page.waitForTimeout(1800);

  const drawerOpen = await page.locator('#preservation-scorecard').count();
  check('the drawer is open', drawerOpen === 1, `${drawerOpen} scorecard(s)`);

  const status = await page.locator('#candidate-status').first().innerText();
  check('it is labelled as not yet realized', /NOT YET REALIZED/.test(status), `"${status.trim()}"`);

  const scorecard = await page.locator('#preservation-scorecard').first().innerText();
  check(
    'no percentage is shown at all',
    !/\d+\.\d%/.test(scorecard),
    /\d+\.\d%/.test(scorecard) ? `found ${scorecard.match(/\d+\.\d%/g).join(', ')}` : 'none'
  );
  check(
    'none of the old literals appear',
    !/97\.8|97\.0|96\.5|98\.5|89\.2/.test(scorecard),
    'no 97.8 / 97.0 / 96.5 / 98.5 / 89.2'
  );
  check(
    'it says where its statements come from',
    /Nothing has been measured/.test(scorecard) || /not readings/.test(scorecard),
    /Nothing has been measured/.test(scorecard) ? 'unmeasured' : 'entailed by route'
  );
  check(
    'entailed values read as kept / not kept, not as percentages',
    !/\d%/.test(scorecard),
    /\d%/.test(scorecard) ? scorecard.match(/[\d.]+%/g).join(', ') : 'no percentages'
  );

  const blocked = await page.locator('#commit-blocked').count();
  check('committing is blocked, not offered', blocked === 1, blocked ? 'NOTHING TO COMMIT YET' : 'commit button was live');

  const commitEnabled = await page
    .locator('#commit-blocked button')
    .first()
    .isDisabled()
    .catch(() => false);
  check('and the button is genuinely disabled', commitEnabled === true, `disabled=${commitEnabled}`);

  // ---------- 2. the candidate object itself ----------
  console.log('\n-- the candidate behind it --');
  const shape = await page.evaluate(`(() => {
    const root = document.getElementById('root');
    const key = Object.keys(root).find(k => k.startsWith('__reactContainer$'));
    const fiberRoot = root[key] && root[key].stateNode;
    const stack = [(fiberRoot && fiberRoot.current) || root[key]]; const seen = new Set();
    while (stack.length) {
      const f = stack.pop(); if (!f || seen.has(f)) continue; seen.add(f);
      const p = f.memoizedProps;
      if (p && p.candidate && p.candidate.candidateId) {
        const c = p.candidate;
        return {
          id: c.candidateId,
          scores: c.preservationScores,
          basis: c.scoreBasis,
          passed: c.passedIntentContract,
          state: c.governanceState,
          url: c.audioArtifactUrl || null,
          seed: c.seed,
        };
      }
      if (f.child) stack.push(f.child); if (f.sibling) stack.push(f.sibling);
    }
    return null;
  })()`);

  check('a candidate reached the drawer', !!shape, shape ? shape.id : 'none');
  if (shape) {
    // Two honest shapes: nothing measured at all, or values entailed by the
    // route. What must never appear is a near-miss decimal -- that is the
    // shape a measurement has, and it would be read as one.
    const vals = shape.scores ? Object.values(shape.scores) : [];
    check(
      'no score is a near-miss decimal',
      vals.every((v) => v === 0 || v === 1),
      shape.scores ? JSON.stringify(shape.scores) : 'no scores at all'
    );
    check(
      'the basis is declared and is not a measurement',
      shape.basis === 'NOT_MEASURED' || shape.basis === 'BY_CONSTRUCTION',
      `scoreBasis=${shape.basis}`
    );
    check(
      'the contract is unevaluated, not passed and not failed',
      shape.passed === null,
      `passedIntentContract=${shape.passed}`
    );
    check('governance state is UNREALIZED', shape.state === 'UNREALIZED', `governanceState=${shape.state}`);
    check('no artifact URL was invented', shape.url === null, `audioArtifactUrl=${shape.url}`);
    check('the seed is not hardcoded to 42', shape.seed !== 42, `seed=${shape.seed}`);
    check('the id is not a demo id', !/_demo|cand_ace_1$/.test(shape.id), shape.id);
  }

  // ---------- 3. no dead artifact URL is fetchable ----------
  console.log('\n-- the artifact URLs the old path pointed at --');
  const dead = await page.evaluate(`(async () => {
    const paths = [
      '/audio/samples/kick_808_heavy.wav',
      '/audio/instruments/rhodes_mark1.wav',
      '/audio/realization/realization_bass_cand_ace_' + Date.now() + '.wav',
    ];
    const out = [];
    for (const p of paths) {
      try { const r = await fetch(p); out.push([p, r.status, (r.headers.get('content-type') || '')]); }
      catch { out.push([p, 0, 'threw']); }
    }
    return out;
  })()`);
  for (const [p, code, ct] of dead) {
    const isAudio = /audio\//.test(ct);
    check(`${p.slice(0, 44)} is not real audio`, !isAudio, `${code} ${ct || '-'}`);
  }

  // ---------- 4. the service seam ----------
  console.log('\n-- the realization service --');
  const svc = await page.evaluate(`(async () => {
    try {
      const r = await fetch('/api/e05?action=status');
      let body = null;
      try { body = await r.json(); } catch { body = 'not json'; }
      return { status: r.status, body };
    } catch (e) { return { status: 0, body: String(e) }; }
  })()`);
  check(
    'the dev server has no realization route, and that is visible',
    svc.status === 404 || svc.body === 'not json' || svc.body?.available === false,
    `HTTP ${svc.status} · ${JSON.stringify(svc.body).slice(0, 70)}`
  );
  check(
    'the browser holds no ACE endpoint or key',
    !(await page.evaluate(`document.documentElement.innerHTML.includes('ACE_STEP_API_KEY') || document.documentElement.innerHTML.includes('localhost:8001')`)),
    'nothing in the page names the host or the key'
  );

  console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})();
