import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Track, InstrumentType, VocalTrackState } from '../types/daw';
import {
  Volume2,
  Disc,
  Music,
  Drum,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  RotateCcw,
  RotateCw,
  Repeat,
  Wand2,
  Mic,
  Square,
  Circle,
  Plus,
  Target,
} from 'lucide-react';

export interface StepSequencer64Props {
  tracks: Track[];
  currentStep: number;
  activeBarView: 'all' | 1 | 2 | 3 | 4;
  onToggleStep: (trackId: string, stepIndex: number) => void;
  onChangeStepNote?: (trackId: string, stepIndex: number, note: string) => void;
  onToggleMute: (trackId: string) => void;
  onToggleSolo: (trackId: string) => void;
  onChangeVolume: (trackId: string, volume: number) => void;
  onChangePitch: (trackId: string, pitch: string) => void;
  onSelectBarView: (view: 'all' | 1 | 2 | 3 | 4) => void;

  // Dynamic Track & Calibration Props
  onAddTrack?: (type?: InstrumentType, name?: string) => void;
  onCalibrateTrack?: (trackId: string) => void;
  onDeleteTrack?: (trackId: string) => void;
  calibratingTrackId?: string | null;

  // Vocal Track Props
  vocalState?: VocalTrackState;
  onStartRecordVocal?: () => void;
  onStopRecordVocal?: () => void;
  onChangeVocalVolume?: (volume: number) => void;
  onClearVocal?: () => void;

  // Shoot Around Transformation Props
  onCloneBarToAll: (sourceBarIndex?: number) => void;
  onNudgeTrackPattern: (trackId: string, direction: 'left' | 'right') => void;
  onShiftTrackRow: (fromTrackIndex: number, direction: 'up' | 'down') => void;
  onShiftTrackInstrument?: (fromTrackIndex: number, targetInstrument: InstrumentType) => void;
  onClearTrack: (trackId: string) => void;

  // Global Shoot Around Actions
  onNudgeGlobal?: (direction: 'left' | 'right') => void;
  onClearAll: () => void;
  onRandomize: (barIndex?: number) => void;

  // History
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

const INSTRUMENT_ICONS = {
  kick: <Drum className="w-4 h-4 text-amber-400" />,
  snare: <Disc className="w-4 h-4 text-cyan-400" />,
  hihat: <Sparkles className="w-4 h-4 text-emerald-400" />,
  melody: <Music className="w-4 h-4 text-purple-400" />,
  bass: <Volume2 className="w-4 h-4 text-rose-400" />,
  percussion: <Wand2 className="w-4 h-4 text-orange-400" />,
  vocal_synth: <Mic className="w-4 h-4 text-pink-400" />,
  custom: <Sparkles className="w-4 h-4 text-blue-400" />,
};

const INSTRUMENT_COLORS = {
  kick: {
    active: 'bg-amber-500 border-amber-400 text-slate-950 shadow-md shadow-amber-500/30',
    playheadActive: 'bg-amber-300 border-white text-slate-950 ring-2 ring-amber-300 scale-105 z-10',
    hover: 'hover:bg-amber-500/30 border-slate-800',
    trackBg: 'border-l-4 border-l-amber-500',
  },
  snare: {
    active: 'bg-cyan-400 border-cyan-300 text-slate-950 shadow-md shadow-cyan-400/30',
    playheadActive: 'bg-cyan-200 border-white text-slate-950 ring-2 ring-cyan-300 scale-105 z-10',
    hover: 'hover:bg-cyan-400/30 border-slate-800',
    trackBg: 'border-l-4 border-l-cyan-400',
  },
  hihat: {
    active: 'bg-emerald-400 border-emerald-300 text-slate-950 shadow-md shadow-emerald-400/30',
    playheadActive: 'bg-emerald-200 border-white text-slate-950 ring-2 ring-emerald-300 scale-105 z-10',
    hover: 'hover:bg-emerald-400/30 border-slate-800',
    trackBg: 'border-l-4 border-l-emerald-400',
  },
  melody: {
    active: 'bg-purple-500 border-purple-400 text-white shadow-md shadow-purple-500/30',
    playheadActive: 'bg-purple-300 border-white text-slate-950 ring-2 ring-purple-300 scale-105 z-10',
    hover: 'hover:bg-purple-500/30 border-slate-800',
    trackBg: 'border-l-4 border-l-purple-500',
  },
};

const PITCH_OPTIONS = [
  'C1', 'D1', 'E1', 'F1', 'G1', 'A1', 'B1',
  'C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2',
  'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4',
];

const VocalWaveformCanvas: React.FC<{
  waveformData: number[];
  isRecording: boolean;
  currentStep: number;
  visibleStepIndices: number[];
  visibleStepsCount: number;
}> = ({ waveformData, isRecording, currentStep, visibleStepIndices, visibleStepsCount }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    const minStep = visibleStepIndices[0] ?? 0;
    const maxStep = visibleStepIndices[visibleStepIndices.length - 1] ?? 63;

    if (isRecording) {
      // Draw live pulsing wave line for recording
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const midY = height / 2;
      ctx.moveTo(0, midY);
      const timeOffset = Date.now() * 0.008;
      for (let x = 0; x < width; x += 4) {
        const noise = (Math.sin(x * 0.08 + timeOffset) + Math.cos(x * 0.15)) * 9;
        ctx.lineTo(x, midY + noise);
      }
      ctx.stroke();

      // Playhead line
      const playheadX = ((currentStep - minStep) / visibleStepsCount) * width;
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
      return;
    }

    if (!waveformData || waveformData.length === 0) {
      // Guide grid line
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Draw step notch markers
      const stepWidth = width / visibleStepsCount;
      for (let i = 0; i < visibleStepsCount; i++) {
        const x = i * stepWidth;
        ctx.fillStyle = i % 4 === 0 ? '#334155' : '#1e293b';
        ctx.fillRect(x, height / 2 - 2, 2, 4);
      }
      return;
    }

    // Map waveform points to visible step slice (0..200 points mapped across 64 steps)
    const startRatio = minStep / 64;
    const endRatio = (maxStep + 1) / 64;

    const startIndex = Math.floor(startRatio * waveformData.length);
    const endIndex = Math.min(waveformData.length, Math.ceil(endRatio * waveformData.length));
    const slice = waveformData.slice(startIndex, endIndex);

    const barWidth = width / Math.max(1, slice.length);
    const centerY = height / 2;

    slice.forEach((amp, idx) => {
      const x = idx * barWidth;
      const barHeight = Math.max(2, amp * (height * 0.85));

      const grad = ctx.createLinearGradient(0, centerY - barHeight / 2, 0, centerY + barHeight / 2);
      grad.addColorStop(0, '#f43f5e');
      grad.addColorStop(0.5, '#fbbf24');
      grad.addColorStop(1, '#ef4444');

      ctx.fillStyle = grad;
      ctx.fillRect(x, centerY - barHeight / 2, Math.max(1.5, barWidth - 1), barHeight);
    });

    // Draw active playhead indicator if in range
    if (currentStep >= minStep && currentStep <= maxStep) {
      const playheadX = ((currentStep - minStep) / visibleStepsCount) * width;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      // Glowing cap
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(playheadX - 2, 0, 5, 6);
      ctx.fillRect(playheadX - 2, height - 6, 5, 6);
    }
  }, [waveformData, isRecording, currentStep, visibleStepIndices, visibleStepsCount]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={48}
      className="w-full h-11 rounded-lg border border-slate-800 bg-slate-950 block overflow-hidden shadow-inner"
    />
  );
};

const Step64Radar: React.FC<{
  tracks: Track[];
  currentStep: number;
}> = ({ tracks, currentStep }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(centerX, centerY) - 16;

    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    const trackCount = Math.max(1, tracks.length);
    const ringSpacing = maxRadius / (trackCount + 1);

    const colors = ['#f59e0b', '#06b6d4', '#10b981', '#a855f7', '#f43f5e', '#3b82f6', '#fb923c', '#e879f9'];

    tracks.forEach((track, tIdx) => {
      const radius = (tIdx + 1) * ringSpacing;
      const trackColor = colors[tIdx % colors.length];

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.stroke();

      for (let s = 0; s < 64; s++) {
        if (track.steps[s]) {
          const angle = (s / 64) * 2 * Math.PI - Math.PI / 2;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);

          const isCurrent = s === currentStep;
          ctx.fillStyle = isCurrent ? '#ffffff' : trackColor;
          ctx.beginPath();
          ctx.arc(x, y, isCurrent ? 3.5 : 2, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    });

    const sweepAngle = (currentStep / 64) * 2 * Math.PI - Math.PI / 2;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + maxRadius * Math.cos(sweepAngle), centerY + maxRadius * Math.sin(sweepAngle));
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
    ctx.fill();
  }, [tracks, currentStep]);

  return (
    <div className="flex flex-col items-center justify-center p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80 my-3">
      <div className="flex items-center justify-between w-full mb-1.5 px-2">
        <span className="text-[10px] font-mono font-black text-amber-400 tracking-widest uppercase flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> 64-STEP DYNAMIC RADAR ({tracks.length} TRACKS)
        </span>
        <span className="text-[10px] font-mono text-slate-500">
          RADIAL MULTI-TRACK ACTIVITY
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        className="rounded-full bg-slate-900 border border-slate-800 shadow-inner block"
      />
    </div>
  );
};

export const StepSequencer64: React.FC<StepSequencer64Props> = ({
  tracks,
  currentStep,
  activeBarView,
  onToggleStep,
  onChangeStepNote,
  onToggleMute,
  onToggleSolo,
  onChangeVolume,
  onChangePitch,
  onSelectBarView,
  onAddTrack,
  onCalibrateTrack,
  onDeleteTrack,
  calibratingTrackId,
  vocalState,
  onStartRecordVocal,
  onStopRecordVocal,
  onChangeVocalVolume,
  onClearVocal,
  onCloneBarToAll,
  onNudgeTrackPattern,
  onShiftTrackRow,
  onShiftTrackInstrument,
  onClearTrack,
  onNudgeGlobal,
  onClearAll,
  onRandomize,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}) => {
  const [selectedMelodyStep, setSelectedMelodyStep] = useState<number | null>(null);

  // Determine slice indices for active bar view
  let stepStart = 0;
  let stepEnd = 64;
  if (activeBarView === 1) {
    stepStart = 0;
    stepEnd = 16;
  } else if (activeBarView === 2) {
    stepStart = 16;
    stepEnd = 32;
  } else if (activeBarView === 3) {
    stepStart = 32;
    stepEnd = 48;
  } else if (activeBarView === 4) {
    stepStart = 48;
    stepEnd = 64;
  }

  const visibleStepsCount = stepEnd - stepStart;
  const visibleStepIndices = Array.from({ length: visibleStepsCount }, (_, i) => stepStart + i);

  // Current Bar Index for cloning (0 for Bar 1, 1 for Bar 2, etc. If 'all', default to 0 for Bar 1)
  const currentSourceBarIndex = activeBarView === 'all' ? 0 : activeBarView - 1;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl select-none">
      {/* Top Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Repeat className="w-4 h-4" />
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-slate-200">
            64-STEP PATTERN SEQUENCER
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-bold border border-slate-700">
            STEP {currentStep + 1}/64
          </span>

          {/* Undo / Redo */}
          {onUndo && (
            <div className="flex items-center gap-1 ml-2 border-l border-slate-800 pl-2">
              <button
                type="button"
                id="btn-undo-seq"
                onClick={onUndo}
                disabled={!canUndo}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition"
                title="Undo (Ctrl+Z)"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              </button>
              <button
                type="button"
                id="btn-redo-seq"
                onClick={onRedo}
                disabled={!canRedo}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition"
                title="Redo (Ctrl+Y)"
              >
                <RotateCw className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>
          )}
        </div>

        {/* Global Action Strip */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Clone Current Bar to All */}
          <button
            type="button"
            id="btn-clone-bar-to-all"
            onClick={() => onCloneBarToAll(currentSourceBarIndex)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-extrabold transition shadow-sm active:scale-95"
            title={`Clone Bar ${currentSourceBarIndex + 1} (16 steps) across all 4 bars`}
          >
            <Copy className="w-3.5 h-3.5 text-amber-400" />
            <span>CLONE BAR {currentSourceBarIndex + 1} TO ALL</span>
          </button>

          {/* Global Nudge Left / Right */}
          {onNudgeGlobal && (
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                id="btn-nudge-global-left"
                onClick={() => onNudgeGlobal('left')}
                className="p-1 rounded hover:bg-slate-800 text-slate-300"
                title="Nudge all tracks left 1 step (⟸)"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-amber-400" />
              </button>
              <span className="text-[10px] font-mono font-bold text-slate-400 px-1">NUDGE ALL</span>
              <button
                type="button"
                id="btn-nudge-global-right"
                onClick={() => onNudgeGlobal('right')}
                className="p-1 rounded hover:bg-slate-800 text-slate-300"
                title="Nudge all tracks right 1 step (⟹)"
              >
                <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>
          )}

          {/* Randomize Button */}
          <button
            type="button"
            id="btn-randomize-global"
            onClick={() => onRandomize(activeBarView === 'all' ? undefined : activeBarView - 1)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold transition active:scale-95"
            title="Randomize pattern steps for creative sparking"
          >
            <Shuffle className="w-3.5 h-3.5 text-purple-400" />
            <span>RANDOMIZE</span>
          </button>

          {/* Clear All Button */}
          <button
            type="button"
            id="btn-clear-all-seq"
            onClick={onClearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition active:scale-95"
            title="Clear all 64 steps across all tracks"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>CLEAR ALL</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

          {/* Bar Focus Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => onSelectBarView('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                activeBarView === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ALL 64
            </button>
            {[1, 2, 3, 4].map((barNum) => (
              <button
                key={barNum}
                onClick={() => onSelectBarView(barNum as 1 | 2 | 3 | 4)}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                  activeBarView === barNum
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                BAR {barNum}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Container */}
      <div className="overflow-x-auto custom-scrollbar">
        <div className="min-w-[850px]">
          {/* Step Numbers Bar */}
          <div className="flex items-center mb-2 pl-72 text-[10px] font-mono font-bold text-slate-500">
            <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${visibleStepsCount}, minmax(0, 1fr))` }}>
              {visibleStepIndices.map((stepIdx) => {
                const isFirstOfBar = stepIdx % 16 === 0;
                const isFirstOfBeat = stepIdx % 4 === 0;
                const isCurrentStep = stepIdx === currentStep;

                return (
                  <div
                    key={stepIdx}
                    className={`text-center py-1 rounded transition-colors ${
                      isCurrentStep
                        ? 'bg-amber-500/20 text-amber-300 font-extrabold ring-1 ring-amber-500/50'
                        : isFirstOfBar
                        ? 'text-slate-200 font-black border-l-2 border-slate-700'
                        : isFirstOfBeat
                        ? 'text-slate-400 border-l border-slate-800'
                        : 'text-slate-600'
                    }`}
                  >
                    {stepIdx + 1}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Track Rows */}
          <div className="space-y-3">
            {tracks.map((track, trackIdx) => {
              const colorTheme = INSTRUMENT_COLORS[track.instrument] || INSTRUMENT_COLORS.melody;

              return (
                <div
                  key={track.id}
                  className={`flex items-center bg-slate-950/90 rounded-xl p-2.5 border border-slate-800 shadow-inner ${colorTheme.trackBg}`}
                >
                  {/* Left Controls & Command Strip */}
                  <div className="w-68 shrink-0 pr-3 border-r border-slate-800 flex flex-col gap-2">
                    {/* Instrument Title, Icon, Mute & Solo */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {INSTRUMENT_ICONS[track.instrument]}
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                              track.instrument === 'kick'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : track.instrument === 'snare'
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                : track.instrument === 'hihat'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            }`}
                          >
                            {track.instrument === 'hihat' ? 'HI-HAT' : track.instrument.toUpperCase()}
                          </span>
                          <span className="text-xs font-bold text-slate-100 truncate w-24" title={track.name}>
                            {track.name}
                          </span>
                        </div>
                      </div>

                      {/* Mute & Solo */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onToggleMute(track.id)}
                          className={`w-5 h-5 rounded text-[10px] font-black transition ${
                            track.mute
                              ? 'bg-rose-500 text-white'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                          title="Mute Track"
                        >
                          M
                        </button>
                        <button
                          onClick={() => onToggleSolo(track.id)}
                          className={`w-5 h-5 rounded text-[10px] font-black transition ${
                            track.solo
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                          title="Solo Track"
                        >
                          S
                        </button>
                      </div>
                    </div>

                    {/* Pitch & Volume Control */}
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500 font-mono">PITCH</span>
                        <select
                          value={track.pitch}
                          onChange={(e) => onChangePitch(track.id, e.target.value)}
                          className="bg-slate-900 text-amber-400 font-mono text-[11px] font-bold px-1.5 py-0.5 rounded border border-slate-800 focus:outline-none"
                        >
                          {PITCH_OPTIONS.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1">
                        <Volume2 className="w-3 h-3 text-slate-500" />
                        <input
                          type="range"
                          min={-20}
                          max={6}
                          value={track.volume}
                          onChange={(e) => onChangeVolume(track.id, Number(e.target.value))}
                          className="w-12 accent-amber-500 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Calibration Control Strip */}
                    <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-900">
                      {calibratingTrackId === track.id ? (
                        <div className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1 rounded bg-rose-600 text-white font-mono text-[10px] font-black uppercase animate-pulse shadow">
                          <Target className="w-3 h-3 animate-spin" />
                          <span>CALIBRATING 2S...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <button
                            type="button"
                            id={`btn-calibrate-${track.id}`}
                            onClick={() => onCalibrateTrack?.(track.id)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-mono text-[10px] font-black border border-amber-500/40 transition active:scale-95"
                            title="Listen to mic for 2s to calibrate Peak Frequency & RMS Threshold for your voice"
                          >
                            <Target className="w-3 h-3 text-amber-400" />
                            <span>CALIBRATE</span>
                          </button>

                          {track.detectionProfile ? (
                            <span
                              className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/40"
                              title={`Center Freq: ${track.detectionProfile.centerFreq}Hz, Thresh: ${track.detectionProfile.threshold}`}
                            >
                              🎯 {track.detectionProfile.centerFreq}Hz | T:{track.detectionProfile.threshold}
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono text-slate-500">UNCALIBRATED</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Track Command Strip (Nudge, Shift Up/Down, Clear) */}
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-900 text-[10px]">
                      <span className="text-slate-500 font-bold uppercase tracking-tighter">TRANSFORM:</span>

                      <div className="flex items-center gap-1">
                        {/* Nudge Left */}
                        <button
                          type="button"
                          onClick={() => onNudgeTrackPattern(track.id, 'left')}
                          className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 transition"
                          title="Nudge pattern left (⟸)"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>

                        {/* Nudge Right */}
                        <button
                          type="button"
                          onClick={() => onNudgeTrackPattern(track.id, 'right')}
                          className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 transition"
                          title="Nudge pattern right (⟹)"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>

                        <div className="w-px h-3 bg-slate-800 mx-0.5" />

                        {/* Shift Row Up */}
                        <button
                          type="button"
                          onClick={() => onShiftTrackRow(trackIdx, 'up')}
                          className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 transition"
                          title="Shift pattern to track above (↑)"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>

                        {/* Shift Row Down */}
                        <button
                          type="button"
                          onClick={() => onShiftTrackRow(trackIdx, 'down')}
                          className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 transition"
                          title="Shift pattern to track below (↓)"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>

                        <div className="w-px h-3 bg-slate-800 mx-0.5" />

                        {/* Clear Track */}
                        <button
                          type="button"
                          onClick={() => onClearTrack(track.id)}
                          className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition"
                          title="Clear this track"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>

                        {/* Delete Track */}
                        {onDeleteTrack && tracks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onDeleteTrack(track.id)}
                            className="p-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 transition"
                            title="Delete track from project"
                          >
                            <Trash2 className="w-3 h-3 text-rose-500" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 64-Step Grid Blocks */}
                  <div className="flex-1 pl-3">
                    <div
                      className="grid gap-1"
                      style={{
                        gridTemplateColumns: `repeat(${visibleStepsCount}, minmax(0, 1fr))`,
                      }}
                    >
                      {visibleStepIndices.map((stepIdx) => {
                        const isActive = track.steps[stepIdx];
                        const isCurrentStep = stepIdx === currentStep;
                        const isBarStart = stepIdx % 16 === 0;
                        const isBeatStart = stepIdx % 4 === 0;
                        const stepNote = track.notes?.[stepIdx] || track.pitch;

                        return (
                          <div key={stepIdx} className="relative group">
                            <motion.button
                              type="button"
                              onClick={() => onToggleStep(track.id, stepIdx)}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                if (track.instrument === 'melody') {
                                  setSelectedMelodyStep(selectedMelodyStep === stepIdx ? null : stepIdx);
                                }
                              }}
                              whileHover={{ scale: isCurrentStep ? 1.08 : 1.05 }}
                              whileTap={{ scale: 0.92 }}
                              animate={{
                                scale: isCurrentStep && isActive ? [1, 1.15, 1.06] : isCurrentStep ? 1.04 : isActive ? 1 : 1,
                                boxShadow: isCurrentStep && isActive
                                  ? track.instrument === 'kick'
                                    ? '0 0 20px rgba(245, 158, 11, 0.9), 0 0 35px rgba(245, 158, 11, 0.5)'
                                    : track.instrument === 'snare'
                                    ? '0 0 20px rgba(34, 211, 238, 0.9), 0 0 35px rgba(34, 211, 238, 0.5)'
                                    : track.instrument === 'hihat'
                                    ? '0 0 20px rgba(52, 211, 153, 0.9), 0 0 35px rgba(52, 211, 153, 0.5)'
                                    : '0 0 20px rgba(168, 85, 247, 0.9), 0 0 35px rgba(168, 85, 247, 0.5)'
                                  : isCurrentStep
                                  ? '0 0 12px rgba(245, 158, 11, 0.6)'
                                  : isActive
                                  ? track.instrument === 'kick'
                                    ? '0 0 8px rgba(245, 158, 11, 0.3)'
                                    : track.instrument === 'snare'
                                    ? '0 0 8px rgba(34, 211, 238, 0.3)'
                                    : track.instrument === 'hihat'
                                    ? '0 0 8px rgba(52, 211, 153, 0.3)'
                                    : '0 0 8px rgba(168, 85, 247, 0.3)'
                                  : 'none',
                              }}
                              transition={{
                                duration: isCurrentStep ? 0.08 : 0.15,
                                ease: 'easeOut',
                              }}
                              className={`w-full h-11 rounded-lg border flex flex-col items-center justify-center cursor-pointer relative overflow-hidden ${
                                isCurrentStep && isActive
                                  ? colorTheme.playheadActive
                                  : isActive
                                  ? colorTheme.active
                                  : isCurrentStep
                                  ? 'bg-amber-500/20 border-amber-400/80 ring-2 ring-amber-400/40'
                                  : isBarStart
                                  ? 'bg-slate-900 border-slate-700 hover:border-slate-500'
                                  : isBeatStart
                                  ? 'bg-slate-900/90 border-slate-800 hover:border-slate-600'
                                  : 'bg-slate-950 border-slate-900 hover:border-slate-700'
                              }`}
                            >
                              {isActive ? (
                                track.instrument === 'melody' ? (
                                  <span className="text-[9px] font-mono font-extrabold tracking-tighter">
                                    {stepNote}
                                  </span>
                                ) : (
                                  <span className="w-2 h-2 rounded-full bg-slate-950 opacity-80" />
                                )
                              ) : null}

                              {isBeatStart && !isActive && (
                                <span className="w-1 h-1 rounded-full bg-slate-700" />
                              )}
                            </motion.button>

                            {/* Pitch Popover for Melody */}
                            {track.instrument === 'melody' && selectedMelodyStep === stepIdx && (
                              <div className="absolute top-12 left-0 z-30 bg-slate-900 border border-purple-500/40 rounded-xl p-2 shadow-2xl w-32">
                                <div className="text-[10px] font-bold text-purple-400 mb-1">
                                  NOTE STEP {stepIdx + 1}
                                </div>
                                <select
                                  value={stepNote}
                                  onChange={(e) => {
                                    onChangeStepNote?.(track.id, stepIdx, e.target.value);
                                    setSelectedMelodyStep(null);
                                  }}
                                  className="w-full bg-slate-950 text-slate-100 font-mono text-xs p-1 rounded border border-slate-800"
                                >
                                  {PITCH_OPTIONS.map((p) => (
                                    <option key={p} value={p}>
                                      {p}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Dynamic Multi-Track Registry & Add Track Strip */}
            <div className="flex flex-wrap items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 border-dashed my-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-200">DYNAMIC MULTI-TRACK REGISTRY</h4>
                  <p className="text-[10px] font-mono text-slate-400">
                    Add unlimited tracks & calibrate each to a unique vocal acoustic sound
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 mt-2 sm:mt-0">
                <button
                  type="button"
                  id="btn-add-track-kick"
                  onClick={() => onAddTrack?.('kick', `Sub Kick ${tracks.length + 1}`)}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-black border border-amber-500/40 transition active:scale-95"
                >
                  + KICK
                </button>
                <button
                  type="button"
                  id="btn-add-track-snare"
                  onClick={() => onAddTrack?.('snare', `Snappy Snare ${tracks.length + 1}`)}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[10px] font-black border border-cyan-500/40 transition active:scale-95"
                >
                  + SNARE
                </button>
                <button
                  type="button"
                  id="btn-add-track-hihat"
                  onClick={() => onAddTrack?.('hihat', `Hi-Hat ${tracks.length + 1}`)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-black border border-emerald-500/40 transition active:scale-95"
                >
                  + HI-HAT
                </button>
                <button
                  type="button"
                  id="btn-add-track-bass"
                  onClick={() => onAddTrack?.('bass', `Throat Bass ${tracks.length + 1}`)}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-black border border-rose-500/40 transition active:scale-95"
                >
                  + THROAT BASS
                </button>
                <button
                  type="button"
                  id="btn-add-track-vocal"
                  onClick={() => onAddTrack?.('vocal_synth', `Voice Synth ${tracks.length + 1}`)}
                  className="px-2.5 py-1 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 text-[10px] font-black border border-pink-500/40 transition active:scale-95"
                >
                  + VOICE SYNTH
                </button>
                <button
                  type="button"
                  id="btn-add-track-custom"
                  onClick={() => onAddTrack?.('custom', `Custom Sound ${tracks.length + 1}`)}
                  className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[10px] font-black border border-purple-500/40 transition active:scale-95"
                >
                  + CUSTOM SOUND
                </button>
              </div>
            </div>

            {/* Step 64 Radar Activity Visualization */}
            <Step64Radar tracks={tracks} currentStep={currentStep} />

            {/* VOCAL PERFORMANCE TRACK ROW */}
            <div className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-950/20 hover:bg-rose-950/30 transition-all flex items-center mt-3">
              {/* Left Control Panel */}
              <div className="w-56 shrink-0 border-r border-slate-800 pr-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      <Mic className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-100 flex items-center gap-1.5">
                        VOCAL PERFORMANCE
                      </h4>
                      <span className="text-[10px] font-mono font-bold text-rose-300">
                        {vocalState?.isRecording ? '● RECORDING (4 BARS)...' : vocalState?.audioBuffer ? 'CAPTURED (SYNCED)' : '4-BAR VOCAL STEM'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Record & Volume Controls */}
                <div className="flex items-center justify-between gap-1.5 mt-2">
                  {/* Record Vocal Button */}
                  {vocalState?.isRecording ? (
                    <button
                      type="button"
                      id="btn-stop-vocal-record"
                      onClick={onStopRecordVocal}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-black uppercase animate-pulse shadow-md shadow-rose-600/50"
                    >
                      <Square className="w-3 h-3 fill-current" />
                      <span>STOP</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      id="btn-record-vocal"
                      onClick={onStartRecordVocal}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 text-[10px] font-extrabold uppercase transition shadow-sm active:scale-95"
                      title="Record 4-bar vocal layer in sync with beat"
                    >
                      <Circle className="w-3 h-3 fill-current text-rose-950" />
                      <span>RECORD VOCAL</span>
                    </button>
                  )}

                  {/* Volume Slider */}
                  <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                    <Volume2 className="w-3 h-3 text-slate-400" />
                    <input
                      type="range"
                      min="-20"
                      max="6"
                      step="1"
                      value={vocalState?.volume ?? 0}
                      onChange={(e) => onChangeVocalVolume?.(parseFloat(e.target.value))}
                      className="w-12 h-1 bg-slate-800 accent-rose-400 rounded cursor-pointer"
                      title="Vocal Volume dB"
                    />
                  </div>

                  {/* Clear Vocal */}
                  {vocalState?.audioBuffer && (
                    <button
                      type="button"
                      onClick={onClearVocal}
                      className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition"
                      title="Clear Vocal Track"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Right Waveform Canvas */}
              <div className="flex-1 pl-3 relative">
                <VocalWaveformCanvas
                  waveformData={vocalState?.waveformData || []}
                  isRecording={!!vocalState?.isRecording}
                  currentStep={currentStep}
                  visibleStepIndices={visibleStepIndices}
                  visibleStepsCount={visibleStepsCount}
                />
                {!vocalState?.waveformData?.length && !vocalState?.isRecording && (
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-slate-500 pointer-events-none pl-3">
                    RECORD 4-BAR VOCAL LAYER OVER MIDI BEAT
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
