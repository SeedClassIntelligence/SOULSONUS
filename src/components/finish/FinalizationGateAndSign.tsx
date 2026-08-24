import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Check,
  Shield,
  Download,
  FileCheck,
  Lock,
  Layers,
  Activity,
  Disc,
} from 'lucide-react';
import { useStudioSession } from '../../app/StudioSessionContext';
import { MasterCandidate } from '../../types/daw';
import { downloadDeliveryFile, formatBytes, DeliveryFile } from '../../audio/deliveryPackage';

export const FinalizationGateAndSign: React.FC = () => {
  const {
    masterCandidates,
    activeMasterCandidateId,
    finalizationGate,
    masterMeasurement,
    masteringChain,
    handleUpdateMasteringProcessor,
    handleAuditionMasterCandidate,
    handleCommitMasterCandidate,
    handleSignMasterSeedSignature,
    handleExportMasterDelivery,
    deliveryPackage,
    isPackagingDelivery,
    deliveryProgress,
    deliveryError,
  } = useStudioSession();

  const [activeTab, setActiveTab] = useState<'co_engineer' | 'candidates' | 'finalization_gate' | 'export_delivery'>('co_engineer');
  const [loudnessMatchEnabled, setLoudnessMatchEnabled] = useState(true);
  const [isSigning, setIsSigning] = useState(false);
  const [signatureResult, setSignatureResult] = useState<any | null>(null);
  const [appliedObservationIds, setAppliedObservationIds] = useState<string[]>([]);

  /**
   * Real findings from the real bounce measurement, not a fixed pair of
   * invented frequency-band claims. This used to be two hardcoded
   * observations naming specific Hz and dB values nothing had measured, with
   * Audition/Commit buttons that called alert() and touched nothing. Only
   * two checks get a one-click Apply: true-peak-over-ceiling and a
   * phase-correlation risk, because both have a mechanically correct fix (a
   * limiter's ceiling exists to be set to the target; narrowing stereo width
   * is the standard fix for a mono-compatibility problem). A loudness
   * mismatch or a low crest factor is reported, not "fixed" here, because
   * which stage actually caused it isn't something a single parameter change
   * can honestly claim to know.
   */
  const masteringObservations = useMemo(() => {
    if (!masterMeasurement) return [];
    const findings: {
      id: string;
      title: string;
      recommendation: string;
      apply?: { slotId: string; params: Record<string, number> };
    }[] = [];

    const peakOverage = masterMeasurement.truePeakDbtp - masteringChain.targetDbtp;
    if (peakOverage > 0.05) {
      const limiter = masteringChain.slots.find((s) => s.type === 'true_peak_limiter');
      findings.push({
        id: 'true_peak_over_ceiling',
        title: `True peak at ${masterMeasurement.truePeakDbtp.toFixed(1)} dBTP, ${peakOverage.toFixed(1)} dB over the ${masteringChain.targetDbtp.toFixed(1)} dBTP target`,
        recommendation: limiter
          ? `Lower the true-peak limiter's ceiling from ${Number(limiter.parameters.ceilingDbtp ?? masteringChain.targetDbtp).toFixed(1)} to ${masteringChain.targetDbtp.toFixed(1)} dBTP.`
          : 'No true-peak limiter is in the chain to correct this.',
        apply: limiter ? { slotId: limiter.id, params: { ceilingDbtp: masteringChain.targetDbtp } } : undefined,
      });
    }

    if (masterMeasurement.phaseCorrelation < 0.3) {
      const stereoSlot = masteringChain.slots.find((s) => s.type === 'stereo_ms');
      const currentWidth = stereoSlot ? Number(stereoSlot.parameters.sideWidthPercent ?? 100) : 100;
      const narrowedWidth = Math.max(80, Math.round(currentWidth * 0.85));
      findings.push({
        id: 'phase_correlation_risk',
        title: `Phase correlation at ${masterMeasurement.phaseCorrelation.toFixed(2)}, below 0.3 -- a real mono-compatibility risk`,
        recommendation: stereoSlot
          ? `Narrow the stereo side width from ${currentWidth}% to ${narrowedWidth}% to bring the sides back into phase.`
          : 'No stereo width stage is in the chain to correct this.',
        apply: stereoSlot ? { slotId: stereoSlot.id, params: { sideWidthPercent: narrowedWidth } } : undefined,
      });
    }

    const lufsOffset = masterMeasurement.integratedLufs - masteringChain.targetLufs;
    if (Math.abs(lufsOffset) > 0.5) {
      findings.push({
        id: 'lufs_off_target',
        title: `Integrated loudness at ${masterMeasurement.integratedLufs.toFixed(1)} LUFS, ${Math.abs(lufsOffset).toFixed(1)} dB ${lufsOffset > 0 ? 'over' : 'under'} the ${masteringChain.targetLufs.toFixed(1)} LUFS target`,
        recommendation: 'No single stage owns loudness end to end, so this is reported rather than auto-adjusted -- check the bus compressor and limiter drive together.',
      });
    }

    if (masterMeasurement.crestFactorDb < 6) {
      findings.push({
        id: 'low_crest_factor',
        title: `Crest factor at ${masterMeasurement.crestFactorDb.toFixed(1)} dB -- heavily limited, little dynamic range left`,
        recommendation: 'Likely several stages compounding, not one -- reported rather than auto-adjusted.',
      });
    }

    return findings;
  }, [masterMeasurement, masteringChain]);

  const handleApplyObservation = (obs: { id: string; apply?: { slotId: string; params: Record<string, number> } }) => {
    if (!obs.apply) return;
    handleUpdateMasteringProcessor(obs.apply.slotId, obs.apply.params);
    setAppliedObservationIds((prev) => [...prev, obs.id]);
  };

  const handleSign = async () => {
    setIsSigning(true);
    try {
      const sig = await handleSignMasterSeedSignature();
      setSignatureResult(sig);
      setActiveTab('export_delivery');
      // Signing now renders and encodes the package. It takes as long as the
      // bounce takes, which is the honest cost of producing real files.
      await handleExportMasterDelivery().catch(() => undefined);
    } finally {
      setIsSigning(false);
    }
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
                CO-ENGINEER & FINALIZATION GATE
              </h4>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black">
                GOVERNED RUNTIME
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              Mastering Telemetry Observations • A/B/C Candidate Audition • E14 SeedSignature Lock
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
            ADVISOR
          </button>
          <button
            onClick={() => setActiveTab('candidates')}
            className={`px-2 py-1 rounded-lg transition cursor-pointer ${
              activeTab === 'candidates' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            CANDIDATES
          </button>
          <button
            onClick={() => setActiveTab('finalization_gate')}
            className={`px-2 py-1 rounded-lg transition cursor-pointer ${
              activeTab === 'finalization_gate' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            GATE CHECK
          </button>
          <button
            onClick={() => setActiveTab('export_delivery')}
            className={`px-2 py-1 rounded-lg transition cursor-pointer ${
              activeTab === 'export_delivery' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            DELIVERY
          </button>
        </div>
      </div>

      {/* 2. BODY CONTENT */}
      <div className="flex-1 p-3.5 overflow-y-auto custom-scrollbar space-y-3">
        {/* TAB 1: CO-ENGINEER OBSERVATIONS -- real findings from the real
            bounce measurement, not two fixed frequency-band claims nothing
            had measured. */}
        {activeTab === 'co_engineer' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 uppercase text-xs">
                Mastering Telemetry Observations
              </span>
              {masterMeasurement && (
                <span className="text-[10px] text-amber-400 font-bold">
                  {masteringObservations.length} Insight{masteringObservations.length === 1 ? '' : 's'} Detected
                </span>
              )}
            </div>

            {!masterMeasurement && (
              <p className="text-[11px] text-slate-400 font-sans leading-snug">
                Nothing measured yet. Run Measure This Master before this can compare anything to the
                {' '}{masteringChain.targetLufs.toFixed(1)} LUFS / {masteringChain.targetDbtp.toFixed(1)} dBTP target.
              </p>
            )}

            {masterMeasurement && masteringObservations.length === 0 && (
              <div className="p-3 rounded-xl bg-emerald-950/25 border border-emerald-500/40 text-[11px] text-emerald-200 font-sans">
                Nothing to flag against the {masteringChain.targetLufs.toFixed(1)} LUFS / {masteringChain.targetDbtp.toFixed(1)} dBTP target.
              </div>
            )}

            <div className="space-y-2.5">
              {masteringObservations.map((obs) => {
                const applied = appliedObservationIds.includes(obs.id);
                return (
                  <div key={obs.id} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <h5 className="font-black text-slate-100 text-xs flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          {obs.title}
                        </h5>
                        <p className="text-[11px] text-slate-300 font-sans leading-snug">
                          {obs.recommendation}
                        </p>
                      </div>
                    </div>

                    {obs.apply && (
                      <div className="pt-2 flex items-center justify-end border-t border-slate-800">
                        <button
                          onClick={() => handleApplyObservation(obs)}
                          disabled={applied}
                          className={`px-2.5 py-1 rounded text-[10px] font-black transition flex items-center space-x-1 ${
                            applied
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer'
                          }`}
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>{applied ? 'APPLIED' : 'APPLY'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: MASTER CANDIDATES (A/B/C AUDITIONING) */}
        {activeTab === 'candidates' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 uppercase text-xs">
                Master Candidates A/B/C Comparison
              </span>
              <label className="flex items-center space-x-1.5 text-[10px] text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={loudnessMatchEnabled}
                  onChange={(e) => setLoudnessMatchEnabled(e.target.checked)}
                  className="rounded accent-cyan-400"
                />
                <span>Loudness Match (Eliminate Volume Bias)</span>
              </label>
            </div>

            <div className="space-y-2">
              {masterCandidates.map((cand) => {
                const isActive = activeMasterCandidateId === cand.candidateId;
                return (
                  <div
                    key={cand.candidateId}
                    className={`p-3 rounded-xl border transition ${
                      isActive
                        ? 'bg-amber-950/20 border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-xs text-slate-100">{cand.name}</h5>
                          {cand.isCommittedMaster && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[8px] font-black">
                              COMMITTED MASTER
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 pt-0.5">
                          {cand.measuredLufs} LUFS-I • {cand.measuredDbtp} dBTP • Crest {cand.measuredCrestFactor} dB
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleAuditionMasterCandidate(cand.candidateId)}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold transition cursor-pointer flex items-center space-x-1 ${
                            isActive
                              ? 'bg-amber-400 text-slate-950 font-black'
                              : 'bg-slate-800 text-slate-300 hover:text-white'
                          }`}
                        >
                          <Radio className="w-3 h-3" />
                          <span>{isActive ? 'LISTENING' : 'AUDITION'}</span>
                        </button>
                        {!cand.isCommittedMaster && (
                          <button
                            onClick={() => handleCommitMasterCandidate(cand.candidateId)}
                            className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] transition cursor-pointer"
                          >
                            SET CANONICAL
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: FINALIZATION GATE CONTRACT */}
        {activeTab === 'finalization_gate' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 uppercase text-xs">
                Release Invariant Runtime Contract
              </span>
              <span
                className={`px-2 py-0.5 rounded border text-[9px] font-black ${
                  finalizationGate.isReadyToSign
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}
              >
                {finalizationGate.isReadyToSign ? 'ALL INVARIANTS SATISFIED' : 'NOT READY TO SIGN'}
              </span>
            </div>

            {/* Checklist Items -- each measured against what is actually in
                the project, not asserted. RESOURCES and RIGHTS have no real
                system to check yet and are shown as such, not as a pass. */}
            <div className="space-y-1.5">
              {[
                {
                  title: 'AUDIO: Valid Master Print & No Intersample Clipping',
                  status: finalizationGate.audioChecksPassed,
                  detail: 'Measured against the -1.0 dBTP ceiling. Requires Measure This Master to have run.',
                },
                {
                  title: 'LINEAGE: Root Seed Present',
                  status: finalizationGate.lineageChecksPassed,
                  detail: 'At least one track carries a real recorded take or performed notes.',
                },
                {
                  title: 'RESOURCES: Admission Cleared',
                  status: finalizationGate.resourcesAdmissionPassed,
                  detail: 'Not verifiable yet -- nothing tracks admission status on assets a project actually places.',
                  unverifiable: true,
                },
                {
                  title: 'RIGHTS: Ownership & Splits Verified',
                  status: finalizationGate.rightsAndSplitsPassed,
                  detail: 'Not verifiable yet -- no rights or consent system is wired into this deployment.',
                  unverifiable: true,
                },
                {
                  title: 'PROVENANCE: SHA-256 Verified Per Asset',
                  status: finalizationGate.provenanceHashVerified,
                  detail: 'Every registered audio asset carries a real, correctly-shaped hash.',
                },
              ].map((item, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-bold text-[11px] text-slate-200 flex items-center gap-1.5">
                      {item.status ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      )}
                      {item.title}
                    </p>
                    <p className="text-[9px] text-slate-500 pl-5">{item.detail}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-bold shrink-0 ml-2 ${
                      item.status
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : item.unverifiable
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-rose-500/10 text-rose-400'
                    }`}
                  >
                    {item.status ? 'PASSED' : item.unverifiable ? 'NOT VERIFIABLE' : 'BLOCKED'}
                  </span>
                </div>
              ))}
            </div>

            {!finalizationGate.isReadyToSign && finalizationGate.blockingReasons.length > 0 && (
              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 space-y-1">
                <span className="text-[10px] font-bold text-rose-300 uppercase">Why signing is blocked</span>
                <ul className="text-[10px] text-rose-200/90 font-sans space-y-0.5 list-disc list-inside">
                  {finalizationGate.blockingReasons.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sign Master Button -- disabled for real when the gate isn't
                actually satisfied, not just while a signature is in flight. */}
            <div className="pt-2">
              <button
                onClick={handleSign}
                disabled={isSigning || !finalizationGate.isReadyToSign}
                title={!finalizationGate.isReadyToSign ? finalizationGate.blockingReasons.join(' ') : undefined}
                className={`w-full py-2.5 rounded-xl font-black text-xs transition flex items-center justify-center space-x-2 shadow-lg ${
                  isSigning || !finalizationGate.isReadyToSign
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 cursor-pointer shadow-amber-500/20'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>
                  {isSigning
                    ? 'CRYPTOGRAPHICALLY SIGNING...'
                    : finalizationGate.isReadyToSign
                      ? 'LOCK & SIGN E14 SEEDSIGNATURE'
                      : 'GATE NOT SATISFIED'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: EXPORT & DELIVERY PACKAGE */}
        {activeTab === 'export_delivery' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 uppercase text-xs">
                {deliveryPackage ? `Master Delivery Package • ${deliveryPackage.projectName}` : 'Master Delivery Package'}
              </span>
              {deliveryPackage && (
                <span className="text-[10px] text-cyan-400 font-bold font-mono" title={`SHA-256 of ${deliveryPackage.provenance.name}`}>
                  {deliveryPackage.provenance.sha256.slice(0, 16)}…
                </span>
              )}
            </div>

            {isPackagingDelivery && (
              <div className="p-3 rounded-xl bg-slate-900 border border-amber-500/40 space-y-1.5" data-testid="delivery-progress">
                <div className="flex items-center justify-between text-[10px] font-bold text-amber-300">
                  <span>{deliveryProgress?.label || 'Rendering…'}</span>
                  <span>{Math.round((deliveryProgress?.fraction || 0) * 100)}%</span>
                </div>
                <div className="h-1.5 rounded bg-slate-950 overflow-hidden">
                  <div className="h-full bg-amber-400 transition-all" style={{ width: `${Math.round((deliveryProgress?.fraction || 0) * 100)}%` }} />
                </div>
              </div>
            )}

            {deliveryError && !isPackagingDelivery && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-[10px] text-rose-200" data-testid="delivery-error">
                {deliveryError}
              </div>
            )}

            {!deliveryPackage && !isPackagingDelivery && (
              <button
                onClick={() => { void handleExportMasterDelivery().catch(() => undefined); }}
                data-testid="build-delivery"
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer"
              >
                RENDER & PACKAGE DELIVERY
              </button>
            )}

            {deliveryPackage && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[9px] text-slate-400">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-slate-500">LENGTH</div>
                  <div className="text-slate-200 font-bold font-mono">{deliveryPackage.durationSeconds.toFixed(1)}s</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-slate-500">INTEGRATED</div>
                  <div className="text-slate-200 font-bold font-mono">{deliveryPackage.measurement.integratedLufs} LUFS</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-slate-500">TRUE PEAK</div>
                  <div className="text-slate-200 font-bold font-mono">{deliveryPackage.measurement.truePeakDbtp} dBTP</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-slate-500">VOICES</div>
                  <div className="text-slate-200 font-bold font-mono">{deliveryPackage.eventsRendered}</div>
                </div>
              </div>
            )}

            {/* Master Audio Formats */}
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Master Audio Files</span>
              <div className="grid grid-cols-2 gap-2">
                {(deliveryPackage?.masters || []).map((f: DeliveryFile) => (
                  <button
                    key={f.name}
                    onClick={() => downloadDeliveryFile(f)}
                    data-testid={`download-${f.name}`}
                    title={`SHA-256 ${f.sha256}`}
                    className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition cursor-pointer flex items-center justify-between"
                  >
                    <div className="truncate">
                      <p className="font-bold text-[10px] text-slate-200 truncate">{f.label}</p>
                      <span className="text-[8px] text-slate-500">{formatBytes(f.byteLength)} • {f.name}</span>
                    </div>
                    <Download className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1" />
                  </button>
                ))}
                {!deliveryPackage && (
                  <span className="text-[9px] text-slate-500 col-span-2">Nothing rendered yet — sign the master, or render the package above.</span>
                )}
              </div>
            </div>

            {/* Production Stems & Manifest */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => deliveryPackage?.stemsZip && downloadDeliveryFile(deliveryPackage.stemsZip)}
                disabled={!deliveryPackage?.stemsZip}
                data-testid="download-stems"
                className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                  deliveryPackage?.stemsZip
                    ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 cursor-pointer'
                    : 'bg-slate-950 border-slate-900 text-slate-600 cursor-not-allowed'
                }`}
              >
                <div>
                  <p className="font-bold text-xs text-slate-200">Production Stems</p>
                  <span className="text-[9px] text-slate-500">
                    {deliveryPackage?.stemsZip
                      ? `${deliveryPackage.stems.length} stems • ${formatBytes(deliveryPackage.stemsZip.byteLength)} (.ZIP)`
                      : 'Not rendered yet'}
                  </span>
                </div>
                <Layers className="w-4 h-4 text-purple-400" />
              </button>

              <button
                onClick={() => deliveryPackage && downloadDeliveryFile(deliveryPackage.provenance)}
                disabled={!deliveryPackage}
                data-testid="download-provenance"
                className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                  deliveryPackage
                    ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 cursor-pointer'
                    : 'bg-slate-950 border-slate-900 text-slate-600 cursor-not-allowed'
                }`}
              >
                <div>
                  <p className="font-bold text-xs text-slate-200">SeedSignature Record</p>
                  <span className="text-[9px] text-slate-500">
                    {deliveryPackage
                      ? `${formatBytes(deliveryPackage.provenance.byteLength)} • hashes taken over the exported bytes`
                      : 'Not rendered yet'}
                  </span>
                </div>
                <FileCheck className="w-4 h-4 text-emerald-400" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
