/**
 * The SoulSonus service route for E05 realization.
 *
 * The browser talks to this. This talks to ACE. Nothing else is allowed to
 * cross, for two concrete reasons rather than a principle:
 *
 *  - ACE's own CORS policy (acestep/api/route_setup.py) admits only localhost
 *    and 127.0.0.1 origins, so a browser on the deployed site is refused
 *    before the model is consulted. That is precisely how the Demucs client
 *    failed, and it failed quietly.
 *  - The API key lives in ACE_STEP_API_KEY on the server. Anything the client
 *    bundle can read, anyone can read.
 *
 * This route translates and governs. It does not orchestrate inference — ACE
 * already has a job queue and running a second one on top would be two
 * schedulers disagreeing about the same GPU.
 */

import {
  E05Request,
  E05Result,
  E05ServiceStatus,
  e05StateFromAceStatus,
  toAceTaskBody,
  validateE05Request,
} from '../../src/lib/inference/e05Contract';

interface NetlifyRequestLike {
  method?: string;
  url?: string;
  json: () => Promise<unknown>;
  formData?: () => Promise<FormData>;
  headers: { get(name: string): string | null };
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

/** Endpoint and key are read per-request so a redeploy is not needed to rotate them. */
function aceConfig(): { endpoint: string; apiKey?: string } | null {
  const endpoint = process.env.ACE_STEP_ENDPOINT;
  if (!endpoint) return null;
  return { endpoint: endpoint.replace(/\/+$/, ''), apiKey: process.env.ACE_STEP_API_KEY };
}

function aceHeaders(apiKey?: string): Record<string, string> {
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}

/**
 * Reports whether realization can be attempted at all.
 *
 * The distinction this preserves is the one that matters to a creator: a
 * realization that was never attempted is not a realization that failed, and
 * the UI must be able to tell them apart. Neither the endpoint nor the key
 * appears in the response.
 */
async function status(): Promise<E05ServiceStatus> {
  const cfg = aceConfig();
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
    const body = (await res.json()) as { models?: unknown };
    const models = Array.isArray(body.models) ? body.models.map(String) : undefined;
    return { available: true, models };
  } catch {
    return { available: false, reason: 'UNREACHABLE', detail: 'The realization host did not answer.' };
  }
}

/**
 * Submits a job. Source audio arrives as multipart because SoulSonus holds
 * Blobs in a browser, not files on the inference host — posting the bytes
 * means never reasoning about a shared filesystem that does not exist.
 */
async function submit(req: NetlifyRequestLike): Promise<Response> {
  const cfg = aceConfig();
  if (!cfg) return json({ error: 'NOT_CONFIGURED' }, 503);

  const contentType = req.headers.get('content-type') || '';
  let e05: E05Request;
  let srcAudio: File | null = null;

  if (contentType.includes('multipart/form-data')) {
    if (!req.formData) return json({ error: 'Multipart is not supported by this runtime.' }, 400);
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
  const body = (await res.json()) as { task_id?: string; queue_position?: number };
  if (!body.task_id) return json({ error: 'The realization host returned no task id.' }, 502);
  return json({ jobId: body.task_id, state: 'QUEUED', queuePosition: body.queue_position });
}

/** One status check. The caller polls; this does not block a function invocation on a GPU. */
async function poll(jobId: string): Promise<Response> {
  const cfg = aceConfig();
  if (!cfg) return json({ error: 'NOT_CONFIGURED' }, 503);

  const res = await fetch(`${cfg.endpoint}/query_result`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...aceHeaders(cfg.apiKey) },
    body: JSON.stringify({ task_ids: [jobId] }),
  });
  if (!res.ok) return json({ error: `The realization host answered ${res.status}.` }, 502);

  const body = (await res.json()) as Record<string, any>;
  // The endpoint is a batch poll, so a single job comes back inside a list.
  const entry = Array.isArray(body.results) ? body.results[0] : Array.isArray(body) ? body[0] : body;

  const result: E05Result = {
    jobId,
    state: e05StateFromAceStatus(entry?.status),
    audioPaths: Array.isArray(entry?.audio_paths)
      ? entry.audio_paths.map(String)
      : Array.isArray(entry?.download_urls)
        ? entry.download_urls.map(String)
        : undefined,
    resolvedSeed: typeof entry?.seed === 'number' ? entry.seed : undefined,
    resolvedModel: entry?.model ? String(entry.model) : undefined,
    resolvedDurationSeconds: typeof entry?.duration === 'number' ? entry.duration : undefined,
    error: entry?.error ? String(entry.error) : undefined,
  };
  return json(result);
}

/**
 * Streams a finished file back through us.
 *
 * ACE returns server-side paths, not URLs a browser can reach. Handing the
 * path to the client and hoping would put the inference host on the public
 * internet, which is the thing this route exists to avoid.
 */
async function fetchAudio(path: string): Promise<Response> {
  const cfg = aceConfig();
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

export default async function handler(req: NetlifyRequestLike): Promise<Response> {
  const url = new URL(req.url || 'http://localhost/');
  const action = url.searchParams.get('action') || 'status';

  try {
    switch (action) {
      case 'status':
        return json(await status());
      case 'submit':
        if (req.method !== 'POST') return json({ error: 'submit is POST.' }, 405);
        return await submit(req);
      case 'poll': {
        const jobId = url.searchParams.get('jobId');
        if (!jobId) return json({ error: 'poll needs a jobId.' }, 400);
        return await poll(jobId);
      }
      case 'audio': {
        const path = url.searchParams.get('path');
        if (!path) return json({ error: 'audio needs a path.' }, 400);
        return await fetchAudio(path);
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

export const config = { path: '/api/e05' };
