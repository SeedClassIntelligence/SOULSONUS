/**
 * What is actually answering, right now.
 *
 * Written because an engine inventory and an engine status are different
 * claims, and this project has already been burned by the difference. A list
 * of what is installed says nothing about what will work when a creator
 * presses the button -- and a green light over something that cannot respond
 * is worse than no light at all, because it moves the discovery of the failure
 * to the moment the creator needed it to work.
 *
 * So nothing here is asserted. Every engine that has something to answer is
 * asked, and the answer is reported with its reason. The two that have nothing
 * to ask -- code that runs in this process -- say exactly that, and say why
 * they need no probe rather than borrowing a green light they did not earn.
 */

import { DemucsClient } from './inference/demucsClient';
import { getE05Provider } from './inference/e05Provider';
import { getInferenceSettings } from './inference/inferenceSettings';

export type EngineHealth =
  /** Runs in this process. Nothing to reach, so nothing can be down. */
  | 'IN_PROCESS'
  /** Asked and answered. */
  | 'REACHABLE'
  /** Asked and did not answer, or answered wrongly. */
  | 'UNREACHABLE'
  /** Not asked yet. */
  | 'PROBING';

export interface EngineStatus {
  id: 'basicPitch' | 'spectral' | 'demucs' | 'aceRealizer';
  label: string;
  /** Where it runs. The distinction the inventory kept getting wrong. */
  location: 'in-browser' | 'service';
  health: EngineHealth;
  /** What was measured or why it could not be. Never a slogan. */
  detail: string;
  /** The address that was probed, when there was one. */
  endpoint?: string;
  /** What the creator can and cannot do while it reads this way. */
  consequence?: string;
}

const IN_PROCESS: EngineStatus[] = [
  {
    id: 'spectral',
    label: 'Spectral onset classifier',
    location: 'in-browser',
    health: 'IN_PROCESS',
    detail:
      'Hand-written DSP in this bundle -- band ratios and a spectral-centroid prior. No model file, no network, no dependency. It cannot be unavailable.',
  },
  {
    id: 'basicPitch',
    label: 'Basic Pitch (ONNX)',
    location: 'in-browser',
    health: 'PROBING',
    detail: '',
  },
];

/**
 * Basic Pitch runs in the browser, but it still has something that can fail:
 * the model file has to be fetchable. A HEAD request is the whole probe -- it
 * does not load 88 output bins into memory to tell a creator a badge colour.
 */
async function probeBasicPitch(modelUrl = '/models/basic_pitch.onnx'): Promise<EngineStatus> {
  const base: EngineStatus = {
    id: 'basicPitch',
    label: 'Basic Pitch (ONNX)',
    location: 'in-browser',
    health: 'UNREACHABLE',
    detail: '',
    endpoint: modelUrl,
    consequence: 'Pitched material cannot be transcribed to notes.',
  };
  try {
    const res = await fetch(modelUrl, { method: 'HEAD' });
    if (!res.ok) {
      return { ...base, detail: `The model path answered ${res.status}.` };
    }
    // A single-page app answers an unknown path with index.html and a 200, so
    // res.ok on its own would report a missing model as present. That is the
    // exact failure this badge exists to catch, so it is checked rather than
    // assumed.
    const type = res.headers.get('content-type') || '';
    if (type.includes('text/html')) {
      return {
        ...base,
        detail: 'That path answered with a page, not a model -- the file is not being served from here.',
      };
    }
    const bytes = Number(res.headers.get('content-length') || 0);
    if (bytes > 0 && bytes < 50_000) {
      return {
        ...base,
        detail: `The file at that path is only ${bytes} bytes -- too small to be the model.`,
      };
    }
    const mb = bytes ? ` -- ${(bytes / 1024 / 1024).toFixed(1)} MB` : '';
    return {
      ...base,
      health: 'IN_PROCESS',
      detail: `The model file is being served${mb}, and runs in this tab through WebAssembly. Checked by asking for it, not by loading it. Reached from file import, not from the live microphone -- one inference window is 1.99 s.`,
      consequence: undefined,
    };
  } catch {
    return { ...base, detail: 'The model file could not be fetched.' };
  }
}

async function probeDemucs(): Promise<EngineStatus> {
  const endpoint = getInferenceSettings().demucsEndpoint;
  const base: EngineStatus = {
    id: 'demucs',
    label: 'Demucs v4 (stem separation)',
    location: 'service',
    health: 'UNREACHABLE',
    detail: '',
    endpoint,
    consequence: 'Full-mix imports cannot be separated into stems.',
  };
  try {
    const h = await new DemucsClient(endpoint).health();
    if (!h.ok) return { ...base, detail: 'No answer from the separation service.' };
    const bits = [h.model, h.device].filter(Boolean).join(' on ');
    return {
      ...base,
      health: 'REACHABLE',
      detail: bits ? `Answered: ${bits}.` : 'Answered.',
      consequence: undefined,
    };
  } catch {
    return { ...base, detail: 'The separation service did not answer.' };
  }
}

async function probeAce(): Promise<EngineStatus> {
  const base: EngineStatus = {
    id: 'aceRealizer',
    label: 'ACE realizer (E05)',
    location: 'service',
    health: 'UNREACHABLE',
    detail: '',
    endpoint: '/api/e05',
    consequence: 'Realization falls back to the local sample, instrument and synth routes.',
  };
  try {
    const s = await getE05Provider().status();
    if (!s.available) {
      return { ...base, detail: s.detail || s.reason || 'Unavailable.' };
    }
    return {
      ...base,
      health: 'REACHABLE',
      detail: s.detail || 'Answered and reported itself available.',
      consequence: undefined,
    };
  } catch {
    return { ...base, detail: 'The realization route did not answer.' };
  }
}

/** Probes everything that can be probed. Never throws; a failure is a status. */
export async function probeEngines(): Promise<EngineStatus[]> {
  const [bp, dm, ace] = await Promise.all([probeBasicPitch(), probeDemucs(), probeAce()]);
  return [IN_PROCESS[0], bp, dm, ace];
}

/** The state to show before any probe has answered. */
export function initialEngineStatuses(): EngineStatus[] {
  return [
    IN_PROCESS[0],
    { ...IN_PROCESS[1], health: 'PROBING', detail: 'Checking the model file...' },
    {
      id: 'demucs',
      label: 'Demucs v4 (stem separation)',
      location: 'service',
      health: 'PROBING',
      detail: 'Asking the separation service...',
      endpoint: getInferenceSettings().demucsEndpoint,
    },
    {
      id: 'aceRealizer',
      label: 'ACE realizer (E05)',
      location: 'service',
      health: 'PROBING',
      detail: 'Asking the realization route...',
      endpoint: '/api/e05',
    },
  ];
}

/** One line for the pill itself: how many of the reachable things answered. */
export function summarise(list: EngineStatus[]): { ready: number; total: number; probing: boolean } {
  const probing = list.some((e) => e.health === 'PROBING');
  const ready = list.filter((e) => e.health === 'IN_PROCESS' || e.health === 'REACHABLE').length;
  return { ready, total: list.length, probing };
}
