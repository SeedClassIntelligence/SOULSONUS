import React, { useState } from 'react';
import { Drum, Activity, Music, Plus, X, Maximize2, Circle, Square } from 'lucide-react';
import { useStudioSession } from '../app/StudioSessionContext';

/**
 * The instrument, sitting on top of the arrangement instead of replacing it.
 *
 * The full room (Train / Play / Packs) took the whole screen, so opening it
 * hid the very lanes the performance lands on -- the opposite of "it sits on
 * top of the DAW". This is the same instrument reduced to what you need while
 * performing: the pads, the click, and the arm state. Everything deeper is one
 * click away in the full room.
 */
interface InstrumentStripProps {
  onExpand: () => void;
  onClose: () => void;
}

const PAD_COUNT = 8;

const MODALITIES: { m: 'MOUTH' | 'BODY' | 'KEYS'; icon: React.ReactNode; color: string; label: string }[] = [
  { m: 'MOUTH', icon: <Drum className="w-3 h-3" />, color: 'text-amber-400', label: 'Beatbox' },
  { m: 'BODY', icon: <Activity className="w-3 h-3" />, color: 'text-cyan-400', label: 'Clap / Tap' },
  { m: 'KEYS', icon: <Music className="w-3 h-3" />, color: 'text-purple-400', label: 'Hum / Voice' },
];

export const InstrumentStrip: React.FC<InstrumentStripProps> = ({ onExpand, onClose }) => {
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
    audioAssets,
  } = useStudioSession();

  const [openSlot, setOpenSlot] = useState<number | null>(null);
  /** What the next take is performed with. Beatbox is the ordinary case. */
  const [mode, setMode] = useState<'MOUTH' | 'BODY' | 'KEYS'>('MOUTH');

  const pads = tracks.filter((t) => t.isSourceTrack);
  const slots = Array.from({ length: PAD_COUNT }, (_, i) => pads[i] || null);
  const listening = detectionSettings.enabled;

  return (
    <div className="rounded-2xl border border-white/10 bg-black px-4 py-3">
      {/* header */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-[0.09em] text-orange-400">Instrument</span>

          {/* What you perform with. Named, not an unlabelled icon. */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-white/5 border border-white/10">
            {MODALITIES.map((mo) => (
              <button
                key={mo.m}
                onClick={() => setMode(mo.m)}
                disabled={listening}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer disabled:opacity-40 ${
                  mode === mo.m ? 'bg-white text-slate-950' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mo.label}
              </button>
            ))}
          </div>

          {/* The whole point of the room, and it used to be reachable only by
              clicking an empty pad and then an unlabelled icon. */}
          {listening ? (
            <button
              onClick={() => void handleStopCapture()}
              className="px-3 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-[11px] font-black flex items-center gap-1.5 transition cursor-pointer active:scale-95"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>STOP</span>
            </button>
          ) : (
            <button
              onClick={() => handleQuickPerformanceCapture(mode)}
              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-black flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-[0_0_14px_-4px_rgba(225,29,72,.9)]"
              title="Record a performance — the hits are split onto the drum channels below as you play"
            >
              <Circle className="w-3 h-3 fill-current" />
              <span>RECORD</span>
            </button>
          )}

          {listening ? (
            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {Math.round((detectionSettings.currentLowLevel || 0) * 100)}/
              {Math.round((detectionSettings.currentHighLevel || 0) * 100)}
            </span>
          ) : (
            <span className="text-[10px] font-mono text-slate-600 truncate hidden lg:inline">
              hits split onto the channels below as you perform
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-mono text-slate-400">
            {dawState.bpm} BPM
          </span>
          <button
            onClick={() => void handleToggleMetronome()}
            className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold transition cursor-pointer ${
              dawState.metronomeOn
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-white/5 text-slate-500 border-white/10'
            }`}
          >
            METRO
          </button>
          <button
            onClick={onExpand}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/10 transition cursor-pointer"
            title="Open the full instrument — Train, Play and Packs"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/10 transition cursor-pointer"
            title="Close the instrument"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {captureError && (
        <div className="mb-2.5 px-2.5 py-1.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-[10px] text-amber-200">
          {captureError}
        </div>
      )}

      {/* pads */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {slots.map((t, i) => {
          if (!t) {
            return (
              <div
                key={`e-${i}`}
                className="w-[86px] h-[58px] shrink-0 rounded-xl border border-dashed border-white/10 flex items-center justify-center gap-1"
              >
                {openSlot === i ? (
                  MODALITIES.map((mo) => (
                    <button
                      key={mo.m}
                      onClick={() => {
                        handleQuickPerformanceCapture(mo.m);
                        setOpenSlot(null);
                      }}
                      disabled={listening}
                      className={`w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 flex items-center justify-center ${mo.color} transition cursor-pointer`}
                      title={mo.label}
                    >
                      {mo.icon}
                    </button>
                  ))
                ) : (
                  <button
                    onClick={() => setOpenSlot(i)}
                    className="w-7 h-7 rounded-full border border-white/12 text-slate-600 hover:text-slate-300 hover:border-white/25 flex items-center justify-center transition cursor-pointer"
                    title="Empty pad"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          }

          const isFocused = selectionContext.selectedTrackId === t.id;
          const clips = t.audioClips || [];
          const latest = clips[clips.length - 1];
          const peaks = latest ? audioAssets[latest.assetId]?.peaks || [] : [];
          const isTrained = !!t.detectionProfile?.centerFreq;

          return (
            <button
              key={t.id}
              onClick={() => setSelectionContext((prev) => ({ ...prev, selectedTrackId: t.id }))}
              className={`w-[86px] h-[58px] shrink-0 rounded-xl border p-1.5 flex flex-col items-center justify-center gap-1 transition cursor-pointer bg-gradient-to-b from-white/[0.05] to-transparent ${
                isFocused
                  ? 'border-white shadow-[0_0_16px_-6px_rgba(255,255,255,.5)]'
                  : isTrained
                  ? 'border-orange-500/50 hover:border-orange-400/70'
                  : 'border-white/10 hover:border-white/25'
              }`}
              title={t.name}
            >
              <span className="text-[8.5px] font-bold text-white text-center leading-tight line-clamp-2 px-0.5">
                {t.name}
              </span>
              {peaks.length > 0 ? (
                <span className="flex items-center gap-[1px] h-3 w-full px-1">
                  {peaks.slice(0, 22).map((p, pi) => (
                    <span
                      key={pi}
                      className="flex-1 bg-orange-400/70 rounded-[.5px]"
                      style={{ height: `${Math.max(8, Math.min(100, p * 100))}%` }}
                    />
                  ))}
                </span>
              ) : (
                <Circle className="w-2.5 h-2.5 text-slate-700" />
              )}
              <span className="text-[7.5px] font-mono text-slate-500">
                {clips.length ? `${clips.length} take${clips.length === 1 ? '' : 's'}` : 'no takes'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
