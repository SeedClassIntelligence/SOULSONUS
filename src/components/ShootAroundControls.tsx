import React, { useState } from 'react';
import {
  Copy,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Trash2,
  ArrowUpDown,
  Repeat,
  RotateCcw,
  RotateCw,
} from 'lucide-react';

/**
 * Pattern operations, grouped by what they do rather than laid out in a row.
 *
 * This was a titled panel with a heading, a sentence of description, and eight
 * equally-weighted buttons, permanently open above the lanes. It cost a full
 * row of the screen before a creator reached a single note, and it advertised
 * six occasional operations at the same volume as undo -- which is pressed
 * constantly.
 *
 * The two groups behave differently, so they are presented differently. History
 * stays out, as icons, because it is reached for mid-edit. The six pattern
 * operations are destructive-ish, deliberate, and infrequent, so they sit
 * behind one labelled disclosure that says what it holds.
 */
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

const OP =
  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold transition active:scale-95 cursor-pointer';

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
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-2 py-1.5 shadow-lg select-none">
      <div className="flex flex-wrap items-center gap-2">
        {/* History — pressed mid-edit, so it stays reachable. */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-950 border border-slate-800">
          <button
            id="btn-undo"
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-md text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            title="Undo last pattern change (Ctrl+Z / Cmd+Z)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            id="btn-redo"
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-md text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            title="Redo pattern change (Ctrl+Y / Shift+Cmd+Z)"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* One labelled disclosure, rather than six buttons shouting at once. */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-extrabold uppercase tracking-wide transition cursor-pointer ${
            open
              ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
              : 'bg-slate-950 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
          }`}
          title="Duplicate, nudge, invert and clear patterns across all 4 bars"
        >
          <Repeat className="w-3.5 h-3.5" />
          <span>Pattern</span>
          <span className="text-[9px] opacity-70">{open ? '▴' : '▾'}</span>
        </button>

        {open && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              id="btn-clone-bar1"
              onClick={onCloneBar1ToAll}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-extrabold transition active:scale-95 cursor-pointer"
              title="Copies Bar 1 (Steps 1-16) to Bars 2, 3, and 4"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Clone bar 1</span>
            </button>

            <button id="btn-nudge-left" onClick={onNudgeLeft} className={OP} title="Shift entire pattern 1 step left">
              <ChevronLeft className="w-3.5 h-3.5 text-amber-400" />
              <span>Nudge</span>
            </button>

            <button id="btn-nudge-right" onClick={onNudgeRight} className={OP} title="Shift entire pattern 1 step right">
              <span>Nudge</span>
              <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
            </button>

            <button id="btn-randomize-bar1" onClick={onRandomizeBar1} className={OP} title="Generate random beat in Bar 1">
              <Shuffle className="w-3.5 h-3.5 text-orange-400" />
              <span>Random</span>
            </button>

            <button id="btn-invert-pattern" onClick={onInvertPattern} className={OP} title="Flip active/inactive blocks">
              <ArrowUpDown className="w-3.5 h-3.5 text-purple-400" />
              <span>Invert</span>
            </button>

            {/* Set apart, because it is the one that throws work away. */}
            <button
              id="btn-clear-all"
              onClick={onClearAll}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-bold transition active:scale-95 cursor-pointer ml-1"
              title="Clear all 64 steps on all rows"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear grid</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
