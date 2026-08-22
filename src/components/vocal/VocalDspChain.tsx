import React, { useState, useEffect } from 'react';
import { Track } from '../../types/daw';
import { useStudioSession } from '../../app/StudioSessionContext';
import { Sliders } from 'lucide-react';

interface VocalDspChainProps {
  track: Track | null;
}

export const VocalDspChain: React.FC<VocalDspChainProps> = ({ track }) => {
  const { tracks, updateTracksWithHistory } = useStudioSession();

  const currentTrack = track || tracks.find((t) => t.id === 't-vocal') || tracks[0];

  if (!currentTrack) return <div className="p-6 text-center text-neutral-500">Select a vocal track to configure DSP chain</div>;

  // No type annotation: every field here is a concrete number, and leaving
  // the type inferred (rather than widening to TrackDspSettings, where every
  // field is optional) is what lets the merge below resolve to non-optional
  // values instead of re-losing that guarantee.
  const defaultDsp = {
    lowCutHz: 80,
    lowGain: -1.5,
    midFreqHz: 3200,
    midGain: 2.0,
    midQ: 1.2,
    highGain: 2.5,
    compressorThreshold: -18,
    compressorRatio: 3.5,
    reverbSend: 0.25,
    delaySend: 0.15,
    pan: 0,
    volume: 0,
  };

  // A merge, not `||`: dspSettings is deliberately partial, so an `||`
  // fallback never applies once any field has been set, leaving the rest
  // silently undefined.
  const [localDsp, setLocalDsp] = useState({ ...defaultDsp, ...currentTrack.dspSettings });

  useEffect(() => {
    if (currentTrack?.dspSettings) {
      setLocalDsp({ ...defaultDsp, ...currentTrack.dspSettings });
    }
  }, [currentTrack?.id, currentTrack?.dspSettings]);

  const commitDsp = () => {
    updateTracksWithHistory((prev) =>
      prev.map((t) => (t.id === currentTrack.id ? { ...t, dspSettings: { ...localDsp } } : t))
    );
  };

  return (
    <div className="bg-slate-950/95 border border-slate-800/90 rounded-2xl p-4 shadow-2xl space-y-4 select-none text-xs font-mono">
      {/* 1. Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2.5 gap-2">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-pink-400" />
          <span className="font-black text-slate-100 uppercase tracking-wide">
            VOCAL CHANNEL DSP CHAIN • {currentTrack.name.toUpperCase()}
          </span>
          <span className="px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 text-[10px] font-black">
            STUDIO PRO VOCAL STRIP
          </span>
        </div>

        <div className="text-[10px] text-slate-400">
          This exact processing state feeds directly into Step 4 (MIX)
        </div>
      </div>

      {/* 2. Real Vocal Signal Flow Modules Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Module 1: Preamp & High Pass Filter */}
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1 text-[10px]">
            <span className="font-bold text-pink-300">1. PREAMP & HPF</span>
            <span className="text-slate-500">80Hz ROLLOFF</span>
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>High-Pass Filter:</span>
              <span className="text-pink-300 font-bold">{localDsp.lowCutHz} Hz</span>
            </div>
            <input
              type="range"
              min={40}
              max={200}
              value={localDsp.lowCutHz}
              onChange={(e) => setLocalDsp({ ...localDsp, lowCutHz: Number(e.target.value) })}
              onPointerUp={commitDsp}
              className="w-full accent-pink-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>Low Mud Dip:</span>
              <span className="text-pink-300 font-bold">{localDsp.lowGain} dB</span>
            </div>
            <input
              type="range"
              min={-6}
              max={6}
              step={0.5}
              value={localDsp.lowGain}
              onChange={(e) => setLocalDsp({ ...localDsp, lowGain: Number(e.target.value) })}
              onPointerUp={commitDsp}
              className="w-full accent-pink-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Module 2: Presence & Air EQ */}
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1 text-[10px]">
            <span className="font-bold text-cyan-300">2. PRESENCE & AIR</span>
            <span className="text-slate-500">PARAMETRIC</span>
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>Mid Freq:</span>
              <span className="text-cyan-300 font-bold">{localDsp.midFreqHz} Hz</span>
            </div>
            <input
              type="range"
              min={200}
              max={8000}
              step={10}
              value={localDsp.midFreqHz}
              onChange={(e) => setLocalDsp({ ...localDsp, midFreqHz: Number(e.target.value) })}
              onPointerUp={commitDsp}
              className="w-full accent-cyan-400 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>Mid Q:</span>
              <span className="text-cyan-300 font-bold">{localDsp.midQ}</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={10}
              step={0.1}
              value={localDsp.midQ}
              onChange={(e) => setLocalDsp({ ...localDsp, midQ: Number(e.target.value) })}
              onPointerUp={commitDsp}
              className="w-full accent-cyan-400 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>Mid Presence ({localDsp.midFreqHz}Hz):</span>
              <span className="text-cyan-300 font-bold">{localDsp.midGain > 0 ? `+${localDsp.midGain}` : localDsp.midGain} dB</span>
            </div>
            <input
              type="range"
              min={-6}
              max={6}
              step={0.5}
              value={localDsp.midGain}
              onChange={(e) => setLocalDsp({ ...localDsp, midGain: Number(e.target.value) })}
              onPointerUp={commitDsp}
              className="w-full accent-cyan-400 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>High Air Shelf (12kHz):</span>
              <span className="text-cyan-300 font-bold">{localDsp.highGain > 0 ? `+${localDsp.highGain}` : localDsp.highGain} dB</span>
            </div>
            <input
              type="range"
              min={-6}
              max={6}
              step={0.5}
              value={localDsp.highGain}
              onChange={(e) => setLocalDsp({ ...localDsp, highGain: Number(e.target.value) })}
              onPointerUp={commitDsp}
              className="w-full accent-cyan-400 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Module 3: Optical Vocal Compressor */}
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1 text-[10px]">
            <span className="font-bold text-purple-300">3. OPTO COMPRESSOR</span>
            <span className="text-slate-500">LEVEL CONTROL</span>
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>Threshold:</span>
              <span className="text-purple-300 font-bold">{localDsp.compressorThreshold} dB</span>
            </div>
            <input
              type="range"
              min={-40}
              max={0}
              value={localDsp.compressorThreshold}
              onChange={(e) => setLocalDsp({ ...localDsp, compressorThreshold: Number(e.target.value) })}
              onPointerUp={commitDsp}
              className="w-full accent-purple-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>Ratio:</span>
              <span className="text-purple-300 font-bold">{localDsp.compressorRatio}:1</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={0.5}
              value={localDsp.compressorRatio}
              onChange={(e) => setLocalDsp({ ...localDsp, compressorRatio: Number(e.target.value) })}
              onPointerUp={commitDsp}
              className="w-full accent-purple-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Module 4: Spatial Sends (Reverb & Delay) */}
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1 text-[10px]">
            <span className="font-bold text-amber-300">4. SPATIAL SENDS</span>
            <span className="text-slate-500">AUX BUSSES</span>
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>Plate Reverb Send:</span>
              <span className="text-amber-300 font-bold">{Math.round(localDsp.reverbSend * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={localDsp.reverbSend}
              onChange={(e) => setLocalDsp({ ...localDsp, reverbSend: Number(e.target.value) })}
              onPointerUp={commitDsp}
              className="w-full accent-amber-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>Stereo Delay Send (1/8d):</span>
              <span className="text-amber-300 font-bold">{Math.round(localDsp.delaySend * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={localDsp.delaySend}
              onChange={(e) => setLocalDsp({ ...localDsp, delaySend: Number(e.target.value) })}
              onPointerUp={commitDsp}
              className="w-full accent-amber-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
