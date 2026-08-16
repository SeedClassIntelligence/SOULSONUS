import React, { useState } from 'react';
import {
  Play,
  Pause,
  Square,
  Mic,
  Volume2,
  RotateCcw,
  Repeat,
  Radio,
  Clock,
} from 'lucide-react';
import { DAWState } from '../types/daw';

interface MasterTransportBarProps {
  dawState: DAWState;
  onStateChange: (updates: Partial<DAWState>) => void;
  onTogglePlay: () => void;
  onStop: () => void;
  onToggleMic: () => void;
  isMicActive: boolean;
}

export const MasterTransportBar: React.FC<MasterTransportBarProps> = ({
  dawState,
  onStateChange,
  onTogglePlay,
  onStop,
  onToggleMic,
  isMicActive,
}) => {
  // Compute Bar:Beat.Tick time counter (e.g. 1:01.04)
  const bar = Math.floor(dawState.currentStep / 16) + 1;
  const beat = Math.floor((dawState.currentStep % 16) / 4) + 1;
  const tick = (dawState.currentStep % 4) + 1;
  const timeFormatted = `${bar}:${beat < 10 ? `0${beat}` : beat}.${tick}`;

  return (
    <div className="w-full flex items-center justify-center select-none font-mono text-xs py-1.5 px-4 bg-slate-950 border-b border-slate-850 shadow-md sticky top-[53px] z-20">
      <div className="flex items-center space-x-3 bg-slate-900/90 px-4 py-1.5 rounded-2xl border border-slate-800 shadow-xl">
        {/* 1. Transport Buttons (Rewind, Play, Stop, Record, Loop) */}
        <div className="flex items-center space-x-2">
          {/* Rewind */}
          <button
            onClick={onStop}
            className="w-8 h-8 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Rewind to Start"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Play / Pause */}
          <button
            id="btn-play-pause"
            onClick={onTogglePlay}
            className={`w-10 h-8 rounded-xl font-black flex items-center justify-center transition cursor-pointer ${
              dawState.isPlaying
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 scale-105'
                : 'bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white'
            }`}
            title={dawState.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {dawState.isPlaying ? (
              <Pause className="w-4 h-4 fill-slate-950" />
            ) : (
              <Play className="w-4 h-4 fill-slate-100 ml-0.5" />
            )}
          </button>

          {/* Stop */}
          <button
            id="btn-stop"
            onClick={onStop}
            className="w-8 h-8 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Stop Transport"
          >
            <Square className="w-3.5 h-3.5" />
          </button>

          {/* Master Record Arm */}
          <button
            onClick={onToggleMic}
            className={`px-3 h-8 rounded-xl font-black flex items-center space-x-1.5 transition border cursor-pointer ${
              isMicActive
                ? 'bg-rose-600 text-white border-rose-500 shadow-sm shadow-rose-600/40 animate-pulse'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-rose-400'
            }`}
            title="Toggle Master Recording"
          >
            <div className={`w-2 h-2 rounded-full ${isMicActive ? 'bg-white' : 'bg-rose-500'}`} />
            <span className="text-[11px]">● REC</span>
          </button>

          {/* Loop Mode */}
          <button
            onClick={() => onStateChange({ isLooping: !dawState.isLooping })}
            className={`px-3 h-8 rounded-xl border flex items-center space-x-1 cursor-pointer text-[11px] font-bold ${
              dawState.isLooping
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-sm'
                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
            title="Toggle Continuous Loop"
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>LOOP</span>
          </button>
        </div>

        <div className="h-5 w-px bg-slate-800" />

        {/* 2. Precision Bar:Beat.Tick Counter */}
        <div className="bg-slate-950 px-3.5 h-8 rounded-xl border border-slate-800 flex items-center text-amber-300 font-bold tracking-widest text-xs">
          <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
          <span>{timeFormatted}</span>
        </div>

        <div className="h-5 w-px bg-slate-800" />

        {/* 3. Tempo & Metronome */}
        <div className="flex items-center space-x-2">
          {/* BPM */}
          <div className="flex items-center space-x-1.5 bg-slate-950 px-3 h-8 rounded-xl border border-slate-800">
            <span className="text-slate-500 font-bold text-[10px]">BPM:</span>
            <input
              type="number"
              min={40}
              max={240}
              value={dawState.bpm}
              onChange={(e) => onStateChange({ bpm: Number(e.target.value) })}
              className="w-9 bg-transparent text-slate-100 font-black focus:outline-none text-center text-xs"
            />
          </div>

          {/* Metronome */}
          <button
            onClick={() => onStateChange({ metronomeOn: !dawState.metronomeOn })}
            className={`px-2.5 h-8 rounded-xl border text-[11px] font-bold cursor-pointer transition ${
              dawState.metronomeOn
                ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
            title="Toggle Metronome Audio Guide"
          >
            METRO
          </button>
        </div>

        <div className="h-5 w-px bg-slate-800" />

        {/* 4. Master Output Volume */}
        <div className="flex items-center space-x-2 bg-slate-950 px-3 h-8 rounded-xl border border-slate-800 text-[11px]">
          <Volume2 className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={dawState.masterVolume}
            onChange={(e) => onStateChange({ masterVolume: Number(e.target.value) })}
            className="w-16 accent-amber-500"
            title={`Master Volume: ${Math.round(dawState.masterVolume * 100)}%`}
          />
          <span className="text-[10px] text-slate-400 w-7 text-right">
            {Math.round(dawState.masterVolume * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};
