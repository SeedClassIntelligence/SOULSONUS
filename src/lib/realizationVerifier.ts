import {
  RealizationResult,
  RealizationScoreMap,
  IntentThresholdPolicy,
  IntentViolation,
  RealizerBackend,
  GenerationCandidate,
  CandidateGovernanceState,
} from '../types/daw';

export const DEFAULT_THRESHOLD_POLICY: Record<string, IntentThresholdPolicy> = {
  kick: { rhythm: 0.98, timing: 0.98, pitchContour: 0.50, articulation: 0.90 },
  snare: { rhythm: 0.95, timing: 0.95, pitchContour: 0.50, articulation: 0.85 },
  melody: { rhythm: 0.90, timing: 0.90, pitchContour: 0.97, articulation: 0.80 },
  vocal: { rhythm: 0.92, timing: 0.92, pitchContour: 0.96, articulation: 0.85 },
  default: { rhythm: 0.90, timing: 0.90, pitchContour: 0.90, articulation: 0.80 },
};

/**
 * Evaluate E05 RealizationResult against locked properties and threshold policy.
 * GENERATE ≠ COMMIT: Canonical project state is ONLY committed when creator explicitly accepts an eligible candidate.
 */
export function evaluateRealizationContract(
  audioAssetId: string,
  lockedProperties: (keyof RealizationScoreMap)[],
  mutableProperties: string[],
  measuredScores: RealizationScoreMap,
  policy: IntentThresholdPolicy,
  backend: RealizerBackend,
  sourceProjectVersionId: string = 'v1.0.0',
  modelVersion: string = 'v1.0.0',
  seed: number | null = null
): RealizationResult {
  const preservedProperties: string[] = [];
  const violations: IntentViolation[] = [];

  for (const prop of lockedProperties) {
    const score = measuredScores[prop] ?? 0;
    const requiredThreshold = policy[prop] ?? 0.85;

    if (score >= requiredThreshold) {
      preservedProperties.push(prop as string);
    } else {
      violations.push({
        property: prop,
        score,
        requiredThreshold,
      });
    }
  }

  const passedIntentContract = violations.length === 0;
  const governanceState: CandidateGovernanceState = passedIntentContract
    ? 'PASS_CANDIDATE'
    : 'REJECTED_PREVIEW_ONLY';

  const candidateId = `cand_e05_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  const candidate: GenerationCandidate = {
    candidateId,
    audioAssetId,
    sourceProjectVersionId,
    preservedProperties,
    modifiedProperties: mutableProperties,
    preservationScores: measuredScores,
    violations,
    backend,
    modelVersion,
    seed,
    passedIntentContract,
    overrideIntentContract: false,
    creatorDecision: 'PENDING',
    governanceState,
    createdTimestamp: Date.now(),
  };

  return {
    candidate,
    audioAssetId,
    preservedProperties,
    modifiedProperties: mutableProperties,
    preservationScores: measuredScores,
    violations,
    backend,
    modelVersion,
    seed,
    passedIntentContract,
  };
}
