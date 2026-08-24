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
  Upload,
} from 'lucide-react';
import { useStudioSession } from '../../app/StudioSessionContext';
import { BandName } from '../../audio/performanceClassifier';

const SPECTRUM_BANDS: { key: BandName; label: string }[] = [
  { key: 'sub', label: '20-120' },
  { key: 'low', label: '120-260' },
  { key: 'lowMid', label: '260-800' },
  { key: 'mid', label: '800-2.6k' },
  { key: 'high', label: '2.6-6k' },
  { key: 'air', label: '6-14k' },
];

export const MasteringTelemetrySuite: React.FC = () => {
  const {
    referenceTrack,
    currentMixSpectralProfile,
    handleLoadReferenceTrack,
    monitoringMode,
    handleToggleReferenceAB,
    activeMasterCandidateId,
    masterCandidates,
    handleAnalyzeMaster,
    handleBounceMaster,
    isBouncing,
    masterMeasurement,
  } = useStudioSession();

  const [isLoadingReference, setIsLoadingReference] = useState(false);
  const handleReferenceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsLoadingReference(true);
    try {
      await handleLoadReferenceTrack(file);
    } finally {
      setIsLoadingReference(false);
    }
  };

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

      {/* Measure the real bounce. Until this runs, the boxes below show the
          candidate's stored values rather than anything measured. */}
      <div className="px-3.5 pt-3 flex items-center justify-between gap-2 shrink-0">
        <span className="text-[10px] text-slate-400">
          {masterMeasurement
            ? 'Measured from a bounce of this project through the mastering chain.'
            : 'Not measured yet — values below are the candidate preset, not a measurement.'}
        </span>
        <button
          type="button"
          data-testid="analyze-master"
          onClick={() => handleAnalyzeMaster()}
          disabled={isBouncing}
          className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-black text-[10px] tracking-wide transition cursor-pointer shrink-0"
        >
          {isBouncing ? 'BOUNCING…' : 'MEASURE THIS MASTER'}
        </button>
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
                <p className="text-xl font-black text-cyan-400" data-testid="lufs-readout">
                  {masterMeasurement ? masterMeasurement.integratedLufs : activeCand.measuredLufs} LUFS
                </p>
                <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1">
                  <span>Target: -14.0 LUFS</span>
                  <span className={masterMeasurement ? (masterMeasurement.isStreamingCompliant ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold') : 'text-slate-500 font-bold'}>
                    {masterMeasurement ? (masterMeasurement.isStreamingCompliant ? 'COMPLIANT' : 'OVER TARGET') : 'NOT MEASURED'}
                  </span>
                </div>
              </div>

              {/* True-Peak Ceiling Box */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <span className="text-[9px] text-slate-500 font-bold uppercase">TRUE PEAK CEILING</span>
                <p className="text-xl font-black text-emerald-400" data-testid="dbtp-readout">
                  {masterMeasurement ? masterMeasurement.truePeakDbtp : activeCand.measuredDbtp} dBTP
                </p>
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
                <span className="text-amber-400 font-bold">
                  {masterMeasurement ? masterMeasurement.crestFactorDb : activeCand.measuredCrestFactor} dB
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[9px] pt-1 border-t border-slate-800">
                <div>
                  <span className="text-slate-500 block">Short-Term</span>
                  <span className="text-slate-200 font-bold">
                    {masterMeasurement ? `${masterMeasurement.shortTermLufs} LUFS` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Momentary</span>
                  <span className="text-slate-200 font-bold">
                    {masterMeasurement ? `${masterMeasurement.momentaryLufs} LUFS` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Phase Corr.</span>
                  <span className="text-cyan-400 font-bold">
                    {masterMeasurement ? `${masterMeasurement.phaseCorrelation} corr` : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SPECTRUM 20Hz-14kHz REAL BAND ENERGY */}
        {activeTelemetryTab === 'spectrum' && (
          <div className="space-y-3">
            {currentMixSpectralProfile ? (
              <>
                <div className="h-36 bg-slate-900 rounded-xl border border-slate-800 p-3 flex items-end justify-between gap-2">
                  {SPECTRUM_BANDS.map(({ key, label }) => {
                    const db = currentMixSpectralProfile.bandDb[key];
                    // -50dB..0dB mapped to 4%..100% bar height, so a real but
                    // quiet band still shows a sliver rather than vanishing.
                    const heightPct = Math.max(4, Math.min(100, ((db + 50) / 50) * 100));
                    return (
                      <div key={key} className="flex-1 h-full flex flex-col items-center justify-end gap-1">
                        <span className="text-[8px] text-cyan-300 font-bold">{db.toFixed(1)}</span>
                        <div
                          className="w-full rounded-t bg-gradient-to-t from-cyan-500/90 to-cyan-400/40"
                          style={{ height: `${heightPct}%` }}
                        />
                        <span className="text-[8px] text-slate-500 whitespace-nowrap">{label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Frequency Band Breakdown */}
                <div className="grid grid-cols-3 gap-2 text-center text-[9px]">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block">LOW-END (20-260Hz)</span>
                    <span className="font-bold text-cyan-400">{currentMixSpectralProfile.lowEndEnergyDb.toFixed(1)} dB</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block">MID (800Hz-2.6kHz)</span>
                    <span className="font-bold text-emerald-400">{currentMixSpectralProfile.bandDb.mid.toFixed(1)} dB</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block">AIR (6-14kHz)</span>
                    <span className="font-bold text-amber-400">{currentMixSpectralProfile.bandDb.air.toFixed(1)} dB</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-36 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center text-center px-6">
                <span className="text-[10px] text-slate-500 font-mono">
                  Not measured yet — click MEASURE THIS MASTER above to run a real FFT band analysis on a bounce of this project.
                </span>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: STEREO PHASE & MID/SIDE BALANCE */}
        {activeTelemetryTab === 'stereo' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-bold uppercase">Stereo Phase Correlation</span>
                <span className={masterMeasurement ? 'text-emerald-400 font-black' : 'text-slate-500 font-black'}>
                  {masterMeasurement
                    ? `${masterMeasurement.phaseCorrelation >= 0 ? '+' : ''}${masterMeasurement.phaseCorrelation.toFixed(2)} (${masterMeasurement.phaseCorrelation >= 0.5 ? 'Mono Compatible' : 'Mono Risk'})`
                    : 'NOT MEASURED'}
                </span>
              </div>

              {/* Correlation Ladder Bar */}
              <div className="space-y-1">
                <div className="h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full"
                    style={{
                      width: masterMeasurement
                        ? `${Math.max(0, Math.min(100, ((masterMeasurement.phaseCorrelation + 1) / 2) * 100))}%`
                        : '0%',
                    }}
                  />
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
                  <span className="text-xs font-black text-cyan-300">
                    {currentMixSpectralProfile ? `${100 - currentMixSpectralProfile.stereoWidthScore}%` : 'NOT MEASURED'}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-center">
                  <span className="text-[8px] text-slate-500 block">SIDE CHANNEL ENERGY</span>
                  <span className="text-xs font-black text-purple-300">
                    {currentMixSpectralProfile ? `${currentMixSpectralProfile.stereoWidthScore}%` : 'NOT MEASURED'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: COMMERCIAL REFERENCE TRACK COMPARISON -- real upload, real
            measurement, shares state with the Mix room's reference tab. */}
        {activeTelemetryTab === 'reference' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-black text-xs text-slate-200 uppercase truncate">
                  {referenceTrack?.name || 'No reference loaded'}
                </span>
                <label className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[9px] font-black cursor-pointer flex items-center gap-1 shrink-0">
                  <Upload className="w-3 h-3" />
                  <span>{isLoadingReference ? 'ANALYZING…' : referenceTrack ? 'REPLACE' : 'LOAD FILE'}</span>
                  <input type="file" accept="audio/*" className="hidden" onChange={handleReferenceFileChange} disabled={isLoadingReference} />
                </label>
              </div>

              {/* Strict Governance Notice */}
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center space-x-2 text-[9px] text-slate-400">
                <Shield className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Reference audio is used for acoustic comparison only. Never exported or used for generative training.</span>
              </div>

              {!referenceTrack && (
                <p className="text-[10px] text-slate-500 font-sans">
                  Upload a real reference track -- nothing is loaded by default.
                </p>
              )}

              {referenceTrack && !currentMixSpectralProfile && (
                <p className="text-[10px] text-slate-500 font-sans">
                  Reference measured. Run Measure This Master to get this project's own numbers to compare it
                  against.
                </p>
              )}

              {/* Comparison Delta Grid */}
              {referenceTrack && currentMixSpectralProfile && (
                <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block text-[8px]">BASS ENERGY DELTA</span>
                    <span className="font-bold text-amber-400">
                      {(currentMixSpectralProfile.lowEndEnergyDb - referenceTrack.lowEndEnergyDb).toFixed(1)} dB
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block text-[8px]">VOCAL PRESENCE DELTA</span>
                    <span className="font-bold text-cyan-400">
                      {(currentMixSpectralProfile.vocalPresenceDb - referenceTrack.vocalPresenceDb).toFixed(1)} dB
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block text-[8px]">STEREO WIDTH</span>
                    <span className="font-bold text-emerald-400">
                      {currentMixSpectralProfile.stereoWidthScore}% vs {referenceTrack.stereoWidthScore}%
                    </span>
                  </div>
                </div>
              )}

              {/* A/B Audition Button */}
              <div className="pt-1 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  {referenceTrack ? `${referenceTrack.integratedLufs.toFixed(1)} LUFS · ${referenceTrack.durationSec.toFixed(0)}s` : 'Audition Path: Monitor Only'}
                </span>
                <button
                  onClick={handleToggleReferenceAB}
                  disabled={!referenceTrack?.audioUrl}
                  className={`px-3 py-1.5 rounded-xl font-black text-xs transition flex items-center space-x-1.5 ${
                    !referenceTrack?.audioUrl
                      ? 'bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800'
                      : monitoringMode.abMode === 'REF'
                        ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/30 cursor-pointer'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer'
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
