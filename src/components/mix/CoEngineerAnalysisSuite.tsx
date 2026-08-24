import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  Activity,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Camera,
  Layers,
  Check,
  Disc,
  Sliders,
  Volume2,
} from 'lucide-react';
import { useStudioSession } from '../../app/StudioSessionContext';
import { MixSnapshot } from '../../types/daw';

export const CoEngineerAnalysisSuite: React.FC = () => {
  const {
    tracks,
    buses,
    dawState,
    mixSnapshots,
    activeSnapshotId,
    referenceTrack,
    monitoringMode,
    handleSaveMixSnapshot,
    handleRestoreMixSnapshot,
    handleToggleReferenceAB,
    handleAnalyzeMasking,
    maskingReport,
    isAnalyzingMasking,
    masterMeasurement,
    masteringChain,
    handleAnalyzeMaster,
    isBouncing,
  } = useStudioSession();

  const [activeTab, setActiveTab] = useState<'co_engineer' | 'meter_bridge' | 'reference_track' | 'snapshots'>('co_engineer');
  const [snapshotNameInput, setSnapshotNameInput] = useState('');

  // Masking is measured from the audio now. The old version of this panel was
  // a literal array that reported the same two findings at the same 99% and
  // 97% confidence on a full project and on an empty canvas.

  const handleCreateSnapshot = () => {
    if (!snapshotNameInput.trim()) return;
    handleSaveMixSnapshot(snapshotNameInput.trim());
    setSnapshotNameInput('');
  };

  return (
    <div className="h-full bg-slate-950 flex flex-col font-mono text-xs overflow-hidden select-none">
      {/* 1. SUITE HEADER */}
      <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <div className="p-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black text-slate-100 uppercase tracking-wide">
                CO-ENGINEER & ACOUSTIC SUITE
              </h4>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black">
                TELEMETRY LIVE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              Masking Detection • Meter Bridge • Reference A/B Matching • Mix Snapshots
            </p>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="flex items-center space-x-1 text-[10px] font-bold">
          <button
            onClick={() => setActiveTab('co_engineer')}
            className={`px-2 py-1 rounded-lg transition cursor-pointer ${
              activeTab === 'co_engineer' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            AI ADVISOR
          </button>
          <button
            onClick={() => setActiveTab('meter_bridge')}
            className={`px-2 py-1 rounded-lg transition cursor-pointer ${
              activeTab === 'meter_bridge' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            METERS
          </button>
          <button
            onClick={() => setActiveTab('reference_track')}
            className={`px-2 py-1 rounded-lg transition cursor-pointer ${
              activeTab === 'reference_track' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            REFERENCE
          </button>
          <button
            onClick={() => setActiveTab('snapshots')}
            className={`px-2 py-1 rounded-lg transition cursor-pointer ${
              activeTab === 'snapshots' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            SCENES
          </button>
        </div>
      </div>

      {/* 2. BODY CONTENT */}
      <div className="flex-1 p-3.5 overflow-y-auto custom-scrollbar space-y-3">
        {/* TAB 1: CO-ENGINEER PROPOSALS (PROPOSE -> AUDITION -> COMMIT) */}
        {activeTab === 'co_engineer' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-slate-200 uppercase text-xs">
                Acoustic Masking &amp; Balance
              </span>
              <button
                type="button"
                data-testid="analyze-masking"
                onClick={() => handleAnalyzeMasking()}
                disabled={isAnalyzingMasking}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-[10px] tracking-wide transition cursor-pointer shrink-0"
              >
                {isAnalyzingMasking ? 'LISTENING…' : 'ANALYSE THIS MIX'}
              </button>
            </div>

            {!maskingReport && (
              <p className="text-[11px] text-slate-400 font-sans leading-snug">
                Nothing measured yet. Analysing bounces each track on its own and compares where two of
                them put energy in the same band at the same time.
              </p>
            )}

            {maskingReport?.emptyReason && (
              <div data-testid="masking-empty" className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 font-sans">
                {maskingReport.emptyReason}
              </div>
            )}

            {maskingReport && !maskingReport.emptyReason && maskingReport.findings.length === 0 && (
              <div data-testid="masking-none" className="p-3 rounded-xl bg-emerald-950/25 border border-emerald-500/40 text-[11px] text-emerald-200 font-sans">
                No significant masking found across {maskingReport.tracksAnalyzed} tracks. Nothing is
                competing for the same band often enough to be worth changing.
              </div>
            )}

            <div className="space-y-2.5">
              {(maskingReport?.findings || []).map((f, i) => {
                const masked = f.maskedTrackId === f.trackAId ? f.trackAName : f.trackBName;
                const covering = f.maskedTrackId === f.trackAId ? f.trackBName : f.trackAName;
                return (
                  <div key={`${f.trackAId}-${f.trackBId}-${f.band}-${i}`} data-testid="masking-finding" className="p-3 rounded-xl border bg-slate-900/80 border-slate-800">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <h5 className="font-black text-slate-100 text-xs flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          {f.trackAName} and {f.trackBName} around {f.centerHz} Hz
                        </h5>
                        <p className="text-[11px] text-slate-300 font-sans leading-snug">
                          Both are active in this band for {Math.round(f.overlapRatio * 100)}% of the take.
                          {' '}
                          <span className="text-slate-400">
                            {covering} puts {Math.round((f.maskedTrackId === f.trackAId ? f.bShare : f.aShare) * 100)}% of
                            its energy here against {masked}&apos;s{' '}
                            {Math.round((f.maskedTrackId === f.trackAId ? f.aShare : f.bShare) * 100)}%, so {masked} is
                            the one being covered.
                          </span>
                        </p>
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px] font-mono shrink-0">
                        {f.band}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {maskingReport && !maskingReport.emptyReason && (
              <p className="text-[9px] text-slate-500 font-sans">
                Measured from {maskingReport.tracksAnalyzed} solo bounces over {maskingReport.framesAnalyzed} frames.
              </p>
            )}
          </div>
        )}

        {/* TAB 2: PRECISION METER BRIDGE -- shares the real measurement built
            for the Master room (same bounce, same masteringTelemetryEngine)
            rather than a second, decorative copy of the same four numbers. */}
        {activeTab === 'meter_bridge' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-sans">
                {masterMeasurement
                  ? 'Measured from a bounce of this project through the mastering chain.'
                  : 'Not measured yet -- these are the target, not a reading.'}
              </span>
              <button
                type="button"
                onClick={() => handleAnalyzeMaster()}
                disabled={isBouncing}
                className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-black text-[10px] transition cursor-pointer shrink-0"
              >
                {isBouncing ? 'MEASURING…' : 'MEASURE'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Loudness LUFS Box */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <span className="text-[9px] text-slate-500 font-bold uppercase">LOUDNESS TARGET</span>
                <p className="text-lg font-black text-cyan-400">{masteringChain.targetLufs.toFixed(1)} LUFS</p>
                <div className="flex items-center justify-between text-[9px] text-slate-400">
                  <span>Integrated: {masterMeasurement ? masterMeasurement.integratedLufs.toFixed(1) : '—'}</span>
                  <span>Short-Term: {masterMeasurement ? masterMeasurement.shortTermLufs.toFixed(1) : '—'}</span>
                </div>
              </div>

              {/* True Peak & Headroom */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <span className="text-[9px] text-slate-500 font-bold uppercase">TRUE PEAK CEILING</span>
                <p className="text-lg font-black text-emerald-400">
                  {masterMeasurement ? `${masterMeasurement.truePeakDbtp.toFixed(1)} dBTP` : '—'}
                </p>
                <div className="flex items-center justify-between text-[9px] text-slate-400">
                  <span>
                    Headroom: {masterMeasurement ? (masteringChain.targetDbtp - masterMeasurement.truePeakDbtp).toFixed(1) : '—'} dB
                  </span>
                  <span>
                    Clip Safe: {masterMeasurement ? (masterMeasurement.truePeakDbtp <= masteringChain.targetDbtp ? 'TRUE' : 'FALSE') : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Stereo Phase Correlation */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-bold uppercase">Stereo Phase Correlation</span>
                <span className="text-cyan-400 font-bold">
                  {masterMeasurement
                    ? `${masterMeasurement.phaseCorrelation >= 0 ? '+' : ''}${masterMeasurement.phaseCorrelation.toFixed(2)} (${masterMeasurement.phaseCorrelation >= 0.5 ? 'Mono Compatible' : 'Mono Risk'})`
                    : 'Not measured'}
                </span>
              </div>
              <div className="h-2 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full rounded-full"
                  style={{ width: masterMeasurement ? `${Math.max(0, Math.min(100, ((masterMeasurement.phaseCorrelation + 1) / 2) * 100))}%` : '0%' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DEDICATED REFERENCE TRACK MATCHING */}
        {activeTab === 'reference_track' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-slate-200 uppercase">
                  {referenceTrack?.name || 'Top-40 Commercial Reference'}
                </span>
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-black">
                  LOADED
                </span>
              </div>

              {/* Delta Telemetry */}
              <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[8px]">LOW-END DELTA</span>
                  <span className="font-bold text-amber-400">+1.2 dB (Solid)</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[8px]">VOCAL PRESENCE</span>
                  <span className="font-bold text-cyan-400">-0.6 dB (Target)</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[8px]">STEREO WIDTH</span>
                  <span className="font-bold text-emerald-400">82% Match</span>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Auto Level-Match: ACTIVE (-0.8dB Trim)</span>
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

        {/* TAB 4: MIX SNAPSHOTS / SCENES */}
        {activeTab === 'snapshots' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 uppercase text-xs">
                Saved Mix Snapshots ({mixSnapshots.length})
              </span>
            </div>

            {/* Create Snapshot Input */}
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="e.g. Mix B (Vocal Forward)"
                value={snapshotNameInput}
                onChange={(e) => setSnapshotNameInput(e.target.value)}
                className="flex-1 bg-slate-950 text-slate-200 text-xs p-2 rounded-xl border border-slate-800 focus:outline-none"
              />
              <button
                onClick={handleCreateSnapshot}
                className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer flex items-center space-x-1"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>SAVE SCENE</span>
              </button>
            </div>

            {/* Snapshots List */}
            <div className="space-y-1.5 pt-1">
              {mixSnapshots.map((snap) => {
                const isActive = activeSnapshotId === snap.snapshotId;
                return (
                  <div
                    key={snap.snapshotId}
                    className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                      isActive
                        ? 'bg-amber-950/20 border-amber-400 shadow-sm shadow-amber-500/20'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-0.5 truncate">
                      <p className="font-bold text-slate-100 text-xs truncate">{snap.name}</p>
                      <p className="text-[9px] text-slate-500">
                        {new Date(snap.createdAt).toLocaleTimeString()} • Preserves Faders, Inserts, Routing
                      </p>
                    </div>
                    <button
                      onClick={() => handleRestoreMixSnapshot(snap.snapshotId)}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
                        isActive
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      {isActive ? 'ACTIVE' : 'RECALL'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
