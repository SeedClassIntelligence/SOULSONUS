import React, { useState, useEffect, useRef } from 'react';
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
  Play,
  Layers,
} from 'lucide-react';
import { useStudioSession } from '../app/StudioSessionContext';

export const UnifiedDeckBench: React.FC = () => {
  const {
    dawState,
    setDawState,
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
  const [overdubPassCount, setOverdubPassCount] = useState(0);
  const [overdubPassLabels, setOverdubPassLabels] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const takes = tracks.filter((t) => t.isSourceTrack);
  const selectedTrackId = selectionContext.selectedTrackId;

  // Real-time live vocal waveform & loop pulse canvas renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      // Draw grid ticks
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += width / 16) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Draw active waveform
      if (dawState.isRecordingMic) {
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let x = 0; x < width; x += 3) {
          const amp = Math.sin(x * 0.05 + phase) * Math.cos(x * 0.02) * (height * 0.35);
          const y = centerY + (Math.random() - 0.5) * amp;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else if (dawState.isPlaying) {
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x < width; x += 4) {
          const amp = Math.sin(x * 0.04 + phase) * (height * 0.25);
          const y = centerY + amp;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();
      }

      phase += 0.08;
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [dawState.isRecordingMic, dawState.isPlaying]);

  const handleStartCaptureForTab = (tab: typeof activeModalityTab) => {
    let mod: 'MOUTH' | 'BODY' | 'KEYS' = 'MOUTH';
    if (tab === 'CLAP_TAP') mod = 'BODY';
    if (tab === 'INSTRUMENT') mod = 'KEYS';
    handleQuickPerformanceCapture(mod);

    // Increment overdub pass counter
    setOverdubPassCount((prev) => prev + 1);
    const label =
      tab === 'BEATBOX'
        ? 'Pass: Kick & Snare Beatbox'
        : tab === 'CLAP_TAP'
        ? 'Pass: Clap & Hats'
        : tab === 'HUM_VOICE'
        ? 'Pass: Hummed Bass / Vocal Synth'
        : 'Pass: MIDI Keys Layer';
    setOverdubPassLabels((prev) => [...prev, label]);
  };

  const handleUndoLastOverdubPass = () => {
    if (canUndo) {
      handleUndo();
      setOverdubPassCount((prev) => Math.max(0, prev - 1));
      setOverdubPassLabels((prev) => prev.slice(0, -1));
    }
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

      {/* INSTANT PASS-BY-PASS OVERDUB CONTROLLER DECK */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-inner">
        <div className="flex flex-wrap items-center gap-2">
          {/* Pass 1: Primary Loop Record */}
          <button
            type="button"
            onClick={() => {
              if (dawState.isRecordingMic) handleStopCapture();
              else handleStartCaptureForTab(activeModalityTab);
            }}
            className={`px-4 py-2 rounded-xl font-black text-xs flex items-center space-x-2 transition cursor-pointer shadow-lg active:scale-95 ${
              dawState.isRecordingMic
                ? 'bg-red-600 text-white animate-pulse shadow-red-600/50 ring-2 ring-red-400'
                : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-600/30'
            }`}
            title="Record 2 or 4 bars of beatboxing / vocal hits into your mic"
          >
            {dawState.isRecordingMic ? <Square className="w-3.5 h-3.5 fill-current" /> : <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />}
            <span>{dawState.isRecordingMic ? '⏹ STOP RECORDING' : '● RECORD LOOP'}</span>
          </button>

          {/* Pass 2+: Overdub Layer Stacking */}
          <button
            type="button"
            onClick={() => {
              if (dawState.isRecordingMic) handleStopCapture();
              else handleStartCaptureForTab(activeModalityTab);
            }}
            className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-black flex items-center space-x-1.5 transition cursor-pointer active:scale-95 shadow-sm"
            title="Layer hats, percussion, or hummed melodies over the active loop"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>＋ STACK OVERDUB</span>
          </button>

          {/* 1-Click Layer Undo: Peel Off Last Pass */}
          <button
            type="button"
            onClick={handleUndoLastOverdubPass}
            disabled={!canUndo}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-30 text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer active:scale-95"
            title="Peel off the last overdub pass without stopping the loop"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>↩ UNDO LAST PASS</span>
          </button>
        </div>

        {/* Pass Counter & Status Pill */}
        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>LAYERS: <strong className="text-amber-400">{overdubPassCount} PASSES</strong></span>
          </div>

          <span className="text-xs font-bold text-slate-300 bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
            {Math.round(dawState.bpm)} BPM
          </span>

          <button
            type="button"
            onClick={() => void handleToggleMetronome()}
            className={`px-3 py-1 rounded-xl text-xs font-bold border transition cursor-pointer ${
              dawState.metronomeOn
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            METRO
          </button>
        </div>
      </div>

      {/* REAL-TIME LIVE WAVEFORM & LOOP PULSE VISUALIZER */}
      <div className="w-full h-10 bg-slate-950 rounded-xl border border-slate-800/80 overflow-hidden relative flex items-center px-2">
        <canvas ref={canvasRef} width={600} height={40} className="w-full h-full object-cover opacity-90" />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-1.5 pointer-events-none">
          <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
          <span>{dawState.isRecordingMic ? 'MIC RECORDING • TRANSIENTS LOCKING TO 480 PPQ' : dawState.isPlaying ? 'LOOP PLAYBACK ACTIVE' : 'LIVE TRANSIENT MONITOR READY'}</span>
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

      {/* MODALITY SELECTOR TABS */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
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
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                activeModalityTab === t.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <span className="text-[10px] text-slate-400 font-bold">
          Hits split onto isolated channels in real-time as you perform.
        </span>
      </div>

      {/* PERFORMANCE PAD GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 pt-1">
        {takes.map((takeTrack, i) => {
          const isSelected = selectedTrackId === takeTrack.id;

          return (
            <div
              key={takeTrack.id}
              onClick={() => setSelectionContext((prev) => ({ ...prev, selectedTrackId: takeTrack.id }))}
              className={`p-3 rounded-xl border flex flex-col justify-between h-24 transition cursor-pointer relative group ${
                isSelected
                  ? 'bg-gradient-to-b from-slate-800 to-slate-900 border-cyan-400 ring-2 ring-cyan-400/40 shadow-lg shadow-cyan-500/10'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-slate-500 uppercase tracking-wider">
                  {takeTrack.sourceModality || 'MOUTH'}
                </span>
                {dawState.isRecordingMic && isSelected && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                )}
              </div>

              <div className="font-black text-xs text-white truncate">
                {takeTrack.name || `Pad 0${i + 1}`}
              </div>

              <div className="flex items-center justify-between text-[9px] text-slate-400">
                <span>{takeTrack.events?.length || 0} events</span>
                <span className="text-cyan-400 font-bold">READY</span>
              </div>

              {/* In-Card Stop Recording Trigger */}
              {dawState.isRecordingMic && isSelected && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStopCapture();
                  }}
                  className="absolute inset-0 bg-red-600/95 rounded-xl flex items-center justify-center space-x-1.5 text-white font-black text-xs z-20 animate-pulse cursor-pointer shadow-2xl"
                  title="Click to stop recording"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>STOP</span>
                </button>
              )}
            </div>
          );
        })}

        {/* Add Pad Slot Trigger */}
        <button
          type="button"
          onClick={handleAddNewPadSlot}
          className="p-3 rounded-xl border border-dashed border-slate-700 hover:border-cyan-400 bg-slate-950/50 hover:bg-cyan-500/10 flex flex-col items-center justify-center gap-1 h-24 transition cursor-pointer text-slate-400 hover:text-cyan-300"
          title="Add another performance pad slot"
        >
          <Plus className="w-5 h-5 text-cyan-400" />
          <span className="text-[10px] font-black uppercase">ADD PAD</span>
        </button>
      </div>
    </div>
  );
};
