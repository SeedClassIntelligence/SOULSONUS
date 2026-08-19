/**
 * The E05 realization contract.
 *
 * This file is the shared vocabulary between the browser and the SoulSonus
 * service route. It holds no I/O and no secrets, so both halves can import it
 * without either learning anything about the other's environment.
 *
 * Two facts from the ACE-Step fork shape everything here, and both were read
 * from the pinned source rather than recalled:
 *
 *  1. `acestep/api/route_setup.py` allows only localhost and 127.0.0.1
 *     origins. A browser on any other host is refused before the model is
 *     ever consulted. The Demucs client failed exactly this way. So the
 *     browser never addresses ACE — it addresses SoulSonus, which addresses
 *     ACE from the server side where CORS does not apply and the API key
 *     never reaches a client bundle.
 *
 *  2. `query_result` reports status as an integer, not a string:
 *     0 running · 1 succeeded · 2 failed. The previous client compared
 *     against 'SUCCESS' and 'FAILED', which no ACE server ever sends, so a
 *     finished job would have polled until it timed out.
 */

/**
 * The six task types the pinned checkpoint exposes.
 *
 * `acestep-v15-xl-base` is the only XL variant that reaches extract, lego and
 * complete; the SFT and Turbo variants stop at the first three. The registry
 * already names xl-base, so all six are reachable.
 */
export type E05Task =
  | 'text2music'
  | 'cover'
  | 'repaint'
  | 'extract'
  | 'lego'
  | 'complete';

export const E05_TASKS: readonly E05Task[] = [
  'text2music',
  'cover',
  'repaint',
  'extract',
  'lego',
  'complete',
] as const;

/**
 * Tasks that lock their output duration to the source audio.
 *
 * This is the property that makes ACE usable from a timeline at all: what
 * comes back is the same length as the context that went in, so a returned
 * part lands where the clip that produced it already sits. text2music is the
 * exception — it invents a length, so its result cannot be aligned by
 * construction and has to be placed deliberately.
 */
export const DURATION_LOCKED_TASKS: readonly E05Task[] = ['cover', 'repaint', 'extract', 'lego'] as const;

export const isDurationLocked = (task: E05Task) => DURATION_LOCKED_TASKS.includes(task);

/** Tasks that require source audio. Four of the six need only src_audio plus an instruction. */
export const SOURCE_AUDIO_TASKS: readonly E05Task[] = ['cover', 'repaint', 'extract', 'lego', 'complete'] as const;

export const requiresSourceAudio = (task: E05Task) => SOURCE_AUDIO_TASKS.includes(task);

export interface E05Request {
  task: E05Task;
  /**
   * What to do, in the model's own instruction vocabulary — "extract the
   * drums", "make this a cello". Not a marketing prompt.
   */
  instruction: string;
  /** Style/caption text. Only text2music and cover make real use of it. */
  prompt?: string;
  lyrics?: string;
  /** Fixed seed for reproducibility. Omit to let the server choose and report back what it used. */
  seed?: number;
  /**
   * Only meaningful for text2music, which is the one task that does not take
   * its length from the source. Ignored elsewhere, and the service says so
   * rather than silently accepting it.
   */
  durationSeconds?: number;
  /** Repaint needs the region; both in seconds from the start of the source. */
  repaintStartSeconds?: number;
  repaintEndSeconds?: number;
}

export type E05JobState = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';

/** ACE reports status as an integer. This is the whole mapping. */
export function e05StateFromAceStatus(status: unknown): E05JobState {
  switch (Number(status)) {
    case 0:
      return 'RUNNING';
    case 1:
      return 'SUCCEEDED';
    case 2:
      return 'FAILED';
    default:
      return 'QUEUED';
  }
}

export interface E05Job {
  jobId: string;
  state: E05JobState;
  /** Position in the server's queue at submission, when it reported one. */
  queuePosition?: number;
}

export interface E05Result extends E05Job {
  /**
   * Paths as ACE reported them. They are server-side paths, not URLs the
   * browser can fetch — the service route is what turns them into bytes.
   */
  audioPaths?: string[];
  /** What the server actually used, which is not always what was asked for. */
  resolvedSeed?: number;
  resolvedModel?: string;
  resolvedDurationSeconds?: number;
  error?: string;
}

/** Why a realization could not be attempted. Distinct from "it was attempted and failed". */
export type E05Unavailable =
  | 'NO_SERVICE_ROUTE'
  | 'NOT_CONFIGURED'
  | 'UNREACHABLE'
  | 'UNAUTHORIZED';

export interface E05ServiceStatus {
  available: boolean;
  /** Present only when `available` is false. */
  reason?: E05Unavailable;
  /** Human-readable, safe to show a creator. Never contains an endpoint or a key. */
  detail?: string;
  /** Checkpoints the host reported loading, when it is reachable. */
  models?: string[];
}

/**
 * Translates a SoulSonus request into ACE's `release_task` body.
 *
 * Kept here rather than in the service route so the shape is testable without
 * a network, and so a change to ACE's wire format is one edit in one file.
 */
export function toAceTaskBody(req: E05Request, srcAudioPath?: string): Record<string, unknown> {
  const body: Record<string, unknown> = {
    task: req.task,
    instruction: req.instruction,
  };
  if (req.prompt) body.prompt = req.prompt;
  if (req.lyrics) body.lyrics = req.lyrics;
  if (typeof req.seed === 'number') body.seed = req.seed;
  if (srcAudioPath) body.src_audio = srcAudioPath;
  // Only the one task whose length is not taken from the source.
  if (req.task === 'text2music' && typeof req.durationSeconds === 'number') {
    body.duration = req.durationSeconds;
  }
  if (req.task === 'repaint') {
    if (typeof req.repaintStartSeconds === 'number') body.repaint_start = req.repaintStartSeconds;
    if (typeof req.repaintEndSeconds === 'number') body.repaint_end = req.repaintEndSeconds;
  }
  return body;
}

/** Validates a request before it costs a network round trip. Returns a reason, or null when fine. */
export function validateE05Request(req: E05Request, hasSourceAudio: boolean): string | null {
  if (!E05_TASKS.includes(req.task)) return `Unknown task "${req.task}".`;
  if (!req.instruction?.trim()) return 'An instruction is required.';
  if (requiresSourceAudio(req.task) && !hasSourceAudio) {
    return `Task "${req.task}" needs source audio and none was supplied.`;
  }
  if (req.task === 'repaint') {
    const { repaintStartSeconds: a, repaintEndSeconds: b } = req;
    if (typeof a !== 'number' || typeof b !== 'number') return 'Repaint needs a start and an end, in seconds.';
    if (b <= a) return 'The repaint region ends before it starts.';
  }
  return null;
}
