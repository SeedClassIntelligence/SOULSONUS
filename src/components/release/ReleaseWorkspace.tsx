import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Download,
  FileCheck,
  Users,
  GitFork,
  Sparkles,
  Disc,
  Layers,
  Check,
} from 'lucide-react';
import { useStudioSession } from '../../app/StudioSessionContext';
import { MasterDeliveryManifest, Collaborator } from '../../types/daw';
import { CompactArrangerTimeline } from '../mix/CompactArrangerTimeline';

export const ReleaseWorkspace: React.FC = () => {
  const {
    dawState,
    tracks,
    sections,
    acceptedMixPrint,
    masterCandidates,
    activeMasterCandidateId,
    finalizationGate,
    handleSignMasterSeedSignature,
    handleExportMasterDelivery,
  } = useStudioSession();

  const [isSigning, setIsSigning] = useState(false);
  const [signatureResult, setSignatureResult] = useState<any | null>(null);
  const [exportManifest, setExportManifest] = useState<MasterDeliveryManifest | null>(null);

  // Collaborators & Splits
  const [collaborators, setCollaborators] = useState<Collaborator[]>([
    { id: 'collab_1', name: 'Lead Creator (You)', email: 'creator@soulsonus.studio', role: 'owner', joinedDate: '2026-08-15' },
    { id: 'collab_2', name: 'SoulSonus Co-Producer (AI)', email: 'coproducer@soulsonus.ai', role: 'producer', joinedDate: '2026-08-15' },
  ]);

  const activeCandidate =
    masterCandidates.find((c) => c.candidateId === activeMasterCandidateId) ||
    masterCandidates[0];

  const handleSign = async () => {
    setIsSigning(true);
    try {
      const sig = await handleSignMasterSeedSignature();
      setSignatureResult(sig);
    } catch (e) {
      console.error('Signature failed', e);
    } finally {
      setIsSigning(false);
    }
  };

  const handleExport = () => {
    const manifest = handleExportMasterDelivery();
    setExportManifest(manifest);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* ZONE 1: COMPACT TIMELINE & SESSION HEADER */}
      <div className="h-44 border-b border-slate-800 flex-shrink-0 bg-slate-900/60 flex flex-col">
        <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 tracking-wider uppercase">
              Room 6: RELEASE & DEPLOYMENT
            </span>
            <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              Provenance, Rights, SeedSignature & Master Delivery
            </h2>
          </div>
          <div className="flex items-center space-x-4 text-xs font-mono text-slate-400">
            <span>Project: <strong className="text-purple-300">{dawState.projectName || 'Cyber Groove'}</strong></span>
            <span>Source Mix: <strong className="text-cyan-300">{acceptedMixPrint?.mixPrintId || 'mix_print_v1_0_0'}</strong></span>
            <span>Master Version: <strong className="text-emerald-400">v1.0.0-RELEASE</strong></span>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <CompactArrangerTimeline />
        </div>
      </div>

      {/* LOWER RELEASE FLOOR (2 COLUMNS: PROVENANCE & GATE (LEFT) vs RIGHTS & DELIVERY (RIGHT)) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 overflow-y-auto">
        
        {/* LEFT COLUMN: FINALIZATION GATE & PROVENANCE TREE (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          
          {/* FINALIZATION GATE RUNTIME CONTRACT */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 shadow-lg flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Pre-Release Finalization Gate Runtime Contract
                </h3>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                finalizationGate.isReadyToSign
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {finalizationGate.isReadyToSign ? 'GATE PASSED • READY TO SIGN' : 'GATE PENDING VERIFICATION'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs font-mono">
              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Audio Invariants (No Clip):</span>
                <span className="flex items-center text-emerald-400 font-bold gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> PASSED (-1.0 dBTP)
                </span>
              </div>
              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Root Performance Lineage:</span>
                <span className="flex items-center text-emerald-400 font-bold gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED (ast_src_orig)
                </span>
              </div>
              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Resource Admission (R01-R10):</span>
                <span className="flex items-center text-emerald-400 font-bold gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 100% ADMITTED
                </span>
              </div>
              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Rights & Collaborator Splits:</span>
                <span className="flex items-center text-emerald-400 font-bold gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 100% ALLOCATED
                </span>
              </div>
            </div>
          </div>

          {/* IMMUTABLE PROVENANCE LINEAGE GRAPH */}
          <div className="flex-1 bg-slate-900/80 border border-slate-800 rounded-lg p-4 shadow-lg flex flex-col">
            <div className="flex items-center space-x-2 border-b border-slate-800/80 pb-2 mb-3">
              <GitFork className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                End-to-End Cryptographic Provenance Lineage Graph
              </h3>
            </div>

            <div className="flex-1 flex flex-col justify-between py-2 space-y-3 font-mono text-xs">
              <div className="flex items-center gap-3 p-2 rounded bg-slate-950/50 border border-slate-800/70">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-[10px]">1</div>
                <div className="flex-1">
                  <div className="text-white font-bold">1. Root Human Performance Seed (CREATE)</div>
                  <div className="text-[11px] text-slate-400">Captured Mic Float32 PCM (Mouth Beatbox & Hum) • SHA-256: 0x8f2a...901e</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2 rounded bg-slate-950/50 border border-slate-800/70">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-[10px]">2</div>
                <div className="flex-1">
                  <div className="text-white font-bold">2. 64-Step Multitrack Production (BUILD)</div>
                  <div className="text-[11px] text-slate-400">4 Canonical Tracks • R01 Drum Vault Samples • 110 BPM C Minor</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2 rounded bg-slate-950/50 border border-slate-800/70">
                <div className="w-6 h-6 rounded-full bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400 font-bold text-[10px]">3</div>
                <div className="flex-1">
                  <div className="text-white font-bold">3. Songwriting & Vocal Suite (WRITE & RECORD)</div>
                  <div className="text-[11px] text-slate-400">4/4 Cadence Lyrics • 3 Takes Comped Non-Destructively • Diatonic Doubles</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2 rounded bg-slate-950/50 border border-slate-800/70">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-[10px]">4</div>
                <div className="flex-1">
                  <div className="text-white font-bold">4. Multichannel Mixing Console (MIX)</div>
                  <div className="text-[11px] text-slate-400">808 Ducking DSP • 32-bit Summing Bus • Accepted Mix: mix_print_v1_0_0</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2 rounded bg-slate-950/50 border border-slate-800/70">
                <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 font-bold text-[10px]">5</div>
                <div className="flex-1">
                  <div className="text-white font-bold">5. Master Audio Finalization (MASTER)</div>
                  <div className="text-[11px] text-slate-400">7-Stage DSP Rack • -14.1 LUFS-I • -1.0 dBTP • +0.91 Mono-Safe</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: RIGHTS, SEEDSIGNATURE & MASTER EXPORT (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          
          {/* RIGHTS & COLLABORATOR SPLITS */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 shadow-lg flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-3">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Rights & Collaborator Splits
                </h3>
              </div>
              <span className="text-[10px] text-amber-400 font-mono font-bold">100% OWNERSHIP</span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2 rounded bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-white font-bold">Lead Creator (You)</div>
                  <div className="text-[10px] text-slate-400">Master & Publishing Rights</div>
                </div>
                <span className="text-sm font-bold text-emerald-400">100%</span>
              </div>
              <div className="p-2 rounded bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-white font-bold">SoulSonus AI Engine</div>
                  <div className="text-[10px] text-slate-400">Creative Production Assistant</div>
                </div>
                <span className="text-sm font-bold text-slate-400">0% (Tool Only)</span>
              </div>
            </div>
          </div>

          {/* E14 SEEDSIGNATURE CRYPTOGRAPHIC LOCK */}
          <div className="bg-slate-900/80 border border-purple-500/30 rounded-lg p-4 shadow-lg flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-3">
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300">
                  E14 SeedSignature Lock
                </h3>
              </div>
              {signatureResult && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  SIGNED & LOCKED
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Cryptographically binds the root human seed, production history, vocal comps, mastering print, and rights splits into an immutable SHA-256 certificate.
            </p>

            <button
              onClick={handleSign}
              disabled={isSigning || !finalizationGate.isReadyToSign}
              className={`w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md ${
                signatureResult
                  ? 'bg-emerald-600 text-white'
                  : finalizationGate.isReadyToSign
                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isSigning ? (
                <>Signing with SHA-256...</>
              ) : signatureResult ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Master Signed ({signatureResult.hash.slice(0, 16)}...)</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>LOCK & SIGN E14 SEEDSIGNATURE</span>
                </>
              )}
            </button>
          </div>

          {/* MASTER DELIVERY PACKAGE EXPORT */}
          <div className="flex-1 bg-slate-900/80 border border-slate-800 rounded-lg p-4 shadow-lg flex flex-col justify-between">
            <div className="flex items-center space-x-2 border-b border-slate-800/80 pb-2 mb-3">
              <Download className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Master Delivery Package (.WAV / Stems / JSON)
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-3">
              <div className="p-2 rounded bg-slate-950/60 border border-slate-800 text-center">
                <div className="text-slate-400 text-[10px]">Master Format</div>
                <div className="text-white font-bold">24-bit / 48kHz WAV</div>
              </div>
              <div className="p-2 rounded bg-slate-950/60 border border-slate-800 text-center">
                <div className="text-slate-400 text-[10px]">Lossless Format</div>
                <div className="text-white font-bold">24-bit FLAC</div>
              </div>
              <div className="p-2 rounded bg-slate-950/60 border border-slate-800 text-center">
                <div className="text-slate-400 text-[10px]">Streaming Preview</div>
                <div className="text-white font-bold">320kbps MP3</div>
              </div>
              <div className="p-2 rounded bg-slate-950/60 border border-slate-800 text-center">
                <div className="text-slate-400 text-[10px]">Multitrack Stems</div>
                <div className="text-white font-bold">{tracks.length} WAV Stems</div>
              </div>
            </div>

            <button
              onClick={handleExport}
              className="w-full py-2.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg"
            >
              <Download className="w-4 h-4" />
              <span>EXPORT MASTER DELIVERY PACKAGE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
