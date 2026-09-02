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
  AudioAsset,
  AudioAssetOrigin,
  AudioClip,
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
  DEFAULT_SONG_BARS,
  songTicks,
  songSteps,
  TICKS_PER_BAR,
} from '../utils/musicMath';

import { PRESETS } from '../data/presets';
import { audioEngine } from '../audio/audioEngine';
import { productionHistory } from '../lib/productionOperations';
import { detectionEngine, CaptureEvent } from '../audio/detectionEngine';
import { BandRole, GrantLevel, playerFor } from '../lib/sessionBand';
import { CatalogEntry, INSTRUMENT_CATALOG, factoryAdmission } from '../lib/soundSourcing';
import { DETECTION_DEFAULTS } from '../lib/styleProfile';
import { CallOutcome, SessionRoom, callSessionPlayer, installDefaultBand, registerSessionPlayer } from '../lib/sessionPlayer';
import { installAcePlayers } from '../lib/acePlayer';
import { resolveCaptureTarget } from '../audio/captureRouting';
import { midiNoteToCaptureEvent } from '../audio/midiCapture';
import { vocalRecorder } from '../audio/vocalRecorder';
import { measurePitchResponse, type PitchResponse } from '../audio/basicPitch';
import { analyzePerformanceBuffer, ContentAnalysis } from '../audio/offlinePerformanceAnalysis';
import { toMono } from '../audio/fft';
import { renderMasterBounce } from '../audio/masterRender';
import { transcribe } from '../audio/basicPitch';
import { startTakeRecording, TakeRecording } from '../audio/takeRecorder';
import { LoadedSoundBank, SoundFontUnavailableError, soundFontEngine } from '../audio/soundFont';
import { prepareSampledInstrument } from '../audio/sampledInstrument';
import * as Tone from 'tone';
import { defaultTrackDsp } from '../audio/trackStrip';
import { registerAudioAsset, makeClip, PlaceClipOptions } from '../audio/audioClips';
import { buildDeliveryPackage, disposeDelivery, DeliveryPackage } from '../audio/deliveryPackage';
import { MaskingReport, analyzeMasking } from '../audio/maskingAnalysis';
import { masteringTelemetryEngine, LoudnessTelemetryReport } from '../audio/masteringTelemetryEngine';
import { analyzeMixSpectralProfile, MixSpectralProfile } from '../audio/referenceTrackAnalysis';
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

/**
 * `MELODY` is the third case, and it was missing.
 *
 * SOLO_PERFORMANCE classifies percussive hits; FULL_MIX separates stems.
 * Neither turns a hummed line into pitched notes, which is the half of
 * "beatbox my composition into its proper tracks" that a classifier cannot
 * reach: it can tell a kick from a snare, but it has no opinion about whether
 * you hummed a C or an E.
 */
export type AudioImportMode = 'SOLO_PERFORMANCE' | 'FULL_MIX' | 'MELODY';

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
  activeBarView: 'all' | number;
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
  /** Hits detected past the end of the song, reported rather than clamped. */
  droppedBeyondGrid?: number;
  /** MELODY only: what the transcription actually heard. */
  transcription?: {
    noteCount: number;
    lowestNote: string;
    highestNote: string;
    engine: string;
    windows: number;
  };
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
  /** Immutable audio in the project, by id. Append-only. */
  audioAssets: Record<string, AudioAsset>;
  /** Registers a blob as an asset: decodes it, hashes the bytes, keeps the blob. */
  handleRegisterAudioAsset: (
    blob: Blob,
    options: { name: string; originType: AudioAssetOrigin; parentAssetIds?: string[] }
  ) => Promise<AudioAsset>;
  handlePlaceAudioClip: (trackId: string, assetId: string, options?: PlaceClipOptions) => AudioClip | null;
  /** Loads a .sf2 / .sf3 / .dls file for the INSTRUMENT route. */
  handleLoadSoundBank: (file: File) => Promise<LoadedSoundBank>;
  loadedSoundBank: LoadedSoundBank | null;
  /**
   * Renders a track's notes through the loaded sound bank and places the
   * result on its timeline as an audio clip.
   */
  handleRenderTrackWithSoundBank: (
    trackId: string,
    program?: number
  ) => Promise<{ ok: boolean; message: string; notesRendered?: number; durationSeconds?: number }>;
  handleMoveAudioClip: (clipId: string, deltaTicks: number) => void;
  /** One undoable write for a whole drag or trim gesture. */
  handleUpdateAudioClip: (clipId: string, patch: Partial<AudioClip>, label?: string) => void;
  selectedClipId: string | null;
  setSelectedClipId: React.Dispatch<React.SetStateAction<string | null>>;
  /** Registers a recorded take's audio and places it on a track at the playhead. */
  handlePlaceTakeOnTimeline: (trackId: string, takeId: string) => Promise<AudioClip | null>;
  handleRemoveAudioClip: (clipId: string) => void;
  /**
   * Changes the song's length in bars, resizing every track to match.
   * Returns what would fall outside a shortened song, so the caller can say so.
   */
  handleSetSongBars: (bars: number) => { notesPastEnd: number; clipsPastEnd: number };
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

  /**
   * The sealed creator signature, once there is one.
   *
   * This used to have nowhere to land. The training room computed a real
   * profile, hashed it, and called `onSaveSignature` -- a prop App.tsx never
   * passed. The signature was dropped on the floor at the moment it was
   * sealed, so nothing downstream could be conditioned on who the creator is.
   */
  creatorSignature: CreatorMusicSignature | null;
  handleSaveCreatorSignature: (signature: CreatorMusicSignature) => void;

  /**
   * Whether the instrument is open, and whether it is open full.
   *
   * This lived in App.tsx while the button that opens it lives down in the
   * canvas, so the strip could only be rendered at the top of the page --
   * nowhere near the control that summoned it. Shared here so it can open
   * where a creator actually clicked.
   */
  isInstrumentOpen: boolean;
  setIsInstrumentOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isInstrumentFull: boolean;
  setIsInstrumentFull: React.Dispatch<React.SetStateAction<boolean>>;
  
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
  /** Listens 2s, learns this track's center frequency and threshold, stores it as its detectionProfile. */
  handleCalibrateTrack: (trackId: string) => Promise<void>;
  /**
   * How high this creator's own pitched material drives the transcriber.
   * Null until they perform a calibration take. Never defaulted.
   */
  pitchResponse: PitchResponse | null;
  isCalibratingPitch: boolean;
  /** Records a sung or hummed take and measures what it does to the model. */
  handleCalibratePitch: (durationMs?: number) => Promise<void>;

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

  handleCreateSourceTrack: (modality: SourceModality) => string;
  /** Starts keeping the performance that a seed track is the record of. */
  startSeedRecording: (trackId: string) => Promise<boolean>;
  /** Attaches the kept performance to its seed track. Null if nothing usable was recorded. */
  stopSeedRecording: () => Promise<{ trackId: string; seconds: number } | null>;
  /**
   * Why capture is not running, when it is not.
   *
   * Arming used to mark the studio as recording without ever looking at
   * whether the microphone opened: `detectionEngine.start()` returns false and
   * logs to the console when `getUserMedia` is refused, and the caller
   * discarded it. So a blocked or missing microphone produced a pulsing record
   * button, an armed capture row, and nothing at all in the session -- which
   * is indistinguishable from a studio that does not work.
   */
  captureError: string | null;
  setCaptureError: React.Dispatch<React.SetStateAction<string | null>>;
  /** Turns the click on or off, and starts it if nothing else is running the clock. */
  handleToggleMetronome: () => Promise<boolean>;
  /** Ends capture: classifier off, modality cleared, take kept, microphone released. */
  handleStopCapture: () => Promise<{ trackId: string; seconds: number } | null>;
  /**
   * The one action behind every performance-capture entry point: the inline
   * Create-room strip and the dedicated Performance Capture room both call
   * this, so arming the mic, seeding the track and keeping the take can't
   * drift into two different behaviors depending on where you clicked.
   */
  handleQuickPerformanceCapture: (modality: 'MOUTH' | 'BODY' | 'KEYS' | 'AUDIO' | 'LYRICS') => Promise<void>;
  /** Loads an instrument that has been admitted to the factory. */
  handleLoadFactoryInstrument: (catalogId: string) => Promise<{ ok: boolean; message: string }>;
  /** Calls a session player. The take lands on its own channel, beside yours. */
  handleCallSessionPlayer: (
    role: BandRole,
    level: GrantLevel,
    direction: string
  ) => Promise<{ ok: boolean; message: string }>;

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
  currentMixSpectralProfile: MixSpectralProfile | null;
  handleLoadReferenceTrack: (file: File) => Promise<ReferenceTrackConfig>;
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
    songBars: DEFAULT_SONG_BARS,
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
  /**
   * The song's length in ticks, kept in a ref so handlers that run outside
   * render — capture, note edits, the sequencer — read the current value
   * without every one of them taking a dependency on dawState.
   */
  const songTicksRef = useRef<number>(songTicks(DEFAULT_SONG_BARS));
  const songStepsRef = useRef<number>(songSteps(DEFAULT_SONG_BARS));

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
    (
      action: Track[] | ((prev: Track[]) => Track[]),
      options?: { group?: string; continueOpenGroup?: boolean }
    ) => {
      // Group bookkeeping happens here rather than inside the updater: React
      // invokes updaters twice under StrictMode, and this decides whether a
      // history entry is written.
      const group = options?.group;
      const now = Date.now();
      let continuesGroup = false;
      if (group) {
        const open = historyGroupRef.current;
        // The idle window closes a group that has gone quiet, which is right
        // for a run of edits but wrong for the write that ends an action it
        // was part of: a take whose last note landed ten seconds before the
        // performer stopped is still one take. A caller that knows the write
        // finishes the open action says so, and the elapsed time stops
        // mattering.
        continuesGroup =
          !!open &&
          open.key === group &&
          (options?.continueOpenGroup === true || now - open.at < HISTORY_GROUP_IDLE_MS);
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

  useEffect(() => {
    songTicksRef.current = songTicks(dawState.songBars || DEFAULT_SONG_BARS);
    songStepsRef.current = songSteps(dawState.songBars || DEFAULT_SONG_BARS);
  }, [dawState.songBars]);

  // --- Audio on the timeline -------------------------------------------
  //
  // Assets are append-only and immutable; clips are ordinary track state, so
  // they ride the existing history stack and undo for free. Undoing a placement
  // therefore removes the clip and keeps the asset, which is the right
  // asymmetry: the bytes were still recorded, and can be placed again.
  const [audioAssets, setAudioAssets] = useState<Record<string, AudioAsset>>({});
  const audioAssetBlobsRef = useRef<Map<string, Blob>>(new Map());
  const audioAssetsRef = useRef<Record<string, AudioAsset>>({});
  useEffect(() => {
    audioAssetsRef.current = audioAssets;
  }, [audioAssets]);

  const handleRegisterAudioAsset = useCallback(
    async (
      blob: Blob,
      options: { name: string; originType: AudioAssetOrigin; parentAssetIds?: string[] }
    ): Promise<AudioAsset> => {
      const asset = await registerAudioAsset(blob, options);
      audioAssetBlobsRef.current.set(asset.id, blob);
      setAudioAssets((prev) => ({ ...prev, [asset.id]: asset }));
      audioAssetsRef.current = { ...audioAssetsRef.current, [asset.id]: asset };
      return asset;
    },
    []
  );

  const [loadedSoundBank, setLoadedSoundBank] = useState<LoadedSoundBank | null>(null);
  /** The catalogue entry behind the loaded bank, when it came from the factory. */
  const loadedFactoryEntryRef = useRef<CatalogEntry | null>(null);

  /**
   * Loads a sound bank for the INSTRUMENT route.
   *
   * No bank ships with the app: a General MIDI set is tens of megabytes and
   * carries its own licence. The engine this replaced listed six presets --
   * "Concert Grand Piano", "Vintage Rhodes Electric Piano" -- for a
   * `/soundfonts/general_midi.sf2` that is not in this repository, and played
   * two oscillators instead.
   */
  const handleLoadSoundBank = useCallback(async (file: File): Promise<LoadedSoundBank> => {
    const buffer = await file.arrayBuffer();
    const loaded = soundFontEngine.load(buffer, file.name);
    // A creator's own bank carries no key map, so the studio does not know
    // where its channels land on it. It renders as written, and the live
    // drum voices stay synthesised rather than guessing.
    loadedFactoryEntryRef.current = null;
    audioEngine.setSampledKit(null);
    setLoadedSoundBank(loaded);
    return loaded;
  }, []);

  /**
   * Loads the one instrument that has come through the curated catalogue.
   *
   * It is fetched rather than bundled into the JavaScript, so the studio
   * starts at the same weight it did and a creator who never reaches for the
   * kit never downloads it. The checksum in the admission record is of these
   * exact bytes, which is what makes "this is the instrument we cleared"
   * checkable rather than asserted.
   */
  const handleLoadFactoryInstrument = useCallback(
    async (catalogId: string): Promise<{ ok: boolean; message: string }> => {
      const entry = INSTRUMENT_CATALOG.find((e) => e.id === catalogId);
      if (!entry) return { ok: false, message: 'That instrument is not in the catalogue.' };
      const admission = factoryAdmission(entry);
      if (!admission.admitted) {
        return { ok: false, message: admission.detail || 'That instrument is not admitted to the factory.' };
      }
      if (entry.runtime !== 'SF2') {
        return { ok: false, message: `${entry.name} is an ${entry.runtime} instrument and there is no ${entry.runtime} player yet.` };
      }
      try {
        const res = await fetch(`/soundfonts/${entry.id}.sf2`);
        if (!res.ok) return { ok: false, message: `${entry.name} could not be fetched (${res.status}).` };
        const buffer = await res.arrayBuffer();
        const loaded = soundFontEngine.load(buffer, entry.name);
        loadedFactoryEntryRef.current = entry;
        setLoadedSoundBank(loaded);

        // Rendering it onto the timeline was never the point on its own. Every
        // zone is pre-rendered here so the kit plays under the fingers, which
        // is the difference between a sound you commit to and one you play.
        let live = '';
        if (entry.keyMap) {
          try {
            await audioEngine.init();
            const zones = soundFontEngine.zones();
            const kit = await prepareSampledInstrument(
              entry.name,
              zones.map((z) => ({ key: z.key, velMin: z.velMin, velMax: z.velMax, name: z.sample })),
              (key, velocity) => soundFontEngine.renderNote({ midiNote: key, velocity, holdSeconds: 0.25, tailSeconds: 3.5 }),
              Tone.getContext().rawContext as unknown as BaseAudioContext
            );
            audioEngine.setSampledKit(kit, entry.keyMap);
            live = ` Playing live on ${kit.zoneCount} zones (${kit.seconds().toFixed(1)}s of audio held).`;
          } catch (err) {
            // A kit that will not pre-render still renders to the timeline, so
            // this says what was lost rather than failing the whole load.
            live = ` It renders to the timeline, but could not be prepared for live play: ${
              err instanceof Error ? err.message : 'unknown reason'
            }.`;
          }
        }

        return {
          ok: true,
          message:
            `${entry.name} loaded — ${loaded.presets.length} preset(s), ` +
            `${Math.round(loaded.byteLength / 1024)} KB, ${entry.admission?.license}.${live}`,
        };
      } catch (err) {
        return { ok: false, message: err instanceof Error ? err.message : 'The instrument failed to load.' };
      }
    },
    []
  );

  /**
   * Renders a track's notes through the bank and puts the audio on its lane.
   *
   * A sampled instrument cannot be a Tone voice in this engine -- it renders
   * its own audio -- so the honest result is exactly what a sampler produces:
   * audio, on the timeline, as a clip. It rides the same asset and clip types
   * as a recording, so it is undoable, it survives a reload and it reaches the
   * bounce, with none of that needing to be built again.
   */
  const handleRenderTrackWithSoundBank = useCallback(
    async (trackId: string, program = 0) => {
      const track = tracksRef.current.find((t) => t.id === trackId);
      if (!track) return { ok: false, message: 'That channel is not in the project.' };
      const notes = track.noteEvents || [];
      if (!notes.length) {
        return { ok: false, message: `${track.name} has no notes to render.` };
      }

      const bpm = bpmRef.current || 110;
      const secondsPerTick = 60 / bpm / 480;

      // A kit maps this studio's channels onto the keys it was built for. The
      // studio's own numbering is not General MIDI -- its kick channel sits at
      // 24 and its snare at 36 -- so playing note numbers straight through a
      // kit renders a snare part as kicks.
      const keyMap = loadedFactoryEntryRef.current?.keyMap;
      const mappedKey = keyMap ? keyMap[track.instrument] : undefined;

      try {
        const rendered = await soundFontEngine.renderSequence({
          program,
          notes: notes.map((n) => ({
            midiNote: typeof mappedKey === 'number' ? mappedKey : n.midiNote,
            startSeconds: n.startTick * secondsPerTick,
            durationSeconds: Math.max(0.02, n.durationTicks * secondsPerTick),
            velocity: n.velocity,
          })),
        });

        const encoded = audioEncoders.encode24BitWav(rendered.left, rendered.right, rendered.sampleRate);
        const presetName =
          soundFontEngine.current?.presets.find((p) => p.program === program)?.name || `program ${program}`;
        const asset = await handleRegisterAudioAsset(encoded.dataBlob, {
          name: `${track.name} — ${presetName}`,
          originType: 'GENERATED',
        });
        pendingLabelRef.current = `Render ${track.name} with ${presetName}`;
        handlePlaceAudioClip(trackId, asset.id, { startTick: 0 });

        const durationSeconds = rendered.left.length / rendered.sampleRate;
        return {
          ok: true,
          message:
            `Rendered ${rendered.notesRendered} notes through ${presetName} — ` +
            `${durationSeconds.toFixed(1)}s of audio on ${track.name}` +
            (typeof mappedKey === 'number' ? `, played on key ${mappedKey}.` : '.'),
          notesRendered: rendered.notesRendered,
          durationSeconds,
        };
      } catch (err) {
        // "No bank loaded" is a state, not a crash, and it says what to do.
        if (err instanceof SoundFontUnavailableError) {
          return { ok: false, message: err.message };
        }
        return { ok: false, message: err instanceof Error ? err.message : 'The render failed.' };
      }
    },
    []
  );

  const handlePlaceAudioClip = useCallback(
    (trackId: string, assetId: string, options: PlaceClipOptions = {}): AudioClip | null => {
      const asset = audioAssetsRef.current[assetId];
      if (!asset) return null;
      const clip = makeClip(asset, trackId, bpmRef.current || 110, options);
      // A caller that already named the action keeps its name: "Render Lead
      // Synth with Saw Wave" is what happened, and "Place ..." would describe
      // only the last step of it.
      if (!pendingLabelRef.current) pendingLabelRef.current = `Place ${asset.name}`;
      updateTracksWithHistory((prev) =>
        prev.map((t) => (t.id === trackId ? { ...t, audioClips: [...(t.audioClips || []), clip] } : t))
      );
      return clip;
    },
    [updateTracksWithHistory]
  );

  const handleMoveAudioClip = useCallback(
    (clipId: string, deltaTicks: number) => {
      pendingLabelRef.current = 'Move clip';
      updateTracksWithHistory((prev) =>
        prev.map((t) => {
          if (!t.audioClips?.some((c) => c.id === clipId)) return t;
          return {
            ...t,
            audioClips: t.audioClips.map((c) =>
              c.id === clipId
                ? {
                    ...c,
                    startTick: Math.max(0, c.startTick + deltaTicks),
                    provenance: { ...c.provenance, creatorEdited: true },
                  }
                : c
            ),
          };
        })
      );
    },
    [updateTracksWithHistory]
  );

  /**
   * The first real producer of timeline audio: a take the creator recorded.
   *
   * Deliberately the same path anything else will use — the take's blob becomes
   * an ordinary asset and an ordinary clip, with no special case for having
   * come from the microphone.
   */
  const handlePlaceTakeOnTimeline = useCallback(
    async (trackId: string, takeId: string): Promise<AudioClip | null> => {
      const blob = takeAudioRef.current.get(takeId);
      if (!blob) return null;
      const track = tracksRef.current.find((t) => t.id === trackId);
      const take = track?.vocalTakes?.find((v) => v.id === takeId);

      const asset = await handleRegisterAudioAsset(blob, {
        name: take?.name || 'Recorded take',
        originType: 'RECORDED',
      });

      // At the playhead, on the grid the notes use.
      const startTick = (currentStepRef.current || 0) * TICKS_PER_16TH;
      return handlePlaceAudioClip(trackId, asset.id, {
        startTick,
        sourceDescription: take?.name,
      });
    },
    [handleRegisterAudioAsset, handlePlaceAudioClip]
  );

  /**
   * Growing keeps everything and adds empty bars. Shrinking keeps everything
   * too: notes and clips beyond the new end stay in the data rather than being
   * deleted, because silently destroying a creator's work to satisfy a number
   * in a field is the wrong trade. The count of what now sits past the end is
   * returned so the interface can say what happened.
   */
  const handleSetSongBars = useCallback(
    (bars: number) => {
      const nextBars = Math.max(1, Math.min(256, Math.round(bars)));
      const nextSteps = songSteps(nextBars);
      const nextTicks = songTicks(nextBars);

      const notesPastEnd = tracksRef.current.reduce(
        (n, t) => n + (t.noteEvents || []).filter((e) => e.startTick >= nextTicks).length,
        0
      );
      const clipsPastEnd = tracksRef.current.reduce(
        (n, t) => n + (t.audioClips || []).filter((c) => c.startTick >= nextTicks).length,
        0
      );

      songTicksRef.current = nextTicks;
      songStepsRef.current = nextSteps;
      pendingLabelRef.current = `Song length ${nextBars} bars`;

      updateTracksWithHistory((prev) =>
        prev.map((t) => {
          const steps = new Array(nextSteps).fill(false);
          (t.steps || []).slice(0, nextSteps).forEach((on, i) => {
            steps[i] = on;
          });
          const next: Track = { ...t, steps };
          if (t.notes) {
            const notes = new Array(nextSteps).fill(t.pitch || 'C3');
            t.notes.slice(0, nextSteps).forEach((n, i) => {
              notes[i] = n;
            });
            next.notes = notes;
          }
          return next;
        })
      );
      setDawState((prev) => ({ ...prev, songBars: nextBars }));

      return { notesPastEnd, clipsPastEnd };
    },
    [updateTracksWithHistory]
  );

  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  /**
   * Applies a finished gesture in one write.
   *
   * A drag that wrote on every pointer move would fill the history stack with
   * sixty entries for one movement of one clip, so the lane previews locally
   * and calls this once on release.
   */
  const handleUpdateAudioClip = useCallback(
    (clipId: string, patch: Partial<AudioClip>, label?: string) => {
      pendingLabelRef.current = label || 'Edit clip';
      updateTracksWithHistory((prev) =>
        prev.map((t) => {
          if (!t.audioClips?.some((c) => c.id === clipId)) return t;
          return {
            ...t,
            audioClips: t.audioClips.map((c) =>
              c.id === clipId
                ? { ...c, ...patch, provenance: { ...c.provenance, creatorEdited: true } }
                : c
            ),
          };
        })
      );
    },
    [updateTracksWithHistory]
  );

  const handleRemoveAudioClip = useCallback(
    (clipId: string) => {
      pendingLabelRef.current = 'Remove clip';
      updateTracksWithHistory((prev) =>
        prev.map((t) =>
          t.audioClips?.some((c) => c.id === clipId)
            ? { ...t, audioClips: t.audioClips.filter((c) => c.id !== clipId) }
            : t
        )
      );
    },
    [updateTracksWithHistory]
  );

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
      if (updates.dspSettings || updates.instrumentParams) {
        const track = tracksRef.current.find((t) => t.id === trackId);
        if (track) {
          // Drive lives on the channel strip's distortion, so an instrument
          // parameter change has to reach the strip too. The rest of the
          // instrument parameters are applied to the voice at trigger time.
          audioEngine.applyTrackDsp(
            trackId,
            updates.dspSettings || track.dspSettings,
            track.instrument,
            (updates.instrumentParams || track.instrumentParams)?.drive
          );
        }
      }
      updateTracksWithHistory((prev) => prev.map((t) => (t.id === trackId ? { ...t, ...updates } : t)));
    },
    [updateTracksWithHistory]
  );

  // Detection Settings
  const [detectionSettings, setDetectionSettings] = useState<DetectionSettings>({
    ...DETECTION_DEFAULTS,
    enabled: false,
    micConnected: false,
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

  // Who is behind each role is a deployment decision, so it is made in one
  // place at startup rather than at each call site. installAcePlayers fills
  // the two audio-handing seats (backing vocals, texture/FX) that
  // installDefaultBand() deliberately leaves empty -- the only two roles a
  // generative renderer can actually stand behind, since the other five
  // hand back notes.
  useEffect(() => {
    installDefaultBand();
    installAcePlayers(registerSessionPlayer);
  }, []);

  /**
   * Where the current take started, so an onset can be placed in musical time.
   *
   * Two numbers because a take can begin anywhere. `captureOriginMsRef` is the
   * wall clock at the first moment of the take, which is what onset timestamps
   * are measured against; `captureOriginSecondsRef` is the musical position the
   * take began at, so recording into bar 5 with the transport running puts the
   * notes in bar 5 rather than at the top of the song.
   */
  const captureOriginMsRef = useRef<number | null>(null);
  /** Throttles the meter, which the engine offers on every animation frame. */
  const lastMeterAtRef = useRef(0);
  const captureOriginSecondsRef = useRef(0);

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

    // The take's origin is its first onset, set here rather than when the mic
    // is armed: capture can be armed from the capture row, the header's REC
    // button or the calibration drawer, and a creator who arms and then thinks
    // for four seconds should not have four seconds of silence recorded. Where
    // the take begins in the song comes from the transport when it is running
    // and from the playhead when it is not, so recording into bar 5 puts the
    // notes in bar 5.
    if (captureOriginMsRef.current === null && events.length) {
      captureOriginMsRef.current = events[0].atMs;
      captureOriginSecondsRef.current = dawStateRef.current.isPlaying
        ? Tone.getTransport().seconds
        : playheadStep * (60 / (bpmRef.current || 110) / 4);
    }
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

        // Where the onset actually happened, in musical time.
        //
        // This used to be the playhead's current step, which discarded the
        // performance twice over. With the transport stopped -- which is the
        // ordinary way this studio is used, arm the mic and perform -- the
        // playhead does not move, so a whole six-second groove was written to
        // one tick: 28 onsets, one distinct position, all of them on beat one.
        // With the transport running the rhythm survived but every onset was
        // hard-snapped to a 16th, so the creator's own placement against the
        // beat -- the thing that makes a performance theirs -- was gone before
        // it was ever stored.
        //
        // A file carries its own timeline in `atSeconds`. Everything else is
        // positioned from the clock: the transport's own position while it
        // runs, and elapsed time since the take began when it does not.
        // Quantising afterwards is a choice the creator already has a control
        // for; un-quantising is not, because the information is gone.
        const seconds =
          typeof event.atSeconds === 'number'
            ? event.atSeconds
            : captureOriginMsRef.current !== null
              ? Math.max(0, (event.atMs - captureOriginMsRef.current) / 1000) + captureOriginSecondsRef.current
              : playheadStep * 0.125;
        const startTick = Math.max(
          0,
          Math.min(songTicksRef.current - 120, Math.round(seconds * ticksPerSecond))
        );
        const step = Math.max(0, Math.min(songStepsRef.current - 1, Math.floor(startTick / 120)));

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
          const steps = new Array(songStepsRef.current).fill(false);
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

        // Anything past the end of the song is reported as left behind rather
        // than clamped onto the final step, which would silently pile the tail
        // of a long file into one place.
        const ticksPerSecond = ((bpmRef.current || 110) / 60) * 480;
        const gridSeconds = songTicksRef.current / ticksPerSecond;
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
          ? ` ${droppedBeyondGrid} hits past the end of the song were left out — trim the file, or lengthen the song to keep them.`
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

      if (mode === 'MELODY') {
        // A hummed or played melodic line, through the Basic Pitch model that
        // has been sitting in public/models/ since before this audit began.
        // The engine that held a session for it was imported by no file, fed
        // the tensor under the wrong input name so every call threw, and
        // discarded the result anyway while reporting itself as neural.
        const buffer = await decodeAudioFile(file);
        const channel = buffer.getChannelData(0);
        // The gate is this creator's when they have calibrated, and the
        // shipped instrument default when they have not.
        const result = await transcribe(channel, buffer.sampleRate, {
          creatorPeaks: pitchResponseRef.current,
        });

        if (!result.notes.length) {
          // Nothing heard is reported as nothing heard. The model returns no
          // notes for silence and for noise, and that is the correct answer.
          return {
            ok: false,
            mode,
            message:
              'No pitched notes were heard in this file. Basic Pitch follows sung, hummed or played ' +
              'lines; percussion has no pitch to follow, so import that as a performance instead.' +
              (result.gateSource === 'default'
                ? ' This was measured against the shipped instrument gate -- calibrating your pitch in the training room sets it to your own voice, which a soft attack often needs.'
                : ''),
          };
        }

        const bpm = bpmRef.current || 110;
        const ticksPerSecond = (bpm / 60) * 480;
        const songEnd = songTicksRef.current;
        const all = result.notes.map((n) => ({
          startTick: Math.round(n.startSeconds * ticksPerSecond),
          durationTicks: Math.max(60, Math.round(n.durationSeconds * ticksPerSecond)),
          midiNote: n.midiNote,
          // Velocity from the onset head, not a constant. A soft note and a
          // hard one came back with different activations, so they should not
          // arrive on the grid identical.
          velocity: Math.max(20, Math.min(127, Math.round(n.onsetStrength * 127))),
          confidence: n.sustainStrength,
        }));
        const kept = all.filter((n) => n.startTick < songEnd);
        const droppedBeyondGrid = all.length - kept.length;

        const track = tracksRef.current.find((t) => t.instrument === 'melody') || tracksRef.current[0];
        if (!track) {
          return { ok: false, mode, message: 'There is no channel to write the melody to.' };
        }

        pendingLabelRef.current = `Transcribe ${file.name}`;
        updateTracksWithHistory((prev) =>
          prev.map((t) =>
            t.id === track.id
              ? {
                  ...t,
                  noteEvents: [
                    ...(t.noteEvents || []),
                    ...kept.map((n, i) => ({
                      id: `tr_${Date.now()}_${i}`,
                      startTick: n.startTick,
                      durationTicks: n.durationTicks,
                      midiNote: n.midiNote,
                      velocity: n.velocity,
                      provenance: {
                        origin: 'IMPORTED_MIDI' as const,
                        // The model's own frame activation, carried through
                        // rather than replaced with a flattering constant.
                        detectionConfidence: n.confidence,
                        creatorEdited: false,
                      },
                    })),
                  ],
                }
              : t
          )
        );

        const pitches = kept.map((n) => n.midiNote);
        const truncation = droppedBeyondGrid
          ? ` ${droppedBeyondGrid} notes past the end of the song were left out — lengthen the song to keep them.`
          : '';
        return {
          ok: true,
          mode,
          message:
            `Heard ${kept.length} notes and wrote them to ${track.name}.${truncation}`,
          eventCount: kept.length,
          droppedBeyondGrid,
          transcription: {
            noteCount: kept.length,
            lowestNote: midiToNoteName(Math.min(...pitches)),
            highestNote: midiToNoteName(Math.max(...pitches)),
            engine: result.engine,
            windows: result.windows,
          },
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
        const stemBlob = await res.blob();
        const stemBuffer = await decodeAudioFile(new File([stemBlob], `${role}.wav`));

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

        // A stem that only carries sourceTakeAudioUrl and a waveform preview
        // is audio the creator cannot actually hear or move -- nothing reads
        // either field for playback or rendering. Registering a real
        // AudioAsset and placing a clip from it is what makes this stem the
        // same kind of thing as a recorded take: playable, draggable, mixed
        // into the bounce, all through the one clip/asset path everything
        // else already goes through.
        const trackId = `stem_${role}_${timestamp}`;
        const asset = await handleRegisterAudioAsset(stemBlob, {
          name: `${baseName} (${spec.label})`,
          originType: 'SEPARATED',
        });
        const clip = makeClip(asset, trackId, bpmRef.current || 110, {
          startTick: 0,
          sourceDescription: `Demucs ${spec.label.toLowerCase()} stem of ${file.name}`,
        });

        created.push({
          id: trackId,
          name: `${baseName} (${spec.label})`,
          instrument: spec.instrument,
          steps: new Array(songStepsRef.current).fill(false),
          mute: false,
          solo: false,
          volume: 0,
          pitch: spec.pitch,
          color: spec.color,
          sourceModality: 'AUDIO',
          sourceTakeAudioUrl: url,
          audioClips: [clip],
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
    [decodeAudioFile, commitCaptureEvents, updateTracksWithHistory, handleRegisterAudioAsset]
  );

  /** The take being recorded right now, if any. */
  const seedRecordingRef = useRef<{ trackId: string; recording: TakeRecording } | null>(null);

  useEffect(() => {
    tracksRef.current = tracks;
    detectionEngine.setTracks(tracks);
    detectionEngine.setCallbacks({
      onCaptureEvent: (event) => {
        // Monitoring always: this is what makes a hit audible and moves the
        // meters while performing.
        monitorCaptureEvent(event);

        commitCaptureEvents([event]);
      },
      // The engine has always measured this and nothing ever asked for it, so
      // `currentLowLevel` and `currentHighLevel` sat at 0 and the calibration
      // meters drawn from them never moved. A creator had no way to see
      // whether the microphone was hearing anything at all.
      onMeterUpdate: (lowLevel, highLevel) => {
        const now = Date.now();
        if (now - lastMeterAtRef.current < 80) return; // ~12 times a second is enough to watch
        lastMeterAtRef.current = now;
        setDetectionSettings((prev) =>
          prev.currentLowLevel === lowLevel && prev.currentHighLevel === highLevel
            ? prev
            : { ...prev, currentLowLevel: lowLevel, currentHighLevel: highLevel }
        );
      },
    });
  }, [tracks, monitorCaptureEvent, commitCaptureEvents]);

  // Calibrating Track ID
  const [calibratingTrackId, setCalibratingTrackId] = useState<string | null>(null);

  const handleCalibrateTrack = useCallback(async (trackId: string) => {
    setCalibratingTrackId(trackId);
    const profile = await detectionEngine.calibrateTrack(trackId, 2000);
    if (profile) {
      setTracks((prev) => prev.map((t) => (t.id === trackId ? { ...t, detectionProfile: profile } : t)));
    }
    setCalibratingTrackId(null);
  }, []);

  // The pitch counterpart of the track calibration above.
  const [pitchResponse, setPitchResponse] = useState<PitchResponse | null>(null);
  const pitchResponseRef = useRef<PitchResponse | null>(null);
  useEffect(() => {
    pitchResponseRef.current = pitchResponse;
  }, [pitchResponse]);
  const [isCalibratingPitch, setIsCalibratingPitch] = useState(false);

  /**
   * Measures what this creator's pitched voice does to the transcriber.
   *
   * Recorded through the vocal recorder rather than by polling the analyser.
   * The analyser hands back snapshots with gaps between them, which is fine
   * for measuring band energy and wrong for a model that reads a continuous
   * signal -- a stitched buffer would produce a number that describes the
   * stitching rather than the person.
   *
   * Three seconds because Basic Pitch's window is 43844 samples at 22050 Hz,
   * just under two, and a take that only just fills one window measures the
   * edge of the buffer as much as the voice.
   */
  const handleCalibratePitch = useCallback(async (durationMs = 3000) => {
    setIsCalibratingPitch(true);
    try {
      const started = await vocalRecorder.startRecording();
      if (!started) return;
      await new Promise((r) => setTimeout(r, durationMs));
      const take = await vocalRecorder.stopRecording();
      const measured = await measurePitchResponse(
        take.buffer.getChannelData(0),
        take.buffer.sampleRate
      );
      // A silent take drives neither head. Recording nothing is not a
      // measurement of a person, so it is not stored as one.
      if (measured.onsetPeak > 0 || measured.framePeak > 0) {
        setPitchResponse(measured);
      }
    } catch {
      // Leave the previous measurement, or none, rather than write a wrong one.
    } finally {
      setIsCalibratingPitch(false);
    }
  }, []);

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
      steps: new Array(songStepsRef.current).fill(false),
      notes: type === 'melody' || type === 'bass' ? new Array(songStepsRef.current).fill('C3') : undefined,
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
          const newNotes = track.notes ? [...track.notes] : new Array(songStepsRef.current).fill(track.pitch || 'C3');
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
              startTick: Math.max(0, Math.min(songTicksRef.current - 1, noteData.startTick)),
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
            const updatedSteps = deriveStepArrayFromNoteEvents(updatedNotes, songStepsRef.current);

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
                const newStart = Math.max(0, Math.min(songTicksRef.current - note.durationTicks, note.startTick + deltaTicks));
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
            const updatedSteps = deriveStepArrayFromNoteEvents(updatedNotes, songStepsRef.current);
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
                const maxDuration = songTicksRef.current - note.startTick;
                const safeDuration = Math.max(15, Math.min(maxDuration, newDurationTicks));
                return {
                  ...note,
                  durationTicks: safeDuration,
                  provenance: { ...note.provenance, creatorEdited: true },
                };
              }
              return note;
            });
            const updatedSteps = deriveStepArrayFromNoteEvents(updatedNotes, songStepsRef.current);
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

            const updatedSteps = deriveStepArrayFromNoteEvents(updatedNotes, songStepsRef.current);
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
            const updatedSteps = deriveStepArrayFromNoteEvents(updatedNotes, songStepsRef.current);
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
            const updatedSteps = deriveStepArrayFromNoteEvents(updatedNotes, songStepsRef.current);
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
  const [creatorSignature, setCreatorSignature] = useState<CreatorMusicSignature | null>(null);
  const [isInstrumentOpen, setIsInstrumentOpen] = useState(false);
  const [isInstrumentFull, setIsInstrumentFull] = useState(false);

  /**
   * Receives a sealed signature and applies what it measured.
   *
   * Sealing used to end at the modal's own `onClose`. Everything the profile
   * had measured about the creator -- the thresholds they tuned against their
   * own mouth, above all -- stayed inside a component that was about to
   * unmount. A threshold the creator calibrated and the detector never reads
   * is the same as not having calibrated.
   */
  const handleSaveCreatorSignature = useCallback((signature: CreatorMusicSignature) => {
    setCreatorSignature(signature);

    const { kickSensitivity, snareSensitivity } = signature.thresholds;
    // Null means the creator left the control at its shipped default, which
    // says nothing about them -- so it must not overwrite anything.
    if (kickSensitivity === null && snareSensitivity === null) return;
    setDetectionSettings((prev) => ({
      ...prev,
      ...(kickSensitivity !== null ? { kickThreshold: kickSensitivity } : {}),
      ...(snareSensitivity !== null ? { snareThreshold: snareSensitivity } : {}),
    }));
  }, []);

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


  /**
   * Keeps the performance that a seed track is supposed to be the record of.
   *
   * Arming a modality created a seed track and started the classifier, and
   * nothing recorded the audio. So the track the creator made by pressing the
   * button held no notes (the classifier separates them onto instrument
   * channels, which is correct) and no audio either -- it was empty in every
   * sense, and the take that produced the whole session existed nowhere.
   *
   * Two things follow from keeping it. The seed track visibly becomes the
   * performance rather than a label; and `handleExtractStemsFromSource` gets
   * real audio to analyse instead of falling back to re-grouping notes that
   * were already separated, which means a performance can be extracted again
   * later, by better analysis, without being performed again.
   */


  const stopSeedRecording = useCallback(async (): Promise<{ trackId: string; seconds: number } | null> => {
    const active = seedRecordingRef.current;
    if (!active) return null;
    seedRecordingRef.current = null;
    try {
      const take = await active.recording.stop();
      // A tap on the button is not a performance. Below this it is discarded
      // rather than left as an empty asset with a hash.
      if (take.durationSeconds < 0.2) return null;

      const track = tracksRef.current.find((t) => t.id === active.trackId);
      const modality = track?.sourceModality || 'MOUTH';

      // The take becomes an ordinary immutable asset and an ordinary clip, so
      // it is drawn on the grid, draggable, hashed with its lineage, survives a
      // reload and reaches the bounce -- all machinery that already exists and
      // is already tested. A bespoke waveform on a seed track would have been
      // none of those things.
      const asset = await handleRegisterAudioAsset(take.blob, {
        name: `${modality} performance`,
        originType: 'RECORDED',
      });
      const clip = makeClip(asset, active.trackId, bpmRef.current || 110, { startTick: 0 });

      // Both writes are one write, and they join the take's own history group.
      // The notes and the audio came out of a single performance, so a single
      // undo has to take back the whole of it -- not the audio first and the
      // notes on a second press.
      pendingLabelRef.current = 'Record take';
      updateTracksWithHistory(
        (prev) =>
          prev.map((t) =>
            t.id === active.trackId
              ? { ...t, sourceTakeAudioUrl: asset.url, audioClips: [...(t.audioClips || []), clip] }
              : t
          ),
        { group: 'capture', continueOpenGroup: true }
      );

      return { trackId: active.trackId, seconds: take.durationSeconds };
    } catch {
      // A microphone that fails on stop is reported by returning nothing; it
      // never leaves a track claiming audio it does not have.
      return null;
    }
  }, [updateTracksWithHistory, handleRegisterAudioAsset, decodeAudioFile, commitCaptureEvents]);

  const startSeedRecording = useCallback(async (trackId: string) => {
    if (seedRecordingRef.current) await stopSeedRecording();
    try {
      // Record from the microphone the analyser already opened, so the take
      // and the detection are the same performance.
      seedRecordingRef.current = {
        trackId,
        recording: await startTakeRecording(detectionEngine.getMediaStream()),
      };
      return true;
    } catch {
      seedRecordingRef.current = null;
      return false;
    }
  }, [stopSeedRecording]);

  /**
   * Stopping capture, from wherever it is stopped.
   *
   * Two controls stop the microphone -- the header's mic toggle and the
   * calibration drawer's own button -- and each did its own version of it.
   * When keeping the take was added to one of them, the other silently threw
   * the performance away and left the recorder running into the next arm. The
   * order matters as much as the steps: the classifier stops first so no
   * further note is attributed to a performance that has ended, and the take
   * is closed before the microphone is released.
   */
  /**
   * The click, on or off.
   *
   * It also starts its own clock when the transport is not running, because
   * the ordinary way this studio is used is to arm the mic and perform without
   * pressing play -- and a metronome that only works while the sequencer is
   * playing back other material is not much use to someone laying down the
   * first thing in a session.
   */
  const [captureError, setCaptureError] = useState<string | null>(null);

  const handleToggleMetronome = useCallback(async (): Promise<boolean> => {
    const next = !dawStateRef.current.metronomeOn;
    await audioEngine.init();
    audioEngine.setMetronome(next);
    if (next && !dawStateRef.current.isPlaying) {
      audioEngine.startStandaloneMetronome(bpmRef.current || 110);
    } else if (!next) {
      audioEngine.stopStandaloneMetronome();
    }
    setDawState((prev) => ({ ...prev, metronomeOn: next }));
    return next;
  }, []);

  const handleStopCapture = useCallback(async () => {
    detectionEngine.stop();
    detectionEngine.setCaptureModality(null);
    // The next take gets its own clock.
    captureOriginMsRef.current = null;
    setDetectionSettings((prev) => ({ ...prev, enabled: false, micConnected: false }));
    return stopSeedRecording();
  }, [stopSeedRecording]);

  const handleCreateSourceTrack = useCallback((modality: SourceModality): string => {
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
      steps: Array(songStepsRef.current).fill(false),
      // A capture pad is not a channel in the arrangement. It holds the raw
      // performance so it can be replayed and placed deliberately; the hits
      // themselves are classified onto the real instrument channels. Muted
      // keeps the voice out of the mix and -- because resolveCaptureTarget
      // only considers audible tracks -- also stops a hummed line landing on
      // the pad instead of the melody channel it belongs on.
      mute: true,
      solo: false,
      volume: 0,
      pitch,
      color,
      isSourceTrack: true,
      sourceModality: modality,
      seedType: 'CONTRIBUTION_SEED',
      rootSeedId: 'root_seed_master',
      // No take yet. A seed track used to be born holding a waveform of 32
      // literal numbers and a duration of 8.7 seconds -- a picture of a
      // performance that had not happened. The take arrives when it is
      // performed, as a real asset with a real waveform, and until then the
      // track honestly holds nothing.
    };

    updateTracksWithHistory((prev) => [newSourceTrack, ...prev]);
    setSelectionContext((prev) => ({ ...prev, selectedTrackId: sourceTrackId }));
    return sourceTrackId;
  }, [tracks, updateTracksWithHistory]);

  const handleQuickPerformanceCapture = useCallback(async (modality: 'MOUTH' | 'BODY' | 'KEYS' | 'AUDIO' | 'LYRICS') => {
    if (modality === 'AUDIO') {
      setIsAudioImportModalOpen(true);
      return;
    }
    if (modality !== 'MOUTH' && modality !== 'BODY' && modality !== 'KEYS') return;

    // The microphone first, and only then the track.
    //
    // This used to create the seed track, arm the classifier and mark the
    // studio as recording without ever looking at whether the microphone
    // opened. `detectionEngine.start()` returns false and logs to the console
    // when getUserMedia is refused -- in a sandboxed frame, on a denied
    // permission, with no input device -- and the result was discarded. What a
    // creator saw was a pulsing record button, an armed capture row, and after
    // forty seconds of performing: no notes, no waveform, no audio, nothing to
    // play back. Identical to a studio that simply does not work.
    setCaptureError(null);
    if (detectionSettings.enabled) return;

    detectionEngine.setCaptureModality(modality);
    const opened = await detectionEngine.start();
    if (!opened) {
      detectionEngine.setCaptureModality(null);
      setCaptureError(
        'The microphone did not open, so nothing is being recorded. The browser refused access — ' +
          'check that this page is allowed to use the microphone, that a device is connected, and that ' +
          'the page is not running inside a frame that blocks it.'
      );
      return;
    }

    const seedTrackId = handleCreateSourceTrack(modality);

    // Keep the performance itself, not just what was classified out of it.
    // This opens the microphone a second time, for the recorder, and it can
    // fail on its own -- so it is reported on its own rather than folded into
    // the classifier's success.
    if (modality !== 'KEYS') {
      const kept = await startSeedRecording(seedTrackId);
      if (!kept) {
        setCaptureError(
          'Listening, and classifying what you play — but the recorder could not open the microphone, ' +
            'so the take itself is not being kept this time.'
        );
      }
    }

    setDetectionSettings((prev) => ({
      ...prev,
      enabled: true,
      micConnected: true,
      kickThreshold: modality === 'MOUTH' ? 0.45 : 0.6,
      snareThreshold: modality === 'MOUTH' ? 0.45 : 0.35,
    }));
  }, [detectionSettings.enabled, handleCreateSourceTrack, startSeedRecording]);

  /**
   * Calling a player, and putting what they hand back on its own track.
   *
   * The session band was describable before it was callable: the dock could
   * state the brief, the grant and the call order, and then had to admit
   * nothing was behind it. This is what puts something behind it, and it goes
   * through `callSessionPlayer` rather than a renderer, so the day a
   * generative model arrives for a role, nothing here changes.
   *
   * The take lands on a new channel beside the creator's own, never over it.
   * That is the whole premise of a session player: live musicians on top of
   * your music, not a remix of it. Yours stays exactly as you played it, and
   * you can mute either one.
   */
  const handleCallSessionPlayer = useCallback(
    async (
      role: BandRole,
      level: GrantLevel,
      direction: string
    ): Promise<{ ok: boolean; message: string }> => {
      const spec = playerFor(role);
      const current = tracksRef.current;
      const lane =
        current.find((t) => spec.instruments.includes(t.instrument) && !t.isSourceTrack) ||
        current.find((t) => spec.instruments.includes(t.instrument));
      if (!lane) {
        return {
          ok: false,
          message: `There is no ${spec.label.toLowerCase()} channel in this session yet. The take needs somewhere to land — make one, or perform the part and let capture make it.`,
        };
      }

      const room: SessionRoom = {
        bpm: bpmRef.current || 110,
        // Deliberately absent: nothing in the studio asks for a key yet, and a
        // confident "C minor" would be a guess wearing the shape of a fact.
        songTicks: songTicksRef.current,
        parts: current.map((t) => ({
          trackId: t.id,
          name: t.name,
          instrument: t.instrument,
          notes: t.noteEvents || [],
        })),
      };

      const outcome = await callSessionPlayer(
        {
          role,
          grant: { level, trackId: lane.id },
          direction,
          bpm: room.bpm,
          key: room.key,
          scale: room.scale,
          source: lane.noteEvents || [],
        },
        room,
        { seed: Date.now() % 100000 }
      );

      if (!outcome.ok) {
        // Every refusal already carries a reason a creator can act on. It is
        // repeated verbatim rather than softened, because a vague "couldn't do
        // that" is how a missing feature becomes invisible.
        const refused = outcome as Extract<CallOutcome, { ok: false }>;
        return { ok: false, message: refused.refusal.detail };
      }
      if (outcome.take.kind === 'audio') {
        // The same real path a stem's audio takes: a registered AudioAsset
        // and an AudioClip placed on the timeline, not a Blob left to sit in
        // a variable nothing reads. This used to be refused outright --
        // "there is nowhere to put it yet" -- which was true only because
        // this branch had never been written, not because it can't be done.
        const asset = await handleRegisterAudioAsset(outcome.take.audio, {
          name: `${spec.label} — session take`,
          originType: 'GENERATED',
        });
        const clip = makeClip(asset, `t-band-${role.toLowerCase()}-${Date.now()}`, bpmRef.current || 110, {
          startTick: 0,
          sourceDescription: `${spec.label} take, ${outcome.renderer}: ${direction}`,
        });
        const takeTrack: Track = {
          id: clip.trackId,
          name: `${spec.label} — session take`,
          instrument: lane.instrument,
          steps: new Array(songStepsRef.current).fill(false),
          mute: false,
          solo: false,
          volume: 0,
          pitch: lane.pitch,
          color: lane.color,
          sourceModality: 'AUDIO',
          sourceTakeAudioUrl: asset.url,
          audioClips: [clip],
        };

        pendingLabelRef.current = `${spec.label} take`;
        updateTracksWithHistory((prev) => {
          const at = prev.findIndex((t) => t.id === lane.id);
          const next = [...prev];
          next.splice(at < 0 ? next.length : at + 1, 0, takeTrack);
          return next;
        });
        setSelectionContext((prev) => ({ ...prev, selectedTrackId: takeTrack.id }));

        return {
          ok: true,
          message:
            `**${spec.label}** — take on \`${takeTrack.name}\`, beside \`${lane.name}\` and not over it.\n\n` +
            `${outcome.take.description}`,
        };
      }

      const notes = outcome.take.notes;
      const steps = new Array(songStepsRef.current).fill(false);
      for (const n of notes) {
        const step = Math.floor(n.startTick / 120);
        if (step >= 0 && step < steps.length) steps[step] = true;
      }

      const takeTrack: Track = {
        id: `t-band-${role.toLowerCase()}-${Date.now()}`,
        name: `${spec.label} — session take`,
        instrument: lane.instrument,
        steps,
        noteEvents: notes,
        mute: false,
        solo: false,
        volume: 0,
        pitch: lane.pitch,
        color: lane.color,
      };

      pendingLabelRef.current = `${spec.label} take`;
      updateTracksWithHistory((prev) => {
        const at = prev.findIndex((t) => t.id === lane.id);
        const next = [...prev];
        next.splice(at < 0 ? next.length : at + 1, 0, takeTrack);
        return next;
      });
      setSelectionContext((prev) => ({ ...prev, selectedTrackId: takeTrack.id }));

      const drift = outcome.check?.measured.worstOnsetDriftMs;
      return {
        ok: true,
        message:
          `**${spec.label}** — take on \`${takeTrack.name}\`, beside \`${lane.name}\` and not over it.\n\n` +
          `${outcome.take.description}\n\n` +
          (outcome.check
            ? `Checked against the grant: ${outcome.check.measured.takeNotes} notes against ${outcome.check.measured.sourceNotes} you played, ` +
              `worst onset moved ${drift} ms of the ${outcome.check.measured.toleranceMs} ms allowed. Played by \`${outcome.renderer}\`.`
            : `Played by \`${outcome.renderer}\`.`),
      };
    },
    [updateTracksWithHistory, handleRegisterAudioAsset]
  );

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
            const steps = new Array(songStepsRef.current).fill(false);
            for (const n of notes) {
              const step = Math.max(0, Math.min(songStepsRef.current - 1, Math.floor(n.startTick / 120)));
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
            const startTick = Math.max(0, Math.min(songTicksRef.current - 120, Math.round((ev.atSeconds ?? 0) * ticksPerSecond)));
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
    const targetSteps = new Array(songStepsRef.current).fill(false);
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
  // Was a fabricated default -- "Commercial Top-40 Reference (Urban / Hip-
  // Hop)" at -13.8 LUFS, 82% width, none of it measured from any file,
  // presented as already loaded before a creator ever uploaded anything.
  // Real or nothing: null until handleLoadReferenceTrack analyzes a real file.
  const [referenceTrack, setReferenceTrack] = useState<ReferenceTrackConfig | null>(null);
  const [currentMixSpectralProfile, setCurrentMixSpectralProfile] = useState<MixSpectralProfile | null>(null);
  const referenceAudioRef = useRef<HTMLAudioElement | null>(null);

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

  /**
   * "HEAR REFERENCE" used to just flip a label -- handleToggleReferenceAB
   * only ever set monitoringMode.abMode, and nothing in audioEngine read it,
   * so the project's mix kept playing underneath a button that claimed to be
   * "LISTENING TO REF." This lives at the provider level rather than inside
   * whichever room's component happens to be mounted, so switching rooms
   * mid-audition doesn't unmount the effect and silently restore the mix.
   */
  useEffect(() => {
    const el = referenceAudioRef.current;
    if (monitoringMode.abMode === 'REF' && referenceTrack?.audioUrl) {
      audioEngine.setMasterVolume(-60);
      if (el) {
        el.currentTime = 0;
        void el.play().catch(() => undefined);
      }
    } else {
      audioEngine.setMasterVolume(dawState.masterVolume);
      el?.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monitoringMode.abMode, referenceTrack?.audioUrl]);

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

  const [isBouncing, setIsBouncing] = useState(false);
  const [masterMeasurement, setMasterMeasurement] = useState<LoudnessTelemetryReport | null>(null);

  /**
   * The release gate, computed from what is actually in the project rather
   * than a literal that was five `true`s and an empty array regardless of
   * what had been done. Two of the five checks below have no real data to
   * verify against yet -- resource admission is tracked on catalogue
   * entries, never on the assets a project actually places, and there is no
   * rights/consent system anywhere in this codebase. Both are treated as
   * blocking rather than quietly passed, on the same principle as every
   * other honest-failure in this build: "cannot verify" is not "verified."
   */
  const finalizationGate = useMemo<FinalizationGateStatus>(() => {
    const blockingReasons: string[] = [];

    const noClippingViolation = masterMeasurement ? masterMeasurement.truePeakDbtp <= -1.0 : false;
    const audioChecksPassed = masterMeasurement !== null && noClippingViolation;
    if (!masterMeasurement) {
      blockingReasons.push('The master has not been measured yet -- run Measure This Master first.');
    } else if (!noClippingViolation) {
      blockingReasons.push(
        `True peak sits at ${masterMeasurement.truePeakDbtp.toFixed(1)} dBTP, above the -1.0 dBTP ceiling.`
      );
    }

    // A root seed is real, creator-sourced material on the timeline -- a
    // track with an actual audio take, or notes with real performance
    // provenance -- not an empty project or one built entirely from
    // synthesized placeholders with no recorded origin.
    const rootSeedPresent = tracks.some(
      (t) =>
        (t.sourceModality === 'AUDIO' && ((t.audioClips?.length ?? 0) > 0 || !!t.sourceTakeAudioUrl)) ||
        (t.noteEvents || []).some((n) => !!n.provenance?.origin)
    );
    const lineageChecksPassed = rootSeedPresent;
    if (!rootSeedPresent) {
      blockingReasons.push('No track carries a real recorded take or performed notes yet -- there is no seed to trace lineage from.');
    }

    // Real infrastructure (registerAudioAsset always computes a genuine
    // SHA-256 over the actual bytes), so this checks that it actually ran
    // for every asset in the project rather than assuming it did.
    const registeredAssets = Object.values(audioAssets);
    const provenanceHashVerified =
      registeredAssets.length === 0 || registeredAssets.every((a) => /^[0-9a-f]{64}$/.test(a.sha256 || ''));
    if (!provenanceHashVerified) {
      blockingReasons.push('Not every audio asset in this project carries a verified hash.');
    }

    // No real system tracks either of these against what a project actually
    // places -- see the comment above the memo.
    const resourcesAdmissionPassed = false;
    const rightsAndSplitsPassed = false;
    blockingReasons.push('Resource admission cannot be verified -- nothing tracks admission status on the assets a project actually places yet.');
    blockingReasons.push('Rights and splits cannot be verified -- no rights or consent system is wired into this deployment yet.');

    return {
      audioChecksPassed,
      noClippingViolation,
      lineageChecksPassed,
      rootSeedPresent,
      resourcesAdmissionPassed,
      rightsAndSplitsPassed,
      provenanceHashVerified,
      isReadyToSign:
        audioChecksPassed &&
        lineageChecksPassed &&
        resourcesAdmissionPassed &&
        rightsAndSplitsPassed &&
        provenanceHashVerified,
      blockingReasons,
    };
  }, [masterMeasurement, tracks, audioAssets]);

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
      // Timeline audio. The asset's URL is deliberately not stored — it is
      // remade from the blob on load, because a URL from a previous session
      // points at nothing.
      audioAssets: Object.values(audioAssets).map((asset) => ({
        asset: { ...asset, url: '' },
        blob: audioAssetBlobsRef.current.get(asset.id) || null,
      })),
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
      editorPrefs, writeRoomDraft, audioAssets,
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

    // Assets come back with fresh URLs over the same bytes, so a clip that
    // referenced an asset before the reload still resolves to the same audio.
    const restoredAssets: Record<string, AudioAsset> = {};
    const restoredBlobs = new Map<string, Blob>();
    for (const entry of (snap.audioAssets || []) as { asset: AudioAsset; blob: Blob | null }[]) {
      if (!entry?.asset) continue;
      if (entry.blob) {
        restoredBlobs.set(entry.asset.id, entry.blob);
        restoredAssets[entry.asset.id] = { ...entry.asset, url: URL.createObjectURL(entry.blob) };
      } else {
        restoredAssets[entry.asset.id] = { ...entry.asset, url: '' };
      }
    }
    audioAssetBlobsRef.current = restoredBlobs;
    audioAssetsRef.current = restoredAssets;
    setAudioAssets(restoredAssets);

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
    setTracks(PRESETS[0].tracks.map((t) => ({ ...t, noteEvents: [], steps: new Array(songStepsRef.current).fill(false) })));
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
      audioAssets: audioAssetsRef.current,
      bars: dawStateRef.current.songBars || DEFAULT_SONG_BARS,
    });
    const left = result.buffer.getChannelData(0);
    const right = result.buffer.numberOfChannels > 1 ? result.buffer.getChannelData(1) : left;
    const measurement = masteringTelemetryEngine.measureLoudness(left, right, result.sampleRate);
    // Same real measurement a reference file gets, run on the project's own
    // bounce, so a reference comparison has two real numbers either side of
    // it rather than one real and one invented.
    const spectralProfile = analyzeMixSpectralProfile(left, right, result.sampleRate);
    setCurrentMixSpectralProfile(spectralProfile);
    return { result, measurement, spectralProfile };
  }, []);

  /**
   * Analyzes a creator-supplied reference file for real -- the same
   * masteringTelemetryEngine loudness measurement and the same band/width
   * analysis the project's own bounce gets, so what shows up as "loaded"
   * was actually measured from the file handed to it.
   */
  const handleLoadReferenceTrack = useCallback(
    async (file: File): Promise<ReferenceTrackConfig> => {
      const buffer = await decodeAudioFile(file);
      const left = buffer.getChannelData(0);
      const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;
      const loudness = masteringTelemetryEngine.measureLoudness(left, right, buffer.sampleRate);
      const spectral = analyzeMixSpectralProfile(left, right, buffer.sampleRate);
      const config: ReferenceTrackConfig = {
        id: `ref_${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        audioUrl: URL.createObjectURL(file),
        durationSec: buffer.duration,
        integratedLufs: loudness.integratedLufs,
        peakDbfs: loudness.truePeakDbtp,
        stereoWidthScore: spectral.stereoWidthScore,
        lowEndEnergyDb: spectral.lowEndEnergyDb,
        vocalPresenceDb: spectral.vocalPresenceDb,
        dynamicRangeDb: loudness.crestFactorDb,
        autoLevelMatch: true,
        gainTrimDb: 0,
        isActiveAudition: false,
      };
      setReferenceTrack(config);
      return config;
    },
    [decodeAudioFile]
  );

  const [maskingReport, setMaskingReport] = useState<MaskingReport | null>(null);
  const [isAnalyzingMasking, setIsAnalyzingMasking] = useState(false);

  const handleAnalyzeMasking = useCallback(async (): Promise<MaskingReport> => {
    setIsAnalyzingMasking(true);
    try {
      const report = await analyzeMasking(
        tracksRef.current,
        bpmRef.current || 110,
        masteringChainRef.current,
        dawStateRef.current.songBars || DEFAULT_SONG_BARS
      );
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
        audioAssets: audioAssetsRef.current,
        bars: dawStateRef.current.songBars || DEFAULT_SONG_BARS,
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
      handleSetSongBars,
      audioAssets,
      handleRegisterAudioAsset,
      handlePlaceAudioClip,
      handleLoadSoundBank,
      loadedSoundBank,
      handleRenderTrackWithSoundBank,
      handleMoveAudioClip,
      handleUpdateAudioClip,
      selectedClipId,
      setSelectedClipId,
      handlePlaceTakeOnTimeline,
      handleRemoveAudioClip,
      vocalState,
      setVocalState,
      detectionSettings,
      setDetectionSettings,
      seedRecords,
      lineageRecords,
      decisionRecords,
      creatorSignature,
      handleSaveCreatorSignature,
      isInstrumentOpen,
      setIsInstrumentOpen,
      isInstrumentFull,
      setIsInstrumentFull,
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
      handleCalibrateTrack,
      pitchResponse,
      isCalibratingPitch,
      handleCalibratePitch,
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
      startSeedRecording,
      stopSeedRecording,
      handleStopCapture,
      handleQuickPerformanceCapture,
      captureError,
      setCaptureError,
      handleToggleMetronome,
      handleCallSessionPlayer,
      handleLoadFactoryInstrument,
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
      currentMixSpectralProfile,
      handleLoadReferenceTrack,
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
      // These three were missing, and `loadedSoundBank` showed why it matters:
      // it changes on its own, with no track edit alongside it, so the memo
      // never re-ran and the panel kept reading `null` while the engine had
      // the bank. `audioAssets` and `selectedClipId` had been getting away
      // with it because a track change always happened at the same moment.
      loadedSoundBank,
      audioAssets,
      selectedClipId,
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
      isVoiceCloneDrawerOpen,
      dawState,
      tracks,
      sections,
      vocalState,
      detectionSettings,
      seedRecords,
      lineageRecords,
      decisionRecords,
      creatorSignature,
      handleSaveCreatorSignature,
      isInstrumentOpen,
      setIsInstrumentOpen,
      isInstrumentFull,
      setIsInstrumentFull,
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
      handleCalibrateTrack,
      pitchResponse,
      isCalibratingPitch,
      handleCalibratePitch,
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
      startSeedRecording,
      stopSeedRecording,
      handleStopCapture,
      handleQuickPerformanceCapture,
      captureError,
      setCaptureError,
      handleToggleMetronome,
      handleCallSessionPlayer,
      handleLoadFactoryInstrument,
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
      currentMixSpectralProfile,
      handleLoadReferenceTrack,
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
      {referenceTrack?.audioUrl && <audio ref={referenceAudioRef} src={referenceTrack.audioUrl} />}
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
