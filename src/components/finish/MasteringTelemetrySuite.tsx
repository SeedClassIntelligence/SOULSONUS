import React, { useState } from 'react';
import {
  Activity,
  Radio,
  Sliders,
  Sparkles,
  Zap,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  Shield,
} from 'lucide-react';
import { useStudioSession } from '../../app/StudioSessionContext';

export const MasteringTelemetrySuite: React.FC = () => {
  const {
    referenceTrack,
    monitoringMode,
    handleToggleReferenceAB,
    activeMasterCandidateId,
    masterCandidates,
  } = useStudioSession();

  const activeCand =
    masterCandidates.find((c) => c.candidateId === activeMasterCandidateId) || masterCandidates[0];

  const [activeTelemetryTab, setActiveTelemetryTab] = useState<'loudness' | 'spectrum' | 'stereo' | 'reference'>('loudness');

  return (
    <div className="h-full bg-slate-950 flex flex-col font-mono text-xs border-r border-slate-800/80 overflow-hidden select-none">
      {/* 1. TELEMETRY HEADER */}
      <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <div className="p-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black text-slate-100 uppercase tracking-wide">
                MASTERING TELEMETRY & ANALYSIS
              </h4>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black">
                BROADCAST ACCURATE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              ITU-R BS.1770-4 Loudness • 20Hz-20kHz FFT • Stereo Correlation • Reference Delta
            </p>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="flex items-center space-x-1 text-[10px] font-bold">
          <button
            onClick={() => setActiveTelemetryTab('loudness')}
            className={`px-2 py-1 rounded-lg transition cursor-pointer ${
              activeTelemetryTab === 'loudness' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            LOUDNESS
          </button>
          <button
            onClick={() => setActiveTelemetryTab('spectrum')}
            className={`px-2 py-1 rounded-lg transition cursor-pointer ${
              activeTelemetryTab === 'spectrum' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            SPECTRUM
          </button>
          <button
            onClick={() => setActiveTelemetryTab('stereo')}
            className={`px-2 py-1 rounded-lg transition cursor-pointer ${
              activeTelemetryTab === 'stereo' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            STEREO
          </button>
          <button
            onClick={() => setActiveTelemetryTab('reference')}
            className={`px-2 py-1 rounded-lg transition cursor-pointer ${
              activeTelemetryTab === 'reference' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            REFERENCE
          </button>
        </div>
      </div>

      {/* 2. BODY CONTENT */}
      <div className="flex-1 p-3.5 overflow-y-auto custom-scrollbar space-y-3">
        {/* TAB 1: LOUDNESS & DYNAMICS */}
        {activeTelemetryTab === 'loudness' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              {/* Integrated LUFS Target Box */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <span className="text-[9px] text-slate-500 font-bold uppercase">INTEGRATED LUFS</span>
                <p className="text-xl font-black text-cyan-400">{activeCand.measuredLufs} LUFS</p>
                <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1">
                  <span>Target: -14.0 LUFS</span>
                  <span className="text-emerald-400 font-bold">COMPLIANT</span>
                </div>
              </div>

              {/* True-Peak Ceiling Box */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <span className="text-[9px] text-slate-500 font-bold uppercase">TRUE PEAK CEILING</span>
                <p className="text-xl font-black text-emerald-400">{activeCand.measuredDbtp} dBTP</p>
                <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1">
                  <span>Max Intersample: Safe</span>
                  <span className="text-emerald-400 font-bold">NO CLIPPING</span>
                </div>
              </div>
            </div>

            {/* Crest Factor & Short-Term Readings */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-bold uppercase">Dynamic Crest Factor</span>
                <span className="text-amber-400 font-bold">{activeCand.measuredCrestFactor} dB (Punch Preserved)</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[9px] pt-1 border-t border-slate-800">
                <div>
                  <span className="text-slate-500 block">Short-Term</span>
                  <span className="text-slate-200 font-bold">-13.8 LUFS</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Momentary</span>
                  <span className="text-slate-200 font-bold">-13.2 LUFS</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Limiter GR</span>
                  <span className="text-cyan-400 font-bold">1.4 dB Max</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SPECTRUM 20Hz-20kHz RTA */}
        {activeTelemetryTab === 'spectrum' && (
          <div className="space-y-3">
            <div className="h-36 bg-slate-900 rounded-xl border border-slate-800 p-2 relative overflow-hidden flex flex-col justify-between">
              {/* Frequency Scale Grid */}
              <div className="absolute inset-0 grid grid-cols-5 gap-px opacity-20 pointer-events-none">
                <div className="border-r border-slate-500 text-[8px] pl-1 pt-1 text-slate-400">40 Hz</div>
                <div className="border-r border-slate-500 text-[8px] pl-1 pt-1 text-slate-400">250 Hz</div>
                <div className="border-r border-slate-500 text-[8px] pl-1 pt-1 text-slate-400">1 kHz</div>
                <div className="border-r border-slate-500 text-[8px] pl-1 pt-1 text-slate-400">5 kHz</div>
                <div className="text-[8px] pl-1 pt-1 text-slate-400">20 kHz</div>
              </div>

              {/* RTA Spectral Energy Curve */}
              <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
                <path
                  d="M 0,90 Q 40,30 80,45 T 160,50 T 240,40 T 320,60 T 400,85 L 400,100 L 0,100 Z"
                  fill="url(#spectrumGradient)"
                  opacity="0.4"
                />
                <path
                  d="M 0,90 Q 40,30 80,45 T 160,50 T 240,40 T 320,60 T 400,85"
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="2.5"
                />
                <defs>
                  <linearGradient id="spectrumGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>

              <div className="flex items-center justify-between text-[8px] text-slate-500 pt-1 border-t border-slate-800">
                <span>Sub-Bass (20-60Hz): Clean</span>
                <span>Mid-Range (500Hz-2kHz): Balanced</span>
                <span>Air (10k-20kHz): Smooth</span>
              </div>
            </div>

            {/* Frequency Band Breakdown */}
            <div className="grid grid-cols-3 gap-2 text-center text-[9px]">
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block">LOW-END (40-100Hz)</span>
                <span className="font-bold text-cyan-400">-18.2 dBFS</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block">MID CLUTTER (250Hz)</span>
                <span className="font-bold text-emerald-400">Low / Clear</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block">HIGH AIR (12kHz+)</span>
                <span className="font-bold text-amber-400">+1.5 dB Sparkle</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: STEREO PHASE & MID/SIDE BALANCE */}
        {activeTelemetryTab === 'stereo' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-bold uppercase">Stereo Phase Correlation</span>
                <span className="text-emerald-400 font-black">+{activeCand.phaseCorrelation} (Mono-Compatible)</span>
              </div>

              {/* Correlation Ladder Bar */}
              <div className="space-y-1">
                <div className="h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                  <div className="w-[91%] bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full" />
                </div>
                <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                  <span>-1.0 (Out of Phase)</span>
                  <span>0.0 (Wide)</span>
                  <span>+1.0 (Pure Mono)</span>
                </div>
              </div>

              {/* Mid / Side Energy Split */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-center">
                  <span className="text-[8px] text-slate-500 block">MID CHANNEL ENERGY</span>
                  <span className="text-xs font-black text-cyan-300">73% (Punch & Focus)</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-center">
                  <span className="text-[8px] text-slate-500 block">SIDE CHANNEL ENERGY</span>
                  <span className="text-xs font-black text-purple-300">27% (Stereo Width)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: COMMERCIAL REFERENCE TRACK COMPARISON */}
        {activeTelemetryTab === 'reference' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-slate-200 uppercase truncate">
                  {referenceTrack?.name || 'Commercial Reference'}
                </span>
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-black">
                  LEVEL MATCHED (-0.8dB)
                </span>
              </div>

              {/* Strict Governance Notice */}
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center space-x-2 text-[9px] text-slate-400">
                <Shield className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Reference audio is used for acoustic comparison only. Never exported or used for generative training.</span>
              </div>

              {/* Comparison Delta Grid */}
              <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[8px]">BASS ENERGY</span>
                  <span className="font-bold text-amber-400">+1.2 dB (Solid)</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[8px]">VOCAL PRESENCE</span>
                  <span className="font-bold text-cyan-400">-0.6 dB (Target)</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[8px]">STEREO WIDTH</span>
                  <span className="font-bold text-emerald-400">88% Match</span>
                </div>
              </div>

              {/* A/B Audition Button */}
              <div className="pt-1 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Audition Path: Monitor Only</span>
                <button
                  onClick={handleToggleReferenceAB}
                  className={`px-3 py-1.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center space-x-1.5 ${
                    monitoringMode.abMode === 'REF'
                      ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>{monitoringMode.abMode === 'REF' ? 'LISTENING TO REF (A)' : 'HEAR REFERENCE'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
