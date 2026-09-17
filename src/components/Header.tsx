import { SoulSonusMark, SoulSonusWordmark } from './brand/SoulSonusLogo';
import React from 'react';
import { Download, BookOpen, Compass } from 'lucide-react';
import { DAWState } from '../types/daw';
import { EngineStatusBadge } from './EngineStatusBadge';
import { RevisionTreePanel } from './RevisionTreePanel';

interface HeaderProps {
  dawState: DAWState;
  onStateChange: (updates: Partial<DAWState>) => void;
  onOpenHelp: () => void;
  onOpenTour?: () => void;
  onOpenSoundLibrary: () => void;
  onOpenDatasetRegistry: () => void;
  onOpenExport: () => void;
  onOpenVault?: () => void;
  onOpenProjects?: () => void;
  onBackToLanding?: () => void;
  isMicActive: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  dawState,
  onStateChange,
  onOpenHelp,
  onOpenTour,
  onOpenSoundLibrary,
  onOpenDatasetRegistry,
  onOpenExport,
  onOpenProjects,
  onBackToLanding,
  isMicActive,
}) => {
  return (
    <header className="bg-slate-950 border-b border-slate-900 text-slate-100 flex flex-col select-none shadow-2xl">
      {/* 1. TOP UTILITY ROW: Brand • Song Name • Key • Save • Modal Portals */}
      <div className="px-4 py-2 border-b border-slate-900/80 flex flex-wrap items-center justify-between gap-3 bg-slate-950/80">
        {/* Brand & Project Name */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToLanding}
            className="hover:scale-105 transition cursor-pointer"
            title="Return to SoulSonus Story & Landing Page"
          >
            <SoulSonusMark size="md" />
          </button>
          <div className="flex items-center space-x-2">
            <button
              onClick={onBackToLanding}
              className="hover:opacity-80 transition cursor-pointer"
              title="Return to SoulSonus Story & Landing Page"
            >
              <SoulSonusWordmark size="sm" />
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
          {/* Key, time signature and the transpose steppers moved down one
              row, into the transport bar, with the tempo and the click. They
              are what a take is played against, not chrome. */}
          {/* Projects: save, open, start new */}
          <button
            type="button"
            data-testid="open-projects"
            onClick={() =>
              onOpenProjects
                ? onOpenProjects()
                : window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'projects' }))
            }
            className="hidden sm:flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold transition cursor-pointer"
            title="Save, open or start a project"
          >
            <span>💾 PROJECTS</span>
          </button>

          <div className="h-4 w-px bg-slate-800 hidden md:block" />

          {/* What is actually answering. Sits next to Studio Intelligence
              because that is the button whose behaviour changes when one of
              these stops responding. */}
          {/* The shape of the session. Beside the engine badge because both
              answer "what is actually true right now" rather than offering an
              action. */}
          <RevisionTreePanel />

          <EngineStatusBadge />

          {/* Blank Canvas and Studio Intelligence moved to the room bar, after
              RELEASE: they are session-level acts rather than chrome, and the
              creator asked for them there. */}
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
            onClick={onOpenHelp}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold transition cursor-pointer"
            title="Open Master Studio Manual & Resource Center (Complete Guides, Trigger Manuals & Cheatsheet)"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>MANUAL</span>
          </button>

          <button
            onClick={onOpenExport}
            className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-black transition cursor-pointer shadow-md shadow-amber-500/20"
            title="Render and export the master: 24-bit and 16-bit WAV, FLAC, per-track stems and a provenance record"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT</span>
          </button>
        </div>
      </div>

      {/* The transport is not in this row and is not in with the rooms
          either. It has a row of its own directly below this one --
          StudioTransportBar -- carrying play, stop, rewind, loop, the counter,
          the tempo, tap, key, signature and the click together, so no control
          here has its setup on another screen. RECORD stays at the microphone
          with the arming and the input meaning that decide what it does. */}
    </header>
  );
};
