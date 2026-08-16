/**
 * Real client for a self-hosted ACE-Step 1.5 REST API server
 * (github.com/ace-step/ACE-Step-1.5, MIT licensed).
 *
 * This replaces the fabricated scoring in realizationRouter.ts, which
 * previously returned a hardcoded literal object
 * (`{ rhythm: 0.978, timing: 0.970, ... }`) for every request regardless
 * of input. There is no local reimplementation of ACE-Step here -- this
 * file only speaks the real, documented HTTP contract of the official
 * server and waits for real results.
 *
 * Endpoint follows the same "user-configurable local endpoint" pattern
 * already used for the Ollama connection in ReasoningProvider.ts, so it
 * fits the existing Native Brain settings UI without inventing a new
 * configuration paradigm.
 *
 * Protocol (from ACE-Step's own docs/en/API.md):
 *   POST {endpoint}/release_task   -> { task_id }
 *   POST {endpoint}/query_result   -> { status, download_urls?, error? }
 * This is an async job queue, not a synchronous request/response --
 * generation can take anywhere from ~2s (A100) to tens of seconds (CPU),
 * so callers must poll.
 */

export interface AceStepGenerationParams {
  /** Natural-language style/genre description, e.g. "upbeat indie pop with jangly guitars". */
  prompt: string;
  /** Optional lyrics with [Verse]/[Chorus] tags. Omit for instrumental. */
  lyrics?: string;
  /** Target duration in seconds. */
  durationSeconds?: number;
  /** Reference/seed audio path on the server, for performance-transfer style requests. */
  referenceAudioPath?: string;
  /** Fixed seed for reproducibility; omit for random. */
  seed?: number;
}

export interface AceStepTaskResult {
  status: 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  downloadUrls?: string[];
  error?: string;
}

export class AceStepClient {
  private endpoint: string;
  private apiKey?: string;

  constructor(endpoint: string, apiKey?: string) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
  }

  private authHeaders(): Record<string, string> {
    return this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {};
  }

  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${this.endpoint}/health`, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }

  /** Submits a real generation job. Returns immediately with a task id -- does not wait for completion. */
  async submitTask(params: AceStepGenerationParams): Promise<string> {
    const res = await fetch(`${this.endpoint}/release_task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
      body: JSON.stringify({
        prompt: params.prompt,
        lyrics: params.lyrics ?? '',
        duration: params.durationSeconds ?? 30,
        reference_audio_path: params.referenceAudioPath,
        seed: params.seed ?? -1,
      }),
    });
    if (!res.ok) {
      throw new Error(`ACE-Step task submission failed: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    return data.task_id;
  }

  /** Single status check. Callers should poll this, not call it once and assume completion. */
  async queryResult(taskId: string): Promise<AceStepTaskResult> {
    const res = await fetch(`${this.endpoint}/query_result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
      body: JSON.stringify({ task_id: taskId }),
    });
    if (!res.ok) {
      throw new Error(`ACE-Step status query failed: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    return {
      status: data.status,
      downloadUrls: data.download_urls,
      error: data.error,
    };
  }

  /**
   * Submits a task and polls until it finishes or times out.
   * Returns the real generated audio URL(s) -- nothing here is synthesized
   * locally. If ACE-Step is unreachable or fails, this throws rather than
   * silently falling back to fabricated data, so the caller (and the UI)
   * knows generation genuinely didn't happen.
   */
  async generateAndWait(
    params: AceStepGenerationParams,
    opts: { pollIntervalMs?: number; timeoutMs?: number } = {},
  ): Promise<string[]> {
    const pollIntervalMs = opts.pollIntervalMs ?? 1500;
    const timeoutMs = opts.timeoutMs ?? 5 * 60 * 1000;

    const taskId = await this.submitTask(params);
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const result = await this.queryResult(taskId);
      if (result.status === 'SUCCESS') {
        if (!result.downloadUrls?.length) {
          throw new Error('ACE-Step reported SUCCESS but returned no audio URLs.');
        }
        return result.downloadUrls;
      }
      if (result.status === 'FAILED') {
        throw new Error(`ACE-Step generation failed: ${result.error ?? 'unknown error'}`);
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`ACE-Step generation timed out after ${timeoutMs}ms (task ${taskId}).`);
  }
}
