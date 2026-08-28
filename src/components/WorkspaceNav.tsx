import React from 'react';
import { motion } from 'motion/react';
import { WorkspaceTab } from '../types/daw';
import { Sparkles, Mic, Sliders, ShieldCheck, Activity } from 'lucide-react';

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
  return (
    <div className="w-full bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 shadow-lg relative z-30 select-none font-mono">
      <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar py-1">
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
                  ? 'bg-slate-800 text-white shadow-md border border-slate-700 font-bold'
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
    </div>
  );
};
