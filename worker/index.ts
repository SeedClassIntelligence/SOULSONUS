/**
 * The Cloudflare Worker entry point for SoulSonus.
 *
 * This is a Workers project (Workers Builds, `npx wrangler deploy`), not a
 * Pages project -- those are different Cloudflare products with different
 * config shapes. A `pages_build_output_dir` in wrangler.toml or a Pages
 * Function under functions/ means nothing to `wrangler deploy`; it needs a
 * `main` entry point that exports a fetch handler, which is what this file
 * is. The static site is served through the ASSETS binding declared in
 * wrangler.toml's [assets] block, which points at dist/ -- the one thing
 * this Worker does beyond that is answer /api/e05, ported straight from
 * netlify/functions/e05.ts (same contract, same reasons for existing: ACE's
 * CORS policy admits only localhost, and the API key must stay server-side).
 */

import {
  E05Request,
  E05Result,
  E05ServiceStatus,
  e05StateFromAceStatus,
  toAceTaskBody,
  validateE05Request,
} from '../src/lib/inference/e05Contract';

interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  ASSETS: Fetcher;
  ACE_STEP_ENDPOINT?: string;
  ACE_STEP_API_KEY?: string;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

/** Endpoint and key are read per-request so a redeploy is not needed to rotate them. */
function aceConfig(env: Env): { endpoint: string; apiKey?: string } | null {
  const endpoint = env.ACE_STEP_ENDPOINT;
  if (!endpoint) return null;
  return { endpoint: endpoint.replace(/\/+$/, ''), apiKey: env.ACE_STEP_API_KEY };
}

function aceHeaders(apiKey?: string): Record<string, string> {
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}

/**
 * Reports whether realization can be attempted at all.
 *
 * Neither the endpoint nor the key appears in the response.
 */
async function status(env: Env): Promise<E05ServiceStatus> {
  const cfg = aceConfig(env);
  if (!cfg) {
    return {
      available: false,
      reason: 'NOT_CONFIGURED',
      detail: 'No realization host is configured for this deployment.',
    };
  }
  try {
    const res = await fetch(`${cfg.endpoint}/v1/models`, { headers: aceHeaders(cfg.apiKey) });
    if (res.status === 401 || res.status === 403) {
      return { available: false, reason: 'UNAUTHORIZED', detail: 'The realization host rejected our credentials.' };
    }
    if (!res.ok) {
      return { available: false, reason: 'UNREACHABLE', detail: `The realization host answered ${res.status}.` };
    }
    // Verified against a live server: wrapped under "data", and each model
    // is an object, not a bare string.
    const body = (await res.json()) as { data?: { models?: Array<{ name?: string }> } };
    const models = Array.isArray(body.data?.models)
      ? body.data.models.map((m) => String(m?.name)).filter(Boolean)
      : undefined;
    return { available: true, models };
  } catch {
    return { available: false, reason: 'UNREACHABLE', detail: 'The realization host did not answer.' };
  }
}

/**
 * Submits a job. Source audio arrives as multipart because SoulSonus holds
 * Blobs in a browser, not files on the inference host.
 */
async function submit(req: Request, env: Env): Promise<Response> {
  const cfg = aceConfig(env);
  if (!cfg) return json({ error: 'NOT_CONFIGURED' }, 503);

  const contentType = req.headers.get('content-type') || '';
  let e05: E05Request;
  let srcAudio: File | null = null;

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    const raw = form.get('request');
    if (typeof raw !== 'string') return json({ error: 'Missing "request" field.' }, 400);
    e05 = JSON.parse(raw) as E05Request;
    const file = form.get('src_audio');
    srcAudio = file instanceof File ? file : null;
  } else {
    e05 = (await req.json()) as E05Request;
  }

  const invalid = validateE05Request(e05, !!srcAudio);
  if (invalid) return json({ error: invalid }, 400);

  let res: Response;
  if (srcAudio) {
    const out = new FormData();
    for (const [k, v] of Object.entries(toAceTaskBody(e05))) out.append(k, String(v));
    out.append('src_audio', srcAudio, srcAudio.name || 'source.wav');
    res = await fetch(`${cfg.endpoint}/release_task`, {
      method: 'POST',
      headers: aceHeaders(cfg.apiKey),
      body: out,
    });
  } else {
    res = await fetch(`${cfg.endpoint}/release_task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...aceHeaders(cfg.apiKey) },
      body: JSON.stringify(toAceTaskBody(e05)),
    });
  }

  if (!res.ok) {
    return json({ error: `The realization host refused the job (${res.status}).` }, 502);
  }
  // Verified against a live server: the real payload is nested under "data".
  const body = (await res.json()) as { data?: { task_id?: string; queue_position?: number }; error?: string };
  const taskId = body.data?.task_id;
  if (!taskId) return json({ error: body.error || 'The realization host returned no task id.' }, 502);
  return json({ jobId: taskId, state: 'QUEUED', queuePosition: body.data?.queue_position });
}

/** One status check. The caller polls; this does not block on a GPU. */
async function poll(jobId: string, env: Env): Promise<Response> {
  const cfg = aceConfig(env);
  if (!cfg) return json({ error: 'NOT_CONFIGURED' }, 503);

  const res = await fetch(`${cfg.endpoint}/query_result`, {
    method: 'POST',
    // Verified against a live server: the field is task_id_list, not task_ids.
    headers: { 'Content-Type': 'application/json', ...aceHeaders(cfg.apiKey) },
    body: JSON.stringify({ task_id_list: [jobId] }),
  });
  if (!res.ok) return json({ error: `The realization host answered ${res.status}.` }, 502);

  // Verified against a live server: "data" is an array, and each entry's own
  // "result" field is itself a JSON-encoded string -- not an object -- with
  // one item per sample in the batch.
  const body = (await res.json()) as {
    data?: Array<{ task_id: string; result?: string; status: number }>;
    error?: string;
  };
  const entry = body.data?.[0];

  let items: Array<Record<string, any>> = [];
  if (entry?.result) {
    try {
      const parsed = JSON.parse(entry.result);
      items = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      items = [];
    }
  }
  const audioPaths = items.map((it) => it?.file).filter((f): f is string => typeof f === 'string' && f.length > 0);
  const firstError = items.find((it) => it?.error)?.error;

  const result: E05Result = {
    jobId,
    state: e05StateFromAceStatus(entry?.status),
    audioPaths: audioPaths.length ? audioPaths : undefined,
    resolvedDurationSeconds: typeof items[0]?.metas?.duration === 'number' ? items[0].metas.duration : undefined,
    error: firstError ? String(firstError) : body.error ? String(body.error) : undefined,
  };
  return json(result);
}

/**
 * Streams a finished file back through us.
 *
 * ACE returns server-side paths, not URLs a browser can reach.
 */
async function fetchAudio(path: string, env: Env): Promise<Response> {
  const cfg = aceConfig(env);
  if (!cfg) return json({ error: 'NOT_CONFIGURED' }, 503);

  const res = await fetch(`${cfg.endpoint}/v1/audio?path=${encodeURIComponent(path)}`, {
    headers: aceHeaders(cfg.apiKey),
  });
  if (!res.ok) return json({ error: `The realization host answered ${res.status}.` }, 502);
  return new Response(res.body, {
    status: 200,
    headers: {
      'Content-Type': res.headers.get('content-type') || 'audio/wav',
      'Cache-Control': 'no-store',
    },
  });
}

async function handleE05(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'status';

  try {
    switch (action) {
      case 'status':
        return json(await status(env));
      case 'submit':
        if (req.method !== 'POST') return json({ error: 'submit is POST.' }, 405);
        return await submit(req, env);
      case 'poll': {
        const jobId = url.searchParams.get('jobId');
        if (!jobId) return json({ error: 'poll needs a jobId.' }, 400);
        return await poll(jobId, env);
      }
      case 'audio': {
        const path = url.searchParams.get('path');
        if (!path) return json({ error: 'audio needs a path.' }, 400);
        return await fetchAudio(path, env);
      }
      default:
        return json({ error: `Unknown action "${action}".` }, 400);
    }
  } catch (err) {
    // The message may name the host, so it stays in the server log.
    console.error('[e05]', err);
    return json({ error: 'The realization service failed to handle the request.' }, 500);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/e05') {
      return handleE05(request, env);
    }
    // Everything else is the static SPA build, served from the [assets]
    // binding -- dist/, which already carries _headers and _redirects.
    return env.ASSETS.fetch(request);
  },
};
