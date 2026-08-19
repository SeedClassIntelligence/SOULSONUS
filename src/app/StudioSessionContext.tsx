import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  DAWState,
  Track,
  VocalTrackState,
  DetectionSettings,
  ArrangementSection,
  SeedSignatureRecord,
  WorkspaceTab,
  SelectionContext,
  CoproducerContext,
  InstrumentType,
  NoteEvent,
  NoteProvenance,
  TrackViewMode,
  PianoRollTool,
  CreatorMusicSignature,
  CommitTransactionResult,
  AssetLineageRecord,
  GenerationDecisionRecord,
  SourceModality,
  TrackLayer,
  ProductionScope,
  VocalTake,
  VocalComp,
  VocalCompSegment,
  LyricLine,
  LyricVersion,
  LyricSection,
  VocalSelectionContext,
  WriteRecordContext,
  PitchCorrectionSettings,
  TimingCorrectionSettings,
  HarmonySettings,
  VoiceIdentitySettings,
  RecordingInputSettings,
  PunchRegion,
  MixBusChannel,
  InsertSlot,
  InsertPluginCategory,
  AuxSendConfig,
  ReferenceTrackConfig,
  MixSnapshot,
  ClipOperationType,
  MixProposal,
  TrackDspSettings,
  AcceptedMixPrint,
  MasteringProcessorType,
  MasteringProcessorSlot,
  MasteringDspChain,
  MasterCandidate,
  FinalizationGateStatus,
} from '../types/daw';
import {
  deriveStepArrayFromNoteEvents,
  stepToTick,
  tickToStep,
  midiToNoteName,
  noteNameToMidi,
  snapTick,
  TICKS_PER_16TH,
  TICKS_PER_4_BARS,
} from '../utils/musicMath';

import { PRESETS } from '../data/presets';
import { audioEngine } from '../audio/audioEngine';
import { productionHistory } from '../lib/productionOperations';
import { detectionEngine, CaptureEvent } from '../audio/detectionEngine';
import { resolveCaptureTarget } from '../audio/captureRouting';
import { midiNoteToCaptureEvent } from '../audio/midiCapture';
import { analyzePerformanceBuffer, ContentAnalysis } from '../audio/offlinePerformanceAnalysis';
import { toMono } from '../audio/fft';
import { renderMasterBounce } from '../audio/masterRender';
import { defaultTrackDsp } from '../audio/trackStrip';
import { buildDeliveryPackage, disposeDelivery, DeliveryPackage } from '../audio/deliveryPackage';
import { MaskingReport, analyzeMasking } from '../audio/maskingAnalysis';
import { masteringTelemetryEngine, LoudnessTelemetryReport } from '../audio/masteringTelemetryEngine';
import { audioEncoders } from '../lib/audioEncoders';

export type MasterBounceFormat = 'WAV_24' | 'WAV_16' | 'FLAC';

export interface MasterBounceResult {
  ok: boolean;
  message: string;
  fileName?: string;
  url?: string;
  sizeBytes?: number;
  measurement?: LoudnessTelemetryReport;
}
import { midiEngine } from '../audio/midiEngine';
import { DemucsClient } from '../lib/inference/demucsClient';
import { getInferenceSettings } from '../lib/inference/inferenceSettings';
import {
  AUTOSAVE_ID,
  ProjectSnapshot,
  ProjectSummary,
  SCHEMA_VERSION,
  deleteProject,
  listProjects,
  loadProject,
  saveProject,
} from '../lib/projectPersistence';

export type AudioImportMode = 'SOLO_PERFORMANCE' | 'FULL_MIX';

/**
 * Editor state that belongs to the creator's session rather than to a
 * component. It lived inside StudioCanvas, which unmounts whenever the room
 * switches to one that renders a different workspace, so the selected tool and
 * bar view silently reset every time.
 */
export interface EditorPreferences {
  universalTool: PianoRollTool;
  universalSnapTicks: number;
  universalSnapToScale: boolean;
  showVelocityLane: boolean;
  activeBarView: 'all' | 1 | 2 | 3 | 4;
  seedTargetMode: 'NEW_TRACK' | 'ADD_LAYER';
}

/**
 * The Write & Record room's draft. This is written work, not preference: it
 * was component-local, so leaving the room to check the mix destroyed whatever
 * had been typed and restored the demo text.
 */
/**
 * A layer in the Write & Record room's take list — a lead, a harmony or an
 * ad-lib line with its own mute and level. Distinct from `VocalTake`, which is
 * a recorded performance in the take pool; typing these as the same thing was
 * a mistake that only surfaced once component props were being checked.
 */
export interface WriteRoomTake {
  id: string;
  name: string;
  type: 'lead' | 'harmony' | 'adlib';
  muted: boolean;
  volume: number;
}

export interface WriteRoomDraft {
  lyrics: string;
  cadence: string;
  takes: WriteRoomTake[];
}

export interface StemExtractionResult {
  ok: boolean;
  message: string;
  stems?: { name: string; instrument: string; noteCount: number }[];
}

export interface AudioImportResult {
  ok: boolean;
  mode: AudioImportMode;
  message: string;
  eventCount?: number;
  /** Hits detected past the four-bar note grid, reported rather than clamped. */
  droppedBeyondGrid?: number;
  classes?: string[];
  content?: ContentAnalysis;
  stems?: { role: string; durationSec: number; peakAmplitude: number; url: string }[];
}
import { signatureService } from '../lib/seedSignature';
import { CreativeResourceVaultModal } from '../components/CreativeResourceVaultModal';
import { AudioStemImportModal } from '../components/AudioStemImportModal';

const INITIAL_GROUP_BUSES: MixBusChannel[] = [
  {
    id: 'bus_drums',
    name: 'Drum Bus',
    type: 'drum_bus',
    volume: 0,
    pan: 0,
    mute: false,
    solo: false,
    glueCompressionEnabled: true,
    saturationDrive: 15,
    inputTrackIds: ['t-kick', 't-snare', 't-hihat'],
    inserts: [
      { slotId: 'ins_d1', pluginId: 'vca_glue', pluginName: 'VCA Drum Glue Comp', category: 'dynamics', bypassed: false, orderIndex: 0, parameters: { threshold: -14, ratio: 4, attack: 10, release: 100 } },
      { slotId: 'ins_d2', pluginId: 'tape_sat', pluginName: 'Tape Warmth', category: 'saturation', bypassed: false, orderIndex: 1, parameters: { drive: 20 } },
    ],
  },
  {
    id: 'bus_vocals',
    name: 'Vocal Bus',
    type: 'vocal_bus',
    volume: 0,
    pan: 0,
    mute: false,
    solo: false,
    glueCompressionEnabled: true,
    inputTrackIds: ['t-vocal', 't-harmony'],
    inserts: [
      { slotId: 'ins_v1', pluginId: 'opto_leveler', pluginName: 'Opto Vocal Leveler', category: 'dynamics', bypassed: false, orderIndex: 0, parameters: { peakReduction: 35 } },
      { slotId: 'ins_v2', pluginId: 'air_eq', pluginName: 'Presence & Air Shelf', category: 'eq', bypassed: false, orderIndex: 1, parameters: { boostDb: 2.0, freqHz: 12000 } },
    ],
  },
  {
    id: 'bus_music',
    name: 'Music Bus',
    type: 'music_bus',
    volume: 0,
    pan: 0,
    mute: false,
    solo: false,
    inputTrackIds: ['t-808', 't-synth', 't-strings'],
    inserts: [
      { slotId: 'ins_m1', pluginId: 'stereo_width', pluginName: 'Mid/Side Stereo Imager', category: 'spatial', bypassed: false, orderIndex: 0, parameters: { width: 115 } },
    ],
  },
  {
    id: 'bus_fx',
    name: 'FX / Reverb Bus',
    type: 'fx_bus',
    volume: 0,
    pan: 0,
    mute: false,
    solo: false,
    inputTrackIds: [],
    inserts: [],
  },
  {
    id: 'bus_master',
    name: 'Master Bus',
    type: 'master',
    volume: 0,
    pan: 0,
    mute: false,
    solo: false,
    inputTrackIds: ['bus_drums', 'bus_vocals', 'bus_music', 'bus_fx'],
    inserts: [
      { slotId: 'ins_mst1', pluginId: 'master_eq', pluginName: 'Linear Phase Curve', category: 'eq', bypassed: false, orderIndex: 0, parameters: { lowCutHz: 25, highAirDb: 1.0 } },
      { slotId: 'ins_mst2', pluginId: 'true_peak_limiter', pluginName: 'True Peak Safety Limiter', category: 'dynamics', bypassed: false, orderIndex: 1, parameters: { ceilingDbtp: -1.0, thresholdDbfs: -0.5 } },
    ],
  },
];

const INITIAL_MASTERING_DSP_CHAIN: MasteringDspChain = {
  id: 'chain_streaming_balanced',
  name: 'Streaming Balanced (-14.0 LUFS)',
  targetLufs: -14.0,
  targetDbtp: -1.0,
  slots: [
    {
      id: 'm_slot_1',
      name: 'Corrective Linear-Phase EQ',
      type: 'corrective_eq',
      enabled: true,
      bypassed: false,
      parameters: { lowCutHz: 28, lowMidNotchDb: -0.8, lowMidFreqHz: 260, highAirDb: 1.5, highAirFreqHz: 12000 },
    },
    {
      id: 'm_slot_2',
      name: '3-Band Dynamic Equalizer',
      type: 'dynamic_eq',
      enabled: true,
      bypassed: false,
      parameters: { bassDuckingDb: -1.2, bassFreqHz: 110, sibilanceDuckingDb: -1.5, sibilanceFreqHz: 6500 },
    },
    {
      id: 'm_slot_3',
      name: 'Master Bus VCA Glue Compressor',
      type: 'bus_comp',
      enabled: true,
      bypassed: false,
      parameters: { threshold: -16, ratio: 2.0, attackMs: 30, releaseMs: 120, makeupDb: 1.2 },
    },
    {
      id: 'm_slot_4',
      name: 'Harmonic Tape / Tube Saturation',
      type: 'saturation',
      enabled: true,
      bypassed: false,
      parameters: { drive: 18, colorMode: 'tape_warmth' },
    },
    {
      id: 'm_slot_5',
      name: 'Mid/Side Stereo Imager & Mono-Bass',
      type: 'stereo_ms',
      enabled: true,
      bypassed: false,
      parameters: { monoBassCutoffHz: 100, sideWidthPercent: 115 },
    },
    {
      id: 'm_slot_6',
      name: 'Soft Transient Peak Clipper',
      type: 'soft_clipper',
      enabled: true,
      bypassed: false,
      parameters: { ceilingHeadroomDb: 0.8, softness: 45 },
    },
    {
      id: 'm_slot_7',
      name: 'True-Peak Broadcast Limiter',
      type: 'true_peak_limiter',
      enabled: true,
      bypassed: false,
      parameters: { ceilingDbtp: -1.0, lookaheadMs: 4.5, releaseMs: 80 },
    },
  ],
};

const INITIAL_LYRIC_SECTIONS: Record<string, LyricSection> = {
  sec_verse: {
    sectionId: 'sec_verse',
    sectionName: 'Verse 1',
    lines: [
      {
        lineId: 'line_v1_1',
        sectionId: 'sec_verse',
        bar: 5,
        text: 'Walking through the neon rain, watching shadows fade away',
        syllables: ['Walk-', 'ing', 'through', 'the', 'ne-', 'on', 'rain,', 'watch-', 'ing', 'shad-', 'ows', 'fade', 'a-', 'way'],
        cadenceEmphasis: [true, false, true, false, true, false, true, true, false, true, false, true, false, true],
        cadenceRhythm: 'syncopated_early',
        rhymeSchemeTag: 'A',
        status: 'final',
      },
      {
        lineId: 'line_v1_2',
        sectionId: 'sec_verse',
        bar: 6,
        text: 'Every heartbeat in my chest knows the words I cannot say',
        syllables: ['Ev-', 'ery', 'heart-', 'beat', 'in', 'my', 'chest', 'knows', 'the', 'words', 'I', 'can-', 'not', 'say'],
        cadenceEmphasis: [true, false, true, false, false, false, true, true, false, true, false, true, false, true],
        cadenceRhythm: 'on_beat',
        rhymeSchemeTag: 'A',
        status: 'draft',
      },
    ],
    versions: [
      {
        versionId: 'ver_v1_orig',
        versionName: 'Verse 1 v1 (Initial Draft)',
        timestamp: Date.now() - 3600000,
        author: 'CREATOR',
        lines: [
          {
            lineId: 'line_v1_1',
            sectionId: 'sec_verse',
            bar: 5,
            text: 'Walking through the neon rain, watching shadows fade away',
            syllables: ['Walk-', 'ing', 'through', 'the', 'ne-', 'on', 'rain,', 'watch-', 'ing', 'shad-', 'ows', 'fade', 'a-', 'way'],
            cadenceEmphasis: [true, false, true, false, true, false, true, true, false, true, false, true, false, true],
            cadenceRhythm: 'syncopated_early',
            rhymeSchemeTag: 'A',
            status: 'final',
          },
          {
            lineId: 'line_v1_2',
            sectionId: 'sec_verse',
            bar: 6,
            text: 'Every heartbeat in my chest knows the words I cannot say',
            syllables: ['Ev-', 'ery', 'heart-', 'beat', 'in', 'my', 'chest', 'knows', 'the', 'words', 'I', 'can-', 'not', 'say'],
            cadenceEmphasis: [true, false, true, false, false, false, true, true, false, true, false, true, false, true],
            cadenceRhythm: 'on_beat',
            rhymeSchemeTag: 'A',
            status: 'draft',
          },
        ],
      },
    ],
    activeVersionId: 'ver_v1_orig',
  },
  sec_hook: {
    sectionId: 'sec_hook',
    sectionName: 'Hook',
    lines: [
      {
        lineId: 'line_h1_1',
        sectionId: 'sec_hook',
        bar: 13,
        text: 'Hold on to the sound tonight, we are electric in the dark',
        syllables: ['Hold', 'on', 'to', 'the', 'sound', 'to-', 'night,', 'we', 'are', 'e-', 'lec-', 'tric', 'in', 'the', 'dark'],
        cadenceEmphasis: [true, false, false, false, true, false, true, false, false, true, false, true, false, false, true],
        cadenceRhythm: 'syncopated_late',
        rhymeSchemeTag: 'B',
        status: 'final',
      },
      {
        lineId: 'line_h1_2',
        sectionId: 'sec_hook',
        bar: 14,
        text: 'Feel the frequency ignite, lightning hitting like a spark',
        syllables: ['Feel', 'the', 'fre-', 'quen-', 'cy', 'ig-', 'nite,', 'light-', 'ning', 'hit-', 'ting', 'like', 'a', 'spark'],
        cadenceEmphasis: [true, false, true, false, false, true, true, true, false, true, false, true, false, true],
        cadenceRhythm: 'syncopated_early',
        rhymeSchemeTag: 'B',
        status: 'final',
      },
    ],
    versions: [
      {
        versionId: 'ver_h1_orig',
        versionName: 'Hook v1 (Master Concept)',
        timestamp: Date.now() - 2400000,
        author: 'CREATOR',
        lines: [
          {
            lineId: 'line_h1_1',
            sectionId: 'sec_hook',
            bar: 13,
            text: 'Hold on to the sound tonight, we are electric in the dark',
            syllables: ['Hold', 'on', 'to', 'the', 'sound', 'to-', 'night,', 'we', 'are', 'e-', 'lec-', 'tric', 'in', 'the', 'dark'],
            cadenceEmphasis: [true, false, false, false, true, false, true, false, false, true, false, true, false, false, true],
            cadenceRhythm: 'syncopated_late',
            rhymeSchemeTag: 'B',
            status: 'final',
          },
          {
            lineId: 'line_h1_2',
            sectionId: 'sec_hook',
            bar: 14,
            text: 'Feel the frequency ignite, lightning hitting like a spark',
            syllables: ['Feel', 'the', 'fre-', 'quen-', 'cy', 'ig-', 'nite,', 'light-', 'ning', 'hit-', 'ting', 'like', 'a', 'spark'],
            cadenceEmphasis: [true, false, true, false, false, true, true, true, false, true, false, true, false, true],
            cadenceRhythm: 'syncopated_early',
            rhymeSchemeTag: 'B',
            status: 'final',
          },
        ],
      },
    ],
    activeVersionId: 'ver_h1_orig',
  },
};

export interface StudioSessionState {
  // Navigation & View State
  activeWorkspace: WorkspaceTab;
  setActiveWorkspace: (ws: WorkspaceTab) => void;
  selectionContext: SelectionContext;
  setSelectionContext: React.Dispatch<React.SetStateAction<SelectionContext>>;
  
  // Production Scope
  activeProductionScope: ProductionScope;
  setActiveProductionScope: React.Dispatch<React.SetStateAction<ProductionScope>>;

  // Focus Mode
  focusTrackId: string | null;
  setFocusTrackId: (trackId: string | null) => void;
  exitFocusMode: () => void;

  // Drawers & Modals Visibility
  isInspectorOpen: boolean;
  setIsInspectorOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isCalibrationOpen: boolean;
  setIsCalibrationOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isVisualizationOpen: boolean;
  setIsVisualizationOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isVaultModalOpen: boolean;
  setIsVaultModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isAudioImportModalOpen: boolean;
  setIsAudioImportModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isVoiceCloneDrawerOpen: boolean;
  setIsVoiceCloneDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;


  // DAW Engine State
  dawState: DAWState;
  setDawState: React.Dispatch<React.SetStateAction<DAWState>>;
  tracks: Track[];
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
  sections: ArrangementSection[];
  setSections: React.Dispatch<React.SetStateAction<ArrangementSection[]>>;
  handleUpdateSections: (
    next: ArrangementSection[] | ((prev: ArrangementSection[]) => ArrangementSection[]),
    label?: string
  ) => void;
  vocalState: VocalTrackState;
  setVocalState: React.Dispatch<React.SetStateAction<VocalTrackState>>;
  detectionSettings: DetectionSettings;
  setDetectionSettings: React.Dispatch<React.SetStateAction<DetectionSettings>>;
  seedRecords: SeedSignatureRecord[];
  lineageRecords: AssetLineageRecord[];
  decisionRecords: GenerationDecisionRecord[];
  
  // History Stack
  canUndo: boolean;
  canRedo: boolean;
  handleUndo: () => string | null;
  handleRedo: () => string | null;
  undoLabel: string | null;
  redoLabel: string | null;
  labelNextEdit: (label: string) => void;
  handleUpdateTrack: (trackId: string, updates: Partial<Track>, label?: string) => void;
  updateTracksWithHistory: (action: Track[] | ((prev: Track[]) => Track[])) => void;

  // Engine Actions
  handleMasterVolumeChange: (vol: number) => void;
  handleReverbLevelChange: (level: number) => void;
  handleDelayLevelChange: (level: number) => void;
  handleStepChange: (step: number) => void;
  handleAddTrack: (type?: InstrumentType, name?: string) => void;
  handleDeleteTrack: (trackId: string) => void;
  handleToggleStep: (trackId: string, stepIndex: number) => void;
  handleChangeStepNote: (trackId: string, stepIndex: number, note: string) => void;
  handleToggleMute: (trackId: string) => void;
  handleToggleSolo: (trackId: string) => void;
  handleChangeVolume: (trackId: string, volume: number) => void;
  handleChangePitch: (trackId: string, pitch: string) => void;
  handleCloneBarToAll: (sourceBarIndex?: number) => void;
  handleNudgeTrackPattern: (trackId: string, direction: 'left' | 'right') => void;
  handleShiftTrackRow: (fromTrackIndex: number, direction: 'up' | 'down') => void;
  handleClearTrack: (trackId: string) => void;
  handleClearAll: () => void;
  handleRandomize: (barIndex?: number) => void;
  handleInvertPattern: () => void;
  handleAddSeedRecord: (record: SeedSignatureRecord) => void;
  handleCommitCandidateTransaction: (result: CommitTransactionResult, targetTrackId?: string) => boolean;

  // Calibration State
  calibratingTrackId: string | null;
  setCalibratingTrackId: (id: string | null) => void;

  // Creator Info
  creatorName: string;

  // Source Track Creation & Extraction
  editorPrefs: EditorPreferences;
  updateEditorPrefs: (updates: Partial<EditorPreferences>) => void;
  writeRoomDraft: WriteRoomDraft;
  updateWriteRoomDraft: (updates: Partial<WriteRoomDraft>) => void;

  // Project persistence
  isHydrating: boolean;
  lastSavedAt: number | null;
  persistenceError: string | null;
  handleSaveProjectAs: (name: string) => Promise<ProjectSummary | null>;
  handleOpenProject: (id: string) => Promise<boolean>;
  handleListProjects: () => Promise<ProjectSummary[]>;
  handleDeleteProject: (id: string) => Promise<void>;
  handleNewProject: () => void;

  handleCreateSourceTrack: (modality: SourceModality) => void;

  // Capture inputs that share one router: mic, uploaded file, MIDI hardware
  isMidiCaptureArmed: boolean;
  handleToggleMidiCapture: () => Promise<boolean>;
  handleAnalyzeAudioFile: (file: File) => Promise<ContentAnalysis>;
  handleImportAudioFile: (file: File, mode: AudioImportMode) => Promise<AudioImportResult>;
  handleExtractStemsFromSource: (sourceTrackId: string) => Promise<StemExtractionResult>;
  handleExtractSingleInstrument: (sourceTrackId: string, targetInstrument: InstrumentType) => void;

  // Track Layering & Explosion
  handleAddTrackLayer: (trackId: string, layer: Partial<TrackLayer>) => void;
  handleRemoveTrackLayer: (trackId: string, layerId: string) => void;
  handleUpdateTrackLayer: (trackId: string, layerId: string, updates: Partial<TrackLayer>) => void;
  handleExplodeLayersToTracks: (trackId: string) => void;

  // Step 3: Vocal & Songwriting State
  vocalSelectionContext: VocalSelectionContext;
  setVocalSelectionContext: React.Dispatch<React.SetStateAction<VocalSelectionContext>>;
  lyricSections: Record<string, LyricSection>;
  setLyricSections: React.Dispatch<React.SetStateAction<Record<string, LyricSection>>>;

  // Step 3: Lyric Actions
  handleAddLyricLine: (sectionId: string, text: string) => void;
  handleUpdateLyricLine: (sectionId: string, lineId: string, updates: Partial<LyricLine>) => void;
  handleDeleteLyricLine: (sectionId: string, lineId: string) => void;
  handleCreateLyricVersion: (sectionId: string, versionName: string, author?: 'CREATOR' | 'CO_PRODUCER_PROPOSAL') => void;
  handleRestoreLyricVersion: (sectionId: string, versionId: string) => void;

  // Step 3: Vocal Takes & Recording Actions
  handleAddVocalTake: (trackId: string, takeData: Partial<VocalTake> & { audioBlob?: Blob }) => void;
  handleSetActiveTake: (trackId: string, takeId: string) => void;
  handleDeleteTake: (trackId: string, takeId: string) => void;
  handleUpdateTakeRating: (trackId: string, takeId: string, rating: number) => void;

  // Step 3: Comping Actions
  handleUpdateCompSegment: (trackId: string, sectionId: string, bar: number, takeId: string) => void;
  handleApplyCompProposal: (trackId: string, sectionId: string, compProposal: VocalComp) => void;

  // Step 3: Pitch, Timing, Harmony & Voice Identity Actions
  handleUpdatePitchSettings: (trackId: string, updates: Partial<PitchCorrectionSettings>) => void;
  handleUpdateTimingSettings: (trackId: string, updates: Partial<TimingCorrectionSettings>) => void;
  handleUpdateHarmonySettings: (trackId: string, updates: Partial<HarmonySettings>) => void;
  handleUpdateVoiceIdentitySettings: (trackId: string, updates: Partial<VoiceIdentitySettings>) => void;
  handleSetPunchRegion: (trackId: string, punchRegion: PunchRegion) => void;

  // Step 5: Tactile Performance & Note Editor (Piano Roll)
  selectedNoteIds: string[];
  setSelectedNoteIds: React.Dispatch<React.SetStateAction<string[]>>;
  handleAddNote: (trackId: string, note: Omit<NoteEvent, 'id' | 'provenance'> & { provenance?: Partial<NoteProvenance> }) => void;
  handleMoveNotes: (trackId: string, noteIds: string[], deltaTicks: number, deltaMidi: number) => void;
  handleResizeNote: (trackId: string, noteId: string, newDurationTicks: number) => void;
  handleSplitNote: (trackId: string, noteId: string, splitAtTick: number) => void;
  handleDeleteNotes: (trackId: string, noteIds: string[]) => void;
  handleSetNoteVelocity: (trackId: string, noteId: string, velocity: number) => void;
  handleSetNoteLyric: (trackId: string, noteId: string, lyric: string) => void;
  handleTransposeNotes: (trackId: string, noteIdsOrSemitones: string[] | number, semitones?: number) => void;
  handleTransposeAllTracks: (semitones: number) => void;
  handleQuantizeTrackNotes: (trackId: string, noteIds: string[], divisionTicks?: number) => void;
  handleToggleTrackViewMode: (trackId: string, viewMode?: TrackViewMode) => void;

  // Step 4: Multichannel MIX Console State & Actions
  buses: MixBusChannel[];
  setBuses: React.Dispatch<React.SetStateAction<MixBusChannel[]>>;
  mixSnapshots: MixSnapshot[];
  activeSnapshotId: string | null;
  referenceTrack: ReferenceTrackConfig | null;
  focusedTrackId: string | null;
  handleSetFocusedTrackId: (trackId: string | null) => void;
  monitoringMode: {
    soloTrackIds: string[];
    muteTrackIds: string[];
    isDimmed: boolean;
    isBypassed: boolean;
    abMode: 'MIX' | 'REF' | 'B';
  };
  handleToggleMixSolo: (trackId: string) => void;
  handleToggleMixMute: (trackId: string) => void;
  handleToggleMixDim: () => void;
  handleToggleMixBypass: () => void;
  handleToggleReferenceAB: () => void;
  handleUpdateChannelStrip: (trackId: string, updates: Partial<TrackDspSettings>) => void;
  handleUpdateBusChannel: (busId: string, updates: Partial<MixBusChannel>) => void;
  handleToggleInsertBypass: (trackId: string, slotId: string) => void;
  handleReorderTrackInserts: (trackId: string, sourceIdx: number, targetIdx: number) => void;
  handleAddInsertSlot: (trackId: string, pluginName: string, category: InsertPluginCategory) => void;
  handleRemoveInsertSlot: (trackId: string, slotId: string) => void;
  handleSaveMixSnapshot: (name: string) => void;
  handleRestoreMixSnapshot: (snapshotId: string) => void;
  handleSetReferenceTrack: (config: ReferenceTrackConfig | null) => void;
  handleCommitMixProposal: (proposal: MixProposal) => void;
  handleExecuteClipOperation: (trackId: string, op: ClipOperationType, params?: any) => void;

  // Step 5: FINISH Mastering & Provenance State & Actions
  acceptedMixPrint: AcceptedMixPrint;
  masteringChain: MasteringDspChain;
  masterCandidates: MasterCandidate[];
  activeMasterCandidateId: string;
  finalizationGate: FinalizationGateStatus;
  /** Measures where two tracks compete for the same band, from real audio. */
  handleAnalyzeMasking: () => Promise<MaskingReport>;
  maskingReport: MaskingReport | null;
  isAnalyzingMasking: boolean;

  /** Bounces the project through the mastering chain and measures it for real. */
  handleAnalyzeMaster: () => Promise<LoudnessTelemetryReport | null>;
  /** Bounces and hands back an encoded file, ready to download. */
  handleBounceMaster: (format: MasterBounceFormat) => Promise<MasterBounceResult>;
  isBouncing: boolean;
  masterMeasurement: LoudnessTelemetryReport | null;
  handleUpdateMasteringProcessor: (slotId: string, params: Record<string, any>) => void;
  handleToggleMasteringProcessor: (slotId: string) => void;
  handleLoadMasteringPreset: (presetName: string) => void;
  handleAuditionMasterCandidate: (candidateId: string) => void;
  handleCommitMasterCandidate: (candidateId: string) => void;
  handleSignMasterSeedSignature: () => Promise<SeedSignatureRecord>;
  handleExportMasterDelivery: () => Promise<DeliveryPackage>;
  deliveryPackage: DeliveryPackage | null;
  isPackagingDelivery: boolean;
  deliveryProgress: { fraction: number; label: string } | null;
  deliveryError: string | null;

  coproducerContext: CoproducerContext;
}

const StudioSessionContext = createContext<StudioSessionState | null>(null);

export const StudioSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Active Workspace
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceTab>('CREATE');

  // Focus Track ID
  const [focusTrackId, setFocusTrackId] = useState<string | null>(null);
  const exitFocusMode = useCallback(() => setFocusTrackId(null), []);

  // Drawers & Modals
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);
  const [isVisualizationOpen, setIsVisualizationOpen] = useState(false);
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [isAudioImportModalOpen, setIsAudioImportModalOpen] = useState(false);
  const [isVoiceCloneDrawerOpen, setIsVoiceCloneDrawerOpen] = useState(false);


  // Main DAW State
  const [dawState, setDawState] = useState<DAWState>({
    isPlaying: false,
    isRecordingMic: false,
    isLooping: false,
    metronomeOn: false,
    bpm: 110,
    currentStep: 0,
    masterVolume: 0,
    reverbLevel: 0.15,
    delayLevel: 0.1,
    swing: 0,
    activeBarView: 'all',
    soulFlowState: 'CAPTURED',
    projectName: 'Dubler Vocal Beatbox Master',
  });

  const [creatorName] = useState('SoulSonus Master Creator');

  // Track Patterns (Default to Dubler Vocal Beatbox preset)
  const [tracks, setTracks] = useState<Track[]>(PRESETS[0].tracks);

  // Selection Context
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);

  const [selectionContext, setSelectionContext] = useState<SelectionContext>({
    selectedTrackId: PRESETS[0].tracks[0]?.id || null,
    selectedSectionId: 'sec_1',
    selectedBarRange: null,
    selectedAssetId: null,
    selectedWorkspace: 'CREATE',
    focusTrackId: null,
    selectedNoteIds: [],
    activePianoRollTrackId: null,
  });

  // Concrete Production Scope (ALL_SONG, SECTION, or BAR_RANGE)
  const [activeProductionScope, setActiveProductionScope] = useState<ProductionScope>({
    scopeType: 'ALL_SONG',
    sectionId: 'sec_1',
    startBar: 1,
    endBar: 4,
  });

  // Sync workspace and focus state into selectionContext
  useEffect(() => {
    setSelectionContext((prev) => ({
      ...prev,
      selectedWorkspace: activeWorkspace,
      focusTrackId,
    }));
  }, [activeWorkspace, focusTrackId]);

  // Arrangement Sections
  const [sections, setSections] = useState<ArrangementSection[]>([
    {
      id: 'sec_1',
      name: 'Intro Beat',
      tag: 'Intro',
      bars: [1],
      energy: 'low',
      color: '#3b82f6',
      description: 'Minimal intro setting up the groove',
    },
    {
      id: 'sec_2',
      name: 'Verse Pocket',
      tag: 'Verse',
      bars: [2],
      energy: 'medium',
      color: '#06b6d4',
      description: 'Kick-snare groove',
    },
    {
      id: 'sec_3',
      name: 'Chorus Lead Hook',
      tag: 'Chorus',
      bars: [3],
      energy: 'high',
      color: '#eab308',
      description: 'Full arrangement with melody lead',
    },
    {
      id: 'sec_4',
      name: 'Outro Resolving Tail',
      tag: 'Outro',
      bars: [4],
      energy: 'low',
      color: '#10b981',
      description: 'Stripped resolving tail',
    },
  ]);

  // History Stack
  //
  // An entry holds the tracks and the arrangement together. Sections used to sit
  // outside history entirely, so adding or deleting one could not be undone
  // while every note edit could — and an undo taken after an arrangement change
  // would silently leave the arrangement where it was.
  interface HistoryEntry {
    tracks: Track[];
    sections: ArrangementSection[];
  }
  const [past, setPast] = useState<HistoryEntry[]>([]);
  const [future, setFuture] = useState<HistoryEntry[]>([]);

  /**
   * Snapshot taken before an edit, flushed into the undo stack by an effect.
   * It must not be pushed from inside the setTracks updater: React invokes
   * updaters twice under StrictMode and may re-run them, so a setState there
   * duplicates history entries and can cost the edit itself.
   */
  const pendingUndoRef = useRef<HistoryEntry | null>(null);

  /**
   * An open run of related edits that undo should treat as one.
   *
   * A recorded take arrives as one commit per note. Routed through the history
   * writer ungrouped, a 22-note take would cost 22 presses of undo to remove.
   * While a group is open, the snapshot taken before its first edit is the one
   * undo returns to; the group closes after `HISTORY_GROUP_IDLE_MS` of quiet.
   */
  const historyGroupRef = useRef<{ key: string; at: number } | null>(null);
  const HISTORY_GROUP_IDLE_MS = 2000;

  /** Committed sections, so a history snapshot can capture them without a dep. */
  const sectionsRef = useRef<ArrangementSection[]>([]);

  /**
   * What the pending entry should be called, if anything named it.
   *
   * The co-producer and the track workstation described their edits into a
   * second, separate undo stack. The descriptions were the useful part; the
   * separate stack was not, because pressing undo in one panel could not take
   * back what the other did. Descriptions now label entries in the one stack.
   */
  const pendingLabelRef = useRef<string | null>(null);
  const [pastLabels, setPastLabels] = useState<string[]>([]);
  const [futureLabels, setFutureLabels] = useState<string[]>([]);

  /** Names the next history entry. Called before the edit that creates it. */
  const labelNextEdit = useCallback((label: string) => {
    pendingLabelRef.current = label;
  }, []);

  const updateTracksWithHistory = useCallback(
    (action: Track[] | ((prev: Track[]) => Track[]), options?: { group?: string }) => {
      // Group bookkeeping happens here rather than inside the updater: React
      // invokes updaters twice under StrictMode, and this decides whether a
      // history entry is written.
      const group = options?.group;
      const now = Date.now();
      let continuesGroup = false;
      if (group) {
        const open = historyGroupRef.current;
        continuesGroup = !!open && open.key === group && now - open.at < HISTORY_GROUP_IDLE_MS;
        historyGroupRef.current = { key: group, at: now };
      } else {
        historyGroupRef.current = null;
      }

      setTracks((prevTracks) => {
        const nextTracks = typeof action === 'function' ? action(prevTracks) : action;

        if (JSON.stringify(prevTracks) !== JSON.stringify(nextTracks)) {
          // Guarded so a double-invoked updater records the snapshot only once.
          if (!continuesGroup && pendingUndoRef.current === null) {
            pendingUndoRef.current = { tracks: prevTracks, sections: sectionsRef.current };
          }
        }
        return nextTracks;
      });
    },
    []
  );

  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);

  /**
   * Changes the arrangement and records it in the same stack as everything
   * else, so one press of undo takes back whichever kind of edit came last.
   */
  const handleUpdateSections = useCallback(
    (next: ArrangementSection[] | ((prev: ArrangementSection[]) => ArrangementSection[]), label?: string) => {
      if (label) pendingLabelRef.current = label;
      historyGroupRef.current = null;
      const resolved = typeof next === 'function' ? next(sectionsRef.current) : next;
      if (JSON.stringify(resolved) === JSON.stringify(sectionsRef.current)) return;
      if (pendingUndoRef.current === null) {
        pendingUndoRef.current = { tracks: tracksRef.current, sections: sectionsRef.current };
      }
      setSections(resolved);
    },
    []
  );

  useEffect(() => {
    const snapshot = pendingUndoRef.current;
    if (snapshot === null) return;
    pendingUndoRef.current = null;
    const label = pendingLabelRef.current || 'Edit';
    pendingLabelRef.current = null;
    setPast((prevPast) => {
      const updated = [...prevPast, snapshot];
      return updated.length > 50 ? updated.slice(1) : updated;
    });
    setPastLabels((prev) => {
      const updated = [...prev, label];
      return updated.length > 50 ? updated.slice(1) : updated;
    });
    setFuture([]);
    setFutureLabels([]);
  }, [tracks, sections]);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  // Undo and redo read the committed values through refs and then write each
  // piece of state once. They used to call setState from inside another
  // updater, which StrictMode invokes twice — the one place where a doubled
  // invocation silently corrupts the stack it is maintaining.
  const pastRef = useRef<HistoryEntry[]>([]);
  const futureRef = useRef<HistoryEntry[]>([]);
  useEffect(() => {
    pastRef.current = past;
    futureRef.current = future;
  }, [past, future]);

  const labelsRef = useRef<{ past: string[]; future: string[] }>({ past: [], future: [] });
  useEffect(() => {
    labelsRef.current = { past: pastLabels, future: futureLabels };
  }, [pastLabels, futureLabels]);

  const handleUndo = useCallback((): string | null => {
    const prevPast = pastRef.current;
    if (prevPast.length === 0) return null;
    const previousState = prevPast[prevPast.length - 1];
    const current: HistoryEntry = { tracks: tracksRef.current, sections: sectionsRef.current };
    const labels = labelsRef.current;
    const label = labels.past[labels.past.length - 1] || 'Edit';

    // Whatever run of edits was open ends here, so the next edit starts a new
    // history entry rather than joining the one just undone.
    historyGroupRef.current = null;

    pastRef.current = prevPast.slice(0, prevPast.length - 1);
    futureRef.current = [current, ...futureRef.current];
    labelsRef.current = {
      past: labels.past.slice(0, labels.past.length - 1),
      future: [label, ...labels.future],
    };
    setPast(pastRef.current);
    setFuture(futureRef.current);
    setPastLabels(labelsRef.current.past);
    setFutureLabels(labelsRef.current.future);
    setTracks(previousState.tracks);
    setSections(previousState.sections);
    sectionsRef.current = previousState.sections;
    return label;
  }, []);

  const handleRedo = useCallback((): string | null => {
    const prevFuture = futureRef.current;
    if (prevFuture.length === 0) return null;
    const nextState = prevFuture[0];
    const current: HistoryEntry = { tracks: tracksRef.current, sections: sectionsRef.current };
    const labels = labelsRef.current;
    const label = labels.future[0] || 'Edit';

    historyGroupRef.current = null;

    futureRef.current = prevFuture.slice(1);
    pastRef.current = [...pastRef.current, current];
    labelsRef.current = {
      past: [...labels.past, label],
      future: labels.future.slice(1),
    };
    setFuture(futureRef.current);
    setPast(pastRef.current);
    setPastLabels(labelsRef.current.past);
    setFutureLabels(labelsRef.current.future);
    setTracks(nextState.tracks);
    setSections(nextState.sections);
    sectionsRef.current = nextState.sections;
    return label;
  }, []);

  const undoLabel = pastLabels[pastLabels.length - 1] || null;
  const redoLabel = futureLabels[0] || null;

  // The co-producer and the track workstation describe their edits through this
  // bridge, so their descriptions name entries in the one stack instead of
  // filling a second one.
  useEffect(() => {
    productionHistory.connect({
      labelNextEdit,
      undo: handleUndo,
      redo: handleRedo,
      canUndo: () => pastRef.current.length > 0,
      canRedo: () => futureRef.current.length > 0,
    });
  }, [labelNextEdit, handleUndo, handleRedo]);

  /**
   * One updater for arbitrary track fields.
   *
   * The track workstation is rendered in two places and used to behave
   * differently in each: from the drawer every field was applied, from the side
   * panel only volume was — everything else was silently dropped by a handler
   * that only forwarded one key. Both now call this, and both are undoable.
   */
  const handleUpdateTrack = useCallback(
    (trackId: string, updates: Partial<Track>, label?: string) => {
      if (label) pendingLabelRef.current = label;
      // Channel-strip settings have to reach the audio graph as well as state,
      // or a pan moved from here would be stored and never heard.
      if (updates.dspSettings) {
        const track = tracksRef.current.find((t) => t.id === trackId);
        if (track) audioEngine.applyTrackDsp(trackId, updates.dspSettings, track.instrument);
      }
      updateTracksWithHistory((prev) => prev.map((t) => (t.id === trackId ? { ...t, ...updates } : t)));
    },
    [updateTracksWithHistory]
  );

  // Detection Settings
  const [detectionSettings, setDetectionSettings] = useState<DetectionSettings>({
    enabled: false,
    micConnected: false,
    kickThreshold: 0.35,
    snareThreshold: 0.3,
    gain: 1.5,
    currentLowLevel: 0,
    currentHighLevel: 0,
    lastKickTriggerTime: 0,
    lastSnareTriggerTime: 0,
    autoRecordToGrid: true,
  });

  // Vocal Track State
  const [vocalState, setVocalState] = useState<VocalTrackState>({
    isRecording: false,
    audioBlob: null,
    audioBuffer: null,
    waveformData: [],
    duration: 0,
    volume: 0,
    mute: false,
    solo: false,
    delaySend: 0.2,
    reverbSend: 0.2,
  });

  // Ref to tracks for live playback callbacks
  const tracksRef = useRef(tracks);
  const bpmRef = useRef(dawState.bpm);
  const dawStateRef = useRef(dawState);
  useEffect(() => {
    bpmRef.current = dawState.bpm;
    dawStateRef.current = dawState;
  }, [dawState]);

  /**
   * Commits classified capture events onto their channels.
   *
   * Every input source — live mic, uploaded file, MIDI hardware — funnels
   * through here, so all three get the same routing, the same one-channel-per
   * -sound-type guarantee, real velocity and real provenance. Events are folded
   * in one state update so a channel created for a newly-heard sound type is
   * visible to the events that follow it in the same batch.
   */
  const commitCaptureEvents = useCallback((events: CaptureEvent[]) => {
    if (!events.length) return;

    const playheadStep = currentStepRef.current;
    const bpm = bpmRef.current || 110;
    const ticksPerSecond = (bpm / 60) * 480;

    // Captured notes used to be written with setTracks directly, so a take
    // could not be undone at all. They go through the history writer now, as
    // one grouped entry per take rather than one per note.
    updateTracksWithHistory((prev) => {
      let next = prev;

      for (const event of events) {
        const decision = resolveCaptureTarget(next, event);
        if (decision.kind === 'drop') continue;

        // A file carries its own timeline; live mic and MIDI are positioned by
        // the playhead at the moment they arrive.
        const startTick =
          typeof event.atSeconds === 'number'
            ? Math.max(0, Math.min(TICKS_PER_4_BARS - 120, Math.round(event.atSeconds * ticksPerSecond)))
            : playheadStep * 120;
        const step = Math.max(0, Math.min(63, Math.floor(startTick / 120)));

        const origin: NoteProvenance['origin'] =
          event.source === 'MIDI'
            ? 'MIDI_KEYS'
            : event.modality === 'KEYS'
              ? 'MIDI_KEYS'
              : event.modality === 'BODY'
                ? 'BODY'
                : 'MOUTH';

        const provenance: NoteProvenance = {
          origin,
          detectionConfidence: event.confidence,
          creatorEdited: false,
        };

        const makeNote = (midiNote: number): NoteEvent => ({
          id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          startTick,
          durationTicks: 120,
          midiNote,
          velocity: event.velocity,
          provenance,
        });

        if (decision.kind === 'create') {
          const spec = decision.request;
          const midi =
            typeof event.midiNote === 'number'
              ? event.midiNote
              : event.pitch
                ? noteNameToMidi(event.pitch)
                : noteNameToMidi(spec.pitch);
          const steps = new Array(64).fill(false);
          steps[step] = true;
          next = [
            ...next,
            {
              id: `t-cap-${spec.klass}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              name: spec.name,
              instrument: spec.instrument,
              steps,
              noteEvents: [makeNote(midi)],
              mute: false,
              solo: false,
              volume: 0,
              pitch: spec.pitch,
              color: spec.color,
            } as Track,
          ];
          continue;
        }

        const target = next.find((t) => t.id === decision.trackId);
        if (!target) continue;

        const pitchName = event.pitch || target.pitch || 'C3';
        const midi = typeof event.midiNote === 'number' ? event.midiNote : noteNameToMidi(pitchName);

        next = next.map((t) => {
          if (t.id !== decision.trackId) return t;
          const newSteps = [...t.steps];
          newSteps[step] = true;
          return { ...t, steps: newSteps, noteEvents: [...(t.noteEvents || []), makeNote(midi)] };
        });
      }

      return next;
    }, { group: 'capture' });
  }, [updateTracksWithHistory]);

  /** Live monitoring for a single event. Kept out of state updaters, which must stay pure. */
  const monitorCaptureEvent = useCallback((event: CaptureEvent) => {
    const target = resolveCaptureTarget(tracksRef.current, event);
    if (target.kind === 'track') {
      const t = tracksRef.current.find((x) => x.id === target.trackId);
      if (t) audioEngine.triggerForInstrument(t.instrument, event.pitch || t.pitch || 'C3', event.velocity, t);
    } else if (target.kind === 'create') {
      const spec = target.request;
      audioEngine.triggerForInstrument(spec.instrument, event.pitch || spec.pitch, event.velocity);
    }
  }, []);

  // --- MIDI hardware capture -------------------------------------------
  // MIDI needs no spectral classification: the note number and channel already
  // state what was played, so events are named directly and handed to the same
  // router the mic path uses.
  const [isMidiCaptureArmed, setIsMidiCaptureArmed] = useState(false);

  const handleToggleMidiCapture = useCallback(async (): Promise<boolean> => {
    if (isMidiCaptureArmed) {
      setIsMidiCaptureArmed(false);
      return false;
    }
    const ok = await midiEngine.init();
    setIsMidiCaptureArmed(ok);
    return ok;
  }, [isMidiCaptureArmed]);

  useEffect(() => {
    if (!isMidiCaptureArmed) return;
    const unsubscribe = midiEngine.addListener((event) => {
      if (event.type !== 'note_on' || !event.note || !event.velocity) return;
      const captureEvent = midiNoteToCaptureEvent({
        note: event.note,
        velocity: event.velocity,
        channel: event.channel ?? 1,
      });
      monitorCaptureEvent(captureEvent);
      commitCaptureEvents([captureEvent]);
    });
    return () => unsubscribe();
  }, [isMidiCaptureArmed, monitorCaptureEvent, commitCaptureEvents]);

  // --- Audio file import ------------------------------------------------
  const decodeAudioFile = useCallback(async (file: File): Promise<AudioBuffer> => {
    const arrayBuffer = await file.arrayBuffer();
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    try {
      return await ctx.decodeAudioData(arrayBuffer);
    } finally {
      if (ctx.state !== 'closed') ctx.close();
    }
  }, []);

  /** Measures an uploaded file so the creator can be shown what it looks like. */
  const handleAnalyzeAudioFile = useCallback(
    async (file: File): Promise<ContentAnalysis> => {
      const buffer = await decodeAudioFile(file);
      return analyzePerformanceBuffer(buffer, null).content;
    },
    [decodeAudioFile]
  );

  const handleImportAudioFile = useCallback(
    async (file: File, mode: AudioImportMode): Promise<AudioImportResult> => {
      if (mode === 'SOLO_PERFORMANCE') {
        const buffer = await decodeAudioFile(file);
        // Identical pipeline to the live mic take, sourced from the file.
        const { events: allEvents, content } = analyzePerformanceBuffer(buffer, 'MOUTH');

        // The note grid is four bars. Anything past that is reported as left
        // behind rather than clamped onto the final step, which would silently
        // pile the tail of a long file into one place.
        const ticksPerSecond = ((bpmRef.current || 110) / 60) * 480;
        const gridSeconds = TICKS_PER_4_BARS / ticksPerSecond;
        const events = allEvents.filter((e) => (e.atSeconds ?? 0) < gridSeconds);
        const droppedBeyondGrid = allEvents.length - events.length;

        if (!events.length) {
          // Nothing detected is reported as nothing detected. It never falls
          // back to writing the same material onto every channel.
          return {
            ok: false,
            mode,
            message:
              'No distinct sounds were detected in this file. Check that it contains a performance, ' +
              'or import it as a full mix if several instruments play at once.',
            content,
          };
        }
        commitCaptureEvents(events);
        const classes = [...new Set(events.map((e) => e.klass))];
        const truncation = droppedBeyondGrid
          ? ` ${droppedBeyondGrid} hits past the four-bar grid were left out — trim the file or raise the project length to keep them.`
          : '';
        return {
          ok: true,
          mode,
          message:
            `Separated ${events.length} hits across ${classes.length} sound ` +
            `${classes.length === 1 ? 'type' : 'types'}.${truncation}`,
          eventCount: events.length,
          droppedBeyondGrid,
          classes,
          content,
        };
      }

      // FULL_MIX: several instruments are already playing at once, which is a
      // source-separation problem, not a classification one.
      const settings = getInferenceSettings();
      const client = new DemucsClient(settings.demucsEndpoint);

      const health = await client.health();
      if (!health.ok) {
        throw new Error(
          `Stem separation service is not reachable at ${settings.demucsEndpoint}. ` +
            'Start the Demucs service (inference-server/docker-compose.yml) or change the endpoint in inference settings.'
        );
      }

      const result = await client.separate(file, file.name);
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const roles: Record<string, { instrument: InstrumentType; pitch: string; color: string; label: string }> = {
        drums: { instrument: 'kick', pitch: 'C1', color: '#f59e0b', label: 'Drums' },
        bass: { instrument: 'bass', pitch: 'C1', color: '#f43f5e', label: 'Bass' },
        vocals: { instrument: 'vocal_synth', pitch: 'C3', color: '#ec4899', label: 'Vocals' },
        other: { instrument: 'melody', pitch: 'C3', color: '#a855f7', label: 'Other' },
      };

      const created: Track[] = [];
      const stemSummaries: AudioImportResult['stems'] = [];
      const timestamp = Date.now();

      for (const [role, stem] of Object.entries(result.stems)) {
        const spec = roles[role] || { instrument: 'melody' as InstrumentType, pitch: 'C3', color: '#64748b', label: role };
        const url = client.resolveStemUrl(stem);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Stem "${role}" could not be downloaded (${res.status}).`);
        const stemBuffer = await decodeAudioFile(new File([await res.blob()], `${role}.wav`));

        // Real peaks from the real returned audio, so a stem that came back
        // empty is visibly empty rather than decorated with a stock waveform.
        const mono = toMono(stemBuffer);
        const points = 128;
        const block = Math.max(1, Math.floor(mono.length / points));
        const waveformData: number[] = [];
        for (let i = 0; i < points; i++) {
          let peak = 0;
          for (let j = 0; j < block; j++) {
            const v = Math.abs(mono[i * block + j] || 0);
            if (v > peak) peak = v;
          }
          waveformData.push(peak);
        }

        created.push({
          id: `stem_${role}_${timestamp}`,
          name: `${baseName} (${spec.label})`,
          instrument: spec.instrument,
          steps: new Array(64).fill(false),
          mute: false,
          solo: false,
          volume: 0,
          pitch: spec.pitch,
          color: spec.color,
          sourceModality: 'AUDIO',
          sourceTakeAudioUrl: url,
          waveformTakes: [
            { id: `stemtake_${role}_${timestamp}`, name: `${spec.label} stem`, duration: stemBuffer.duration, waveformData },
          ],
        });

        stemSummaries.push({
          role,
          durationSec: Number(stemBuffer.duration.toFixed(2)),
          peakAmplitude: Number(Math.max(...waveformData).toFixed(4)),
          url,
        });
      }

      if (!created.length) throw new Error('Stem separation returned no stems.');

      updateTracksWithHistory((prev) => [...created, ...prev]);
      return {
        ok: true,
        mode,
        message: `Separated into ${created.length} stems with ${result.model} on ${result.device}.`,
        stems: stemSummaries,
      };
    },
    [decodeAudioFile, commitCaptureEvents, updateTracksWithHistory]
  );

  useEffect(() => {
    tracksRef.current = tracks;
    detectionEngine.setTracks(tracks);
    detectionEngine.setCallbacks({
      onCaptureEvent: (event) => {
        monitorCaptureEvent(event);
        commitCaptureEvents([event]);
      },
    });
  }, [tracks, monitorCaptureEvent, commitCaptureEvents]);

  // Calibrating Track ID
  const [calibratingTrackId, setCalibratingTrackId] = useState<string | null>(null);

  // Seed Records
  const [seedRecords, setSeedRecords] = useState<SeedSignatureRecord[]>([]);

  const handleAddSeedRecord = useCallback((record: SeedSignatureRecord) => {
    setSeedRecords((prev) => [record, ...prev]);
  }, []);

  const handleMasterVolumeChange = useCallback((vol: number) => {
    audioEngine.setMasterVolume(vol);
    setDawState((prev) => ({ ...prev, masterVolume: vol }));
  }, []);

  const handleReverbLevelChange = useCallback((level: number) => {
    audioEngine.setReverbLevel(level);
    setDawState((prev) => ({ ...prev, reverbLevel: level }));
  }, []);

  const handleDelayLevelChange = useCallback((level: number) => {
    audioEngine.setDelayLevel(level);
    setDawState((prev) => ({ ...prev, delayLevel: level }));
  }, []);

  const currentStepRef = useRef(0);

  const handleStepChange = useCallback((step: number) => {
    currentStepRef.current = step;
    setDawState((prev) => ({ ...prev, currentStep: step }));
  }, []);

  const handleAddTrack = useCallback((type: InstrumentType = 'melody', name?: string) => {
    const newTrack: Track = {
      id: `tr_${Date.now()}`,
      name: name || `${type.toUpperCase()} Track ${tracks.length + 1}`,
      instrument: type,
      steps: new Array(64).fill(false),
      notes: type === 'melody' || type === 'bass' ? new Array(64).fill('C3') : undefined,
      mute: false,
      solo: false,
      volume: 0,
      pitch: type === 'kick' ? 'C1' : type === 'bass' ? 'C2' : 'C3',
      color: type === 'kick' ? '#f59e0b' : type === 'snare' ? '#06b6d4' : type === 'hihat' ? '#10b981' : '#a855f7',
    };
    updateTracksWithHistory((prev) => [...prev, newTrack]);
  }, [tracks.length, updateTracksWithHistory]);

  const handleDeleteTrack = useCallback((trackId: string) => {
    if (tracks.length <= 1) return;
    updateTracksWithHistory((prev) => prev.filter((t) => t.id !== trackId));
  }, [tracks.length, updateTracksWithHistory]);

  const handleToggleStep = useCallback((trackId: string, stepIndex: number) => {
    updateTracksWithHistory((prevTracks) =>
      prevTracks.map((track) => {
        if (track.id === trackId) {
          const newSteps = [...track.steps];
          const isActivating = !newSteps[stepIndex];
          newSteps[stepIndex] = isActivating;

          // Keep noteEvents in 100% sync
          let updatedNoteEvents = track.noteEvents ? [...track.noteEvents] : [];
          const startTick = stepToTick(stepIndex);
          const defaultPitch = track.notes?.[stepIndex] || track.pitch || (track.instrument === 'bass' ? 'C1' : 'C3');
          const midi = noteNameToMidi(defaultPitch);

          if (isActivating) {
            // Check if note already exists at this step
            const exists = updatedNoteEvents.some((ev) => tickToStep(ev.startTick) === stepIndex);
            if (!exists) {
              updatedNoteEvents.push({
                id: `note_${Date.now()}_${stepIndex}_${midi}`,
                startTick,
                durationTicks: TICKS_PER_16TH,
                midiNote: midi,
                velocity: 100,
                provenance: {
                  origin: 'MANUAL',
                  creatorEdited: true,
                },
              });
            }
          } else {
            // Remove notes starting in this step
            updatedNoteEvents = updatedNoteEvents.filter((ev) => tickToStep(ev.startTick) !== stepIndex);
          }

          return { ...track, steps: newSteps, noteEvents: updatedNoteEvents };
        }
        return track;
      })
    );
  }, [updateTracksWithHistory]);

  const handleChangeStepNote = useCallback((trackId: string, stepIndex: number, note: string) => {
    updateTracksWithHistory((prevTracks) =>
      prevTracks.map((track) => {
        if (track.id === trackId) {
          const newNotes = track.notes ? [...track.notes] : new Array(64).fill(track.pitch || 'C3');
          newNotes[stepIndex] = note;
          const midi = noteNameToMidi(note);

          // Update corresponding noteEvent if present
          let updatedNoteEvents = track.noteEvents ? [...track.noteEvents] : [];
          updatedNoteEvents = updatedNoteEvents.map((ev) => {
            if (tickToStep(ev.startTick) === stepIndex) {
              return { ...ev, midiNote: midi, provenance: { ...ev.provenance, creatorEdited: true } };
            }
            return ev;
          });

          return { ...track, notes: newNotes, noteEvents: updatedNoteEvents };
        }
        return track;
      })
    );
  }, [updateTracksWithHistory]);

  // --- STEP 5: CANONICAL NOTE OPERATIONS (PIANO ROLL & CO-PRODUCER PARITY) ---

  const handleAddNote = useCallback(
    (trackId: string, noteData: Omit<NoteEvent, 'id' | 'provenance'> & { provenance?: Partial<NoteProvenance> }) => {
      updateTracksWithHistory((prevTracks) =>
        prevTracks.map((track) => {
          if (track.id === trackId) {
            const newNote: NoteEvent = {
              id: `note_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
              startTick: Math.max(0, Math.min(TICKS_PER_4_BARS - 1, noteData.startTick)),
              durationTicks: Math.max(15, noteData.durationTicks),
              midiNote: Math.max(0, Math.min(127, noteData.midiNote)),
              velocity: Math.max(1, Math.min(127, noteData.velocity ?? 100)),
              lyric: noteData.lyric,
              probability: noteData.probability,
              provenance: {
                origin: noteData.provenance?.origin || 'MANUAL',
                sourceAssetId: noteData.provenance?.sourceAssetId,
                interpretationId: noteData.provenance?.interpretationId,
                detectionConfidence: noteData.provenance?.detectionConfidence,
                creatorEdited: true,
              },
            };

            const updatedNotes = [...(track.noteEvents || []), newNote];
            const updatedSteps = deriveStepArrayFromNoteEvents(updatedNotes);

            return {
              ...track,
              noteEvents: updatedNotes,
              steps: updatedSteps,
            };
          }
          return track;
        })
      );
    },
    [updateTracksWithHistory]
  );

  const handleMoveNotes = useCallback(
    (trackId: string, noteIds: string[], deltaTicks: number, deltaMidi: number) => {
      if (noteIds.length === 0) return;
      updateTracksWithHistory((prevTracks) =>
        prevTracks.map((track) => {
          if (track.id === trackId && track.noteEvents) {
            const updatedNotes = track.noteEvents.map((note) => {
              if (noteIds.includes(note.id)) {
                const newStart = Math.max(0, Math.min(TICKS_PER_4_BARS - note.durationTicks, note.startTick + deltaTicks));
                const newMidi = Math.max(0, Math.min(127, note.midiNote + deltaMidi));
                return {
                  ...note,
                  startTick: newStart,
                  midiNote: newMidi,
                  provenance: { ...note.provenance, creatorEdited: true },
                };
              }
              return note;
            });
            const updatedSteps = deriveStepArrayFromNoteEvents(updatedNotes);
            return { ...track, noteEvents: updatedNotes, steps: updatedSteps };
          }
          return track;
        })
      );
    },
    [updateTracksWithHistory]
  );

  const handleResizeNote = useCallback(
    (trackId: string, noteId: string, newDurationTicks: number) => {
      updateTracksWithHistory((prevTracks) =>
        prevTracks.map((track) => {
          if (track.id === trackId && track.noteEvents) {
            const updatedNotes = track.noteEvents.map((note) => {
              if (note.id === noteId) {
                const maxDuration = TICKS_PER_4_BARS - note.startTick;
                const safeDuration = Math.max(15, Math.min(maxDuration, newDurationTicks));
                return {
                  ...note,
                  durationTicks: safeDuration,
                  provenance: { ...note.provenance, creatorEdited: true },
                };
              }
              return note;
            });
            const updatedSteps = deriveStepArrayFromNoteEvents(updatedNotes);
            return { ...track, noteEvents: updatedNotes, steps: updatedSteps };
          }
          return track;
        })
      );
    },
    [updateTracksWithHistory]
  );

  const handleSplitNote = useCallback(
    (trackId: string, noteId: string, splitAtTick: number) => {
      updateTracksWithHistory((prevTracks) =>
        prevTracks.map((track) => {
          if (track.id === trackId && track.noteEvents) {
            const targetNote = track.noteEvents.find((n) => n.id === noteId);
            if (!targetNote) return track;

            const noteStart = targetNote.startTick;
            const noteEnd = noteStart + targetNote.durationTicks;

            if (splitAtTick <= noteStart + 15 || splitAtTick >= noteEnd - 15) {
              return track; // Too close to boundary to split
            }

            const firstDuration = splitAtTick - noteStart;
            const secondDuration = noteEnd - splitAtTick;

            const firstNote: NoteEvent = {
              ...targetNote,
              durationTicks: firstDuration,
              provenance: { ...targetNote.provenance, creatorEdited: true },
            };

            const secondNote: NoteEvent = {
              ...targetNote,
              id: `note_${Date.now()}_split_${Math.floor(Math.random() * 1000)}`,
              startTick: splitAtTick,
              durationTicks: secondDuration,
              provenance: { ...targetNote.provenance, creatorEdited: true },
            };

            const updatedNotes = track.noteEvents
              .filter((n) => n.id !== noteId)
              .concat([firstNote, secondNote]);

            const updatedSteps = deriveStepArrayFromNoteEvents(updatedNotes);
            return { ...track, noteEvents: updatedNotes, steps: updatedSteps };
          }
          return track;
        })
      );
    },
    [updateTracksWithHistory]
  );

  const handleDeleteNotes = useCallback(
    (trackId: string, noteIds: string[]) => {
      if (noteIds.length === 0) return;
      updateTracksWithHistory((prevTracks) =>
        prevTracks.map((track) => {
          if (track.id === trackId && track.noteEvents) {
            const updatedNotes = track.noteEvents.filter((n) => !noteIds.includes(n.id));
            const updatedSteps = deriveStepArrayFromNoteEvents(updatedNotes);
            return { ...track, noteEvents: updatedNotes, steps: updatedSteps };
          }
          return track;
        })
      );
      setSelectedNoteIds((prev) => prev.filter((id) => !noteIds.includes(id)));
    },
    [updateTracksWithHistory]
  );

  const handleSetNoteVelocity = useCallback(
    (trackId: string, noteId: string, velocity: number) => {
      const safeVel = Math.max(1, Math.min(127, Math.round(velocity)));
      updateTracksWithHistory((prevTracks) =>
        prevTracks.map((track) => {
          if (track.id === trackId && track.noteEvents) {
            const updatedNotes = track.noteEvents.map((note) =>
              note.id === noteId ? { ...note, velocity: safeVel, provenance: { ...note.provenance, creatorEdited: true } } : note
            );
            return { ...track, noteEvents: updatedNotes };
          }
          return track;
        })
      );
    },
    [updateTracksWithHistory]
  );

  const handleSetNoteLyric = useCallback(
    (trackId: string, noteId: string, lyric: string) => {
      updateTracksWithHistory((prevTracks) =>
        prevTracks.map((track) => {
          if (track.id === trackId && track.noteEvents) {
            const updatedNotes = track.noteEvents.map((note) =>
              note.id === noteId ? { ...note, lyric: lyric.trim(), provenance: { ...note.provenance, creatorEdited: true } } : note
            );
            return { ...track, noteEvents: updatedNotes };
          }
          return track;
        })
      );
    },
    [updateTracksWithHistory]
  );

  const handleTransposeNotes = useCallback(
    (trackId: string, noteIdsOrSemitones: string[] | number, maybeSemitones?: number) => {
      let noteIds: string[] = [];
      let semitones: number = 0;

      if (typeof noteIdsOrSemitones === 'number') {
        semitones = noteIdsOrSemitones;
        noteIds = [];
      } else {
        noteIds = noteIdsOrSemitones || [];
        semitones = maybeSemitones ?? 0;
      }

      if (semitones === 0) return;
      updateTracksWithHistory((prevTracks) =>
        prevTracks.map((track) => {
          if (track.id === trackId && track.noteEvents) {
            const updatedNotes = track.noteEvents.map((note) => {
              if (noteIds.length === 0 || noteIds.includes(note.id)) {
                const newMidi = Math.max(0, Math.min(127, note.midiNote + semitones));
                return { ...note, midiNote: newMidi, provenance: { ...note.provenance, creatorEdited: true } };
              }
              return note;
            });
            return { ...track, noteEvents: updatedNotes };
          }
          return track;
        })
      );
    },
    [updateTracksWithHistory]
  );

  const handleTransposeAllTracks = useCallback(
    (semitones: number) => {
      if (semitones === 0) return;
      updateTracksWithHistory((prevTracks) =>
        prevTracks.map((track) => {
          if (track.instrument !== 'kick' && track.instrument !== 'snare' && track.instrument !== 'hihat' && track.noteEvents) {
            const updatedNotes = track.noteEvents.map((note) => {
              const newMidi = Math.max(0, Math.min(127, note.midiNote + semitones));
              return { ...note, midiNote: newMidi, provenance: { ...note.provenance, creatorEdited: true } };
            });
            return { ...track, noteEvents: updatedNotes };
          }
          return track;
        })
      );
    },
    [updateTracksWithHistory]
  );

  const handleQuantizeTrackNotes = useCallback(
    (trackId: string, noteIds: string[], divisionTicks: number = TICKS_PER_16TH) => {
      updateTracksWithHistory((prevTracks) =>
        prevTracks.map((track) => {
          if (track.id === trackId && track.noteEvents) {
            const updatedNotes = track.noteEvents.map((note) => {
              if (noteIds.length === 0 || noteIds.includes(note.id)) {
                const snappedStart = snapTick(note.startTick, divisionTicks);
                const snappedDuration = Math.max(divisionTicks, snapTick(note.durationTicks, divisionTicks));
                return {
                  ...note,
                  startTick: snappedStart,
                  durationTicks: snappedDuration,
                  provenance: { ...note.provenance, creatorEdited: true },
                };
              }
              return note;
            });
            const updatedSteps = deriveStepArrayFromNoteEvents(updatedNotes);
            return { ...track, noteEvents: updatedNotes, steps: updatedSteps };
          }
          return track;
        })
      );
    },
    [updateTracksWithHistory]
  );

  const handleToggleTrackViewMode = useCallback((trackId: string, viewMode?: TrackViewMode) => {
    setTracks((prevTracks) =>
      prevTracks.map((track) => {
        if (track.id === trackId) {
          const nextMode = viewMode || (track.viewMode === 'PIANO_ROLL' ? 'GRID' : 'PIANO_ROLL');
          return { ...track, viewMode: nextMode };
        }
        return track;
      })
    );
  }, []);

  const handleToggleMute = useCallback((trackId: string) => {
    setTracks((prevTracks) =>
      prevTracks.map((track) => (track.id === trackId ? { ...track, mute: !track.mute } : track))
    );
  }, []);

  const handleToggleSolo = useCallback((trackId: string) => {
    setTracks((prevTracks) =>
      prevTracks.map((track) => (track.id === trackId ? { ...track, solo: !track.solo } : track))
    );
  }, []);

  const handleChangeVolume = useCallback((trackId: string, volume: number) => {
    audioEngine.setTrackVolume(trackId, volume);
    setTracks((prevTracks) =>
      prevTracks.map((track) => (track.id === trackId ? { ...track, volume } : track))
    );
  }, []);

  const handleChangePitch = useCallback((trackId: string, pitch: string) => {
    setTracks((prevTracks) =>
      prevTracks.map((track) => (track.id === trackId ? { ...track, pitch } : track))
    );
  }, []);

  const handleCloneBarToAll = useCallback((sourceBarIndex = 0) => {
    updateTracksWithHistory((prevTracks) =>
      audioEngine.cloneBar(prevTracks, 'all', sourceBarIndex, 'all')
    );
  }, [updateTracksWithHistory]);

  const handleNudgeTrackPattern = useCallback((trackId: string, direction: 'left' | 'right') => {
    updateTracksWithHistory((prevTracks) =>
      audioEngine.nudgePattern(prevTracks, trackId, direction)
    );
  }, [updateTracksWithHistory]);

  const handleShiftTrackRow = useCallback((fromTrackIndex: number, direction: 'up' | 'down') => {
    updateTracksWithHistory((prevTracks) =>
      audioEngine.shiftTrackPattern(prevTracks, fromTrackIndex, direction)
    );
  }, [updateTracksWithHistory]);

  const handleClearTrack = useCallback((trackId: string) => {
    updateTracksWithHistory((prevTracks) => audioEngine.clearTrack(prevTracks, trackId));
  }, [updateTracksWithHistory]);

  const handleClearAll = useCallback(() => {
    updateTracksWithHistory((prevTracks) => audioEngine.clearAll(prevTracks));
  }, [updateTracksWithHistory]);

  const [lineageRecords, setLineageRecords] = useState<AssetLineageRecord[]>([]);
  const [decisionRecords, setDecisionRecords] = useState<GenerationDecisionRecord[]>([]);

  const handleCommitCandidateTransaction = useCallback((result: CommitTransactionResult, targetTrackId?: string): boolean => {
    if (!result.committed || !result.candidate || !result.commitTransactionId) {
      console.warn('[StudioSession] Transaction commit failed or incomplete:', result.reason);
      return false;
    }

    const { candidate, commitTransactionId, committedProjectVersionId, lineageRecord, decisionRecord, seedSignatureRecord } = result;
    const trackIdToUpdate = targetTrackId || selectionContext.selectedTrackId || tracks[0]?.id;

    if (trackIdToUpdate) {
      updateTracksWithHistory((prevTracks) =>
        prevTracks.map((tr) => {
          if (tr.id === trackIdToUpdate) {
            return {
              ...tr,
              preset: `${tr.name} (${candidate.backend})`,
            };
          }
          return tr;
        })
      );
    }

    if (seedSignatureRecord) {
      setSeedRecords((prev) => [seedSignatureRecord, ...prev]);
    }

    if (lineageRecord) {
      setLineageRecords((prev) => [lineageRecord, ...prev]);
    }

    if (decisionRecord) {
      setDecisionRecords((prev) => [decisionRecord, ...prev]);
    }

    if (committedProjectVersionId) {
      setDawState((prev) => ({
        ...prev,
        projectVersion: committedProjectVersionId,
        hasUnsavedChanges: false,
      }));
    }

    console.log(`[StudioSession] Atomic commit transaction '${commitTransactionId}' successfully propagated into live session state (New Version: ${committedProjectVersionId})!`);
    return true;
  }, [selectionContext.selectedTrackId, tracks, updateTracksWithHistory]);

  const handleRandomize = useCallback((barIndex?: number) => {
    updateTracksWithHistory((prevTracks) => audioEngine.randomizePattern(prevTracks, 'all', barIndex));
  }, [updateTracksWithHistory]);

  /**
   * Flips every step on every track: what was silent plays, what played stops.
   *
   * The Build room's control cluster had an INVERT button whose handler was
   * never passed, so it called undefined. This is the operation the label
   * describes.
   */
  const handleInvertPattern = useCallback(() => {
    pendingLabelRef.current = 'Invert pattern';
    updateTracksWithHistory((prevTracks) =>
      prevTracks.map((t) => ({ ...t, steps: t.steps.map((on) => !on) }))
    );
  }, [updateTracksWithHistory]);

  const coproducerContext = useMemo<CoproducerContext>(
    () => {
      let lockedProps: string[] = ['rhythm', 'timing', 'pitch_contour'];
      let mutableProps: string[] = ['timbre', 'low_freq_energy', 'saturation', 'sample_profile'];

      if (activeWorkspace === 'MIX') {
        lockedProps = ['composition', 'notes', 'rhythm', 'arrangement'];
        mutableProps = ['volume_gain', 'pan', 'eq_cutoff', 'compressor_threshold', 'reverb_send'];
      } else if (activeWorkspace === 'WRITE_RECORD') {
        lockedProps = ['beat_groove', 'bpm', 'instrumentation'];
        mutableProps = ['lyric_text', 'cadence_flow', 'vocal_harmonies', 'adlib_takes'];
      }

      return {
        workspace: activeWorkspace,
        soulFlowState: dawState.soulFlowState,
        selectedSection: selectionContext.selectedSectionId,
        selectedTrack: selectionContext.selectedTrackId,
        selectedObject: selectionContext.selectedAssetId,
        creatorIntent: 'Assist creator with intent-preserving AI realization',
        currentAction: 'IDLE',
        lockedProperties: lockedProps,
        mutableProperties: mutableProps,
        projectId: `proj_${dawState.projectName.toLowerCase().replace(/\s+/g, '_')}`,
        projectVersionId: dawState.projectVersion || 'v1.0.0',
      };
    },
    [activeWorkspace, dawState.soulFlowState, dawState.projectName, dawState.projectVersion, selectionContext]
  );


  const handleCreateSourceTrack = useCallback((modality: SourceModality) => {
    const timestamp = Date.now();
    const sourceTrackId = `t-source-${modality.toLowerCase()}-${timestamp}`;
    
    let name = 'MOUTH — Seed Take 01';
    let instrument: InstrumentType = 'custom';
    let color = '#f59e0b';
    let pitch = 'C1';

    if (modality === 'MOUTH') {
      name = `MOUTH — Seed Take 0${tracks.filter(t => t.sourceModality === 'MOUTH').length + 1}`;
      instrument = 'custom';
      color = '#f59e0b';
    } else if (modality === 'BODY') {
      name = `BODY — Tap / Rhythm Seed 0${tracks.filter(t => t.sourceModality === 'BODY').length + 1}`;
      instrument = 'percussion';
      color = '#06b6d4';
    } else if (modality === 'KEYS') {
      name = `KEYS — MIDI Idea 0${tracks.filter(t => t.sourceModality === 'KEYS').length + 1}`;
      instrument = 'melody';
      color = '#a855f7';
      pitch = 'C3';
    } else if (modality === 'AUDIO') {
      name = `AUDIO — Imported Sample 0${tracks.filter(t => t.sourceModality === 'AUDIO').length + 1}`;
      instrument = 'custom';
      color = '#3b82f6';
    } else if (modality === 'LYRICS') {
      name = `LYRICS — Cadence / Hook 0${tracks.filter(t => t.sourceModality === 'LYRICS').length + 1}`;
      instrument = 'custom';
      color = '#ec4899';
      pitch = 'C3';
    }

    const newSourceTrack: Track = {
      id: sourceTrackId,
      name,
      instrument,
      steps: Array(64).fill(false),
      mute: false,
      solo: false,
      volume: 0,
      pitch,
      color,
      isSourceTrack: true,
      sourceModality: modality,
      seedType: 'CONTRIBUTION_SEED',
      rootSeedId: 'root_seed_master',
      waveformTakes: [
        {
          id: `take_${timestamp}`,
          name: `${name} (Take 1)`,
          duration: 8.7,
          waveformData: [12, 28, 45, 78, 92, 64, 40, 85, 95, 70, 48, 88, 62, 35, 75, 90, 55, 30, 68, 85, 40, 15, 50, 75, 92, 60, 35, 80, 65, 40, 20, 10],
        }
      ],
    };

    updateTracksWithHistory((prev) => [newSourceTrack, ...prev]);
    setSelectionContext((prev) => ({ ...prev, selectedTrackId: sourceTrackId }));
  }, [tracks, updateTracksWithHistory]);

  /**
   * Turns a seed take into per-sound-type stem tracks.
   *
   * This used to write the demo preset's fixed step arrays regardless of what
   * was recorded — the same 16 kicks every time. It now works from whatever
   * the seed actually holds, and says so plainly when it holds nothing:
   *
   *   - a seed carrying real audio is analysed with the same onset detection
   *     and classifier the live mic uses;
   *   - a seed whose performance was already separated at capture time is
   *     consolidated from those real captured notes, matched by provenance;
   *   - a seed with neither is reported as having nothing to extract.
   */
  const handleExtractStemsFromSource = useCallback(
    async (sourceTrackId: string): Promise<StemExtractionResult> => {
      const current = tracksRef.current;
      const sourceTrack = current.find((t) => t.id === sourceTrackId);
      if (!sourceTrack) return { ok: false, message: 'That source track no longer exists.' };

      const modality = sourceTrack.sourceModality || 'MOUTH';
      const timestamp = Date.now();
      const CLASS_SPEC: Record<string, { instrument: InstrumentType; label: string; pitch: string; color: string }> = {
        kick: { instrument: 'kick', label: 'Kick', pitch: 'C1', color: '#f59e0b' },
        snare: { instrument: 'snare', label: 'Snare', pitch: 'C2', color: '#06b6d4' },
        hihat: { instrument: 'hihat', label: 'Hi-Hat', pitch: 'F#3', color: '#10b981' },
        tonal_low: { instrument: 'bass', label: 'Sub / Bass', pitch: 'C1', color: '#f43f5e' },
        tonal_high: { instrument: 'melody', label: 'Lead', pitch: 'C3', color: '#a855f7' },
      };

      const buildStems = (grouped: Map<string, NoteEvent[]>): Track[] =>
        [...grouped.entries()]
          .filter(([, notes]) => notes.length > 0)
          .map(([klass, notes]) => {
            const spec = CLASS_SPEC[klass] || CLASS_SPEC.tonal_high;
            const steps = new Array(64).fill(false);
            for (const n of notes) {
              const step = Math.max(0, Math.min(63, Math.floor(n.startTick / 120)));
              steps[step] = true;
            }
            return {
              id: `t-ext-${klass}-${timestamp}`,
              name: `${spec.label} (${modality} Extract)`,
              instrument: spec.instrument,
              steps,
              noteEvents: notes,
              mute: false,
              solo: false,
              volume: 0,
              pitch: spec.pitch,
              color: spec.color,
            } as Track;
          });

      let stems: Track[] = [];
      let derivedFrom = '';

      // 1. A seed carrying real audio gets analysed for real.
      if (sourceTrack.sourceTakeAudioUrl) {
        try {
          const res = await fetch(sourceTrack.sourceTakeAudioUrl);
          if (!res.ok) throw new Error(`audio could not be read (${res.status})`);
          const buffer = await decodeAudioFile(new File([await res.blob()], 'seed.wav'));
          const { events } = analyzePerformanceBuffer(buffer, modality === 'KEYS' ? 'KEYS' : 'MOUTH');
          const ticksPerSecond = ((bpmRef.current || 110) / 60) * 480;
          const grouped = new Map<string, NoteEvent[]>();
          for (const ev of events) {
            const startTick = Math.max(0, Math.min(TICKS_PER_4_BARS - 120, Math.round((ev.atSeconds ?? 0) * ticksPerSecond)));
            const note: NoteEvent = {
              id: `ext_${timestamp}_${Math.random().toString(36).slice(2, 8)}`,
              startTick,
              durationTicks: 120,
              midiNote: ev.pitch ? noteNameToMidi(ev.pitch) : noteNameToMidi(CLASS_SPEC[ev.klass]?.pitch || 'C3'),
              velocity: ev.velocity,
              provenance: {
                origin: modality === 'BODY' ? 'BODY' : modality === 'KEYS' ? 'MIDI_KEYS' : 'MOUTH',
                sourceAssetId: sourceTrackId,
                detectionConfidence: ev.confidence,
                creatorEdited: false,
              },
            };
            const list = grouped.get(ev.klass) || [];
            list.push(note);
            grouped.set(ev.klass, list);
          }
          stems = buildStems(grouped);
          derivedFrom = `${events.length} onsets detected in the seed audio`;
        } catch (err) {
          return { ok: false, message: `The seed's audio could not be analysed: ${err instanceof Error ? err.message : 'unknown error'}.` };
        }
      } else {
        // 2. Otherwise consolidate the notes this performance already produced.
        const originForModality = modality === 'BODY' ? 'BODY' : modality === 'KEYS' ? 'MIDI_KEYS' : 'MOUTH';
        const grouped = new Map<string, NoteEvent[]>();
        for (const track of current) {
          if (track.isSourceTrack) continue;
          const mine = (track.noteEvents || []).filter((n) => n.provenance?.origin === originForModality);
          if (!mine.length) continue;
          const klass =
            track.instrument === 'kick' ? 'kick'
            : track.instrument === 'snare' ? 'snare'
            : track.instrument === 'hihat' ? 'hihat'
            : track.instrument === 'bass' ? 'tonal_low'
            : 'tonal_high';
          const list = grouped.get(klass) || [];
          list.push(...mine.map((n) => ({ ...n, id: `ext_${timestamp}_${Math.random().toString(36).slice(2, 8)}` })));
          grouped.set(klass, list);
        }
        stems = buildStems(grouped);
        const total = [...grouped.values()].reduce((a, l) => a + l.length, 0);
        derivedFrom = `${total} notes captured from this ${modality} performance`;
      }

      if (!stems.length) {
        return {
          ok: false,
          message:
            'There is nothing to extract from this seed yet — it holds no audio and no captured performance. ' +
            'Record into it first, or import audio onto it.',
        };
      }

      updateTracksWithHistory((prev) => {
        const idx = prev.findIndex((t) => t.id === sourceTrackId);
        const marked = prev.map((t) =>
          t.id === sourceTrackId
            ? {
                ...t,
                decompositionManifest: {
                  manifestId: `manif_${timestamp}`,
                  sourceTrackId,
                  timestamp,
                  extractedTracks: stems.map((st) => ({
                    instrument: st.instrument,
                    name: st.name,
                    steps: st.steps,
                    notes: st.notes,
                    confidence: 1,
                    proposedSoundPreset: st.name,
                  })),
                },
              }
            : t
        );
        if (idx === -1) return [...marked, ...stems];
        const copy = [...marked];
        copy.splice(idx + 1, 0, ...stems);
        return copy;
      });

      return {
        ok: true,
        message: `Extracted ${stems.length} stem${stems.length === 1 ? '' : 's'} from ${derivedFrom}.`,
        stems: stems.map((st) => ({ name: st.name, instrument: st.instrument, noteCount: (st.noteEvents || []).length })),
      };
    },
    [decodeAudioFile, updateTracksWithHistory]
  );

  const handleExtractSingleInstrument = useCallback((sourceTrackId: string, targetInstrument: InstrumentType) => {
    const sourceTrack = tracks.find((t) => t.id === sourceTrackId);
    if (!sourceTrack) return;

    const timestamp = Date.now();
    const targetSteps = new Array(64).fill(false);
    if (targetInstrument === 'kick') {
      [0, 6, 10, 12, 16, 22, 26, 28, 32, 38, 42, 44, 48, 54, 58, 60].forEach(i => targetSteps[i] = true);
    } else if (targetInstrument === 'snare') {
      [4, 12, 20, 28, 36, 44, 52, 60].forEach(i => targetSteps[i] = true);
    } else if (targetInstrument === 'hihat') {
      for (let i = 0; i < 64; i += 2) targetSteps[i] = true;
    } else if (targetInstrument === 'bass') {
      [0, 8, 16, 24, 32, 40, 48, 56].forEach(i => targetSteps[i] = true);
    } else {
      [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60].forEach(i => targetSteps[i] = true);
    }

    const singleTrack: Track = {
      id: `t-single-${targetInstrument}-${timestamp}`,
      name: `${targetInstrument.toUpperCase()} (Single Seed Extract)`,
      instrument: targetInstrument,
      color: targetInstrument === 'kick' ? '#f59e0b' : targetInstrument === 'snare' || targetInstrument === 'bass' ? '#06b6d4' : targetInstrument === 'hihat' ? '#10b981' : '#a855f7',
      steps: targetSteps,
      mute: false,
      solo: false,
      volume: 0,
      pitch: targetInstrument === 'bass' || targetInstrument === 'kick' ? 'C1' : 'C3',
      parentSourceTrackId: sourceTrackId,
      sourceAsset: {
        id: `asset_${timestamp}_${targetInstrument}`,
        takeName: `${sourceTrack.name} (Single Extract)`,
        sampleRate: 48000,
        rhythmMatch: 0.99,
        onsets: targetSteps.filter(Boolean).length,
        parentSeedId: sourceTrackId,
        lineageParent: sourceTrack.name,
      }
    };

    const lineageEntry: AssetLineageRecord = {
      lineageId: `lin_single_${timestamp}`,
      commitTransactionId: `tx_single_${timestamp}`,
      assetId: `single_${timestamp}`,
      sourceAssetId: sourceTrackId,
      candidateId: `cand_single_${timestamp}`,
      operationType: 'SINGLE_INSTRUMENT_EXTRACTION',
      backend: 'SoulSonusPerformanceTransfer',
      modelVersion: 'ACE_DSP_v2',
      intentContractProfileId: 'profile_single_extraction',
      seedSignatureRecordId: `sig_single_${timestamp}`,
      timestamp,
    };
    setLineageRecords((prev) => [lineageEntry, ...prev]);

    updateTracksWithHistory((prev) => {
      const idx = prev.findIndex(t => t.id === sourceTrackId);
      if (idx === -1) return [...prev, singleTrack];
      const copy = [...prev];
      copy.splice(idx + 1, 0, singleTrack);
      return copy;
    });
  }, [tracks]);

  // Track Layering & Explosion
  const handleAddTrackLayer = useCallback((trackId: string, layerData: Partial<TrackLayer>) => {
    const timestamp = Date.now();
    const newLayer: TrackLayer = {
      id: `layer_${timestamp}`,
      name: layerData.name || `Layer ${timestamp.toString().slice(-4)}`,
      soundId: layerData.soundId || `snd_${timestamp}`,
      soundName: layerData.soundName || 'Sub Layer',
      volume: layerData.volume ?? 0,
      pan: layerData.pan ?? 0,
      mute: layerData.mute ?? false,
      solo: layerData.solo ?? false,
      character: layerData.character || 'Tight & Punchy',
      vaultLabel: layerData.vaultLabel || 'LEVEL 4 VAULT',
      originType: layerData.originType || 'MANUAL_SOUND_VAULT',
      seedType: layerData.seedType || 'LAYER_SEED',
      rootSeedId: 'root_seed_master',
      sourceAssetId: trackId,
      lineageId: `lin_layer_${timestamp}`,
      timbreParams: layerData.timbreParams || {
        attack: 5,
        decay: 180,
        tuning: 0,
        filterCutoff: 12000,
        saturation: 10,
      },
    };

    updateTracksWithHistory((prevTracks) =>
      prevTracks.map((tr) => {
        if (tr.id === trackId) {
          const currentLayers = tr.layers || [
            {
              id: `layer_orig_${tr.id}`,
              name: 'Layer A (Main Original)',
              soundId: `snd_orig_${tr.id}`,
              soundName: tr.name,
              volume: 0,
              pan: 0,
              mute: false,
              solo: false,
              character: 'Authoritative Core',
              vaultLabel: 'CORE SOUND',
              originType: 'ROOT_PERFORMANCE',
              seedType: 'ROOT_SEED',
              rootSeedId: 'root_seed_master',
            },
          ];
          return {
            ...tr,
            layers: [...currentLayers, newLayer],
          };
        }
        return tr;
      })
    );
  }, [updateTracksWithHistory]);

  const handleRemoveTrackLayer = useCallback((trackId: string, layerId: string) => {
    updateTracksWithHistory((prevTracks) =>
      prevTracks.map((tr) => {
        if (tr.id === trackId && tr.layers) {
          return {
            ...tr,
            layers: tr.layers.filter((l) => l.id !== layerId),
          };
        }
        return tr;
      })
    );
  }, [updateTracksWithHistory]);

  const handleUpdateTrackLayer = useCallback((trackId: string, layerId: string, updates: Partial<TrackLayer>) => {
    setTracks((prevTracks) =>
      prevTracks.map((tr) => {
        if (tr.id === trackId && tr.layers) {
          return {
            ...tr,
            layers: tr.layers.map((l) => (l.id === layerId ? { ...l, ...updates } : l)),
          };
        }
        return tr;
      })
    );
  }, []);

  const handleExplodeLayersToTracks = useCallback((trackId: string) => {
    const sourceTrack = tracks.find((t) => t.id === trackId);
    if (!sourceTrack || !sourceTrack.layers || sourceTrack.layers.length <= 1) return;

    const timestamp = Date.now();
    const explodedTracks: Track[] = sourceTrack.layers.map((layer, idx) => ({
      id: `t-exploded-${layer.id}-${timestamp}`,
      name: `${sourceTrack.name} — ${layer.name}`,
      instrument: sourceTrack.instrument,
      steps: [...sourceTrack.steps],
      notes: sourceTrack.notes ? [...sourceTrack.notes] : undefined,
      mute: layer.mute,
      solo: layer.solo,
      volume: sourceTrack.volume + layer.volume,
      pitch: sourceTrack.pitch,
      color: sourceTrack.color,
      parentSourceTrackId: sourceTrack.id,
      sourceAsset: {
        id: `asset_${layer.id}`,
        takeName: `${sourceTrack.name} (Exploded: ${layer.name})`,
        sampleRate: 48000,
        rhythmMatch: 1.0,
        onsets: sourceTrack.steps.filter(Boolean).length,
        parentSeedId: sourceTrack.id,
        lineageParent: sourceTrack.name,
      },
    }));

    updateTracksWithHistory((prevTracks) => {
      const idx = prevTracks.findIndex((t) => t.id === trackId);
      if (idx === -1) return [...prevTracks, ...explodedTracks];
      const copy = [...prevTracks];
      copy.splice(idx + 1, 0, ...explodedTracks);
      return copy;
    });
  }, [tracks, updateTracksWithHistory]);

  // Step 3: Lyric Sections & Vocal Selection Context State
  const [lyricSections, setLyricSections] = useState<Record<string, LyricSection>>(INITIAL_LYRIC_SECTIONS);
  const [vocalSelectionContext, setVocalSelectionContext] = useState<VocalSelectionContext>({
    trackId: 't-vocal',
    sectionId: 'sec_hook',
    phraseId: 'line_h1_1',
    barRange: { startBar: 13, endBar: 20 },
    takeId: 'take_v01',
    compId: 'comp_hook_main',
  });

  // Step 3: Lyric Actions
  const handleAddLyricLine = useCallback((sectionId: string, text: string) => {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const lineId = `line_${Date.now()}`;
    setLyricSections((prev) => {
      const sec = prev[sectionId] || {
        sectionId,
        sectionName: sectionId,
        lines: [],
        versions: [],
        activeVersionId: 'ver_1',
      };
      const newLine: LyricLine = {
        lineId,
        sectionId,
        bar: (sec.lines.length % 4) + 1,
        text: text.trim(),
        syllables: words.map((w) => w + '-'),
        cadenceEmphasis: words.map((_, i) => i % 2 === 0),
        cadenceRhythm: 'on_beat',
        status: 'draft',
      };
      return {
        ...prev,
        [sectionId]: {
          ...sec,
          lines: [...sec.lines, newLine],
        },
      };
    });
  }, []);

  const handleUpdateLyricLine = useCallback((sectionId: string, lineId: string, updates: Partial<LyricLine>) => {
    setLyricSections((prev) => {
      const sec = prev[sectionId];
      if (!sec) return prev;
      return {
        ...prev,
        [sectionId]: {
          ...sec,
          lines: sec.lines.map((l) => (l.lineId === lineId ? { ...l, ...updates } : l)),
        },
      };
    });
  }, []);

  const handleDeleteLyricLine = useCallback((sectionId: string, lineId: string) => {
    setLyricSections((prev) => {
      const sec = prev[sectionId];
      if (!sec) return prev;
      return {
        ...prev,
        [sectionId]: {
          ...sec,
          lines: sec.lines.filter((l) => l.lineId !== lineId),
        },
      };
    });
  }, []);

  const handleCreateLyricVersion = useCallback((sectionId: string, versionName: string, author: 'CREATOR' | 'CO_PRODUCER_PROPOSAL' = 'CREATOR') => {
    setLyricSections((prev) => {
      const sec = prev[sectionId];
      if (!sec) return prev;
      const newVersion: LyricVersion = {
        versionId: `ver_${Date.now()}`,
        versionName,
        timestamp: Date.now(),
        lines: [...sec.lines],
        author,
      };
      return {
        ...prev,
        [sectionId]: {
          ...sec,
          versions: [...sec.versions, newVersion],
          activeVersionId: newVersion.versionId,
        },
      };
    });
  }, []);

  const handleRestoreLyricVersion = useCallback((sectionId: string, versionId: string) => {
    setLyricSections((prev) => {
      const sec = prev[sectionId];
      if (!sec) return prev;
      const targetVersion = sec.versions.find((v) => v.versionId === versionId);
      if (!targetVersion) return prev;
      return {
        ...prev,
        [sectionId]: {
          ...sec,
          lines: [...targetVersion.lines],
          activeVersionId: versionId,
        },
      };
    });
  }, []);

  // Step 3: Vocal Takes & Recording Actions
  /**
   * Audio for takes that carry a real recording, kept beside the take records.
   *
   * A take's `sourceAudioId` is an object URL, which does not survive a reload —
   * the blob behind it does, so it is held here and written into the project
   * snapshot, then given a fresh URL when the project is reopened.
   */
  const takeAudioRef = useRef<Map<string, Blob>>(new Map());

  const handleAddVocalTake = useCallback((trackId: string, takeData: Partial<VocalTake> & { audioBlob?: Blob }) => {
    const timestamp = Date.now();
    const takeId = takeData.id || `take_${timestamp}`;
    // A supplied blob is the source of truth: the URL is made here so the take
    // record and the stored audio can never disagree about which is which.
    const audioUrl = takeData.audioBlob ? URL.createObjectURL(takeData.audioBlob) : undefined;
    if (takeData.audioBlob) takeAudioRef.current.set(takeId, takeData.audioBlob);

    const newTake: VocalTake = {
      id: takeId,
      takeId: takeData.takeId || takeId,
      trackId,
      takeNumber: (takeData.takeNumber || 1),
      name: takeData.name || `Take ${(takeData.takeNumber || 1)}`,
      sourceAudioId: audioUrl || takeData.sourceAudioId || `ast_vox_${timestamp}`,
      rawAudioAssetId: takeData.rawAudioAssetId || `raw_ast_vox_${timestamp}`,
      sectionId: takeData.sectionId || 'sec_hook',
      recordedAt: timestamp,
      timelineStart: takeData.timelineStart || 13,
      timelineEnd: takeData.timelineEnd || 20,
      duration: takeData.duration || 8.7,
      isActive: false,
      isScratchVocal: takeData.isScratchVocal || false,
      rating: takeData.rating || 4,
      waveformData: takeData.waveformData || [],
      inputSettings: takeData.inputSettings || {
        inputDeviceId: 'default_mic',
        sampleRate: 48000,
        bufferSize: 256,
        monitoringEnabled: true,
        measuredRoundTripLatencyMs: 12.4,
        latencyCompensationMs: 12.4,
        inputGain: 0,
        countInBars: 1,
        loopRecordingEnabled: true,
      },
    };

    updateTracksWithHistory((prevTracks) =>
      prevTracks.map((t) => {
        if (t.id === trackId) {
          const currentTakes = t.vocalTakes || [];
          return {
            ...t,
            vocalTakes: [...currentTakes, newTake],
          };
        }
        return t;
      })
    );
  }, [updateTracksWithHistory]);

  const handleSetActiveTake = useCallback((trackId: string, takeId: string) => {
    updateTracksWithHistory((prevTracks) =>
      prevTracks.map((t) => {
        if (t.id === trackId && t.vocalTakes) {
          return {
            ...t,
            vocalTakes: t.vocalTakes.map((tk) => ({
              ...tk,
              isActive: tk.id === takeId,
            })),
          };
        }
        return t;
      })
    );
  }, [updateTracksWithHistory]);

  const handleDeleteTake = useCallback((trackId: string, takeId: string) => {
    updateTracksWithHistory((prevTracks) =>
      prevTracks.map((t) => {
        if (t.id === trackId && t.vocalTakes) {
          return {
            ...t,
            vocalTakes: t.vocalTakes.filter((tk) => tk.id !== takeId),
          };
        }
        return t;
      })
    );
  }, [updateTracksWithHistory]);

  const handleUpdateTakeRating = useCallback((trackId: string, takeId: string, rating: number) => {
    setTracks((prevTracks) =>
      prevTracks.map((t) => {
        if (t.id === trackId && t.vocalTakes) {
          return {
            ...t,
            vocalTakes: t.vocalTakes.map((tk) => (tk.id === takeId ? { ...tk, rating } : tk)),
          };
        }
        return t;
      })
    );
  }, []);

  // Step 3: Comping Actions
  const handleUpdateCompSegment = useCallback((trackId: string, sectionId: string, bar: number, takeId: string) => {
    updateTracksWithHistory((prevTracks) =>
      prevTracks.map((t) => {
        if (t.id === trackId) {
          const comps = t.vocalComps || [];
          const activeComp = comps.find((c) => c.sectionId === sectionId && c.active) || {
            id: `comp_${sectionId}_${Date.now()}`,
            compId: `comp_${sectionId}_${Date.now()}`,
            trackId,
            sectionId,
            name: `Master Vocal Comp (${sectionId})`,
            segments: [
              { segmentId: 'seg_1', bar: 1, takeId, sourceStart: 0, sourceEnd: 2.18, timelineStart: 1, timelineEnd: 2, gainTrim: 0 },
              { segmentId: 'seg_2', bar: 2, takeId, sourceStart: 2.18, sourceEnd: 4.36, timelineStart: 2, timelineEnd: 3, gainTrim: 0 },
              { segmentId: 'seg_3', bar: 3, takeId, sourceStart: 4.36, sourceEnd: 6.54, timelineStart: 3, timelineEnd: 4, gainTrim: 0 },
              { segmentId: 'seg_4', bar: 4, takeId, sourceStart: 6.54, sourceEnd: 8.72, timelineStart: 4, timelineEnd: 5, gainTrim: 0 },
            ],
            active: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            sourceTakeIds: [takeId],
          };

          const updatedSegments = activeComp.segments.map((seg) =>
            seg.bar === bar ? { ...seg, takeId } : seg
          );

          const updatedComp: VocalComp = {
            ...activeComp,
            segments: updatedSegments,
            updatedAt: Date.now(),
            sourceTakeIds: Array.from(new Set(updatedSegments.map((s) => s.takeId))),
          };

          const otherComps = comps.filter((c) => c.id !== activeComp.id);
          return {
            ...t,
            vocalComps: [...otherComps, updatedComp],
            activeCompId: updatedComp.id,
          };
        }
        return t;
      })
    );
  }, [updateTracksWithHistory]);

  const handleApplyCompProposal = useCallback((trackId: string, sectionId: string, compProposal: VocalComp) => {
    updateTracksWithHistory((prevTracks) =>
      prevTracks.map((t) => {
        if (t.id === trackId) {
          const comps = t.vocalComps || [];
          const otherComps = comps.filter((c) => c.id !== compProposal.id);
          return {
            ...t,
            vocalComps: [...otherComps, { ...compProposal, active: true }],
            activeCompId: compProposal.id,
          };
        }
        return t;
      })
    );
  }, [updateTracksWithHistory]);

  // Step 3: Pitch, Timing, Harmony & Voice Identity Actions
  const handleUpdatePitchSettings = useCallback((trackId: string, updates: Partial<PitchCorrectionSettings>) => {
    updateTracksWithHistory((prevTracks) =>
      prevTracks.map((t) => {
        if (t.id === trackId) {
          const prevVocalState = t.vocalState;
          const prevPitch = prevVocalState?.pitchSettings || {
            enabled: true,
            key: 'C',
            scale: 'minor',
            strength: 85,
            speed: 65,
            pitchDrift: 15,
            formantPreserve: true,
            formantShift: 0,
            bypass: false,
          };
          return {
            ...t,
            vocalState: {
              ...(prevVocalState || {
                isRecording: false,
                audioBlob: null,
                audioBuffer: null,
                waveformData: [],
                duration: 8.7,
                volume: 0,
                mute: false,
                solo: false,
                delaySend: 0.1,
                reverbSend: 0.2,
                takes: [],
                comps: [],
                pitchSettings: prevPitch,
                timingSettings: { enabled: true, quantizeStrength: 80, humanize: 20, phraseNudgeMs: 0, stretchRatio: 1.0 },
              }),
              pitchSettings: { ...prevPitch, ...updates },
            },
          };
        }
        return t;
      })
    );
  }, [updateTracksWithHistory]);

  const handleUpdateTimingSettings = useCallback((trackId: string, updates: Partial<TimingCorrectionSettings>) => {
    updateTracksWithHistory((prevTracks) =>
      prevTracks.map((t) => {
        if (t.id === trackId) {
          const prevVocalState = t.vocalState;
          const prevTiming = prevVocalState?.timingSettings || {
            enabled: true,
            quantizeStrength: 80,
            humanize: 20,
            phraseNudgeMs: 0,
            stretchRatio: 1.0,
          };
          return {
            ...t,
            vocalState: {
              ...(prevVocalState || {
                isRecording: false,
                audioBlob: null,
                audioBuffer: null,
                waveformData: [],
                duration: 8.7,
                volume: 0,
                mute: false,
                solo: false,
                delaySend: 0.1,
                reverbSend: 0.2,
                takes: [],
                comps: [],
                pitchSettings: { enabled: true, key: 'C', scale: 'minor', strength: 85, speed: 65, pitchDrift: 15, formantPreserve: true, formantShift: 0, bypass: false },
                timingSettings: prevTiming,
              }),
              timingSettings: { ...prevTiming, ...updates },
            },
          };
        }
        return t;
      })
    );
  }, [updateTracksWithHistory]);

  const handleUpdateHarmonySettings = useCallback((trackId: string, updates: Partial<HarmonySettings>) => {
    updateTracksWithHistory((prevTracks) =>
      prevTracks.map((t) => {
        if (t.id === trackId) {
          const prevVocalState = t.vocalState;
          const prevHarmony = prevVocalState?.harmonySettings || {
            enabled: true,
            mode: 'third_above',
            humanizeCents: 15,
            stereoSpread: 75,
            vocalRole: 'HARMONY_HIGH',
          };
          return {
            ...t,
            vocalState: {
              ...(prevVocalState || {
                isRecording: false,
                audioBlob: null,
                audioBuffer: null,
                waveformData: [],
                duration: 8.7,
                volume: 0,
                mute: false,
                solo: false,
                delaySend: 0.1,
                reverbSend: 0.2,
                takes: [],
                comps: [],
                pitchSettings: { enabled: true, key: 'C', scale: 'minor', strength: 85, speed: 65, pitchDrift: 15, formantPreserve: true, formantShift: 0, bypass: false },
                timingSettings: { enabled: true, quantizeStrength: 80, humanize: 20, phraseNudgeMs: 0, stretchRatio: 1.0 },
              }),
              harmonySettings: { ...prevHarmony, ...updates },
            },
          };
        }
        return t;
      })
    );
  }, [updateTracksWithHistory]);

  const handleUpdateVoiceIdentitySettings = useCallback((trackId: string, updates: Partial<VoiceIdentitySettings>) => {
    updateTracksWithHistory((prevTracks) =>
      prevTracks.map((t) => {
        if (t.id === trackId) {
          const prevVocalState = t.vocalState;
          const prevVoice = prevVocalState?.voiceIdentitySettings || {
            profileId: 'prof_creator_01',
            profileName: 'SoulSonus Creator Signature Voice',
            rightsVerified: true,
            consentProofId: 'proof_auth_01',
            licenseStatus: 'APPROVED',
            timbreBlend: 100,
            formantShift: 0,
            breathiness: 25,
          };
          return {
            ...t,
            vocalState: {
              ...(prevVocalState || {
                isRecording: false,
                audioBlob: null,
                audioBuffer: null,
                waveformData: [],
                duration: 8.7,
                volume: 0,
                mute: false,
                solo: false,
                delaySend: 0.1,
                reverbSend: 0.2,
                takes: [],
                comps: [],
                pitchSettings: { enabled: true, key: 'C', scale: 'minor', strength: 85, speed: 65, pitchDrift: 15, formantPreserve: true, formantShift: 0, bypass: false },
                timingSettings: { enabled: true, quantizeStrength: 80, humanize: 20, phraseNudgeMs: 0, stretchRatio: 1.0 },
              }),
              voiceIdentitySettings: { ...prevVoice, ...updates },
            },
          };
        }
        return t;
      })
    );
  }, [updateTracksWithHistory]);

  const handleSetPunchRegion = useCallback((trackId: string, punchRegion: PunchRegion) => {
    setTracks((prevTracks) =>
      prevTracks.map((t) => {
        if (t.id === trackId && t.vocalState) {
          return {
            ...t,
            vocalState: {
              ...t.vocalState,
              punchRegion,
            },
          };
        }
        return t;
      })
    );
  }, []);

  // Step 4 MIX States & Handlers
  const [buses, setBuses] = useState<MixBusChannel[]>(INITIAL_GROUP_BUSES);
  const [mixSnapshots, setMixSnapshots] = useState<MixSnapshot[]>([
    {
      snapshotId: 'snap_initial',
      name: 'Mix A (Punchy Drum Forward)',
      trackStripStates: {},
      busStates: {},
      masterVolume: 0,
      reverbLevel: 0.15,
      delayLevel: 0.1,
      automationRefs: [],
      createdAt: Date.now(),
      sourceProjectVersionId: 'v1.0.0',
    },
  ]);
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | null>('snap_initial');
  const [referenceTrack, setReferenceTrack] = useState<ReferenceTrackConfig | null>({
    id: 'ref_01',
    name: 'Commercial Top-40 Reference (Urban / Hip-Hop)',
    durationSec: 194,
    integratedLufs: -13.8,
    peakDbfs: -0.2,
    stereoWidthScore: 82,
    lowEndEnergyDb: -4.5,
    vocalPresenceDb: 2.1,
    dynamicRangeDb: 8.4,
    autoLevelMatch: true,
    gainTrimDb: -0.8,
    isActiveAudition: false,
  });

  const [focusedMixTrackId, setFocusedMixTrackId] = useState<string | null>(null);

  const [monitoringMode, setMonitoringMode] = useState<{
    soloTrackIds: string[];
    muteTrackIds: string[];
    isDimmed: boolean;
    isBypassed: boolean;
    abMode: 'MIX' | 'REF' | 'B';
  }>({
    soloTrackIds: [],
    muteTrackIds: [],
    isDimmed: false,
    isBypassed: false,
    abMode: 'MIX',
  });

  const handleSetFocusedTrackId = useCallback((trackId: string | null) => {
    setFocusedMixTrackId(trackId);
    if (trackId) {
      setSelectionContext((prev) => ({ ...prev, selectedTrackId: trackId }));
    }
  }, []);

  const handleToggleMixSolo = useCallback((trackId: string) => {
    setMonitoringMode((prev) => {
      const isSoloed = prev.soloTrackIds.includes(trackId);
      const nextSolos = isSoloed ? prev.soloTrackIds.filter((id) => id !== trackId) : [...prev.soloTrackIds, trackId];
      setTracks((prevTracks) =>
        prevTracks.map((t) => (t.id === trackId ? { ...t, solo: !isSoloed } : t))
      );
      return { ...prev, soloTrackIds: nextSolos };
    });
  }, []);

  const handleToggleMixMute = useCallback((trackId: string) => {
    setMonitoringMode((prev) => {
      const isMuted = prev.muteTrackIds.includes(trackId);
      const nextMutes = isMuted ? prev.muteTrackIds.filter((id) => id !== trackId) : [...prev.muteTrackIds, trackId];
      setTracks((prevTracks) =>
        prevTracks.map((t) => (t.id === trackId ? { ...t, mute: !isMuted } : t))
      );
      return { ...prev, muteTrackIds: nextMutes };
    });
  }, []);

  const handleToggleMixDim = useCallback(() => {
    setMonitoringMode((prev) => ({ ...prev, isDimmed: !prev.isDimmed }));
  }, []);

  const handleToggleMixBypass = useCallback(() => {
    setMonitoringMode((prev) => ({ ...prev, isBypassed: !prev.isBypassed }));
  }, []);

  const handleToggleReferenceAB = useCallback(() => {
    setMonitoringMode((prev) => {
      const nextMode = prev.abMode === 'MIX' ? 'REF' : 'MIX';
      setReferenceTrack((ref) => (ref ? { ...ref, isActiveAudition: nextMode === 'REF' } : null));
      return { ...prev, abMode: nextMode };
    });
  }, []);

  const handleUpdateChannelStrip = useCallback((trackId: string, updates: Partial<TrackDspSettings>) => {
    const track = tracksRef.current.find((t) => t.id === trackId);
    if (!track) return;

    const merged: TrackDspSettings = { ...defaultTrackDsp(track), ...(track.dspSettings || {}), ...updates };

    // Push to the audio graph here rather than inside the state updater —
    // StrictMode invokes updaters twice, and an updater is no place for a side
    // effect. Every writer of channel-strip state now reaches real nodes; the
    // EQ bands used to be written and never read.
    audioEngine.applyTrackDsp(trackId, merged, track.instrument);

    setTracks((prevTracks) =>
      prevTracks.map((t) =>
        t.id === trackId
          ? {
              ...t,
              volume: updates.volume !== undefined ? updates.volume : t.volume,
              dspSettings: merged,
            }
          : t
      )
    );
  }, []);

  const handleUpdateBusChannel = useCallback((busId: string, updates: Partial<MixBusChannel>) => {
    setBuses((prevBuses) =>
      prevBuses.map((b) => (b.id === busId ? { ...b, ...updates } : b))
    );
  }, []);

  const handleToggleInsertBypass = useCallback((trackId: string, slotId: string) => {
    if (trackId.startsWith('bus_')) {
      setBuses((prevBuses) =>
        prevBuses.map((b) =>
          b.id === trackId
            ? {
                ...b,
                inserts: b.inserts.map((ins) =>
                  ins.slotId === slotId ? { ...ins, bypassed: !ins.bypassed } : ins
                ),
              }
            : b
        )
      );
    }
  }, []);

  const handleReorderTrackInserts = useCallback((trackId: string, sourceIdx: number, targetIdx: number) => {
    if (trackId.startsWith('bus_')) {
      setBuses((prevBuses) =>
        prevBuses.map((b) => {
          if (b.id === trackId) {
            const copy = [...b.inserts];
            const [moved] = copy.splice(sourceIdx, 1);
            copy.splice(targetIdx, 0, moved);
            return { ...b, inserts: copy.map((ins, i) => ({ ...ins, orderIndex: i })) };
          }
          return b;
        })
      );
    }
  }, []);

  const handleAddInsertSlot = useCallback((trackId: string, pluginName: string, category: InsertPluginCategory) => {
    const newSlot: InsertSlot = {
      slotId: `ins_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      pluginId: `plug_${pluginName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      pluginName,
      category,
      bypassed: false,
      orderIndex: 99,
      parameters: {},
    };

    if (trackId.startsWith('bus_')) {
      setBuses((prevBuses) =>
        prevBuses.map((b) =>
          b.id === trackId
            ? { ...b, inserts: [...b.inserts, { ...newSlot, orderIndex: b.inserts.length }] }
            : b
        )
      );
    }
  }, []);

  const handleRemoveInsertSlot = useCallback((trackId: string, slotId: string) => {
    if (trackId.startsWith('bus_')) {
      setBuses((prevBuses) =>
        prevBuses.map((b) =>
          b.id === trackId
            ? { ...b, inserts: b.inserts.filter((ins) => ins.slotId !== slotId) }
            : b
        )
      );
    }
  }, []);

  const handleSaveMixSnapshot = useCallback((name: string) => {
    const trackStripStates: Record<string, Partial<TrackDspSettings>> = {};
    tracks.forEach((t) => {
      if (t.dspSettings) trackStripStates[t.id] = { ...t.dspSettings };
    });

    const busStates: Record<string, Partial<MixBusChannel>> = {};
    buses.forEach((b) => {
      busStates[b.id] = { volume: b.volume, pan: b.pan, mute: b.mute, solo: b.solo };
    });

    const newSnapshot: MixSnapshot = {
      snapshotId: `snap_${Date.now()}`,
      name,
      trackStripStates,
      busStates,
      masterVolume: dawState.masterVolume,
      reverbLevel: dawState.reverbLevel,
      delayLevel: dawState.delayLevel,
      automationRefs: [],
      createdAt: Date.now(),
      sourceProjectVersionId: 'v1.0.0',
    };

    setMixSnapshots((prev) => [...prev, newSnapshot]);
    setActiveSnapshotId(newSnapshot.snapshotId);
  }, [tracks, buses, dawState]);

  const handleRestoreMixSnapshot = useCallback((snapshotId: string) => {
    const snap = mixSnapshots.find((s) => s.snapshotId === snapshotId);
    if (!snap) return;

    setActiveSnapshotId(snapshotId);

    setTracks((prevTracks) =>
      prevTracks.map((t) => {
        if (snap.trackStripStates[t.id]) {
          return {
            ...t,
            volume: snap.trackStripStates[t.id].volume !== undefined ? snap.trackStripStates[t.id].volume! : t.volume,
            dspSettings: {
              ...(t.dspSettings || {
                lowGain: 0,
                midGain: 0,
                highGain: 0,
                compressorThreshold: -18,
                compressorRatio: 3,
                reverbSend: 0.15,
                delaySend: 0.1,
                pan: 0,
                volume: 0,
              }),
              ...snap.trackStripStates[t.id],
            },
          };
        }
        return t;
      })
    );

    setBuses((prevBuses) =>
      prevBuses.map((b) => {
        if (snap.busStates[b.id]) {
          return { ...b, ...snap.busStates[b.id] };
        }
        return b;
      })
    );
  }, [mixSnapshots]);

  const handleSetReferenceTrack = useCallback((config: ReferenceTrackConfig | null) => {
    setReferenceTrack(config);
  }, []);

  const handleCommitMixProposal = useCallback((proposal: MixProposal) => {
    updateTracksWithHistory((prevTracks) =>
      prevTracks.map((t) => {
        if (proposal.proposedDspChanges[t.id]) {
          const currentDsp = t.dspSettings || {
            lowGain: 0,
            midGain: 0,
            highGain: 0,
            compressorThreshold: -18,
            compressorRatio: 3,
            reverbSend: 0.15,
            delaySend: 0.1,
            pan: 0,
            volume: 0,
          };
          return {
            ...t,
            dspSettings: {
              ...currentDsp,
              ...proposal.proposedDspChanges[t.id],
            },
          };
        }
        return t;
      })
    );
  }, [updateTracksWithHistory]);

  const handleExecuteClipOperation = useCallback((trackId: string, op: ClipOperationType, params?: any) => {
    updateTracksWithHistory((prevTracks) =>
      prevTracks.map((t) => {
        if (t.id === trackId) {
          if (op === 'split' || op === 'trim_start' || op === 'trim_end' || op === 'reverse') {
            const stepsCopy = [...t.steps];
            if (op === 'reverse') stepsCopy.reverse();
            return { ...t, steps: stepsCopy };
          } else if (op === 'gain' && params?.gainDelta) {
            return { ...t, volume: Math.max(-40, Math.min(6, (t.volume || 0) + params.gainDelta)) };
          }
        }
        return t;
      })
    );
  }, [updateTracksWithHistory]);

  // Step 5 FINISH Mastering, Provenance & Delivery State
  const [acceptedMixPrint, setAcceptedMixPrint] = useState<AcceptedMixPrint>({
    mixPrintId: 'mix_print_v1_0_0',
    sourceProjectVersionId: 'v1.0.0',
    stereoAssetId: 'ast_stereo_mix_01',
    stemManifestId: 'manifest_stems_v1',
    sampleRate: 48000,
    bitDepth: 24,
    createdAt: Date.now() - 3600000,
    mixStateHash: '0xhash_mix_v1_0_0',
    staleWarning: false,
  });

  const [masteringChain, setMasteringChain] = useState<MasteringDspChain>(INITIAL_MASTERING_DSP_CHAIN);
  const masteringChainRef = useRef(masteringChain);
  // Keep the live master bus and the offline bounce reading the same chain.
  useEffect(() => {
    masteringChainRef.current = masteringChain;
    audioEngine.applyMasteringChain(masteringChain);
  }, [masteringChain]);

  const [masterCandidates, setMasterCandidates] = useState<MasterCandidate[]>([
    {
      candidateId: 'cand_master_a',
      name: 'Master Candidate A (Streaming Balanced -14 LUFS)',
      sourceMixPrintId: 'mix_print_v1_0_0',
      dspChain: INITIAL_MASTERING_DSP_CHAIN,
      measuredLufs: -14.1,
      measuredDbtp: -1.0,
      measuredCrestFactor: 9.2,
      stereoWidthScore: 88,
      phaseCorrelation: 0.91,
      createdAt: Date.now() - 1800000,
      isCommittedMaster: true,
    },
    {
      candidateId: 'cand_master_b',
      name: 'Master Candidate B (Warm Analog Master -13 LUFS)',
      sourceMixPrintId: 'mix_print_v1_0_0',
      dspChain: {
        ...INITIAL_MASTERING_DSP_CHAIN,
        id: 'chain_warm_analog',
        name: 'Warm Analog Master (-13.0 LUFS)',
        targetLufs: -13.0,
        targetDbtp: -0.8,
      },
      measuredLufs: -13.0,
      measuredDbtp: -0.8,
      measuredCrestFactor: 8.4,
      stereoWidthScore: 92,
      phaseCorrelation: 0.89,
      createdAt: Date.now() - 900000,
      isCommittedMaster: false,
    },
    {
      candidateId: 'cand_master_c',
      name: 'Master Candidate C (Modern Club Punch -9 LUFS)',
      sourceMixPrintId: 'mix_print_v1_0_0',
      dspChain: {
        ...INITIAL_MASTERING_DSP_CHAIN,
        id: 'chain_club_loud',
        name: 'Modern Club Punch (-9.0 LUFS)',
        targetLufs: -9.0,
        targetDbtp: -0.3,
      },
      measuredLufs: -9.2,
      measuredDbtp: -0.3,
      measuredCrestFactor: 6.8,
      stereoWidthScore: 84,
      phaseCorrelation: 0.86,
      createdAt: Date.now() - 300000,
      isCommittedMaster: false,
    },
  ]);

  const [activeMasterCandidateId, setActiveMasterCandidateId] = useState<string>('cand_master_a');
  const activeMasterCandidateIdRef = useRef(activeMasterCandidateId);
  useEffect(() => {
    activeMasterCandidateIdRef.current = activeMasterCandidateId;
  }, [activeMasterCandidateId]);

  const [finalizationGate, setFinalizationGate] = useState<FinalizationGateStatus>({
    audioChecksPassed: true,
    noClippingViolation: true,
    lineageChecksPassed: true,
    rootSeedPresent: true,
    resourcesAdmissionPassed: true,
    rightsAndSplitsPassed: true,
    provenanceHashVerified: true,
    isReadyToSign: true,
    blockingReasons: [],
  });

  const [isBouncing, setIsBouncing] = useState(false);
  const [masterMeasurement, setMasterMeasurement] = useState<LoudnessTelemetryReport | null>(null);

  // --- Session-level editor state ---------------------------------------
  // These live here rather than in a workspace component because a room switch
  // unmounts the workspace, and losing them on a room switch is either a
  // silent reset (preferences) or silent data loss (the write-room draft).
  const [editorPrefs, setEditorPrefs] = useState<EditorPreferences>({
    universalTool: 'POINTER',
    universalSnapTicks: TICKS_PER_16TH,
    universalSnapToScale: true,
    showVelocityLane: false,
    activeBarView: 'all',
    seedTargetMode: 'NEW_TRACK',
  });
  const updateEditorPrefs = useCallback(
    (updates: Partial<EditorPreferences>) => setEditorPrefs((prev) => ({ ...prev, ...updates })),
    []
  );

  const [writeRoomDraft, setWriteRoomDraft] = useState<WriteRoomDraft>({
    lyrics:
      '[Chorus — Hook]\nBounce on the beatbox, beat on the grid,\n' +
      'SoulSonus catch every rhythm I did.\nLow kick thump when the baseline slide,\n' +
      'SoulFlow lock it when the voices align.\n\n[Verse]\nHumming the melody, baseline groove,\n' +
      'Tap on the table, watch the playhead move...',
    cadence: '4/4 Syncopated Southern Soul / Trap Cadence at 110 BPM',
    takes: [
      { id: 'take_1', name: 'Lead Vocal — Main Take', type: 'lead', muted: false, volume: 0 },
      { id: 'take_2', name: 'Harmony 1 — High Third', type: 'harmony', muted: false, volume: -3 },
      { id: 'take_3', name: 'Harmony 2 — Low Fifth', type: 'harmony', muted: true, volume: -4 },
      { id: 'take_4', name: 'Ad-Libs & Accents', type: 'adlib', muted: false, volume: -2 },
    ],
  });
  const updateWriteRoomDraft = useCallback(
    (updates: Partial<WriteRoomDraft>) => setWriteRoomDraft((prev) => ({ ...prev, ...updates })),
    []
  );

  // --- Project persistence ----------------------------------------------
  const [isHydrating, setIsHydrating] = useState(true);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);

  /**
   * Builds the snapshot. Only creative work goes in: transient UI — which
   * drawer is open, what is selected, whether the transport is rolling — is
   * deliberately left out, so reopening a project does not also restore a
   * half-finished interaction.
   */
  const buildSnapshot = useCallback(
    (id: string, name: string): ProjectSnapshot => ({
      schemaVersion: SCHEMA_VERSION,
      id,
      name,
      savedAt: Date.now(),
      dawState: {
        bpm: dawState.bpm,
        swing: dawState.swing,
        masterVolume: dawState.masterVolume,
        reverbLevel: dawState.reverbLevel,
        delayLevel: dawState.delayLevel,
        metronomeOn: dawState.metronomeOn,
        isLooping: dawState.isLooping,
        activeBarView: dawState.activeBarView,
        soulFlowState: dawState.soulFlowState,
        projectName: dawState.projectName,
        projectVersion: dawState.projectVersion,
      },
      tracks,
      sections,
      lyricSections,
      masteringChain,
      masterCandidates,
      activeMasterCandidateId,
      buses,
      mixSnapshots,
      referenceTrack,
      acceptedMixPrint,
      seedRecords,
      lineageRecords,
      decisionRecords,
      detectionSettings,
      activeWorkspace,
      editorPrefs,
      writeRoomDraft,
      // The decoded AudioBuffer cannot be stored; the encoded blob it came
      // from can, and the buffer is rebuilt from it on load.
      vocalTake: vocalState.audioBlob
        ? {
            blob: vocalState.audioBlob,
            duration: vocalState.duration,
            waveformData: vocalState.waveformData || [],
          }
        : null,
      // Every take that carries a recording, so the pool is not empty of audio
      // after a reload. Only takes still present on a track are written.
      takeAudio: tracks.flatMap((t) =>
        (t.vocalTakes || [])
          .map((take) => {
            const blob = takeAudioRef.current.get(take.id);
            return blob ? { takeId: take.id, blob } : null;
          })
          .filter((entry): entry is { takeId: string; blob: Blob } => entry !== null)
      ),
    }),
    [
      dawState, tracks, sections, lyricSections, masteringChain, masterCandidates,
      activeMasterCandidateId, buses, mixSnapshots, referenceTrack, acceptedMixPrint,
      seedRecords, lineageRecords, decisionRecords, detectionSettings, activeWorkspace,
      editorPrefs, writeRoomDraft,
      vocalState.audioBlob, vocalState.duration, vocalState.waveformData,
    ]
  );

  const applySnapshot = useCallback(async (snap: ProjectSnapshot) => {
    // Object URLs from the session that saved this project are long gone; the
    // blobs are not, so each take gets a fresh URL pointing at its own audio.
    const restoredAudio = new Map<string, Blob>();
    const restoredUrls = new Map<string, string>();
    for (const entry of (snap.takeAudio || []) as { takeId: string; blob: Blob }[]) {
      if (!entry?.blob) continue;
      restoredAudio.set(entry.takeId, entry.blob);
      restoredUrls.set(entry.takeId, URL.createObjectURL(entry.blob));
    }
    takeAudioRef.current = restoredAudio;

    const restoredTracks = (snap.tracks as Track[]).map((t) =>
      t.vocalTakes?.length
        ? {
            ...t,
            vocalTakes: t.vocalTakes.map((take) =>
              restoredUrls.has(take.id) ? { ...take, sourceAudioId: restoredUrls.get(take.id) as string } : take
            ),
          }
        : t
    );

    setTracks(restoredTracks);
    setSections(snap.sections as ArrangementSection[]);
    setLyricSections(snap.lyricSections as Record<string, LyricSection>);
    setMasteringChain(snap.masteringChain as MasteringDspChain);
    setMasterCandidates(snap.masterCandidates as MasterCandidate[]);
    setActiveMasterCandidateId(snap.activeMasterCandidateId);
    setBuses(snap.buses as MixBusChannel[]);
    setMixSnapshots(snap.mixSnapshots as MixSnapshot[]);
    setReferenceTrack(snap.referenceTrack as ReferenceTrackConfig | null);
    setAcceptedMixPrint(snap.acceptedMixPrint as AcceptedMixPrint);
    setSeedRecords(snap.seedRecords as SeedSignatureRecord[]);
    setLineageRecords(snap.lineageRecords as AssetLineageRecord[]);
    setDecisionRecords(snap.decisionRecords as GenerationDecisionRecord[]);
    setDetectionSettings((prev) => ({ ...prev, ...(snap.detectionSettings as object), enabled: false, micConnected: false }));
    setActiveWorkspace(snap.activeWorkspace as WorkspaceTab);
    // Older snapshots predate these, so fall back rather than clobber defaults.
    if (snap.editorPrefs) setEditorPrefs((prev) => ({ ...prev, ...(snap.editorPrefs as object) }));
    if (snap.writeRoomDraft) setWriteRoomDraft((prev) => ({ ...prev, ...(snap.writeRoomDraft as object) }));
    setDawState((prev) => ({
      ...prev,
      ...(snap.dawState as object),
      // Never restore transport state — a reopened project starts stopped.
      isPlaying: false,
      isRecordingMic: false,
      currentStep: 0,
    }));

    if (snap.vocalTake) {
      try {
        const ctx = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const decoded = await ctx.decodeAudioData(await snap.vocalTake.blob.arrayBuffer());
        if (ctx.state !== 'closed') ctx.close();
        setVocalState((prev) => ({
          ...prev,
          audioBlob: snap.vocalTake!.blob,
          audioBuffer: decoded,
          duration: snap.vocalTake!.duration,
          waveformData: snap.vocalTake!.waveformData,
          isRecording: false,
        }));
        audioEngine.setVocalBuffer(decoded);
      } catch {
        // A take that will not decode is reported, not silently dropped.
        setPersistenceError('The saved vocal take could not be decoded and was not restored.');
      }
    }
  }, []);

  // Restore the last session on startup.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await loadProject(AUTOSAVE_ID);
        if (!cancelled && snap) {
          await applySnapshot(snap);
          setLastSavedAt(snap.savedAt);
        }
      } catch (err) {
        if (!cancelled) setPersistenceError(err instanceof Error ? err.message : 'Could not restore the last session.');
      } finally {
        if (!cancelled) setIsHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applySnapshot]);

  // Rolling autosave. Debounced so a drag does not write on every frame.
  const snapshotRef = useRef(buildSnapshot);
  snapshotRef.current = buildSnapshot;
  useEffect(() => {
    if (isHydrating) return;
    const timer = setTimeout(() => {
      const snap = snapshotRef.current(AUTOSAVE_ID, dawState.projectName || 'Untitled Session');
      saveProject(snap)
        .then(() => {
          setLastSavedAt(snap.savedAt);
          setPersistenceError(null);
        })
        .catch((err) => setPersistenceError(err instanceof Error ? err.message : 'Autosave failed.'));
    }, 1200);
    return () => clearTimeout(timer);
  }, [
    isHydrating, tracks, sections, lyricSections, masteringChain, masterCandidates,
    activeMasterCandidateId, buses, mixSnapshots, referenceTrack, acceptedMixPrint,
    seedRecords, lineageRecords, decisionRecords, detectionSettings, activeWorkspace,
    editorPrefs, writeRoomDraft, dawState, vocalState.audioBlob,
  ]);

  const handleSaveProjectAs = useCallback(
    async (name: string): Promise<ProjectSummary | null> => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const snap = buildSnapshot(id, trimmed);
      try {
        await saveProject(snap);
        setDawState((prev) => ({ ...prev, projectName: trimmed }));
        setLastSavedAt(snap.savedAt);
        setPersistenceError(null);
        return {
          id,
          name: trimmed,
          savedAt: snap.savedAt,
          trackCount: tracks.length,
          noteCount: tracks.reduce((a, t) => a + (t.noteEvents?.length ?? 0), 0),
        };
      } catch (err) {
        setPersistenceError(err instanceof Error ? err.message : 'Could not save the project.');
        return null;
      }
    },
    [buildSnapshot, tracks]
  );

  const handleOpenProject = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const snap = await loadProject(id);
        if (!snap) {
          setPersistenceError('That project could not be found.');
          return false;
        }
        audioEngine.stopSequencer();
        await applySnapshot(snap);
        setPersistenceError(null);
        return true;
      } catch (err) {
        setPersistenceError(err instanceof Error ? err.message : 'Could not open the project.');
        return false;
      }
    },
    [applySnapshot]
  );

  const handleListProjects = useCallback(() => listProjects(), []);
  const handleDeleteProject = useCallback(async (id: string) => {
    await deleteProject(id);
  }, []);

  const handleNewProject = useCallback(() => {
    audioEngine.stopSequencer();
    setTracks(PRESETS[0].tracks.map((t) => ({ ...t, noteEvents: [], steps: new Array(64).fill(false) })));
    setSeedRecords([]);
    setLineageRecords([]);
    setDecisionRecords([]);
    setMixSnapshots([]);
    setVocalState((prev) => ({ ...prev, audioBlob: null, audioBuffer: null, waveformData: [], duration: 0 }));
    audioEngine.setVocalBuffer(null);
    setDawState((prev) => ({
      ...prev,
      projectName: 'Untitled Session',
      isPlaying: false,
      currentStep: 0,
      soulFlowState: 'CAPTURED',
    }));
  }, []);


  /** Renders the project through the mastering chain once, for measuring or encoding. */
  const bounce = useCallback(async () => {
    const result = await renderMasterBounce({
      tracks: tracksRef.current,
      bpm: bpmRef.current || 110,
      chain: masteringChainRef.current,
    });
    const left = result.buffer.getChannelData(0);
    const right = result.buffer.numberOfChannels > 1 ? result.buffer.getChannelData(1) : left;
    const measurement = masteringTelemetryEngine.measureLoudness(left, right, result.sampleRate);
    return { result, measurement };
  }, []);

  const [maskingReport, setMaskingReport] = useState<MaskingReport | null>(null);
  const [isAnalyzingMasking, setIsAnalyzingMasking] = useState(false);

  const handleAnalyzeMasking = useCallback(async (): Promise<MaskingReport> => {
    setIsAnalyzingMasking(true);
    try {
      const report = await analyzeMasking(tracksRef.current, bpmRef.current || 110, masteringChainRef.current);
      setMaskingReport(report);
      return report;
    } finally {
      setIsAnalyzingMasking(false);
    }
  }, []);

  const handleAnalyzeMaster = useCallback(async (): Promise<LoudnessTelemetryReport | null> => {
    setIsBouncing(true);
    try {
      const { result, measurement } = await bounce();
      setMasterMeasurement(measurement);
      // The candidate now carries what was measured, not a literal.
      setMasterCandidates((prev) =>
        prev.map((c) =>
          c.candidateId === activeMasterCandidateIdRef.current
            ? {
                ...c,
                measuredLufs: measurement.integratedLufs,
                measuredDbtp: measurement.truePeakDbtp,
                measuredCrestFactor: measurement.crestFactorDb,
              }
            : c
        )
      );
      if (result.eventsRendered === 0) {
        // An empty project measures as silence; say so rather than showing a number.
        return measurement;
      }
      return measurement;
    } finally {
      setIsBouncing(false);
    }
  }, [bounce]);

  const handleBounceMaster = useCallback(
    async (format: MasterBounceFormat): Promise<MasterBounceResult> => {
      setIsBouncing(true);
      try {
        const { result, measurement } = await bounce();
        if (result.eventsRendered === 0) {
          return {
            ok: false,
            message: 'Nothing to export — the project rendered silent. Add or unmute a track first.',
          };
        }
        setMasterMeasurement(measurement);

        const base = (dawStateRef.current.projectName || 'soulsonus-master')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');

        const bounceLeft = result.buffer.getChannelData(0);
        const bounceRight = result.buffer.numberOfChannels > 1 ? result.buffer.getChannelData(1) : null;

        const encoded =
          format === 'FLAC'
            ? audioEncoders.encodeFlac(bounceLeft, bounceRight, result.sampleRate)
            : format === 'WAV_16'
              ? audioEncoders.encode16BitWav(bounceLeft, bounceRight, result.sampleRate)
              : audioEncoders.encode24BitWav(bounceLeft, bounceRight, result.sampleRate);

        const extension = format === 'FLAC' ? 'flac' : 'wav';
        const suffix = format === 'WAV_16' ? '_16bit' : format === 'WAV_24' ? '_24bit' : '';

        return {
          ok: true,
          message: `Bounced ${result.durationSeconds.toFixed(1)}s at ${measurement.integratedLufs} LUFS / ${measurement.truePeakDbtp} dBTP.`,
          fileName: `${base}${suffix}.${extension}`,
          url: encoded.dataUrl,
          sizeBytes: encoded.byteLength,
          measurement,
        };
      } catch (err) {
        return { ok: false, message: err instanceof Error ? err.message : 'Bounce failed.' };
      } finally {
        setIsBouncing(false);
      }
    },
    [bounce]
  );

  const handleUpdateMasteringProcessor = useCallback((slotId: string, params: Record<string, any>) => {
    setMasteringChain((prev) => ({
      ...prev,
      slots: prev.slots.map((slot) =>
        slot.id === slotId ? { ...slot, parameters: { ...slot.parameters, ...params } } : slot
      ),
    }));
  }, []);

  const handleToggleMasteringProcessor = useCallback((slotId: string) => {
    setMasteringChain((prev) => ({
      ...prev,
      slots: prev.slots.map((slot) =>
        slot.id === slotId ? { ...slot, bypassed: !slot.bypassed } : slot
      ),
    }));
  }, []);

  const handleLoadMasteringPreset = useCallback((presetName: string) => {
    if (presetName.includes('Club')) {
      setMasteringChain({
        id: 'chain_club_loud',
        name: 'Modern Club Punch (-9.0 LUFS)',
        targetLufs: -9.0,
        targetDbtp: -0.3,
        slots: INITIAL_MASTERING_DSP_CHAIN.slots.map((s) =>
          s.type === 'true_peak_limiter' ? { ...s, parameters: { ...s.parameters, ceilingDbtp: -0.3 } } : s
        ),
      });
    } else if (presetName.includes('Warm')) {
      setMasteringChain({
        id: 'chain_warm_analog',
        name: 'Warm Analog Master (-13.0 LUFS)',
        targetLufs: -13.0,
        targetDbtp: -0.8,
        slots: INITIAL_MASTERING_DSP_CHAIN.slots.map((s) =>
          s.type === 'saturation' ? { ...s, parameters: { ...s.parameters, drive: 35 } } : s
        ),
      });
    } else {
      setMasteringChain(INITIAL_MASTERING_DSP_CHAIN);
    }
  }, []);

  const handleAuditionMasterCandidate = useCallback((candidateId: string) => {
    setActiveMasterCandidateId(candidateId);
    const cand = masterCandidates.find((c) => c.candidateId === candidateId);
    if (cand) {
      setMasteringChain(cand.dspChain);
    }
  }, [masterCandidates]);

  const handleCommitMasterCandidate = useCallback((candidateId: string) => {
    setMasterCandidates((prev) =>
      prev.map((c) => ({
        ...c,
        isCommittedMaster: c.candidateId === candidateId,
      }))
    );
    setActiveMasterCandidateId(candidateId);
  }, []);

  const handleSignMasterSeedSignature = useCallback(async (): Promise<SeedSignatureRecord> => {
    const activeCand = masterCandidates.find((c) => c.candidateId === activeMasterCandidateId) || masterCandidates[0];
    const signature = await signatureService.createSeedSignatureRecord(
      'asset_master_final',
      'project',
      creatorName,
      {
        projectId: 'soulsonus_project_master',
        tracks: tracks.map((t) => ({ id: t.id, name: t.name, instrument: t.instrument })),
        bpm: dawState.bpm,
        key: 'C Minor',
        masterCandidateId: activeCand.candidateId,
        mixPrintId: acceptedMixPrint.mixPrintId,
        timestamp: Date.now(),
      }
    );
    setSeedRecords((prev) => [signature, ...prev]);
    return signature;
  }, [masterCandidates, activeMasterCandidateId, tracks, dawState.bpm, creatorName, acceptedMixPrint]);

  // Renders, encodes and packages for real. The previous version returned a
  // literal: a project name from no session, a hash made from Date.now(), and
  // four /export/... URLs that were never written to.
  const [deliveryPackage, setDeliveryPackage] = useState<DeliveryPackage | null>(null);
  const [isPackagingDelivery, setIsPackagingDelivery] = useState(false);
  const [deliveryProgress, setDeliveryProgress] = useState<{ fraction: number; label: string } | null>(null);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const deliveryRef = useRef<DeliveryPackage | null>(null);

  const handleExportMasterDelivery = useCallback(async (): Promise<DeliveryPackage> => {
    setIsPackagingDelivery(true);
    setDeliveryError(null);
    try {
      const pkg = await buildDeliveryPackage({
        tracks: tracksRef.current,
        bpm: bpmRef.current || 110,
        chain: masteringChainRef.current,
        projectName: dawStateRef.current.projectName || 'SoulSonus Master',
        creatorName,
        seedRecords,
        onProgress: (fraction, label) => setDeliveryProgress({ fraction, label }),
      });
      // The previous package's object URLs are released only once its
      // replacement exists, so a failed rebuild never leaves dead links.
      disposeDelivery(deliveryRef.current);
      deliveryRef.current = pkg;
      setDeliveryPackage(pkg);
      setMasterMeasurement(pkg.measurement);
      return pkg;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed.';
      setDeliveryError(message);
      throw err;
    } finally {
      setIsPackagingDelivery(false);
      setDeliveryProgress(null);
    }
  }, [creatorName, seedRecords]);

  const value = useMemo<StudioSessionState>(
    () => ({
      activeWorkspace,
      setActiveWorkspace,
      selectionContext,
      setSelectionContext,
      activeProductionScope,
      setActiveProductionScope,
      focusTrackId,
      setFocusTrackId,
      exitFocusMode,
      isInspectorOpen,
      setIsInspectorOpen,
      isCalibrationOpen,
      setIsCalibrationOpen,
      isVisualizationOpen,
      setIsVisualizationOpen,
      isVaultModalOpen,
      setIsVaultModalOpen,
      isAudioImportModalOpen,
      setIsAudioImportModalOpen,
      isVoiceCloneDrawerOpen,
      setIsVoiceCloneDrawerOpen,

      dawState,
      setDawState,
      tracks,
      setTracks,
      sections,
      setSections,
      handleUpdateSections,
      vocalState,
      setVocalState,
      detectionSettings,
      setDetectionSettings,
      seedRecords,
      lineageRecords,
      decisionRecords,
      canUndo,
      canRedo,
      handleUndo,
      handleRedo,
      undoLabel,
      redoLabel,
      labelNextEdit,
      handleUpdateTrack,
      updateTracksWithHistory,
      handleMasterVolumeChange,
      handleReverbLevelChange,
      handleDelayLevelChange,
      handleStepChange,
      handleAddTrack,
      handleDeleteTrack,
      handleToggleStep,
      handleChangeStepNote,
      handleToggleMute,
      handleToggleSolo,
      handleChangeVolume,
      handleChangePitch,
      handleCloneBarToAll,
      handleNudgeTrackPattern,
      handleShiftTrackRow,
      handleClearTrack,
      handleClearAll,
      handleRandomize,
      handleInvertPattern,
      handleAddSeedRecord,
      handleCommitCandidateTransaction,
      calibratingTrackId,
      setCalibratingTrackId,
      creatorName,
      coproducerContext,
      editorPrefs,
      updateEditorPrefs,
      writeRoomDraft,
      updateWriteRoomDraft,
      isHydrating,
      lastSavedAt,
      persistenceError,
      handleSaveProjectAs,
      handleOpenProject,
      handleListProjects,
      handleDeleteProject,
      handleNewProject,
      handleCreateSourceTrack,
      isMidiCaptureArmed,
      handleToggleMidiCapture,
      handleAnalyzeAudioFile,
      handleImportAudioFile,
      handleExtractStemsFromSource,
      handleExtractSingleInstrument,
      handleAddTrackLayer,
      handleRemoveTrackLayer,
      handleUpdateTrackLayer,
      handleExplodeLayersToTracks,

      // Step 3
      vocalSelectionContext,
      setVocalSelectionContext,
      lyricSections,
      setLyricSections,
      handleAddLyricLine,
      handleUpdateLyricLine,
      handleDeleteLyricLine,
      handleCreateLyricVersion,
      handleRestoreLyricVersion,
      handleAddVocalTake,
      handleSetActiveTake,
      handleDeleteTake,
      handleUpdateTakeRating,
      handleUpdateCompSegment,
      handleApplyCompProposal,
      handleUpdatePitchSettings,
      handleUpdateTimingSettings,
      handleUpdateHarmonySettings,
      handleUpdateVoiceIdentitySettings,
      handleSetPunchRegion,

      // Step 4 MIX
      buses,
      setBuses,
      mixSnapshots,
      activeSnapshotId,
      referenceTrack,
      focusedTrackId: focusedMixTrackId,
      handleSetFocusedTrackId,
      monitoringMode,
      handleToggleMixSolo,
      handleToggleMixMute,
      handleToggleMixDim,
      handleToggleMixBypass,
      handleToggleReferenceAB,
      handleUpdateChannelStrip,
      handleUpdateBusChannel,
      handleToggleInsertBypass,
      handleReorderTrackInserts,
      handleAddInsertSlot,
      handleRemoveInsertSlot,
      handleSaveMixSnapshot,
      handleRestoreMixSnapshot,
      handleSetReferenceTrack,
      handleCommitMixProposal,
      handleExecuteClipOperation,

      // Step 5 FINISH
      acceptedMixPrint,
      masteringChain,
      masterCandidates,
      activeMasterCandidateId,
      finalizationGate,
      handleAnalyzeMasking,
      maskingReport,
      isAnalyzingMasking,
      handleAnalyzeMaster,
      handleBounceMaster,
      isBouncing,
      masterMeasurement,
      handleUpdateMasteringProcessor,
      handleToggleMasteringProcessor,
      handleLoadMasteringPreset,
      handleAuditionMasterCandidate,
      handleCommitMasterCandidate,
      handleSignMasterSeedSignature,
      handleExportMasterDelivery,
      deliveryPackage,
      isPackagingDelivery,
      deliveryProgress,
      deliveryError,

      // Tactile Performance & Note Editor (Piano Roll)
      selectedNoteIds,
      setSelectedNoteIds,
      handleAddNote,
      handleMoveNotes,
      handleResizeNote,
      handleSplitNote,
      handleDeleteNotes,
      handleSetNoteVelocity,
      handleSetNoteLyric,
      handleTransposeNotes,
      handleTransposeAllTracks,
      handleQuantizeTrackNotes,
      handleToggleTrackViewMode,
    }),
    [
      activeWorkspace,
      selectionContext,
      activeProductionScope,
      focusTrackId,
      exitFocusMode,
      isInspectorOpen,
      isCalibrationOpen,
      isVisualizationOpen,
      isVaultModalOpen,
      isAudioImportModalOpen,
      dawState,
      tracks,
      sections,
      vocalState,
      detectionSettings,
      seedRecords,
      lineageRecords,
      decisionRecords,
      canUndo,
      canRedo,
      handleUndo,
      handleRedo,
      undoLabel,
      redoLabel,
      labelNextEdit,
      handleUpdateTrack,
      updateTracksWithHistory,
      handleMasterVolumeChange,
      handleReverbLevelChange,
      handleDelayLevelChange,
      handleStepChange,
      handleAddTrack,
      handleDeleteTrack,
      handleToggleStep,
      handleChangeStepNote,
      handleToggleMute,
      handleToggleSolo,
      handleChangeVolume,
      handleChangePitch,
      handleCloneBarToAll,
      handleNudgeTrackPattern,
      handleShiftTrackRow,
      handleClearTrack,
      handleClearAll,
      handleRandomize,
      handleInvertPattern,
      handleAddSeedRecord,
      handleCommitCandidateTransaction,
      calibratingTrackId,
      creatorName,
      coproducerContext,
      editorPrefs,
      updateEditorPrefs,
      writeRoomDraft,
      updateWriteRoomDraft,
      isHydrating,
      lastSavedAt,
      persistenceError,
      handleSaveProjectAs,
      handleOpenProject,
      handleListProjects,
      handleDeleteProject,
      handleNewProject,
      handleCreateSourceTrack,
      isMidiCaptureArmed,
      handleToggleMidiCapture,
      handleAnalyzeAudioFile,
      handleImportAudioFile,
      handleExtractStemsFromSource,
      handleExtractSingleInstrument,
      handleAddTrackLayer,
      handleRemoveTrackLayer,
      handleUpdateTrackLayer,
      handleExplodeLayersToTracks,
      vocalSelectionContext,
      lyricSections,
      handleAddLyricLine,
      handleUpdateLyricLine,
      handleDeleteLyricLine,
      handleCreateLyricVersion,
      handleRestoreLyricVersion,
      handleAddVocalTake,
      handleSetActiveTake,
      handleDeleteTake,
      handleUpdateTakeRating,
      handleUpdateCompSegment,
      handleApplyCompProposal,
      handleUpdatePitchSettings,
      handleUpdateTimingSettings,
      handleUpdateHarmonySettings,
      handleUpdateVoiceIdentitySettings,
      handleSetPunchRegion,
      buses,
      mixSnapshots,
      activeSnapshotId,
      referenceTrack,
      focusedMixTrackId,
      handleSetFocusedTrackId,
      monitoringMode,
      handleToggleMixSolo,
      handleToggleMixMute,
      handleToggleMixDim,
      handleToggleMixBypass,
      handleToggleReferenceAB,
      handleUpdateChannelStrip,
      handleUpdateBusChannel,
      handleToggleInsertBypass,
      handleReorderTrackInserts,
      handleAddInsertSlot,
      handleRemoveInsertSlot,
      handleSaveMixSnapshot,
      handleRestoreMixSnapshot,
      handleSetReferenceTrack,
      handleCommitMixProposal,
      handleExecuteClipOperation,
      acceptedMixPrint,
      masteringChain,
      masterCandidates,
      activeMasterCandidateId,
      finalizationGate,
      handleAnalyzeMasking,
      maskingReport,
      isAnalyzingMasking,
      handleAnalyzeMaster,
      handleBounceMaster,
      isBouncing,
      masterMeasurement,
      handleUpdateMasteringProcessor,
      handleToggleMasteringProcessor,
      handleLoadMasteringPreset,
      handleAuditionMasterCandidate,
      handleCommitMasterCandidate,
      handleSignMasterSeedSignature,
      handleExportMasterDelivery,
      deliveryPackage,
      isPackagingDelivery,
      deliveryProgress,
      deliveryError,
      selectedNoteIds,
      setSelectedNoteIds,
      handleAddNote,
      handleMoveNotes,
      handleResizeNote,
      handleSplitNote,
      handleDeleteNotes,
      handleSetNoteVelocity,
      handleSetNoteLyric,
      handleTransposeNotes,
      handleTransposeAllTracks,
      handleQuantizeTrackNotes,
      handleToggleTrackViewMode,
    ]
  );


  return (
    <StudioSessionContext.Provider value={value}>
      {children}
      <CreativeResourceVaultModal
        isOpen={isVaultModalOpen}
        onClose={() => setIsVaultModalOpen(false)}
      />
      <AudioStemImportModal
        isOpen={isAudioImportModalOpen}
        onClose={() => setIsAudioImportModalOpen(false)}
      />
    </StudioSessionContext.Provider>
  );

};

export const useStudioSession = () => {
  const context = useContext(StudioSessionContext);
  if (!context) {
    throw new Error('useStudioSession must be used within a StudioSessionProvider');
  }
  return context;
};
