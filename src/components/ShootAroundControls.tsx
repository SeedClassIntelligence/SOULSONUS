import React from 'react';
import { Copy, ChevronLeft, ChevronRight, Shuffle, Trash2, ArrowUpDown, Repeat, RotateCcw, RotateCw } from 'lucide-react';

interface ShootAroundControlsProps {
  onCloneBar1ToAll: () => void;
  onNudgeLeft: () => void;
  onNudgeRight: () => void;
  onRandomizeBar1: () => void;
  onClearAll: () => void;
  onInvertPattern: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const ShootAroundControls: React.FC<ShootAroundControlsProps> = ({
  onCloneBar1ToAll,
  onNudgeLeft,
  onNudgeRight,
  onRandomizeBar1,
  onClearAll,
  onInvertPattern,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-lg select-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Label */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Repeat className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
              'SHOOT AROUND' PATTERN CONTROLS
            </h3>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              Rapidly duplicate, nudge 1/16th steps, undo/redo, and manipulate patterns across all 4 bars
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Undo */}
          <button
            id="btn-undo"
            onClick={onUndo}
            disabled={!canUndo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 border border-slate-700 text-xs font-bold transition active:scale-95"
            title="Undo last pattern change (Ctrl+Z / Cmd+Z)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>UNDO</span>
          </button>

          {/* Redo */}
          <button
            id="btn-redo"
            onClick={onRedo}
            disabled={!canRedo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 border border-slate-700 text-xs font-bold transition active:scale-95"
            title="Redo pattern change (Ctrl+Y / Shift+Cmd+Z)"
          >
            <RotateCw className="w-3.5 h-3.5 text-amber-400" />
            <span>REDO</span>
          </button>

          <div className="h-4 w-px bg-slate-800 hidden sm:block mx-0.5" />

          {/* Clone Bar 1 to All */}
          <button
            id="btn-clone-bar1"
            onClick={onCloneBar1ToAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-extrabold transition shadow-sm active:scale-95"
            title="Copies Bar 1 (Steps 1-16) to Bars 2, 3, and 4"
          >
            <Copy className="w-3.5 h-3.5 text-amber-400" />
            <span>CLONE BAR 1 TO ALL</span>
          </button>

          {/* Nudge Left << */}
          <button
            id="btn-nudge-left"
            onClick={onNudgeLeft}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition active:scale-95"
            title="Shift entire pattern 1 step to the left (<<)"
          >
            <ChevronLeft className="w-4 h-4 text-amber-400" />
            <span>NUDGE &lt;&lt;</span>
          </button>

          {/* Nudge Right >> */}
          <button
            id="btn-nudge-right"
            onClick={onNudgeRight}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition active:scale-95"
            title="Shift entire pattern 1 step to the right (>>)"
          >
            <span>NUDGE &gt;&gt;</span>
            <ChevronRight className="w-4 h-4 text-amber-400" />
          </button>

          {/* Randomize Bar 1 */}
          <button
            id="btn-randomize-bar1"
            onClick={onRandomizeBar1}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition active:scale-95"
            title="Generate random beat in Bar 1"
          >
            <Shuffle className="w-3.5 h-3.5 text-orange-400" />
            <span>RANDOM BAR 1</span>
          </button>

          {/* Invert */}
          <button
            id="btn-invert-pattern"
            onClick={onInvertPattern}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition active:scale-95"
            title="Flip active/inactive blocks"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-purple-400" />
            <span>INVERT</span>
          </button>

          {/* Clear Grid */}
          <button
            id="btn-clear-all"
            onClick={onClearAll}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition active:scale-95 ml-auto sm:ml-0"
            title="Clear all 64 steps on all rows"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>CLEAR GRID</span>
          </button>
        </div>
      </div>
    </div>
  );
};
