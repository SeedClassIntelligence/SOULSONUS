import React from 'react';
import { DATASET_REGISTRY } from '../data/datasetRegistry';
import { X, ShieldCheck, AlertTriangle, Lock, FileCheck, ExternalLink } from 'lucide-react';

interface DatasetRegistryModalProps {
  isOpen?: boolean;
  onClose: () => void;
}

export const DatasetRegistryModal: React.FC<DatasetRegistryModalProps> = ({ isOpen = true, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl relative text-slate-100 flex flex-col gap-5 max-h-[85vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-slate-100 flex items-center gap-2">
              <span>DATASET GOVERNANCE & DEPENDENCY ADMISSION REGISTRY</span>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                LAYER 15
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Strict open-source license classification (APPROVED, CONDITIONAL, RESEARCH ONLY, REJECTED) ensuring zero unverified corpus ingestion.
            </p>
          </div>
        </div>

        {/* Table List */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 min-h-[300px]">
          {DATASET_REGISTRY.map((entry) => (
            <div
              key={entry.id}
              className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 hover:border-slate-700 transition"
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-extrabold text-slate-100">{entry.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-amber-400 border border-slate-800 font-bold">
                    {entry.type} • {entry.category}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                    License: {entry.license}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">{entry.notes}</p>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`px-3 py-1 rounded-xl text-xs font-black border flex items-center gap-1.5 ${
                    entry.status === 'APPROVED'
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40'
                      : entry.status === 'APPROVED WITH CONDITIONS'
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/40'
                      : 'bg-rose-500/10 text-rose-300 border-rose-500/40'
                  }`}
                >
                  {entry.status === 'APPROVED' ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  ) : entry.status === 'APPROVED WITH CONDITIONS' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Lock className="w-4 h-4 text-rose-400" />
                  )}
                  <span>{entry.status}</span>
                </span>

                <a
                  href={entry.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition border border-slate-800"
                  title="Source Repo/License"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
