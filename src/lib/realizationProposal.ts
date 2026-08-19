/**
 * One place a realization proposal is built.
 *
 * A proposal is not a result. It names a route, a target role and an
 * instruction, and that is the whole of what can honestly be stated before any
 * audio exists. Everything a result carries -- a score, an artifact, a seed, a
 * contract verdict -- stays empty until something has actually run.
 *
 * This exists because five separate call sites each hand-wrote a candidate
 * with its own literal scores, and they drifted apart while all claiming to be
 * measurements.
 */

import { GenerationCandidate, RealizationRoute, RealizerBackend } from '../types/daw';

export function proposeRealization(args: {
  route: RealizationRoute;
  targetRole: string;
  prompt: string;
  backend: RealizerBackend;
  modelVersion: string;
  /** What the route intends to change. Safe to state -- it is the request, not a result. */
  modifiedProperties: string[];
  /** What the route intends to hold. Also the request: whether it succeeded is measured later. */
  intendedInvariants: string[];
}): GenerationCandidate {
  const timestamp = Date.now();
  return {
    candidateId: `cand_${args.route.toLowerCase()}_${timestamp}_${Math.random().toString(36).slice(2, 8)}`,
    audioAssetId: `ast_${args.route.toLowerCase()}_${timestamp}`,
    // No URL: nothing has been rendered. An invented path is worse than none,
    // because the player reports a load failure rather than an unbuilt feature.
    audioArtifactUrl: undefined,
    realizationRoute: args.route,
    targetRole: args.targetRole,
    prompt: args.prompt,
    sourceProjectVersionId: 'v1.0.0',
    preservedProperties: [],
    modifiedProperties: args.modifiedProperties,
    preservationScores: null,
    scoreBasis: 'NOT_MEASURED',
    violations: [],
    backend: args.backend,
    modelVersion: args.modelVersion,
    seed: null,
    passedIntentContract: null,
    overrideIntentContract: false,
    creatorDecision: 'PENDING',
    governanceState: 'UNREALIZED',
    createdTimestamp: timestamp,
  };
}

