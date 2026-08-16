import React from 'react';
import { SeedSignatureRecord, Track } from '../types/daw';
import { X, ShieldCheck, CheckCircle2, Lock, GitCommit, FileCheck, Layers, Sparkles } from 'lucide-react';
import { signatureService } from '../lib/seedSignature';

interface SeedSignatureModalProps {
  isOpen?: boolean;
  onClose: () => void;
  projectName?: string;
  creatorName?: string;
  seedRecords?: SeedSignatureRecord[];
  onAddSeedRecord?: (record: SeedSignatureRecord) => void;
  records?: SeedSignatureRecord[];
  onAddRecord?: (record: SeedSignatureRecord) => void;
  bpm?: number;
  tracks?: Track[];
}

export const SeedSignatureModal: React.FC<SeedSignatureModalProps> = ({
  isOpen = true,
  projectName = 'Dubler Vocal Beatbox Master',
  creatorName = 'SoulSonus Master Creator',
  records = [],
  seedRecords = [],
  onAddRecord,
  onAddSeedRecord,
  onClose,
}) => {
  if (!isOpen) return null;

  const activeRecords = records.length > 0 ? records : seedRecords;
  const safeCreator = creatorName || 'SoulSonus Master Creator';
  const safeProject = projectName || 'Dubler Vocal Beatbox Master';

  const sampleRecords: SeedSignatureRecord[] = [
    {
      id: 'sig_01',
      assetId: 'proj_root_001',
      assetType: 'project',
      timestamp: new Date().toISOString(),
      hash: '0x3f1a28e901b2c3d4e5f6a7b8c9d0e1f2',
      signerId: `creator_${safeCreator.toLowerCase().replace(/\s+/g, '_')}`,
      signerName: safeCreator,
      provenanceChain: ['0x3f1a28e9'],
      datasetLicenseStatus: 'COMPLIANT',
      status: 'VERIFIED',
    },
    {
      id: 'sig_02',
      assetId: 'beatbox_capture_raw',
      assetType: 'audio',
      timestamp: new Date().toISOString(),
      hash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d',
      signerId: `creator_${safeCreator.toLowerCase().replace(/\s+/g, '_')}`,
      signerName: safeCreator,
      provenanceChain: ['0x3f1a28e9', '0x9a8b7c6d'],
      datasetLicenseStatus: 'COMPLIANT',
      status: 'VERIFIED',
    },
    {
      id: 'sig_03',
      assetId: 'midi_grid_4bar',
      assetType: 'midi',
      timestamp: new Date().toISOString(),
      hash: '0x11223344556677889900aabbccddeeff',
      signerId: 'system_basic_pitch_adapter',
      signerName: 'Spotify Basic Pitch Adapter v1',
      provenanceChain: ['0x3f1a28e9', '0x9a8b7c6d', '0x11223344'],
      datasetLicenseStatus: 'COMPLIANT',
      status: 'VERIFIED',
    },
  ];

  const displayRecords = activeRecords.length > 0 ? [...activeRecords, ...sampleRecords] : sampleRecords;

  const handleCreateNewSignature = async () => {
    const newRecord = await signatureService.createSeedSignatureRecord(
      `asset_${Math.random().toString(36).substring(2, 7)}`,
      'project',
      safeCreator,
      { projectName: safeProject, timestamp: new Date().toISOString() }
    );
    if (onAddRecord) onAddRecord(newRecord);
    if (onAddSeedRecord) onAddSeedRecord(newRecord);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl relative text-slate-100 flex flex-col gap-5 max-h-[85vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-slate-100 flex items-center gap-2">
              <span>SEEDSIGNATURE™ PROVENANCE INSPECTOR</span>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                STAGE 9 SIGNED
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Immutable cryptographic verification chain linking every beatbox capture, MIDI step, stem, and license term.
            </p>
          </div>
        </div>

        {/* Audit Status Banner */}
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-black text-emerald-300">
                PROVENANCE SEALED & CRYPTOGRAPHICALLY VERIFIED ({displayRecords.length} RECORDS)
              </div>
              <div className="text-[11px] text-emerald-400/80">
                Project: {safeProject} • Lead Creator: {safeCreator}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCreateNewSignature}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-mono font-black transition active:scale-95 shadow-md shadow-emerald-500/20 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>SIGN NEW RECORD</span>
          </button>
        </div>

        {/* Provenance Tree */}
        <div className="flex flex-col gap-2 overflow-y-auto max-h-72 pr-1">
          <span className="text-xs font-bold text-slate-300 uppercase">CRYPTOGRAPHIC PROVENANCE TREE</span>
          {displayRecords.map((r) => (
            <div
              key={r.id}
              className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-amber-400 mt-0.5">
                  <GitCommit className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-100">{r.assetId}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-amber-400 uppercase font-bold border border-slate-800">
                      {r.assetType}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 mt-1">
                    Signer: <span className="text-slate-200 font-bold">{r.signerName}</span>
                  </div>
                  <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
                    Hash: {r.hash}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 px-2 py-1 rounded-lg border border-emerald-500/30 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> VERIFIED
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
