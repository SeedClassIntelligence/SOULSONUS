import React from 'react';
import { Track, ArrangementSection } from '../types/daw';
import { Play, Mic, Volume2, Music, Layers, ChevronRight, Activity } from 'lucide-react';

interface TimelinePrimitiveProps {
  tracks: Track[];
  sections: ArrangementSection[];
  currentStep: number;
  bpm: number;
  activeBarView: string;
  selectedTrackId: string | null;
  onSelectTrack: (trackId: string) => void;
  onSelectSection?: (sectionId: string) => void;
}

export const TimelinePrimitive: React.FC<TimelinePrimitiveProps> = ({
  tracks,
  sections,
  currentStep,
  bpm,
  activeBarView,
  selectedTrackId,
  onSelectTrack,
  onSelectSection,
}) => {
  const bars = Array.from({ length: 16 }, (_, i) => i + 1);

  return (
    <div className="w-full bg-slate-950 border border-slate-800/90 rounded-2xl p-4 shadow-2xl space-y-3 select-none">
      {/* Header Bar Rulers & Arrangement Sections */}
      <div className="flex items-center space-x-3 pb-2 border-b border-slate-800/80">
        <div className="w-48 flex items-center justify-between text-xs font-bold text-slate-400 font-mono">
          <span className="flex items-center space-x-1">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>ARRANGEMENT</span>
          </span>
          <span className="text-[10px] text-slate-500 font-normal">16 BARS</span>
        </div>

        {/* Arrangement Sections Track */}
        <div className="flex-1 flex items-center gap-1">
          {sections.map((sec) => (
            <button
              key={sec.id}
              onClick={() => onSelectSection?.(sec.id)}
              className="flex-1 py-1 px-2 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-left transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="font-bold text-amber-400">{sec.name}</span>
                <span className="text-slate-500">{sec.bars}b</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Bar Number Scale */}
      <div className="flex items-center space-x-3 text-[10px] font-mono text-slate-500">
        <div className="w-48 text-right pr-2">BAR INDEX</div>
        <div className="flex-1 grid grid-cols-16 gap-1 text-center">
          {bars.map((bar) => {
            const isCurrentBar = Math.floor(currentStep / 4) + 1 === bar;
            return (
              <span
                key={bar}
                className={`py-0.5 rounded ${
                  isCurrentBar ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40' : ''
                }`}
              >
                {bar}
              </span>
            );
          })}
        </div>
      </div>

      {/* Multi-Track Intelligence Lanes Rows */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {tracks.map((track) => {
          const isSelected = track.id === selectedTrackId;
          // track.steps is boolean[]; this read `.active` off each boolean, so every
          // step drew as inactive whatever the pattern held.
          const activeSteps = track.steps.filter(Boolean).length;

          return (
            <div
              key={track.id}
              onClick={() => onSelectTrack(track.id)}
              className={`flex items-center space-x-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 border-amber-500/50 shadow-md shadow-amber-500/5'
                  : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              {/* Track Header Details */}
              <div className="w-48 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div
                    className="w-3 h-3 rounded-full border border-slate-700"
                    style={{ backgroundColor: track.color || '#f59e0b' }}
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-200">{track.name}</div>
                    <div className="text-[10px] font-mono text-slate-500">
                      {(track.instrument || 'instrument').toUpperCase()} • {activeSteps}/16 hits
                    </div>

                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </div>

              {/* Step Grid Pattern & Waveform Display Layer */}
              <div className="flex-1 grid grid-cols-16 gap-1 relative">
                {track.steps.map((step, idx) => {
                  const isCurrent = currentStep === idx;
                  return (
                    <div
                      key={idx}
                      className={`h-8 rounded flex items-center justify-center transition-all ${
                        step
                          ? isCurrent
                            ? 'bg-amber-400 text-slate-950 font-bold scale-105 shadow-md shadow-amber-400/40'
                            : 'bg-amber-500/80 text-slate-950 font-semibold'
                          : isCurrent
                          ? 'bg-slate-800 border border-amber-500/40'
                          : 'bg-slate-900/60 border border-slate-800/60'
                      }`}
                    >
                      {step && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
