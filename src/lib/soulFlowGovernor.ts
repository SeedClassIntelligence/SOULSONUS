import {
  SoulFlowState,
  Track,
  DetectionSettings,
  Project,
  VocalTrackState,
  SeedSignatureRecord,
} from '../types/daw';
import { signatureService } from './seedSignature';

export interface SoulFlowStageInfo {
  state: SoulFlowState;
  index: number;
  label: string;
  shortLabel: string;
  description: string;
  requirements: string[];
}

export const SOULFLOW_STAGES: SoulFlowStageInfo[] = [
  {
    state: 'CAPTURED',
    index: 0,
    label: '1. CAPTURED',
    shortLabel: 'CAPTURE',
    description: 'Beatbox / Vocal / Mic Audio Capture',
    requirements: ['Mic input active or vocal audio recorded'],
  },
  {
    state: 'INTERPRETED',
    index: 1,
    label: '2. INTERPRETED',
    shortLabel: 'INTERPRET',
    description: 'Onset, Transient & Pitch Extraction',
    requirements: ['Audio triggers detected or throat/mouth frequency profile calibrated'],
  },
  {
    state: 'TRANSLATED',
    index: 2,
    label: '3. TRANSLATED',
    shortLabel: 'TRANSLATE',
    description: 'Audio-to-MIDI Grid Mapping',
    requirements: ['At least 1 active step populated on the 64-step sequencer grid'],
  },
  {
    state: 'SOUND_SELECTED',
    index: 3,
    label: '4. SOUND_SELECTED',
    shortLabel: 'SOUND',
    description: 'CLAP Semantic Sample & Synth Matching',
    requirements: ['Instrument sound profiles assigned to active tracks'],
  },
  {
    state: 'COMPOSED',
    index: 4,
    label: '5. COMPOSED',
    shortLabel: 'COMPOSE',
    description: '4-Bar Pattern & Groove Composition',
    requirements: ['Multi-track pattern structure active across 64 steps'],
  },
  {
    state: 'REFINED',
    index: 5,
    label: '6. REFINED',
    shortLabel: 'REFINE',
    description: 'Arrangement, Swing & Quantization',
    requirements: ['Arrangement sections defined or swing/quantization parameters tuned'],
  },
  {
    state: 'COLLABORATED',
    index: 6,
    label: '7. COLLABORATED',
    shortLabel: 'COLLAB',
    description: 'Stem Exchange & Multi-User Invites',
    requirements: ['Project metadata and track stems ready for collaboration'],
  },
  {
    state: 'MIXED',
    index: 7,
    label: '8. MIXED',
    shortLabel: 'MIX',
    description: 'DSP Chains & Master Limiter Bus',
    requirements: ['Channel EQ, compression, and master volume limiter configured'],
  },
  {
    state: 'SIGNED',
    index: 8,
    label: '9. SIGNED',
    shortLabel: 'SIGN',
    description: 'SeedSignature Cryptographic Provenance',
    requirements: ['Verified SHA-256 SeedSignature record in project provenance chain'],
  },
  {
    state: 'EXPORTED',
    index: 9,
    label: '10. EXPORTED',
    shortLabel: 'EXPORT',
    description: 'WAV, Stems & Provenance Package Export',
    requirements: ['Project cryptographically signed with valid export bundle'],
  },
];

export const SOULFLOW_STAGE_ORDER: SoulFlowState[] = [
  'CAPTURED',
  'INTERPRETED',
  'TRANSLATED',
  'SOUND_SELECTED',
  'COMPOSED',
  'REFINED',
  'COLLABORATED',
  'MIXED',
  'SIGNED',
  'EXPORTED',
];

export interface ValidationContext {
  tracks: Track[];
  detectionSettings: DetectionSettings;
  seedRecords: SeedSignatureRecord[];
  project: Project;
  vocalState?: VocalTrackState;
  creatorName?: string;
}

export interface TransitionValidationResult {
  valid: boolean;
  targetState: SoulFlowState;
  currentState: SoulFlowState;
  missingRequirements: string[];
  suggestedAction?: string;
  canAutoFulfill: boolean;
}

export class SoulFlowGovernor {
  public getStageIndex(state: SoulFlowState): number {
    return SOULFLOW_STAGE_ORDER.indexOf(state);
  }

  public getStageInfo(state: SoulFlowState): SoulFlowStageInfo {
    return SOULFLOW_STAGES[this.getStageIndex(state)];
  }

  /**
   * Validate transition between current stage and target stage
   */
  public validateTransition(
    currentState: SoulFlowState,
    targetState: SoulFlowState,
    context: ValidationContext
  ): TransitionValidationResult {
    const currentIdx = this.getStageIndex(currentState);
    const targetIdx = this.getStageIndex(targetState);

    // 1. Same stage or backward transition is always valid
    if (targetIdx <= currentIdx) {
      return {
        valid: true,
        currentState,
        targetState,
        missingRequirements: [],
        canAutoFulfill: false,
      };
    }

    // 2. Validate forward transitions against target requirements and intermediate stages
    const missingRequirements: string[] = [];

    // Check intermediate and target stage requirements
    for (let i = currentIdx + 1; i <= targetIdx; i++) {
      const stage = SOULFLOW_STAGE_ORDER[i];

      if (stage === 'CAPTURED') {
        // No strict blocker for CAPTURED
      } else if (stage === 'INTERPRETED') {
        const hasMicOrTrigger =
          context.detectionSettings.enabled ||
          Boolean(context.vocalState?.audioBlob) ||
          context.tracks.some((t) => t.steps.some(Boolean));
        if (!hasMicOrTrigger) {
          missingRequirements.push('Enable Microphone input or record vocal/beatbox audio');
        }
      } else if (stage === 'TRANSLATED') {
        const hasSteps = context.tracks.some((t) => t.steps.some(Boolean));
        if (!hasSteps) {
          missingRequirements.push('Add at least 1 step to the 64-step sequencer grid');
        }
      } else if (stage === 'SOUND_SELECTED') {
        const hasTracks = context.tracks.length > 0;
        if (!hasTracks) {
          missingRequirements.push('Assign valid sound instruments to active tracks');
        }
      } else if (stage === 'COMPOSED') {
        const activeStepsCount = context.tracks.reduce(
          (acc, t) => acc + t.steps.filter(Boolean).length,
          0
        );
        if (activeStepsCount < 2) {
          missingRequirements.push('Compose a pattern with at least 2 active drum/melody steps');
        }
      } else if (stage === 'REFINED') {
        // Refinement check - valid if pattern composed
      } else if (stage === 'COLLABORATED') {
        if (!context.project.name) {
          missingRequirements.push('Set a valid project name for collaboration');
        }
      } else if (stage === 'MIXED') {
        // Mix check - valid if tracks exist
      } else if (stage === 'SIGNED') {
        if (!context.seedRecords || context.seedRecords.length === 0) {
          missingRequirements.push('Generate a verified SeedSignature cryptographic hash');
        }
      } else if (stage === 'EXPORTED') {
        if (i > currentIdx && currentIdx < 8 && (!context.seedRecords || context.seedRecords.length === 0)) {
          missingRequirements.push('Cryptographically sign project prior to EXPORT stage');
        }
      }
    }

    if (missingRequirements.length > 0) {
      return {
        valid: false,
        currentState,
        targetState,
        missingRequirements,
        suggestedAction: `Fulfill requirements for stage ${targetState}`,
        canAutoFulfill: true,
      };
    }

    return {
      valid: true,
      currentState,
      targetState,
      missingRequirements: [],
      canAutoFulfill: false,
    };
  }

  /**
   * Auto-fulfill missing requirements to allow transition (e.g. generate SeedSignature or populate default grid)
   */
  public async autoFulfillAndTransition(
    targetState: SoulFlowState,
    context: ValidationContext,
    onAddSeedRecord: (record: SeedSignatureRecord) => void
  ): Promise<SoulFlowState> {
    const targetIdx = this.getStageIndex(targetState);

    // Auto-fulfill SeedSignature if targeting SIGNED or EXPORTED and no seed record exists
    if ((targetState === 'SIGNED' || targetState === 'EXPORTED') && context.seedRecords.length === 0) {
      const record = await signatureService.createSeedSignatureRecord(
        context.project.id || 'proj_root',
        'project',
        context.creatorName || 'SoulSonus Creator',
        {
          name: context.project.name,
          bpm: context.project.bpm,
          stage: targetState,
          tracksCount: context.tracks.length,
        }
      );
      onAddSeedRecord(record);
    }

    return targetState;
  }
}

export const soulFlowGovernor = new SoulFlowGovernor();
