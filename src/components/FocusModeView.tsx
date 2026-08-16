import React from 'react';
import { useStudioSession } from '../app/StudioSessionContext';
import { X, Sparkles, Sliders, Volume2, Music, Wand2, ArrowLeft, RefreshCw, Trash2 } from 'lucide-react';
import { audioEngine } from '../audio/audioEngine';

export const FocusModeView: React.FC = () => {
  const {
    focusTrackId,
    exitFocusMode,
    tracks,
    dawState,
    handleToggleStep,
    handleChangeStepNote,
    handleChangeVolume,
    handleChangePitch,
    handleDeleteTrack,
    handleClearTrack,
    handleNudgeTrackPattern,
  } = useStudioSession();

  const track = tracks.find((t) => t.id === focusTrackId);

  if (!track) {
    return (
      <div className="w-full p-8 text-center bg-slate-900 rounded-2xl border border-slate-800">
        <p className="text-sm text-slate-400">Track not found.</p>
        <button
          onClick={exitFocusMode}
          className="mt-4 px-4 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs"
        >
          Return to Studio Workspace
        </button>
      </div>
    );
  }

  const PITCH_OPTIONS = [
    'C1', 'D1', 'E1', 'F1', 'G1', 'A1', 'B1',
    'C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2',
    'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4',
  ];

  return (
    <div className="w-full space-y-6 pb-8">
      {/* Focus Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={exitFocusMode}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                FOCUS MODE ACTIVE
              </span>
              <h2 className="text-base font-bold text-slate-100">{track.name}</h2>
            </div>
            <p className="text-xs text-slate-400">
              Single-track isolation mode. Edits immediately sync to live StudioSession.
            </p>
          </div>
        </div>

        <button
          onClick={exitFocusMode}
          className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 text-xs font-bold shadow-lg shadow-amber-500/20 cursor-pointer transition-all flex items-center space-x-1.5"
        >
          <X className="w-4 h-4" />
          <span>Exit Focus Mode</span>
        </button>
      </div>

      {/* Main Single Track Focus Card */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
        {/* Track Controls Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: track.color || '#3b82f6' }} />
            <span className="text-sm font-bold text-slate-200">{track.instrument.toUpperCase()} LANE</span>
          </div>

          <div className="flex items-center space-x-4">
            {/* Pitch Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-mono">Base Pitch:</span>
              <select
                value={track.pitch || 'C3'}
                onChange={(e) => handleChangePitch(track.id, e.target.value)}
                className="bg-slate-950 border border-slate-800 text-amber-400 font-mono text-xs rounded-lg px-2.5 py-1"
              >
                {PITCH_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Volume Fader */}
            <div className="flex items-center space-x-2 w-48">
              <Volume2 className="w-4 h-4 text-slate-400" />
              <input
                type="range"
                min="-20"
                max="6"
                step="0.5"
                value={track.volume}
                onChange={(e) => handleChangeVolume(track.id, parseFloat(e.target.value))}
                className="w-full accent-amber-400 bg-slate-800 rounded-lg cursor-pointer h-2"
              />
              <span className="text-xs font-mono text-amber-400 w-10">{track.volume}dB</span>
            </div>
          </div>
        </div>

        {/* 64-Step Grid Matrix for this Track */}
        <div>
          <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
            <span>64-Step Sequence Matrix (Step {dawState.currentStep + 1} / 64)</span>
            <div className="flex space-x-2">
              <button
                onClick={() => handleNudgeTrackPattern(track.id, 'left')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Nudge Left
              </button>
              <button
                onClick={() => handleNudgeTrackPattern(track.id, 'right')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Nudge Right
              </button>
              <button
                onClick={() => handleClearTrack(track.id)}
                className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs font-semibold"
              >
                Clear Steps
              </button>
            </div>
          </div>

          <div className="grid grid-cols-16 gap-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800">
            {track.steps.map((active, stepIdx) => {
              const isCurrent = dawState.currentStep === stepIdx;
              const isBarDivider = stepIdx % 16 === 0;
              return (
                <button
                  key={stepIdx}
                  onClick={() => handleToggleStep(track.id, stepIdx)}
                  className={`h-12 rounded-lg border text-[10px] font-mono flex flex-col items-center justify-center transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-amber-400 border-white text-slate-950 ring-2 ring-amber-300 scale-105 font-bold z-10'
                      : active
                      ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/30'
                      : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
                  } ${isBarDivider && !isCurrent && !active ? 'border-l-2 border-l-slate-700' : ''}`}
                >
                  <span>{stepIdx + 1}</span>
                  {active && track.notes?.[stepIdx] && (
                    <span className="text-[8px] font-mono opacity-80">{track.notes[stepIdx]}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* DSP Rack & AI Realization */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Dedicated Track DSP Strip</span>
            </h4>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Filter Cutoff:</span>
                <span className="font-mono text-cyan-400">{track.dspSettings?.filterFreq || 12000} Hz</span>
              </div>
              <div className="flex justify-between">
                <span>Compressor Ratio:</span>
                <span className="font-mono text-cyan-400">{track.dspSettings?.compressorRatio || 4}:1</span>
              </div>
              <div className="flex justify-between">
                <span>Reverb Send:</span>
                <span className="font-mono text-emerald-400">{Math.round((track.dspSettings?.reverbSend || 0) * 100)}%</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
              <Wand2 className="w-4 h-4 text-purple-400" />
              <span>Focus Mode Co-Producer AI Suggestions</span>
            </h4>
            <p className="text-xs text-slate-400">
              "Add sub-bass harmonics", "Apply 16th-note swing to this lane", or "Generate matching hi-hat counter-rhythm".
            </p>
            <button className="w-full py-2 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 text-xs font-bold cursor-pointer">
              Generate AI Realization Variation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
