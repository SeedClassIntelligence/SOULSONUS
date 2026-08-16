import React, { useState } from 'react';
import { Track, IntelligenceLane, GenerationCandidate } from '../types/daw';
import { useStudioSession } from '../app/StudioSessionContext';
import { capabilityRegistry } from '../lib/capabilityRegistry';
import { SeedCaptureStudio } from './SeedCaptureStudio';
import { IntegratedSoundBrowser } from './IntegratedSoundBrowser';
import {
  Mic,
  Activity,
  Music,
  Sparkles,
  Sliders,
  Check,
  X,
  Volume2,
  ShieldCheck,
  Clock,
  Layers,
  ChevronRight,
  AlertCircle,
  Database,
  Radio,
} from 'lucide-react';

interface IntelligenceLaneInspectorProps {
  track: Track | null;
  onUpdateTrack?: (updates: Partial<Track>) => void;
}

export const IntelligenceLaneInspector: React.FC<IntelligenceLaneInspectorProps> = ({
  track,
  onUpdateTrack,
}) => {
  const { canUseCapability, setIsVaultModalOpen } = useStudioSession();
  const [activeTab, setActiveTab] = useState<'SOURCE' | 'MIDI' | 'SOUND' | 'REALIZE' | 'TRANSFORM' | 'FX'>('SOURCE');

  if (!track) {
    return (
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-500 text-xs font-mono">
        Select a track in the Timeline to inspect Intelligence Lane details.
      </div>
    );
  }

  return (
    <div className="bg-slate-900/95 border border-slate-800/90 rounded-2xl p-4 shadow-2xl space-y-3 select-none">
      {/* Header Title with Track Info */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2.5 gap-2">
        <div className="flex items-center space-x-3">
          <div
            className="w-3.5 h-3.5 rounded-full border border-slate-700 shadow-sm"
            style={{ backgroundColor: track.color || '#f59e0b' }}
          />
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wide">
                {track.name} — Studio Intelligence Editor
              </h3>
              <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 text-[9px] font-mono border border-amber-500/30 uppercase font-bold">
                {track.instrument}
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-400">
              Role: {(track.instrument || 'instrument').toUpperCase()} • Pitch: {track.pitch} • ID: {track.id}
            </p>
          </div>
        </div>

        {/* Tab Badges */}
        <div className="flex items-center space-x-1">
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[10px] font-mono border border-emerald-500/20 font-bold">
            INTENT LOCKED
          </span>
        </div>
      </div>

      {/* 6 Integrated Studio Inspector Tabs */}
      <div className="grid grid-cols-6 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono font-bold">
        <button
          onClick={() => setActiveTab('SOURCE')}
          className={`py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 ${
            activeTab === 'SOURCE'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">SOURCE</span>
        </button>

        <button
          onClick={() => setActiveTab('MIDI')}
          className={`py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 ${
            activeTab === 'MIDI'
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">MIDI</span>
        </button>

        <button
          onClick={() => setActiveTab('SOUND')}
          className={`py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 ${
            activeTab === 'SOUND'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">SOUND</span>
        </button>

        <button
          onClick={() => setActiveTab('REALIZE')}
          className={`py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 ${
            activeTab === 'REALIZE'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Music className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">REALIZE</span>
        </button>

        <button
          onClick={() => setActiveTab('TRANSFORM')}
          className={`py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 ${
            activeTab === 'TRANSFORM'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">TRANSFORM</span>
        </button>

        <button
          onClick={() => setActiveTab('FX')}
          className={`py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 ${
            activeTab === 'FX'
              ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">FX</span>
        </button>
      </div>

      {/* Dynamic Tab Content Area */}
      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 min-h-[200px]">
        {/* TAB 1: SOURCE -> Multi-Source Seed Capture & Event Decomposition */}
        {activeTab === 'SOURCE' && (
          <div className="space-y-3">
            <SeedCaptureStudio />
          </div>
        )}

        {/* TAB 2: MIDI -> Transcribed 16-Bar Note Matrix & Piano Roll */}
        {activeTab === 'MIDI' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center space-x-2 font-mono">
                <Activity className="w-4 h-4 text-blue-400" />
                <span>MIDI NOTE PATTERN & BASIC PITCH TRANSCRIPTION</span>
              </span>
              <span className="text-[10px] font-mono text-blue-300 font-bold">16th-Note Grid (4 Bars)</span>
            </div>

            <div className="grid grid-cols-8 sm:grid-cols-16 gap-1 font-mono text-center">
              {track.steps.slice(0, 16).map((step, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-lg border text-[10px] font-bold ${
                    step
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 text-slate-600'
                  }`}
                >
                  <div className="text-[9px] text-slate-500">{idx + 1}</div>
                  <div className="pt-0.5">{step ? (track.notes?.[idx] || track.pitch) : '-'}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: SOUND -> Integrated Level 4 Sound Browser (R01-R10) */}
        {activeTab === 'SOUND' && (
          <div className="space-y-3">
            <IntegratedSoundBrowser />
          </div>
        )}

        {/* TAB 4: REALIZE -> E05 Realization Candidates Stack */}
        {activeTab === 'REALIZE' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center space-x-2 font-mono">
                <Music className="w-4 h-4 text-emerald-400" />
                <span>E05 REALIZATION CANDIDATES & ADMISSION GATES</span>
              </span>
              <button
                onClick={() => setIsVaultModalOpen(true)}
                className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] border border-amber-500/30 hover:bg-amber-500/30 transition cursor-pointer"
              >
                Open Sound Vault (R01–R10)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/40 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-100 font-mono">{track.name} Candidate A</div>
                  <div className="text-[10px] font-mono text-slate-400">R01 One-Shot Sample Realizer • VERIFIED</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold font-mono">
                  ACTIVE
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-100 font-mono">ACE DiT Performance Transfer (E05)</div>
                  <div className="text-[10px] font-mono text-slate-400">Capability: CAP-007</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold font-mono">
                  ADMITTED
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: TRANSFORM -> Performance Variances & Retake History */}
        {activeTab === 'TRANSFORM' && (
          <div className="space-y-3 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>TRANSFORMATION LINEAGE & PERFORMANCE VARIANCE</span>
              </span>
            </div>

            <div className="space-y-2 text-[11px]">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-slate-300">
                <span>1. Acoustic Take Capture (Initial Mic Performance)</span>
                <span className="text-slate-500">t=0.0s</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-amber-300">
                <span>2. Level 4 Sound Asset Assignment ({track.name})</span>
                <span className="text-slate-500">t=1.2s</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: FX -> Channel DSP Strip */}
        {activeTab === 'FX' && (
          <div className="space-y-3 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-pink-400" />
                <span>E10 MULTI-TRACK CHANNEL DSP STRIP</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400">Volume: {track.volume}dB</span>
                <input
                  type="range"
                  min={-20}
                  max={6}
                  value={track.volume}
                  onChange={(e) => onUpdateTrack?.({ volume: Number(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer mt-1"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400">Pan: {track.dspSettings?.pan ?? 0}</span>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.1}
                  value={track.dspSettings?.pan ?? 0}
                  onChange={(e) =>
                    onUpdateTrack?.({
                      dspSettings: {
                        ...(track.dspSettings || {
                          filterFreq: 20000,
                          filterType: 'lowpass',
                          compressorThreshold: -24,
                          compressorRatio: 4,
                          reverbSend: 0.15,
                          pan: 0,
                        }),
                        pan: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-amber-500 cursor-pointer mt-1"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400">Filter Cutoff: 12.4kHz</span>
                <input
                  type="range"
                  min={200}
                  max={20000}
                  defaultValue={12400}
                  className="w-full accent-amber-500 cursor-pointer mt-1"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400">Verb Send: 15%</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  defaultValue={15}
                  className="w-full accent-amber-500 cursor-pointer mt-1"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
