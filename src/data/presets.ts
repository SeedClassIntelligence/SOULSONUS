import { Preset, Track } from '../types/daw';
import { convertStepsToNoteEvents } from '../utils/musicMath';

const createEmptySteps = (num = 64): boolean[] => new Array(num).fill(false);

const createPattern = (indices: number[], num = 64): boolean[] => {
  const steps = new Array(num).fill(false);
  indices.forEach((idx) => {
    if (idx < num) steps[idx] = true;
  });
  return steps;
};

// Default Kick pattern: Bar 1-4 standard pulse
const defaultKickSteps = createPattern([
  0, 6, 10, 12, // Bar 1
  16, 22, 26, 28, // Bar 2
  32, 38, 42, 44, // Bar 3
  48, 54, 58, 60, // Bar 4
]);

// Default Snare pattern: Backbeat on 4 and 12 of every bar
const defaultSnareSteps = createPattern([
  4, 12, 20, 28, 36, 44, 52, 60,
  14, 30, 46, 62 // Subtle ghost snares
]);

// Default Hi-Hat pattern
const defaultHiHatSteps = createPattern([
  0, 2, 4, 6, 8, 10, 12, 14,
  16, 18, 20, 22, 24, 26, 28, 30,
  32, 34, 36, 38, 40, 42, 44, 46,
  48, 50, 52, 54, 56, 58, 60, 62
]);

// 808 Bass pattern
const defaultBassSteps = createPattern([
  0, 8, 16, 24, 32, 40, 48, 56
]);

// Lead Melody pattern
const defaultMelodySteps = createPattern([
  0, 3, 7, 10, 14,
  16, 19, 23, 27, 30,
  32, 35, 39, 42, 46,
  48, 51, 55, 59, 62
]);

// Strings pattern: Sustained chords across bars 2-4
const defaultStringsSteps = createPattern([
  16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60
]);

const defaultNotes = new Array(64).fill('C3');
[0, 16, 32, 48].forEach(i => defaultNotes[i] = 'C3');
[3, 19, 35, 51].forEach(i => defaultNotes[i] = 'Eb3');
[7, 23, 39, 55].forEach(i => defaultNotes[i] = 'G3');
[10, 27, 42, 59].forEach(i => defaultNotes[i] = 'Bb3');
[14, 30, 46, 62].forEach(i => defaultNotes[i] = 'C4');

export const PRESETS: Preset[] = [
  {
    id: 'dubler_vocal',
    name: 'Dubler Vocal Beatbox Master',
    bpm: 110,
    description: 'Designed for live beatboxing & full composition separation (Drums, Bass, Synths, Strings, Vocals)!',
    tracks: [
      { id: 't-kick', name: 'Kick (Thump)', instrument: 'kick', color: '#f59e0b', steps: defaultKickSteps, noteEvents: convertStepsToNoteEvents(defaultKickSteps, 'C1'), viewMode: 'GRID', mute: false, solo: false, volume: 0, pitch: 'C1' },
      { id: 't-snare', name: 'Snare (Clap/Pop)', instrument: 'snare', color: '#06b6d4', steps: defaultSnareSteps, noteEvents: convertStepsToNoteEvents(defaultSnareSteps, 'C2'), viewMode: 'GRID', mute: false, solo: false, volume: -2, pitch: 'C2' },
      { id: 't-hat', name: 'Hi-Hat (Tss)', instrument: 'hihat', color: '#10b981', steps: defaultHiHatSteps, noteEvents: convertStepsToNoteEvents(defaultHiHatSteps, 'F#3'), viewMode: 'GRID', mute: false, solo: false, volume: -6, pitch: 'F#3' },
      { id: 't-bass', name: '808 / Sub Bass', instrument: 'bass', color: '#f43f5e', steps: defaultBassSteps, noteEvents: convertStepsToNoteEvents(defaultBassSteps, 'C1'), viewMode: 'PIANO_ROLL', mute: false, solo: false, volume: -1, pitch: 'C1' },
      { id: 't-melody', name: 'Lead Synth / Keys', instrument: 'melody', color: '#a855f7', steps: defaultMelodySteps, noteEvents: convertStepsToNoteEvents(defaultMelodySteps, 'C3', defaultNotes), viewMode: 'PIANO_ROLL', notes: defaultNotes, mute: false, solo: false, volume: -4, pitch: 'C3' },
      { id: 't-strings', name: 'Strings Ensemble', instrument: 'melody', color: '#3b82f6', steps: defaultStringsSteps, noteEvents: convertStepsToNoteEvents(defaultStringsSteps, 'G3'), viewMode: 'PIANO_ROLL', notes: new Array(64).fill('G3'), mute: false, solo: false, volume: -5, pitch: 'G3' },
      {
        id: 't-vocal',
        name: 'Lead Vocal Track',
        instrument: 'vocal_synth',
        color: '#ec4899',
        steps: createEmptySteps(),
        mute: false,
        solo: false,
        volume: 0,
        pitch: 'C3',
        activeCompId: 'comp_hook_main',
        vocalTakes: [
          {
            id: 'take_v01',
            takeId: 'take_v01',
            trackId: 't-vocal',
            takeNumber: 1,
            name: 'Take 01 (Main Natural)',
            sourceAudioId: 'ast_vox_src_01',
            rawAudioAssetId: 'raw_ast_vox_src_01',
            sectionId: 'sec_hook',
            recordedAt: Date.now() - 3600000,
            timelineStart: 13,
            timelineEnd: 20,
            duration: 8.72,
            isActive: false,
            rating: 5,
            waveformData: [0.2, 0.4, 0.7, 0.9, 0.6, 0.8, 0.5, 0.3, 0.7, 0.9, 0.8, 0.4],
            lineageParentTakeId: 'root_mic_take_01',
          },
          {
            id: 'take_v02',
            takeId: 'take_v02',
            trackId: 't-vocal',
            takeNumber: 2,
            name: 'Take 02 (High Energy)',
            sourceAudioId: 'ast_vox_src_02',
            rawAudioAssetId: 'raw_ast_vox_src_02',
            sectionId: 'sec_hook',
            recordedAt: Date.now() - 2400000,
            timelineStart: 13,
            timelineEnd: 20,
            duration: 8.68,
            isActive: false,
            rating: 4,
            waveformData: [0.3, 0.6, 0.9, 0.95, 0.8, 0.85, 0.7, 0.5, 0.8, 0.95, 0.9, 0.6],
            lineageParentTakeId: 'root_mic_take_01',
          },
          {
            id: 'take_v03',
            takeId: 'take_v03',
            trackId: 't-vocal',
            takeNumber: 3,
            name: 'Take 03 (Intimate Whisper)',
            sourceAudioId: 'ast_vox_src_03',
            rawAudioAssetId: 'raw_ast_vox_src_03',
            sectionId: 'sec_hook',
            recordedAt: Date.now() - 1200000,
            timelineStart: 13,
            timelineEnd: 20,
            duration: 8.75,
            isActive: false,
            rating: 5,
            waveformData: [0.1, 0.3, 0.4, 0.5, 0.3, 0.4, 0.3, 0.2, 0.4, 0.5, 0.4, 0.2],
            lineageParentTakeId: 'root_mic_take_01',
          },
          {
            id: 'take_v04',
            takeId: 'take_v04',
            trackId: 't-vocal',
            takeNumber: 4,
            name: 'Take 04 (Vibrato Punch)',
            sourceAudioId: 'ast_vox_src_04',
            rawAudioAssetId: 'raw_ast_vox_src_04',
            sectionId: 'sec_hook',
            recordedAt: Date.now() - 600000,
            timelineStart: 13,
            timelineEnd: 20,
            duration: 8.70,
            isActive: true,
            rating: 4,
            waveformData: [0.2, 0.5, 0.8, 0.85, 0.7, 0.9, 0.6, 0.4, 0.75, 0.9, 0.85, 0.5],
            lineageParentTakeId: 'root_mic_take_01',
          },
        ],
        vocalComps: [
          {
            id: 'comp_hook_main',
            compId: 'comp_hook_main',
            trackId: 't-vocal',
            sectionId: 'sec_hook',
            name: 'Master Hook Vocal Comp',
            active: true,
            createdAt: Date.now() - 500000,
            updatedAt: Date.now() - 500000,
            sourceTakeIds: ['take_v03', 'take_v01', 'take_v04', 'take_v02'],
            segments: [
              { segmentId: 'seg_01', phraseId: 'line_h1_1_p1', bar: 1, takeId: 'take_v03', sourceStart: 0, sourceEnd: 2.18, timelineStart: 13, timelineEnd: 15, gainTrim: 0 },
              { segmentId: 'seg_02', phraseId: 'line_h1_1_p2', bar: 2, takeId: 'take_v01', sourceStart: 2.18, sourceEnd: 4.36, timelineStart: 15, timelineEnd: 17, gainTrim: -0.5 },
              { segmentId: 'seg_03', phraseId: 'line_h1_2_p1', bar: 3, takeId: 'take_v04', sourceStart: 4.36, sourceEnd: 6.54, timelineStart: 17, timelineEnd: 19, gainTrim: 0 },
              { segmentId: 'seg_04', phraseId: 'line_h1_2_p2', bar: 4, takeId: 'take_v02', sourceStart: 6.54, sourceEnd: 8.72, timelineStart: 19, timelineEnd: 21, gainTrim: +1.0 },
            ],
          },
        ],
        vocalState: {
          isRecording: false,
          audioBlob: null,
          audioBuffer: null,
          waveformData: [0.2, 0.5, 0.8, 0.85, 0.7, 0.9, 0.6, 0.4, 0.75, 0.9, 0.85, 0.5],
          duration: 8.70,
          volume: 0,
          mute: false,
          solo: false,
          delaySend: 0.15,
          reverbSend: 0.25,
          takes: [],
          comps: [],
          pitchSettings: {
            enabled: true,
            key: 'C',
            scale: 'minor',
            strength: 85,
            speed: 65,
            pitchDrift: 15,
            formantPreserve: true,
            formantShift: 0,
            bypass: false,
          },
          timingSettings: {
            enabled: true,
            quantizeStrength: 80,
            humanize: 20,
            phraseNudgeMs: 0,
            stretchRatio: 1.0,
          },
          harmonySettings: {
            enabled: false,
            mode: 'third_above',
            humanizeCents: 15,
            stereoSpread: 75,
            vocalRole: 'LEAD_VOCAL',
          },
          voiceIdentitySettings: {
            profileId: 'prof_creator_01',
            profileName: 'SoulSonus Creator Signature Voice',
            rightsVerified: true,
            consentProofId: 'proof_auth_01',
            licenseStatus: 'APPROVED',
            timbreBlend: 100,
            formantShift: 0,
            breathiness: 25,
          },
          inputSettings: {
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
          punchRegion: {
            isEnabled: false,
            startBar: 15,
            startBeat: 1,
            endBar: 16,
            endBeat: 4,
            preRollBars: 1,
            postRollBars: 1,
          },
        },
      },
      { id: 't-harmony', name: 'Harmony Stems', instrument: 'vocal_synth', color: '#8b5cf6', steps: createEmptySteps(), mute: false, solo: false, volume: -3, pitch: 'E3' },
    ]
  },
  {
    id: 'boom_bap',
    name: '90s Boom Bap',
    bpm: 92,
    description: 'Classic hip-hop 4-bar groove with heavy membrane kick and crisp snare.',
    tracks: [
      { id: 't-kick', name: 'Kick Drum', instrument: 'kick', color: '#f59e0b', steps: createPattern([0, 10, 16, 24, 26, 32, 42, 48, 56]), mute: false, solo: false, volume: 1, pitch: 'C1' },
      { id: 't-snare', name: 'Snare Drum', instrument: 'snare', color: '#06b6d4', steps: createPattern([4, 12, 20, 28, 36, 44, 52, 60]), mute: false, solo: false, volume: 0, pitch: 'C2' },
      { id: 't-hat', name: 'Closed Hi-Hat', instrument: 'hihat', color: '#10b981', steps: defaultHiHatSteps, mute: false, solo: false, volume: -8, pitch: 'G3' },
      { id: 't-bass', name: 'Acoustic Upright Bass', instrument: 'bass', color: '#f43f5e', steps: defaultBassSteps, mute: false, solo: false, volume: -2, pitch: 'E1' },
      { id: 't-melody', name: 'Rhodes Piano', instrument: 'melody', color: '#a855f7', steps: defaultMelodySteps, notes: defaultNotes, mute: false, solo: false, volume: -3, pitch: 'C3' },
      { id: 't-strings', name: 'Vinyl Strings', instrument: 'melody', color: '#3b82f6', steps: defaultStringsSteps, notes: new Array(64).fill('E3'), mute: false, solo: false, volume: -6, pitch: 'E3' },
      { id: 't-vocal', name: 'Lead Vocal', instrument: 'vocal_synth', color: '#ec4899', steps: createEmptySteps(), mute: false, solo: false, volume: 0, pitch: 'C3' },
      { id: 't-harmony', name: 'Ad-Libs', instrument: 'vocal_synth', color: '#8b5cf6', steps: createEmptySteps(), mute: false, solo: false, volume: -4, pitch: 'G3' },
    ]
  },
  {
    id: 'empty',
    name: 'Blank Canvas (Record Live)',
    bpm: 120,
    description: 'Clean slate ready for your live mic beatboxing and full multi-track composition separation!',
    tracks: [
      { id: 't-kick', name: 'Kick (Thump)', instrument: 'kick', color: '#f59e0b', steps: createEmptySteps(), mute: false, solo: false, volume: 0, pitch: 'C1' },
      { id: 't-snare', name: 'Snare (Pop)', instrument: 'snare', color: '#06b6d4', steps: createEmptySteps(), mute: false, solo: false, volume: 0, pitch: 'C2' },
      { id: 't-hat', name: 'Hi-Hat (Tss)', instrument: 'hihat', color: '#10b981', steps: createEmptySteps(), mute: false, solo: false, volume: -4, pitch: 'G3' },
      { id: 't-bass', name: '808 / Bass', instrument: 'bass', color: '#f43f5e', steps: createEmptySteps(), mute: false, solo: false, volume: -2, pitch: 'C1' },
      { id: 't-melody', name: 'Melody / Synth', instrument: 'melody', color: '#a855f7', steps: createEmptySteps(), notes: new Array(64).fill('C3'), mute: false, solo: false, volume: -2, pitch: 'C3' },
      { id: 't-strings', name: 'Strings', instrument: 'melody', color: '#3b82f6', steps: createEmptySteps(), notes: new Array(64).fill('G3'), mute: false, solo: false, volume: -4, pitch: 'G3' },
      { id: 't-vocal', name: 'Lead Vocal', instrument: 'vocal_synth', color: '#ec4899', steps: createEmptySteps(), mute: false, solo: false, volume: 0, pitch: 'C3' },
      { id: 't-harmony', name: 'Harmony', instrument: 'vocal_synth', color: '#8b5cf6', steps: createEmptySteps(), mute: false, solo: false, volume: -3, pitch: 'E3' },
    ]
  }
];
