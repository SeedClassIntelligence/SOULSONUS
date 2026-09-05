/**
 * What is actually connected, before you sit down to work.
 *
 * SoulSonus runs against two self-hosted, open-source services, and neither of
 * them is bundled: ACE-Step for realization and Demucs for stem separation.
 * When one is missing the app says so honestly in its own surfaces -- but it
 * says so at the moment you try to use it, which is the wrong moment to find
 * out. This asks both, from the same addresses the app uses, and prints what
 * is true right now.
 *
 * It starts nothing and downloads nothing. Where something is not reachable it
 * prints the command that would fix it rather than a status code.
 *
 *   npm run engines:check
 *   ACE_STEP_ENDPOINT=http://192.168.1.20:8001 npm run engines:check
 */

const ACE = (process.env.ACE_STEP_ENDPOINT || 'http://localhost:8001').replace(/\/+$/, '');
const DEMUCS = (process.env.DEMUCS_ENDPOINT || 'http://localhost:8010').replace(/\/+$/, '');
const APP = (process.env.SOULSONUS_URL || 'http://localhost:8080').replace(/\/+$/, '');
const KEY = process.env.ACESTEP_API_KEY || '';
const TIMEOUT = Number(process.env.ENGINES_TIMEOUT_MS || 4000);

const C = (n) => `\x1b[${n}m`;
const GREEN = C(32), RED = C(31), AMBER = C(33), DIM = C(2), OFF = C(0);

/**
 * The same probe the service route uses: `query_result` with an empty list is
 * the cheapest call that proves the host exists AND answers as ACE. It costs
 * the model nothing and exists on every ACE build.
 */
async function askAce() {
  try {
    const res = await fetch(`${ACE}/query_result`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(KEY ? { Authorization: `Bearer ${KEY}` } : {}),
      },
      body: JSON.stringify({ task_id_list: [] }),
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, why: 'It refused these credentials.', fix: 'Set ACESTEP_API_KEY to the key the host was started with.' };
    }
    if (!res.ok) {
      return { ok: false, why: `It answered ${res.status}.`, fix: 'docker compose -f inference-server/docker-compose.yml logs ace-step' };
    }
    const body = await res.json().catch(() => null);
    if (!body || !('data' in body)) {
      return { ok: false, why: 'Something is at that address, but it is not ACE-Step.', fix: `Check what ACE_STEP_ENDPOINT points at (${ACE}).` };
    }
    return { ok: true, why: "Answers ACE-Step's protocol." };
  } catch {
    return {
      ok: false,
      why: 'Nothing answered.',
      fix: 'cd inference-server && docker compose up -d ace-step   (first run downloads ~10GB of weights)',
    };
  }
}

async function askDemucs() {
  try {
    const res = await fetch(`${DEMUCS}/health`, { signal: AbortSignal.timeout(TIMEOUT) });
    if (!res.ok) {
      return { ok: false, why: `It answered ${res.status}.`, fix: 'docker compose -f inference-server/docker-compose.yml logs demucs' };
    }
    const body = await res.json().catch(() => null);
    const model = body && (body.model || body.demucs_model);
    return { ok: true, why: typeof model === 'string' ? `Ready on ${model}.` : 'Ready.' };
  } catch {
    return {
      ok: false,
      why: 'Nothing answered.',
      fix: 'cd inference-server && docker compose up -d demucs   (runs on CPU, no GPU needed)',
    };
  }
}

/**
 * The service route, if a built SoulSonus server is running.
 *
 * Worth asking separately: the browser never talks to ACE directly, it talks
 * to this route, and the route holding the wrong endpoint looks exactly like
 * a missing model from inside the app.
 */
async function askRoute() {
  try {
    const res = await fetch(`${APP}/api/e05?action=status`, { signal: AbortSignal.timeout(TIMEOUT) });
    const type = res.headers.get('content-type') || '';
    if (type.includes('text/html')) {
      return { ok: false, why: 'That address answered with the app page, not the service route.', fix: 'Run the built server (npm run build && npm start), not the static files alone.' };
    }
    const body = await res.json().catch(() => null);
    if (!body) return { ok: false, why: 'The route answered, but not with JSON.', fix: '' };
    if (body.available) return { ok: true, why: 'The app can reach realization.' };
    return {
      ok: false,
      why: `${body.reason}: ${body.detail}`,
      fix: body.reason === 'NOT_CONFIGURED'
        ? 'Start the server with the endpoint set: ACE_STEP_ENDPOINT=http://localhost:8001 npm start'
        : '',
    };
  } catch {
    return { ok: false, why: 'No SoulSonus server is running at that address.', fix: `npm run build && ACE_STEP_ENDPOINT=${ACE} npm start`, soft: true };
  }
}

const line = (name, addr, r) => {
  const mark = r.ok ? `${GREEN}connected${OFF}` : r.soft ? `${AMBER}not running${OFF}` : `${RED}not reachable${OFF}`;
  console.log(`  ${name.padEnd(22)} ${mark}`);
  console.log(`  ${''.padEnd(22)}${DIM}${addr}${OFF}`);
  console.log(`  ${''.padEnd(22)}${r.why}`);
  if (!r.ok && r.fix) console.log(`  ${''.padEnd(22)}${DIM}${r.fix}${OFF}`);
  console.log('');
};

const [ace, demucs, route] = await Promise.all([askAce(), askDemucs(), askRoute()]);

console.log('\n  SOULSONUS ENGINES\n');
line('ACE-Step (realize)', ACE, ace);
line('Demucs (stems)', DEMUCS, demucs);
line('Service route', `${APP}/api/e05`, route);

// Recording needs neither of them, and that is worth saying out loud: a
// creator can perform, be classified onto channels, edit, mix, master and
// export with both of these off.
console.log(`  ${DIM}Capture, editing, mixing, mastering and export need neither service.`);
console.log(`  Recording works whatever the lines above say.${OFF}\n`);

process.exit(ace.ok && demucs.ok ? 0 : 1);
