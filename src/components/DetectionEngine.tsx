import React from 'react';
import { Mic, Zap, Shield, Sparkles, Volume2, Activity } from 'lucide-react';
import { DetectionSettings } from '../types/daw';

interface DetectionEngineProps {
  settings: DetectionSettings;
  onUpdateSettings: (updates: Partial<DetectionSettings>) => void;
  onToggleMic: () => void;
  isKickTriggered: boolean;
  isSnareTriggered: boolean;
}

export const DetectionEngine: React.FC<DetectionEngineProps> = ({
  settings,
  onUpdateSettings,
  onToggleMic,
  isKickTriggered,
  isSnareTriggered,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur select-none">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-100 flex items-center gap-2">
              VOCAL DETECTION ENGINE
              {settings.micConnected && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-ping"></span>
                  MIC READY
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Vochlea-inspired frequency triggers: Thumps → Kick, Claps/Taps → Snare
            </p>
          </div>
        </div>

        {/* Auto Record to Grid Toggle */}
        <div className="flex items-center gap-3 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 shadow-inner">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-200">
            <input
              type="checkbox"
              checked={settings.autoRecordToGrid}
              onChange={(e) => onUpdateSettings({ autoRecordToGrid: e.target.checked })}
              className="w-4 h-4 rounded accent-rose-500 cursor-pointer"
            />
            <span className={settings.autoRecordToGrid ? 'text-rose-400 font-extrabold flex items-center gap-1.5' : 'text-slate-400 font-semibold'}>
              {settings.autoRecordToGrid && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />}
              <span>{settings.autoRecordToGrid ? 'RECORD ON: THUMP AUTO-FILLS GRID' : 'AUTO-RECORD TO GRID OFF'}</span>
            </span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Low Frequency / Kick Calibration Meter */}
        <div
          className={`p-3.5 rounded-xl border transition-all ${
            isKickTriggered
              ? 'bg-amber-950/40 border-amber-500/60 shadow-lg shadow-amber-500/20'
              : 'bg-slate-950/60 border-slate-800/80'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shadow-sm shadow-amber-500" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                LOW FREQ (KICK THUMP)
              </span>
            </div>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                isKickTriggered
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow animate-pulse'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              {isKickTriggered ? '⚡ KICK DETECTED!' : 'IDLE'}
            </span>
          </div>

          {/* Real-time Level Meter & Threshold Line */}
          <div className="relative w-full h-5 bg-slate-900 rounded-lg overflow-hidden border border-slate-800 mb-2">
            {/* Meter Fill */}
            <div
              className="h-full bg-gradient-to-r from-amber-600 to-orange-400 transition-all duration-75"
              style={{ width: `${Math.min(100, settings.currentLowLevel * 100)}%` }}
            />
            {/* Threshold Indicator Line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-rose-400 z-10 shadow-sm"
              style={{ left: `${settings.kickThreshold * 100}%` }}
              title={`Threshold: Math.round(settings.kickThreshold * 100)%`}
            />
          </div>

          {/* Threshold Slider */}
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-slate-400 font-medium">Sensitivity Threshold:</span>
            <input
              type="range"
              min={0.05}
              max={0.85}
              step={0.01}
              value={settings.kickThreshold}
              onChange={(e) => onUpdateSettings({ kickThreshold: Number(e.target.value) })}
              className="flex-1 accent-amber-500 cursor-pointer"
            />
            <span className="font-mono text-amber-400 font-bold w-10 text-right">
              {Math.round(settings.kickThreshold * 100)}%
            </span>
          </div>
        </div>

        {/* High Frequency / Snare Calibration Meter */}
        <div
          className={`p-3.5 rounded-xl border transition-all ${
            isSnareTriggered
              ? 'bg-cyan-950/40 border-cyan-500/60 shadow-lg shadow-cyan-500/20'
              : 'bg-slate-950/60 border-slate-800/80'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block shadow-sm shadow-cyan-400" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                HIGH FREQ (SNARE / CLAP)
              </span>
            </div>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                isSnareTriggered
                  ? 'bg-cyan-400 text-slate-950 border-cyan-300 shadow animate-pulse'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              {isSnareTriggered ? '⚡ SNARE DETECTED!' : 'IDLE'}
            </span>
          </div>

          {/* Real-time Level Meter & Threshold Line */}
          <div className="relative w-full h-5 bg-slate-900 rounded-lg overflow-hidden border border-slate-800 mb-2">
            {/* Meter Fill */}
            <div
              className="h-full bg-gradient-to-r from-cyan-600 to-sky-400 transition-all duration-75"
              style={{ width: `${Math.min(100, settings.currentHighLevel * 100)}%` }}
            />
            {/* Threshold Indicator Line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-rose-400 z-10 shadow-sm"
              style={{ left: `${settings.snareThreshold * 100}%` }}
              title={`Threshold: ${Math.round(settings.snareThreshold * 100)}%`}
            />
          </div>

          {/* Threshold Slider */}
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-slate-400 font-medium">Sensitivity Threshold:</span>
            <input
              type="range"
              min={0.05}
              max={0.85}
              step={0.01}
              value={settings.snareThreshold}
              onChange={(e) => onUpdateSettings({ snareThreshold: Number(e.target.value) })}
              className="flex-1 accent-cyan-400 cursor-pointer"
            />
            <span className="font-mono text-cyan-400 font-bold w-10 text-right">
              {Math.round(settings.snareThreshold * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Preset Calibration Buttons */}
      <div className="mt-3 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-medium">Mic Calibration Presets:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => onUpdateSettings({ kickThreshold: 0.35, snareThreshold: 0.3, gain: 1.8 })}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] transition"
          >
            Beatbox Sensitive
          </button>
          <button
            onClick={() => onUpdateSettings({ kickThreshold: 0.55, snareThreshold: 0.5, gain: 1.2 })}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] transition"
          >
            Loud Speaker Safe
          </button>
          <button
            onClick={() => onUpdateSettings({ kickThreshold: 0.25, snareThreshold: 0.2, gain: 2.5 })}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] transition"
          >
            Whisper Taps
          </button>
        </div>
      </div>
    </div>
  );
};
