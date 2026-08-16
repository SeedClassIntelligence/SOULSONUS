import React from 'react';
import { Track, PitchCorrectionSettings, TimingCorrectionSettings } from '../../types/daw';
import { useStudioSession } from '../../app/StudioSessionContext';
import {
  Sparkles,
  Activity,
  Clock,
} from 'lucide-react';

interface VocalPitchTimingProps {
  track: Track | null;
}

export const VocalPitchTiming: React.FC<VocalPitchTimingProps> = ({ track }) => {
  const {
    tracks,
    handleUpdatePitchSettings,
    handleUpdateTimingSettings,
  } = useStudioSession();

  const currentTrack = track || tracks.find((t) => t.id === 't-vocal') || tracks[0];

  if (!currentTrack) return <div className='p-6 text-center text-neutral-500'>Select a vocal track for pitch & timing</div>;

  const vocalState = currentTrack.vocalState;

  const pitch: PitchCorrectionSettings = vocalState?.pitchSettings || {
    enabled: true,
    key: 'C',
    scale: 'minor',
    strength: 85,
    speed: 65,
    pitchDrift: 15,
    formantPreserve: true,
    formantShift: 0,
    bypass: false,
  };

  const timing: TimingCorrectionSettings = vocalState?.timingSettings || {
    enabled: true,
    quantizeStrength: 80,
    humanize: 20,
    phraseNudgeMs: 0,
    stretchRatio: 1.0,
  };

  const updatePitch = (updates: Partial<PitchCorrectionSettings>) => {
    handleUpdatePitchSettings(currentTrack.id, updates);
  };

  const updateTiming = (updates: Partial<TimingCorrectionSettings>) => {
    handleUpdateTimingSettings(currentTrack.id, updates);
  };

  return (
    <div className="bg-slate-950/95 border border-slate-800/90 rounded-2xl p-4 shadow-2xl space-y-4 select-none text-xs font-mono">
      {/* 1. Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2.5 gap-2">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-pink-400" />
          <span className="font-black text-slate-100 uppercase tracking-wide">
            PITCH CORRECTION & TIMING ALIGNMENT • {currentTrack.name.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => updatePitch({ bypass: !pitch.bypass })}
            className={`px-3 py-1 rounded-xl text-[10px] font-bold border transition cursor-pointer ${
              pitch.bypass
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            {pitch.bypass ? '⚡ BYPASS ACTIVE' : 'RUNNING DSP'}
          </button>
        </div>
      </div>

      {/* 2. Pitch & Scale Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pitch Correction Panel */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-slate-200 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              <span>VOCAL PITCH TUNER & SCALE LOCK</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 text-[10px] font-black">
              {pitch.key} {pitch.scale.toUpperCase()}
            </span>
          </div>

          {/* Key & Scale Selectors */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Root Key:</label>
              <select
                value={pitch.key}
                onChange={(e) => updatePitch({ key: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-slate-200 font-bold focus:border-pink-500 focus:outline-none"
              >
                {['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'].map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Scale / Mode:</label>
              <select
                value={pitch.scale}
                onChange={(e) => updatePitch({ scale: e.target.value as PitchCorrectionSettings['scale'] })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-slate-200 font-bold focus:border-pink-500 focus:outline-none"
              >
                <option value="minor">Natural Minor</option>
                <option value="major">Major</option>
                <option value="pentatonic">Minor Pentatonic</option>
                <option value="chromatic">Chromatic (All Notes)</option>
              </select>
            </div>
          </div>

          {/* Sliders: Strength & Speed */}
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                <span>Correction Strength:</span>
                <span className="text-pink-300 font-bold">{pitch.strength}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={pitch.strength}
                onChange={(e) => updatePitch({ strength: Number(e.target.value) })}
                className="w-full accent-pink-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                <span>Retune Speed (Snap vs Natural):</span>
                <span className="text-pink-300 font-bold">{pitch.speed}ms</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={pitch.speed}
                onChange={(e) => updatePitch({ speed: Number(e.target.value) })}
                className="w-full accent-pink-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Formant Preserving & Shift */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pitch.formantPreserve}
                  onChange={(e) => updatePitch({ formantPreserve: e.target.checked })}
                  className="accent-pink-500 rounded"
                />
                <span className="text-[10px] text-slate-300 font-bold">Preserve Formants (Anti-Chipmunk)</span>
              </label>

              <div className="flex items-center space-x-1">
                <span className="text-[10px] text-slate-400">Shift:</span>
                <span className="text-pink-300 font-bold">{pitch.formantShift > 0 ? '+' : ''}{pitch.formantShift} st</span>
              </div>
            </div>
            
            <input
              type="range"
              min={-12}
              max={12}
              value={pitch.formantShift}
              onChange={(e) => updatePitch({ formantShift: parseInt(e.target.value) })}
              className="w-full accent-pink-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Timing & Groove Alignment Panel */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-slate-200 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>TIMING QUANTIZATION & GROOVE NUDGE</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-black">
              1/16 GROOVE LOCK
            </span>
          </div>

          {/* Sliders: Quantize & Humanize */}
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                <span>Onset Quantize Strength:</span>
                <span className="text-cyan-300 font-bold">{timing.quantizeStrength}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={timing.quantizeStrength}
                onChange={(e) => updateTiming({ quantizeStrength: Number(e.target.value) })}
                className="w-full accent-cyan-400 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                <span>Humanize Micro-Timing:</span>
                <span className="text-cyan-300 font-bold">{timing.humanize}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={timing.humanize}
                onChange={(e) => updateTiming({ humanize: Number(e.target.value) })}
                className="w-full accent-cyan-400 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Phrase Nudge Controls */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Phrase Shift / Nudge:</span>
              <span className="text-cyan-300 font-mono font-bold">
                {timing.phraseNudgeMs > 0 ? `+${timing.phraseNudgeMs}` : timing.phraseNudgeMs} ms
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              {[-50, -10, 0, +10, +50].map((ms) => (
                <button
                  key={ms}
                  onClick={() => updateTiming({ phraseNudgeMs: ms === 0 ? 0 : timing.phraseNudgeMs + ms })}
                  className="flex-1 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-[10px] font-bold text-slate-300 hover:text-white transition cursor-pointer"
                >
                  {ms === 0 ? 'RESET' : ms > 0 ? `+${ms}ms` : `${ms}ms`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
