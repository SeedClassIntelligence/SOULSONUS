import React, { useState } from 'react';
import {
  Sliders,
  Volume2,
  VolumeX,
  Radio,
  RotateCcw,
  Sparkles,
  Zap,
  Activity,
  Layers,
  ChevronDown,
  Power,
  Shield,
  Eye,
  Disc,
} from 'lucide-react';
import { useStudioSession } from '../../app/StudioSessionContext';
import { Track, MixBusChannel, TrackDspSettings } from '../../types/daw';
import { defaultTrackDsp } from '../../audio/trackStrip';

export const MixingConsoleDesk: React.FC = () => {
  const {
    tracks,
    buses,
    dawState,
    focusedTrackId,
    handleSetFocusedTrackId,
    monitoringMode,
    handleToggleMixSolo,
    handleToggleMixMute,
    handleToggleMixDim,
    handleToggleMixBypass,
    handleToggleReferenceAB,
    handleUpdateChannelStrip,
    handleUpdateBusChannel,
    handleToggleInsertBypass,
    handleReorderTrackInserts,
  } = useStudioSession();

  const [activeBusView, setActiveBusView] = useState<'ALL' | 'TRACKS' | 'BUSES'>('ALL');

  return (
    <div className="w-full bg-slate-950/95 border-b border-slate-800 flex flex-col font-mono select-none overflow-hidden">
      {/* 1. MIXER CONSOLE SUB-HEADER */}
      <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400/80" />
            <h3 className="text-xs font-black text-slate-100 uppercase tracking-wide">
              MULTICHANNEL MIXING CONSOLE DESK
            </h3>
          </div>
          <span className="text-[10px] text-slate-500 font-bold hidden md:inline">
            • 32-BIT FLOATING DSP • 24 PPQN CLOCK SYNC • DYNAMIC BUS SUMMING
          </span>
        </div>

        {/* Master Monitor Controls (DIM, MONO, BYPASS, A/B REF) */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleToggleMixDim}
            className={`px-2.5 py-1 rounded text-[10px] font-black transition cursor-pointer border ${
              monitoringMode.isDimmed
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Monitor Dim (-20dB pad)"
          >
            DIM (-20dB)
          </button>
          <button
            onClick={handleToggleMixBypass}
            className={`px-2.5 py-1 rounded text-[10px] font-black transition cursor-pointer border ${
              monitoringMode.isBypassed
                ? 'bg-rose-500 text-white border-rose-400'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Bypass All Channel DSP"
          >
            BYPASS DSP
          </button>
          <button
            onClick={handleToggleReferenceAB}
            className={`px-3 py-1 rounded text-[10px] font-black transition cursor-pointer border flex items-center space-x-1.5 ${
              monitoringMode.abMode === 'REF'
                ? 'bg-cyan-400 text-slate-950 border-cyan-300 shadow-md shadow-cyan-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="Toggle Live Audition between Active Mix and Reference Track"
          >
            <Radio className="w-3 h-3" />
            <span>AUDITION: {monitoringMode.abMode === 'REF' ? 'REFERENCE (A)' : 'ACTIVE MIX (B)'}</span>
          </button>
        </div>
      </div>

      {/* 2. MULTICHANNEL CHANNEL STRIPS CAROUSEL */}
      <div className="flex-1 p-3 overflow-x-auto custom-scrollbar flex items-stretch space-x-2.5 min-h-[380px] max-h-[440px]">
        {/* Track Channel Strips */}
        {tracks.map((track, idx) => {
          const isFocused = focusedTrackId === track.id;
          const isSoloed = monitoringMode.soloTrackIds.includes(track.id) || track.solo;
          const isMuted = monitoringMode.muteTrackIds.includes(track.id) || track.mute;
          // A merge, not `||`: dspSettings is deliberately partial, so an
          // `||` fallback never applies once any field has been set.
          const dsp = { ...defaultTrackDsp(track), ...track.dspSettings };

          return (
            <div
              key={track.id}
              onClick={() => handleSetFocusedTrackId(track.id)}
              className={`w-36 shrink-0 rounded-2xl border flex flex-col justify-between p-2.5 transition select-none cursor-pointer group ${
                isFocused
                  ? 'bg-slate-900/95 border-cyan-400 shadow-xl shadow-cyan-500/20 ring-1 ring-cyan-400/40'
                  : 'bg-slate-950/80 hover:bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Channel Header */}
              <div className="space-y-1 pb-1.5 border-b border-slate-800/80">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-bold">CH {idx + 1}</span>
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: track.color || '#f59e0b' }}
                  />
                </div>
                <p className="font-black text-xs text-slate-100 truncate">{track.name}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider">
                    {track.instrument}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetFocusedTrackId(track.id);
                    }}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase transition ${
                      isFocused
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                    title="Focus Track in Workstation (Independent from Solo)"
                  >
                    FOCUS
                  </button>
                </div>
              </div>

              {/* Inserts & Pre-Amp Section */}
              <div className="space-y-1.5 py-1.5 border-b border-slate-800/60 text-[9px]">
                <div className="flex items-center justify-between text-slate-400 font-bold">
                  <span>INSERTS</span>
                  <span className="text-[8px] text-slate-500">6 SLOTS</span>
                </div>
                <div className="space-y-1">
                  <div className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[8px] flex items-center justify-between text-slate-300">
                    <span>1. 4-Band EQ</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[8px] flex items-center justify-between text-slate-300">
                    <span>2. Comp ({Math.round(dsp.compressorRatio)}:1)</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[8px] flex items-center justify-between text-slate-300">
                    <span>3. {track.instrument === 'vocal_synth' ? 'De-Esser' : 'Sat Warmth'}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  </div>
                </div>
              </div>

              {/* Aux Sends Section */}
              <div className="space-y-1.5 py-1.5 border-b border-slate-800/60 text-[9px]">
                <div className="flex items-center justify-between text-slate-400 font-bold">
                  <span>AUX SENDS</span>
                  <span className="text-[8px] text-slate-500">POST</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[8px] text-slate-400">
                    <span>S1 Reverb</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={dsp.reverbSend}
                      onChange={(e) =>
                        handleUpdateChannelStrip(track.id, { reverbSend: parseFloat(e.target.value) })
                      }
                      className="w-14 accent-cyan-400 cursor-pointer h-1"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[8px] text-slate-400">
                    <span>S2 Delay</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={dsp.delaySend}
                      onChange={(e) =>
                        handleUpdateChannelStrip(track.id, { delaySend: parseFloat(e.target.value) })
                      }
                      className="w-14 accent-purple-400 cursor-pointer h-1"
                    />
                  </div>
                </div>
              </div>

              {/* Stereo Pan Pot */}
              <div className="py-1 border-b border-slate-800/60 flex items-center justify-between text-[9px]">
                <span className="text-slate-400 font-bold">PAN</span>
                <div className="flex items-center space-x-1">
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.1"
                    value={dsp.pan}
                    onChange={(e) =>
                      handleUpdateChannelStrip(track.id, { pan: parseFloat(e.target.value) })
                    }
                    className="w-16 accent-amber-400 cursor-pointer h-1"
                  />
                  <span className="text-[8px] font-bold text-amber-300 w-6 text-right">
                    {dsp.pan === 0 ? 'C' : dsp.pan < 0 ? `L${Math.abs(Math.round(dsp.pan * 100))}` : `R${Math.round(dsp.pan * 100)}`}
                  </span>
                </div>
              </div>

              {/* Solo, Mute, Record Arm Buttons */}
              <div className="grid grid-cols-3 gap-1 py-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleMixSolo(track.id);
                  }}
                  className={`py-1 rounded text-[9px] font-black transition cursor-pointer ${
                    isSoloed
                      ? 'bg-amber-400 text-slate-950 font-black shadow-sm shadow-amber-400/50'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                  title="Acoustic Solo (Hear soloed in mix bus)"
                >
                  S
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleMixMute(track.id);
                  }}
                  className={`py-1 rounded text-[9px] font-black transition cursor-pointer ${
                    isMuted
                      ? 'bg-rose-500 text-white font-black shadow-sm shadow-rose-500/50'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                  title="Audio Mute"
                >
                  M
                </button>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="py-1 rounded bg-slate-900 text-slate-400 hover:text-rose-400 border border-slate-800 text-[9px] font-black transition cursor-pointer"
                  title="Record Arm Input"
                >
                  ARM
                </button>
              </div>

              {/* Fader & LED Meter Ladder */}
              <div className="flex items-center space-x-2 pt-1">
                {/* Gain Reduction (GR) Mini Meter */}
                <div className="w-1.5 h-28 bg-slate-950 rounded-full overflow-hidden flex flex-col justify-end p-0.5 border border-slate-900">
                  <div
                    className="w-full bg-rose-500 rounded-full transition-all duration-75"
                    style={{ height: `${Math.min(100, Math.max(10, Math.abs(dsp.compressorThreshold + 18) * 4))}%` }}
                  />
                </div>

                {/* Motorized Fader Slider */}
                <div className="flex-1 h-28 flex flex-col items-center justify-between relative">
                  <input
                    type="range"
                    min="-40"
                    max="6"
                    step="0.5"
                    value={track.volume || 0}
                    onChange={(e) =>
                      handleUpdateChannelStrip(track.id, { volume: parseFloat(e.target.value) })
                    }
                    className="w-24 -rotate-90 origin-center accent-cyan-400 cursor-pointer h-2 my-auto"
                  />
                </div>

                {/* Dual Peak/RMS LED Meter Ladder */}
                <div className="w-2.5 h-28 bg-slate-950 rounded-full overflow-hidden flex flex-col justify-end p-0.5 border border-slate-800 space-y-0.5">
                  <div
                    className="w-full bg-emerald-400 rounded-full transition-all duration-75"
                    style={{ height: `${Math.min(100, Math.max(15, (track.volume || 0) + 40 * 2))}%` }}
                  />
                </div>
              </div>

              {/* Fader Value Display */}
              <div className="pt-1 text-center font-bold text-[10px] text-cyan-300">
                {(track.volume || 0) > 0 ? `+${track.volume}dB` : `${track.volume || 0}dB`}
              </div>
            </div>
          );
        })}

        {/* GROUP BUSES (Drums, Vocals, Music, FX) */}
        {buses.map((bus) => (
          <div
            key={bus.id}
            className="w-36 shrink-0 rounded-2xl bg-slate-900/80 border border-slate-700/80 flex flex-col justify-between p-2.5 transition select-none shadow-lg"
          >
            {/* Bus Header */}
            <div className="space-y-1 pb-1.5 border-b border-slate-700">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-purple-400 font-bold">BUS</span>
                <span className="w-2 h-2 rounded-full bg-purple-400" />
              </div>
              <p className="font-black text-xs text-purple-200 truncate">{bus.name}</p>
              <span className="text-[8px] text-slate-400 font-mono">
                {bus.inputTrackIds.length} Tracks Summed
              </span>
            </div>

            {/* Bus Inserts */}
            <div className="space-y-1 py-2 border-b border-slate-800 text-[8px]">
              <div className="text-slate-400 font-bold text-[9px]">BUS INSERTS</div>
              {bus.inserts.slice(0, 2).map((ins) => (
                <div
                  key={ins.slotId}
                  className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between text-slate-300"
                >
                  <span className="truncate">{ins.pluginName}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                </div>
              ))}
            </div>

            {/* Bus Fader & Meter */}
            <div className="flex items-center space-x-2 pt-2">
              <div className="flex-1 h-28 flex flex-col items-center justify-between">
                <input
                  type="range"
                  min="-40"
                  max="6"
                  step="0.5"
                  value={bus.volume}
                  onChange={(e) =>
                    handleUpdateBusChannel(bus.id, { volume: parseFloat(e.target.value) })
                  }
                  className="w-24 -rotate-90 origin-center accent-purple-400 cursor-pointer h-2 my-auto"
                />
              </div>
              <div className="w-2.5 h-28 bg-slate-950 rounded-full overflow-hidden flex flex-col justify-end p-0.5 border border-purple-500/40">
                <div
                  className="w-full bg-purple-400 rounded-full"
                  style={{ height: `${Math.min(100, Math.max(20, (bus.volume + 40) * 2))}%` }}
                />
              </div>
            </div>

            <div className="pt-1 text-center font-bold text-[10px] text-purple-300">
              {bus.volume > 0 ? `+${bus.volume}dB` : `${bus.volume}dB`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
