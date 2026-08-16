import React, { useState } from 'react';
import { Track, IntelligenceLaneTab, InstrumentType } from '../../types/daw';
import { Sliders, Sparkles, Wand2, RefreshCw, Layers, Music, Volume2, ShieldCheck, ArrowRightLeft } from 'lucide-react';
import { audioEngine } from '../../audio/audioEngine';

interface TrackInspectorProps {
  track: Track | null;
  onUpdateTrack?: (updated: Track) => void;
  onNudgePattern?: (trackId: string, direction: 'left' | 'right') => void;
  onCloneBar?: (sourceBarIndex?: number) => void;
  onClearTrack?: (trackId: string) => void;
  onFocusTrack?: (trackId: string) => void;
}

const TABS: { id: IntelligenceLaneTab; label: string; icon: React.ReactNode }[] = [
  { id: 'SOURCE', label: 'SOURCE', icon: <Volume2 className="w-3.5 h-3.5 text-amber-400" /> },
  { id: 'MIDI', label: 'MIDI', icon: <Music className="w-3.5 h-3.5 text-cyan-400" /> },
  { id: 'SOUND', label: 'SOUND', icon: <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> },
  { id: 'REALIZE', label: 'REALIZE', icon: <Wand2 className="w-3.5 h-3.5 text-purple-400" /> },
  { id: 'TRANSFORM', label: 'TRANSFORM', icon: <RefreshCw className="w-3.5 h-3.5 text-rose-400" /> },
  { id: 'FX', label: 'FX', icon: <Sliders className="w-3.5 h-3.5 text-pink-400" /> },
];

export const TrackInspector: React.FC<TrackInspectorProps> = ({
  track,
  onNudgePattern,
  onCloneBar,
  onClearTrack,
  onFocusTrack,
}) => {
  const [activeTab, setActiveTab] = useState<IntelligenceLaneTab>('SOURCE');

  if (!track) {
    return (
      <div className="w-full bg-slate-900 border-t border-slate-800 p-4 text-center text-xs text-slate-500 font-mono">
        Select an Intelligence Lane above to inspect Source, MIDI, Sound, Realization, Transformations, and FX
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-900/95 border-t border-slate-800 p-4 shadow-xl">
      {/* Top Bar with Track Info & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: track.color || '#3b82f6' }} />
          <div>
            <div className="text-xs font-bold text-slate-100">{track.name}</div>
            <div className="text-[10px] text-slate-400 font-mono">
              Instrument: {track.instrument.toUpperCase()} | Pitch: {track.pitch || 'C3'}
            </div>
          </div>
          <button
            onClick={() => onFocusTrack?.(track.id)}
            className="ml-2 px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 text-[11px] font-semibold cursor-pointer"
          >
            Focus Track Mode
          </button>
        </div>

        {/* Intelligence Lane Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content Panel */}
      <div className="mt-3 text-xs text-slate-300">
        {activeTab === 'SOURCE' && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <div>
              <div className="font-semibold text-slate-200">Raw Capture & Audio Source</div>
              <div className="text-[11px] text-slate-400">
                Original acoustic beatbox / microphone transient source is preserved intact.
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono">
              ORIGINAL SOURCE INTACT
            </span>
          </div>
        )}

        {activeTab === 'MIDI' && (
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-200">Detected MIDI & Pitch Grid</div>
              <div className="text-[11px] text-slate-400">
                {track.steps.filter(Boolean).length} Active step triggers mapped across 64-step grid.
              </div>
            </div>
            <div className="flex items-center space-x-2 text-[11px] font-mono">
              <span className="text-slate-400">Base Pitch:</span>
              <span className="text-amber-400 font-bold">{track.pitch || 'C3'}</span>
            </div>
          </div>
        )}

        {activeTab === 'SOUND' && (
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-200">Assigned Instrument Sound</div>
              <div className="text-[11px] text-slate-400">
                Semantic Sound Profile: <span className="text-emerald-400 font-mono">{track.instrument.toUpperCase()}</span>
              </div>
            </div>
            <button className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold">
              Browse Sound Library
            </button>
          </div>
        )}

        {activeTab === 'REALIZE' && (
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-semibold text-slate-200">AI Realization Capabilities</div>
              <div className="text-[11px] text-slate-400">
                Generate AI variations or build layers around this lane.
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1 rounded bg-purple-600/30 text-purple-300 border border-purple-500/40 hover:bg-purple-600/40 text-xs font-semibold flex items-center space-x-1">
                <Wand2 className="w-3.5 h-3.5" />
                <span>Build Around This</span>
              </button>
              <button className="px-3 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 text-xs font-semibold flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Variation</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'TRANSFORM' && (
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-semibold text-slate-200">Shoot Around Transformations</div>
              <div className="text-[11px] text-slate-400">Nudge, clone, shift or clear pattern steps.</div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onNudgePattern?.(track.id, 'left')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Nudge Left
              </button>
              <button
                onClick={() => onNudgePattern?.(track.id, 'right')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Nudge Right
              </button>
              <button
                onClick={() => onCloneBar?.(0)}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Clone Bar 1 $\rightarrow$ All
              </button>
              <button
                onClick={() => onClearTrack?.(track.id)}
                className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs font-semibold"
              >
                Clear Lane
              </button>
            </div>
          </div>
        )}

        {activeTab === 'FX' && (
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <div className="text-[11px] text-slate-400 mb-1">Filter Cutoff</div>
              <div className="font-mono text-amber-400 font-semibold">{track.dspSettings?.filterFreq || 12000} Hz</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 mb-1">Compressor Threshold</div>
              <div className="font-mono text-cyan-400 font-semibold">{track.dspSettings?.compressorThreshold || -18} dB</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 mb-1">Reverb Send</div>
              <div className="font-mono text-emerald-400 font-semibold">{Math.round((track.dspSettings?.reverbSend || 0) * 100)}%</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 mb-1">Pan</div>
              <div className="font-mono text-purple-400 font-semibold">{track.dspSettings?.pan || 0}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
