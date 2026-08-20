import React from 'react';
import { Brain, Cable, Compass, Disc, Eye, Layers, Mic, Sliders, Sparkles, Target } from 'lucide-react';
import { useStudioSession } from '../app/StudioSessionContext';

/**
 * The studio utility bar: the drawer triggers and Import Audio.
 *
 * This used to live inside StudioCanvas, which renders only for CREATE and
 * BUILD — so eight workstations and the audio import were unreachable from
 * Mix, Master, Write & Record and Release. It is rendered once at app level
 * now, above the room, so every room can reach them.
 */
export const StudioUtilityBar: React.FC = () => {
  const {
    setIsAudioImportModalOpen,
    tracks,
    selectionContext,
    activeWorkspace,
    isInspectorOpen,
    setIsInspectorOpen,
  } = useStudioSession();
  const selectedTrack = tracks.find((t) => t.id === selectionContext.selectedTrackId) || tracks[0];

  return (
    <div className="w-full max-w-[1440px] mx-auto px-3 md:px-4">
      <div className="px-4 py-2 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono select-none">
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

          <button
            type="button"
            onClick={() => setIsAudioImportModalOpen(true)}
            className="px-2.5 py-1 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/40 text-[10px] font-bold flex items-center space-x-1.5 transition cursor-pointer active:scale-95"
            title="Import audio or separate a full mix into stems"
          >
            <Disc className="w-3 h-3 text-blue-400" />
            <span>IMPORT AUDIO</span>
          </button>

          <button
            type="button"
            id="btn-voice-command"
            onClick={() =>
              window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'voice_command' }))
            }
            className="px-2.5 py-1 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/40 text-[10px] font-bold flex items-center space-x-1.5 transition cursor-pointer active:scale-95"
            title="Speak or type a studio command"
          >
            <Mic className="w-3 h-3 text-purple-400" />
            <span>COMMAND</span>
          </button>

          <button
            type="button"
            id="btn-soulflow"
            onClick={() =>
              window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'soulflow' }))
            }
            className="px-2.5 py-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center space-x-1.5 transition cursor-pointer active:scale-95"
            title="The pipeline: which stage this project has reached, and what the next one needs"
          >
            <Compass className="w-3 h-3 text-emerald-400" />
            <span>PIPELINE</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 text-[10px] text-slate-400">
          <span>
            Active Track: <strong className="text-amber-300">{selectedTrack?.name || '—'}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
