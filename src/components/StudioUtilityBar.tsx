import React, { useState } from 'react';
import {
  Brain,
  Cable,
  Compass,
  Database,
  Disc,
  Drum,
  Eye,
  Layers,
  Mic,
  Music2,
  Sliders,
  Sparkles,
  Target,
  Users,
  ChevronDown,
  ChevronUp,
  Wrench,
} from 'lucide-react';
import { useStudioSession } from '../app/StudioSessionContext';

export const StudioUtilityBar: React.FC = () => {
  const {
    setIsAudioImportModalOpen,
    setIsVaultModalOpen,
    activeWorkspace,
    isInspectorOpen,
    setIsInspectorOpen,
  } = useStudioSession();

  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="w-full max-w-[1440px] mx-auto px-3 md:px-4 font-mono select-none">
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 shadow-xl transition flex flex-col space-y-2">
        {/* Sleek Disclosure Header */}
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="flex items-center space-x-2 text-xs font-bold text-slate-300 hover:text-amber-400 cursor-pointer transition"
          >
            <Wrench className="w-3.5 h-3.5 text-amber-400" />
            <span className="uppercase tracking-wider">STUDIO UTILITIES & WORKSTATIONS</span>
            {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
          </button>

          <span className="text-[10px] text-slate-500 font-bold hidden sm:inline">
            1-CLICK CREATOR WORKSTATIONS
          </span>
        </div>

        {/* Dual Tooltip Grid Rows (Collapsible, Zero Scrollbars) */}
        {isExpanded && (
          <div className="flex flex-col gap-1.5 border-t border-slate-800/80 pt-2 text-[10px] font-bold">
            {/* ROW 1: Performance & Sound Workstations */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5 w-full">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'piano' }))}
                className="px-2.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 flex items-center justify-center space-x-1.5 transition cursor-pointer active:scale-95 text-center"
                title="Open Interactive Virtual Piano Keyboard"
              >
                <Music2 className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="truncate">🎹 PIANO</span>
              </button>

              <button
                onClick={() => window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'capture' }))}
                className="px-2.5 py-1.5 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 border border-orange-500/40 flex items-center justify-center space-x-1.5 transition cursor-pointer active:scale-95 text-center"
                title="Open Performance Instrument"
              >
                <Drum className="w-3 h-3 text-orange-400 shrink-0" />
                <span className="truncate">INSTRUMENT</span>
              </button>

              <button
                onClick={() => window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'training' }))}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 flex items-center justify-center space-x-1.5 transition cursor-pointer active:scale-95 text-center"
                title="Open Creator Training & My Sounds Studio"
              >
                <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="truncate">SIGNATURE</span>
              </button>

              <button
                onClick={() => setIsVaultModalOpen(true)}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center space-x-1.5 transition cursor-pointer active:scale-95 text-center"
                title="Sound Sourcing Vault"
              >
                <Database className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">SOURCING</span>
              </button>

              <button
                onClick={() => window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'collab' }))}
                className="px-2.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center space-x-1.5 transition cursor-pointer active:scale-95 text-center"
                title="Open Real-Time Collaboration"
              >
                <Users className="w-3 h-3 text-purple-400 shrink-0" />
                <span className="truncate">COLLAB</span>
              </button>

              <button
                onClick={() => window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'nativebrain' }))}
                className="px-2.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/40 font-black flex items-center justify-center space-x-1.5 transition cursor-pointer active:scale-95 text-center"
                title="Open Native Studio Brain"
              >
                <Brain className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span className="truncate">NATIVE BRAIN</span>
              </button>

              <button
                onClick={() => window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'workstation' }))}
                className={`px-2.5 py-1.5 rounded-xl border font-black flex items-center justify-center space-x-1.5 transition cursor-pointer active:scale-95 text-center ${
                  activeWorkspace === 'CREATE'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 border-cyan-400 font-black'
                    : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                }`}
                title="Open Track Workstation"
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">WORKSTATION</span>
              </button>
            </div>

            {/* ROW 2: Studio Utilities & Inspect Tools */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5 w-full">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'songwriting' }))}
                className={`px-2.5 py-1.5 rounded-xl border font-black flex items-center justify-center space-x-1.5 transition cursor-pointer active:scale-95 text-center ${
                  activeWorkspace === 'WRITE_RECORD'
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-slate-950 border-pink-400 font-black'
                    : 'bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border-pink-500/30'
                }`}
                title="Open Songwriting Suite"
              >
                <Mic className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">SONGWRITING</span>
              </button>

              <button
                onClick={() => window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'hardware' }))}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 flex items-center justify-center space-x-1.5 transition cursor-pointer active:scale-95 text-center"
                title="Open External MIDI Controllers & Hardware Synths"
              >
                <Cable className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="truncate">MIDI HARDWARE</span>
              </button>

              <button
                onClick={() => setIsInspectorOpen(!isInspectorOpen)}
                className={`px-2.5 py-1.5 rounded-xl border flex items-center justify-center space-x-1.5 transition cursor-pointer active:scale-95 text-center ${
                  isInspectorOpen
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title="Open Quick Production Inspector Drawer"
              >
                <Sliders className="w-3 h-3 shrink-0" />
                <span className="truncate">INSPECTOR</span>
              </button>

              <button
                onClick={() => window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'calibration' }))}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center space-x-1.5 transition cursor-pointer active:scale-95 text-center"
                title="Open Calibration Drawer"
              >
                <Target className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="truncate">CALIBRATION</span>
              </button>

              <button
                onClick={() => window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'visualization' }))}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center space-x-1.5 transition cursor-pointer active:scale-95 text-center"
                title="Open Radial Radar Drawer"
              >
                <Eye className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="truncate">RADIAL RADAR</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAudioImportModalOpen(true)}
                className="px-2.5 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/40 flex items-center justify-center space-x-1.5 transition cursor-pointer active:scale-95 text-center"
                title="Import audio or separate mix into stems"
              >
                <Disc className="w-3 h-3 text-blue-400 shrink-0" />
                <span className="truncate">IMPORT AUDIO</span>
              </button>

              <button
                type="button"
                id="btn-soulflow"
                onClick={() => window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'soulflow' }))}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 flex items-center justify-center space-x-1.5 transition cursor-pointer active:scale-95 text-center"
                title="Open SoulFlow Governance Pipeline"
              >
                <Compass className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">PIPELINE</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
