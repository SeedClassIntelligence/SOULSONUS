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
  Square,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useStudioSession } from '../app/StudioSessionContext';

export const UnifiedDeckBench: React.FC = () => {
  const {
    dawState,
    handleToggleMetronome,
    tracks,
    setTracks,
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

  const [activeModalityTab, setActiveModalityTab] = useState<'INSTRUMENT' | 'BEATBOX' | 'CLAP_TAP' | 'HUM_VOICE'>('BEATBOX');
  const [isPatternControlsOpen, setIsPatternControlsOpen] = useState(false);

  const takes = tracks.filter((t) => t.isSourceTrack);
  const selectedTrackId = selectionContext.selectedTrackId;

  const handleStartCaptureForTab = (tab: typeof activeModalityTab) => {
    let mod: 'MOUTH' | 'BODY' | 'KEYS' = 'MOUTH';
    if (tab === 'CLAP_TAP') mod = 'BODY';
    if (tab === 'INSTRUMENT') mod = 'KEYS';
    handleQuickPerformanceCapture(mod);
  };

  const handleAddNewPadSlot = () => {
    if (dawState.isRecordingMic) {
      handleStopCapture();
      return;
    }
    const newPadId = `track_pad_${Date.now()}`;
    const padNumber = takes.length + 1;
    let inst = 'oral_beatbox';
    let modality: 'MOUTH' | 'BODY' | 'KEYS' = 'MOUTH';
    if (activeModalityTab === 'CLAP_TAP') { inst = 'body_percussion'; modality = 'BODY'; }
    if (activeModalityTab === 'HUM_VOICE') { inst = 'vocal_hum'; modality = 'MOUTH'; }
    if (activeModalityTab === 'INSTRUMENT') { inst = 'vocal_synth'; modality = 'KEYS'; }

    const newPadTrack: any = {
      id: newPadId,
      name: `Pad 0${padNumber}`,
      instrument: inst,
      color: '#06b6d4',
      isMuted: false,
      isSoloed: false,
      volume: 0.8,
      pan: 0,
      isSourceTrack: true,
      sourceModality: modality,
      events: [],
      audioClips: [],
    };

    setTracks((prev) => [...prev, newPadTrack]);
    setSelectionContext((prev) => ({ ...prev, selectedTrackId: newPadId }));
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-2xl mb-3 font-mono select-none flex flex-col space-y-3">
      {/* TOP WORKSTATION HEADER & PATTERN CONTROLS TOGGLE */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Mic className="w-4.5 h-4.5 text-cyan-400" />
          <span className="text-xs font-black uppercase text-slate-100 tracking-wider">
            LIVE SEED & BEATBOX ENGINE
          </span>
          <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
        </div>

        {/* Shoot Around Pattern Controls Folded Menu Trigger */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setIsPatternControlsOpen((v) => !v)}
            className={`px-3 py-1.5 rounded-xl border text-[10px] font-black tracking-wide flex items-center space-x-1.5 transition cursor-pointer ${
              isPatternControlsOpen
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                : 'bg-slate-950 text-amber-400 border-slate-800 hover:border-slate-700'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>PATTERN CONTROLS</span>
            {isPatternControlsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* FOLDED PATTERN CONTROLS MENU (Disclosed on demand) */}
      {isPatternControlsOpen && (
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-2 transition">
          <div className="text-[10px] text-slate-400 font-bold">
            ⚡ 'SHOOT AROUND' PATTERN MANIPULATION:
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30 text-[10px] font-bold flex items-center space-x-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>UNDO</span>
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={!canRedo}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30 text-[10px] font-bold flex items-center space-x-1 cursor-pointer"
            >
              <RotateCw className="w-3 h-3" />
              <span>REDO</span>
            </button>
            <button
              type="button"
              onClick={() => handleCloneBarToAll(0)}
              className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] shadow-sm flex items-center space-x-1 cursor-pointer"
            >
              <Zap className="w-3 h-3" />
              <span>CLONE BAR 1 TO ALL</span>
            </button>
            <button
              type="button"
              onClick={() => handleNudgeTrackPattern('all', 'left')}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-bold flex items-center space-x-1 cursor-pointer"
            >
              <ChevronLeft className="w-3 h-3 text-amber-400" />
              <span>NUDGE &lt;&lt;</span>
            </button>
            <button
              type="button"
              onClick={() => handleNudgeTrackPattern('all', 'right')}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-bold flex items-center space-x-1 cursor-pointer"
            >
              <span>NUDGE &gt;&gt;</span>
              <ChevronRight className="w-3 h-3 text-amber-400" />
            </button>
            <button
              type="button"
              onClick={() => handleRandomize(0)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-bold flex items-center space-x-1 cursor-pointer"
            >
              <Shuffle className="w-3 h-3 text-purple-400" />
              <span>RANDOM 1</span>
            </button>
            <button
              type="button"
              onClick={handleInvertPattern}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-bold flex items-center space-x-1 cursor-pointer"
            >
              <ArrowUpDown className="w-3 h-3 text-cyan-400" />
              <span>INVERT</span>
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold flex items-center space-x-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>CLEAR</span>
            </button>
          </div>
        </div>
      )}

      {/* MODE SELECTOR & RECORDING CONTROLS BAR */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
          {[
            { id: 'BEATBOX' as const, label: 'Oral Beatbox' },
            { id: 'CLAP_TAP' as const, label: 'Clap / Tap' },
            { id: 'HUM_VOICE' as const, label: 'Hum / Voice' },
            { id: 'INSTRUMENT' as const, label: 'MIDI Keys' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveModalityTab(t.id)}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeModalityTab === t.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Global Record & Transport Info */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => {
              if (dawState.isRecordingMic) handleStopCapture();
              else handleStartCaptureForTab(activeModalityTab);
            }}
            className={`px-4 py-2 rounded-xl font-black text-xs flex items-center space-x-2 transition cursor-pointer ${
              dawState.isRecordingMic
                ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-600/50 ring-2 ring-red-400'
                : 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
            }`}
          >
            {dawState.isRecordingMic ? <Square className="w-3.5 h-3.5 fill-current" /> : <span className="w-2.5 h-2.5 rounded-full bg-red-500" />}
            <span>{dawState.isRecordingMic ? 'STOP RECORDING' : 'RECORD'}</span>
          </button>
          <span className="text-xs font-bold text-slate-300 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            {Math.round(dawState.bpm)} BPM
          </span>
          <button
            type="button"
            onClick={() => void handleToggleMetronome()}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
              dawState.metronomeOn
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                : 'bg-slate-950 text-slate-400 border-slate-800'
            }`}
          >
            METRO
          </button>
        </div>
      </div>

      <p className="text-[11px] text-slate-400">
        Hits split onto isolated channels below in real-time as you perform. Click any pad slot or the + button to record directly.
      </p>

      {/* FULL-WIDTH EXPANDED LIVE PERFORMANCE PAD SLOTS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 pt-1">
        {takes.map((take, idx) => {
          const isSelected = take.id === selectedTrackId;
          const trackName = take.name || '';
          const isMouth = take.sourceModality === 'MOUTH' || (typeof trackName === 'string' && trackName.toLowerCase().includes('mouth'));
          return (
            <div
              key={take.id}
              onClick={() => setSelectionContext((prev) => ({ ...prev, selectedTrackId: take.id }))}
              className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between min-h-[96px] relative group ${
                isSelected
                  ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/20 ring-1 ring-blue-400'
                  : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center justify-between">
                  <span>{isMouth ? 'MOUTH' : 'KEYS'}</span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                </div>
                <div className="text-xs font-bold text-slate-100 mt-1 truncate">
                  {take.name || `Pad 0${idx + 1}`}
                </div>
              </div>

              {/* In-Card Record / Stop Trigger when recording */}
              {dawState.isRecordingMic ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStopCapture();
                  }}
                  className="mt-2 py-1 px-2 rounded-lg bg-red-600 text-white text-[10px] font-black flex items-center justify-center space-x-1 animate-pulse"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>STOP</span>
                </button>
              ) : (
                <div className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
                  <span>{take.audioClips?.length || 1} take{((take.audioClips?.length || 1) > 1) ? 's' : ''}</span>
                  <span className="opacity-0 group-hover:opacity-100 text-amber-400 font-bold">REC ▶</span>
                </div>
              )}
            </div>
          );
        })}

        {/* EXPANDED '+' PAD SLOT TRIGGER (Creates pad slot & arms recording) */}
        <div
          onClick={handleAddNewPadSlot}
          className={`p-3 rounded-xl border border-dashed flex flex-col items-center justify-center min-h-[96px] cursor-pointer transition ${
            dawState.isRecordingMic
              ? 'bg-red-600/20 border-red-500 text-red-400 animate-pulse'
              : 'border-slate-800 hover:border-slate-600 bg-slate-950/40 text-slate-400 hover:text-slate-200'
          }`}
          title={dawState.isRecordingMic ? "Click to Stop Recording" : "Add New Pad Slot & Start Performance Recording"}
        >
          {dawState.isRecordingMic ? (
            <div className="flex flex-col items-center space-y-1">
              <Square className="w-5 h-5 fill-current text-red-500" />
              <span className="text-[10px] font-black text-red-400">STOP</span>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-1">
              <Plus className="w-6 h-6 text-cyan-400" />
              <span className="text-[10px] font-bold text-slate-400">ADD PAD</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
