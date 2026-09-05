/**
 * SoulSonus Native Studio Intelligence Service
 *
 * CANONICAL ARCHITECTURE:
 * Creator ➔ SoulSonus Native Studio Intelligence ➔ Studio Context Compiler ➔
 * Reasoning Provider Interface ➔ Operation Planner ➔ SoulFlow/Governance ➔
 * Capability Router ➔ E01–E16 ➔ specialist models/DSP/libraries
 *
 * GOLDEN RULE:
 * LLM reasons. SoulSonus governs. Engines execute. Creator decides.
 *
 * ONE PERSISTENT INTELLIGENCE WITH CONTEXTUAL PROFESSIONAL EMPHASES:
 * - Co-Producer (Composition, harmony, lyrics, bounce, vibe)
 * - Audio Engineer (Acoustics, masking, LUFS, dynamics, EQ)
 * - Studio Manager (Workflow, section organization, track inventory)
 * - Tutor (Music theory concepts, DSP principles, acoustics)
 * - Platform Guide (SoulSonus capabilities, trigger methods, routing)
 */

import { DAWState, Track, TrackDspSettings, GenerationCandidate, RealizationRoute, ExpressionState } from '../types/daw';
import type { CreativeAnalytics } from './creativeAnalytics';
import type { CreativeRecommendation } from './creativeRecommendation';
import {
  StudioEmphasis,
  ReasoningProvider,
  REASONING_PROVIDERS,
  NativeStudioBrainProvider,
} from './intelligence/ReasoningProvider';
import { StudioContextCompiler } from './intelligence/StudioContextCompiler';
import { OperationPlanner } from './intelligence/OperationPlanner';

export type { StudioEmphasis };

export type AiProviderType = 'LOCAL_BRAIN' | 'OLLAMA' | 'LM_STUDIO' | 'GEMINI' | 'OPENAI' | 'CLAUDE';

export interface StudioIntelligenceConfig {
  provider: AiProviderType;
  apiKey?: string;
  endpointUrl?: string; // e.g. http://localhost:11434 for Ollama
  modelName?: string; // e.g. "gemini-1.5-flash", "gpt-4o-mini", "llama3"
  emphasis: StudioEmphasis;
  temperature: number;
}

// Backwards compatibility alias
export type AiProviderConfig = StudioIntelligenceConfig;
export type AiPersonaType = StudioEmphasis;

export interface DawActionProposal {
  id: string;
  title: string;
  description: string;
  category: 'EQ' | 'COMPRESSION' | 'VOLUME' | 'ARRANGEMENT' | 'PITCH' | 'SOUND_SWAP' | 'NOTE_EDIT' | 'REALIZATION';
  targetTrackId?: string;
  targetTrackName?: string;
  proposedChanges: {
    volume?: number;
    pitch?: string;
    dspSettings?: Partial<TrackDspSettings>;
    actionSummary: string;
    realizationRoute?: RealizationRoute;
    realizationCandidate?: GenerationCandidate;
    noteOperation?: {
      type: 'RESIZE_NOTE' | 'TRANSPOSE_NOTES' | 'QUANTIZE_NOTES';
      noteId?: string;
      noteIds?: string[];
      deltaTicks?: number;
      newDurationTicks?: number;
      semitones?: number;
      divisionTicks?: number;
    };
  };
}

export interface AiAssistantResponse {
  messageId: string;
  role: 'assistant';
  emphasis: StudioEmphasis;
  content: string;
  actionProposal?: DawActionProposal;
  timestamp: number;
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  emphasis?: StudioEmphasis;
  content: string;
  actionProposal?: DawActionProposal;
  timestamp: number;
}

const AI_CONFIG_STORAGE_KEY = 'soulsonus_native_intelligence_config_v2';

export const DEFAULT_INTELLIGENCE_CONFIG: StudioIntelligenceConfig = {
  provider: 'LOCAL_BRAIN',
  emphasis: 'CO_PRODUCER',
  temperature: 0.7,
  modelName: 'SoulSonus Native Brain',
  endpointUrl: 'http://localhost:11434',
};

export function loadAiConfig(): StudioIntelligenceConfig {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(AI_CONFIG_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_INTELLIGENCE_CONFIG, ...JSON.parse(saved) };
      }
    }
  } catch (err) {
    console.warn('[StudioIntelligence] Could not load saved config, using default', err);
  }
  return DEFAULT_INTELLIGENCE_CONFIG;
}

export function saveAiConfig(config: StudioIntelligenceConfig): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(config));
    }
  } catch (err) {
    console.warn('[StudioIntelligence] Could not save config', err);
  }
}

/**
 * SoulSonus Native Studio Intelligence Core Dispatcher
 */
export class SoulSonusNativeStudioIntelligence {
  /**
   * Evaluates creator request against live bounded DAW context and returns governed advice + candidate cards.
   */
  public static async evaluate(
    creatorPrompt: string,
    config: StudioIntelligenceConfig,
    dawState: DAWState,
    tracks: Track[],
    activeWorkspace: string,
    selectedTrack: Track | null,
    /**
     * The affective reading of the last pass, so the intelligence can explain
     * a change in the terms SRT-1 V names. Optional: a session that has not
     * performed anything has no reading, and the intelligence says so rather
     * than reasoning from a default.
     */
    expression: ExpressionState | null = null,
    /** SRT-1 XVI: what the session counted about itself, and what it would ask. */
    analytics: CreativeAnalytics | null = null,
    recommendations: CreativeRecommendation[] = []
  ): Promise<AiAssistantResponse> {
    // 1. Compile safe, bounded read-only projection (No direct state exposure)
    const boundedContext = StudioContextCompiler.compile(
      dawState,
      tracks,
      activeWorkspace,
      selectedTrack,
      config.emphasis,
      expression,
      analytics,
      recommendations
    );

    // 2. Select reasoning provider (Default: Native Studio Brain)
    let provider: ReasoningProvider = REASONING_PROVIDERS[config.provider] || REASONING_PROVIDERS.LOCAL_BRAIN;

    let reasoningResult;
    try {
      reasoningResult = await provider.reason(
        boundedContext,
        creatorPrompt,
        config.apiKey,
        config.endpointUrl,
        config.modelName,
        config.temperature
      );
    } catch (err: any) {
      console.warn(`[StudioIntelligence] Provider ${config.provider} failed, falling back to Native Brain:`, err);
      const fallbackProvider = new NativeStudioBrainProvider();
      reasoningResult = await fallbackProvider.reason(boundedContext, creatorPrompt);
      reasoningResult.content = `*(Note: Provider ${config.provider} was unreachable, using Native Studio Brain)*\n\n` + reasoningResult.content;
    }

    // 3. Plan and validate non-destructive candidate action
    const actionProposal = OperationPlanner.plan(reasoningResult.proposal);

    return {
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      role: 'assistant',
      emphasis: config.emphasis,
      content: reasoningResult.content,
      actionProposal,
      timestamp: Date.now(),
    };
  }
}

/**
 * Backwards-compatible query helper
 */
export async function queryStudioIntelligence(
  userQuery: string,
  config: StudioIntelligenceConfig,
  dawState: DAWState,
  tracks: Track[],
  activeWorkspace: string,
  selectedTrack: Track | null,
  expression: ExpressionState | null = null,
  analytics: CreativeAnalytics | null = null,
  recommendations: CreativeRecommendation[] = []
): Promise<AiAssistantResponse> {
  return SoulSonusNativeStudioIntelligence.evaluate(
    userQuery,
    config,
    dawState,
    tracks,
    activeWorkspace,
    selectedTrack,
    expression,
    analytics,
    recommendations
  );
}
