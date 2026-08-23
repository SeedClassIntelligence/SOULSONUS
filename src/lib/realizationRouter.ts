/**
 * SoulSonus E05 Realization Router & Capability Dispatcher
 *
 * DOCTRINE:
 * The creator experiences a recording studio; the architecture experiences an orchestration system.
 * ACE is not a separate panel or destination room. It sits under the DAW as one of the realization
 * capabilities available to the Co-Producer/Engineer and DAW actions.
 *
 * REALIZATION ROUTES:
 * - ORIGINAL: Preserves raw root performance audio.
 * - SAMPLE: R01 Sample Library acoustic sound replacement.
 * - INSTRUMENT: R02 SoundFont / SFZ multi-sampled instrument rendering.
 * - SYNTH: R03 Synthesizer preset rendering (MonoSynth, FM, Sub).
 * - ACE_PERFORMANCE_TRANSFER: Performance-preserving timbral transfer (E05 / ACE-Step 1.5, task=cover).
 * - ACE_STEM_EXTRACTION: Isolate one described element of a performance (task=extract). The Studio
 *   Manager's route -- "have the session work on just the bass" without inventing a new part from
 *   nothing.
 * - ACE_REPAINT: Selective region repainting (task=repaint). Declared, not yet implemented --
 *   RealizationRequest has no region field yet.
 * - ACE_GENERATIVE_EXTENSION: Style continuation (task=complete). Declared, not yet implemented --
 *   RealizationRequest has no target-duration field yet.
 */

import {
  Track,
  GenerationCandidate,
  RealizationRoute,
  RealizerBackend,
  RealizationScoreMap,
  RealizationScoreBasis,
  IntentThresholdPolicy,
  IntentViolation,
} from '../types/daw';
import { DEFAULT_THRESHOLD_POLICY } from './realizationVerifier';
import { computePreservationScores } from './inference/audioPreservationScoring';
import { getE05Provider } from './inference/e05Provider';

export interface RealizationRequest {
  sourceTrack: Track;
  targetRole: string; // e.g. '808_bass', 'cello_solo', 'studio_drum_kit', 'acoustic_snare'
  route: RealizationRoute;
  prompt?: string;
  projectVersion?: string;
  thresholdPolicy?: IntentThresholdPolicy;
}

export class RealizationRouter {
  /**
   * Dispatches a realization request to the appropriate backend and produces an audition-ready candidate
   * governed by the E05 Intent Contract.
   *
   * IMPORTANT — this method is async and genuinely calls out to a real
   * inference service for ACE_PERFORMANCE_TRANSFER. It used to return a
   * synchronous, hardcoded literal score object regardless of input
   * (`{ rhythm: 0.978, timing: 0.970, ... }` every time) -- that was the
   * central fabrication identified in the SoulSonus code audit. It has
   * been replaced with a real call to a self-hosted ACE-Step 1.5 server
   * (see inference-server/) followed by real measurement of the returned
   * audio against the creator's source performance
   * (audioPreservationScoring.ts). If the inference server is unreachable
   * or generation fails, this throws -- it does not silently fall back to
   * a plausible-looking fake score.
   */
  public static async createCandidate(req: RealizationRequest): Promise<GenerationCandidate> {
    const timestamp = Date.now();
    const candidateId = `cand_${req.route.toLowerCase()}_${timestamp}_${Math.random().toString(36).substring(2, 6)}`;
    const assetId = `ast_real_${timestamp}`;
    const projectVersion = req.projectVersion || 'v1.0.0';

    // 1. Determine Backend & Model Version based on Route
    let backend: RealizerBackend = 'SoulSonusPerformanceTransfer';
    let modelVersion = 'v1.5.0-ACERealizer-PyTorch';
    let mutableProperties: string[] = ['timbre', 'harmonic_profile', 'acoustic_envelope'];
    let lockedProperties: (keyof RealizationScoreMap)[] = ['rhythm', 'timing', 'pitchContour', 'articulation'];

    // Null until something is actually measured. Nothing here fills it in to
    // keep a type happy -- that is exactly how the fabricated scores got in.
    let measuredScores: RealizationScoreMap | null = null;
    let scoreBasis: RealizationScoreBasis = 'NOT_MEASURED';
    let audioArtifactUrl: string | undefined;
    let governanceOverride: 'UNREALIZED' | null = null;
    // Only a backend that reports the seed it used can fill this in.
    let resolvedSeed: number | null = null;

    switch (req.route) {
      case 'ACE_PERFORMANCE_TRANSFER': {
        const sourceAudioUrl = req.sourceTrack.sourceTakeAudioUrl;
        if (sourceAudioUrl) {
          backend = 'ACERealizer';
          modelVersion = 'ace-step-1.5';
          mutableProperties = ['timbre', 'room_acoustics', 'body_resonance', 'saturation'];

          // Through the SoulSonus service layer, never straight at ACE: its
          // CORS policy admits only localhost origins, so a direct call from a
          // deployed browser is refused before the model is consulted.
          //
          // `cover` is the task, not text2music: it re-renders the performance
          // that was sent in, and its output length is locked to the source, so
          // what comes back lands where the take already sits.
          const sourceAudio = await fetch(sourceAudioUrl).then((r) => r.blob());
          const realization = await getE05Provider().realize(
            {
              task: 'cover',
              instruction: req.prompt || `Perform this as ${req.targetRole.replace(/_/g, ' ')}`,
            },
            { sourceAudio, sourceFileName: `${req.sourceTrack.id}.wav` }
          );
          audioArtifactUrl = URL.createObjectURL(realization.audio);
          modelVersion = realization.resolvedModel || modelVersion;
          resolvedSeed = realization.resolvedSeed ?? null;

          // Measured against the creator's own take, not asserted.
          measuredScores = await computePreservationScores(sourceAudioUrl, audioArtifactUrl);
          scoreBasis = 'MEASURED';
          break;
        }

        // No raw take audio, so there is nothing to transfer a performance
        // from and nothing to measure a transfer against. This used to return
        // a score of 0.985/0.980/0.970/0.910 and a `_preview.wav` path that
        // was never written -- a full passing candidate for a realization that
        // had not happened.
        backend = 'SoulSonusPerformanceTransfer';
        modelVersion = 'v1.0.0-R02-SoundFont';
        mutableProperties = ['timbre', 'expression_curve', 'room_acoustics'];
        governanceOverride = 'UNREALIZED';
        break;
      }

      case 'ACE_STEM_EXTRACTION': {
        // Studio Manager's route: extract locks its output length to the
        // source, same as cover, but the model's job is different -- pull one
        // described element out of the performance rather than re-render the
        // whole thing. This is the real answer to "have the session work on
        // just the bass": ask ACE to extract it, not fabricate a synth part.
        const sourceAudioUrl = req.sourceTrack.sourceTakeAudioUrl;
        if (sourceAudioUrl) {
          backend = 'ACERealizer';
          modelVersion = 'ace-step-1.5';
          mutableProperties = ['timbre', 'room_acoustics', 'body_resonance', 'saturation'];

          const sourceAudio = await fetch(sourceAudioUrl).then((r) => r.blob());
          const realization = await getE05Provider().realize(
            {
              task: 'extract',
              instruction: req.prompt || `Extract the ${req.targetRole.replace(/_/g, ' ')}`,
            },
            { sourceAudio, sourceFileName: `${req.sourceTrack.id}.wav` }
          );
          audioArtifactUrl = URL.createObjectURL(realization.audio);
          modelVersion = realization.resolvedModel || modelVersion;
          resolvedSeed = realization.resolvedSeed ?? null;

          measuredScores = await computePreservationScores(sourceAudioUrl, audioArtifactUrl);
          scoreBasis = 'MEASURED';
          break;
        }

        // No take to extract from, same reasoning as ACE_PERFORMANCE_TRANSFER
        // with no source: an unrealized route, not a fabricated one.
        backend = 'SoulSonusPerformanceTransfer';
        modelVersion = 'v1.0.0-R02-SoundFont';
        mutableProperties = ['timbre', 'expression_curve', 'room_acoustics'];
        governanceOverride = 'UNREALIZED';
        break;
      }

      // Declared in the route vocabulary, not yet implemented: repaint needs
      // a region (start/end seconds) and generative extension needs a target
      // duration, and RealizationRequest carries neither field yet. Marked
      // unrealized rather than left to fall through to ORIGINAL's default,
      // which would have silently handed back the untouched source and
      // called it a repaint or an extension -- exactly the kind of quiet
      // fabrication this file exists to refuse.
      case 'ACE_REPAINT':
      case 'ACE_GENERATIVE_EXTENSION':
        backend = 'SoulSonusPerformanceTransfer';
        modelVersion = 'v1.0.0-R02-SoundFont';
        mutableProperties = [];
        governanceOverride = 'UNREALIZED';
        break;

      // The remaining routes are not model outputs. What they preserve is
      // entailed by how they work rather than observed, so their scores are
      // exactly 1 or 0 and carry scoreBasis 'BY_CONSTRUCTION' -- never a
      // near-miss decimal, which is the shape a measurement has and would read
      // as one. None of them renders a file at candidate time, so none names
      // an artifact URL.

      case 'SAMPLE':
        backend = 'SampleRealizer';
        modelVersion = 'v1.0.0-R01-SampleVault';
        mutableProperties = ['timbre', 'pitch', 'envelope'];
        // Entailed by the route rather than measured: a triggered one-shot
        // fires on the step it is given, so timing is preserved because that
        // is what triggering a sample does; a fixed, unbent sample cannot
        // follow a pitch contour. Marked BY_CONSTRUCTION so the drawer never
        // shows it in the same voice as a reading.
        measuredScores = { rhythm: 1.0, timing: 1.0, pitchContour: 0.0, articulation: 0.0 };
        scoreBasis = 'BY_CONSTRUCTION';
        // The render happens on commit. Naming a file here invented one.
        governanceOverride = 'UNREALIZED';
        break;

      case 'INSTRUMENT':
        backend = 'SoulSonusPerformanceTransfer';
        modelVersion = 'v1.0.0-R02-SoundFont';
        mutableProperties = ['timbre', 'expression_curve'];
        // Entailed: a multi-sampled instrument plays the notes it is given at
        // the ticks it is given, so rhythm, timing and discrete pitch hold by
        // construction. Continuous articulation does not, and is not claimed.
        measuredScores = { rhythm: 1.0, timing: 1.0, pitchContour: 1.0, articulation: 0.0 };
        scoreBasis = 'BY_CONSTRUCTION';
        governanceOverride = 'UNREALIZED';
        break;

      case 'SYNTH':
        backend = 'SynthRealizer';
        modelVersion = 'v1.0.0-R03-ToneSynth';
        mutableProperties = ['oscillator_type', 'filter_envelope', 'harmonics'];
        // Same entailment as INSTRUMENT: the synth is driven by the note
        // events, so it cannot drift from them.
        measuredScores = { rhythm: 1.0, timing: 1.0, pitchContour: 1.0, articulation: 0.0 };
        scoreBasis = 'BY_CONSTRUCTION';
        governanceOverride = 'UNREALIZED';
        break;

      case 'ORIGINAL':
      default:
        backend = 'SoulSonusNativeRealizer';
        modelVersion = 'v1.0.0-E01-RootAudio';
        mutableProperties = [];
        // Exact by definition: this is the creator's own audio, untouched.
        // The only route where a perfect score is a fact rather than a claim.
        measuredScores = { rhythm: 1.0, timing: 1.0, pitchContour: 1.0, articulation: 1.0 };
        scoreBasis = 'BY_CONSTRUCTION';
        audioArtifactUrl = req.sourceTrack.sourceTakeAudioUrl;
        // ORIGINAL with no take audio is not a realization of anything.
        if (!audioArtifactUrl) governanceOverride = 'UNREALIZED';
        break;
    }

    // 2. Evaluate Intent Contract Policy
    const roleKey = req.targetRole.toLowerCase().includes('kick')
      ? 'kick'
      : req.targetRole.toLowerCase().includes('snare')
      ? 'snare'
      : req.targetRole.toLowerCase().includes('vocal')
      ? 'vocal'
      : req.targetRole.toLowerCase().includes('bass')
      ? 'bass'
      : 'melody';

    const policy = req.thresholdPolicy || DEFAULT_THRESHOLD_POLICY[roleKey] || DEFAULT_THRESHOLD_POLICY.default;

    const preservedProperties: string[] = [];
    const violations: IntentViolation[] = [];

    // A contract is a statement about rendered audio, so it can only be
    // evaluated once there is some. Two things used to go wrong here: a
    // missing score defaulted to 0.9, which sits above most thresholds, so an
    // unmeasured candidate passed by accident; and an unrealized route was
    // still judged, so the drawer reported that a property had missed its
    // threshold in audio that had never been rendered.
    const contractEvaluated = measuredScores !== null && governanceOverride === null;

    if (contractEvaluated) {
      for (const prop of lockedProperties) {
        const score = measuredScores?.[prop];
        if (score === undefined) continue;
        const threshold = policy[prop] ?? 0.85;

        if (score >= threshold) {
          preservedProperties.push(prop);
        } else {
          violations.push({ property: prop, score, requiredThreshold: threshold });
        }
      }
    }

    const passedIntentContract = contractEvaluated ? violations.length === 0 : null;

    const governanceState = governanceOverride
      ? governanceOverride
      : !contractEvaluated
        ? 'UNREALIZED'
        : passedIntentContract
          ? 'PASS_CANDIDATE'
          : 'REJECTED_PREVIEW_ONLY';

    return {
      candidateId,
      audioAssetId: assetId,
      audioArtifactUrl,
      realizationRoute: req.route,
      targetRole: req.targetRole,
      prompt: req.prompt,
      sourceProjectVersionId: projectVersion,
      preservedProperties,
      modifiedProperties: mutableProperties,
      preservationScores: measuredScores,
      scoreBasis,
      violations,
      backend,
      modelVersion,
      // Hardcoded to 42 for every candidate on every route, including routes
      // that use no seed at all. Now it is whatever the backend reported, or
      // null when there was no backend to report one.
      seed: resolvedSeed,
      passedIntentContract,
      overrideIntentContract: false,
      creatorDecision: 'PENDING',
      governanceState,
      createdTimestamp: timestamp,
    };
  }

  /**
   * Intelligently recommends the best realization route based on creator intention text.
   */
  public static selectRouteForPrompt(prompt: string): RealizationRoute {
    const q = prompt.toLowerCase();

    // 1. Explicit or nuanced timbral performance transfer -> ACE
    if (
      q.includes('sliding 808') ||
      q.includes('nasty') ||
      q.includes('expressive cello') ||
      q.includes('cello') ||
      q.includes('violin') ||
      q.includes('performance transfer') ||
      q.includes('exactly what i performed') ||
      q.includes('keep my phrasing') ||
      q.includes('professionally recorded') ||
      q.includes('mouth bass') ||
      q.includes('timbre') ||
      q.includes('realize')
    ) {
      return 'ACE_PERFORMANCE_TRANSFER';
    }

    // 2. Isolating one element of an existing performance -> stem extraction
    if (
      q.includes('extract') ||
      q.includes('isolate') ||
      q.includes('just the bass') ||
      q.includes('just the drums') ||
      q.includes('pull out the') ||
      q.includes('stem')
    ) {
      return 'ACE_STEM_EXTRACTION';
    }

    // 3. Sample swap -> SAMPLE
    if (q.includes('sample') || q.includes('one-shot') || q.includes('wav drop') || q.includes('vinyl kick')) {
      return 'SAMPLE';
    }

    // 4. Multi-sample acoustic SoundFont -> INSTRUMENT
    if (q.includes('soundfont') || q.includes('sf2') || q.includes('rhodes') || q.includes('grand piano') || q.includes('acoustic')) {
      return 'INSTRUMENT';
    }

    // 5. Synth -> SYNTH
    if (q.includes('synth') || q.includes('fm') || q.includes('saw') || q.includes('square') || q.includes('lead')) {
      return 'SYNTH';
    }

    // Default to ACE Performance Transfer for natural creative origination
    return 'ACE_PERFORMANCE_TRANSFER';
  }
}
