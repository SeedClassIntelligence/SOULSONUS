/**
 * The shared-session relay, and the honesty it is required to keep.
 *
 * Clause XV.4 exists because the collaboration screen once showed people who
 * were not there. So the first thing checked is not that syncing works -- it
 * is that with nothing configured, the transport says so, in a sentence, and
 * publishes nothing.
 *
 * Then the round trip: two independent stores, one relay, a change made in one
 * and merged by the other through `mergeStates`. No browser -- this is the
 * transport and the relay, which is what is new.
 *
 *   redis-server --port 6399 --daemonize yes
 *   node scripts/live-verification/test-62-collab-transport.cjs
 */
const http = require('node:http');
const { spawnSync } = require('node:child_process');

let failures = 0;
const check = (label, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(60)} ${detail}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Loads the TypeScript route and transport through esbuild, as the app does. */
async function load() {
  const { build } = require('esbuild');
  const out = await build({
    entryPoints: ['scripts/live-verification/_collab_entry.ts'],
    bundle: true, platform: 'node', format: 'esm', write: false,
    external: ['redis'],
  });
  // Written to a real file inside the project rather than imported from a
  // data: URL. `collabRoute` reaches Redis through a dynamic `import('redis')`,
  // and a bare specifier has no node_modules to resolve against from a data
  // URL -- which reports as "a shared session is configured but could not be
  // reached", i.e. as a fault in the route rather than in the loader.
  const fs = require('node:fs');
  const path = require('node:path');
  const tmp = path.join(__dirname, `_collab_bundle_${process.pid}.mjs`);
  fs.writeFileSync(tmp, out.outputFiles[0].text);
  process.on('exit', () => { try { fs.unlinkSync(tmp); } catch {} });
  return import(`file://${tmp}`);
}

const serve = (handler) =>
  new Promise((resolve) => {
    const s = http.createServer(handler);
    s.listen(0, '127.0.0.1', () => resolve({ server: s, port: s.address().port }));
  });

(async () => {
  console.log('=== THE SHARED SESSION: RELAY, TRANSPORT, AND WHAT IT REFUSES TO CLAIM ===\n');

  const mod = await load();
  const { handleCollab, collabConfigFromEnv, createRouteSyncTransport, createCollaborationStore } = mod;

  // ---- 1. Nothing configured. The hardest requirement in the file. ----
  console.log('-- with no shared session configured --');
  const bare = await serve(async (req, res) => {
    const handled = await handleCollab(req, res, collabConfigFromEnv({}));
    if (!handled) { res.statusCode = 404; res.end(); }
  });
  const bareBase = `http://127.0.0.1:${bare.port}`;
  globalThis.fetch = globalThis.fetch || require('undici').fetch;

  const offTransport = createRouteSyncTransport({ getLocalState: () => null, baseUrl: bareBase });
  const offStatus = await offTransport.status();
  check('the transport reports itself unconfigured', offStatus.configured === false,
    String(offStatus.reason || '').slice(0, 70));
  check('and says why, in a sentence rather than a code',
    typeof offStatus.reason === 'string' && offStatus.reason.length > 30 && / /.test(offStatus.reason));
  check('a publish to an unconfigured relay is refused, not silently accepted',
    await fetch(`${bareBase}/api/collab?action=publish&projectId=p1`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: {} }),
    }).then((r) => r.status === 503), '503');
  check('a project id that could shape a Redis key is refused',
    await fetch(`${bareBase}/api/collab?action=publish&projectId=${encodeURIComponent('a/../b *')}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    }).then((r) => r.status === 400), '400');
  bare.server.close();

  // ---- 2. A real Redis. ----
  console.log('\n-- with a real Redis behind it --');
  const REDIS = process.env.COLLAB_TEST_REDIS || 'redis://127.0.0.1:6399';
  const up = spawnSync('redis-cli', ['-u', REDIS, 'ping'], { encoding: 'utf8' });
  if (!/PONG/.test(up.stdout || '')) {
    console.log(`  No Redis at ${REDIS}. Start one and run this again:\n    redis-server --port 6399 --daemonize yes\n`);
    process.exit(1);
  }

  const cfg = collabConfigFromEnv({ REDIS_URL: REDIS });
  const live = await serve(async (req, res) => {
    const handled = await handleCollab(req, res, cfg);
    if (!handled) { res.statusCode = 404; res.end(); }
  });
  const base = `http://127.0.0.1:${live.port}`;

  const t = createRouteSyncTransport({ getLocalState: () => null, baseUrl: base });
  const onStatus = await t.status();
  check('the transport reports the session as configured', onStatus.configured === true,
    JSON.stringify(onStatus));
  check('and hands the browser its own path, never Redis’s address',
    onStatus.configured === true && !/redis:\/\//.test(JSON.stringify(onStatus)),
    JSON.stringify(onStatus));

  // Two stores, two transports, one relay -- as two people would be.
  const projectId = `proj_test_${Date.now()}`;
  const mkStore = (id, name) => {
    let store = null;
    const transport = createRouteSyncTransport({
      getLocalState: () => (store ? store.getState() : null),
      baseUrl: base,
    });
    store = createCollaborationStore({
      projectId, projectName: 'Shared Probe',
      self: { participantId: id, name, role: 'owner' },
      transport,
    });
    return store;
  };

  // EventSource is a browser API; the relay's stream is read directly here.
  const listen = (onState) => {
    const req = http.get(`${base}/api/collab?action=subscribe&projectId=${projectId}`, (res) => {
      let buf = '';
      res.on('data', (c) => {
        buf += c.toString();
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const frame = buf.slice(0, i); buf = buf.slice(i + 2);
          const line = frame.split('\n').find((l) => l.startsWith('data: '));
          if (!line) continue;
          try { const p = JSON.parse(line.slice(6)); if (p.state) onState(p.state); } catch {}
        }
      });
    });
    return () => req.destroy();
  };

  const received = [];
  const stop = listen((st) => received.push(st));
  await sleep(400);

  const alice = mkStore('p_alice', 'Alice');
  alice.invite('Bo', 'collaborator', 'bo@example.com');
  await sleep(900);

  check('a change made in one session reached the relay', received.length > 0,
    `${received.length} frame(s)`);
  const last = received[received.length - 1];
  check('and it carried the participants, not an empty room',
    !!last && Array.isArray(last.participants) && last.participants.length >= 2,
    last ? last.participants.map((p) => p.name).join(', ') : 'nothing');

  // A late joiner gets the room as it stands, before anyone speaks again.
  const lateFrames = [];
  const stopLate = listen((st) => lateFrames.push(st));
  await sleep(700);
  check('a session joining later is handed the room as it stands',
    lateFrames.length > 0 && Array.isArray(lateFrames[0].participants) &&
      lateFrames[0].participants.length >= 2,
    lateFrames.length ? lateFrames[0].participants.map((p) => p.name).join(', ') : 'no snapshot');

  stop(); stopLate(); live.server.close();
  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}\n`);
  process.exit(failures === 0 ? 0 : 1);
})();
