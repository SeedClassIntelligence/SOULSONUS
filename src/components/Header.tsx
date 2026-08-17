import React, { useState } from 'react';
import {
  Play,
  Pause,
  Square,
  Mic,
  Volume2,
  HelpCircle,
  Sliders,
  Sparkles,
  Search,
  Users,
  Download,
  Database,
  RotateCcw,
  Repeat,
  Radio,
  Clock,
  Music2,
  Lock,
  BookOpen,
  Compass,
} from 'lucide-react';
import { DAWState, Preset } from '../types/daw';
import { PRESETS } from '../data/presets';
import { useStudioSession } from '../app/StudioSessionContext';

interface HeaderProps {
  dawState: DAWState;
  onStateChange: (updates: Partial<DAWState>) => void;
  onTogglePlay: () => void;
  onStop: () => void;
  onToggleMic: () => void;
  onSelectPreset: (preset: Preset) => void;
  onOpenHelp: () => void;
  onOpenTour?: () => void;
  onOpenTraining: () => void;
  onOpenSoundLibrary: () => void;
  onOpenDatasetRegistry: () => void;
  onOpenCollaboration: () => void;
  onOpenExport: () => void;
  onOpenVault?: () => void;
  onBackToLanding?: () => void;
  isMicActive: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  dawState,
  onStateChange,
  onTogglePlay,
  onStop,
  onToggleMic,
  onSelectPreset,
  onOpenHelp,
  onOpenTour,
  onOpenTraining,
  onOpenSoundLibrary,
  onOpenDatasetRegistry,
  onOpenCollaboration,
  onOpenExport,
  onBackToLanding,
  isMicActive,
}) => {
  const { setIsVaultModalOpen } = useStudioSession();
  const [isLooping, setIsLooping] = useState(true);
  const [metronomeOn, setMetronomeOn] = useState(true);
  const [quantizeSetting, setQuantizeSetting] = useState<'1/16' | '1/8' | 'OFF'>('1/16');

  // Compute Bar:Beat.Tick time counter (e.g. 1:01.00)
  const bar = Math.floor(dawState.currentStep / 16) + 1;
  const beat = Math.floor((dawState.currentStep % 16) / 4) + 1;
  const tick = (dawState.currentStep % 4) + 1;
  const timeFormatted = `${bar}:${beat < 10 ? `0${beat}` : beat}.${tick}`;

  return (
    <header className="bg-slate-950 border-b border-slate-900 text-slate-100 flex flex-col select-none shadow-2xl">
      {/* 1. TOP UTILITY ROW: Brand • Song Name • Key • Save • Modal Portals */}
      <div className="px-4 py-2 border-b border-slate-900/80 flex flex-wrap items-center justify-between gap-3 bg-slate-950/80">
        {/* Brand & Project Name */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToLanding}
            className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-600 flex items-center justify-center font-black text-base text-slate-950 shadow-md shadow-amber-500/20 hover:scale-105 transition cursor-pointer"
            title="Return to SoulSonus Story & Landing Page"
          >
            S
          </button>
          <div className="flex items-center space-x-2">
            <button
              onClick={onBackToLanding}
              className="text-sm font-black tracking-wider text-slate-100 uppercase hover:text-amber-300 transition cursor-pointer"
              title="Return to SoulSonus Story & Landing Page"
            >
              SOULSONUS
            </button>
            <button
              onClick={onBackToLanding}
              className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold hover:bg-amber-500/20 transition cursor-pointer"
              title="View SoulSonus Philosophy & Story"
            >
              ✦ STORY / HOME
            </button>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {/* Editable Song Title */}
          <div className="flex items-center space-x-1.5">
            <input
              type="text"
              value={dawState.projectName}
              onChange={(e) => onStateChange({ projectName: e.target.value })}
              className="bg-slate-900/80 border border-slate-800 text-xs font-bold text-slate-200 px-2.5 py-1 rounded-lg focus:outline-none focus:border-amber-500 max-w-[200px]"
              title="Click to rename project"
            />
          </div>
        </div>

        {/* Global Musical Metadata & Modal Launchers */}
        <div className="flex items-center space-x-2">
          {/* Key Signature */}
          <div
            className="flex items-center space-x-1 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 text-xs font-mono"
            title="Project Root Key & Scale (C Natural Minor)"
          >
            <Music2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">KEY:</span>
            <span className="text-cyan-300 font-bold">C MIN</span>
          </div>

          {/* Time Signature */}
          <div
            className="hidden sm:flex items-center space-x-1 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 text-xs font-mono"
            title="Project Time Signature (4 quarter-note beats per measure)"
          >
            <span className="text-slate-400">SIG:</span>
            <span className="text-slate-200 font-bold">4/4</span>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden md:block" />

          {/* Modal Portals */}
          <button
            onClick={() => (onOpenTour ? onOpenTour() : window.dispatchEvent(new CustomEvent('soulsonus:openTour', { detail: { aspectId: 'OVERVIEW' } })))}
            className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono font-black transition cursor-pointer shadow-sm shadow-amber-500/10 active:scale-95"
            title="Launch Interactive Studio Tour & Aspect Guide"
          >
            <Compass className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '8s' }} />
            <span>STUDIO TOUR</span>
          </button>

          <button
            onClick={onOpenTraining}
            className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold transition cursor-pointer shadow-sm shadow-amber-500/10"
            title="Open Creator Training & My Sounds Studio (E13 Signature + R09 Root Sound Vault + Voice Cloning)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>TRAIN SIGNATURE</span>
          </button>

          <button
            onClick={() => setIsVaultModalOpen(true)}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold transition cursor-pointer"
            title="Open Creative Resource Vault (25,000+ Open-Source Instruments, 808s, SoundFonts & Synths)"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">SOUND VAULT</span>
          </button>

          <button
            onClick={onOpenHelp}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold transition cursor-pointer"
            title="Open Master Studio Manual & Resource Center (Complete Guides, Trigger Manuals & Cheatsheet)"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>MANUAL</span>
          </button>

          <button
            onClick={onOpenCollaboration}
            className="hidden lg:flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono font-bold transition cursor-pointer"
            title="Open Real-Time Collaboration, Team Presence & Split Sheets"
          >
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>COLLAB</span>
          </button>

          <button
            onClick={onOpenExport}
            className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-black transition cursor-pointer shadow-md shadow-amber-500/20"
            title="Export Master Audio Packages (.WAV 24/48, FLAC, MP3, Stems, JSON Metadata)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN TRANSPORT ROW: ◀◀ ▶ ■ ● LOOP | 1:01 | BPM | METRO | QUANTIZE | MIC | MASTER */}
      <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-3 bg-slate-900/90">
        {/* Left Transport Cluster */}
        <div className="flex items-center space-x-2">
          {/* Rewind */}
          <button
            onClick={onStop}
            className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
            title="Rewind to Start"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Play / Pause */}
          <button
            id="btn-play-pause"
            onClick={onTogglePlay}
            className={`w-10 h-8 rounded-lg font-black flex items-center justify-center transition-all ${
              dawState.isPlaying
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 scale-105'
                : 'bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white'
            }`}
            title={dawState.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {dawState.isPlaying ? (
              <Pause className="w-4 h-4 fill-slate-950" />
            ) : (
              <Play className="w-4 h-4 fill-slate-100 ml-0.5" />
            )}
          </button>

          {/* Stop */}
          <button
            id="btn-stop"
            onClick={onStop}
            className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
            title="Stop Playhead"
          >
            <Square className="w-3.5 h-3.5" />
          </button>

          {/* Global Record Arm */}
          <button
            onClick={onToggleMic}
            className={`px-2.5 h-8 rounded-lg font-mono text-xs font-black flex items-center space-x-1.5 transition border ${
              isMicActive
                ? 'bg-rose-600 text-white border-rose-500 shadow-sm shadow-rose-600/40 animate-pulse'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-rose-400'
            }`}
            title="Toggle Mic Recording Engine"
          >
            <div className={`w-2 h-2 rounded-full ${isMicActive ? 'bg-white' : 'bg-rose-500'}`} />
            <span>● REC</span>
          </button>

          {/* Loop Mode */}
          <button
            onClick={() => setIsLooping(!isLooping)}
            className={`px-2.5 h-8 rounded-lg font-mono text-xs font-bold border transition flex items-center space-x-1 ${
              isLooping
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
            title="Toggle Continuous Loop Mode"
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>LOOP</span>
          </button>

          {/* Precision Bar:Beat.Tick Counter */}
          <div className="bg-slate-950 px-3 h-8 rounded-lg border border-slate-800 flex items-center font-mono text-xs text-amber-300 font-bold tracking-widest">
            <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
            <span>{timeFormatted}</span>
          </div>
        </div>

        {/* Center: BPM & Quantize */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          {/* BPM Tap & Input */}
          <div
            className="flex items-center space-x-1.5 bg-slate-950 px-3 h-8 rounded-lg border border-slate-800"
            title="Master Project Tempo in Beats Per Minute (40 - 240 BPM)"
          >
            <span className="text-slate-500 font-bold">BPM:</span>
            <input
              type="number"
              min={40}
              max={240}
              value={dawState.bpm}
              onChange={(e) => onStateChange({ bpm: Number(e.target.value) })}
              className="w-12 bg-transparent text-slate-100 font-black focus:outline-none text-center"
              title="Enter exact tempo in BPM"
            />
          </div>

          {/* Metronome */}
          <button
            onClick={() => setMetronomeOn(!metronomeOn)}
            className={`px-2.5 h-8 rounded-lg font-bold border transition ${
              metronomeOn
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
            title="Toggle Audible Metronome Click Guide (on quarter beats 1, 2, 3, 4)"
          >
            METRO
          </button>

          {/* Quantize Setting */}
          <div
            className="hidden sm:flex items-center space-x-1 bg-slate-950 px-2 h-8 rounded-lg border border-slate-800 text-[11px]"
            title="Input Quantization Grid: Snap live beatbox & step recordings to 1/16, 1/8, or OFF"
          >
            <span className="text-slate-500">Q:</span>
            <select
              value={quantizeSetting}
              onChange={(e) => setQuantizeSetting(e.target.value as any)}
              className="bg-transparent text-amber-400 font-bold focus:outline-none cursor-pointer"
            >
              <option value="1/16" className="bg-slate-900 text-slate-100">1/16</option>
              <option value="1/8" className="bg-slate-900 text-slate-100">1/8</option>
              <option value="OFF" className="bg-slate-900 text-slate-100">OFF</option>
            </select>
          </div>
        </div>

        {/* Right: Master Output Volume & Live Detection Status */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          {/* Master Output Volume */}
          <div
            className="flex items-center space-x-2 bg-slate-950 px-3 h-8 rounded-lg border border-slate-800"
            title={`Master Bus Output Level: ${Math.round(dawState.masterVolume * 100)}%`}
          >
            <Volume2 className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={dawState.masterVolume}
              onChange={(e) => onStateChange({ masterVolume: Number(e.target.value) })}
              className="w-20 accent-amber-500 cursor-pointer"
              title={`Master Volume Fader: ${Math.round(dawState.masterVolume * 100)}%`}
            />
            <span className="text-[10px] text-slate-400 w-7 text-right">
              {Math.round(dawState.masterVolume * 100)}%
            </span>
          </div>

          {/* Presets Menu */}
          <div className="hidden lg:flex items-center" title="Load Production Genre Kit Preset">
            <select
              onChange={(e) => {
                const p = PRESETS.find((preset) => preset.id === e.target.value);
                if (p) onSelectPreset(p);
              }}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono py-1.5 px-2.5 rounded-lg focus:outline-none focus:border-amber-500 cursor-pointer"
              title="Choose Production Genre Kit Preset (Dubler Vocal Beatbox, Melodic Trap, etc.)"
            >
              <option value="">Choose Preset...</option>
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">
                  {p.name} ({p.bpm} BPM)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
