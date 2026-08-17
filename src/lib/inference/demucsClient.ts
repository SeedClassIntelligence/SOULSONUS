/**
 * Real client for the self-hosted Demucs stem-separation service
 * (inference-server/demucs-service -- our own thin FastAPI wrapper
 * around Meta's official demucs.api.Separator, MIT licensed).
 *
 * This replaces DemucsStemSeparator.separate_mix_stems() from
 * src/server/e05_realization_service.py, which never read the
 * mix_audio_path argument at all and returned four canned sine-wave
 * "stems" regardless of input. This client sends the real audio file
 * and returns the real, input-dependent separated stems.
 */

export interface DemucsStem {
  role: string;
  url: string;
  sizeBytes: number;
}

export interface DemucsSeparationResult {
  jobId: string;
  engine: string;
  model: string;
  device: string;
  sampleRate: number;
  stems: Record<string, DemucsStem>;
}

export class DemucsClient {
  private endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  async health(): Promise<{ ok: boolean; device?: string; model?: string }> {
    try {
      const res = await fetch(`${this.endpoint}/health`);
      if (!res.ok) return { ok: false };
      const data = await res.json();
      return { ok: true, device: data.device, model: data.model };
    } catch {
      return { ok: false };
    }
  }

  /**
   * Uploads a real audio file (Blob/File from the browser -- e.g. an
   * imported mix or a recorded take) and returns real separated stems.
   * Throws on failure rather than substituting placeholder audio, so a
   * failed separation is visibly a failure, not silently fabricated data.
   */
  async separate(audioFile: Blob, filename: string): Promise<DemucsSeparationResult> {
    const formData = new FormData();
    formData.append('file', audioFile, filename);

    const res = await fetch(`${this.endpoint}/separate`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Demucs separation failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    return {
      jobId: data.jobId,
      engine: data.engine,
      model: data.model,
      device: data.device,
      sampleRate: data.sampleRate,
      stems: data.stems,
    };
  }

  /** Resolves a stem's relative URL against this client's configured endpoint. */
  resolveStemUrl(stem: DemucsStem): string {
    return `${this.endpoint}${stem.url}`;
  }
}
