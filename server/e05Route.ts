/**
 * The service route the browser has been calling all along.
 *
 * `e05Provider.ts` addresses `/api/e05?action=status|submit|poll|audio` and
 * has since it was written. Nothing implemented it. There is no `server.js`,
 * no `api/` directory, and the dev server has middleware for `/ort/` and
 * nothing else -- so the fetch fell through to the SPA, came back as
 * `index.html`, and the provider's own guard reported NO_SERVICE_ROUTE. That
 * is why every realization badge reads NO ANSWER: not because ACE-Step is
 * missing, but because a creator could run the container, have it healthy on
 * :8001, and still have nothing for the browser to talk to.
 *
 * This is that missing half, and it is deliberately thin. It maps our request
 * onto ACE-Step 1.5's own async API and maps the answer back. It does not
 * decide anything about music.
 *
 * Three things make it a service layer rather than a proxy:
 *
 *   The host address and the API key stay on this side. `e05Contract` states
 *   the rule -- a status detail "never contains an endpoint or a key" -- and
 *   the browser could not hold them safely anyway: ACE's own route_setup
 *   admits only localhost origins, so a cross-origin call from a deployed
 *   page is refused before the model is consulted.
 *
 *   Audio is served only for paths this route was told about by ACE itself.
 *   `?action=audio&path=` reaches a file-reading endpoint on the model host;
 *   without the check below, anything that could reach this route could ask
 *   that host to read a path of its choosing.
 *
 *   And nothing here invents a result. Unreachable is reported as
 *   unreachable, a failed job as failed with whatever reason the host gave.
 *   The whole seam exists because the path it replaced returned a plausible
 *   score for every request.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  e05StateFromAceStatus,
  extractAudioPath,
  toAceTaskBody,
  validateE05Request,
  type E05Request,
  type E05Result,
  type E05ServiceStatus,
} from '../src/lib/inference/e05Contract';

export interface E05RouteConfig {
  /** Where ACE-Step 1.5 is listening. Empty string means realization is not configured. */
  endpoint: string;
  apiKey?: string;
  /**
   * Which header carries the key. ACE's own compose file names the variable
   * and not the header, so this is configurable rather than assumed.
   */
  apiKeyHeader: string;
  /** How the key is written into that header. `{key}` is replaced. */
  apiKeyFormat: string;
}

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): E05RouteConfig {
  return {
    endpoint: (env.ACE_STEP_ENDPOINT ?? 'http://localhost:8001').replace(/\/+$/, ''),
    apiKey: env.ACESTEP_API_KEY || undefined,
    apiKeyHeader: env.ACESTEP_API_KEY_HEADER || 'Authorization',
    apiKeyFormat: env.ACESTEP_API_KEY_FORMAT || 'Bearer {key}',
  };
}

/**
 * Paths ACE reported for jobs this route submitted.
 *
 * Held in memory on purpose: it is a permission list for one process, not a
 * record of anything. A restart forgets it, and a creator whose job outlived
 * the restart re-submits -- which is the correct trade against handing a
 * file-reading endpoint an unchecked path.
 */
const issuedPaths = new Set<string>();

/**
 * How many produced paths stay fetchable.
 *
 * The set is a permission list, not a record, and a server that runs for weeks
 * would otherwise hold every path it ever saw. The oldest is dropped when the
 * cap is reached; a creator whose realization is that far in the past has long
 * since had its audio.
 */
const MAX_ISSUED_PATHS = 500;

const rememberPath = (path: string) => {
  if (issuedPaths.size >= MAX_ISSUED_PATHS) {
    const oldest = issuedPaths.values().next().value;
    if (oldest) issuedPaths.delete(oldest);
  }
  issuedPaths.add(path);
};

const authHeaders = (cfg: E05RouteConfig): Record<string, string> =>
  cfg.apiKey ? { [cfg.apiKeyHeader]: cfg.apiKeyFormat.replace('{key}', cfg.apiKey) } : {};

const json = (res: ServerResponse, status: number, body: unknown) => {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(text),
    'Cache-Control': 'no-store',
  });
  res.end(text);
};

const readBody = (req: IncomingMessage): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

/**
 * Is the host there, and does it answer as ACE?
 *
 * `query_result` with an empty list is the cheapest call that proves both: it
 * exists on every ACE build, costs the model nothing, and a host that answers
 * it with JSON is the host we think it is.
 */
export async function e05Status(cfg: E05RouteConfig): Promise<E05ServiceStatus> {
  if (!cfg.endpoint) {
    return {
      available: false,
      reason: 'NOT_CONFIGURED',
      detail: 'No realization host is configured for this deployment.',
    };
  }
  try {
    const res = await fetch(`${cfg.endpoint}/query_result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(cfg) },
      body: JSON.stringify({ task_id_list: [] }),
      signal: AbortSignal.timeout(4000),
    });
    if (res.status === 401 || res.status === 403) {
      return {
        available: false,
        reason: 'UNAUTHORIZED',
        detail: 'The realization host refused this deployment’s credentials.',
      };
    }
    if (!res.ok) {
      return {
        available: false,
        reason: 'UNREACHABLE',
        detail: `The realization host answered ${res.status}.`,
      };
    }
    const body = (await res.json().catch(() => null)) as { data?: unknown } | null;
    if (!body || !('data' in body)) {
      return {
        available: false,
        reason: 'UNREACHABLE',
        detail: 'Something answered at the realization host’s address, but not ACE-Step.',
      };
    }
    return { available: true };
  } catch {
    // Includes the timeout. A host that is starting up and downloading ten
    // gigabytes of weights is unreachable in the only sense that matters here.
    return {
      available: false,
      reason: 'UNREACHABLE',
      detail: 'The realization host did not answer.',
    };
  }
}

/** Submits one job. Returns the host's task id, which is the job id we hand back. */
async function submit(req: IncomingMessage, res: ServerResponse, cfg: E05RouteConfig) {
  const raw = await readBody(req);
  const contentType = req.headers['content-type'] || '';

  let request: E05Request;
  let sourceAudio: File | null = null;

  if (contentType.includes('multipart/form-data')) {
    // Node's own multipart parsing, through the fetch types it already ships.
    const form = await new Request('http://local/', {
      method: 'POST',
      headers: { 'content-type': contentType },
      body: raw,
    }).formData();
    const declared = form.get('request');
    if (typeof declared !== 'string') {
      return json(res, 400, { error: 'The submission carried no request.' });
    }
    request = JSON.parse(declared) as E05Request;
    const file = form.get('src_audio');
    if (file && typeof file !== 'string') sourceAudio = file as File;
  } else {
    request = JSON.parse(raw.toString('utf8') || '{}') as E05Request;
  }

  const invalid = validateE05Request(request, !!sourceAudio);
  if (invalid) return json(res, 400, { error: invalid });

  // The wire names differ from ours in several places; `toAceTaskBody` is the
  // one place that knows how, so this route cannot drift from the browser's
  // idea of the same request.
  const fields = toAceTaskBody(request);

  let aceRes: Response;
  if (sourceAudio) {
    // Sent as a file rather than as `src_audio_path`: the path form expects
    // ACE to already be able to read the file, which is only true when the
    // model host shares a filesystem with this one.
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.append(key, String(value));
    form.append('src_audio', sourceAudio, (sourceAudio as File).name || 'source.wav');
    aceRes = await fetch(`${cfg.endpoint}/release_task`, {
      method: 'POST',
      headers: { ...authHeaders(cfg) },
      body: form,
    });
  } else {
    aceRes = await fetch(`${cfg.endpoint}/release_task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(cfg) },
      body: JSON.stringify(fields),
    });
  }

  const body = (await aceRes.json().catch(() => null)) as
    | { data?: { task_id?: string; queue_position?: number }; error?: string | null }
    | null;
  const jobId = body?.data?.task_id;
  if (!aceRes.ok || !jobId) {
    return json(res, 502, {
      error: body?.error || `The realization host refused the job (${aceRes.status}).`,
    });
  }
  return json(res, 200, { jobId, queuePosition: body?.data?.queue_position });
}

/**
 * Reads one `query_result` row into our own result shape.
 *
 * Exported and pure so the payloads a live server actually returns can be
 * tested without one -- which is how the two defects below were caught, and
 * how they stay caught.
 */
export function parseAceRow(
  row: { task_id: string; status: number; result?: string },
  jobId: string
): E05Result {
  const result: E05Result = { jobId, state: e05StateFromAceStatus(row.status) };

  // `result` is a JSON string on the row, and a live server settled two things
  // the published API reference does not say.
  //
  // It is an ARRAY of entries -- `[{"file": ..., "status": 2, ...}]` -- because
  // a job can be a batch. Read as an object, `file` is undefined on every
  // successful job, and the realization fails with "the host reported success
  // but returned no audio". A stub written from the documentation returns an
  // object and never shows this.
  //
  // And a failed entry carries `error` with the host's own explanation. Without
  // reading it, a creator whose job died because the model weights could not be
  // downloaded is told the host "gave no reason", while the host gave a
  // paragraph.
  if (row.result) {
    try {
      const parsed = JSON.parse(row.result) as unknown;
      const entries = (Array.isArray(parsed) ? parsed : [parsed]) as {
        file?: string | string[];
        seed_value?: string | number;
        model?: string;
        error?: string;
        stage?: string;
        metas?: { duration?: number };
      }[];

      const paths: string[] = [];
      for (const entry of entries) {
        const files = Array.isArray(entry.file) ? entry.file : entry.file ? [entry.file] : [];
        for (const file of files) {
          if (!file) continue;
          paths.push(extractAudioPath(file));
        }
        // The seed comes back as "4242,4242" on a batch and as "" on a job that
        // never got far enough to have one. An empty string parses to zero,
        // which would report a seed the host never chose.
        const rawSeed = String(entry.seed_value ?? '').split(',')[0].trim();
        if (rawSeed && Number.isFinite(Number(rawSeed))) result.resolvedSeed = Number(rawSeed);
        if (entry.model) result.resolvedModel = entry.model;
        if (typeof entry.metas?.duration === 'number') {
          result.resolvedDurationSeconds = entry.metas.duration;
        }
        if (entry.error) result.error = entry.error;
        else if (!result.error && entry.stage === 'failed') result.error = 'the host reported the job failed';
      }
      if (paths.length) result.audioPaths = paths;
    } catch {
      // A result that will not parse is reported as a failure with the reason,
      // rather than as a success with nothing in it.
      result.state = 'FAILED';
      result.error = 'The host returned a result this service could not read.';
    }
  }
  if (result.state === 'FAILED' && !result.error) {
    result.error = 'the host reported the job failed and gave no reason';
  }
  return result;
}

/** Polls one job and translates ACE's answer into the states the app expects. */
async function poll(res: ServerResponse, cfg: E05RouteConfig, jobId: string) {
  const aceRes = await fetch(`${cfg.endpoint}/query_result`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(cfg) },
    body: JSON.stringify({ task_id_list: [jobId] }),
  });
  if (!aceRes.ok) {
    return json(res, 502, { error: `Lost contact with the realization host (${aceRes.status}).` });
  }
  const body = (await aceRes.json().catch(() => null)) as
    | { data?: { task_id: string; status: number; result?: string }[] }
    | null;
  // Only the row for the job that was asked about. Falling back to the first
  // row would report another job's state, and its audio, as this one's -- the
  // host answers a list, and a list can come back holding something else.
  const row = body?.data?.find((d) => d.task_id === jobId);
  if (!row) {
    return json(res, 404, { error: 'The realization host does not know that job.' });
  }

  const result = parseAceRow(row, jobId);
  // Only a path this service saw the host produce may be fetched later.
  for (const p of result.audioPaths || []) rememberPath(p);
  return json(res, 200, result);
}

/** Streams one produced file back, and only one this route was told about. */
async function audio(res: ServerResponse, cfg: E05RouteConfig, path: string) {
  if (!issuedPaths.has(path)) {
    // The endpoint behind this reads files on the model host. A path this
    // process never saw ACE produce does not get asked for.
    return json(res, 403, { error: 'That audio path was not produced by a job on this service.' });
  }
  const aceRes = await fetch(`${cfg.endpoint}/v1/audio?path=${encodeURIComponent(path)}`, {
    headers: { ...authHeaders(cfg) },
  });
  if (!aceRes.ok || !aceRes.body) {
    return json(res, 502, { error: `Could not retrieve the realized audio (${aceRes.status}).` });
  }
  const buf = Buffer.from(await aceRes.arrayBuffer());
  res.writeHead(200, {
    'Content-Type': aceRes.headers.get('content-type') || 'audio/mpeg',
    'Content-Length': buf.byteLength,
    'Cache-Control': 'no-store',
  });
  res.end(buf);
}

/**
 * The whole route. Returns true when it handled the request, so a caller can
 * fall through to whatever else it serves.
 */
export async function handleE05(
  req: IncomingMessage,
  res: ServerResponse,
  cfg: E05RouteConfig = configFromEnv()
): Promise<boolean> {
  const url = new URL(req.url || '/', 'http://local');
  if (url.pathname !== '/api/e05') return false;

  const action = url.searchParams.get('action');
  try {
    if (action === 'status') {
      json(res, 200, await e05Status(cfg));
      return true;
    }

    // Every other action needs the host. Checked once here so a submit
    // against a dead host fails as unavailable rather than as a broken fetch.
    if (!cfg.endpoint) {
      json(res, 200, await e05Status(cfg));
      return true;
    }

    if (action === 'submit' && req.method === 'POST') {
      await submit(req, res, cfg);
      return true;
    }
    if (action === 'poll') {
      const jobId = url.searchParams.get('jobId');
      if (!jobId) json(res, 400, { error: 'No job id.' });
      else await poll(res, cfg, jobId);
      return true;
    }
    if (action === 'audio') {
      const path = url.searchParams.get('path');
      if (!path) json(res, 400, { error: 'No path.' });
      else await audio(res, cfg, path);
      return true;
    }
    json(res, 400, { error: `Unknown action "${action}".` });
    return true;
  } catch (err) {
    // Never the host's address, never the key: this reaches a creator.
    json(res, 502, {
      error: err instanceof Error ? err.message : 'The realization service failed.',
    });
    return true;
  }
}
