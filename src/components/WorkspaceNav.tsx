import React, { useState } from 'react';
import { motion } from 'motion/react';
import { WorkspaceTab } from '../types/daw';
import {
  Sparkles,
  Mic,
  Sliders,
  ShieldCheck,
  Activity,
  Menu,
  X,
  Music2,
  Drum,
  Database,
  Users,
  Brain,
  Layers,
  Cable,
  Target,
  Eye,
  Compass,
  Disc,
} from 'lucide-react';
import { useStudioSession } from '../app/StudioSessionContext';

interface WorkspaceNavProps {
  activeWorkspace: WorkspaceTab;
  onSelectWorkspace: (ws: WorkspaceTab) => void;
  soulFlowStageLabel?: string;
}

const WORKSPACES: { id: WorkspaceTab; label: string; icon: React.ReactNode; color: string; desc: string }[] = [
  {
    id: 'CREATE',
    label: '1. CREATE',
    icon: <Sparkles className="w-4 h-4 text-amber-400" />,
    color: 'amber',
    desc: 'Capture, Beatbox, Arrangement & 64-Step Grid',
  },
  {
    id: 'WRITE_RECORD',
    label: '2. WRITE & RECORD',
    icon: <Mic className="w-4 h-4 text-pink-400" />,
    color: 'pink',
    desc: 'Lyrics, Cadence & Vocal Take Stack',
  },
  {
    id: 'MIX',
    label: '3. MIX',
    icon: <Sliders className="w-4 h-4 text-emerald-400" />,
    color: 'emerald',
    desc: 'Dynamic Multi-Track Console & Bus FX',
  },
  {
    id: 'MASTER',
    label: '4. MASTER',
    icon: <Activity className="w-4 h-4 text-indigo-400" />,
    color: 'indigo',
    desc: '7-Stage Mastering Rack, LUFS & Reference A/B',
  },
  {
    id: 'RELEASE',
    label: '5. RELEASE',
    icon: <ShieldCheck className="w-4 h-4 text-purple-400" />,
    color: 'purple',
    desc: 'Finalization Gate, SeedSignature & Export',
  },
];

export const WorkspaceNav: React.FC<WorkspaceNavProps> = ({ activeWorkspace, onSelectWorkspace }) => {
  const {
    setIsAudioImportModalOpen,
    setIsVaultModalOpen,
    isInspectorOpen,
    setIsInspectorOpen,
  } = useStudioSession();

  const [isToolsOpen, setIsToolsOpen] = useState(false);

  return (
    <div className="w-full bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 shadow-lg relative z-30 select-none font-mono">
      <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar py-1">
        {/* STUDIO TOOLS Button on the EXACT SAME line */}
        <button
          type="button"
          onClick={() => setIsToolsOpen((v) => !v)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer active:scale-95 shrink-0 ${
            isToolsOpen
              ? 'bg-amber-500 text-slate-950 border border-amber-400 font-black shadow-md'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
          title="Open Studio Utilities Menu"
        >
          <Menu className="w-3.5 h-3.5" />
          <span>STUDIO TOOLS</span>
        </button>

        <span className="w-px h-4 bg-slate-800 mx-1 shrink-0" />

        {/* 5 Creator Workspace Navigation Tabs */}
        {WORKSPACES.map((ws) => {
          const isActive = activeWorkspace === ws.id;
          return (
            <button
              key={ws.id}
              onClick={() => onSelectWorkspace(ws.id)}
              title={`${ws.label}: ${ws.desc}`}
              className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-slate-800 text-white shadow-md border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {ws.icon}
              <span>{ws.label}</span>
              {isActive && (
                <motion.div
                  layoutId="activeWorkspaceGlow"
                  className="absolute inset-0 rounded-lg border border-amber-400/30 bg-amber-400/5 pointer-events-none"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center space-x-3 text-xs text-slate-400 font-mono">
        <span className="flex items-center space-x-1">
          <Activity className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span className="hidden sm:inline">Studio Workspace Engine</span>
        </span>
      </div>

      {/* STUDIO TOOLS DISCLOSED DROPDOWN MENU */}
      {isToolsOpen && (
        <div className="absolute left-4 top-[calc(100%+6px)] z-50 w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-2xl">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
              STUDIO UTILITIES & WORKSTATIONS
            </span>
            <button
              type="button"
              onClick={() => setIsToolsOpen(false)}
              className="text-slate-500 hover:text-slate-300 cursor-pointer text-xs font-bold"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setIsToolsOpen(false);
                window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'piano' }));
              }}
              className="px-2.5 py-1 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Music2 className="w-3 h-3 text-cyan-400" />
              <span>🎹 PIANO</span>
            </button>

            <button
              onClick={() => {
                setIsToolsOpen(false);
                window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'capture' }));
              }}
              className="px-2.5 py-1 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 border border-orange-500/40 text-[10px] font-bold flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Drum className="w-3 h-3 text-orange-400" />
              <span>INSTRUMENT</span>
            </button>

            <button
              onClick={() => {
                setIsToolsOpen(false);
                window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'training' }));
              }}
              className="px-2.5 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>TRAIN SIGNATURE</span>
            </button>

            <button
              onClick={() => {
                setIsToolsOpen(false);
                setIsVaultModalOpen(true);
              }}
              className="px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Database className="w-3 h-3 text-emerald-400" />
              <span>SOUND SOURCING</span>
            </button>

            <button
              onClick={() => {
                setIsToolsOpen(false);
                window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'collab' }));
              }}
              className="px-2.5 py-1 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Users className="w-3 h-3 text-purple-400" />
              <span>COLLAB</span>
            </button>

            <button
              onClick={() => {
                setIsToolsOpen(false);
                window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'intelligence' }));
              }}
              className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[10px] flex items-center space-x-1.5 transition cursor-pointer shadow-md"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-950 animate-pulse" />
              <span>✦ STUDIO INTELLIGENCE</span>
            </button>

            <button
              onClick={() => {
                setIsToolsOpen(false);
                window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'nativebrain' }));
              }}
              className="px-3 py-1 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 font-black text-[10px] flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Brain className="w-3.5 h-3.5 text-purple-400" />
              <span>🧠 NATIVE BRAIN</span>
            </button>

            <button
              onClick={() => {
                setIsToolsOpen(false);
                window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'workstation' }));
              }}
              className="px-3 py-1 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-black text-[10px] flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>🎛️ TRACK WORKSTATION</span>
            </button>

            <button
              onClick={() => {
                setIsToolsOpen(false);
                window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'songwriting' }));
              }}
              className="px-3 py-1 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border border-pink-500/30 font-black text-[10px] flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>🎙️ SONGWRITING SUITE</span>
            </button>

            <button
              onClick={() => {
                setIsToolsOpen(false);
                window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'hardware' }));
              }}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Cable className="w-3 h-3 text-cyan-400" />
              <span>🎹 MIDI & HARDWARE</span>
            </button>

            <button
              onClick={() => {
                setIsToolsOpen(false);
                setIsInspectorOpen(!isInspectorOpen);
              }}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-bold flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Sliders className="w-3 h-3" />
              <span>INSPECTOR</span>
            </button>

            <button
              onClick={() => {
                setIsToolsOpen(false);
                setIsAudioImportModalOpen(true);
              }}
              className="px-2.5 py-1 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/40 text-[10px] font-bold flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Disc className="w-3 h-3 text-blue-400" />
              <span>IMPORT AUDIO</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
