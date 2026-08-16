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
  MasterDeliveryManifest,
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
import { detectionEngine } from '../audio/detectionEngine';
import { signatureService } from '../lib/seedSignature';
import { CreativeResourceVaultModal } from '../components/CreativeResourceVaultModal';

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
  setIsInspectorOpen: (open: boolean) => void;
  isCalibrationOpen: boolean;
  setIsCalibrationOpen: (open: boolean) => void;
  isVisualizationOpen: boolean;
  setIsVisualizationOpen: (open: boolean) => void;
  isVaultModalOpen: boolean;
  setIsVaultModalOpen: (open: boolean) => void;
  isVoiceCloneDrawerOpen: boolean;
  setIsVoiceCloneDrawerOpen: (open: boolean) => void;


  // DAW Engine State
  dawState: DAWState;
  setDawState: React.Dispatch<React.SetStateAction<DAWState>>;
  tracks: Track[];
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
  sections: ArrangementSection[];
  setSections: React.Dispatch<React.SetStateAction<ArrangementSection[]>>;
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
  handleUndo: () => void;
  handleRedo: () => void;
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
  handleAddSeedRecord: (record: SeedSignatureRecord) => void;
  handleCommitCandidateTransaction: (result: CommitTransactionResult, targetTrackId?: string) => boolean;

  // Calibration State
  calibratingTrackId: string | null;
  setCalibratingTrackId: (id: string | null) => void;

  // Creator Info
  creatorName: string;

  // Source Track Creation & Extraction
  handleCreateSourceTrack: (modality: SourceModality) => void;
  handleExtractStemsFromSource: (sourceTrackId: string) => void;
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
  handleAddVocalTake: (trackId: string, takeData: Partial<VocalTake>) => void;
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
  handleTransposeNotes: (trackId: string, noteIds: string[], semitones: number) => void;
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
  handleUpdateMasteringProcessor: (slotId: string, params: Record<string, any>) => void;
  handleToggleMasteringProcessor: (slotId: string) => void;
  handleLoadMasteringPreset: (presetName: string) => void;
  handleAuditionMasterCandidate: (candidateId: string) => void;
  handleCommitMasterCandidate: (candidateId: string) => void;
  handleSignMasterSeedSignature: () => Promise<SeedSignatureRecord>;
  handleExportMasterDelivery: (format?: string) => MasterDeliveryManifest;

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
  const [past, setPast] = useState<Track[][]>([]);
  const [future, setFuture] = useState<Track[][]>([]);

  const updateTracksWithHistory = useCallback((action: Track[] | ((prev: Track[]) => Track[])) => {
    setTracks((prevTracks) => {
      const nextTracks = typeof action === 'function' ? action(prevTracks) : action;

      if (JSON.stringify(prevTracks) !== JSON.stringify(nextTracks)) {
        setPast((prevPast) => {
          const updated = [...prevPast, prevTracks];
          if (updated.length > 50) return updated.slice(1);
          return updated;
        });
        setFuture([]);
      }
      return nextTracks;
    });
  }, []);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const handleUndo = useCallback(() => {
    setPast((prevPast) => {
      if (prevPast.length === 0) return prevPast;
      const previousState = prevPast[prevPast.length - 1];
      const newPast = prevPast.slice(0, prevPast.length - 1);

      setTracks((currentTracks) => {
        setFuture((prevFuture) => [currentTracks, ...prevFuture]);
        return previousState;
      });

      return newPast;
    });
  }, []);

  const handleRedo = useCallback(() => {
    setFuture((prevFuture) => {
      if (prevFuture.length === 0) return prevFuture;
      const nextState = prevFuture[0];
      const newFuture = prevFuture.slice(1);

      setTracks((currentTracks) => {
        setPast((prevPast) => [...prevPast, currentTracks]);
        return nextState;
      });

      return newFuture;
    });
  }, []);

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
  useEffect(() => {
    tracksRef.current = tracks;
    detectionEngine.setTracks(tracks);
  }, [tracks]);

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
    (trackId: string, noteIds: string[], semitones: number) => {
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

    setTracks((prev) => [newSourceTrack, ...prev]);
    setSelectionContext((prev) => ({ ...prev, selectedTrackId: sourceTrackId }));
  }, [tracks]);

  const handleExtractStemsFromSource = useCallback((sourceTrackId: string) => {
    const sourceTrack = tracks.find((t) => t.id === sourceTrackId);
    if (!sourceTrack) return;

    const timestamp = Date.now();
    const modality = sourceTrack.sourceModality || 'MOUTH';
    let manifestedTracks: Track[] = [];

    if (modality === 'MOUTH') {
      // Mouth decomposes into full Beatbox & Harmonic stems
      const kickSteps = new Array(64).fill(false);
      [0, 6, 10, 12, 16, 22, 26, 28, 32, 38, 42, 44, 48, 54, 58, 60].forEach(i => kickSteps[i] = true);

      const snareSteps = new Array(64).fill(false);
      [4, 12, 20, 28, 36, 44, 52, 60, 14, 30, 46, 62].forEach(i => snareSteps[i] = true);

      const hatSteps = new Array(64).fill(false);
      for (let i = 0; i < 64; i += 2) hatSteps[i] = true;

      const bassSteps = new Array(64).fill(false);
      [0, 8, 16, 24, 32, 40, 48, 56].forEach(i => bassSteps[i] = true);

      const melodySteps = new Array(64).fill(false);
      [0, 3, 7, 10, 14, 16, 19, 23, 27, 30, 32, 35, 39, 42, 46, 48, 51, 55, 59, 62].forEach(i => melodySteps[i] = true);

      const melodyNotes = new Array(64).fill('C3');
      [0, 16, 32, 48].forEach(i => melodyNotes[i] = 'C3');
      [3, 19, 35, 51].forEach(i => melodyNotes[i] = 'Eb3');
      [7, 23, 39, 55].forEach(i => melodyNotes[i] = 'G3');
      [10, 27, 42, 59].forEach(i => melodyNotes[i] = 'Bb3');

      manifestedTracks = [
        { id: `t-ext-kick-${timestamp}`, name: 'Kick (Beatbox Extract)', instrument: 'kick', color: '#f59e0b', steps: kickSteps, mute: false, solo: false, volume: 0, pitch: 'C1' },
        { id: `t-ext-snare-${timestamp}`, name: 'Snare (Vocal Pop Extract)', instrument: 'snare', color: '#06b6d4', steps: snareSteps, mute: false, solo: false, volume: -2, pitch: 'C2' },
        { id: `t-ext-hat-${timestamp}`, name: 'Hi-Hat (Tss Extract)', instrument: 'hihat', color: '#10b981', steps: hatSteps, mute: false, solo: false, volume: -6, pitch: 'F#3' },
        { id: `t-ext-bass-${timestamp}`, name: '808 Bass (Throat Extract)', instrument: 'bass', color: '#06b6d4', steps: bassSteps, mute: false, solo: false, volume: -1, pitch: 'C1' },
        { id: `t-ext-melody-${timestamp}`, name: 'Melody (Hum Extract)', instrument: 'melody', color: '#a855f7', steps: melodySteps, notes: melodyNotes, mute: false, solo: false, volume: -4, pitch: 'C3' },
      ];
    } else if (modality === 'BODY') {
      // Body decomposes into Physical Rhythmic & Percussive stems
      const thumpSteps = new Array(64).fill(false);
      [0, 6, 12, 16, 22, 28, 32, 38, 44, 48, 54, 60].forEach(i => thumpSteps[i] = true);

      const clapSteps = new Array(64).fill(false);
      [4, 12, 20, 28, 36, 44, 52, 60].forEach(i => clapSteps[i] = true);

      const fingerTapSteps = new Array(64).fill(false);
      for (let i = 0; i < 64; i += 2) fingerTapSteps[i] = true;

      const rimSteps = new Array(64).fill(false);
      [2, 7, 10, 18, 23, 26, 34, 39, 42, 50, 55, 58].forEach(i => rimSteps[i] = true);

      manifestedTracks = [
        { id: `t-ext-thump-${timestamp}`, name: 'Kick / Thump (Chest Tap)', instrument: 'kick', color: '#f59e0b', steps: thumpSteps, mute: false, solo: false, volume: 0, pitch: 'C1' },
        { id: `t-ext-clap-${timestamp}`, name: 'Snare / Clap (Hand Clap)', instrument: 'snare', color: '#06b6d4', steps: clapSteps, mute: false, solo: false, volume: -2, pitch: 'C2' },
        { id: `t-ext-tap-${timestamp}`, name: 'Finger Drums (Surface Tap)', instrument: 'hihat', color: '#10b981', steps: fingerTapSteps, mute: false, solo: false, volume: -6, pitch: 'F#3' },
        { id: `t-ext-rim-${timestamp}`, name: 'Rimshot (Physical Knock)', instrument: 'percussion', color: '#ec4899', steps: rimSteps, mute: false, solo: false, volume: -4, pitch: 'D3' },
      ];
    } else if (modality === 'KEYS') {
      // Keys decomposes into MIDI Chords, Bass Root, and Lead Lines
      const chordSteps = new Array(64).fill(false);
      [0, 8, 16, 24, 32, 40, 48, 56].forEach(i => chordSteps[i] = true);
      const chordNotes = new Array(64).fill('C3');
      [0, 16, 32, 48].forEach(i => chordNotes[i] = 'Eb3');
      [8, 24, 40, 56].forEach(i => chordNotes[i] = 'G3');

      const bassRootSteps = new Array(64).fill(false);
      [0, 16, 32, 48].forEach(i => bassRootSteps[i] = true);

      const leadSteps = new Array(64).fill(false);
      [0, 3, 6, 10, 14, 16, 19, 22, 26, 30, 32, 35, 38, 42, 46, 48].forEach(i => leadSteps[i] = true);

      manifestedTracks = [
        { id: `t-ext-keys-chords-${timestamp}`, name: 'Keys / Chords (MIDI Transcribed)', instrument: 'melody', color: '#a855f7', steps: chordSteps, notes: chordNotes, mute: false, solo: false, volume: -3, pitch: 'C3' },
        { id: `t-ext-keys-bass-${timestamp}`, name: 'Bass Root (Extracted Line)', instrument: 'bass', color: '#06b6d4', steps: bassRootSteps, mute: false, solo: false, volume: -2, pitch: 'C1' },
        { id: `t-ext-keys-lead-${timestamp}`, name: 'Lead Melody (MIDI Solo)', instrument: 'melody', color: '#3b82f6', steps: leadSteps, mute: false, solo: false, volume: -4, pitch: 'G3' },
      ];
    } else if (modality === 'AUDIO') {
      // Audio decomposes into Separated Drums, Bass, Instrumental
      const drumSteps = new Array(64).fill(false);
      for (let i = 0; i < 64; i += 4) drumSteps[i] = true;
      const bassSteps = new Array(64).fill(false);
      [0, 8, 16, 24, 32, 40, 48, 56].forEach(i => bassSteps[i] = true);
      const musicSteps = new Array(64).fill(false);
      [0, 16, 32, 48].forEach(i => musicSteps[i] = true);

      manifestedTracks = [
        { id: `t-ext-aud-drums-${timestamp}`, name: 'Drums (Source Separated)', instrument: 'kick', color: '#f59e0b', steps: drumSteps, mute: false, solo: false, volume: 0, pitch: 'C1' },
        { id: `t-ext-aud-bass-${timestamp}`, name: 'Bass Stem (Source Separated)', instrument: 'bass', color: '#06b6d4', steps: bassSteps, mute: false, solo: false, volume: -2, pitch: 'C1' },
        { id: `t-ext-aud-music-${timestamp}`, name: 'Instruments / Harmony (Separated)', instrument: 'melody', color: '#3b82f6', steps: musicSteps, mute: false, solo: false, volume: -4, pitch: 'C3' },
      ];
    } else if (modality === 'LYRICS') {
      // Lyrics decomposes into Cadence Grid & Vocal Pocket Guide
      const cadenceSteps = new Array(64).fill(false);
      [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62].forEach(i => cadenceSteps[i] = true);

      manifestedTracks = [
        { id: `t-ext-lyric-cadence-${timestamp}`, name: 'Lead Vocal Cadence Guide', instrument: 'vocal_synth', color: '#ec4899', steps: cadenceSteps, mute: false, solo: false, volume: 0, pitch: 'C3' },
        { id: `t-ext-lyric-harmony-${timestamp}`, name: 'Vocal Pocket & Rhyme Stem', instrument: 'vocal_synth', color: '#8b5cf6', steps: cadenceSteps.map((s, idx) => idx % 4 === 0), mute: false, solo: false, volume: -3, pitch: 'E3' },
      ];
    }

    // Attach explicit lineage metadata to every manifested child track
    manifestedTracks = manifestedTracks.map((tr) => ({
      ...tr,
      parentSourceTrackId: sourceTrackId,
      sourceAsset: {
        id: `asset_${timestamp}_${tr.instrument}`,
        takeName: `${sourceTrack.name} (Take 1)`,
        sampleRate: 48000,
        rhythmMatch: 0.98,
        onsets: tr.steps.filter(Boolean).length,
        parentSeedId: sourceTrackId,
        lineageParent: sourceTrack.name,
      },
    }));

    // Record immutable lineage in session history
    const lineageEntry: AssetLineageRecord = {
      lineageId: `lin_${timestamp}`,
      commitTransactionId: `tx_${timestamp}`,
      assetId: `manifest_${timestamp}`,
      sourceAssetId: sourceTrackId,
      candidateId: `cand_${timestamp}`,
      operationType: 'EXTRACTION_DECOMPOSITION',
      backend: 'SoulSonusPerformanceTransfer',
      modelVersion: 'ACE_DSP_v2',
      intentContractProfileId: 'profile_extraction',
      seedSignatureRecordId: `sig_${timestamp}`,
      timestamp,
    };
    setLineageRecords((prev) => [lineageEntry, ...prev]);

    setTracks((prev) => {
      const idx = prev.findIndex(t => t.id === sourceTrackId);
      if (idx === -1) return [...prev, ...manifestedTracks];
      const updatedSource = {
        ...sourceTrack,
        mute: true, // Mute original so creator hears manifested stems, but NEVER destroy original!
        decompositionManifest: {
          manifestId: `manif_${timestamp}`,
          sourceTrackId,
          timestamp,
          extractedTracks: manifestedTracks.map(t => ({
            instrument: t.instrument,
            name: t.name,
            steps: t.steps,
            notes: t.notes,
            confidence: 0.98,
            proposedSoundPreset: t.name,
          }))
        }
      };
      const copy = [...prev];
      copy[idx] = updatedSource;
      copy.splice(idx + 1, 0, ...manifestedTracks);
      return copy;
    });
  }, [tracks]);

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

    setTracks((prev) => {
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
  const handleAddVocalTake = useCallback((trackId: string, takeData: Partial<VocalTake>) => {
    const timestamp = Date.now();
    const newTake: VocalTake = {
      id: takeData.id || `take_${timestamp}`,
      takeId: takeData.takeId || `take_${timestamp}`,
      trackId,
      takeNumber: (takeData.takeNumber || 1),
      name: takeData.name || `Take ${(takeData.takeNumber || 1)}`,
      sourceAudioId: takeData.sourceAudioId || `ast_vox_${timestamp}`,
      rawAudioAssetId: takeData.rawAudioAssetId || `raw_ast_vox_${timestamp}`,
      sectionId: takeData.sectionId || 'sec_hook',
      recordedAt: timestamp,
      timelineStart: takeData.timelineStart || 13,
      timelineEnd: takeData.timelineEnd || 20,
      duration: takeData.duration || 8.7,
      isActive: false,
      isScratchVocal: takeData.isScratchVocal || false,
      rating: takeData.rating || 4,
      waveformData: takeData.waveformData || [0.2, 0.4, 0.7, 0.9, 0.6, 0.8, 0.5, 0.3, 0.7, 0.9, 0.8, 0.4],
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
    setTracks((prevTracks) =>
      prevTracks.map((t) => {
        if (t.id === trackId) {
          const currentDsp = t.dspSettings || {
            lowGain: 0,
            midGain: 0,
            highGain: 0,
            compressorThreshold: -18,
            compressorRatio: 3,
            reverbSend: 0.15,
            delaySend: 0.1,
            pan: 0,
            volume: t.volume || 0,
          };
          return {
            ...t,
            volume: updates.volume !== undefined ? updates.volume : t.volume,
            dspSettings: {
              ...currentDsp,
              ...updates,
            },
          };
        }
        return t;
      })
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
    return signature;
  }, [masterCandidates, activeMasterCandidateId, tracks, dawState.bpm, creatorName, acceptedMixPrint]);

  const handleExportMasterDelivery = useCallback((format: string = 'WAV_24_48'): MasterDeliveryManifest => {
    const activeCand = masterCandidates.find((c) => c.isCommittedMaster) || masterCandidates[0];
    return {
      packageId: `pkg_master_${Date.now()}`,
      projectName: 'Cyber Groove',
      masterVersion: '1.0.0',
      committedMasterCandidateId: activeCand.candidateId,
      mixPrintId: acceptedMixPrint.mixPrintId,
      seedSignatureHash: '0xsha256_master_seed_sig_' + Date.now(),
      formats: [
        { format: 'WAV 24-bit / 48kHz', sampleRate: '48000', bitDepth: '24', url: '/export/master_24_48.wav' },
        { format: 'WAV 24-bit / 44.1kHz', sampleRate: '44100', bitDepth: '24', url: '/export/master_24_44.wav' },
        { format: 'Lossless FLAC', sampleRate: '48000', bitDepth: '24', url: '/export/master.flac' },
        { format: 'MP3 320kbps', sampleRate: '44100', bitDepth: '16', url: '/export/master_320.mp3' },
      ],
      stems: tracks.map((t) => ({ trackName: t.name, role: t.instrument, url: `/export/stems/${t.id}.wav` })),
      generatedAt: new Date().toISOString(),
    };
  }, [masterCandidates, acceptedMixPrint, tracks]);

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
      isVoiceCloneDrawerOpen,
      setIsVoiceCloneDrawerOpen,

      dawState,
      setDawState,
      tracks,
      setTracks,
      sections,
      setSections,
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
      handleAddSeedRecord,
      handleCommitCandidateTransaction,
      calibratingTrackId,
      setCalibratingTrackId,
      creatorName,
      coproducerContext,
      handleCreateSourceTrack,
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
      handleUpdateMasteringProcessor,
      handleToggleMasteringProcessor,
      handleLoadMasteringPreset,
      handleAuditionMasterCandidate,
      handleCommitMasterCandidate,
      handleSignMasterSeedSignature,
      handleExportMasterDelivery,

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
      handleAddSeedRecord,
      handleCommitCandidateTransaction,
      calibratingTrackId,
      creatorName,
      coproducerContext,
      handleCreateSourceTrack,
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
      handleUpdateMasteringProcessor,
      handleToggleMasteringProcessor,
      handleLoadMasteringPreset,
      handleAuditionMasterCandidate,
      handleCommitMasterCandidate,
      handleSignMasterSeedSignature,
      handleExportMasterDelivery,
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
