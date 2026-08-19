import React, { useState } from 'react';
import { Track, AutomationLane, AutomationPoint, InstrumentParameters, TrackDspSettings } from '../types/daw';
import { audioEngine } from '../audio/audioEngine';
import { useStudioSession } from '../app/StudioSessionContext';
import { productionHistory, ProductionOperation } from '../lib/productionOperations';
import {
  Mic,
  Activity,
  Music,
  Sparkles,
  Sliders,
  Volume2,
  Check,
  Zap,
  Play,
  RotateCcw,
  Search,
  Database,
  ArrowRight,
  ShieldCheck,
  Disc,
  Drum,
  SlidersHorizontal,
  Tag,
  Radio,
  Layers,
  Wand2,
  Lock,
  Compass,
  TrendingUp,
  VolumeX,
  AudioWaveform,
  SlidersVertical,
  Maximize2,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

interface VaultSoundItem {
  id: string;
  name: string;
  vault: 'R01' | 'R02' | 'R03' | 'R04';
  vaultLabel: string;
  category: string;
  subGenre: string;
  freqRange: string;
  character: string;
  sampleRate: string;
  license: string;
  /**
   * What choosing this sound actually does.
   *
   * Every entry used to be metadata only: committing a sound renamed the
   * track and changed nothing you could hear, and the panel's "LIVE
   * IN-CONTEXT AUDITION" was a pulsing icon over silence. These settings
   * drive the same channel strip the mixer writes to, so the difference
   * between a boombap kick and a 909 kick is now audible and survives into
   * the bounce.
   */
  sound: {
    pitch?: string;
    dsp: Partial<TrackDspSettings>;
  };
}

const EXTENDED_VAULT_CATALOG: { [instrument: string]: VaultSoundItem[] } = {
  kick: [
    { id: 'snd_k1', name: 'TR-808 Sub Kick (54Hz)', vault: 'R01', vaultLabel: 'R01 One-Shot', category: 'Sub Kick', subGenre: 'Modern Trap / Hip-Hop', freqRange: '35Hz – 90Hz', character: 'Deep Sub, Clean Sine Tail', sampleRate: '44.1kHz / 24-bit', license: '100% Royalty-Free' , sound: { pitch: 'C1', dsp: { lowCutHz: 24, lowGain: 6, midFreqHz: 700, midGain: -6, highGain: -8, filterFreq: 2200, filterType: 'lowpass', compressorThreshold: -20, compressorRatio: 3, reverbSend: 0.02 } } },
    { id: 'snd_k2', name: 'Punchy Acoustic Studio Kick', vault: 'R01', vaultLabel: 'R01 One-Shot', category: 'Acoustic', subGenre: 'Live / Neo-Soul', freqRange: '60Hz – 120Hz', character: 'Fast Transient, Punchy Mid-Thump', sampleRate: '44.1kHz / 24-bit', license: '100% Royalty-Free' , sound: { pitch: 'D1', dsp: { lowCutHz: 40, lowGain: 2, midFreqHz: 1600, midGain: 4, highGain: 1, filterFreq: 9000, filterType: 'lowpass', compressorThreshold: -14, compressorRatio: 5, reverbSend: 0.10 } } },
    { id: 'snd_k3', name: '90s BoomBap Gritty Kick', vault: 'R01', vaultLabel: 'R01 One-Shot', category: 'Vintage', subGenre: 'East Coast BoomBap', freqRange: '50Hz – 110Hz', character: 'Analog Tape Saturated, Warm Dirt', sampleRate: '44.1kHz / 24-bit', license: '100% Royalty-Free' , sound: { pitch: 'C1', dsp: { lowCutHz: 45, lowGain: 4, midFreqHz: 900, midGain: 3, highGain: -5, filterFreq: 4200, filterType: 'lowpass', compressorThreshold: -22, compressorRatio: 8, reverbSend: 0.14 } } },
    { id: 'snd_k4', name: 'Analog 909 Tight Dance Kick', vault: 'R01', vaultLabel: 'R01 One-Shot', category: 'Electronic', subGenre: 'House / Techno / Pop', freqRange: '70Hz – 140Hz', character: 'Snappy Click, Dense Low-Mid', sampleRate: '44.1kHz / 24-bit', license: '100% Royalty-Free' , sound: { pitch: 'E1', dsp: { lowCutHz: 55, lowGain: 1, midFreqHz: 2600, midGain: 5, highGain: 4, filterFreq: 14000, filterType: 'lowpass', compressorThreshold: -12, compressorRatio: 6, reverbSend: 0.03 } } },
  ],
  snare: [
    { id: 'snd_s1', name: 'Crispy Vintage Snare', vault: 'R01', vaultLabel: 'R01 One-Shot', category: 'Vintage', subGenre: 'Soul / Funk / Hip-Hop', freqRange: '180Hz – 4.5kHz', character: 'Crisp Wire Resonance, Organic Wood', sampleRate: '44.1kHz / 24-bit', license: '100% Royalty-Free' , sound: { pitch: 'D2', dsp: { lowCutHz: 140, lowGain: -2, midFreqHz: 900, midGain: 3, highGain: 4, filterFreq: 12000, filterType: 'lowpass', compressorThreshold: -16, compressorRatio: 4, reverbSend: 0.22 } } },
    { id: 'snd_s2', name: 'Analog 909 Layered Handclap', vault: 'R01', vaultLabel: 'R01 One-Shot', category: 'Clap', subGenre: 'Pop / Electronic / Trap', freqRange: '300Hz – 8kHz', character: 'Multi-Tap Stereo Spread', sampleRate: '44.1kHz / 24-bit', license: '100% Royalty-Free' , sound: { pitch: 'E2', dsp: { lowCutHz: 260, lowGain: -6, midFreqHz: 1800, midGain: 1, highGain: 7, filterFreq: 16000, filterType: 'lowpass', compressorThreshold: -10, compressorRatio: 3, reverbSend: 0.34 } } },
  ],
  hihat: [
    { id: 'snd_h1', name: 'Tight Closed Studio Hat', vault: 'R01', vaultLabel: 'R01 One-Shot', category: 'Closed Hat', subGenre: 'Studio Hip-Hop / Pop', freqRange: '4kHz – 16kHz', character: 'Crisp Top End, Short Natural Decay', sampleRate: '44.1kHz / 24-bit', license: '100% Royalty-Free' , sound: { pitch: 'F#3', dsp: { lowCutHz: 300, lowGain: -8, midFreqHz: 3000, midGain: -2, highGain: 3, filterFreq: 13000, filterType: 'lowpass', compressorThreshold: -18, compressorRatio: 2.5, reverbSend: 0.08 } } },
    { id: 'snd_h2', name: '808 Metallic Trap Hat', vault: 'R01', vaultLabel: 'R01 One-Shot', category: 'Electronic', subGenre: 'Modern Trap / Drill', freqRange: '6kHz – 18kHz', character: 'Bright Sizzle, Rolls-Friendly', sampleRate: '44.1kHz / 24-bit', license: '100% Royalty-Free' , sound: { pitch: 'A#3', dsp: { lowCutHz: 400, lowGain: -10, midFreqHz: 5000, midGain: 2, highGain: 9, filterFreq: 18000, filterType: 'lowpass', compressorThreshold: -14, compressorRatio: 2, reverbSend: 0.05 } } },
  ],
  bass: [
    { id: 'snd_b1', name: '808 Sub Glide (Sustained)', vault: 'R03', vaultLabel: 'R03 Synth Patch', category: '808 Sub', subGenre: 'Trap / R&B / Pop', freqRange: '30Hz – 120Hz', character: 'Monophonic Portamento, Clean Saturation', sampleRate: '44.1kHz / 24-bit', license: '100% Royalty-Free' , sound: { pitch: 'C1', dsp: { lowCutHz: 22, lowGain: 5, midFreqHz: 600, midGain: -4, highGain: -7, filterFreq: 1800, filterType: 'lowpass', compressorThreshold: -18, compressorRatio: 4, reverbSend: 0.02 } } },
    { id: 'snd_b2', name: 'Moog Minitaur Analog Sub', vault: 'R03', vaultLabel: 'R03 Synth Patch', category: 'Analog Synth', subGenre: 'Funk / Electronic', freqRange: '35Hz – 250Hz', character: 'Dual Oscillator Warmth, Ladder Filter', sampleRate: '44.1kHz / 24-bit', license: '100% Royalty-Free' , sound: { pitch: 'C1', dsp: { lowCutHz: 30, lowGain: 3, midFreqHz: 1100, midGain: 2, highGain: -2, filterFreq: 3600, filterType: 'lowpass', compressorThreshold: -16, compressorRatio: 3, reverbSend: 0.06 } } },
    { id: 'snd_b3', name: 'Upright Acoustic Double Bass', vault: 'R02', vaultLabel: 'R02 SoundFont', category: 'Acoustic Instrument', subGenre: 'Jazz / Neo-Soul / BoomBap', freqRange: '40Hz – 350Hz', character: 'Wood Body Resonance, Finger Pluck', sampleRate: '44.1kHz / 24-bit', license: '100% Royalty-Free' , sound: { pitch: 'E1', dsp: { lowCutHz: 38, lowGain: 1, midFreqHz: 800, midGain: 4, highGain: 2, filterFreq: 6500, filterType: 'lowpass', compressorThreshold: -20, compressorRatio: 2.5, reverbSend: 0.18 } } },
  ],
  melody: [
    { id: 'snd_m1', name: 'Rhodes Mark I Electric Piano', vault: 'R02', vaultLabel: 'R02 SoundFont', category: 'Keys', subGenre: 'Soul / R&B / Jazz', freqRange: '80Hz – 6kHz', character: 'Tine Warmth, Bell-Like Dynamic Velocity', sampleRate: '44.1kHz / 24-bit', license: '100% Royalty-Free' , sound: { pitch: 'C3', dsp: { lowCutHz: 70, lowGain: 2, midFreqHz: 1400, midGain: 1, highGain: -1, filterFreq: 7000, filterType: 'lowpass', compressorThreshold: -18, compressorRatio: 3, reverbSend: 0.20 } } },
    { id: 'snd_m2', name: 'Cinematic Chamber Strings', vault: 'R02', vaultLabel: 'R02 SoundFont', category: 'Orchestral', subGenre: 'Cinematic / Scoring / Hip-Hop', freqRange: '65Hz – 10kHz', character: 'Lush Legato, Warm Bowed Celli & Violins', sampleRate: '44.1kHz / 24-bit', license: '100% Royalty-Free' , sound: { pitch: 'G3', dsp: { lowCutHz: 60, lowGain: 0, midFreqHz: 900, midGain: 3, highGain: 2, filterFreq: 11000, filterType: 'lowpass', compressorThreshold: -22, compressorRatio: 2, reverbSend: 0.42 } } },
    { id: 'snd_m3', name: 'DX7 Classic FM Electric Piano', vault: 'R03', vaultLabel: 'R03 Synth Patch', category: 'FM Synth', subGenre: '80s / Retro R&B', freqRange: '100Hz – 8kHz', character: 'Glassy Attack, Crystalline FM Timbres', sampleRate: '44.1kHz / 24-bit', license: '100% Royalty-Free' , sound: { pitch: 'C4', dsp: { lowCutHz: 90, lowGain: -2, midFreqHz: 3200, midGain: 2, highGain: 8, filterFreq: 16000, filterType: 'lowpass', compressorThreshold: -14, compressorRatio: 4, reverbSend: 0.16 } } },
  ],
  vocal_synth: [
    { id: 'snd_v1', name: 'Warm Tube Lead Vocal Chain', vault: 'R04', vaultLabel: 'R04 DSP Chain', category: 'Vocal DSP', subGenre: 'Modern R&B / Pop', freqRange: '100Hz – 16kHz', character: 'Tube Saturation, Optical 3:1 Compression', sampleRate: '44.1kHz / 24-bit', license: '100% Royalty-Free' , sound: { pitch: 'C3', dsp: { lowCutHz: 95, lowGain: 1, midFreqHz: 2400, midGain: 3, highGain: 5, filterFreq: 16000, filterType: 'lowpass', compressorThreshold: -20, compressorRatio: 3, reverbSend: 0.18 } } },
    { id: 'snd_v2', name: 'Stereo Harmony Doubler Chain', vault: 'R04', vaultLabel: 'R04 DSP Chain', category: 'Vocal DSP', subGenre: 'Pop / Soul Harmonies', freqRange: '120Hz – 15kHz', character: 'Stereo Widening, Pitch Micro-Shift', sampleRate: '44.1kHz / 24-bit', license: '100% Royalty-Free' , sound: { pitch: 'C3', dsp: { lowCutHz: 120, lowGain: -3, midFreqHz: 1800, midGain: -1, highGain: 6, filterFreq: 15000, filterType: 'lowpass', compressorThreshold: -16, compressorRatio: 2.5, reverbSend: 0.30, delaySend: 0.22 } } },
  ],
};

const PIANO_PITCHES = ['C4', 'B3', 'A#3', 'A3', 'G#3', 'G3', 'F#3', 'F3', 'E3', 'D#3', 'D3', 'C3', 'B2', 'A#2', 'A2', 'G#2', 'G2', 'F#2', 'F2', 'E2', 'D#2', 'D2', 'C2', 'B1', 'A#1', 'A1', 'G#1', 'G1', 'F1', 'E1', 'D1', 'C1'];

interface TrackProductionStripProps {
  track: Track | null;
  onUpdateTrack?: (updates: Partial<Track>) => void;
}

export const TrackProductionStrip: React.FC<TrackProductionStripProps> = ({
  track,
  onUpdateTrack,
}) => {
  const {
    setTracks,
    dawState,
    handleAddTrackLayer,
    handleRemoveTrackLayer,
    handleUpdateTrackLayer,
    handleExplodeLayersToTracks,
    activeProductionScope,
  } = useStudioSession();

  const [activeTab, setActiveTab] = useState<'SOURCE' | 'EDIT' | 'SOUND' | 'SYNTH_DSP' | 'LAYERS' | 'AUTOMATION' | 'FX'>('EDIT');
  const [isExpanded, setIsExpanded] = useState(false);

  // SOUND tab: Audition candidate vs. committed sound
  const [auditionSoundItem, setAuditionSoundItem] = useState<VaultSoundItem | null>(null);
  const [semanticQuery, setSemanticQuery] = useState('');
  const [selectedSubGenreFilter, setSelectedSubGenreFilter] = useState('ALL');

  // Selected Automation Parameter in AUTOMATION tab
  const [selectedAutomationParam, setSelectedAutomationParam] = useState<'filterCutoff' | 'volume' | 'reverbSend' | 'glideTime' | 'drive'>('filterCutoff');

  // Vocal Track Take Selector
  const [activeVocalTakeId, setActiveVocalTakeId] = useState('take_01');

  if (!track) {
    return (
      <div className="p-8 bg-slate-950/90 border border-slate-800 rounded-2xl text-center text-slate-500 font-mono text-xs">
        Select a track on the Arrangement Timeline to open the Track Production Strip.
      </div>
    );
  }

  const isDrums = track.instrument === 'kick' || track.instrument === 'snare' || track.instrument === 'hihat' || track.instrument === 'percussion';
  const isBass = track.instrument === 'bass';
  const isVocal = track.instrument === 'vocal_synth' || track.name.toLowerCase().includes('vocal');
  const isMelodic = !isDrums && !isVocal;

  const tab4Label = isDrums
    ? 'PUNCH & TRANSIENT'
    : isBass
    ? 'TIMBRE & ENVELOPE'
    : isVocal
    ? 'VOCAL TIMBRE & FORMANT'
    : track.name.toLowerCase().includes('string')
    ? 'ARTICULATION & EXPRESSION'
    : 'TIMBRE & ADSR';

  const layers = track.layers || [
    {
      id: `layer_orig_${track.id}`,
      name: 'Layer A (Core Master)',
      soundId: `snd_orig_${track.id}`,
      soundName: track.name,
      volume: 0,
      pan: 0,
      mute: false,
      solo: false,
      character: 'Authoritative Core Performance',
      vaultLabel: 'CORE SOUND',
      originType: 'ROOT_PERFORMANCE' as const,
      timbreParams: {
        attack: 8,
        decay: 350,
        tuning: 0,
        filterCutoff: 14000,
        saturation: 15,
      },
    },
  ];

  const currentSoundName = track.name;
  const activeAuditionSound = auditionSoundItem ? auditionSoundItem.name : currentSoundName;
  const vaultList = EXTENDED_VAULT_CATALOG[track.instrument] || EXTENDED_VAULT_CATALOG.melody;

  // Initialize or read canonical track instrument params
  const instParams: InstrumentParameters = track.instrumentParams || {
    attack: 12,
    decay: 650,
    sustain: 75,
    release: 320,
    filterCutoff: 12400,
    filterResonance: 2.4,
    filterType: 'lowpass',
    drive: 18,
    glideTime: 85,
    subWeight: 3.5,
    timbreBrightness: 45,
    expression: 100,
  };

  // Initialize or read canonical track DSP settings
  const dspSettings: TrackDspSettings = track.dspSettings || {
    filterFreq: 12400,
    filterType: 'lowpass',
    lowGain: 2.0,
    midGain: -1.0,
    highGain: 1.5,
    compressorThreshold: -18,
    compressorRatio: 4,
    reverbSend: 0.15,
    delaySend: 0.10,
    pan: 0,
    volume: track.volume || 0,
  };

  // Canonical automation points
  const activeAutomationLane = track.automationLanes?.find((l) => l.parameter === selectedAutomationParam) || {
    id: `auto_${selectedAutomationParam}`,
    parameter: selectedAutomationParam,
    label: selectedAutomationParam,
    paramMin: 0,
    paramMax: 100,
    unit: '%',
    points: [
      { bar: 1, step: 0, value: 30 },
      { bar: 4, step: 15, value: 50 },
      { bar: 5, step: 0, value: 85 },
      { bar: 8, step: 15, value: 95 },
    ],
    isEnabled: true,
  };

  // Sub-genres available for filtering
  const availableSubGenres = ['ALL', ...Array.from(new Set(vaultList.map((v) => v.category)))];
  const filteredSounds = vaultList.filter((s) => {
    const matchesCategory = selectedSubGenreFilter === 'ALL' || s.category === selectedSubGenreFilter;
    const matchesQuery = semanticQuery
      ? s.name.toLowerCase().includes(semanticQuery.toLowerCase()) ||
        s.subGenre.toLowerCase().includes(semanticQuery.toLowerCase()) ||
        s.character.toLowerCase().includes(semanticQuery.toLowerCase())
      : true;
    return matchesCategory && matchesQuery;
  });

  /**
   * Auditions a sound by actually making it.
   *
   * The panel said "LIVE IN-CONTEXT AUDITION (SONG LOOPING)" over a pulsing
   * play icon and constructed no audio nodes at all -- picking a sound set a
   * string. The preset's settings are pushed to this track's real channel
   * strip and the track's own voice is triggered through it, so the audition
   * is the sound. Leaving without committing puts the committed settings back.
   */
  const auditionSound = async (soundItem: VaultSoundItem) => {
    setAuditionSoundItem(soundItem);
    if (!track) return;
    await audioEngine.init();
    const merged = { ...(track.dspSettings || {}), ...soundItem.sound.dsp };
    audioEngine.applyTrackDsp(track.id, merged as TrackDspSettings, track.instrument);
    const pitch = soundItem.sound.pitch || track.pitch || 'C3';
    const previewTrack = { ...track, dspSettings: merged, pitch } as Track;
    switch (track.instrument) {
      case 'kick':
        audioEngine.triggerKick(pitch, undefined, 0.9, previewTrack);
        break;
      case 'snare':
        audioEngine.triggerSnare(undefined, 0.9, previewTrack);
        break;
      case 'hihat':
        audioEngine.triggerHiHat(undefined, 0.9, previewTrack);
        break;
      case 'bass':
        audioEngine.triggerBass(pitch, undefined, 0.9, previewTrack, 0.6);
        break;
      default:
        audioEngine.triggerMelody(pitch, undefined, 0.9, previewTrack, 0.6);
        break;
    }
  };

  /** Puts the committed sound back on the engine after an uncommitted audition. */
  const cancelAudition = () => {
    setAuditionSoundItem(null);
    if (track) audioEngine.applyTrackDsp(track.id, track.dspSettings, track.instrument);
  };

  // Commit audition sound to canonical track
  const handleCommitSound = (soundItem: VaultSoundItem) => {
    const prevName = track.name;
    const prevPitch = track.pitch;
    const prevDsp = track.dspSettings;
    const nextPitch = soundItem.sound.pitch || track.pitch;
    const nextDsp = { ...(track.dspSettings || {}), ...soundItem.sound.dsp };
    const op: ProductionOperation = {
      id: `op_snd_${Date.now()}`,
      type: 'ASSIGN_SOUND',
      trackId: track.id,
      description: `Assigned ${soundItem.name} (${soundItem.vault}) to ${track.name}`,
      source: 'MANUAL_UI',
      timestamp: Date.now(),
      undo: (tracks) =>
        tracks.map((t) => (t.id === track.id ? { ...t, name: prevName, pitch: prevPitch, dspSettings: prevDsp } : t)),
      redo: (tracks) =>
        tracks.map((t) => (t.id === track.id ? { ...t, name: soundItem.name, pitch: nextPitch, dspSettings: nextDsp } : t)),
    };
    productionHistory.recordOperation(op);

    // The name was the only thing this ever wrote. The sound goes with it now.
    onUpdateTrack?.({ name: soundItem.name, pitch: nextPitch, dspSettings: nextDsp });
    setAuditionSoundItem(null);
  };

  // Update canonical instrument param
  const handleUpdateInstrumentParam = (key: keyof InstrumentParameters, val: any) => {
    const prevParams = { ...instParams };
    const updatedParams = { ...instParams, [key]: val };

    const op: ProductionOperation = {
      id: `op_inst_${Date.now()}`,
      type: 'SET_INSTRUMENT_PARAM',
      trackId: track.id,
      description: `Set ${String(key)} to ${val} on ${track.name}`,
      source: 'MANUAL_UI',
      timestamp: Date.now(),
      undo: (tracks) => tracks.map((t) => (t.id === track.id ? { ...t, instrumentParams: prevParams } : t)),
      redo: (tracks) => tracks.map((t) => (t.id === track.id ? { ...t, instrumentParams: updatedParams } : t)),
    };
    productionHistory.recordOperation(op);

    onUpdateTrack?.({ instrumentParams: updatedParams });
  };

  // Update canonical DSP setting
  const handleUpdateDspSetting = (key: keyof TrackDspSettings, val: any) => {
    const prevDsp = { ...dspSettings };
    const updatedDsp = { ...dspSettings, [key]: val };

    const op: ProductionOperation = {
      id: `op_dsp_${Date.now()}`,
      type: 'SET_DSP_PARAM',
      trackId: track.id,
      description: `Set ${String(key)} to ${val} on ${track.name}`,
      source: 'MANUAL_UI',
      timestamp: Date.now(),
      undo: (tracks) => tracks.map((t) => (t.id === track.id ? { ...t, dspSettings: prevDsp } : t)),
      redo: (tracks) => tracks.map((t) => (t.id === track.id ? { ...t, dspSettings: updatedDsp } : t)),
    };
    productionHistory.recordOperation(op);

    onUpdateTrack?.({ dspSettings: updatedDsp });
  };

  // Toggle step on 16-bar drum grid
  const handleToggleDrumStep = (stepIdx: number) => {
    const prevSteps = [...track.steps];
    const newSteps = [...track.steps];
    newSteps[stepIdx] = !newSteps[stepIdx];

    const op: ProductionOperation = {
      id: `op_step_${Date.now()}`,
      type: 'MOVE_NOTE',
      trackId: track.id,
      description: `Toggled drum step ${stepIdx + 1} on ${track.name}`,
      source: 'MANUAL_UI',
      timestamp: Date.now(),
      undo: (tracks) => tracks.map((t) => (t.id === track.id ? { ...t, steps: prevSteps } : t)),
      redo: (tracks) => tracks.map((t) => (t.id === track.id ? { ...t, steps: newSteps } : t)),
    };
    productionHistory.recordOperation(op);

    onUpdateTrack?.({ steps: newSteps });
  };

  // Toggle note pitch on Piano Roll
  const handleTogglePianoNote = (stepIdx: number, pitch: string) => {
    const prevSteps = [...track.steps];
    const prevNotes = track.notes ? [...track.notes] : Array(64).fill(track.pitch);
    const newSteps = [...track.steps];
    const newNotes = [...prevNotes];

    if (newSteps[stepIdx] && newNotes[stepIdx] === pitch) {
      newSteps[stepIdx] = false;
    } else {
      newSteps[stepIdx] = true;
      newNotes[stepIdx] = pitch;
    }

    const op: ProductionOperation = {
      id: `op_piano_${Date.now()}`,
      type: 'MOVE_NOTE',
      trackId: track.id,
      description: `Set note ${pitch} at step ${stepIdx + 1} on ${track.name}`,
      source: 'MANUAL_UI',
      timestamp: Date.now(),
      undo: (tracks) => tracks.map((t) => (t.id === track.id ? { ...t, steps: prevSteps, notes: prevNotes } : t)),
      redo: (tracks) => tracks.map((t) => (t.id === track.id ? { ...t, steps: newSteps, notes: newNotes } : t)),
    };
    productionHistory.recordOperation(op);

    onUpdateTrack?.({ steps: newSteps, notes: newNotes });
  };

  // Add automation node point
  const handleAddAutomationPoint = (bar: number, step: number, value: number) => {
    const prevLanes = track.automationLanes || [activeAutomationLane];
    const updatedLane = {
      ...activeAutomationLane,
      points: [...activeAutomationLane.points, { bar, step, value }].sort((a, b) => a.bar * 16 + a.step - (b.bar * 16 + b.step)),
    };
    const newLanes = prevLanes.map((l) => (l.parameter === selectedAutomationParam ? updatedLane : l));

    const op: ProductionOperation = {
      id: `op_auto_${Date.now()}`,
      type: 'SET_AUTOMATION_POINT',
      trackId: track.id,
      description: `Added automation node on ${selectedAutomationParam} at Bar ${bar}`,
      source: 'MANUAL_UI',
      timestamp: Date.now(),
      undo: (tracks) => tracks.map((t) => (t.id === track.id ? { ...t, automationLanes: prevLanes } : t)),
      redo: (tracks) => tracks.map((t) => (t.id === track.id ? { ...t, automationLanes: newLanes } : t)),
    };
    productionHistory.recordOperation(op);

    onUpdateTrack?.({ automationLanes: newLanes });
  };

  if (!isExpanded) {
    return (
      <div className="w-full bg-slate-950/95 border border-slate-800/90 rounded-2xl p-3.5 shadow-xl flex flex-wrap items-center justify-between gap-3 font-mono text-xs select-none">
        {/* Left: Selected Track & Sound Info */}
        <div className="flex items-center space-x-3">
          <div
            className="w-3.5 h-3.5 rounded-full border border-slate-700 shadow-sm shrink-0"
            style={{ backgroundColor: track.color || '#f59e0b' }}
          />
          <div className="flex items-center space-x-2">
            <span className="font-black text-slate-100 text-xs tracking-wide uppercase">
              {track.name}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[9px] font-mono border border-amber-500/30 uppercase font-bold">
              {track.instrument}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
            <span>Sound: <strong className="text-amber-300">{currentSoundName}</strong></span>
            <span className="text-slate-600">•</span>
            <span>Pattern: <strong className="text-slate-200">{track.steps.filter(Boolean).length} Triggers</strong></span>
            <span className="text-slate-600">•</span>
            <span className="text-cyan-400 font-bold">✦ {layers.length} Layers</span>
            <span className="text-slate-600">•</span>
            <span className="text-purple-300 font-medium">{tab4Label}</span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400 font-bold">DSP Active</span>
          </div>
        </div>

        {/* Right: Quick Tab Jump Badges + Open Workstation Button */}
        <div className="flex items-center space-x-2">
          <div className="hidden sm:flex items-center space-x-1">
            <button
              onClick={() => { setActiveTab('EDIT'); setIsExpanded(true); }}
              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[10px] font-bold transition cursor-pointer"
              title="Open Drum/Note Matrix"
            >
              MATRIX
            </button>
            <button
              data-testid="open-sound-vault"
              onClick={() => { setActiveTab('SOUND'); setIsExpanded(true); }}
              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[10px] font-bold transition cursor-pointer"
              title="Open Sound Vault"
            >
              VAULT
            </button>
            <button
              onClick={() => { setActiveTab('SYNTH_DSP'); setIsExpanded(true); }}
              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[10px] font-bold transition cursor-pointer"
              title={`Open ${tab4Label}`}
            >
              {isDrums ? 'PUNCH' : 'TIMBRE'}
            </button>
            <button
              onClick={() => { setActiveTab('LAYERS'); setIsExpanded(true); }}
              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[10px] font-bold transition cursor-pointer"
              title="Open Track Layering"
            >
              LAYERS ({layers.length})
            </button>
            <button
              onClick={() => { setActiveTab('AUTOMATION'); setIsExpanded(true); }}
              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[10px] font-bold transition cursor-pointer"
              title="Open Automation"
            >
              AUTO
            </button>
            <button
              onClick={() => { setActiveTab('FX'); setIsExpanded(true); }}
              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[10px] font-bold transition cursor-pointer"
              title="Open Channel DSP"
            >
              DSP
            </button>
          </div>

          <button
            onClick={() => setIsExpanded(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center space-x-1.5 transition cursor-pointer shadow-md shadow-amber-500/20 active:scale-95"
          >
            <Maximize2 className="w-3.5 h-3.5 text-slate-950" />
            <span>▾ OPEN WORKSTATION</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-950/95 border border-slate-800/90 rounded-2xl p-4 shadow-2xl space-y-3 select-none">
      {/* 1. TRACK HEADER & CAPABILITY NAVIGATION */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
        <div className="flex items-center space-x-3">
          <div
            className="w-3.5 h-3.5 rounded-full border border-slate-700 shadow-sm"
            style={{ backgroundColor: track.color || '#f59e0b' }}
          />
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-black text-slate-100 uppercase tracking-wide">
                {track.name}
              </h3>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[9px] font-mono border border-amber-500/30 uppercase font-bold">
                {track.instrument}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[9px] font-mono border border-emerald-500/30 font-bold">
                {isDrums ? 'DRUM WORKSTATION' : isBass ? 'BASS WORKSTATION' : isVocal ? 'VOCAL WORKSTATION' : 'MELODIC WORKSTATION'}
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-400">
              Role: {(track.instrument || 'instrument').toUpperCase()} • Pitch: {track.pitch} • Assigned: {currentSoundName}
            </p>
          </div>
        </div>

        {/* 7 Integrated Production Primitives Tabs + Collapse Button */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex flex-wrap items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono font-bold">
            <button
              onClick={() => setActiveTab('SOURCE')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
                activeTab === 'SOURCE'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mic className="w-3 h-3" />
              <span>SOURCE</span>
            </button>

            <button
              onClick={() => setActiveTab('EDIT')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
                activeTab === 'EDIT'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3 h-3" />
              <span>{isDrums ? 'DRUM MATRIX' : isVocal ? 'WAVEFORM TAKES' : isBass ? 'BASS PIANO ROLL' : 'PIANO ROLL / CHORDS'}</span>
            </button>

            <button
              data-testid="tab-sound-vault"
              onClick={() => setActiveTab('SOUND')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
                activeTab === 'SOUND'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-3 h-3" />
              <span>SOUND VAULT</span>
            </button>

            <button
              onClick={() => setActiveTab('SYNTH_DSP')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
                activeTab === 'SYNTH_DSP'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>{tab4Label}</span>
            </button>

            <button
              onClick={() => setActiveTab('LAYERS')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
                activeTab === 'LAYERS'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>LAYERS ({layers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('AUTOMATION')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
                activeTab === 'AUTOMATION'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              <span>AUTOMATION</span>
            </button>

            <button
              onClick={() => setActiveTab('FX')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
                activeTab === 'FX'
                  ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3 h-3" />
              <span>CHANNEL DSP</span>
            </button>
          </div>

          <button
            onClick={() => setIsExpanded(false)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[10px] font-bold flex items-center space-x-1 transition cursor-pointer active:scale-95"
            title="Collapse Deep Workstation to Slim Bar"
          >
            <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
            <span>▴ COLLAPSE</span>
          </button>
        </div>
      </div>

      {/* 2. POLYMORPHIC PRODUCTION PRIMITIVES FLOOR */}
      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 min-h-[260px]">
        
        {/* TAB 1: SOURCE -> Performance Take Lineage & Transients */}
        {activeTab === 'SOURCE' && (
          <div className="space-y-3 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center space-x-2">
                <Mic className="w-4 h-4 text-amber-400" />
                <span>ORIGIN ACOUSTIC TAKE & TRANSIENT SPECTRUM</span>
              </span>
              <span className="text-slate-500 text-[10px]">Source: FULL_COMPOSITION_TAKE_001 • PCM 44.1kHz</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span>Rhythm & Transient Match to Master Seed:</span>
                <span className="text-emerald-400 font-bold">99.4% Correlation (Verified)</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full shadow-[0_0_10px_#10b981]" style={{ width: '99.4%' }} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[10px] text-slate-400">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-slate-500">Detected Onsets:</div>
                  <div className="text-slate-200 font-bold">16 Hits / 4 Bars</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-slate-500">Frequency Range:</div>
                  <div className="text-slate-200 font-bold">35Hz – 120Hz</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-slate-500">Lineage Parent:</div>
                  <div className="text-amber-400 font-bold">ast_src_master_seed</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-slate-500">Separation Engine:</div>
                  <div className="text-cyan-400 font-bold">E02/E03 Governed</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: POLYMORPHIC EDIT (DRUMS vs BASS vs STRINGS vs VOCAL WAVEFORM) */}
        {activeTab === 'EDIT' && (
          <div className="space-y-3 text-xs font-mono">
            {/* 2A. DRUM WORKSTATION: 64-Step Trigger Grid & Velocity Lanes */}
            {isDrums && (
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center space-x-2">
                    <Drum className="w-4 h-4 text-blue-400" />
                    <span className="font-bold text-slate-200">DRUM TRIGGER GRID (64 STEPS)</span>
                  </div>
                  <button
                    onClick={() => {
                      const op: ProductionOperation = {
                        id: `op_quant_${Date.now()}`,
                        type: 'QUANTIZE_TRACK',
                        trackId: track.id,
                        description: `Quantized ${track.name} to 1/16 grid`,
                        source: 'MANUAL_UI',
                        timestamp: Date.now(),
                        undo: (t) => t,
                        redo: (t) => t,
                      };
                      productionHistory.recordOperation(op);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[10px] font-bold transition cursor-pointer"
                  >
                    Quantize 1/16
                  </button>
                </div>

                <div className="grid grid-cols-8 sm:grid-cols-16 gap-1 text-center">
                  {track.steps.slice(0, 16).map((active, sIdx) => {
                    const isCurrent = (dawState.currentStep % 16) === sIdx;
                    return (
                      <button
                        key={sIdx}
                        onClick={() => handleToggleDrumStep(sIdx)}
                        className={`p-2 rounded-lg border text-[10px] font-bold transition cursor-pointer flex flex-col justify-between h-14 ${
                          active
                            ? isCurrent
                              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md ring-2 ring-amber-300'
                              : 'bg-blue-600 text-white border-blue-400 shadow-sm'
                            : isCurrent
                            ? 'bg-slate-800 text-amber-300 border-amber-500/40'
                            : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-[8px] opacity-70">{sIdx + 1}</span>
                        <span className="text-[10px] font-black">{active ? (track.notes?.[sIdx] || track.pitch) : '-'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2B. VOCAL WORKSTATION: Waveform Takes & Audio Clip Gain/Trim (NOT FAKE MIDI!) */}
            {isVocal && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center space-x-2">
                    <AudioWaveform className="w-4 h-4 text-pink-400" />
                    <span className="font-bold text-slate-200">VOCAL AUDIO TAKES & WAVEFORM CLIP DECK</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setActiveVocalTakeId('take_01')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${activeVocalTakeId === 'take_01' ? 'bg-pink-500 text-white' : 'bg-slate-900 text-slate-400'}`}
                    >
                      Take 1 (Main Lead)
                    </button>
                    <button
                      onClick={() => setActiveVocalTakeId('take_02')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${activeVocalTakeId === 'take_02' ? 'bg-pink-500 text-white' : 'bg-slate-900 text-slate-400'}`}
                    >
                      Take 2 (Overdub)
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span>Lead Vocal Audio Buffer (PCM 44.1kHz • 24-bit):</span>
                    <span className="text-pink-400 font-bold">Duration: 4.35s • Pitch: C4</span>
                  </div>

                  {/* Simulated High-Res Audio Waveform */}
                  <div className="w-full h-16 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between px-3 relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-around opacity-40">
                      {Array.from({ length: 48 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-pink-500 rounded-full"
                          style={{ height: `${Math.sin(i * 0.4) * 50 + 40}%` }}
                        />
                      ))}
                    </div>
                    <div className="relative z-10 text-[10px] text-slate-300 font-bold bg-slate-900/80 px-2 py-1 rounded border border-slate-700">
                      Take 1: "I've been waiting for the sunrise..."
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[10px]">
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-slate-500">Clip Gain:</span>
                      <div className="text-amber-300 font-bold">+1.5dB Trim</div>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-slate-500">Pitch Correction:</span>
                      <div className="text-emerald-400 font-bold">Natural Scale (C MIN)</div>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-slate-500">Formant Shift:</span>
                      <div className="text-cyan-400 font-bold">0.0 Semitones</div>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-slate-500">De-Esser:</span>
                      <div className="text-pink-400 font-bold">-4.5dB @ 6.8kHz</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2C. BASS & MELODIC WORKSTATION: Tactile Piano Roll Grid */}
            {!isDrums && !isVocal && (
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center space-x-2">
                    <Music className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-slate-200">
                      {isBass ? 'MONOPHONIC BASS PIANO ROLL' : 'POLYPHONIC PIANO ROLL & CHORD EDITOR'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar border border-slate-800/80 rounded-xl p-2 bg-slate-900/50">
                  {PIANO_PITCHES.slice(isBass ? 16 : 6, isBass ? 30 : 20).map((pitch) => {
                    const isBlackKey = pitch.includes('#');
                    return (
                      <div key={pitch} className="flex items-center space-x-1">
                        <div
                          className={`w-12 py-1 px-1.5 rounded text-[10px] font-bold text-left border flex items-center justify-between ${
                            isBlackKey ? 'bg-slate-950 text-slate-300 border-slate-800' : 'bg-slate-800 text-slate-100 border-slate-700'
                          }`}
                        >
                          <span>{pitch}</span>
                        </div>

                        <div className="flex-1 grid grid-cols-16 gap-0.5">
                          {Array.from({ length: 16 }).map((_, sIdx) => {
                            const isNoteActive = track.steps[sIdx] && (track.notes?.[sIdx] || track.pitch) === pitch;
                            const isCurrent = (dawState.currentStep % 16) === sIdx;

                            return (
                              <button
                                key={sIdx}
                                onClick={() => handleTogglePianoNote(sIdx, pitch)}
                                className={`h-6 rounded-sm transition cursor-pointer ${
                                  isNoteActive
                                    ? 'bg-purple-500 border border-purple-300 shadow-sm shadow-purple-500/40'
                                    : isCurrent
                                    ? 'bg-slate-800/80 border border-amber-500/30'
                                    : isBlackKey
                                    ? 'bg-slate-950/80 border border-slate-900 hover:bg-slate-800'
                                    : 'bg-slate-900/60 border border-slate-800/60 hover:bg-slate-800'
                                }`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SOUND VAULT -> Level 4 Creative Vault & In-Context Audition */}
        {activeTab === 'SOUND' && (
          <div className="space-y-3 text-xs font-mono">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-slate-200">
                  LEVEL 4 SOUND VAULT • {track.instrument.toUpperCase()} LIBRARY ({filteredSounds.length} Sounds)
                </span>
              </div>

              <div className="flex items-center space-x-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 focus-within:border-emerald-500 transition">
                <Search className="w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  value={semanticQuery}
                  onChange={(e) => setSemanticQuery(e.target.value)}
                  placeholder="E04 Search: 'punchy 80Hz thump'..."
                  className="bg-transparent text-xs text-slate-200 focus:outline-none w-56 font-mono"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-emerald-500/50 shadow-xl flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-bold">
                  <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
                  <span>AUDITION — PLAYS THROUGH THIS CHANNEL</span>
                </div>
                <div className="text-sm font-black text-emerald-300 flex items-center space-x-2">
                  <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400 animate-pulse" />
                  <span>{activeAuditionSound}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {auditionSoundItem ? (
                  <button
                    data-testid="commit-sound"
                    onClick={() => handleCommitSound(auditionSoundItem)}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-mono font-black flex items-center space-x-1.5 shadow-lg shadow-emerald-500/25 transition cursor-pointer active:scale-98"
                  >
                    <Check className="w-4 h-4" />
                    <span>✔ COMMIT SOUND TO TRACK</span>
                  </button>
                ) : null}
                {auditionSoundItem ? (
                  <button
                    data-testid="cancel-audition"
                    onClick={cancelAudition}
                    className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-[11px] font-bold transition cursor-pointer"
                    title="Put the committed sound back"
                  >
                    KEEP CURRENT
                  </button>
                ) : (
                  <span className="px-3 py-1.5 rounded-xl bg-slate-950 text-slate-400 border border-slate-800 text-[11px] font-bold">
                    ✓ Currently Committed Sound Active
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredSounds.map((snd) => (
                <div
                  key={snd.id}
                  data-testid={`vault-sound-${snd.id}`}
                  onClick={() => void auditionSound(snd)}
                  className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                    activeAuditionSound === snd.name ? 'bg-slate-900 border-emerald-500 ring-1 ring-emerald-500/40' : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900/90'
                  }`}
                >
                  <div className="font-bold text-slate-100 text-xs truncate">{snd.name}</div>
                  <div className="text-[10px] text-slate-400">{snd.character}</div>
                  <div className="flex justify-between text-[10px] text-emerald-400 pt-1 border-t border-slate-800 mt-2">
                    <span>{snd.subGenre}</span>
                    <span className="text-slate-400">Audition 🔊</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: SYNTH_DSP -> ADSR Envelopes, Resonant Filter & Performance Sculptor */}
        {activeTab === 'SYNTH_DSP' && (
          <div className="space-y-3 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-slate-200">
                  {isDrums ? 'PUNCH, TRANSIENT ATTACK & DECAY' : isVocal ? 'VOCAL PREAMP & WARMTH' : 'ADSR ENVELOPE & RESONANT FILTER'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* ADSR Controls */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="text-slate-300 font-bold text-[11px] flex justify-between">
                  <span>AMPLITUDE ENVELOPE</span>
                  <span className="text-amber-400 text-[10px]">VCA</span>
                </div>
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Attack: {instParams.attack}ms</span>
                    <input
                      type="range"
                      min={1}
                      max={250}
                      value={instParams.attack}
                      onChange={(e) => handleUpdateInstrumentParam('attack', Number(e.target.value))}
                      className="w-24 accent-amber-500"
                    />
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Decay: {instParams.decay}ms</span>
                    <input
                      type="range"
                      min={50}
                      max={2000}
                      value={instParams.decay}
                      onChange={(e) => handleUpdateInstrumentParam('decay', Number(e.target.value))}
                      className="w-24 accent-amber-500"
                    />
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Sustain: {instParams.sustain}%</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={instParams.sustain}
                      onChange={(e) => handleUpdateInstrumentParam('sustain', Number(e.target.value))}
                      className="w-24 accent-amber-500"
                    />
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Release: {instParams.release}ms</span>
                    <input
                      type="range"
                      min={10}
                      max={1500}
                      value={instParams.release}
                      onChange={(e) => handleUpdateInstrumentParam('release', Number(e.target.value))}
                      className="w-24 accent-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Filter Section */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="text-slate-300 font-bold text-[11px] flex justify-between">
                  <span>RESONANT FILTER</span>
                  <span className="text-purple-400 text-[10px]">24dB Ladder</span>
                </div>
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Cutoff: {instParams.filterCutoff}Hz</span>
                    <input
                      type="range"
                      min={20}
                      max={20000}
                      value={instParams.filterCutoff}
                      onChange={(e) => handleUpdateInstrumentParam('filterCutoff', Number(e.target.value))}
                      className="w-24 accent-purple-500"
                    />
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Resonance: {instParams.filterResonance} Q</span>
                    <input
                      type="range"
                      min={0.1}
                      max={10}
                      step={0.1}
                      value={instParams.filterResonance}
                      onChange={(e) => handleUpdateInstrumentParam('filterResonance', Number(e.target.value))}
                      className="w-24 accent-purple-500"
                    />
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Drive / Sat: {instParams.drive}%</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={instParams.drive}
                      onChange={(e) => handleUpdateInstrumentParam('drive', Number(e.target.value))}
                      className="w-24 accent-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Performance / Sub Sculptor */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="text-slate-300 font-bold text-[11px] flex justify-between">
                  <span>PERFORMANCE SCULPT</span>
                  <span className="text-cyan-400 text-[10px]">Sub / Glide</span>
                </div>
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Glide Time: {instParams.glideTime}ms</span>
                    <input
                      type="range"
                      min={0}
                      max={500}
                      value={instParams.glideTime}
                      onChange={(e) => handleUpdateInstrumentParam('glideTime', Number(e.target.value))}
                      className="w-24 accent-cyan-500"
                    />
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Sub Weight: +{instParams.subWeight}dB</span>
                    <input
                      type="range"
                      min={0}
                      max={12}
                      step={0.5}
                      value={instParams.subWeight}
                      onChange={(e) => handleUpdateInstrumentParam('subWeight', Number(e.target.value))}
                      className="w-24 accent-cyan-500"
                    />
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Timbre: {instParams.timbreBrightness}%</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={instParams.timbreBrightness}
                      onChange={(e) => handleUpdateInstrumentParam('timbreBrightness', Number(e.target.value))}
                      className="w-24 accent-cyan-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: LAYERS -> Native Track Layering & Stacking Surface */}
        {activeTab === 'LAYERS' && (
          <div className="space-y-3 text-xs font-mono">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-slate-200">TRACK LAYERS & SOUND STACKING ({layers.length} Layers)</span>
              </div>
              <div className="flex items-center space-x-2">
                {layers.length > 1 && (
                  <button
                    onClick={() => handleExplodeLayersToTracks(track.id)}
                    className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-[10px] flex items-center space-x-1 shadow-md shadow-purple-500/20 transition cursor-pointer active:scale-95"
                    title="Explode all stacked layers into distinct DAW tracks while preserving volume, pan, and provenance"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>✦ EXPLODE LAYERS TO TRACKS</span>
                  </button>
                )}
              </div>
            </div>

            {/* Layer Strip Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {layers.map((layer, idx) => (
                <div
                  key={layer.id}
                  className={`p-3 rounded-xl border transition space-y-2.5 ${
                    layer.mute
                      ? 'bg-slate-950/60 border-slate-800/50 opacity-60'
                      : 'bg-slate-900 border-slate-800 shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <div className="flex items-center space-x-2 truncate">
                      <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 flex-shrink-0" />
                      <span className="font-bold text-slate-100 truncate text-[11px]">{layer.name}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleUpdateTrackLayer(track.id, layer.id, { mute: !layer.mute })}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          layer.mute ? 'bg-rose-500 text-white font-black' : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        M
                      </button>
                      <button
                        onClick={() => handleUpdateTrackLayer(track.id, layer.id, { solo: !layer.solo })}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          layer.solo ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        S
                      </button>
                      {idx > 0 && (
                        <button
                          onClick={() => handleRemoveTrackLayer(track.id, layer.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-rose-500/10 transition"
                          title="Remove Layer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 text-[9px] text-slate-400">
                    <div className="flex justify-between">
                      <span>Sound:</span>
                      <span className="text-slate-200 font-bold">{layer.soundName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Character:</span>
                      <span className="text-cyan-300">{layer.character}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Origin:</span>
                      <span className="text-slate-500 text-[8px] uppercase">{layer.originType || 'MANUAL'}</span>
                    </div>
                  </div>

                  {/* Volume & Pan Controls */}
                  <div className="space-y-1.5 pt-1 border-t border-slate-800/80 text-[10px]">
                    <div>
                      <div className="flex justify-between text-slate-400 text-[9px]">
                        <span>Layer Trim:</span>
                        <span className="text-cyan-300 font-bold">{layer.volume > 0 ? `+${layer.volume}` : layer.volume} dB</span>
                      </div>
                      <input
                        type="range"
                        min={-20}
                        max={6}
                        value={layer.volume}
                        onChange={(e) => handleUpdateTrackLayer(track.id, layer.id, { volume: Number(e.target.value) })}
                        className="w-full accent-cyan-500 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-slate-400 text-[9px]">
                        <span>Pan:</span>
                        <span className="text-slate-300 font-mono">{layer.pan === 0 ? 'C' : layer.pan < 0 ? `L${Math.abs(Math.round(layer.pan * 50))}` : `R${Math.round(layer.pan * 50)}`}</span>
                      </div>
                      <input
                        type="range"
                        min={-1}
                        max={1}
                        step={0.1}
                        value={layer.pan}
                        onChange={(e) => handleUpdateTrackLayer(track.id, layer.id, { pan: Number(e.target.value) })}
                        className="w-full accent-cyan-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Add Presets */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="text-[10px] text-slate-400 font-bold flex items-center space-x-1">
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                <span>STACK ADDITIONAL SOUND LAYERS:</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() =>
                    handleAddTrackLayer(track.id, {
                      name: `Layer ${String.fromCharCode(65 + layers.length)} (Sub Body)`,
                      soundName: isDrums ? 'Deep 50Hz Sine Sub' : isBass ? 'Sub Fundamental 40Hz' : 'Sub Harmonic Bass',
                      volume: -2,
                      character: 'Deep Sub Energy',
                      originType: 'MANUAL_SOUND_VAULT',
                    })
                  }
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-left transition cursor-pointer active:scale-95"
                >
                  <div className="text-[10px] font-bold text-amber-300">+ Sub Body Layer</div>
                  <div className="text-[8px] text-slate-500">Low-end punch (40Hz–90Hz)</div>
                </button>
                <button
                  onClick={() =>
                    handleAddTrackLayer(track.id, {
                      name: `Layer ${String.fromCharCode(65 + layers.length)} (Acoustic Transient)`,
                      soundName: isDrums ? 'Crisp Wood Transient Snap' : 'Acoustic Attack Transient',
                      volume: -4,
                      character: 'Fast Click Transient',
                      originType: 'MANUAL_SOUND_VAULT',
                    })
                  }
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-left transition cursor-pointer active:scale-95"
                >
                  <div className="text-[10px] font-bold text-cyan-300">+ Transient Click</div>
                  <div className="text-[8px] text-slate-500">Snappy attack & presence</div>
                </button>
                <button
                  onClick={() =>
                    handleAddTrackLayer(track.id, {
                      name: `Layer ${String.fromCharCode(65 + layers.length)} (Harmonic Dirt)`,
                      soundName: 'Tape Saturated Harmonic Layer',
                      volume: -6,
                      character: 'Warm Tape Saturation',
                      originType: 'SYNTHESIS',
                    })
                  }
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/40 text-left transition cursor-pointer active:scale-95"
                >
                  <div className="text-[10px] font-bold text-purple-300">+ Harmonic Dirt</div>
                  <div className="text-[8px] text-slate-500">Analog warmth & overtone</div>
                </button>
                <button
                  onClick={() =>
                    handleAddTrackLayer(track.id, {
                      name: `Layer ${String.fromCharCode(65 + layers.length)} (Stereo Width)`,
                      soundName: 'Stereo Micro-Shift Doubler',
                      volume: -5,
                      pan: 0.4,
                      character: 'Stereo Width Spread',
                      originType: 'AI_PERFORMANCE_TRANSFER',
                    })
                  }
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-pink-500/40 text-left transition cursor-pointer active:scale-95"
                >
                  <div className="text-[10px] font-bold text-pink-300">+ Stereo Spread</div>
                  <div className="text-[8px] text-slate-500">Wide spatial dimension</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: AUTOMATION -> Interactive Multi-Bar Parameter Automation Canvas */}
        {activeTab === 'AUTOMATION' && (
          <div className="space-y-3 text-xs font-mono">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-slate-200">PARAMETER AUTOMATION LANE</span>
              </div>

              {/* Parameter Selector */}
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-500 text-[10px]">PARAM:</span>
                {(['filterCutoff', 'volume', 'reverbSend', 'glideTime', 'drive'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setSelectedAutomationParam(p)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedAutomationParam === p ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Automation Curve Canvas */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex justify-between text-[11px] text-slate-300 font-bold">
                <span>Active Curve: {selectedAutomationParam.toUpperCase()} (Bars 1–16)</span>
                <span className="text-amber-400">{activeAutomationLane.points.length} Automation Nodes</span>
              </div>

              {/* Graphical Timeline Curve */}
              <div className="w-full h-24 bg-slate-950 rounded-xl border border-slate-800 relative flex items-center justify-between px-4 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-between px-8 opacity-20 pointer-events-none">
                  {Array.from({ length: 16 }).map((_, barIdx) => (
                    <div key={barIdx} className="h-full border-r border-slate-600 text-[8px] text-slate-500 pt-1">
                      B{barIdx + 1}
                    </div>
                  ))}
                </div>

                {/* Rendered Nodes */}
                {activeAutomationLane.points.map((pt, pIdx) => (
                  <div
                    key={pIdx}
                    className="w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-slate-950 shadow-md shadow-amber-500/50 cursor-pointer hover:scale-125 transition relative z-10"
                    title={`Bar ${pt.bar}, Step ${pt.step}: ${pt.value}%`}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500">
                <span>Click along the timeline to create/drag automation points.</span>
                <button
                  onClick={() => handleAddAutomationPoint(dawState.currentBar || 1, dawState.currentStep % 16, 75)}
                  className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold hover:bg-amber-500/30 transition cursor-pointer"
                >
                  + Add Node at Current Playhead
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: CHANNEL DSP -> Parametric EQ, Compressor & Space */}
        {activeTab === 'FX' && (
          <div className="space-y-3 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-pink-400" />
                <span>CHANNEL PRODUCTION DSP (Parametric EQ, Optical Comp, Reverb/Delay Sends)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400">Low Shelf (80Hz): {dspSettings.lowGain > 0 ? `+${dspSettings.lowGain}` : dspSettings.lowGain}dB</div>
                <input
                  type="range"
                  min={-12}
                  max={12}
                  value={dspSettings.lowGain}
                  onChange={(e) => handleUpdateDspSetting('lowGain', Number(e.target.value))}
                  className="w-full accent-pink-500 mt-1 cursor-pointer"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400">Mid Parametric (1.2kHz): {dspSettings.midGain > 0 ? `+${dspSettings.midGain}` : dspSettings.midGain}dB</div>
                <input
                  type="range"
                  min={-12}
                  max={12}
                  value={dspSettings.midGain}
                  onChange={(e) => handleUpdateDspSetting('midGain', Number(e.target.value))}
                  className="w-full accent-pink-500 mt-1 cursor-pointer"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400">Comp Thresh: {dspSettings.compressorThreshold}dB</div>
                <input
                  type="range"
                  min={-40}
                  max={0}
                  value={dspSettings.compressorThreshold}
                  onChange={(e) => handleUpdateDspSetting('compressorThreshold', Number(e.target.value))}
                  className="w-full accent-pink-500 mt-1 cursor-pointer"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400">Reverb Send: {Math.round(dspSettings.reverbSend * 100)}%</div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(dspSettings.reverbSend * 100)}
                  onChange={(e) => handleUpdateDspSetting('reverbSend', Number(e.target.value) / 100)}
                  className="w-full accent-pink-500 mt-1 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
