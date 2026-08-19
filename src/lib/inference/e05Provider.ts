/**
 * The E05 realization seam.
 *
 * One interface, so the question "where does realization run" has exactly one
 * answer per deployment and the rest of the app never asks. V1 ships one
 * implementation that routes through the SoulSonus service layer to a hosted
 * ACE-Step host. The seam exists because that is a deployment decision, not an
 * architectural one: a `LocalAceStepProvider` for a creator running the host
 * on their own machine, and eventually a `SoulSonusNativeProvider`, plug in
 * here without a caller changing.
 *
 * What this file will not do is fabricate a result. If realization is not
 * configured or the host is unreachable, that is what comes back — an
 * unavailable service, not a plausible-looking candidate. The whole reason
 * this seam is being built is that the previous candidate path returned
 * `{ rhythm: 0.978, timing: 0.970, ... }` for every request regardless of
 * input, and a creator had no way to tell that from a measurement.
 */

import {
  E05Request,
  E05Result,
  E05ServiceStatus,
  E05Task,
  isDurationLocked,
  validateE05Request,
} from './e05Contract';

export interface E05RealizeOptions {
  /** Source audio bytes. Required by every task except text2music. */
  sourceAudio?: Blob;
  sourceFileName?: string;
  pollIntervalMs?: number;
  timeoutMs?: number;
  /** Called on each poll so a long job can show progress rather than appearing hung. */
  onProgress?: (result: E05Result) => void;
  signal?: AbortSignal;
}

/** What a completed realization hands back: the audio itself, and what actually produced it. */
export interface E05Realization {
  task: E05Task;
  audio: Blob;
  /** True when the task locks output length to the source, so the result aligns by construction. */
  durationLocked: boolean;
  resolvedSeed?: number;
  resolvedModel?: string;
  jobId: string;
}

export interface E05RealizationProvider {
  readonly name: string;
  /** Whether realization can be attempted, and if not, why. Never throws. */
  status(): Promise<E05ServiceStatus>;
  realize(req: E05Request, opts?: E05RealizeOptions): Promise<E05Realization>;
}

/** Thrown when realization could not be attempted, as distinct from attempted and failed. */
export class E05UnavailableError extends Error {
  constructor(
    message: string,
    public readonly status: E05ServiceStatus
  ) {
    super(message);
    this.name = 'E05UnavailableError';
  }
}

const SERVICE_ROUTE = '/api/e05';

/**
 * Routes every call through the SoulSonus service layer.
 *
 * The browser never holds the realization host's address or key, and never
 * makes a cross-origin request to it — ACE's CORS policy would refuse one
 * anyway, silently, before the model was ever consulted.
 */
export class SoulSonusServiceProvider implements E05RealizationProvider {
  readonly name = 'SoulSonus service layer';

  constructor(private readonly route: string = SERVICE_ROUTE) {}

  async status(): Promise<E05ServiceStatus> {
    try {
      const res = await fetch(`${this.route}?action=status`);
      if (res.status === 404) {
        return {
          available: false,
          reason: 'NO_SERVICE_ROUTE',
          detail: 'This build has no realization service route.',
        };
      }
      if (!res.ok) {
        return { available: false, reason: 'UNREACHABLE', detail: `The service answered ${res.status}.` };
      }
      const body = (await res.json()) as E05ServiceStatus;
      // A route that answers with something other than a status is a route
      // that is not ours -- an SPA redirect returning index.html, most likely.
      if (typeof body?.available !== 'boolean') {
        return {
          available: false,
          reason: 'NO_SERVICE_ROUTE',
          detail: 'The realization route did not answer with a service status.',
        };
      }
      return body;
    } catch {
      return { available: false, reason: 'UNREACHABLE', detail: 'The realization service did not answer.' };
    }
  }

  async realize(req: E05Request, opts: E05RealizeOptions = {}): Promise<E05Realization> {
    const invalid = validateE05Request(req, !!opts.sourceAudio);
    if (invalid) throw new Error(invalid);

    const svc = await this.status();
    if (!svc.available) {
      throw new E05UnavailableError(svc.detail || 'Realization is not available.', svc);
    }

    const jobId = await this.submit(req, opts);
    const result = await this.awaitJob(jobId, opts);

    const path = result.audioPaths?.[0];
    if (!path) throw new Error('The realization host reported success but returned no audio.');

    const audioRes = await fetch(`${this.route}?action=audio&path=${encodeURIComponent(path)}`, {
      signal: opts.signal,
    });
    if (!audioRes.ok) throw new Error(`Could not retrieve the realized audio (${audioRes.status}).`);
    const audio = await audioRes.blob();
    if (audio.size === 0) throw new Error('The realized audio came back empty.');

    return {
      task: req.task,
      audio,
      durationLocked: isDurationLocked(req.task),
      resolvedSeed: result.resolvedSeed,
      resolvedModel: result.resolvedModel,
      jobId,
    };
  }

  private async submit(req: E05Request, opts: E05RealizeOptions): Promise<string> {
    let res: Response;
    if (opts.sourceAudio) {
      const form = new FormData();
      form.append('request', JSON.stringify(req));
      form.append('src_audio', opts.sourceAudio, opts.sourceFileName || 'source.wav');
      res = await fetch(`${this.route}?action=submit`, { method: 'POST', body: form, signal: opts.signal });
    } else {
      res = await fetch(`${this.route}?action=submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
        signal: opts.signal,
      });
    }
    const body = (await res.json().catch(() => ({}))) as { jobId?: string; error?: string };
    if (!res.ok || !body.jobId) {
      throw new Error(body.error || `The realization service refused the job (${res.status}).`);
    }
    return body.jobId;
  }

  private async awaitJob(jobId: string, opts: E05RealizeOptions): Promise<E05Result> {
    const interval = opts.pollIntervalMs ?? 2000;
    // Generous, because the tasks worth running are not fast. A surgical task
    // on a busy host is minutes, not seconds.
    const timeout = opts.timeoutMs ?? 10 * 60 * 1000;
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeout) {
      if (opts.signal?.aborted) throw new Error('Realization was cancelled.');
      const res = await fetch(`${this.route}?action=poll&jobId=${encodeURIComponent(jobId)}`, {
        signal: opts.signal,
      });
      if (!res.ok) throw new Error(`Lost contact with the realization service (${res.status}).`);
      const result = (await res.json()) as E05Result;
      opts.onProgress?.(result);

      if (result.state === 'SUCCEEDED') return result;
      if (result.state === 'FAILED') {
        throw new Error(`Realization failed: ${result.error || 'the host gave no reason'}.`);
      }
      await new Promise((r) => setTimeout(r, interval));
    }
    throw new Error(`Realization timed out after ${Math.round(timeout / 1000)}s (job ${jobId}).`);
  }
}

/**
 * The provider for a build with no realization behind it.
 *
 * It exists so that "not configured" is a first-class state with a name,
 * rather than an exception thrown from somewhere in a fetch. Every caller
 * handles it the same way it handles a host that is down.
 */
export class UnconfiguredProvider implements E05RealizationProvider {
  readonly name = 'none';

  async status(): Promise<E05ServiceStatus> {
    return {
      available: false,
      reason: 'NOT_CONFIGURED',
      detail: 'No realization backend is configured.',
    };
  }

  async realize(): Promise<E05Realization> {
    throw new E05UnavailableError('No realization backend is configured.', await this.status());
  }
}

let provider: E05RealizationProvider = new SoulSonusServiceProvider();

export const getE05Provider = (): E05RealizationProvider => provider;

/** Swaps the backend. The seam: local host, hosted service, or eventually our own. */
export const setE05Provider = (next: E05RealizationProvider) => {
  provider = next;
};
