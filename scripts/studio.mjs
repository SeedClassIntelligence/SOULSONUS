/**
 * One command that brings the platform up.
 *
 * Everything below already existed and was reachable only by knowing four
 * things at once: that `inference-server/docker-compose.yml` holds the two
 * services, that they answer on 8001 and 8010, that the app has to be told
 * those addresses through environment variables, and that `engines:check`
 * exists to ask them. A creator who knew none of that started the app, saw
 * "not reachable", and had nowhere to go.
 *
 * This starts nothing new and implements nothing new. It runs docker compose,
 * runs the app, and runs the check that already prints the fix line for
 * anything that did not answer.
 *
 *   npm run studio            the app, with both engines
 *   npm run studio -- --app   the app only, no engines
 *
 * Addresses can be overridden the same way they always could:
 * ACE_STEP_ENDPOINT, DEMUCS_ENDPOINT.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const COMPOSE = join(ROOT, 'inference-server', 'docker-compose.yml');

const C = (n) => `\x1b[${n}m`;
const GREEN = C(32), RED = C(31), AMBER = C(33), DIM = C(2), BOLD = C(1), OFF = C(0);

const ACE = process.env.ACE_STEP_ENDPOINT || 'http://localhost:8001';
const DEMUCS = process.env.DEMUCS_ENDPOINT || 'http://localhost:8010';
const appOnly = process.argv.includes('--app');

const line = (s = '') => console.log(s);

/** Is there a docker daemon, not just a docker binary? */
function dockerReady() {
  const bin = spawnSync('docker', ['--version'], { encoding: 'utf8' });
  if (bin.status !== 0) return { ok: false, why: 'Docker is not installed.' };
  const daemon = spawnSync('docker', ['info'], { encoding: 'utf8' });
  if (daemon.status !== 0) return { ok: false, why: 'Docker is installed but its daemon is not running.' };
  return { ok: true };
}

/**
 * Is there an NVIDIA GPU docker can actually hand to a container?
 *
 * This decides whether ace-step is worth starting at all. Its image is a
 * multi-gigabyte CUDA build and its compose entry reserves an nvidia device,
 * so on a machine without one the build burns ten minutes and disk to produce
 * a container that cannot start. Demucs has no such requirement and is the
 * one that should always come up.
 */
function gpuAvailable() {
  if (spawnSync('nvidia-smi', ['-L'], { encoding: 'utf8' }).status === 0) return true;
  const info = spawnSync('docker', ['info', '--format', '{{json .Runtimes}}'], { encoding: 'utf8' });
  return info.status === 0 && /nvidia/i.test(info.stdout || '');
}

function startEngines() {
  if (!existsSync(COMPOSE)) {
    line(`  ${RED}✗${OFF} inference-server/docker-compose.yml is missing.`);
    return;
  }
  const d = dockerReady();
  if (!d.ok) {
    line(`  ${AMBER}•${OFF} Engines not started. ${d.why}`);
    line(`    ${DIM}Start Docker Desktop, or run the services natively:${OFF}`);
    line(`    ${DIM}see inference-server/README.md "Native install"${OFF}`);
    return;
  }
  // Only what this machine can actually run. Naming the services matters:
  // a bare `up -d` also builds ace-step, whose CUDA image is multiple
  // gigabytes and whose compose entry reserves an NVIDIA device -- so on a
  // machine without one it spends ten minutes building a container that then
  // refuses to start.
  const gpu = gpuAvailable();
  const services = gpu ? ['demucs', 'ace-step'] : ['demucs'];
  if (!gpu) {
    line(`  ${DIM}No NVIDIA GPU visible to Docker — starting demucs only.${OFF}`);
    line(`  ${DIM}ace-step needs one; rent it with inference-server/gcp, or force a`);
    line(`  CPU build with: docker compose -f inference-server/docker-compose.yml up -d ace-step${OFF}`);
  }
  line('');
  line(`  ${DIM}docker compose up -d ${services.join(' ')}${OFF}`);
  line(`  ${DIM}The first run builds the image and downloads the model. That is`);
  line(`  several minutes, and the output below is Docker's, not a hang.${OFF}`);
  line('');
  // Inherited, not captured. This used to pipe both streams and print them
  // only at the end, so a ten-minute first build looked like a frozen script.
  const up = spawnSync('docker', ['compose', '-f', COMPOSE, 'up', '-d', ...services], {
    stdio: 'inherit',
  });
  line('');
  if (up.status !== 0) {
    line(`  ${AMBER}•${OFF} Compose exited ${up.status}. The reason is in Docker's output above.`);
    line(`    ${DIM}Retry just the one that matters: docker compose -f inference-server/docker-compose.yml up -d demucs${OFF}`);
    return;
  }
  line(`  ${GREEN}✓${OFF} ${services.join(' and ')} requested.`);
  if (gpu) line(`  ${DIM}The first ACE-Step call downloads ~10GB of weights.${OFF}`);
}

function run(cmd, args, env = {}) {
  return spawn(cmd, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...env },
  });
}

line();
line(`${BOLD}  SOULSONUS${OFF}`);
line();

if (!appOnly) {
  line(`${BOLD}  Engines${OFF}`);
  startEngines();
  line();
}

line(`${BOLD}  Studio${OFF}`);
line(`  ${DIM}http://localhost:3000${OFF}`);
line();

const app = run('npm', ['run', 'dev'], {
  ACE_STEP_ENDPOINT: ACE,
  DEMUCS_ENDPOINT: DEMUCS,
});

// The check runs once the app is answering, so its "service route" line is
// about the server that is actually up rather than about nothing.
const checkAfter = setTimeout(() => {
  run('node', [join(ROOT, 'scripts', 'engines-check.mjs')], {
    ACE_STEP_ENDPOINT: ACE,
    DEMUCS_ENDPOINT: DEMUCS,
    SOULSONUS_URL: 'http://localhost:3000',
  });
}, 6000);

const bye = () => {
  clearTimeout(checkAfter);
  app.kill('SIGINT');
  process.exit(0);
};
process.on('SIGINT', bye);
process.on('SIGTERM', bye);
app.on('exit', (code) => process.exit(code ?? 0));
