import React, { useState } from 'react';
import { Track } from '../types/daw';
import { Mic, Disc, Drum, Music, Sparkles, Volume2, Wand2, Play, Square, ShieldCheck, ChevronRight, Activity, Sliders, CheckCircle2 } from 'lucide-react';

interface IntelligenceLaneStripProps {
  track: Track;
  isSelected: boolean;
  isArmed: boolean;
  isPlaying: boolean;
  currentStep: number;
  onSelect: () => void;
  onToggleArm: () => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onChangeVolume: (vol: number) => void;
  onAuditionProposal: () => void;
}

export const IntelligenceLaneStrip: React.FC<IntelligenceLaneStripProps> = ({
  track,
  isSelected,
  isArmed,
  isPlaying,
  currentStep,
  onSelect,
  onToggleArm,
  onToggleMute,
  onToggleSolo,
  onChangeVolume,
  onAuditionProposal,
}) => {
  // Generate waveform bars for visual monitor
  const waveformBars = Array.from({ length: 48 }, (_, i) => {
    const stepIdx = Math.floor((i / 48) * 16);
    const hasHit = track.steps[stepIdx];
    const baseHeight = hasHit ? 28 + Math.sin(i * 0.8) * 16 : 6 + Math.sin(i * 0.3) * 4;
    return {
      height: baseHeight,
      hasHit,
      isCurrent: isPlaying && Math.floor(currentStep / 4) === Math.floor(stepIdx / 4),
    };
  });

  const getInstrumentBadge = (inst: string) => {
    switch (inst) {
      case 'kick':
        return { label: 'KICK / SUB', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
      case 'snare':
        return { label: 'SNARE / CLAP', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' };
      case 'hihat':
        return { label: 'HI-HAT', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
      case 'bass':
        return { label: 'BASS / 808', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
      case 'melody':
        return { label: 'LEAD / MELODY', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' };
      case 'vocal_synth':
        return { label: 'VOCAL LEAD', color: 'text-pink-400 bg-pink-500/10 border-pink-500/30' };
      default:
        return { label: inst.toUpperCase(), color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
    }
  };

  const badge = getInstrumentBadge(track.instrument);

  return (
    <div
      onClick={onSelect}
      className={`rounded-2xl border transition-all duration-200 cursor-pointer select-none overflow-hidden ${
        isSelected
          ? 'bg-slate-900/95 border-amber-500/60 shadow-xl shadow-amber-500/10 ring-1 ring-amber-500/30'
          : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/50'
      }`}
    >
      {/* Top Channel Bar */}
      <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-3">
          <div
            className="w-3.5 h-3.5 rounded-full border border-slate-700 shadow-sm"
            style={{ backgroundColor: track.color || '#f59e0b' }}
          />
          <div className="flex items-center space-x-2">
            <span className="text-xs font-black tracking-wide text-slate-100 uppercase">{track.name}</span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${badge.color}`}>
              {badge.label}
            </span>
          </div>
        </div>

        {/* Source & Intent Telemetry */}
        <div className="flex items-center space-x-3 text-[11px] font-mono">
          <span className="text-slate-400 hidden sm:inline">
            Source: <span className="text-slate-200 font-semibold">Mic Capture</span>
          </span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="text-slate-400 hidden md:inline">
            Intent: <span className="text-emerald-400 font-semibold">Preserved 99.2%</span>
          </span>
          <span className="text-slate-600 hidden md:inline">•</span>
          <span className="text-slate-400">
            Realization: <span className="text-amber-300 font-semibold">{track.pitch ? `${track.pitch} (${track.instrument})` : 'TR-808 Realized'}</span>
          </span>
        </div>
      </div>

      {/* Main Recording Surface & Waveform Monitor */}
      <div className="p-3.5 flex flex-col md:flex-row items-center gap-4">
        {/* Left Console Strip Controls */}
        <div className="flex items-center space-x-2 w-full md:w-auto justify-between md:justify-start">
          {/* Record Arm Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleArm();
            }}
            className={`px-3 py-1.5 rounded-xl font-mono text-xs font-black flex items-center space-x-1.5 transition-all border shadow-sm ${
              isArmed
                ? 'bg-rose-600 text-white border-rose-500 shadow-rose-600/30 animate-pulse'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-rose-400 hover:border-rose-900'
            }`}
            title="Arm Intelligence Lane for Microphone Recording"
          >
            <div className={`w-2.5 h-2.5 rounded-full ${isArmed ? 'bg-white animate-ping' : 'bg-rose-500'}`} />
            <span>ARM</span>
          </button>

          {/* Mute Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            className={`w-8 h-8 rounded-xl font-mono text-xs font-bold transition-all border ${
              track.mute
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Mute Lane"
          >
            M
          </button>

          {/* Solo Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSolo();
            }}
            className={`w-8 h-8 rounded-xl font-mono text-xs font-bold transition-all border ${
              track.solo
                ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-black'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Solo Lane"
          >
            S
          </button>

          {/* Gain / Vol Slider */}
          <div className="flex items-center space-x-1.5 bg-slate-900/90 px-2.5 py-1 rounded-xl border border-slate-800">
            <Volume2 className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="range"
              min={-20}
              max={6}
              value={track.volume}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onChangeVolume(Number(e.target.value))}
              className="w-16 sm:w-20 accent-amber-500 cursor-pointer"
            />
            <span className="text-[10px] font-mono text-slate-300 font-bold w-9 text-right">
              {track.volume > 0 ? `+${track.volume}` : track.volume}dB
            </span>
          </div>
        </div>

        {/* Center: OLED Waveform Take Monitor */}
        <div className="flex-1 w-full bg-slate-950 rounded-xl border border-slate-800/90 p-2.5 relative flex items-center justify-between overflow-hidden shadow-inner min-h-[56px]">
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

          {/* Live Waveform Bars */}
          <div className="w-full flex items-center justify-between space-x-0.5 relative z-10">
            {waveformBars.map((bar, idx) => (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center justify-center"
                style={{ height: '36px' }}
              >
                <div
                  className={`w-full rounded-full transition-all duration-75 ${
                    bar.hasHit
                      ? isArmed
                        ? 'bg-rose-400 shadow-sm shadow-rose-500/50'
                        : isSelected
                        ? 'bg-amber-400 shadow-sm shadow-amber-400/50'
                        : 'bg-emerald-400/90'
                      : 'bg-slate-800/50'
                  }`}
                  style={{ height: `${bar.height}px` }}
                />
              </div>
            ))}
          </div>

          {/* Onset Hit Transient Markers */}
          <div className="absolute bottom-1 left-3 right-3 flex justify-between pointer-events-none text-[9px] font-mono text-slate-600">
            <span>Bar 1.1</span>
            <span>Bar 1.2</span>
            <span>Bar 1.3</span>
            <span>Bar 1.4</span>
          </div>
        </div>

        {/* Right: Proposal Audition Action Trigger */}
        <div className="w-full md:w-auto flex items-center justify-end space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAuditionProposal();
            }}
            className="w-full md:w-auto px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center justify-center space-x-2 transition-all border border-amber-500/30 hover:border-amber-500/50 shadow-sm cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>AUDITION PROPOSAL</span>
            <ChevronRight className="w-3.5 h-3.5 text-amber-400/70" />
          </button>
        </div>
      </div>
    </div>
  );
};
