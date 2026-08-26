import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Drum, Activity, Music, Wand2, AlertCircle } from 'lucide-react';
import { useStudioSession } from '../../app/StudioSessionContext';

interface PerformanceCaptureDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * The rhythm/melody counterpart to the Songwriting Suite: a dedicated,
 * metronome-guided room for one capture at a time, instead of the three
 * capture buttons living flat inside the Create canvas as the only place
 * to reach them. It calls the exact same handleQuickPerformanceCapture
 * pipeline the Create-room strip does -- this is a second front door onto
 * one mic/track/take path, not a second implementation of it.
 */
export const PerformanceCaptureDrawer: React.FC<PerformanceCaptureDrawerProps> = ({ isOpen, onClose }) => {
  const {
    dawState,
    handleToggleMetronome,
    tracks,
    selectionContext,
    detectionSettings,
    captureError,
    handleQuickPerformanceCapture,
    handleStopCapture,
  } = useStudioSession();

  const focusedTrack = tracks.find((t) => t.id === selectionContext.selectedTrackId) || null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="fixed right-0 top-0 bottom-0 w-full sm:w-[440px] md:w-[480px] bg-slate-950/98 border-l border-slate-800 shadow-2xl z-40 flex flex-col justify-between overflow-hidden font-mono select-none"
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-900/90 shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <Drum className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black text-slate-100 uppercase tracking-wide">
                    PERFORMANCE CAPTURE
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                    {dawState.bpm} BPM
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-sans">
                  Beatbox • Clap/Tap • Hum/Melody — one guided take at a time
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Close Performance Capture"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Room Interior */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
            {/* Metronome */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Metronome</div>
                <div className="text-sm font-bold text-slate-200">{dawState.bpm} BPM • 4/4</div>
              </div>
              <button
                onClick={() => void handleToggleMetronome()}
                className={`px-3 py-1.5 rounded-lg font-black border text-xs transition cursor-pointer active:scale-95 ${
                  dawState.metronomeOn
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-slate-950 text-slate-500 border-slate-800'
                }`}
                title="Toggle Audible Metronome Click Guide"
              >
                {dawState.metronomeOn ? 'METRO ON' : 'METRO OFF'}
              </button>
            </div>

            {/* Capture a new take */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Capture a new take
              </div>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickPerformanceCapture('MOUTH')}
                  disabled={detectionSettings.enabled}
                  className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-amber-300 border border-amber-500/50 font-black text-[11px] flex items-center space-x-2 transition cursor-pointer active:scale-95"
                  title="Create Beatbox Track & Arm Mic (Kick & Snare Transient Capture)"
                >
                  <Drum className="w-3.5 h-3.5 text-amber-400" />
                  <span>🎤 BEATBOX (MOUTH)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPerformanceCapture('BODY')}
                  disabled={detectionSettings.enabled}
                  className="px-3 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-cyan-300 border border-cyan-500/50 font-black text-[11px] flex items-center space-x-2 transition cursor-pointer active:scale-95"
                  title="Create Hand Clap & Body Percussion Track"
                >
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>👏 CLAP / TAP (BODY)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPerformanceCapture('KEYS')}
                  disabled={detectionSettings.enabled}
                  className="px-3 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-purple-300 border border-purple-500/50 font-black text-[11px] flex items-center space-x-2 transition cursor-pointer active:scale-95"
                  title="Create Voice Melody / Hum Track (Pitch Detection & Scale Snap)"
                >
                  <Music className="w-3.5 h-3.5 text-purple-400" />
                  <span>🎹 HUM / VOICE (MELODY)</span>
                </button>
              </div>

              {captureError && (
                <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-[10px] text-amber-200 font-sans leading-snug flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>{captureError}</span>
                </div>
              )}

              {detectionSettings.enabled ? (
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      LISTENING…
                    </span>
                    <button
                      onClick={() => void handleStopCapture()}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-bold transition cursor-pointer active:scale-95"
                    >
                      STOP CAPTURE
                    </button>
                  </div>
                  <div className="flex items-center gap-1" title="Live input level: low band and high band">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 transition-[width] duration-75"
                        style={{ width: `${Math.min(100, (detectionSettings.currentLowLevel || 0) * 100)}%` }}
                      />
                    </div>
                    <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-cyan-400 transition-[width] duration-75"
                        style={{ width: `${Math.min(100, (detectionSettings.currentHighLevel || 0) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-[9px] text-slate-500 font-sans">
                  Each button arms the mic and starts a new track. Nothing is recorded until it opens.
                </p>
              )}
            </div>

            {/* Focused take */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Focused Take</span>
                {focusedTrack && (
                  <button
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent('soulsonus:openDrawer', {
                          detail: { type: 'realization', trackId: focusedTrack.id },
                        })
                      )
                    }
                    className="px-2 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[10px] font-black flex items-center gap-1 transition cursor-pointer active:scale-95"
                    title="Ask AI to tweak this track"
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>ASK AI TO TWEAK</span>
                  </button>
                )}
              </div>
              {focusedTrack ? (
                <>
                  <div className="text-sm font-bold text-slate-200">{focusedTrack.name}</div>
                  <div className="flex gap-[1.5px] h-6 items-end">
                    {focusedTrack.steps.map((on, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-sm ${on ? 'bg-amber-400' : 'bg-slate-800'}`}
                        style={{ height: on ? '100%' : '30%' }}
                      />
                    ))}
                  </div>
                  <p className="text-[9px] text-slate-500 font-sans">
                    Closing this panel drops you back on this same track in the full grid to keep shaping it —
                    stretch it, split it, move it track to track, whatever it needs next.
                  </p>
                </>
              ) : (
                <p className="text-[10px] text-slate-500 font-sans">
                  Nothing captured yet this session. Pick a capture mode above to start.
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
