import React from 'react';
import { ArrowLeft, Drum, Activity, Music, Wand2, AlertCircle, Trash2, Eye, Target } from 'lucide-react';
import { useStudioSession } from '../app/StudioSessionContext';

/**
 * The rhythm/melody counterpart to Write & Record: a full-room dedicated
 * space for one capture at a time, sized like a room because a 480px side
 * drawer read as an afterthought bolted onto Create, not a real part of
 * the process. It calls the exact same handleQuickPerformanceCapture
 * pipeline the Create-room strip does -- this is a second front door onto
 * one mic/track/take path, not a second implementation of it.
 */
interface PerformanceCaptureRoomProps {
  onClose: () => void;
}

export const PerformanceCaptureRoom: React.FC<PerformanceCaptureRoomProps> = ({ onClose }) => {
  const {
    dawState,
    handleToggleMetronome,
    tracks,
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
  } = useStudioSession();

  const focusedTrack = tracks.find((t) => t.id === selectionContext.selectedTrackId) || null;
  const takes = tracks.filter((t) => t.isSourceTrack);

  return (
    <div className="w-full space-y-6 pb-8">
      {/* Room Banner */}
      <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer transition-colors"
            title="Back to Create"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="p-2.5 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
            <Drum className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-100">Performance Capture</h2>
              <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-300 text-[10px] font-mono border border-orange-500/30">
                {dawState.bpm} BPM • 4/4
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Train a take on your own sound, then perform — beatbox, clap/tap, hum/melody — one metronome-guided
              take at a time. Part of the creation process, not the whole of it.
            </p>
          </div>
        </div>
        <button
          onClick={() => void handleToggleMetronome()}
          className={`px-3 h-9 rounded-lg font-black border text-xs transition cursor-pointer active:scale-95 ${
            dawState.metronomeOn
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              : 'bg-slate-950 text-slate-500 border-slate-800'
          }`}
          title="Toggle Audible Metronome Click Guide"
        >
          {dawState.metronomeOn ? 'METRO ON' : 'METRO OFF'}
        </button>
      </div>

      {/* 2-Column Capture & Take Stack */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Capture actions */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-200">PERFORM A NEW TAKE</h3>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => handleQuickPerformanceCapture('MOUTH')}
              disabled={detectionSettings.enabled}
              className="w-full px-4 py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-amber-300 border border-amber-500/50 font-black text-sm flex items-center space-x-2.5 transition cursor-pointer active:scale-95"
              title="Create Beatbox Track & Arm Mic (Kick & Snare Transient Capture)"
            >
              <Drum className="w-4 h-4 text-amber-400" />
              <span>🎤 BEATBOX (MOUTH)</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickPerformanceCapture('BODY')}
              disabled={detectionSettings.enabled}
              className="w-full px-4 py-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-cyan-300 border border-cyan-500/50 font-black text-sm flex items-center space-x-2.5 transition cursor-pointer active:scale-95"
              title="Create Hand Clap & Body Percussion Track"
            >
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>👏 CLAP / TAP (BODY)</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickPerformanceCapture('KEYS')}
              disabled={detectionSettings.enabled}
              className="w-full px-4 py-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-purple-300 border border-purple-500/50 font-black text-sm flex items-center space-x-2.5 transition cursor-pointer active:scale-95"
              title="Create Voice Melody / Hum Track (Pitch Detection & Scale Snap)"
            >
              <Music className="w-4 h-4 text-purple-400" />
              <span>🎹 HUM / VOICE (MELODY)</span>
            </button>
          </div>

          {captureError && (
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs text-amber-200 leading-snug flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{captureError}</span>
            </div>
          )}

          {detectionSettings.enabled ? (
            <div className="pt-3 border-t border-slate-800 space-y-3">
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
              {/* Large, hard-to-miss level readout -- real detectionSettings values,
                  not decorative. The two thin bars this used to be were easy to miss
                  entirely, which is exactly what "the mic came on but I don't see
                  anything" looks like from the outside. */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>LOW / KICK</span>
                  <span className="text-amber-300 font-bold">
                    {Math.round((detectionSettings.currentLowLevel || 0) * 100)}%
                  </span>
                </div>
                <div className="w-full h-4 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-[width] duration-75"
                    style={{ width: `${Math.min(100, (detectionSettings.currentLowLevel || 0) * 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>HIGH / SNARE &amp; HI-HAT</span>
                  <span className="text-cyan-300 font-bold">
                    {Math.round((detectionSettings.currentHighLevel || 0) * 100)}%
                  </span>
                </div>
                <div className="w-full h-4 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-[width] duration-75"
                    style={{ width: `${Math.min(100, (detectionSettings.currentHighLevel || 0) * 100)}%` }}
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-500">
                If both meters stay flat while you perform, the mic granted access but isn't hearing you — check
                you picked the right input device in your browser's site settings.
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
              Each button arms the mic and starts a new track. Nothing is recorded until it opens.
            </p>
          )}
        </div>

        {/* Right Column (7 cols): Take Stack & Focused Take */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-200">TRAIN & REVIEW YOUR TAKES ({takes.length})</h3>
            {focusedTrack && (
              <button
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent('soulsonus:openDrawer', {
                      detail: { type: 'realization', trackId: focusedTrack.id },
                    })
                  )
                }
                className="px-2.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[11px] font-black flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                title="Ask AI to tweak the focused take"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>ASK AI TO TWEAK</span>
              </button>
            )}
          </div>

          {takes.length === 0 ? (
            <p className="text-xs text-slate-500">
              Nothing captured yet this session. Pick a capture mode on the left to start.
            </p>
          ) : (
            <div className="space-y-2">
              {takes.map((t) => {
                const isFocused = t.id === focusedTrack?.id;
                return (
                  <div
                    key={t.id}
                    className={`p-3 rounded-xl border transition cursor-pointer ${
                      isFocused
                        ? 'bg-slate-950 border-amber-400 ring-1 ring-amber-400/40'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                    onClick={() => setSelectionContext((prev) => ({ ...prev, selectedTrackId: t.id }))}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-200">{t.name}</div>
                        <div className="text-[9px] text-slate-500 font-mono">
                          {t.detectionProfile?.centerFreq
                            ? `Trained: ~${t.detectionProfile.centerFreq}Hz signature`
                            : 'Not trained — using the default classifier'}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleCalibrateTrack(t.id);
                          }}
                          disabled={calibratingTrackId === t.id}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                            calibratingTrackId === t.id
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                              : 'bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 border border-orange-500/40'
                          }`}
                          title="Listen for 2 seconds and learn this take's own sound, so future hits route here first"
                        >
                          <Target className="w-3 h-3" />
                          <span>{calibratingTrackId === t.id ? 'LISTENING…' : 'TRAIN THIS SOUND'}</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectionContext((prev) => ({ ...prev, selectedTrackId: t.id }));
                          }}
                          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 transition"
                          title="Focus this take"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClearTrack(t.id);
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold transition"
                          title="Clear this take's steps and start over"
                        >
                          Clear
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTrack(t.id);
                          }}
                          className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                          title="Delete this take"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-[1.5px] h-5 items-end mt-2">
                      {t.steps.map((on, i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-sm ${on ? 'bg-amber-400' : 'bg-slate-800'}`}
                          style={{ height: on ? '100%' : '30%' }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-[11px] text-slate-500 pt-3 border-t border-slate-800">
            Closing this room drops you back on the focused take in the full grid to keep shaping it — stretch it,
            split it, move it track to track, whatever it needs next.
          </p>
        </div>
      </div>
    </div>
  );
};
