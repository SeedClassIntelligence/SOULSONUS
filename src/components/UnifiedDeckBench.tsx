import React, { useState } from 'react';
import {
  Mic,
  Drum,
  Activity,
  Music,
  Plus,
  RotateCcw,
  RotateCw,
  Zap,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  ArrowUpDown,
  Trash2,
} from 'lucide-react';
import { useStudioSession } from '../app/StudioSessionContext';

export const UnifiedDeckBench: React.FC = () => {
  const {
    dawState,
    handleToggleMetronome,
    tracks,
    selectionContext,
    setSelectionContext,
    handleQuickPerformanceCapture,
    handleStopCapture,
    handleClearAll,
    handleCloneBarToAll,
    handleInvertPattern,
    handleRandomize,
    handleNudgeTrackPattern,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
  } = useStudioSession();

  const [activeModalityTab, setActiveModalityTab] = useState<'INSTRUMENT' | 'BEATBOX' | 'CLAP_TAP' | 'HUM_VOICE'>('INSTRUMENT');

  const takes = tracks.filter((t) => t.isSourceTrack);
  const selectedTrackId = selectionContext.selectedTrackId;

  const handleStartCaptureForTab = (tab: typeof activeModalityTab) => {
    let mod: 'MOUTH' | 'BODY' | 'KEYS' = 'MOUTH';
    if (tab === 'CLAP_TAP') mod = 'BODY';
    if (tab === 'INSTRUMENT') mod = 'KEYS';
    handleQuickPerformanceCapture(mod);
  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3 font-mono select-none">
      {/* LEFT CARD: LIVE SEED & BEATBOX ENGINE */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-xl flex flex-col justify-between">
        <div>
          {/* Header & Sub-tabs */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center space-x-2">
              <Mic className="w-4 h-4 text-cyan-400" />
              <span className="text-[11px] font-black uppercase text-slate-100 tracking-wider">
                LIVE SEED & BEATBOX ENGINE
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-slate-700" />
            </div>
          </div>

          {/* Mode Selector & Record Button Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px]">
              {[
                { id: 'INSTRUMENT' as const, label: 'INSTRUMENT' },
                { id: 'BEATBOX' as const, label: 'Beatbox' },
                { id: 'CLAP_TAP' as const, label: 'Clap / Tap' },
                { id: 'HUM_VOICE' as const, label: 'Hum / Voice' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveModalityTab(t.id)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    activeModalityTab === t.id
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => {
                  if (dawState.isRecording) handleStopCapture();
                  else handleStartCaptureForTab(activeModalityTab);
                }}
                className={`px-3 py-1.5 rounded-xl font-black text-[10px] flex items-center space-x-1.5 transition cursor-pointer ${
                  dawState.isRecording
                    ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-600/50'
                    : 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>{dawState.isRecording ? 'RECORDING' : 'RECORD'}</span>
              </button>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                {Math.round(dawState.bpm)} BPM
              </span>
              <button
                type="button"
                onClick={handleToggleMetronome}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                  dawState.isMetronomeOn
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                METRO
              </button>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 mb-3">
            Hits split onto the channels below in real-time as you perform
          </p>

          {/* Live Performance Take Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {takes.slice(0, 3).map((take, idx) => {
              const isSelected = take.id === selectedTrackId;
              const isMouth = take.sourceModality === 'MOUTH' || take.name.toLowerCase().includes('mouth');
              return (
                <div
                  key={take.id}
                  onClick={() => setSelectionContext((prev) => ({ ...prev, selectedTrackId: take.id }))}
                  className={`p-2.5 rounded-xl border transition cursor-pointer flex flex-col justify-between min-h-[72px] ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500 shadow-md shadow-blue-500/20'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">
                      {isMouth ? 'MOUTH — SEED' : 'KEYS — MIDI'}
                    </div>
                    <div className="text-[11px] font-bold text-slate-100 mt-0.5 truncate">
                      {take.name || `Take 0${idx + 1}`}
                    </div>
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1">
                    {take.audioClips?.length || 1} take{((take.audioClips?.length || 1) > 1) ? 's' : ''}
                  </div>
                </div>
              );
            })}

            {/* Empty Pad Slot Add Trigger */}
            <div
              onClick={() => handleStartCaptureForTab(activeModalityTab)}
              className="p-2.5 rounded-xl border border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/40 flex items-center justify-center min-h-[72px] cursor-pointer transition text-slate-500 hover:text-slate-300"
            >
              <Plus className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT CARD: 'SHOOT AROUND' PATTERN CONTROLS */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-xl flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-[11px] font-black uppercase text-slate-100 tracking-wider">
                'SHOOT AROUND' PATTERN CONTROLS
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="w-2 h-2 rounded-full bg-slate-700" />
            </div>
          </div>

          <p className="text-[10px] text-slate-400 mb-3">
            Rapidly duplicate, nudge 1/16th steps, undo/redo, and manipulate patterns across all 4 bars
          </p>

          {/* Action Buttons Matrix (Matching Screenshot 1) */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Undo / Redo */}
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>UNDO</span>
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>REDO</span>
            </button>

            {/* Primary Action: CLONE BAR 1 TO ALL */}
            <button
              type="button"
              onClick={() => handleCloneBarToAll(0)}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] shadow-md shadow-blue-600/30 flex items-center space-x-1.5 cursor-pointer transition"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>CLONE BAR 1 TO ALL</span>
            </button>

            {/* Nudge Left / Right */}
            <button
              type="button"
              onClick={() => handleNudgeTrackPattern('all', 'left')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-amber-400" />
              <span>NUDGE &lt;&lt;</span>
            </button>
            <button
              type="button"
              onClick={() => handleNudgeTrackPattern('all', 'right')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition"
            >
              <span>NUDGE &gt;&gt;</span>
              <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
            </button>

            {/* Randomize */}
            <button
              type="button"
              onClick={() => handleRandomize(0)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition"
            >
              <Shuffle className="w-3.5 h-3.5 text-purple-400" />
              <span>RANDOM 1</span>
            </button>

            {/* Invert */}
            <button
              type="button"
              onClick={handleInvertPattern}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
              <span>INVERT</span>
            </button>

            {/* Clear */}
            <button
              type="button"
              onClick={handleClearAll}
              className="px-2.5 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>CLEAR</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
