import React, { useState } from 'react';
import { ArrowLeft, Drum, Activity, Music, Wand2, AlertCircle, Trash2, Eraser, Target, Plus, Zap, ChevronDown } from 'lucide-react';
import { useStudioSession } from '../app/StudioSessionContext';
import { SOUND_PRESETS } from './UnifiedTrackLane';
import { TICKS_PER_16TH, TICKS_PER_BEAT } from '../utils/musicMath';

/**
 * The rhythm/melody counterpart to Write & Record: a full-room dedicated
 * space for one capture at a time, sized like a room because a 480px side
 * drawer read as an afterthought bolted onto Create, not a real part of
 * the process.
 *
 * One pad grid, not a button stack plus a separate list: the three ways to
 * start a new take and every take already captured this session sit as
 * equal-size tiles in the same grid, so there is one visual language for
 * "a sound you can trigger" instead of two. It calls the exact same
 * handleQuickPerformanceCapture / handleCalibrateTrack pipeline the
 * Create-room strip and the old Calibration drawer already used -- this is
 * a different surface over one real capture path, not a second one.
 */
interface PerformanceCaptureRoomProps {
  onClose: () => void;
}

const NEW_TAKE_PADS: {
  modality: 'MOUTH' | 'BODY' | 'KEYS';
  label: string;
  sub: string;
  icon: React.ReactNode;
  accent: string;
  ring: string;
  glow: string;
}[] = [
  {
    modality: 'MOUTH',
    label: 'Beatbox',
    sub: 'Kick & snare, mouth',
    icon: <Drum className="w-7 h-7" />,
    accent: 'text-amber-400',
    ring: 'border-amber-500/30 hover:border-amber-400/60',
    glow: 'hover:shadow-[0_0_24px_-4px_rgba(251,191,36,0.35)]',
  },
  {
    modality: 'BODY',
    label: 'Clap / Tap',
    sub: 'Body percussion',
    icon: <Activity className="w-7 h-7" />,
    accent: 'text-cyan-400',
    ring: 'border-cyan-500/30 hover:border-cyan-400/60',
    glow: 'hover:shadow-[0_0_24px_-4px_rgba(34,211,238,0.35)]',
  },
  {
    modality: 'KEYS',
    label: 'Hum / Voice',
    sub: 'Melody, pitch-tracked',
    icon: <Music className="w-7 h-7" />,
    accent: 'text-purple-400',
    ring: 'border-purple-500/30 hover:border-purple-400/60',
    glow: 'hover:shadow-[0_0_24px_-4px_rgba(168,85,247,0.35)]',
  },
];

export const PerformanceCaptureRoom: React.FC<PerformanceCaptureRoomProps> = ({ onClose }) => {
  const {
    dawState,
    handleToggleMetronome,
    tracks,
    setTracks,
    selectionContext,
    setSelectionContext,
    detectionSettings,
    captureError,
    handleQuickPerformanceCapture,
    handleStopCapture,
    handleDeleteTrack,
    handleClearTrack,
    handleCalibrateTrack,
    calibratingTrackId,
    handleQuantizeTrackNotes,
  } = useStudioSession();

  const [expandedTakeId, setExpandedTakeId] = useState<string | null>(null);

  const focusedTrack = tracks.find((t) => t.id === selectionContext.selectedTrackId) || null;
  const takes = tracks.filter((t) => t.isSourceTrack);
  const expandedTake = takes.find((t) => t.id === expandedTakeId) || null;

  return (
    <div className="w-full space-y-5 pb-8">
      {/* Room Banner */}
      <div className="p-4 rounded-2xl bg-black border border-white/10 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 cursor-pointer transition-colors"
            title="Back to Create"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="p-2.5 rounded-xl bg-white/5 text-orange-400 border border-white/10">
            <Drum className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white tracking-tight">Performance Capture</h2>
              <span className="px-2 py-0.5 rounded-full bg-white/5 text-orange-300 text-[10px] font-mono border border-white/10">
                {dawState.bpm} BPM • 4/4
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Train a pad on your own sound, then perform. Part of the creation process, not the whole of it.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {focusedTrack && (
            <button
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent('soulsonus:openDrawer', {
                    detail: { type: 'realization', trackId: focusedTrack.id },
                  })
                )
              }
              className="px-3 h-9 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[11px] font-black flex items-center gap-1.5 transition cursor-pointer active:scale-95"
              title="Ask AI to tweak the focused take"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>ASK AI TO TWEAK</span>
            </button>
          )}
          <button
            onClick={() => void handleToggleMetronome()}
            className={`px-3 h-9 rounded-lg font-black border text-xs transition cursor-pointer active:scale-95 ${
              dawState.metronomeOn
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-white/5 text-slate-500 border-white/10'
            }`}
            title="Toggle Audible Metronome Click Guide"
          >
            {dawState.metronomeOn ? 'METRO ON' : 'METRO OFF'}
          </button>
        </div>
      </div>

      {/* Live status strip -- only takes space while it matters */}
      {(detectionSettings.enabled || captureError) && (
        <div className="p-4 rounded-2xl bg-black border border-white/10 space-y-3">
          {captureError && (
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 leading-snug flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{captureError}</span>
            </div>
          )}
          {detectionSettings.enabled && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-emerald-400 font-black flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  LISTENING — MAKE SOME NOISE
                </span>
                <button
                  onClick={() => void handleStopCapture()}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition cursor-pointer active:scale-95"
                >
                  STOP CAPTURE
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>LOW / KICK</span>
                    <span className="text-amber-300 font-bold">
                      {Math.round((detectionSettings.currentLowLevel || 0) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)] transition-[width] duration-75"
                      style={{ width: `${Math.min(100, (detectionSettings.currentLowLevel || 0) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>HIGH / SNARE &amp; HI-HAT</span>
                    <span className="text-cyan-300 font-bold">
                      {Math.round((detectionSettings.currentHighLevel || 0) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.6)] transition-[width] duration-75"
                      style={{ width: `${Math.min(100, (detectionSettings.currentHighLevel || 0) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-600">
                If both meters stay flat while you perform, the mic granted access but isn't hearing you — check
                you picked the right input device in your browser's site settings.
              </p>
            </>
          )}
        </div>
      )}

      {/* One pad grid: three ways to start a new take, plus every take already captured */}
      <div className="p-5 rounded-2xl bg-black border border-white/10 shadow-xl">
        <div className="flex items-center justify-between pb-4">
          <h3 className="text-sm font-bold text-white tracking-tight">SOUND PADS</h3>
          <span className="text-[10px] text-slate-500 font-mono">{takes.length} captured</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {NEW_TAKE_PADS.map((pad) => (
            <button
              key={pad.modality}
              type="button"
              onClick={() => handleQuickPerformanceCapture(pad.modality)}
              disabled={detectionSettings.enabled}
              className={`aspect-square rounded-2xl bg-gradient-to-b from-white/[0.06] to-transparent border ${pad.ring} ${pad.glow} disabled:opacity-30 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-2 transition cursor-pointer active:scale-95`}
              title={`Start a new ${pad.label} take`}
            >
              <span className={pad.accent}>{pad.icon}</span>
              <span className="text-white text-xs font-bold tracking-tight">{pad.label}</span>
              <span className="text-slate-500 text-[9px] uppercase tracking-wider">{pad.sub}</span>
              <Plus className="w-3 h-3 text-slate-600" />
            </button>
          ))}

          {takes.map((t) => {
            const isFocused = t.id === focusedTrack?.id;
            const isTrained = !!t.detectionProfile?.centerFreq;
            const isTraining = calibratingTrackId === t.id;
            return (
              <div
                key={t.id}
                onClick={() => {
                  setSelectionContext((prev) => ({ ...prev, selectedTrackId: t.id }));
                  setExpandedTakeId((prev) => (prev === t.id ? null : t.id));
                }}
                className={`group relative aspect-square rounded-2xl bg-gradient-to-b from-white/[0.06] to-transparent border flex flex-col items-center justify-center gap-1.5 p-2 transition cursor-pointer overflow-hidden ${
                  expandedTakeId === t.id
                    ? 'border-white shadow-[0_0_24px_-4px_rgba(255,255,255,0.35)]'
                    : isFocused
                    ? 'border-white/70 shadow-[0_0_24px_-4px_rgba(255,255,255,0.25)]'
                    : isTrained
                    ? 'border-orange-500/50 hover:border-orange-400/70'
                    : 'border-white/10 hover:border-white/25'
                }`}
                title={t.name}
              >
                {/* Hover-reveal actions */}
                <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearTrack(t.id);
                    }}
                    className="p-1 rounded-lg bg-black/70 hover:bg-white/10 text-slate-300 transition"
                    title="Clear this take's steps and start over"
                  >
                    <Eraser className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTrack(t.id);
                    }}
                    className="p-1 rounded-lg bg-black/70 hover:bg-rose-500/30 text-rose-400 transition"
                    title="Delete this take"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                <span className={`text-[9px] font-mono ${isTrained ? 'text-orange-300' : 'text-slate-600'}`}>
                  {isTrained ? `${t.detectionProfile!.centerFreq}Hz` : 'untrained'}
                </span>
                <span className="text-white text-[11px] font-bold text-center leading-tight px-1 line-clamp-2">
                  {t.name}
                </span>

                {/* Real step-density strip -- this take's actual pattern, not decoration */}
                <div className="flex gap-[1px] h-3 items-end w-full px-2">
                  {t.steps.map((on, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-[1px] ${on ? 'bg-amber-400' : 'bg-white/10'}`}
                      style={{ height: on ? '100%' : '35%' }}
                    />
                  ))}
                </div>

                <span className="mt-1 flex items-center gap-1 text-[8px] text-slate-600 uppercase tracking-wider">
                  <ChevronDown className={`w-2.5 h-2.5 transition-transform ${expandedTakeId === t.id ? 'rotate-180' : ''}`} />
                  {expandedTakeId === t.id ? 'showing' : 'tap to open'}
                </span>
              </div>
            );
          })}
        </div>

        {takes.length === 0 && (
          <p className="text-xs text-slate-600 mt-4">
            Hit one of the three pads above to lay down your first take.
          </p>
        )}

        {/* Revealed system for the tapped take -- Train / Assign / Tighten, all real */}
        {expandedTake && (
          <div className="mt-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">{expandedTake.name}</h4>
                <p className="text-[10px] text-slate-500">
                  {expandedTake.detectionProfile?.centerFreq
                    ? `Trained: ~${expandedTake.detectionProfile.centerFreq}Hz signature`
                    : 'Not trained — using the default classifier'}
                </p>
              </div>
              <button
                onClick={() => setExpandedTakeId(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title="Collapse"
              >
                <ChevronDown className="w-4 h-4 rotate-180" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* TRAIN */}
              <div className="p-3 rounded-xl bg-black border border-white/10 space-y-2">
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">1. Train</div>
                <p className="text-[10px] text-slate-500 leading-snug">
                  Listen for 2s and learn this take's own sound, so future hits route here first.
                </p>
                <button
                  onClick={() => void handleCalibrateTrack(expandedTake.id)}
                  disabled={calibratingTrackId === expandedTake.id}
                  className={`w-full px-2 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    calibratingTrackId === expandedTake.id
                      ? 'bg-amber-500/20 text-amber-300 animate-pulse'
                      : 'bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 border border-orange-500/40'
                  }`}
                >
                  <Target className="w-3 h-3" />
                  <span>{calibratingTrackId === expandedTake.id ? 'LISTENING…' : 'TRAIN THIS SOUND'}</span>
                </button>
              </div>

              {/* ASSIGN */}
              <div className="p-3 rounded-xl bg-black border border-white/10 space-y-2">
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">2. Assign</div>
                <p className="text-[10px] text-slate-500 leading-snug">Pick the sound this take actually plays.</p>
                <select
                  value={expandedTake.vaultLabel || (SOUND_PRESETS[expandedTake.instrument] || [])[0] || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTracks((prev) => prev.map((tr) => (tr.id === expandedTake.id ? { ...tr, vaultLabel: val } : tr)));
                  }}
                  className="w-full bg-white/5 text-slate-200 text-[10px] font-bold px-2 py-1.5 rounded-lg border border-white/10 focus:outline-none cursor-pointer"
                >
                  {(SOUND_PRESETS[expandedTake.instrument] || ['Default Sound Vault Asset']).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* TIGHTEN */}
              <div className="p-3 rounded-xl bg-black border border-white/10 space-y-2">
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">3. Tighten</div>
                <p className="text-[10px] text-slate-500 leading-snug">
                  Your take keeps its natural feel by default. Snap it to the grid if you want it tighter.
                </p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleQuantizeTrackNotes(expandedTake.id, [], TICKS_PER_16TH)}
                    className="flex-1 px-2 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                    title="Snap every hit in this take to the nearest 16th note"
                  >
                    <Zap className="w-3 h-3" />
                    <span>1/16</span>
                  </button>
                  <button
                    onClick={() => handleQuantizeTrackNotes(expandedTake.id, [], TICKS_PER_BEAT)}
                    className="flex-1 px-2 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                    title="Snap every hit in this take to the nearest beat"
                  >
                    <Zap className="w-3 h-3" />
                    <span>1/4</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <p className="text-[11px] text-slate-600 pt-4 mt-4 border-t border-white/10">
          Closing this room drops you back on the focused take in the full grid to keep shaping it — stretch it,
          split it, move it track to track, whatever it needs next.
        </p>
      </div>
    </div>
  );
};
