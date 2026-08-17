import React, { useState } from 'react';
import { useStudioSession } from '../app/StudioSessionContext';
import { Track, PianoRollTool } from '../types/daw';
import { UnifiedTrackLane } from './UnifiedTrackLane';
import { TICKS_PER_16TH, TICKS_PER_BEAT } from '../utils/musicMath';
import { detectionEngine } from '../audio/detectionEngine';
import {
  Layers,
  Plus,
  Volume2,
  Mic,
  Activity,
  ChevronDown,
  ChevronUp,
  Check,
  Zap,
  Music,
  Radio,
  Drum,
  Disc,
  Piano,
  AudioWaveform,
  Sliders,
  Trash2,
  Sparkles,
  Eye,
  Target,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  FileText,
  Cable,
  MousePointer,
  Pencil,
  Scissors,
  Eraser,
  Brain,
  Compass,
} from 'lucide-react';

const INSTRUMENT_ICONS: { [key: string]: React.ReactNode } = {
  kick: <Drum className="w-3.5 h-3.5 text-amber-400" />,
  snare: <Target className="w-3.5 h-3.5 text-cyan-400" />,
  hihat: <Sparkles className="w-3.5 h-3.5 text-emerald-400" />,
  melody: <Music className="w-3.5 h-3.5 text-purple-400" />,
  bass: <Disc className="w-3.5 h-3.5 text-cyan-400" />,
  vocal_synth: <Mic className="w-3.5 h-3.5 text-pink-400" />,
  percussion: <Activity className="w-3.5 h-3.5 text-amber-400" />,
  strings: <Music className="w-3.5 h-3.5 text-blue-400" />,
  harmony: <Mic className="w-3.5 h-3.5 text-indigo-400" />,
  lyric_seed: <FileText className="w-3.5 h-3.5 text-pink-400" />,
  mouth_seed: <Mic className="w-3.5 h-3.5 text-amber-400" />,
  body_seed: <Activity className="w-3.5 h-3.5 text-cyan-400" />,
  keys_seed: <Music className="w-3.5 h-3.5 text-purple-400" />,
  audio_seed: <Disc className="w-3.5 h-3.5 text-blue-400" />,
};

const COLOR_THEMES: {
  [key: string]: {
    active: string;
    playheadActive: string;
    badge: string;
    borderAccent: string;
    iconBg: string;
    label: string;
  };
} = {
  kick: {
    active: 'bg-amber-400 border-amber-300 text-slate-950 shadow-md shadow-amber-500/30',
    playheadActive: 'bg-amber-300 border-white text-slate-950 ring-2 ring-amber-300 scale-105 z-10',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    borderAccent: 'border-l-4 border-l-amber-500',
    iconBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    label: 'KICK',
  },
  snare: {
    active: 'bg-cyan-400 border-cyan-300 text-slate-950 shadow-md shadow-cyan-400/30',
    playheadActive: 'bg-cyan-200 border-white text-slate-950 ring-2 ring-cyan-300 scale-105 z-10',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    borderAccent: 'border-l-4 border-l-cyan-400',
    iconBg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
    label: 'SNARE',
  },
  hihat: {
    active: 'bg-emerald-400 border-emerald-300 text-slate-950 shadow-md shadow-emerald-400/30',
    playheadActive: 'bg-emerald-200 border-white text-slate-950 ring-2 ring-emerald-300 scale-105 z-10',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    borderAccent: 'border-l-4 border-l-emerald-400',
    iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    label: 'HI-HAT',
  },
  bass: {
    active: 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-md shadow-cyan-500/30',
    playheadActive: 'bg-cyan-300 border-white text-slate-950 ring-2 ring-cyan-300 scale-105 z-10',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    borderAccent: 'border-l-4 border-l-cyan-400',
    iconBg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
    label: '808 BASS',
  },
  melody: {
    active: 'bg-purple-500 border-purple-400 text-white shadow-md shadow-purple-500/30',
    playheadActive: 'bg-purple-300 border-white text-slate-950 ring-2 ring-purple-300 scale-105 z-10',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    borderAccent: 'border-l-4 border-l-purple-500',
    iconBg: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    label: 'MELODY',
  },
  strings: {
    active: 'bg-blue-500 border-blue-400 text-white shadow-md shadow-blue-500/30',
    playheadActive: 'bg-blue-300 border-white text-slate-950 ring-2 ring-blue-300 scale-105 z-10',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    borderAccent: 'border-l-4 border-l-blue-500',
    iconBg: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    label: 'STRINGS',
  },
  vocal_synth: {
    active: 'bg-pink-500 border-pink-400 text-white shadow-md shadow-pink-500/30',
    playheadActive: 'bg-pink-300 border-white text-slate-950 ring-2 ring-pink-300 scale-105 z-10',
    badge: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
    borderAccent: 'border-l-4 border-l-pink-400',
    iconBg: 'bg-pink-500/10 text-pink-400 border border-pink-500/20',
    label: 'VOCAL',
  },
  harmony: {
    active: 'bg-indigo-500 border-indigo-400 text-white shadow-md shadow-indigo-500/30',
    playheadActive: 'bg-indigo-300 border-white text-slate-950 ring-2 ring-indigo-300 scale-105 z-10',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    borderAccent: 'border-l-4 border-l-indigo-400',
    iconBg: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
    label: 'HARMONY',
  },
  percussion: {
    active: 'bg-amber-400 border-amber-300 text-slate-950 shadow-md shadow-amber-500/30',
    playheadActive: 'bg-amber-300 border-white text-slate-950 ring-2 ring-amber-300 scale-105 z-10',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    borderAccent: 'border-l-4 border-l-amber-500',
    iconBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    label: 'PERCUSSION',
  },
  lyric_seed: {
    active: 'bg-pink-500 border-pink-400 text-white shadow-md shadow-pink-500/30',
    playheadActive: 'bg-pink-300 border-white text-slate-950 ring-2 ring-pink-300 scale-105 z-10',
    badge: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
    borderAccent: 'border-l-4 border-l-pink-500',
    iconBg: 'bg-pink-500/10 text-pink-400 border border-pink-500/20',
    label: 'LYRIC SEED',
  },
  mouth_seed: {
    active: 'bg-amber-500 border-amber-400 text-slate-950 shadow-md shadow-amber-500/30',
    playheadActive: 'bg-amber-300 border-white text-slate-950 ring-2 ring-amber-300 scale-105 z-10',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    borderAccent: 'border-l-4 border-l-amber-500',
    iconBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    label: 'MOUTH SEED',
  },
  body_seed: {
    active: 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-md shadow-cyan-500/30',
    playheadActive: 'bg-cyan-300 border-white text-slate-950 ring-2 ring-cyan-300 scale-105 z-10',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    borderAccent: 'border-l-4 border-l-cyan-500',
    iconBg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
    label: 'BODY SEED',
  },
  keys_seed: {
    active: 'bg-purple-500 border-purple-400 text-white shadow-md shadow-purple-500/30',
    playheadActive: 'bg-purple-300 border-white text-slate-950 ring-2 ring-purple-300 scale-105 z-10',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    borderAccent: 'border-l-4 border-l-purple-500',
    iconBg: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    label: 'KEYS SEED',
  },
  audio_seed: {
    active: 'bg-blue-500 border-blue-400 text-white shadow-md shadow-blue-500/30',
    playheadActive: 'bg-blue-300 border-white text-slate-950 ring-2 ring-blue-300 scale-105 z-10',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    borderAccent: 'border-l-4 border-l-blue-500',
    iconBg: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    label: 'AUDIO SEED',
  },
};

const PITCH_OPTIONS = [
  'C1', 'D1', 'E1', 'F1', 'G1', 'A1', 'B1',
  'C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2',
  'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4',
];

export const StudioCanvas: React.FC = () => {
  const {
    tracks,
    setTracks,
    activeWorkspace,
    dawState,
    selectionContext,
    setSelectionContext,
    activeProductionScope,
    setActiveProductionScope,
    isInspectorOpen,
    setIsInspectorOpen,
    sections,
    setSections,
    handleToggleMute,
    handleToggleSolo,
    handleChangeVolume,
    handleChangePitch,
    handleNudgeTrackPattern,
    handleShiftTrackRow,
    handleClearTrack,
    handleToggleStep,
    calibratingTrackId,
    setCalibratingTrackId,
    setIsCalibrationOpen,
    handleCreateSourceTrack,
    handleAddTrackLayer,
    handleToggleTrackViewMode,
    handleTransposeNotes,
    handleQuantizeTrackNotes,
    detectionSettings,
    setDetectionSettings,
    setIsAudioImportModalOpen,
  } = useStudioSession();

  const [activeBarView, setActiveBarView] = useState<'all' | 1 | 2 | 3 | 4>('all');
  const [isAddTrackOpen, setIsAddTrackOpen] = useState(false);
  const [seedTargetMode, setSeedTargetMode] = useState<'NEW_TRACK' | 'ADD_LAYER'>('NEW_TRACK');

  // Universal Arranger Toolbar State
  const [universalTool, setUniversalTool] = useState<PianoRollTool>('POINTER');
  const [universalSnapTicks, setUniversalSnapTicks] = useState<number>(TICKS_PER_16TH);
  const [universalSnapToScale, setUniversalSnapToScale] = useState<boolean>(true);
  const [showVelocityLane, setShowVelocityLane] = useState<boolean>(false);

  const selectedTrack = tracks.find((t) => t.id === selectionContext.selectedTrackId) || tracks[0] || null;

  // Real-time Global Sweeping Playhead
  const playheadPercent = ((dawState.currentStep % 64) / 64) * 100;

  // Determine slice indices for active bar view
  let stepStart = 0;
  let stepEnd = 64;
  if (activeBarView === 1) {
    stepStart = 0;
    stepEnd = 16;
  } else if (activeBarView === 2) {
    stepStart = 16;
    stepEnd = 32;
  } else if (activeBarView === 3) {
    stepStart = 32;
    stepEnd = 48;
  } else if (activeBarView === 4) {
    stepStart = 48;
    stepEnd = 64;
  }

  const visibleStepsCount = stepEnd - stepStart;
  const visibleStepIndices = Array.from({ length: visibleStepsCount }, (_, i) => stepStart + i);

  const handleAddNewTrack = (type: 'audio' | 'vocal' | 'drum' | 'bass' | 'melody') => {
    const id = `t-${type}-${Date.now()}`;
    let newTrack: Track;

    switch (type) {
      case 'audio':
        newTrack = {
          id,
          name: `Audio Performance ${tracks.filter((t) => t.id.includes('audio')).length + 1}`,
          instrument: 'custom',
          steps: Array(64).fill(false),
          mute: false,
          solo: false,
          volume: 0,
          pitch: 'C3',
          color: '#f59e0b',
        };
        break;
      case 'vocal':
        newTrack = {
          id,
          name: `Lead Vocal Track ${tracks.filter((t) => t.instrument === 'vocal_synth').length + 1}`,
          instrument: 'vocal_synth',
          steps: Array(64).fill(false),
          mute: false,
          solo: false,
          volume: 0,
          pitch: 'C3',
          color: '#ec4899',
        };
        break;
      case 'drum':
        newTrack = {
          id,
          name: `Percussion ${tracks.filter((t) => t.instrument === 'kick' || t.instrument === 'snare').length + 1}`,
          instrument: 'percussion',
          steps: Array(64).fill(false),
          mute: false,
          solo: false,
          volume: -1,
          pitch: 'C1',
          color: '#f59e0b',
        };
        break;
      case 'bass':
        newTrack = {
          id,
          name: `808 / Sub Bass ${tracks.filter((t) => t.instrument === 'bass').length + 1}`,
          instrument: 'bass',
          steps: Array(64).fill(false),
          mute: false,
          solo: false,
          volume: -2,
          pitch: 'C1',
          color: '#06b6d4',
        };
        break;
      case 'melody':
      default:
        newTrack = {
          id,
          name: `Lead Synth / Keys ${tracks.filter((t) => t.instrument === 'melody').length + 1}`,
          instrument: 'melody',
          steps: Array(64).fill(false),
          notes: Array(64).fill('C3'),
          mute: false,
          solo: false,
          volume: -3,
          pitch: 'C3',
          color: '#a855f7',
        };
        break;
    }

    setTracks((prev) => [...prev, newTrack]);
    setSelectionContext((prev) => ({ ...prev, selectedTrackId: id }));
    setIsAddTrackOpen(false);
  };

  const handleQuickPerformanceCapture = async (modality: 'MOUTH' | 'BODY' | 'KEYS' | 'AUDIO' | 'LYRICS') => {
    if (modality === 'AUDIO') {
      setIsAudioImportModalOpen(true);
      return;
    }
    handleCreateSourceTrack(modality);
    if (modality === 'MOUTH' || modality === 'BODY' || modality === 'KEYS') {
      if (!detectionSettings.enabled) {
        await detectionEngine.start();
        setDetectionSettings((prev) => ({
          ...prev,
          enabled: true,
          micConnected: true,
          kickThreshold: modality === 'MOUTH' ? 0.45 : 0.6,
          snareThreshold: modality === 'MOUTH' ? 0.45 : 0.35,
        }));
      }
    }
  };

  const getTrackTheme = (track: Track) => {
    const nameLower = track.name.toLowerCase();
    if (track.sourceModality === 'LYRICS' || nameLower.includes('lyrics')) return COLOR_THEMES.lyric_seed;
    if (track.sourceModality === 'MOUTH' || nameLower.includes('mouth')) return COLOR_THEMES.mouth_seed;
    if (track.sourceModality === 'BODY' || nameLower.includes('body')) return COLOR_THEMES.body_seed;
    if (track.sourceModality === 'KEYS' || nameLower.includes('keys')) return COLOR_THEMES.keys_seed;
    if (track.sourceModality === 'AUDIO' || nameLower.includes('audio')) return COLOR_THEMES.audio_seed;
    if (track.instrument === 'kick' || nameLower.includes('kick')) return COLOR_THEMES.kick;
    if (track.instrument === 'snare' || nameLower.includes('snare') || nameLower.includes('clap')) return COLOR_THEMES.snare;
    if (track.instrument === 'hihat' || nameLower.includes('hat')) return COLOR_THEMES.hihat;
    if (track.instrument === 'bass' || nameLower.includes('bass') || nameLower.includes('808')) return COLOR_THEMES.bass;
    if (nameLower.includes('string')) return COLOR_THEMES.strings;
    if (nameLower.includes('harmony') || nameLower.includes('ad-lib')) return COLOR_THEMES.harmony;
    if (track.instrument === 'vocal_synth' || nameLower.includes('vocal')) return COLOR_THEMES.vocal_synth;
    if (track.instrument === 'percussion') return COLOR_THEMES.percussion;
    return COLOR_THEMES.melody;
  };

  const getTrackIcon = (track: Track) => {
    const nameLower = track.name.toLowerCase();
    if (track.sourceModality === 'LYRICS' || nameLower.includes('lyrics')) return INSTRUMENT_ICONS.lyric_seed;
    if (track.sourceModality === 'MOUTH' || nameLower.includes('mouth')) return INSTRUMENT_ICONS.mouth_seed;
    if (track.sourceModality === 'BODY' || nameLower.includes('body')) return INSTRUMENT_ICONS.body_seed;
    if (track.sourceModality === 'KEYS' || nameLower.includes('keys')) return INSTRUMENT_ICONS.keys_seed;
    if (track.sourceModality === 'AUDIO' || nameLower.includes('audio')) return INSTRUMENT_ICONS.audio_seed;
    if (track.instrument === 'kick' || nameLower.includes('kick')) return INSTRUMENT_ICONS.kick;
    if (track.instrument === 'snare' || nameLower.includes('snare') || nameLower.includes('clap')) return INSTRUMENT_ICONS.snare;
    if (track.instrument === 'hihat' || nameLower.includes('hat')) return INSTRUMENT_ICONS.hihat;
    if (track.instrument === 'bass' || nameLower.includes('bass') || nameLower.includes('808')) return INSTRUMENT_ICONS.bass;
    if (nameLower.includes('string')) return INSTRUMENT_ICONS.strings;
    if (nameLower.includes('harmony') || nameLower.includes('ad-lib')) return INSTRUMENT_ICONS.harmony;
    if (track.instrument === 'vocal_synth' || nameLower.includes('vocal')) return INSTRUMENT_ICONS.vocal_synth;
    if (track.instrument === 'percussion') return INSTRUMENT_ICONS.percussion;
    return INSTRUMENT_ICONS.melody;
  };

  const getSeedStripLabel = () => {
    switch (activeWorkspace) {
      case 'CREATE':
        return {
          title: 'ORIGINATE ROOT CREATIVE SEED:',
          subtitle: '(Authoritative creative origin • Decomposed into canonical track objects)',
          color: 'text-amber-300',
          iconColor: 'text-amber-400',
        };
      case 'BUILD':
        return {
          title: 'RECORD CONTRIBUTION SEED / STACK LAYER:',
          subtitle: '(Child performance seeds • Non-destructive layer lineage attached to tracks)',
          color: 'text-cyan-300',
          iconColor: 'text-cyan-400',
        };
      case 'WRITE_RECORD':
        return {
          title: 'VOCAL & PERFORMANCE SEED INPUT:',
          subtitle: '(Hum harmony • Beatbox counter-groove • Tap percussion • Root lineage preserved)',
          color: 'text-pink-300',
          iconColor: 'text-pink-400',
        };
      case 'MIX':
        return {
          title: 'AURAL LAYER SEED INPUT:',
          subtitle: '(Live overdub / texture seed • Non-destructive mix insertion)',
          color: 'text-emerald-300',
          iconColor: 'text-emerald-400',
        };
      default:
        return {
          title: 'CONTRIBUTION SEED INPUT:',
          subtitle: '(Attach human performance seeds to project lineage)',
          color: 'text-amber-300',
          iconColor: 'text-amber-400',
        };
    }
  };

  const seedLabel = getSeedStripLabel();

  return (
    <div className="w-full bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden select-none font-mono text-xs flex flex-col">
      {/* 0. STUDIO SLIDE-OUT DRAWER PORTALS — Top Studio Drawer Buttons Strip */}
      <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider hidden sm:inline">
            STUDIO UTILITIES:
          </span>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'intelligence' }))}
            className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-[10px] flex items-center space-x-1.5 transition cursor-pointer shadow-md shadow-amber-500/20 active:scale-95"
            title="Open Studio Intelligence (Co-Producer & Autonomous Engineer)"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-950 animate-pulse" />
            <span>✦ STUDIO INTELLIGENCE</span>
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'nativebrain' }))}
            className="px-3 py-1 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 font-black text-[10px] flex items-center space-x-1.5 transition cursor-pointer active:scale-95 shadow-sm"
            title="Open Native Studio Brain (On-Device Neural Inference Sandbox)"
          >
            <Brain className="w-3.5 h-3.5 text-purple-400" />
            <span>🧠 NATIVE BRAIN</span>
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'workstation' }))}
            className={`px-3 py-1 rounded-xl border text-[10px] font-black flex items-center space-x-1.5 transition cursor-pointer active:scale-95 shadow-sm ${
              activeWorkspace === 'BUILD'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 border-cyan-400 font-black'
                : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
            }`}
            title="Open Selected Track Production Workstation as Side Panel (Source, Drum/Note Matrix, Sound Vault, Punch, Layers, Automation, DSP)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>🎛️ TRACK WORKSTATION</span>
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'songwriting' }))}
            className={`px-3 py-1 rounded-xl border text-[10px] font-black flex items-center space-x-1.5 transition cursor-pointer active:scale-95 shadow-sm ${
              activeWorkspace === 'WRITE_RECORD'
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-slate-950 border-pink-400 font-black'
                : 'bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border-pink-500/30'
            }`}
            title="Open Songwriting Suite & Vocal Booth as Side Panel (Lyrics, Takes, Comp, Punch, Pitch, Harmony, Voice Identity, Vocal DSP)"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>🎙️ SONGWRITING SUITE</span>
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'hardware' }))}
            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold flex items-center space-x-1.5 transition cursor-pointer active:scale-95"
            title="Open External MIDI Controllers, Hardware Synths, Clock Sync & Universal DAW Bundle Hub"
          >
            <Cable className="w-3 h-3 text-cyan-400" />
            <span>🎹 MIDI & HARDWARE</span>
          </button>
          <button
            onClick={() => setIsInspectorOpen(!isInspectorOpen)}
            className={`px-2.5 py-1 rounded-xl border text-[10px] font-bold flex items-center space-x-1.5 transition cursor-pointer active:scale-95 shadow-sm ${
              isInspectorOpen
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Open Quick Production Inspector Drawer"
          >
            <Sliders className="w-3 h-3" />
            <span>INSPECTOR</span>
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'calibration' }))}
            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-bold flex items-center space-x-1.5 transition cursor-pointer active:scale-95"
            title="Open FFT & Microphone Detection Calibration Drawer"
          >
            <Target className="w-3 h-3 text-amber-400" />
            <span>CALIBRATION</span>
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'visualization' }))}
            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-bold flex items-center space-x-1.5 transition cursor-pointer active:scale-95"
            title="Open Radial Step Visualizer Multi-Ring Radar Drawer"
          >
            <Eye className="w-3 h-3 text-cyan-400" />
            <span>RADIAL RADAR</span>
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('soulsonus:openTour', { detail: { aspectId: 'CANVAS_ARRANGER' } }))}
            className="px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black flex items-center space-x-1.5 transition cursor-pointer active:scale-95"
            title="Launch Interactive Tour for Arranger & Note Canvas"
          >
            <Compass className="w-3 h-3 text-amber-400 animate-spin" style={{ animationDuration: '8s' }} />
            <span>🎯 TOUR VIEW</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 text-[10px] text-slate-400">
          <span>Active Track: <strong className="text-amber-300">{selectedTrack?.name}</strong></span>
        </div>
      </div>

      {/* FULL-SCREEN FULL-WIDTH MULTI-TRACK INTEGRATED ARRANGER (100% Edge-to-Edge) */}
      <div className="w-full bg-slate-950 p-4 flex flex-col justify-between space-y-3 min-h-[600px]">
        <div>
            {/* 1. SECTIONS HEADER & PRODUCTION SCOPE */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
              <div className="flex items-center space-x-1">
                <span className="text-[9px] font-bold text-slate-500 mr-1 uppercase">SCOPE:</span>
                <button
                  onClick={() =>
                    setActiveProductionScope({
                      scopeType: 'ALL_SONG',
                      startBar: 1,
                      endBar: 16,
                    })
                  }
                  className={`py-1 px-2 rounded-lg border text-left transition cursor-pointer ${
                    activeProductionScope.scopeType === 'ALL_SONG'
                      ? 'bg-amber-500 text-slate-950 font-black border-amber-400 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-[10px] font-bold">ALL SONG</span>
                </button>
                {sections.map((sec, sIdx) => (
                  <button
                    key={sec.id}
                    onClick={() => {
                      setSelectionContext((prev) => ({ ...prev, selectedSectionId: sec.id }));
                      setActiveProductionScope({
                        scopeType: 'SECTION',
                        sectionId: sec.id,
                        startBar: sIdx * 4 + 1,
                        endBar: (sIdx + 1) * 4,
                      });
                    }}
                    className={`py-1 px-2.5 rounded-lg border text-left transition cursor-pointer ${
                      activeProductionScope.scopeType === 'SECTION' && activeProductionScope.sectionId === sec.id
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm font-bold'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 text-[10px]">
                      <span className="font-bold">{sec.name}</span>
                      <span className="text-[9px] text-slate-500">{sec.bars}b</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Bar Focus Tabs */}
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-[10px]">
                <button
                  onClick={() => setActiveBarView('all')}
                  className={`px-2.5 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                    activeBarView === 'all'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ALL 64
                </button>
                {[1, 2, 3, 4].map((barNum) => (
                  <button
                    key={barNum}
                    onClick={() => setActiveBarView(barNum as 1 | 2 | 3 | 4)}
                    className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                      activeBarView === barNum
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    BAR {barNum}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. UNIVERSAL ARRANGER EDITING TOOLBAR */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-900/90 rounded-xl border border-slate-800 text-[10px] font-mono mb-2">
              {/* Tool Selection Group */}
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-bold mr-1">TOOL:</span>
                <button
                  type="button"
                  onClick={() => setUniversalTool('POINTER')}
                  className={`px-2 py-1 rounded-lg flex items-center space-x-1 font-bold transition cursor-pointer ${
                    universalTool === 'POINTER'
                      ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                  title="Pointer Tool (V) - Select and Move Notes"
                >
                  <MousePointer className="w-3 h-3" />
                  <span>SELECT (V)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUniversalTool('PENCIL')}
                  className={`px-2 py-1 rounded-lg flex items-center space-x-1 font-bold transition cursor-pointer ${
                    universalTool === 'PENCIL'
                      ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                  title="Pencil Tool (B) - Draw Notes"
                >
                  <Pencil className="w-3 h-3" />
                  <span>DRAW (B)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUniversalTool('STRETCH')}
                  className={`px-2 py-1 rounded-lg flex items-center space-x-1 font-bold transition cursor-pointer ${
                    universalTool === 'STRETCH'
                      ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                  title="Stretch Tool (S) - Drag Right Handle to Stretch Duration"
                >
                  <ChevronRight className="w-3 h-3" />
                  <span>STRETCH (S)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUniversalTool('SCISSOR')}
                  className={`px-2 py-1 rounded-lg flex items-center space-x-1 font-bold transition cursor-pointer ${
                    universalTool === 'SCISSOR'
                      ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                  title="Scissor Tool (C) - Split Notes"
                >
                  <Scissors className="w-3 h-3" />
                  <span>SPLIT (C)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUniversalTool('ERASER')}
                  className={`px-2 py-1 rounded-lg flex items-center space-x-1 font-bold transition cursor-pointer ${
                    universalTool === 'ERASER'
                      ? 'bg-rose-500 text-white shadow-sm font-black'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                  title="Eraser Tool (E) - Delete Notes"
                >
                  <Eraser className="w-3 h-3" />
                  <span>ERASE (E)</span>
                </button>
              </div>

              {/* Musical Snap, Scale & Automation Group */}
              <div className="flex items-center gap-1.5">
                {/* Snap Grid */}
                <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                  <span className="text-[9px] text-slate-500">SNAP:</span>
                  <select
                    value={universalSnapTicks}
                    onChange={(e) => setUniversalSnapTicks(Number(e.target.value))}
                    className="bg-transparent text-amber-400 font-bold focus:outline-none cursor-pointer text-[9px]"
                  >
                    <option value={120} className="bg-slate-900 text-slate-200">1/16</option>
                    <option value={240} className="bg-slate-900 text-slate-200">1/8</option>
                    <option value={480} className="bg-slate-900 text-slate-200">1/4</option>
                    <option value={60} className="bg-slate-900 text-slate-200">1/32</option>
                    <option value={1} className="bg-slate-900 text-slate-200">Off</option>
                  </select>
                </div>

                {/* Scale Snapping Toggle */}
                <button
                  type="button"
                  onClick={() => setUniversalSnapToScale(!universalSnapToScale)}
                  className={`px-2 py-0.5 rounded-lg font-bold transition border cursor-pointer text-[9px] ${
                    universalSnapToScale
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                >
                  SCALE: C MINOR
                </button>

                {/* Transposition */}
                <div className="flex items-center gap-0.5 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[9px]">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedTrack) handleTransposeNotes(selectedTrack.id, -12);
                    }}
                    className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-slate-300 transition"
                    title="Transpose selected track down 1 octave"
                  >
                    -8ve
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedTrack) handleTransposeNotes(selectedTrack.id, 12);
                    }}
                    className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-slate-300 transition"
                    title="Transpose selected track up 1 octave"
                  >
                    +8ve
                  </button>
                </div>

                {/* Quantize Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (selectedTrack) handleQuantizeTrackNotes(selectedTrack.id, universalSnapTicks || 120);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold transition cursor-pointer text-[9px] flex items-center space-x-1"
                  title="Quantize selected track note timings"
                >
                  <Zap className="w-2.5 h-2.5 text-cyan-400" />
                  <span>QUANTIZE</span>
                </button>

                {/* Velocity Lane Toggle */}
                <button
                  type="button"
                  onClick={() => setShowVelocityLane(!showVelocityLane)}
                  className={`px-2 py-0.5 rounded-lg font-bold transition border cursor-pointer text-[9px] ${
                    showVelocityLane
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                      : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                  title="Toggle dynamic velocity automation lanes"
                >
                  VELOCITY
                </button>

                {/* + ADD TRACK Button (Moved Up Top) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsAddTrackOpen(!isAddTrackOpen)}
                    className="px-2.5 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition cursor-pointer text-[9px] flex items-center space-x-1 shadow-sm"
                    title="Add new track to session"
                  >
                    <Plus className="w-3 h-3 stroke-[3]" />
                    <span>+ ADD TRACK</span>
                  </button>

                  {isAddTrackOpen && (
                    <div className="absolute right-0 top-7 z-40 bg-slate-900 border border-amber-500/40 rounded-2xl p-3 shadow-2xl space-y-2 w-72">
                      <div className="text-[10px] font-bold text-amber-300 border-b border-slate-800 pb-1 flex justify-between items-center">
                        <span>ADD TRACK TO SESSION</span>
                        <button onClick={() => setIsAddTrackOpen(false)} className="text-slate-500 hover:text-slate-300">✕</button>
                      </div>
                      <div className="grid grid-cols-1 gap-1">
                        <button
                          onClick={() => { handleAddNewTrack('audio'); setIsAddTrackOpen(false); }}
                          className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-200 text-[10px] font-bold flex items-center space-x-2 transition cursor-pointer border border-slate-800"
                        >
                          <Mic className="w-3.5 h-3.5 text-amber-400" />
                          <span>🎤 Audio / Seed Track</span>
                        </button>
                        <button
                          onClick={() => { handleAddNewTrack('vocal'); setIsAddTrackOpen(false); }}
                          className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-200 text-[10px] font-bold flex items-center space-x-2 transition cursor-pointer border border-slate-800"
                        >
                          <Activity className="w-3.5 h-3.5 text-pink-400" />
                          <span>🎙️ Vocal Track</span>
                        </button>
                        <button
                          onClick={() => { handleAddNewTrack('drum'); setIsAddTrackOpen(false); }}
                          className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-200 text-[10px] font-bold flex items-center space-x-2 transition cursor-pointer border border-slate-800"
                        >
                          <Drum className="w-3.5 h-3.5 text-amber-400" />
                          <span>🥁 Drum Track</span>
                        </button>
                        <button
                          onClick={() => { handleAddNewTrack('bass'); setIsAddTrackOpen(false); }}
                          className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-200 text-[10px] font-bold flex items-center space-x-2 transition cursor-pointer border border-slate-800"
                        >
                          <Disc className="w-3.5 h-3.5 text-cyan-400" />
                          <span>🎹 808 / Sub Bass</span>
                        </button>
                        <button
                          onClick={() => { handleAddNewTrack('melody'); setIsAddTrackOpen(false); }}
                          className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-200 text-[10px] font-bold flex items-center space-x-2 transition cursor-pointer border border-slate-800"
                        >
                          <Music className="w-3.5 h-3.5 text-purple-400" />
                          <span>🎻 Keys / Synth / Strings</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2.5 CREATOR PERFORMANCE & SEED CAPTURE STRIP */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-gradient-to-r from-amber-500/15 via-slate-900/90 to-cyan-500/15 rounded-2xl border border-amber-500/40 text-xs font-mono mb-2 shadow-xl">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Mic className="w-4 h-4 text-amber-400 animate-pulse" />
                </div>
                <div>
                  <div className="text-[11px] font-black text-amber-300 tracking-wider">
                    CREATOR PERFORMANCE CAPTURE:
                  </div>
                  <div className="text-[9px] text-slate-400">
                    Instantly create track & arm microphone transient detection
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {/* 1. BEATBOX BUTTON */}
                <button
                  type="button"
                  onClick={() => handleQuickPerformanceCapture('MOUTH')}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 font-black text-[11px] flex items-center space-x-1.5 transition cursor-pointer active:scale-95 shadow-md shadow-amber-500/10"
                  title="Create Beatbox Track & Arm Mic (Kick & Snare Transient Capture)"
                >
                  <Drum className="w-3.5 h-3.5 text-amber-400" />
                  <span>🎤 BEATBOX (MOUTH)</span>
                </button>

                {/* 2. CLAP / TAP BUTTON */}
                <button
                  type="button"
                  onClick={() => handleQuickPerformanceCapture('BODY')}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 font-black text-[11px] flex items-center space-x-1.5 transition cursor-pointer active:scale-95 shadow-md shadow-cyan-500/10"
                  title="Create Hand Clap & Body Percussion Track"
                >
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>👏 CLAP / TAP (BODY)</span>
                </button>

                {/* 3. HUM / MELODY BUTTON */}
                <button
                  type="button"
                  onClick={() => handleQuickPerformanceCapture('KEYS')}
                  className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/50 font-black text-[11px] flex items-center space-x-1.5 transition cursor-pointer active:scale-95 shadow-md shadow-purple-500/10"
                  title="Create Voice Melody / Hum Track (Pitch Detection & Scale Snap)"
                >
                  <Music className="w-3.5 h-3.5 text-purple-400" />
                  <span>🎹 HUM / VOICE (MELODY)</span>
                </button>

                {/* 4. IMPORT AUDIO BUTTON */}
                <button
                  type="button"
                  onClick={() => setIsAudioImportModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/50 font-black text-[11px] flex items-center space-x-1.5 transition cursor-pointer active:scale-95 shadow-md shadow-blue-500/10"
                  title="Drop Audio File / Demucs 4-Stem Separation"
                >
                  <Disc className="w-3.5 h-3.5 text-blue-400" />
                  <span>📁 IMPORT AUDIO / STEMS</span>
                </button>
              </div>
            </div>

            {/* 3. GLOBAL 4-BAR TIMELINE RULER & PLAYHEAD */}
            <div className="flex border-b border-slate-800 bg-slate-900/80 text-[10px] font-mono text-slate-400 rounded-t-xl overflow-hidden mb-2">
              <div className="w-72 shrink-0 border-r border-slate-800 px-3 py-1 text-slate-500 font-bold flex items-center justify-between">
                <span>TRACK / SOURCE</span>
                <span className="text-[9px] text-amber-400">4-BAR TIMELINE</span>
              </div>
              <div className="flex-1 grid grid-cols-4 relative h-6">
                {[1, 2, 3, 4].map((bar) => (
                  <div key={bar} className="border-r border-slate-800/80 px-2 flex items-center justify-between">
                    <span className="font-bold text-slate-300">BAR {bar}</span>
                    <span className="text-[8.5px] text-slate-600">.1 .2 .3 .4</span>
                  </div>
                ))}
                {/* Global Sweeping Playhead indicator on ruler */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] pointer-events-none z-20"
                  style={{ left: `${playheadPercent}%` }}
                />
              </div>
            </div>

            {/* 4. MULTI-TRACK UNIFIED LANES */}
            <div className="space-y-2 max-h-[850px] overflow-y-auto pr-1 custom-scrollbar">
              {tracks.map((track, trackIdx) => (
                <UnifiedTrackLane
                  key={track.id}
                  track={track}
                  trackIdx={trackIdx}
                  isSelected={selectedTrack?.id === track.id}
                  activeTool={universalTool}
                  snapGridTicks={universalSnapTicks}
                  snapToScale={universalSnapToScale}
                  showVelocityLane={showVelocityLane}
                  playheadPercent={playheadPercent}
                  onSelectTrack={() => setSelectionContext((prev) => ({ ...prev, selectedTrackId: track.id }))}
                  onShiftRow={(dir) => handleShiftTrackRow(trackIdx, dir)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
  );
};
