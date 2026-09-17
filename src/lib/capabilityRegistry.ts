/**
 * What SoulSonus needs done, and who can currently do it.
 *
 * A capability names the job. It never names a vendor or a model. `ACE-Step =
 * song generator` is not a registration; `realization.music`,
 * `transformation.repaint` and `separation.stems` are, and the fact that one
 * host happens to answer three of them is a deployment detail. Basic Pitch is
 * not "audio to MIDI" either -- it is two perception capabilities that this
 * platform decides the meaning of.
 *
 * WHAT THIS FILE IS, EXACTLY, TODAY.
 *
 * It describes. It does not yet dispatch. Calls still go out through
 * `realizationRouter` and `e05Provider`, and nothing routes a request by
 * asking this table who satisfies it. Wiring resolution through here is the
 * next step and it is a real one -- until it is done, a provider added below
 * changes what the studio *reports*, not what it *runs*, and that is the only
 * claim anything reading this file may make.
 *
 * The reason to write it down first is that the description is checkable and
 * the dispatch is not: a row here that names a `wiredAt` path nobody imports
 * is a lie a reader can catch, which is the point.
 *
 * ON THE LICENCE FIELDS.
 *
 * Every provider must eventually carry code licence, weight licence,
 * commercial-use eligibility, attribution, model version, model hash,
 * dependencies, hardware and known restrictions -- a model can be fine for
 * research and ineligible for production, and that distinction has to live in
 * the backend rather than in someone's memory. Nobody has verified those for
 * these providers yet. They are therefore `UNVERIFIED`, not guessed. A plausible
 * licence string typed from recollection is worse than an empty one, because
 * the empty one is visibly a task and the plausible one is a liability.
 */

export type CapabilityName =
  // What the studio hears.
  | 'perception.onset.detect'
  | 'perception.pitch.extract'
  | 'perception.notes.transcribe'
  | 'perception.tempo.estimate'
  // What it decides that means.
  | 'interpretation.expression.classify'
  | 'interpretation.role.infer'
  // Taking a performance apart.
  | 'separation.stems'
  | 'separation.single'
  // Turning intent into sound.
  | 'realization.instrument'
  | 'realization.music'
  // Changing what is already there.
  | 'transformation.repaint'
  // Measuring the result.
  | 'engineering.mix.analyze'
  | 'engineering.master.analyze';

/**
 * How soon an answer is needed, which decides where a capability may run.
 * Nothing in the GENERATIVE class may ever be reached from the audio callback.
 */
export type LatencyClass = 'REAL_TIME' | 'INTERACTIVE' | 'ASSISTIVE' | 'GENERATIVE';

/** Whether a provider has been cleared for released work. */
export type ProductionEligibility = 'CLEARED' | 'PROTOTYPE_ONLY' | 'UNVERIFIED';

export interface ProviderLicence {
  code: string;
  weights: string;
  commercialUse: ProductionEligibility;
  attribution: string;
  /** Anything that would stop this shipping. Empty is a claim; UNVERIFIED is not. */
  restrictions: string;
}

export interface CapabilityProvider {
  id: string;
  label: string;
  /** Where it runs. A service can be down; a bundle cannot. */
  location: 'in-browser' | 'service';
  /**
   * The engine this provider's health is read from, when one reports.
   * Matches `EngineStatus['id']` so the panel shows what answered rather than
   * what is installed.
   */
  engineId?: 'basicPitch' | 'spectral' | 'demucs' | 'aceRealizer';
  latency: LatencyClass;
  hardware: string;
  licence: ProviderLicence;
  /** Capabilities this provider satisfies. */
  provides: CapabilityName[];
  /**
   * The code path that actually performs it today. Every entry is a file that
   * exists and is imported by something; a row pointing at nothing is the
   * defect this field is here to make visible.
   */
  wiredAt: string;
}

const UNVERIFIED: ProviderLicence = {
  code: 'UNVERIFIED',
  weights: 'UNVERIFIED',
  commercialUse: 'UNVERIFIED',
  attribution: 'UNVERIFIED',
  restrictions: 'UNVERIFIED',
};

export const PROVIDERS: readonly CapabilityProvider[] = [
  {
    id: 'spectral',
    label: 'Spectral onset classifier',
    location: 'in-browser',
    engineId: 'spectral',
    latency: 'REAL_TIME',
    hardware: 'None. Hand-written DSP in this bundle.',
    licence: {
      code: 'This repository',
      weights: 'No model file',
      commercialUse: 'CLEARED',
      attribution: 'None',
      restrictions: 'None. Nothing external is involved.',
    },
    provides: ['perception.onset.detect', 'interpretation.expression.classify'],
    wiredAt: 'audio/detectionEngine.ts, audio/performanceClassifier.ts',
  },
  {
    id: 'onsetIntervals',
    label: 'Onset-interval tempo reader',
    location: 'in-browser',
    latency: 'INTERACTIVE',
    hardware: 'None.',
    licence: {
      code: 'This repository',
      weights: 'No model file',
      commercialUse: 'CLEARED',
      attribution: 'None',
      restrictions: 'None.',
    },
    provides: ['perception.tempo.estimate'],
    wiredAt: 'audio/expressionState.ts',
  },
  {
    id: 'basicPitch',
    label: 'Basic Pitch (ONNX)',
    location: 'in-browser',
    engineId: 'basicPitch',
    latency: 'INTERACTIVE',
    hardware: 'None beyond the browser. Runs on onnxruntime-web.',
    licence: UNVERIFIED,
    provides: ['perception.pitch.extract', 'perception.notes.transcribe'],
    wiredAt: 'audio/basicPitch.ts',
  },
  {
    id: 'interpretation',
    label: 'SoulSonus interpretation',
    location: 'in-browser',
    latency: 'INTERACTIVE',
    hardware: 'None.',
    licence: {
      code: 'This repository',
      weights: 'No model file',
      commercialUse: 'CLEARED',
      attribution: 'None',
      restrictions: 'None.',
    },
    provides: ['interpretation.role.infer'],
    wiredAt: 'lib/interpretation.ts',
  },
  {
    id: 'soundFont',
    label: 'SpessaSynth SoundFont playback',
    location: 'in-browser',
    latency: 'REAL_TIME',
    hardware: 'None.',
    licence: UNVERIFIED,
    provides: ['realization.instrument'],
    wiredAt: 'audio/soundFont.ts, audio/sampledInstrument.ts',
  },
  {
    id: 'demucs',
    label: 'Demucs v4',
    location: 'service',
    engineId: 'demucs',
    latency: 'GENERATIVE',
    hardware: 'A host on :8010. Practical on CPU, much faster on a GPU.',
    licence: UNVERIFIED,
    provides: ['separation.stems', 'separation.single'],
    wiredAt: 'lib/inference/demucsClient.ts',
  },
  {
    id: 'aceRealizer',
    label: 'ACE-Step 1.5',
    location: 'service',
    engineId: 'aceRealizer',
    latency: 'GENERATIVE',
    hardware:
      'A host on :8001 and roughly 10 GB of weights. One measured attempt on a CPU-only machine ran for the full hour and returned nothing.',
    licence: UNVERIFIED,
    provides: ['realization.music', 'transformation.repaint'],
    wiredAt: 'lib/inference/e05Provider.ts, server/e05Route.ts',
  },
  {
    id: 'masterAnalysis',
    label: 'In-browser mix and master analysis',
    location: 'in-browser',
    latency: 'ASSISTIVE',
    hardware: 'None. Runs in the page audio graph, on purpose.',
    licence: {
      code: 'This repository',
      weights: 'No model file',
      commercialUse: 'CLEARED',
      attribution: 'None',
      restrictions: 'None.',
    },
    provides: ['engineering.mix.analyze', 'engineering.master.analyze'],
    wiredAt: 'audio/maskingAnalysis.ts, audio/masteringTelemetryEngine.ts, audio/masterRender.ts',
  },
];

/** Every capability this platform names, whether or not anything satisfies it. */
export const CAPABILITIES: readonly CapabilityName[] = [
  'perception.onset.detect',
  'perception.pitch.extract',
  'perception.notes.transcribe',
  'perception.tempo.estimate',
  'interpretation.expression.classify',
  'interpretation.role.infer',
  'separation.stems',
  'separation.single',
  'realization.instrument',
  'realization.music',
  'transformation.repaint',
  'engineering.mix.analyze',
  'engineering.master.analyze',
];

/** Who can satisfy this capability. Empty is an answer, and a true one. */
export function providersFor(capability: CapabilityName): CapabilityProvider[] {
  return PROVIDERS.filter((p) => p.provides.includes(capability));
}

/**
 * A capability nothing provides.
 *
 * Kept as a function rather than a constant because the honest answer changes
 * when a provider is added, and a stale constant would report a gap that had
 * been filled -- or hide one that opened.
 */
export function unprovidedCapabilities(): CapabilityName[] {
  return CAPABILITIES.filter((c) => providersFor(c).length === 0);
}

/** The pipeline every capability request passes through. Named so the panel does not invent its own. */
export const REQUEST_PIPELINE: readonly { step: string; says: string }[] = [
  { step: 'Capability contract', says: 'What is needed, in this platform’s words. No vendor named.' },
  { step: 'Provider resolution', says: 'Who can satisfy it, and is any of them answering right now.' },
  { step: 'Adapter', says: 'The request translated into that provider’s own shape.' },
  { step: 'Engine', says: 'Open-source, hosted or native. Interchangeable by design.' },
  { step: 'Normalize', says: 'The reply translated back. Provider structures stop here.' },
  { step: 'Validate', says: 'Measured against what the creator said must be preserved.' },
  { step: 'Take / ChangeSet', says: 'Lands as a take beside yours, or as a change you can reject.' },
];
