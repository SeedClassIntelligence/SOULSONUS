import React, { useState } from 'react';
import {
  Sliders,
  Activity,
  Layers,
  Sparkles,
  Zap,
  Volume2,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Scissors,
  ChevronsLeft,
  ChevronsRight,
  Maximize2,
  Plus,
  Trash2,
  Power,
  Shield,
  Eye,
  Disc,
} from 'lucide-react';
import { useStudioSession } from '../../app/StudioSessionContext';
import { Track, TrackDspSettings, ClipOperationType, InsertPluginCategory } from '../../types/daw';
import { defaultTrackDsp, DEFAULT_LOW_CUT_HZ } from '../../audio/trackStrip';

export const SelectedChannelWorkstation: React.FC = () => {
  const {
    tracks,
    focusedTrackId,
    handleUpdateChannelStrip,
    handleExecuteClipOperation,
    audioAssets,
  } = useStudioSession();

  const focusedTrack = tracks.find((t) => t.id === focusedTrackId) || tracks[0];

  const [activeTab, setActiveTab] = useState<'eq_graph' | 'dynamics_rack' | 'inserts_chain' | 'clip_editor'>('eq_graph');

  if (!focusedTrack) {
    return (
      <div className="h-full p-6 text-center text-slate-500 font-mono flex items-center justify-center">
        Select a track in the console above to focus its engineering channel workstation.
      </div>
    );
  }

  // A merge, not `||`: dspSettings is deliberately partial (several panels
  // write only the fields they own), so an `||` fallback never applies once
  // any field has been set and leaves the rest silently undefined.
  const dsp = { ...defaultTrackDsp(focusedTrack), ...focusedTrack.dspSettings };

  const handleDspChange = (updates: Partial<TrackDspSettings>) => {
    handleUpdateChannelStrip(focusedTrack.id, updates);
  };

  const editorClip = focusedTrack.audioClips?.[0];
  const editorAsset = editorClip ? audioAssets[editorClip.assetId] : undefined;
  const editorPeaks = editorAsset?.peaks || [];

  return (
    <div className="h-full bg-slate-950 flex flex-col font-mono text-xs border-r border-slate-800/80 overflow-hidden">
      {/* 1. WORKSTATION HEADER */}
      <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <div
            className="w-3 h-3 rounded-full shrink-0 shadow-sm shadow-cyan-400/80"
            style={{ backgroundColor: focusedTrack.color || '#f59e0b' }}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-100 uppercase tracking-wide">
                {focusedTrack.name}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-black uppercase">
                {focusedTrack.instrument} FOCUS
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              4-Band Parametric EQ Graph • Dynamic RTA • Modular Inserts • Dual-View Waveform
            </p>
          </div>
        </div>

        {/* Workstation Sub-Tabs */}
        <div className="flex items-center space-x-1 text-[10px] font-bold">
          <button
            onClick={() => setActiveTab('eq_graph')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              activeTab === 'eq_graph' ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            4-BAND EQ
          </button>
          <button
            onClick={() => setActiveTab('dynamics_rack')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              activeTab === 'dynamics_rack' ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            DYNAMICS
          </button>
          <button
            onClick={() => setActiveTab('inserts_chain')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              activeTab === 'inserts_chain' ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            INSERTS
          </button>
          <button
            onClick={() => setActiveTab('clip_editor')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              activeTab === 'clip_editor' ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            WAVEFORM
          </button>
        </div>
      </div>

      {/* 2. BODY CONTENT */}
      <div className="flex-1 p-3.5 overflow-y-auto custom-scrollbar space-y-3">
        {/* TAB 1: 4-BAND PARAMETRIC EQ GRAPH */}
        {activeTab === 'eq_graph' && (
          <div className="space-y-3">
            {/* Interactive SVG EQ Curve Graph */}
            <div className="h-44 bg-slate-900 rounded-2xl border border-slate-800 p-2 relative overflow-hidden flex flex-col justify-between">
              {/* Frequency Grid Background */}
              <div className="absolute inset-0 grid grid-cols-5 gap-px opacity-20 pointer-events-none">
                <div className="border-r border-slate-500 text-[8px] pl-1 pt-1 text-slate-400">100 Hz</div>
                <div className="border-r border-slate-500 text-[8px] pl-1 pt-1 text-slate-400">500 Hz</div>
                <div className="border-r border-slate-500 text-[8px] pl-1 pt-1 text-slate-400">2 kHz</div>
                <div className="border-r border-slate-500 text-[8px] pl-1 pt-1 text-slate-400">8 kHz</div>
                <div className="text-[8px] pl-1 pt-1 text-slate-400">20 kHz</div>
              </div>

              {/* Real-Time Spectral RTA Background Simulation */}
              <svg className="w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="none">
                {/* RTA Curve Area */}
                <path
                  d={`M 0,100 Q 50,${80 - dsp.lowGain * 2} 100,${90 - dsp.lowGain * 3} T 200,${70 - dsp.midGain * 3} T 300,${60 - dsp.highGain * 3} T 400,${85 - dsp.highGain * 2} L 400,120 L 0,120 Z`}
                  fill="url(#eqGradient)"
                  opacity="0.3"
                />
                {/* Dynamic EQ Frequency Curve */}
                <path
                  d={`M 0,${60 - dsp.lowGain * 2.5} Q 80,${60 - dsp.lowGain * 3.5} 150,${60 - dsp.midGain * 3} T 280,${60 - dsp.midGain * 2.5} T 400,${60 - dsp.highGain * 3.5}`}
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="3"
                />
                <defs>
                  <linearGradient id="eqGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>

              {/* EQ Frequency Legends */}
              <div className="flex items-center justify-between text-[9px] text-slate-500 pt-1 border-t border-slate-800">
                <span>Low: {dsp.lowGain > 0 ? `+${dsp.lowGain}` : dsp.lowGain} dB (100Hz)</span>
                <span>Mid: {dsp.midGain > 0 ? `+${dsp.midGain}` : dsp.midGain} dB (1.2kHz)</span>
                <span>High: {dsp.highGain > 0 ? `+${dsp.highGain}` : dsp.highGain} dB (10kHz Air)</span>
              </div>
            </div>

            {/* EQ Sliders Grid */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-bold">LOW SHELF</span>
                  <span className="text-cyan-400 font-bold">{dsp.lowGain}dB</span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.5"
                  value={dsp.lowGain}
                  onChange={(e) => handleDspChange({ lowGain: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-bold">PARAMETRIC MID</span>
                  <span className="text-cyan-400 font-bold">{dsp.midGain}dB</span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.5"
                  value={dsp.midGain}
                  onChange={(e) => handleDspChange({ midGain: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-bold">AIR HIGH SHELF</span>
                  <span className="text-cyan-400 font-bold">{dsp.highGain}dB</span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.5"
                  value={dsp.highGain}
                  onChange={(e) => handleDspChange({ highGain: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DYNAMICS & INSTRUMENT-SPECIFIC ADAPTER */}
        {activeTab === 'dynamics_rack' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 uppercase">
                  VCA / Optical Compressor
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">ACTIVE INSERT</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Threshold</span>
                    <span className="text-amber-400 font-bold">{dsp.compressorThreshold} dB</span>
                  </div>
                  <input
                    type="range"
                    min="-40"
                    max="0"
                    step="1"
                    value={dsp.compressorThreshold}
                    onChange={(e) =>
                      handleDspChange({ compressorThreshold: parseFloat(e.target.value) })
                    }
                    className="w-full accent-amber-400 cursor-pointer h-1.5"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Ratio</span>
                    <span className="text-amber-400 font-bold">{dsp.compressorRatio}:1</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="0.5"
                    value={dsp.compressorRatio}
                    onChange={(e) =>
                      handleDspChange({ compressorRatio: parseFloat(e.target.value) })
                    }
                    className="w-full accent-amber-400 cursor-pointer h-1.5"
                  />
                </div>
              </div>
            </div>

            {/* Instrument-Specific Tailored Module */}
            {focusedTrack.instrument === 'bass' ? (
              <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-2">
                <span className="text-[10px] font-bold text-cyan-300 uppercase">
                  808 Sub-Harmonics & Mono Collapse (&lt;120Hz)
                </span>
                <p className="text-[10px] text-slate-400 leading-tight font-sans">
                  Tightens sub-bass frequencies below 120Hz to pure mono for phase clarity.
                </p>
              </div>
            ) : focusedTrack.instrument === 'vocal_synth' ? (
              <div className="p-3 rounded-xl bg-pink-950/20 border border-pink-500/30 space-y-2">
                <span className="text-[10px] font-bold text-pink-300 uppercase">
                  De-Esser (6.8kHz Sibilance Attenuation)
                </span>
                <p className="text-[10px] text-slate-400 leading-tight font-sans">
                  Dynamic split-band compression taming harsh 's' and 't' transients.
                </p>
              </div>
            ) : null}
          </div>
        )}

        {/* TAB 3: INSERTS CHAIN */}
        {activeTab === 'inserts_chain' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase">Modular Insert Chain</span>
              <span className="text-[10px] text-slate-500">Fixed Processing Order</span>
            </div>

            <div className="space-y-1.5">
              {[
                {
                  name: '1. Preamp HPF & Input Trim',
                  engaged: dsp.lowCutHz > DEFAULT_LOW_CUT_HZ,
                  bypass: () => handleDspChange({ lowCutHz: DEFAULT_LOW_CUT_HZ }),
                },
                {
                  name: '2. 4-Band Parametric EQ',
                  engaged: dsp.lowGain !== 0 || dsp.midGain !== 0 || dsp.highGain !== 0,
                  bypass: () => handleDspChange({ lowGain: 0, midGain: 0, highGain: 0 }),
                },
                {
                  name: '3. VCA Glue Dynamics',
                  engaged: dsp.compressorRatio > 1,
                  bypass: () => handleDspChange({ compressorRatio: 1 }),
                },
              ].map((ins, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between"
                >
                  <span className="font-bold text-slate-200 text-[11px]">{ins.name}</span>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-1.5 py-0.5 rounded border text-[8px] font-black ${
                        ins.engaged
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}
                    >
                      {ins.engaged ? 'ACTIVE' : 'FLAT'}
                    </span>
                    <button
                      onClick={ins.bypass}
                      className="text-slate-500 hover:text-white text-[10px] cursor-pointer"
                      title="Reset this stage to its neutral value"
                    >
                      Bypass
                    </button>
                  </div>
                </div>
              ))}
              <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between opacity-60">
                <span className="font-bold text-slate-400 text-[11px]">4. Harmonic Tube Saturation</span>
                <span
                  className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700 text-[8px] font-black"
                  title="No control in the UI writes a drive amount yet, so this stage never processes signal"
                >
                  NOT WIRED
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DUAL-VIEW WAVEFORM & CLIP EDITOR */}
        {activeTab === 'clip_editor' && (
          <div className="space-y-3">
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-bold uppercase">Waveform</span>
                <span className="text-cyan-400 font-bold">
                  {editorClip ? (editorAsset?.name || 'Audio clip') : 'No audio clip on this track'}
                </span>
              </div>
              <div className="h-20 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center relative overflow-hidden">
                {editorPeaks.length > 0 ? (
                  <svg className="w-full h-full opacity-90" viewBox={`0 0 ${editorPeaks.length} 80`} preserveAspectRatio="none">
                    <polyline
                      points={editorPeaks.map((p, i) => `${i},${40 - p * 38}`).join(' ')}
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                    />
                    <polyline
                      points={editorPeaks.map((p, i) => `${i},${40 + p * 38}`).join(' ')}
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                ) : (
                  <span className="text-[10px] text-slate-600 font-mono px-4 text-center">
                    This track has no recorded, imported or generated audio clip to show a waveform for.
                  </span>
                )}
              </div>
            </div>

            {/* Editing Controls */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleExecuteClipOperation(focusedTrack.id, 'split')}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-center font-bold transition cursor-pointer"
              >
                <Scissors className="w-3.5 h-3.5 text-cyan-400 mx-auto mb-1" />
                <span className="text-[10px] text-slate-300">SPLICE PLAYHEAD</span>
              </button>
              <button
                onClick={() => handleExecuteClipOperation(focusedTrack.id, 'reverse')}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-center font-bold transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400 mx-auto mb-1" />
                <span className="text-[10px] text-slate-300">REVERSE CLIP</span>
              </button>
              <button
                onClick={() => handleExecuteClipOperation(focusedTrack.id, 'gain', { gainDelta: 2 })}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-center font-bold transition cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
                <span className="text-[10px] text-slate-300">+2dB GAIN BOOST</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
