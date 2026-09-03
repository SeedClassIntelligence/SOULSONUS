export type InstrumentType = 'kick' | 'snare' | 'melody' | 'hihat' | 'bass' | 'percussion' | 'vocal_synth' | 'custom';

export interface DetectionProfile {
  centerFreq: number; // Hz (e.g., 80Hz for sub kick, 2200Hz for snare, 150Hz for throat bass)
  q: number; // Bandwidth quality factor
  threshold: number; // Energy/RMS threshold 0..1
  isMelodic?: boolean; // If true, routes pitch tracker to MIDI notes
  lastCalibrated?: string;
}

export interface AutomationPoint {
  bar: number; // 1-indexed (e.g. 1..16)
  step: number; // 0..15 within bar
  value: number; // 0..1 normalized, or parameter-scaled
}

export interface AutomationLane {
  id: string;
  parameter: 'filterCutoff' | 'volume' | 'reverbSend' | 'delaySend' | 'pan' | 'glideTime' | 'drive';
  label: string;
  paramMin: number;
  paramMax: number;
  unit: string;
  points: AutomationPoint[];
  isEnabled: boolean;
}

export interface InstrumentParameters {
  attack: number; // ms
  decay: number; // ms
  sustain: number; // %
  release: number; // ms
  filterCutoff: number; // Hz
  filterResonance: number; // Q
  filterType: 'lowpass' | 'highpass' | 'bandpass';
  drive: number; // %
  glideTime: number; // ms
  subWeight: number; // dB
  timbreBrightness: number; // %
  sampleStart?: number; // %
  sampleEnd?: number; // %
  expression?: number; // 0..127
}

export interface TrackSourceAsset {
  id: string;
  takeName: string;
  sampleRate: number;
  rhythmMatch: number;
  onsets: number;
  parentSeedId: string;
  lineageParent: string;
}

/**
 * Every field is optional: the channel strip supplies a default for each one
 * (see `defaultTrackDsp` and `buildTrackStrip`), and partial settings objects
 * are written from several panels. Requiring them only forced callers to
 * restate defaults they did not mean to set.
 */
export interface TrackDspSettings {
  filterFreq?: number; // Cutoff Hz (20..20000)
  filterType?: 'lowpass' | 'highpass' | 'peaking';
  lowCutHz?: number; // Preamp HPF (20..200Hz)
  lowGain?: number; // dB (-12..+12)
  midFreqHz?: number; // Parametric Mid Freq (200..8000Hz)
  midQ?: number; // Q-Factor (0.1..10)
  midGain?: number; // dB (-12..+12)
  highGain?: number; // dB (-12..+12)
  compressorThreshold?: number; // dB (-60..0)
  compressorRatio?: number; // (1..20)
  reverbSend?: number; // (0..1)
  delaySend?: number; // (0..1)
  pan?: number; // (-1..1)
  volume?: number; // dB (-20..+6)
}

export type SourceModality = 'MOUTH' | 'BODY' | 'KEYS' | 'AUDIO' | 'LYRICS';

export type SeedType = 'ROOT_SEED' | 'CONTRIBUTION_SEED' | 'LAYER_SEED';

export type LayerOriginType =
  | 'MANUAL_SOUND_VAULT'
  | 'AI_PERFORMANCE_TRANSFER'
  | 'EXTRACTION_STEM'
  | 'SYNTHESIS'
  | 'ROOT_PERFORMANCE'
  | 'CONTRIBUTION_SEED';

export interface TrackLayer {
  id: string;
  name: string;
  soundId: string;
  soundName: string;
  volume: number; // dB (-20..+6)
  pan: number; // (-1..1)
  mute: boolean;
  solo: boolean;
  character: string;
  vaultLabel: string;
  sampleUrl?: string;
  sourceAssetId?: string;
  resourceAdmissionRecordId?: string;
  lineageId?: string;
  originType?: LayerOriginType;
  seedType?: SeedType;
  rootSeedId?: string;
  candidateId?: string;
  timbreParams?: {
    attack: number;
    decay: number;
    tuning: number;
    filterCutoff: number;
    saturation?: number;
  };
}

export interface ProductionScope {
  scopeType: 'ALL_SONG' | 'SECTION' | 'BAR_RANGE';
  sectionId?: string;
  startBar?: number;
  endBar?: number;
}

export interface SourceDecompositionManifest {
  manifestId: string;
  sourceTrackId: string;
  timestamp: number;
  extractedTracks: {
    instrument: InstrumentType;
    name: string;
    steps: boolean[];
    notes?: string[];
    confidence: number;
    proposedSoundPreset: string;
  }[];
}

export type PianoRollTool = 'POINTER' | 'PENCIL' | 'STRETCH' | 'SCISSOR' | 'ERASER';

export type TrackViewMode = 'GRID' | 'PIANO_ROLL';

export interface NoteProvenance {
  origin:
    | 'MOUTH'
    | 'BODY'
    | 'MIDI_KEYS'
    | 'IMPORTED_MIDI'
    | 'MANUAL'
    | 'AI_INTERPRETATION'
    /** A take from the session band. `playerRole` and `renderer` say who and what. */
    | 'SESSION_PLAYER';
  sourceAssetId?: string;
  interpretationId?: string;
  detectionConfidence?: number;
  creatorEdited: boolean;
  /** Which player produced this note, when a session player did. */
  playerRole?: string;
  /** What actually rendered it, named so a take is never mistaken for the creator's own hand. */
  renderer?: string;
}

export interface NoteExpression {
  pitchBend?: { tickOffset: number; semitones: number }[];
  onsetDeviationMs?: number;
  attackCurve?: 'linear' | 'exponential' | 'soft';
  releaseCurve?: 'linear' | 'exponential';
  articulation?: 'staccato' | 'legato' | 'accent' | 'normal';
}

export interface NoteEvent {
  id: string;
  startTick: number; // High-resolution musical time (480 PPQ, e.g. 0..7680 for 4 bars)
  durationTicks: number; // Note duration in ticks (120 = 16th, 240 = 8th, 480 = quarter, 960 = half...)
  midiNote: number; // Authoritative pitch (0..127, e.g. 60 = C4)
  velocity: number; // Velocity 0..127 (default 100)
  lyric?: string; // Optional syllable text attached to note
  probability?: number; // 0..1 trigger probability
  provenance: NoteProvenance;
  expression?: NoteExpression;
}

export interface Track {
  /** Audio placed on this track's timeline. Notes and clips can coexist. */
  audioClips?: AudioClip[];
  /** Where the sound came from. Read by the track lane's SOURCE label. */
  originType?: LayerOriginType;
  /** Vault preset name, written by the lane's sound selector. */
  vaultLabel?: string;
  id: string;
  name: string;
  instrument: InstrumentType;
  steps: boolean[]; // 64 steps (derived projection from noteEvents or fast trigger view)
  noteEvents?: NoteEvent[]; // Authoritative musical note events
  viewMode?: TrackViewMode; // 'GRID' | 'PIANO_ROLL' (defaults: drum -> GRID, melody/bass/vocal -> PIANO_ROLL)
  notes?: string[]; // pitch per step for melody (e.g. "C3", "E3", "G3")
  velocities?: number[]; // velocity per step (0..127)
  mute: boolean;
  solo: boolean;
  volume: number; // dB -20 to +6
  pitch: string; // default base note e.g. "C1" for kick, "C3" for melody
  color?: string; // Accent color hex
  detectionProfile?: DetectionProfile;
  dspSettings?: TrackDspSettings;
  instrumentParams?: InstrumentParameters;
  automationLanes?: AutomationLane[];
  sourceAsset?: TrackSourceAsset;
  waveformTakes?: { id: string; name: string; duration: number; waveformData: number[] }[];
  isSourceTrack?: boolean;
  sourceModality?: SourceModality;
  seedType?: SeedType;
  rootSeedId?: string;
  sourceTakeAudioUrl?: string;
  sourceLyricsText?: string;
  decompositionManifest?: SourceDecompositionManifest;
  parentSourceTrackId?: string;
  layers?: TrackLayer[];
  productionScope?: ProductionScope;
  vocalState?: VocalTrackState;
  vocalTakes?: VocalTake[];
  vocalComps?: VocalComp[];
  activeCompId?: string;
}

export interface DetectionSettings {
  enabled: boolean;
  micConnected: boolean;
  kickThreshold: number; // 0 to 1
  snareThreshold: number; // 0 to 1
  gain: number; // mic input amplification 1x to 5x
  currentLowLevel: number; // 0 to 1 for meter
  currentHighLevel: number; // 0 to 1 for meter
  lastKickTriggerTime: number;
  lastSnareTriggerTime: number;
  autoRecordToGrid: boolean; // Auto-place blocks on playhead during mic triggers
}

export interface RecordingInputSettings {
  inputDeviceId: string;
  sampleRate: number;
  bufferSize: number;
  monitoringEnabled: boolean;
  measuredRoundTripLatencyMs: number;
  latencyCompensationMs: number;
  inputGain: number; // dB
  countInBars: number;
  loopRecordingEnabled: boolean;
}

export interface PitchCorrectionSettings {
  enabled: boolean;
  key: string;
  scale: 'minor' | 'major' | 'chromatic' | 'pentatonic';
  strength: number; // 0 to 100%
  speed: number; // 0 to 100% (fast = hard snap, slow = natural drift)
  pitchDrift: number; // 0 to 100%
  formantPreserve: boolean;
  formantShift: number; // semitones (-12..+12)
  bypass: boolean;
}

export interface TimingCorrectionSettings {
  enabled: boolean;
  quantizeStrength: number; // 0 to 100%
  humanize: number; // 0 to 100%
  phraseNudgeMs: number; // -200..+200 ms
  stretchRatio: number; // 0.5x to 2.0x
}

export interface HarmonySettings {
  enabled: boolean;
  mode: 'third_above' | 'third_below' | 'fifth' | 'octave' | 'custom';
  customIntervalSemitones?: number[];
  humanizeCents: number; // 0..50 cents
  stereoSpread: number; // 0..100%
  vocalRole?: VocalTrackRole;
}

export type VocalCharacterType =
  | 'warm'
  | 'airy'
  | 'raspy'
  | 'intimate'
  | 'powerful'
  | 'breathy'
  | 'falsetto'
  | 'gritty'
  | 'smooth'
  | 'choir_stacked';

export interface VocalCharacterSettings {
  character: VocalCharacterType;
  breathiness: number; // 0..100%
  intimacy: number; // 0..100%
  grit: number; // 0..100%
  formantShift: number; // semitones (-12..+12)
  airShelf: number; // dB (-6..+6)
}

export interface CreativeReferenceProfile {
  id: string;
  referenceName: string;
  referenceCategory: 'LYRIC_WRITING' | 'VOCAL_PRODUCTION' | 'DRUM_POCKET' | 'ARRANGEMENT_STYLE';
  narrativePerspective: string;
  rhymeDensity: number; // 0..100%
  dictionStyle: 'conversational' | 'poetic' | 'rhythmic_chant' | 'soulful';
  melodicCadence: string;
  repetitionStrategy: string;
  declaredLicenseStatus: 'CREATOR_DECLARED_INFLUENCE' | 'LICENSED_STYLE_AGREEMENT' | 'OPEN_DOMAIN';
  attributionTerms?: string;
}

export type ExtractionTargetClass =
  | 'vocals'
  | 'backing_vocals'
  | 'drums'
  | 'kick'
  | 'snare'
  | 'bass'
  | 'guitar'
  | 'keyboard'
  | 'percussion'
  | 'strings'
  | 'synth'
  | 'brass'
  | 'woodwinds'
  | 'fx'
  // Named by the seed capture studio and the stem service; the union had
  // simply never been extended to match what the app extracts.
  | 'music'
  | 'keys';

export type TransformationOperationType =
  | 'REMIX_TIMBRE'
  | 'RECOMPOSE_HARMONY'
  | 'REPAINT_REGION'
  | 'ADD_PART_LEGO'
  | 'COMPLETE_ARRANGEMENT'
  | 'RETAKE_VARIATION'
  | 'BUILD_AROUND_VOCAL';

export interface RoleTimingTolerance {
  role: string;
  maxOnsetToleranceMs: number;
  minCrossCorrelation: number;
  minPitchContourTracking: number;
}

export interface ImportedAudioAsset {
  id: string;
  fileName: string;
  fileSize: number;
  durationSec: number;
  detectedBpm: number;
  detectedKey: string;
  detectedMeter: string;
  detectedInstruments: string[];
  waveformData: number[];
  isStemSeparated?: boolean;
  stems?: {
    drums?: number[];
    bass?: number[];
    vocals?: number[];
    music?: number[];
    strings?: number[];
    brass?: number[];
    keys?: number[];
    guitar?: number[];
    percussion?: number[];
    fx?: number[];
  };
  extractedClasses?: ExtractionTargetClass[];
  lineageHash: string;
  sourceType: 'RECORDED_LINE' | 'UPLOADED_BEAT' | 'FULL_SONG' | 'VOCAL_ACAPELLA';
}

export interface RemixLockSettings {
  mode: TransformationOperationType;
  keepTempo: boolean;
  lockedBpm: number;
  keepGroove: boolean;
  keepChords: boolean;
  keepMelody: boolean;
  keepArrangement: boolean;
  keepVocal: boolean;
  changeInstrumentation: boolean;
  changeGenre: boolean;
  targetGenreStyle?: string;
  scope: 'FULL_SONG' | 'SECTION' | 'BAR_RANGE';
  startBar?: number;
  endBar?: number;
  customInstructions?: string;
  timingToleranceMs?: number;
}

export interface VoiceIdentitySettings {
  profileId: string;
  profileName: string;
  rightsVerified: boolean;
  consentProofId?: string;
  licenseStatus: 'APPROVED' | 'GATED' | 'RESEARCH_ONLY';
  timbreBlend: number; // 0..100%
  formantShift: number; // semitones (-12..+12)
  breathiness: number; // 0..100%
  characterSettings?: VocalCharacterSettings;
  creativeReference?: CreativeReferenceProfile;
}

export interface VocalTrackState {
  isRecording: boolean;
  audioBlob: Blob | null;
  audioBuffer: AudioBuffer | null;
  waveformData: number[]; // Normalized amplitudes for waveform rendering
  duration: number; // in seconds
  volume: number; // dB -20 to +6
  mute: boolean;
  solo: boolean;
  delaySend: number; // 0 to 1
  reverbSend: number; // 0 to 1
  takes?: VocalTake[];
  activeTakeId?: string;
  comps?: VocalComp[];
  activeCompId?: string;
  pitchSettings?: PitchCorrectionSettings;
  timingSettings?: TimingCorrectionSettings;
  harmonySettings?: HarmonySettings;
  voiceIdentitySettings?: VoiceIdentitySettings;
  inputSettings?: RecordingInputSettings;
  punchRegion?: PunchRegion;
}

export type SoulFlowState =
  | 'CAPTURED'
  | 'INTERPRETED'
  | 'TRANSLATED'
  | 'SOUND_SELECTED'
  | 'COMPOSED'
  | 'REFINED'
  | 'COLLABORATED'
  | 'MIXED'
  | 'SIGNED'
  | 'EXPORTED';

export interface DAWState {
  isPlaying: boolean;
  isRecordingMic: boolean;
  isLooping: boolean;
  metronomeOn: boolean;
  bpm: number;
  currentStep: number; // 0 to 63
  masterVolume: number; // dB -20 to +6
  reverbLevel: number; // 0 to 1
  delayLevel: number; // 0 to 1
  swing: number; // 0 to 0.5
  activeBarView: 'all' | number; // which bar the sequencer is focused on, or all of them
  soulFlowState: SoulFlowState;
  projectName: string;
  /**
   * Song length in bars. Four is where a project starts, not where it stops —
   * every span that used to assume four bars derives from this.
   */
  songBars: number;
  /** Shown in the status bar and written into the delivery package. */
  projectVersion?: string;
  /** Bar the playhead is in, derived from currentStep where it is set. */
  currentBar?: number;
}

export interface Preset {
  id: string;
  name: string;
  bpm: number;
  description: string;
  tracks: Track[];
}

export interface Project {
  id: string;
  name: string;
  bpm: number;
  soulFlowState: SoulFlowState;
  tracks: Track[];
  vocalState?: VocalTrackState;
  lyricProject?: LyricProject;
  seedSignatureRecord?: SeedSignatureRecord;
}

export interface MidiAsset {
  id: string;
  trackId: string;
  name: string;
  steps: boolean[];
  notes?: string[];
  seedSignatureHash?: string;
}

// --- SoulSonus Master Architecture Models ---

export interface SeedSignatureRecord {
  id: string;
  commitTransactionId?: string;
  assetId: string;
  assetType: 'project' | 'audio' | 'midi' | 'training_profile' | 'stem' | 'contribution' | 'export';
  timestamp: string;
  hash: string;
  signerId: string;
  signerName: string;
  provenanceChain: string[];
  datasetLicenseStatus: 'COMPLIANT' | 'CONDITIONAL' | 'CUSTOM';
  status: 'VERIFIED' | 'PENDING' | 'REVOKED';
}


import type { StyleProfile } from '../lib/styleProfile';

export interface CreatorMusicSignature {
  id: string;
  creatorId: string;
  creatorName: string;
  version: string;
  createdDate: string;
  dictionary: {
    kickMouthSound: string;
    snarePopSound: string;
    hihatTssSound: string;
    vocalPitchRange: string;
  };
  /**
   * What the creator tuned the detector to. Null where they have not tuned it
   * -- these were `0.45` and `0.55` for every creator who ever signed, which
   * is a claim about a person nobody measured.
   */
  thresholds: {
    kickSensitivity: number | null;
    snareSensitivity: number | null;
    /**
     * Where this creator's pitched material actually sits, measured from a
     * calibration take rather than assumed.
     *
     * Basic Pitch ships thresholds tuned for instruments -- 0.50 onset, 0.30
     * frame. Measured against a mouth performance, the onset head peaked at
     * 0.484 and the frame head at 0.818: the pitch was plainly there and the
     * instrument-tuned gate rejected all of it, because a mouth attack is
     * softer than a plucked string. A percussive take, by contrast, peaked at
     * 0.416 onset and 0.323 frame and produced no notes at any threshold
     * down to 0.25, which is what makes a per-creator gate safe to lower.
     *
     * These are the creator's own measured peaks, so a threshold can be set
     * relative to their voice instead of to an absolute that fits nobody.
     * Null until they calibrate. Never defaulted.
     */
    pitchOnsetPeak: number | null;
    pitchFramePeak: number | null;
    /** The onset gate their calibration take was verified to clear. */
    pitchGate: number | null;
  };
  /** Sounds this creator actually reached for. Empty until they reach for one. */
  soundPreferences: string[];
  /** Everything measured about how they play, and what could not be measured. */
  style?: StyleProfile;
  signatureHash: string;
}

export type VocalTrackRole =
  | 'LEAD_VOCAL'
  | 'LEAD_DOUBLE'
  | 'HARMONY_HIGH'
  | 'HARMONY_LOW'
  | 'AD_LIB'
  | 'BACKGROUND_STACK'
  | 'SPOKEN'
  | 'REFERENCE_VOCAL';

export interface LyricLine {
  lineId: string;
  sectionId: string;
  bar: number; // 1-indexed
  text: string;
  syllables: string[];
  cadenceEmphasis: boolean[];
  cadenceRhythm?: 'on_beat' | 'syncopated_early' | 'syncopated_late' | 'triplet' | 'laid_back';
  rhymeSchemeTag?: string; // e.g. "A", "B", "A", "B"
  cadenceGrid?: { beat: number; subBeat: number; word: string; emphasized: boolean }[];
  status: 'draft' | 'final' | 'recorded';
}

export interface LyricVersion {
  versionId: string;
  versionName: string; // e.g. "Hook v1", "Hook v2 (More punch)"
  timestamp: number;
  lines: LyricLine[];
  author: 'CREATOR' | 'CO_PRODUCER_PROPOSAL';
  notes?: string;
}

export interface LyricSection {
  sectionId: string;
  sectionName: string;
  lines: LyricLine[];
  versions: LyricVersion[];
  activeVersionId: string;
}

export interface VocalTake {
  id: string;
  takeId?: string; // Alias
  trackId: string;
  takeNumber: number;
  name: string;
  sourceAudioId: string;
  rawAudioAssetId?: string;
  sectionId?: string;
  recordedAt: number;
  timelineStart: number; // bar
  timelineEnd: number; // bar
  duration: number; // seconds
  isActive: boolean;
  isScratchVocal?: boolean;
  rating?: number; // 1..5 stars
  waveformData: number[];
  lineageParentTakeId?: string;
  processingLineage?: string[];
  inputSettings?: RecordingInputSettings;
  pitchCorrectionApplied?: boolean;
  gainTrim?: number; // dB
}

export interface VocalCompSegment {
  segmentId: string;
  phraseId?: string;
  bar: number;
  takeId: string;
  sourceStart: number; // seconds or relative bar offset
  sourceEnd: number;
  timelineStart: number;
  timelineEnd: number;
  gainTrim: number; // dB
  crossfadeMs?: number;
}

export interface CompSegment extends VocalCompSegment {}

export interface VocalComp {
  id: string;
  compId?: string; // Alias
  trackId: string;
  sectionId: string;
  name: string;
  segments: VocalCompSegment[];
  active: boolean;
  createdAt: number;
  updatedAt: number;
  sourceTakeIds: string[];
}

export interface VocalSelectionContext {
  trackId: string;
  sectionId: string;
  phraseId?: string;
  barRange?: { startBar: number; endBar: number };
  takeId?: string;
  compId?: string;
}

export interface WriteRecordContext {
  projectId: string;
  projectVersionId: string;
  bpm: number;
  key: string;
  timeSignature: string;
  activeSectionId: string;
  sectionBarRange: { startBar: number; endBar: number };
  lyricSection?: LyricSection;
  selectedPhraseId?: string;
  vocalSelectionContext?: VocalSelectionContext;
  creatorSeedAssetId?: string;
  availableBeatSpace?: string;
  vocalTrack?: Track;
  takes?: VocalTake[];
  activeComp?: VocalComp;
}

export interface PunchRegion {
  isEnabled: boolean;
  startBar: number;
  startBeat: number;
  endBar: number;
  endBeat: number;
  preRollBars: number;
  postRollBars: number;
}

export interface SoundAsset {
  id: string;
  name: string;
  category: InstrumentType | 'percussion' | 'fx' | 'vocal_preset';
  voiceDescriptors: string[]; // e.g. ["fat", "meaty", "clean", "punchy"]
  sampleUrl?: string;
  license: string;
  provenance: string;
}

/**
 * A record in the sound library. Renamed from `AudioAsset` so that name could
 * go to the timeline asset below, which is a different thing: this describes a
 * browsable sound, that one describes immutable bytes on a track.
 */
export interface SoundLibraryAsset extends SoundAsset {
  audioBlob?: Blob;
  audioUrl?: string;
  duration?: number;
  seedSignatureHash?: string;
}

/**
 * Immutable audio in the project.
 *
 * An asset is never edited in place — a trim, a gain change or a new take makes
 * a clip that points at it, or a new asset derived from it. That is what makes
 * lineage checkable: the bytes behind `sha256` are the bytes that were rendered,
 * recorded or returned, and nothing can quietly change underneath a record that
 * claims them.
 */
export interface AudioAsset {
  id: string;
  name: string;
  sampleRate: number;
  channels: number;
  durationSeconds: number;
  byteLength: number;
  /** SHA-256 over the encoded bytes, computed once at registration. */
  sha256: string;
  originType: AudioAssetOrigin;
  /** What this was derived from. A fresh recording has none. */
  parentAssetIds: string[];
  createdAt: number;
  /**
   * Peak magnitudes across the whole asset, 0..1, for drawing. Computed once at
   * registration from the decoded audio — the alternative is decoding on every
   * render, or drawing a shape the audio does not have.
   */
  peaks: number[];
  /**
   * Object URL for playback. Rebuilt from the stored blob on load and never
   * persisted — a URL from a previous session points at nothing.
   */
  url: string;
}

export type AudioAssetOrigin =
  | 'RECORDED'
  | 'IMPORTED'
  | 'BOUNCED'
  | 'SEPARATED'
  | 'GENERATED';

/**
 * Audio placed on a track at a musical position.
 *
 * The audio counterpart of `NoteEvent`, and deliberately in the same tick
 * domain (480 PPQ) so a clip and a note describe position the same way. A track
 * may hold notes, clips, or both.
 */
export interface AudioClip {
  id: string;
  trackId: string;
  assetId: string;
  /** Timeline position in ticks — same domain as `NoteEvent.startTick`. */
  startTick: number;
  durationTicks: number;
  /** Which part of the asset sounds. Trimming moves these, never the asset. */
  sourceOffsetSeconds: number;
  sourceDurationSeconds: number;
  gainDb: number;
  fadeInMs: number;
  fadeOutMs: number;
  /** Set when the clip arrived as a realization candidate. */
  candidateId?: string;
  provenance: AudioClipProvenance;
}

export interface AudioClipProvenance {
  origin: AudioAssetOrigin;
  creatorEdited: boolean;
  /** Where it came from in the creator's terms, e.g. "Take 05 (Loop Capture)". */
  sourceDescription?: string;
}

export type DatasetAdmissionStatus = 'APPROVED' | 'APPROVED WITH CONDITIONS' | 'RESEARCH ONLY' | 'REJECTED';

export interface DatasetRegistryEntry {
  id: string;
  name: string;
  type: 'MODEL' | 'DATASET' | 'LIBRARY';
  category: string;
  license: string;
  commercialAllowed: boolean;
  attributionRequired: boolean;
  status: DatasetAdmissionStatus;
  notes: string;
  sourceUrl: string;
}

export type CollaboratorRole = 'owner' | 'producer' | 'vocalist' | 'rapper' | 'writer' | 'engineer' | 'viewer';

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: CollaboratorRole;
  joinedDate: string;
  avatarUrl?: string;
}

export interface Contribution {
  id: string;
  contributorId: string;
  contributorName: string;
  role: CollaboratorRole;
  contributionType: 'lead_vocal' | 'beat_pattern' | 'melody' | 'mix_preset' | 'lyrics';
  timestamp: string;
  status: 'accepted' | 'pending' | 'rejected';
  signatureHash: string;
  notes: string;
}

export interface LyricProject {
  title: string;
  lyrics: string;
  hookSuggestions: string[];
  verseSuggestions: string[];
  cadenceNotes: string;
  aiInfluenceAware: boolean;
}

export type SectionTag = 'Intro' | 'Verse' | 'Pre-Chorus' | 'Chorus' | 'Drop' | 'Bridge' | 'Breakdown' | 'Outro';

export interface ArrangementSection {
  id: string;
  name: string;
  tag: SectionTag;
  bars: number[]; // e.g. [1] or [1, 2] or [1, 2, 3, 4]
  energy: 'low' | 'medium' | 'high' | 'peak';
  color: string;
  trackMutes?: Record<string, boolean>; // trackId -> muted in this section
  description?: string;
}

export interface RightsRecord {
  ownerName: string;
  ownerSplitPercent: number;
  contributors: { name: string; role: string; splitPercent: number }[];
  licenseType: string;
  commercialRightsGranted: boolean;
  seedSignatureVerified: boolean;
}

export interface CloudProjectPackage {
  id: string;
  projectName: string;
  savedAt: string;
  bpm: number;
  soulFlowState: SoulFlowState;
  tracks: Track[];
  midiData: Array<{ trackId: string; name: string; notes: Array<{ step: number; pitch: string }> }>;
  vocalStemDataUrl?: string;
  vocalDuration?: number;
  seedSignatureRecords: SeedSignatureRecord[];
  masterSignatureHash: string;
  version: string;
}

export interface EngineDescriptor {
  id: string; // E01..E16
  name: string;
  category: 'Expression' | 'Musical' | 'Governance';
  description: string;
}

export const ENGINE_REGISTRY: EngineDescriptor[] = [
  { id: 'E01', name: 'Acoustic Capture Engine', category: 'Expression', description: 'Raw microphone & vocal transient audio recording' },
  { id: 'E02', name: 'Expression & Transient Interpretation Engine', category: 'Expression', description: 'Onset detection & mouth/throat frequency profiling' },
  { id: 'E03', name: 'Pitch, Rhythm & Musical Analysis Engine', category: 'Expression', description: 'Autocorrelation & Basic Pitch transcription' },
  { id: 'E04', name: 'CLAP Semantic Matching Engine', category: 'Expression', description: 'Natural-language descriptor catalog matching' },
  { id: 'E05', name: 'Music Realization Engine', category: 'Musical', description: 'Sample, synth, DSP, and generative sound realization' },
  { id: 'E06', name: 'Composition & Pattern Engine', category: 'Musical', description: '64-Step grid matrix & Shoot Around pattern transformations' },
  { id: 'E07', name: 'Arrangement & Timeline Engine', category: 'Musical', description: 'Song section timeline (Intro, Verse, Hook, Chorus, Outro)' },
  { id: 'E08', name: 'Lyric & Cadence Engine', category: 'Musical', description: 'Rhyme, phrasing, cadence mapping & AI writing assist' },
  { id: 'E09', name: 'Vocal Take Stack Engine', category: 'Musical', description: 'Lead, harmonies, ad-libs & synchronized transport recorder' },
  { id: 'E10', name: 'Dynamic Multi-Track Mixing Engine', category: 'Musical', description: 'Registry-driven channel strips, EQ, compression, pan & gain' },
  { id: 'E11', name: 'Master Bus & DSP Limiter Engine', category: 'Musical', description: 'Master Limiter (-0.5dB), reverb/delay sends & spectrum analysis' },
  { id: 'E12', name: 'SoulFlow Governor Engine', category: 'Governance', description: '10-stage creation lifecycle state machine' },
  { id: 'E13', name: 'Creator Music Signature Engine', category: 'Governance', description: '7-pillar personal creative intelligence profile' },
  { id: 'E14', name: 'SeedSignature Cryptographic Engine', category: 'Governance', description: 'SHA-256 cryptographic provenance hashing' },
  { id: 'E15', name: 'Rights & Attribution Engine', category: 'Governance', description: 'Creator splits, usage terms & contribution review' },
  { id: 'E16', name: 'Dataset Governance & Admission Engine', category: 'Governance', description: 'Open-source license compliance & dataset admission' },
];

export type WorkspaceTab = 'CREATE' | 'BUILD' | 'WRITE_RECORD' | 'MIX' | 'MASTER' | 'RELEASE' | 'FINISH';

export interface SelectionContext {
  selectedTrackId: string | null;
  selectedSectionId: string | null;
  selectedBarRange: { start: number; end: number } | null;
  selectedAssetId: string | null;
  selectedWorkspace: WorkspaceTab;
  focusTrackId: string | null;
  selectedNoteIds?: string[];
  activePianoRollTrackId?: string | null;
}

export interface CoproducerContext {
  workspace: WorkspaceTab;
  soulFlowState: SoulFlowState;
  selectedSection: string | null;
  selectedTrack: string | null;
  selectedObject: string | null;
  creatorIntent: string | null;
  currentAction: string | null;
  lockedProperties: string[];
  mutableProperties: string[];
  projectId: string;
  projectVersionId: string;
}

export type IntelligenceLaneTab = 'SOURCE' | 'MIDI' | 'SOUND' | 'REALIZE' | 'TRANSFORM' | 'FX';

export interface RealizationScoreMap {
  rhythm: number;        // 0.0 - 1.0 threshold
  timing: number;        // 0.0 - 1.0 threshold
  pitchContour: number;  // 0.0 - 1.0 threshold
  articulation: number;  // 0.0 - 1.0 threshold
}

/**
 * How a candidate's preservation scores were arrived at.
 *
 * - MEASURED: computed by comparing the realized audio against the source take.
 * - BY_CONSTRUCTION: entailed by the route rather than measured -- triggering a
 *   one-shot sample preserves timing exactly because that is what triggering a
 *   sample does. Honest, but not a reading, and shown as such.
 * - NOT_MEASURED: no realization happened, or no comparison was run.
 */
export type RealizationScoreBasis = 'MEASURED' | 'BY_CONSTRUCTION' | 'NOT_MEASURED';

export interface IntentThresholdPolicy {
  rhythm: number;
  timing: number;
  pitchContour: number;
  articulation: number;
}

export interface IntentContractProfile {
  operationType: 'PERFORMANCE_TRANSFER' | 'SOUND_REALIZATION' | 'REPAINT' | 'ADD_LAYER';
  preservedProperties: string[];
  mutableProperties: string[];
  thresholds: IntentThresholdPolicy;
  hardConstraints: string[];
  softConstraints: string[];
  failurePolicy: 'REJECT_TO_PREVIEW_ONLY' | 'REJECT_HARD';
}

export interface IntentViolation {
  property: keyof RealizationScoreMap;
  score: number;
  requiredThreshold: number;
}

export type RealizerBackend =
  | 'SampleRealizer'
  | 'SynthRealizer'
  | 'DSPRealizer'
  | 'ACERealizer'
  | 'ExternalHardwareRealizer'
  | 'SoulSonusPerformanceTransfer'
  | 'SoulSonusNativeRealizer';

export type RealizationRoute =
  | 'ORIGINAL'
  | 'SAMPLE'
  | 'INSTRUMENT'
  | 'SYNTH'
  | 'ACE_PERFORMANCE_TRANSFER'
  | 'ACE_STEM_EXTRACTION'
  | 'ACE_REPAINT'
  | 'ACE_GENERATIVE_EXTENSION';

export type CandidateGovernanceState =
  /**
   * Proposed but not realized: no audio exists and nothing has been measured.
   * This state was missing, and its absence is why the candidate path could
   * present an unrealized proposal as a passing candidate with a score.
   */
  | 'UNREALIZED'
  | 'GENERATED'
  | 'CONTRACT_EVALUATED'
  | 'PASS_CANDIDATE'
  | 'REJECTED_PREVIEW_ONLY'
  | 'CREATOR_ACCEPTED'
  | 'CREATOR_REJECTED'
  | 'COMMITTED';

export type CreatorDecision = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface AssetLineageRecord {
  lineageId: string;
  commitTransactionId: string;
  assetId: string;
  sourceAssetId: string;
  candidateId: string;
  operationType: string;
  backend: RealizerBackend;
  modelVersion: string;
  intentContractProfileId: string;
  seedSignatureRecordId: string;
  timestamp: number;
}

/**
 * One turn in the conversation about a gap.
 *
 * The creator's turns are stored as typed, verbatim. They are never parsed
 * into a category, scored, matched against a vocabulary, or required to be
 * structured before they count. Amendment B.6: unformalized human knowing is
 * not deficient data waiting to be cleaned up. It is the data.
 */
export interface RelayExchange {
  exchangeId: string;
  at: number;
  /**
   * Who spoke. The studio may only answer with things it actually measured --
   * there is no language model on this path, and inventing a co-producer's
   * reply would be worse than leaving the thread open.
   */
  from: 'creator' | 'studio';
  /** Said as it was said. */
  words: string;
  /** For a studio turn: the measurements the words came from. Empty for a creator turn. */
  basis?: string[];
}

/**
 * What the creator heard, when it was not what came back.
 *
 * Amendment B calls this the highest-value signal in a session. Before this
 * record existed, rejecting a candidate called `setIsCandidateDrawerOpen(false)`
 * and nothing else: the drawer shut, no decision was written, and the fact that
 * a creator had rejected something left no trace at all. `REJECTED` was a value
 * in `CreatorDecision` that no code path ever produced. The retrofit plan said
 * the gap was stored as one bit; it was stored as none.
 *
 * B.2 forbids a single bit, so this is a record. B.3 forbids a one-shot
 * verdict, so it carries a thread. B.4 requires it to be attributable and to
 * survive the session, so it is signed and rides in the project snapshot with
 * the decision records that already persist.
 */
export interface RelayGapRecord {
  gapId: string;
  candidateId: string;
  openedAt: number;
  /** Who felt it. B.4: the verdict is attributable, not anonymous telemetry. */
  attributedTo: string;
  /** The first statement, verbatim and unparsed. B.1. */
  inCreatorWords: string;
  /** Everything said since, oldest first. B.3. */
  exchange: RelayExchange[];
  /**
   * Closed only when the creator says it is closed.
   *
   * Nothing in the system may resolve this on their behalf -- not a passing
   * score, not a later accept, not a new candidate that measures better.
   * B.5: relay fidelity outranks every self-referential machine metric, and a
   * metric closing this record would be exactly that inversion.
   */
  resolvedByCreator: boolean;
  resolvedAt?: number;
}

export interface GenerationDecisionRecord {
  decisionId: string;
  commitTransactionId: string;
  candidateId: string;
  decision: CreatorDecision;
  overrideIntentContract: boolean;
  overrideReason?: string;
  /**
   * What the creator heard instead. Present on a rejection they spoke to, and
   * on an acceptance they still had something to say about -- accepting a
   * take does not mean it landed.
   */
  relayGap?: RelayGapRecord;
  timestamp: number;
}

export interface GenerationCandidate {
  candidateId: string;
  audioAssetId: string;
  audioArtifactUrl?: string;
  realizationRoute?: RealizationRoute;
  targetRole?: string;
  /**
   * The bars this candidate was scoped to, if it was scoped. Absent means the
   * whole take. Clause XI.6 -- shown to the creator in the bars they said,
   * not in the seconds the realizer takes.
   */
  regionBars?: [number, number];
  prompt?: string;
  sourceProjectVersionId: string;
  committedProjectVersionId?: string;
  commitTransactionId?: string;
  idempotencyKey?: string;
  preservedProperties: string[];
  modifiedProperties: string[];
  /**
   * Null when nothing was measured. It is nullable on purpose: the previous
   * shape made a score mandatory, so every path with no measurement had to
   * invent one, and the UI could not tell an invention from a reading.
   */
  preservationScores: RealizationScoreMap | null;
  /** Where the scores came from. Required, so an invented number has nowhere to hide. */
  scoreBasis: RealizationScoreBasis;
  violations: IntentViolation[];
  backend: RealizerBackend;
  modelVersion: string;
  seed: number | null;
  /** Null when the contract could not be evaluated, because nothing was measured. */
  passedIntentContract: boolean | null;
  overrideIntentContract: boolean;
  overrideReason?: string;
  overrideTimestamp?: number;
  creatorDecision: CreatorDecision;
  governanceState: CandidateGovernanceState;
  createdTimestamp: number;
}

export interface CommitTransactionResult {
  committed: boolean;
  commitTransactionId?: string;
  idempotencyKey?: string;
  candidate: GenerationCandidate;
  committedProjectVersionId?: string;
  lineageRecord?: AssetLineageRecord;
  decisionRecord?: GenerationDecisionRecord;
  seedSignatureRecord?: SeedSignatureRecord;
  commitTimestamp?: number;
  reason?: string;
}



export interface RealizationResult {
  candidate: GenerationCandidate;
  audioAssetId: string;
  preservedProperties: string[];
  modifiedProperties: string[];
  preservationScores: RealizationScoreMap | null;
  scoreBasis: RealizationScoreBasis;
  violations: IntentViolation[];
  backend: RealizerBackend;
  modelVersion: string;
  seed: number | null;
  passedIntentContract: boolean | null;
}

// --- Rights, recorded ---
//
// The R01-R10 "governed vaults" this replaced were a browsing fiction: ten
// vault names, a `CreativeResource` shape, and rows badged COMMERCIAL
// APPROVED against admission records that were never written. The vault names
// are gone with the screen that showed them. This record stayed, because it
// is the one thing in that model that was worth having -- what a licence
// actually permits, per asset, with a checksum tying it to bytes.

export type ResourceAdmissionStatus =
  | 'APPROVED'
  | 'APPROVED_WITH_CONDITIONS'
  | 'PERSONAL_USE'
  | 'RESEARCH_ONLY'
  | 'REJECTED';

export interface ResourceAdmissionRecord {
  admissionRecordId: string;
  resourceId: string;
  sourceUrl?: string;
  creator: string;
  license: string;
  commercialAllowed: boolean;
  redistributionAllowed: boolean;
  attributionRequired: boolean;
  trainingPermission: boolean;
  marketplacePermission: boolean;
  sha256Checksum: string;
  admissionStatus: ResourceAdmissionStatus;
  admissionNotes: string;
}

// --- Capability Admission & Decoupling Models ---

export type CapabilityStatus =
  | 'planned'
  | 'benchmarking'
  | 'experimental'
  | 'admitted'
  | 'rejected'
  | 'deprecated';

export interface CapabilityAdmission {
  capabilityId: string; // e.g. 'CAP-006'
  status: CapabilityStatus;
  engineId: string; // e.g. 'E05'
  adapterId: string | null; // e.g. 'ACERepaintAdapter'
  version: string | null;
  admittedAt?: number;
}

export interface AceCapabilityManifest {
  repositoryUrl: string;
  frozenCommitSha: string;
  license: string;
  checkpoint: string;
  capabilityId: string;
  sourceFile: string;
  evidenceClass: 'V' | 'D' | 'I' | 'H' | 'U';
}

export interface TransformationRecord {
  transformationId: string;
  type: 'deeper' | 'retake' | 'repaint' | 'reinstrument' | 'add_layer';
  timestamp: number;
  description: string;
  parameters: Record<string, any>;
  previousCandidateId: string;
  resultCandidateId: string;
}

export interface IntelligenceLane {
  id: string;
  name: string;
  role: 'kick' | 'snare' | 'bass' | 'lead' | 'vocal' | 'harmony' | 'keys' | 'fx';
  source: {
    micBufferId: string | null;
    rawWaveformUrl?: string;
    micTakeTimestamp?: number;
  };
  interpretation: {
    detectedBpm: number;
    detectedKey: string;
    rhythmScore: number;
    timingScore: number;
    pitchScore: number;
  };
  realizations: GenerationCandidate[];
  activeRealizationId: string | null;
  transformations: TransformationRecord[];
  patternId: string | null;
  mixerChannelId: string;
  provenanceRefs: string[];
}

// --- External MIDI & Hardware I/O Types ---

export interface MidiDevice {
  id: string;
  name: string;
  manufacturer: string;
  type: 'input' | 'output';
  state: 'connected' | 'disconnected';
  channel?: number;
}

export interface MidiEventRecord {
  note: number; // 0..127
  noteName: string; // e.g. "C4"
  velocity: number; // 0..127
  timestampMs: number;
  durationMs: number;
  channel: number;
  ccValues?: Record<number, number>;
  pitchBend?: number;
  aftertouch?: number;
}

export interface HardwareRouteConfig {
  trackId: string;
  midiOutputDeviceId: string | null;
  midiOutputChannel: number; // 1..16
  midiClockSync: boolean;
  audioReturnInputDeviceId: string | null;
  latencyCompensationMs: number;
  monitoringEnabled: boolean;
}

export interface DawProductionBundle {
  manifestVersion: string;
  projectId: string;
  projectName: string;
  bpm: number;
  key: string;
  timeSignature: string;
  exportedAt: string;
  sections: { id: string; name: string; startBar: number; endBar: number }[];
  tracks: {
    id: string;
    name: string;
    instrument: string;
    volume: number;
    pan: number;
    stemAudioUrl?: string;
    midiNotes: { bar: number; beat: number; note: string; velocity: number; duration: number }[];
    layersCount: number;
    seedType: string;
  }[];
  masterLufsTarget: number;
  seedSignatureHash?: string;
}

// --- Step 4 MIX Multichannel Console Types ---

export type InsertPluginCategory = 'dynamics' | 'eq' | 'saturation' | 'filter' | 'spatial' | 'modulation' | 'utility';

export interface InsertSlot {
  slotId: string;
  pluginId: string;
  pluginName: string;
  category: InsertPluginCategory;
  bypassed: boolean;
  orderIndex: number;
  parameters: Record<string, number | string | boolean>;
}

export interface AuxSendConfig {
  sendId: 'send_a' | 'send_b' | 'send_c';
  destination: 'plate_reverb' | 'slap_delay' | 'parallel_crush' | 'custom';
  name: string;
  level: number; // 0..1
  prePost: 'pre' | 'post';
  bypassed: boolean;
}

export interface MixBusChannel {
  id: string;
  name: string;
  type: 'drum_bus' | 'vocal_bus' | 'music_bus' | 'fx_bus' | 'mix_bus' | 'master';
  volume: number; // dB (-40..+6)
  pan: number; // -1..1
  mute: boolean;
  solo: boolean;
  inserts: InsertSlot[];
  auxSends?: AuxSendConfig[];
  inputTrackIds: string[];
  glueCompressionEnabled?: boolean;
  saturationDrive?: number;
}

export interface ReferenceTrackConfig {
  id: string;
  name: string;
  audioUrl?: string;
  durationSec: number;
  integratedLufs: number; // e.g. -14.2
  peakDbfs: number; // e.g. -0.3
  stereoWidthScore: number; // 0..100%
  lowEndEnergyDb: number;
  vocalPresenceDb: number;
  dynamicRangeDb: number;
  autoLevelMatch: boolean;
  gainTrimDb: number;
  isActiveAudition: boolean; // A/B reference toggle
}

export interface MixSnapshot {
  snapshotId: string;
  name: string;
  trackStripStates: Record<string, Partial<TrackDspSettings>>;
  busStates: Record<string, Partial<MixBusChannel>>;
  masterVolume: number;
  reverbLevel: number;
  delayLevel: number;
  automationRefs: string[];
  createdAt: number;
  sourceProjectVersionId: string;
}

export type ClipOperationType =
  | 'split'
  | 'trim_start'
  | 'trim_end'
  | 'slip'
  | 'stretch'
  | 'loop'
  | 'duplicate'
  | 'move'
  | 'fade_in'
  | 'fade_out'
  | 'crossfade'
  | 'reverse'
  | 'gain'
  | 'normalize'
  | 'nudge'
  | 'pitch_align'
  | 'time_align';

export interface MeterBallisticsData {
  peak: number; // dBFS (-60..+6)
  peakHold: number; // dBFS (-60..+6)
  rms: number; // dBFS (-60..0)
  gainReductionDb: number; // dB (0..20)
  lufsShortTerm: number; // LUFS
  lufsIntegrated: number; // LUFS
  truePeakDbtp: number; // dBTP
  phaseCorrelation: number; // -1.0 .. +1.0
  isClipping: boolean;
}

export interface MixProposal {
  id: string;
  title: string;
  description: string;
  targetTrackIds: string[];
  operationType: string;
  proposedDspChanges: Record<string, Partial<TrackDspSettings>>;
  proposedInsertOrder?: { trackId: string; newOrder: InsertSlot[] };
  proposedAutomationCurve?: { trackId: string; parameter: string; points: { bar: number; value: number }[] };
  lockedInvariants: string[];
  confidenceScore: number;
}

// --- Step 5 FINISH Mastering & Provenance Types ---

export interface AcceptedMixPrint {
  mixPrintId: string;
  sourceProjectVersionId: string;
  stereoAssetId: string;
  stemManifestId: string;
  sampleRate: number;
  bitDepth: number;
  createdAt: number;
  mixStateHash: string;
  staleWarning?: boolean;
}

export type MasteringProcessorType =
  | 'corrective_eq'
  | 'dynamic_eq'
  | 'bus_comp'
  | 'saturation'
  | 'stereo_ms'
  | 'soft_clipper'
  | 'true_peak_limiter';

export interface MasteringProcessorSlot {
  id: string;
  name: string;
  type: MasteringProcessorType;
  enabled: boolean;
  bypassed: boolean;
  parameters: Record<string, number | boolean | string>;
}

export interface MasteringDspChain {
  id: string;
  name: string;
  targetLufs: number; // e.g. -14.0
  targetDbtp: number; // e.g. -1.0
  characterPresetId?: string;
  slots: MasteringProcessorSlot[];
}

export interface MasterCandidate {
  candidateId: string;
  name: string;
  sourceMixPrintId: string;
  dspChain: MasteringDspChain;
  measuredLufs: number;
  measuredDbtp: number;
  measuredCrestFactor: number;
  stereoWidthScore: number;
  phaseCorrelation: number;
  createdAt: number;
  isCommittedMaster: boolean;
}

export interface FinalizationGateStatus {
  audioChecksPassed: boolean;
  noClippingViolation: boolean;
  lineageChecksPassed: boolean;
  rootSeedPresent: boolean;
  resourcesAdmissionPassed: boolean;
  rightsAndSplitsPassed: boolean;
  provenanceHashVerified: boolean;
  isReadyToSign: boolean;
  blockingReasons: string[];
}








