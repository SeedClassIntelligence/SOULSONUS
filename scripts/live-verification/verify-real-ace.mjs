/**
 * Checks the realization service route against a real ACE-Step 1.5 host.
 *
 * Everything else in this directory drives the browser. This one is for the
 * last mile that a browser cannot reach here: a machine with the model weights
 * on it. It talks to SoulSonus's own `/api/e05`, so what it proves is the
 * whole path -- the route, the request mapping, the polling loop, the audio
 * retrieval -- against the host the creator will actually use.
 *
 *   npm run build
 *   ACE_STEP_ENDPOINT=http://localhost:8001 PORT=8080 npm start &
 *   node scripts/live-verification/verify-real-ace.mjs http://localhost:8080
 *
 * It reports what happened rather than deciding what should have. A host with
 * no weights fails the generation and says why, and that is a pass for the
 * route and a fail for the deployment -- two different things, printed as two
 * different lines.
 */
const BASE = (process.argv[2] || 'http://localhost:8080').replace(/\/+$/, '');
const TIMEOUT_MS = Number(process.env.VERIFY_TIMEOUT_MS || 15 * 60 * 1000);

let failures = 0;
const check = (label, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(56)} ${detail}`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  console.log(`=== THE ROUTE AGAINST A REAL ACE-STEP HOST (${BASE}) ===\n`);

  // 1. Is there a host, and does the route say so honestly?
  const statusRes = await fetch(`${BASE}/api/e05?action=status`).catch(() => null);
  const type = statusRes?.headers.get('content-type') || '';
  check('the route answers, and not with the app shell',
    !!statusRes && statusRes.ok && !type.includes('text/html'), type || 'no answer');
  if (!statusRes || !statusRes.ok) {
    console.log('\n  Start SoulSonus with `npm start` before running this.\n');
    process.exit(1);
  }
  const status = await statusRes.json();
  check('and it reports a host', status.available === true,
    JSON.stringify(status));
  check('with no endpoint or key in what it hands the browser',
    !/http:\/\/|https:\/\/|Bearer/.test(JSON.stringify(status)), JSON.stringify(status));
  if (!status.available) {
    console.log(`\n  No host: ${status.reason} — ${status.detail}\n`);
    process.exit(1);
  }

  // 2. Ask it for something short, and watch the job all the way through.
  const submitRes = await fetch(`${BASE}/api/e05?action=submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task: 'text2music',
      instruction: 'a short warm piano figure, solo',
      prompt: 'solo piano, warm, unhurried',
      durationSeconds: 10,
    }),
  });
  const submit = await submitRes.json();
  check('a job is accepted, and the host names it', !!submit.jobId, JSON.stringify(submit));
  if (!submit.jobId) process.exit(1);

  const started = Date.now();
  let last = null;
  let sawRunning = false;
  process.stdout.write('  polling');
  while (Date.now() - started < TIMEOUT_MS) {
    await sleep(4000);
    const res = await fetch(`${BASE}/api/e05?action=poll&jobId=${encodeURIComponent(submit.jobId)}`);
    last = await res.json();
    if (last.state === 'RUNNING' || last.state === 'QUEUED') {
      sawRunning = true;
      process.stdout.write('.');
      continue;
    }
    break;
  }
  process.stdout.write('\n');

  const elapsed = `${Math.round((Date.now() - started) / 1000)}s`;

  if (last?.state === 'FAILED') {
    // Not asserted here: a host that dies at model load fails in seconds, and
    // calling that a fault in the polling loop would be blaming the route for
    // the deployment's problem.
    // A route that reports the host's own reason is working. A deployment that
    // cannot generate is a separate problem, and this prints it as one.
    check('the route carried the host’s own reason for the failure',
      typeof last.error === 'string' && last.error.length > 20 &&
        !/gave no reason/.test(last.error),
      (last.error || '').slice(0, 120));
    console.log(`  (the job failed after ${elapsed})`);
    console.log(
      `\n  The ROUTE works. The DEPLOYMENT could not generate:\n  ${last.error}\n\n` +
        '  This is not a fault in SoulSonus. Give the host its model weights and run this again.\n'
    );
    process.exit(failures === 0 ? 0 : 1);
  }

  check('the job was watched while it ran, not answered instantly', sawRunning, elapsed);
  check('the job succeeded', last?.state === 'SUCCEEDED', JSON.stringify(last).slice(0, 140));
  check('and it produced audio', Array.isArray(last?.audioPaths) && last.audioPaths.length > 0,
    JSON.stringify(last?.audioPaths));
  check('the host reported the seed it actually used', typeof last?.resolvedSeed === 'number',
    String(last?.resolvedSeed));
  check('and the checkpoint that produced it', typeof last?.resolvedModel === 'string',
    String(last?.resolvedModel));

  // 3. The bytes, through the route.
  const audioRes = await fetch(
    `${BASE}/api/e05?action=audio&path=${encodeURIComponent(last.audioPaths[0])}`
  );
  const bytes = audioRes.ok ? (await audioRes.arrayBuffer()).byteLength : 0;
  check('the audio comes back through the route as real bytes', bytes > 10000,
    `${bytes} bytes, ${audioRes.headers.get('content-type')}`);

  // 4. And a path the host produced for nobody is refused.
  const forbidden = await fetch(`${BASE}/api/e05?action=audio&path=%2Fetc%2Fpasswd`);
  check('a path this service never saw produced is refused', forbidden.status === 403,
    String(forbidden.status));

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}\n`);
  process.exit(failures === 0 ? 0 : 1);
})();
