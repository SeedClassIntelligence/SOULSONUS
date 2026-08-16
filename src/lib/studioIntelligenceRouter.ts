import { Track, GenerationCandidate, TrackDspSettings, ArrangementSection } from '../types/daw';

export interface CreatorIntent {
  rawPrompt: string;
  targetTrackId?: string;
  targetSectionId?: string;
  targetBarRange?: [number, number];
  intentType:
    | 'TIMBRE_SCULPT' // e.g. "Make kick fatter"
    | 'PERFORMANCE_TRANSFER' // e.g. "Turn hum into synth bass"
    | 'VOCAL_TO_BGM' // e.g. "Build music around vocal hook"
    | 'REGIONAL_REPAINT' // e.g. "Redo guitar in bars 17-24"
    | 'SOUND_SEARCH' // e.g. "Find crisp trap snare"
    | 'MIX_BALANCE'; // e.g. "Separate 808 and kick mud"
  preferredRoute?: 'SEARCH' | 'DSP' | 'REALIZATION' | 'AUTO';
}

export interface SessionContext {
  bpm: number;
  key: string;
  scale: string;
  tracks: Track[];
  sections: ArrangementSection[];
  activeSectionId?: string;
  selectedTrack?: Track;
}

export interface CandidateRoute {
  routeId: 'ROUTE_A_SEARCH' | 'ROUTE_B_DSP' | 'ROUTE_C_REALIZATION';
  engineId: 'E04_CLAP' | 'E10_DSP' | 'E05_ACE_STEP' | 'E05_SFZ';
  title: string;
  description: string;
  lockedInvariants: string[];
  candidateAudioUrl?: string;
  proposedDspChanges?: Partial<TrackDspSettings>;
  proposedMidiNotes?: string[];
  proposedSteps?: boolean[];
  confidenceScore: number;
}

export interface RouterExecutionResult {
  intent: CreatorIntent;
  analyzedProperties: string[];
  lockedInvariants: string[];
  candidates: CandidateRoute[];
  recommendedRouteId: string;
}

export class StudioIntelligenceRouter {
  /**
   * Evaluates creator intent, inspects session context, locks invariants,
   * and synthesizes candidate routes (Search vs DSP vs Realization).
   */
  public async routeIntent(
    intent: CreatorIntent,
    context: SessionContext
  ): Promise<RouterExecutionResult> {
    const targetTrack =
      context.tracks.find((t) => t.id === intent.targetTrackId) ||
      context.selectedTrack ||
      context.tracks[0];

    const promptLower = intent.rawPrompt.toLowerCase();
    const lockedInvariants: string[] = [];
    const analyzedProperties: string[] = [];
    const candidates: CandidateRoute[] = [];

    // 1. INVARIANT IDENTIFICATION & LOCKING
    if (targetTrack?.instrument === 'kick' || promptLower.includes('kick')) {
      lockedInvariants.push('kick_transient_punch_preserved', 'phase_alignment_locked');
      analyzedProperties.push('low_end_fundamental_55hz', 'transient_beater_click_3khz');
    } else if (targetTrack?.instrument === 'bass' || promptLower.includes('808') || promptLower.includes('bass')) {
      lockedInvariants.push('sub_fundamental_weight_retained', 'mono_sub_below_100hz');
      analyzedProperties.push('sub_energy_40_80hz', 'harmonic_saturation_saturation');
    } else if (targetTrack?.instrument === 'vocal_synth' || promptLower.includes('vocal')) {
      lockedInvariants.push('vocal_formant_preserved', 'sibilance_controlled_6_8khz');
      analyzedProperties.push('presence_air_10khz', 'body_warmth_300hz');
    } else {
      lockedInvariants.push('musical_tempo_grid_locked', 'harmonic_scale_pitch_locked');
    }

    // 2. ROUTE GENERATION

    // Route A: Sound Vault Search (E04 CLAP)
    candidates.push({
      routeId: 'ROUTE_A_SEARCH',
      engineId: 'E04_CLAP',
      title: `Search Vault: Punchy ${targetTrack?.name || 'Instrument'} Candidate`,
      description: `Ranks top matching samples from R01 sound vaults using zero-shot CLAP acoustic embeddings.`,
      lockedInvariants: [...lockedInvariants],
      candidateAudioUrl: `/audio/vault/preview_${targetTrack?.instrument || 'kick'}_a.wav`,
      confidenceScore: 0.94,
    });

    // Route B: Deterministic Channel DSP (E10 DSP)
    candidates.push({
      routeId: 'ROUTE_B_DSP',
      engineId: 'E10_DSP',
      title: `Deterministic DSP: Transient & Harmonic Enhancement`,
      description: `Engages +1.5dB low shelf EQ, transient shaper attack boost, and subtle tape saturation on current track.`,
      lockedInvariants: [...lockedInvariants],
      proposedDspChanges: {
        lowGain: 1.5,
        compressorRatio: 2.5,
        compressorThreshold: -16,
      },
      confidenceScore: 0.98,
    });

    // Route C: Generative Realization (E05.E ACE-Step 1.5 / E05.B SFZ)
    if (intent.intentType === 'VOCAL_TO_BGM') {
      candidates.push({
        routeId: 'ROUTE_C_REALIZATION',
        engineId: 'E05_ACE_STEP',
        title: `ACE-Step 1.5: Vocal-to-BGM Accompaniment Realization`,
        description: `Analyzes vocal hook melody and generates synchronized Drums, 808, and Keys accompaniment stems in ${context.key || 'C Minor'}.`,
        lockedInvariants: [...lockedInvariants, 'vocal_lead_preserved_unaltered'],
        candidateAudioUrl: `/audio/realization/vocal2bgm_candidate_01.wav`,
        confidenceScore: 0.96,
      });
    } else if (intent.intentType === 'REGIONAL_REPAINT') {
      candidates.push({
        routeId: 'ROUTE_C_REALIZATION',
        engineId: 'E05_ACE_STEP',
        title: `ACE-Step 1.5: Inpainted Region Performance (Bars ${intent.targetBarRange?.[0] || 17}-${intent.targetBarRange?.[1] || 24})`,
        description: `Regenerates selected phrase with musical variation while preserving surrounding non-target bars.`,
        lockedInvariants: [...lockedInvariants, 'crossfade_boundaries_smoothed'],
        candidateAudioUrl: `/audio/realization/repaint_candidate_01.wav`,
        confidenceScore: 0.95,
      });
    } else {
      candidates.push({
        routeId: 'ROUTE_C_REALIZATION',
        engineId: 'E05_ACE_STEP',
        title: `ACE-Step 1.5: Performance Transfer Realization`,
        description: `Transforms raw performance timbre to high-fidelity target while mathematically preserving micro-timing onsets.`,
        lockedInvariants: [...lockedInvariants, 'rhythm_contour_fidelity_95pct'],
        candidateAudioUrl: `/audio/realization/perf_transfer_candidate_01.wav`,
        confidenceScore: 0.92,
      });
    }

    // Determine Recommended Route based on intent
    let recommendedRouteId = 'ROUTE_B_DSP';
    if (promptLower.includes('find') || promptLower.includes('search') || promptLower.includes('sound like')) {
      recommendedRouteId = 'ROUTE_A_SEARCH';
    } else if (promptLower.includes('hum') || promptLower.includes('vocal to') || promptLower.includes('redo') || intent.intentType === 'VOCAL_TO_BGM') {
      recommendedRouteId = 'ROUTE_C_REALIZATION';
    }

    return {
      intent,
      analyzedProperties,
      lockedInvariants,
      candidates,
      recommendedRouteId,
    };
  }
}

export const studioIntelligenceRouter = new StudioIntelligenceRouter();
