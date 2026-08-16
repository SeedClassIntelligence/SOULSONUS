import React, { useEffect, useRef } from 'react';
import { Mic, Square, Play, Volume2, Trash2, Radio, Activity, Sliders, Music } from 'lucide-react';
import { VocalTrackState } from '../types/daw';

interface VocalLayerProps {
  vocalState: VocalTrackState;
  onStartRecordVocal: () => void;
  onStopRecordVocal: () => void;
  onClearVocal: () => void;
  onUpdateVocalState: (updates: Partial<VocalTrackState>) => void;
  isPlayingSequencer: boolean;
  currentStep: number;
}

export const VocalLayer: React.FC<VocalLayerProps> = ({
  vocalState = {
    isRecording: false,
    audioBlob: null,
    audioUrl: null,
    duration: 0,
    waveformData: [],
    volume: 0,
    mute: false,
    solo: false,
    delaySend: 0,
    reverbSend: 0,
  },
  onStartRecordVocal,
  onStopRecordVocal,
  onClearVocal,
  onUpdateVocalState,
  isPlayingSequencer = false,
  currentStep = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Render high resolution waveform on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    if (!vocalState?.waveformData || vocalState.waveformData.length === 0) {
      // Empty placeholder line
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      return;
    }

    const data = vocalState.waveformData;
    const stepWidth = width / data.length;
    const centerY = height / 2;

    // Draw grid background timeline bars (4 bars = 16 subdivisions)
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 64; i += 4) {
      const x = (i / 64) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw Waveform bars
    ctx.fillStyle = vocalState.mute ? '#64748b' : '#f59e0b'; // Amber waveform
    for (let i = 0; i < data.length; i++) {
      const amp = data[i] * (height / 2 - 4);
      const x = i * stepWidth;
      ctx.fillRect(x, centerY - amp, Math.max(1.5, stepWidth - 1), amp * 2);
    }

    // Draw playhead cursor line across waveform
    if (isPlayingSequencer) {
      const playheadX = (currentStep / 64) * width;
      ctx.strokeStyle = '#38bdf8'; // Sky blue
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
    }
  }, [vocalState.waveformData, vocalState.mute, isPlayingSequencer, currentStep]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl select-none">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-2 border-b border-slate-800">
        {/* Title */}
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-100 flex items-center gap-2">
              VOCAL LAYER TRACK & SYNCHRONIZED RECORDER
              {vocalState.isRecording && (
                <span className="flex items-center gap-1.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  RECORDING IN SYNC...
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Overdub live vocals over your 4-bar MIDI beat with real-time waveform sync
            </p>
          </div>
        </div>

        {/* Recording Controls */}
        <div className="flex items-center gap-2">
          {!vocalState.isRecording ? (
            <button
              id="btn-record-vocal"
              onClick={onStartRecordVocal}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 transition active:scale-95"
            >
              <Radio className="w-4 h-4 text-white animate-pulse" />
              <span>[RECORD VOCAL OVERDUB]</span>
            </button>
          ) : (
            <button
              id="btn-stop-record-vocal"
              onClick={onStopRecordVocal}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/30 transition active:scale-95 animate-bounce"
            >
              <Square className="w-4 h-4 fill-slate-950" />
              <span>STOP RECORDING</span>
            </button>
          )}

          {vocalState.audioBlob && (
            <button
              id="btn-clear-vocal"
              onClick={onClearVocal}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 transition"
              title="Delete Vocal Recording"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Track Row + Waveform Display */}
      <div className="flex flex-col md:flex-row items-stretch bg-slate-950/90 rounded-xl p-3 border border-slate-800 gap-4">
        {/* Vocal Control Panel */}
        <div className="w-full md:w-60 shrink-0 flex flex-col justify-between gap-3 pr-0 md:pr-3 border-b md:border-b-0 md:border-r border-slate-800 pb-3 md:pb-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
              VOCAL OVERDUB
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onUpdateVocalState?.({ mute: !vocalState.mute })}
                className={`w-6 h-6 rounded text-[10px] font-black transition ${
                  vocalState.mute
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title="Mute Vocal"
              >
                M
              </button>
            </div>
          </div>

          {/* Volume Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-semibold text-slate-400">
              <span>VOCAL VOL</span>
              <span className="font-mono text-amber-400">{vocalState.volume}dB</span>
            </div>
            <input
              type="range"
              min={-20}
              max={6}
              step={0.5}
              value={vocalState.volume}
              onChange={(e) => onUpdateVocalState?.({ volume: Number(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* FX Sends */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="text-slate-500 font-medium block">DELAY</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={vocalState.delaySend}
                onChange={(e) => onUpdateVocalState?.({ delaySend: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
            <div>
              <span className="text-slate-500 font-medium block">REVERB</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={vocalState.reverbSend}
                onChange={(e) => onUpdateVocalState?.({ reverbSend: Number(e.target.value) })}
                className="w-full accent-purple-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Waveform Canvas View */}
        <div className="flex-1 flex flex-col justify-center">
          {vocalState.audioBlob ? (
            <div className="relative w-full h-24 bg-slate-900 rounded-lg overflow-hidden border border-slate-800 shadow-inner">
              <canvas
                ref={canvasRef}
                width={800}
                height={96}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2 text-[10px] font-mono font-bold bg-slate-950/80 px-2 py-0.5 rounded text-amber-400 border border-slate-800">
                {vocalState.duration.toFixed(1)}s SYNCED
              </div>
            </div>
          ) : (
            <div className="w-full h-24 bg-slate-900/50 rounded-lg border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-500 text-xs font-medium gap-1">
              <Activity className="w-5 h-5 text-slate-600" />
              <span>No vocal recording yet. Click [Record Vocal Overdub] above to lay down vocals!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
