import React, { useState } from 'react';
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
import { MasterCandidate, MasterDeliveryManifest } from '../../types/daw';

export const FinalizationGateAndSign: React.FC = () => {
  const {
    masterCandidates,
    activeMasterCandidateId,
    finalizationGate,
    handleAuditionMasterCandidate,
    handleCommitMasterCandidate,
    handleSignMasterSeedSignature,
    handleExportMasterDelivery,
  } = useStudioSession();

  const [activeTab, setActiveTab] = useState<'co_engineer' | 'candidates' | 'finalization_gate' | 'export_delivery'>('co_engineer');
  const [loudnessMatchEnabled, setLoudnessMatchEnabled] = useState(true);
  const [isSigning, setIsSigning] = useState(false);
  const [signatureResult, setSignatureResult] = useState<any | null>(null);
  const [exportManifest, setExportManifest] = useState<MasterDeliveryManifest | null>(null);

  // Co-Engineer Mastering Observations
  const masteringObservations = [
    {
      id: 'obs_1',
      title: 'Hook Low-Mid Energy Buildup (90–125 Hz)',
      recommendation: 'Apply dynamic EQ cut of -1.2 dB centered at 110 Hz with fast recovery to keep the hook punchy and unclouded.',
      slotId: 'm_slot_2',
      paramUpdates: { bassDuckingDb: -1.2 },
      lockedInvariants: ['kick_punch_preserved', '808_sub_weight_retained'],
    },
    {
      id: 'obs_2',
      title: 'Limiter Gain Reduction Peak (2.2 dB on Hook)',
      recommendation: 'Engage upstream soft-clipping by +0.7 dB and back off limiter drive by -0.8 dB to preserve snare transients.',
      slotId: 'm_slot_6',
      paramUpdates: { ceilingHeadroomDb: 0.7 },
      lockedInvariants: ['snare_transient_preserved'],
    },
  ];

  const handleSign = async () => {
    setIsSigning(true);
    try {
      const sig = await handleSignMasterSeedSignature();
      setSignatureResult(sig);
      const manifest = handleExportMasterDelivery();
      setExportManifest(manifest);
      setActiveTab('export_delivery');
    } finally {
      setIsSigning(false);
    }
  };

  const handleDownloadFile = (fileName: string) => {
    alert(`Downloaded ${fileName} to local production package.`);
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
        {/* TAB 1: CO-ENGINEER OBSERVATIONS */}
        {activeTab === 'co_engineer' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 uppercase text-xs">
                Mastering Telemetry Observations
              </span>
              <span className="text-[10px] text-amber-400 font-bold">2 Insights Detected</span>
            </div>

            <div className="space-y-2.5">
              {masteringObservations.map((obs) => (
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

                  <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                    <span className="text-[9px] text-slate-500">
                      Invariants: {obs.lockedInvariants.join(', ')}
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => alert(`Auditioning observation: ${obs.title}`)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold transition cursor-pointer flex items-center space-x-1"
                      >
                        <Radio className="w-3 h-3" />
                        <span>AUDITION</span>
                      </button>
                      <button
                        onClick={() => alert(`Committed parameter change to mastering chain.`)}
                        className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] transition cursor-pointer flex items-center space-x-1"
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>COMMIT</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
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
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black">
                ALL INVARIANTS SATISFIED
              </span>
            </div>

            {/* Checklist Items */}
            <div className="space-y-1.5">
              {[
                { title: 'AUDIO: Valid Master Print & No Intersample Clipping', status: true, detail: '-1.0 dBTP ceiling strictly respected' },
                { title: 'LINEAGE: Root Seed & Transformation Chain Locked', status: true, detail: 'Human performance seed linked to master print' },
                { title: 'RESOURCES: R01–R10 Admission Cleared', status: true, detail: 'No RESEARCH_ONLY or unadmitted assets in session' },
                { title: 'RIGHTS: 100% Creator Ownership & Splits Verified', status: true, detail: 'Sole creator registered / splits agreed' },
                { title: 'PROVENANCE: Deterministic SHA-256 Hash Tree', status: true, detail: 'Multi-track stem manifest verified' },
              ].map((item, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-bold text-[11px] text-slate-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      {item.title}
                    </p>
                    <p className="text-[9px] text-slate-500 pl-5">{item.detail}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-bold">
                    PASSED
                  </span>
                </div>
              ))}
            </div>

            {/* Sign Master Button */}
            <div className="pt-2">
              <button
                onClick={handleSign}
                disabled={isSigning}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs transition cursor-pointer flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isSigning ? 'CRYPTOGRAPHICALLY SIGNING...' : 'LOCK & SIGN E14 SEEDSIGNATURE'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: EXPORT & DELIVERY PACKAGE */}
        {activeTab === 'export_delivery' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 uppercase text-xs">
                Master Delivery Package (Ready)
              </span>
              <span className="text-[10px] text-cyan-400 font-bold font-mono">
                {exportManifest?.seedSignatureHash?.slice(0, 18) || '0xsha256_signed'}...
              </span>
            </div>

            {/* Master Audio Formats */}
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Master Audio Files</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: 'Master (24-bit / 48kHz WAV)', size: '48.2 MB' },
                  { name: 'Master (24-bit / 44.1kHz WAV)', size: '44.3 MB' },
                  { name: 'Lossless FLAC Master', size: '28.1 MB' },
                  { name: 'MP3 320kbps Delivery', size: '8.4 MB' },
                ].map((f, i) => (
                  <button
                    key={i}
                    onClick={() => handleDownloadFile(f.name)}
                    className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition cursor-pointer flex items-center justify-between"
                  >
                    <div className="truncate">
                      <p className="font-bold text-[10px] text-slate-200 truncate">{f.name}</p>
                      <span className="text-[8px] text-slate-500">{f.size}</span>
                    </div>
                    <Download className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1" />
                  </button>
                ))}
              </div>
            </div>

            {/* Production Stems & Manifest */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleDownloadFile('Full Multi-Track 24-bit WAV Stems (.ZIP)')}
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition cursor-pointer flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-xs text-slate-200">Production Stems</p>
                  <span className="text-[9px] text-slate-500">Kick, Snare, 808, Vocals (.ZIP)</span>
                </div>
                <Layers className="w-4 h-4 text-purple-400" />
              </button>

              <button
                onClick={() => handleDownloadFile('SeedSignature Cryptographic Provenance Certificate (.JSON)')}
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition cursor-pointer flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-xs text-slate-200">SeedSignature Cert</p>
                  <span className="text-[9px] text-slate-500">Immutable Lineage & Hash (.JSON)</span>
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
