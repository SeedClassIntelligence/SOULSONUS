import React, { useState } from 'react';
import {
  Scissors,
  ChevronsLeft,
  ChevronsRight,
  Maximize2,
  Repeat,
  TrendingUp,
  TrendingDown,
  Volume2,
  VolumeX,
  Volume1,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  Zap,
  Sliders,
  Sparkles,
  Layers,
} from 'lucide-react';
import { useStudioSession } from '../../app/StudioSessionContext';
import { ClipOperationType, Track } from '../../types/daw';

export const CompactArrangerTimeline: React.FC = () => {
  const {
    tracks,
    sections,
    dawState,
    focusedTrackId,
    handleSetFocusedTrackId,
    handleExecuteClipOperation,
    handleToggleMixSolo,
    handleToggleMixMute,
    monitoringMode,
  } = useStudioSession();

  const [activeClipTool, setActiveClipTool] = useState<ClipOperationType | 'select'>('select');
  const [showAutomationLanes, setShowAutomationLanes] = useState(false);
  const [selectedBar, setSelectedBar] = useState<number | null>(null);

  const handleToolClick = (op: ClipOperationType, params?: any) => {
    setActiveClipTool(op);
    const targetId = focusedTrackId || tracks[0]?.id;
    if (targetId) {
      handleExecuteClipOperation(targetId, op, params);
    }
  };

  return (
    <div className="w-full bg-slate-950 border-b border-slate-800 flex flex-col font-mono select-none">
      {/* 1. TIMELINE TOP TOOLBAR: Clip Operations & Automation */}
      <div className="px-4 py-1.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-1.5 overflow-x-auto custom-scrollbar py-0.5">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mr-1">
            CLIP EDIT:
          </span>
          <button
            onClick={() => handleToolClick('split')}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold flex items-center space-x-1 transition cursor-pointer"
            title="Split/Splice region at current playhead"
          >
            <Scissors className="w-3 h-3 text-cyan-400" />
            <span>SPLICE</span>
          </button>
          <button
            onClick={() => handleToolClick('trim_start')}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold flex items-center space-x-1 transition cursor-pointer"
            title="Trim Start Boundary"
          >
            <ChevronsLeft className="w-3 h-3 text-amber-400" />
            <span>TRIM IN</span>
          </button>
          <button
            onClick={() => handleToolClick('trim_end')}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold flex items-center space-x-1 transition cursor-pointer"
            title="Trim End Boundary"
          >
            <ChevronsRight className="w-3 h-3 text-amber-400" />
            <span>TRIM OUT</span>
          </button>
          <button
            onClick={() => handleToolClick('stretch')}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold flex items-center space-x-1 transition cursor-pointer"
            title="Time Stretch Transient Warp"
          >
            <Maximize2 className="w-3 h-3 text-purple-400" />
            <span>STRETCH</span>
          </button>
          <button
            onClick={() => handleToolClick('loop')}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold flex items-center space-x-1 transition cursor-pointer"
            title="Duplicate & Loop Region"
          >
            <Repeat className="w-3 h-3 text-emerald-400" />
            <span>LOOP</span>
          </button>
          <button
            onClick={() => handleToolClick('fade_in')}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold flex items-center space-x-1 transition cursor-pointer"
            title="Linear / Exponential Fade In"
          >
            <TrendingUp className="w-3 h-3 text-pink-400" />
            <span>FADE IN</span>
          </button>
          <button
            onClick={() => handleToolClick('fade_out')}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold flex items-center space-x-1 transition cursor-pointer"
            title="Linear / Exponential Fade Out"
          >
            <TrendingDown className="w-3 h-3 text-pink-400" />
            <span>FADE OUT</span>
          </button>
          <button
            onClick={() => handleToolClick('gain', { gainDelta: 1.5 })}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold flex items-center space-x-1 transition cursor-pointer"
            title="Clip Gain Boost (+1.5dB)"
          >
            <Volume2 className="w-3 h-3 text-emerald-400" />
            <span>+1.5dB</span>
          </button>
          <button
            onClick={() => handleToolClick('gain', { gainDelta: -1.5 })}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold flex items-center space-x-1 transition cursor-pointer"
            title="Clip Gain Trim (-1.5dB)"
          >
            <Volume1 className="w-3 h-3 text-amber-400" />
            <span>-1.5dB</span>
          </button>
          <button
            onClick={() => handleToolClick('reverse')}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold flex items-center space-x-1 transition cursor-pointer"
            title="Reverse Audio Clip Buffer"
          >
            <RotateCcw className="w-3 h-3 text-cyan-400" />
            <span>REVERSE</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAutomationLanes(!showAutomationLanes)}
            className={`px-2.5 py-1 rounded text-[10px] font-black flex items-center space-x-1 transition cursor-pointer border ${
              showAutomationLanes
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Toggle Visual Automation Lanes (Volume, Pan, Filter Curves)"
          >
            <Sliders className="w-3 h-3" />
            <span>AUTOMATION LANES</span>
          </button>
        </div>
      </div>

      {/* 2. SECTION RULER & BAR GRID */}
      <div className="px-4 py-1 bg-slate-950 flex items-center border-b border-slate-900 text-[10px]">
        <div className="w-36 shrink-0 text-slate-500 font-bold">SONG SECTIONS:</div>
        <div className="flex-1 grid grid-cols-4 gap-1">
          {sections.map((sec, idx) => (
            <div
              key={sec.id}
              className="px-2 py-0.5 rounded text-center font-bold truncate border flex items-center justify-between"
              style={{
                backgroundColor: `${sec.color}15`,
                borderColor: `${sec.color}40`,
                color: sec.color,
              }}
            >
              <span>{sec.name}</span>
              <span className="text-[8px] opacity-70">Bars {sec.bars[0]}–{sec.bars[sec.bars.length - 1]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. MULTITRACK COMPACT TIMELINE LANES */}
      <div className="px-4 py-1.5 space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
        {tracks.map((track) => {
          const isFocused = focusedTrackId === track.id;
          const isSoloed = monitoringMode.soloTrackIds.includes(track.id) || track.solo;
          const isMuted = monitoringMode.muteTrackIds.includes(track.id) || track.mute;

          return (
            <div
              key={track.id}
              onClick={() => handleSetFocusedTrackId(track.id)}
              className={`flex items-center p-1 rounded-lg border transition cursor-pointer group ${
                isFocused
                  ? 'bg-slate-900 border-cyan-400/80 shadow-sm shadow-cyan-500/20'
                  : 'bg-slate-950/60 hover:bg-slate-900/40 border-slate-850 hover:border-slate-700'
              }`}
            >
              {/* Track Name & Badges */}
              <div className="w-36 shrink-0 flex items-center justify-between pr-2">
                <div className="flex items-center space-x-1.5 truncate">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: track.color || '#f59e0b' }}
                  />
                  <span className={`text-[11px] font-bold truncate ${isFocused ? 'text-cyan-300 font-black' : 'text-slate-200'}`}>
                    {track.name}
                  </span>
                </div>
                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleMixSolo(track.id);
                    }}
                    className={`px-1 py-0.2 rounded text-[8px] font-bold ${
                      isSoloed ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    S
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleMixMute(track.id);
                    }}
                    className={`px-1 py-0.2 rounded text-[8px] font-bold ${
                      isMuted ? 'bg-rose-500 text-white font-black' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    M
                  </button>
                </div>
              </div>

              {/* 64-Step Mini Waveform & MIDI Representation */}
              <div className="flex-1 h-5 bg-slate-950 rounded border border-slate-900 relative overflow-hidden flex items-center">
                {/* Step blocks */}
                <div className="absolute inset-0 grid grid-cols-64 gap-px opacity-90">
                  {track.steps.map((isActive, sIdx) => {
                    const isPlayheadStep = dawState.isPlaying && dawState.currentStep === sIdx;
                    return (
                      <div
                        key={sIdx}
                        className={`h-full transition-all ${
                          isPlayheadStep
                            ? 'bg-amber-400 animate-pulse'
                            : isActive
                            ? 'bg-cyan-500/80'
                            : (sIdx % 16 === 0 ? 'bg-slate-900/60' : 'bg-transparent')
                        }`}
                        style={{
                          backgroundColor: isActive ? track.color : undefined,
                        }}
                      />
                    );
                  })}
                </div>

                {/* Automation Overlay Line */}
                {showAutomationLanes && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-80" preserveAspectRatio="none">
                    <polyline
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="1.5"
                      strokeDasharray="2,2"
                      points="0,15 100,10 200,8 300,14 400,6 500,10 600,15"
                    />
                  </svg>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
