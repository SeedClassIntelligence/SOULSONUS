/**
 * Recording a vocal take, and describing it honestly.
 *
 * Two things were wrong with how takes were made. The take pool's "record loop
 * take" button was a `setTimeout` that produced a take record with a literal
 * waveform and no audio behind it at all — it reported a recording that never
 * happened. The overdub recorder did capture real audio, but drew its waveform
 * with `Math.random()`, so the picture of the performance was invented even
 * though the performance was real.
 *
 * This records through MediaRecorder and derives the waveform from the decoded
 * audio, so the shape shown is the shape captured.
 */

export interface TakeAudio {
  blob: Blob;
  /** Object URL for playback. Revoke when the take is deleted. */
  url: string;
  durationSeconds: number;
  /** Peak per slice, 0..1, taken from the recording itself. */
  waveform: number[];
}

export interface TakeRecording {
  /** Stops the recorder and resolves with the captured audio. */
  stop: () => Promise<TakeAudio>;
  /** Abandons the recording and releases the microphone. */
  cancel: () => void;
}

const WAVEFORM_SLICES = 32;

/** Peak amplitude per slice of the decoded audio. */
export function waveformFromBuffer(buffer: AudioBuffer, slices = WAVEFORM_SLICES): number[] {
  const data = buffer.getChannelData(0);
  const per = Math.max(1, Math.floor(data.length / slices));
  const out: number[] = [];
  for (let i = 0; i < slices; i++) {
    let peak = 0;
    const start = i * per;
    const end = Math.min(data.length, start + per);
    for (let j = start; j < end; j++) {
      const v = data[j] < 0 ? -data[j] : data[j];
      if (v > peak) peak = v;
    }
    out.push(Math.round(peak * 100) / 100);
  }
  return out;
}

export async function decodeTakeBlob(blob: Blob): Promise<AudioBuffer | null> {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  const ctx = new Ctx();
  try {
    return await ctx.decodeAudioData(await blob.arrayBuffer());
  } catch {
    return null;
  } finally {
    if (ctx.state !== 'closed') void ctx.close();
  }
}

/** Opens the microphone and starts recording. Throws if permission is refused. */
export async function startTakeRecording(): Promise<TakeRecording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  const startedAt = Date.now();

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  recorder.start(100);

  const release = () => stream.getTracks().forEach((t) => t.stop());

  return {
    stop: () =>
      new Promise<TakeAudio>((resolve) => {
        recorder.onstop = async () => {
          release();
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          const decoded = await decodeTakeBlob(blob);
          resolve({
            blob,
            url: URL.createObjectURL(blob),
            // The decoded length is the truth; the wall clock is the fallback
            // for a browser that cannot decode its own recording.
            durationSeconds: decoded ? decoded.duration : (Date.now() - startedAt) / 1000,
            waveform: decoded ? waveformFromBuffer(decoded) : [],
          });
        };
        recorder.stop();
      }),
    cancel: () => {
      try {
        recorder.stop();
      } catch {
        /* already stopped */
      }
      release();
    },
  };
}
