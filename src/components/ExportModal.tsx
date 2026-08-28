import React from 'react';
import { X, Download, FileAudio, FileCode, Music, ShieldCheck, Layers, Loader2 } from 'lucide-react';
import { useStudioSession } from '../app/StudioSessionContext';
import { downloadDeliveryFile, formatBytes, DeliveryFile } from '../audio/deliveryPackage';

interface ExportModalProps {
  isOpen?: boolean;
  onClose: () => void;
}

const iconFor = (name: string) => {
  const ext = name.split('.').pop() || '';
  switch (ext) {
    case 'wav': return <FileAudio className="w-4 h-4 text-amber-400" />;
    case 'flac': return <Music className="w-4 h-4 text-cyan-400" />;
    case 'zip': return <Layers className="w-4 h-4 text-purple-400" />;
    case 'json': return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
    default: return <FileCode className="w-4 h-4 text-slate-400" />;
  }
};

/**
 * Export used to write a four-line text file and name it a WAV — the same text
 * whichever format was chosen. It now renders the project through the master
 * bus, encodes it, bounces every track for stems and hands over the real files.
 */
export const ExportModal: React.FC<ExportModalProps> = ({ isOpen = true, onClose }) => {
  const {
    dawState,
    handleExportMasterDelivery,
    deliveryPackage,
    isPackagingDelivery,
    deliveryProgress,
    deliveryError,
  } = useStudioSession();

  if (!isOpen) return null;

  const files: DeliveryFile[] = deliveryPackage
    ? [...deliveryPackage.masters, ...(deliveryPackage.stemsZip ? [deliveryPackage.stemsZip] : []), deliveryPackage.provenance]
    : [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative text-slate-100 flex flex-col gap-5">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-slate-100">MASTER EXPORT &amp; STEM BUNDLE</h2>
            <p className="text-xs text-slate-400">
              Renders {dawState.projectName} through the master bus at {dawState.bpm} BPM, then encodes 24-bit and
              16-bit WAV, FLAC, per-track stems and a provenance record.
            </p>
          </div>
        </div>

        {/* Render control */}
        {!isPackagingDelivery && (
          <button
            onClick={() => { void handleExportMasterDelivery().catch(() => undefined); }}
            data-testid="render-export-package"
            className="py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition active:scale-[0.99] flex items-center justify-center gap-2 shadow-md shadow-amber-500/10"
          >
            <Download className="w-4 h-4" />
            <span>{deliveryPackage ? 'RE-RENDER PACKAGE' : 'RENDER EXPORT PACKAGE'}</span>
          </button>
        )}

        {isPackagingDelivery && (
          <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-2" data-testid="export-progress">
            <div className="flex items-center justify-between text-xs font-bold text-amber-300">
              <span className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {deliveryProgress?.label || 'Rendering…'}
              </span>
              <span>{Math.round((deliveryProgress?.fraction || 0) * 100)}%</span>
            </div>
            <div className="h-2 rounded bg-slate-900 overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all"
                style={{ width: `${Math.round((deliveryProgress?.fraction || 0) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {deliveryError && !isPackagingDelivery && (
          <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200" data-testid="export-error">
            {deliveryError}
          </div>
        )}

        {deliveryPackage && !isPackagingDelivery && (
          <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1 font-mono" data-testid="export-summary">
            <span>{deliveryPackage.durationSeconds.toFixed(1)}s</span>
            <span>{deliveryPackage.measurement.integratedLufs} LUFS</span>
            <span>{deliveryPackage.measurement.truePeakDbtp} dBTP</span>
            <span>{deliveryPackage.eventsRendered} voices</span>
            <span>{deliveryPackage.stems.length} stems</span>
            {deliveryPackage.truePeakLimiting && deliveryPackage.truePeakLimiting.maxGainReductionDb > 0.01 && (
              <span>
                true-peak limiter: {deliveryPackage.truePeakLimiting.inputTruePeakDbtp} →{' '}
                {deliveryPackage.truePeakLimiting.outputTruePeakDbtp} dBTP (−
                {deliveryPackage.truePeakLimiting.maxGainReductionDb} dB)
              </span>
            )}
            {deliveryPackage.silentTracks.length > 0 && (
              <span className="text-amber-300">silent, not exported: {deliveryPackage.silentTracks.join(', ')}</span>
            )}
          </div>
        )}

        {/* Files */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {files.map((file) => (
            <button
              key={file.name}
              onClick={() => downloadDeliveryFile(file)}
              data-testid={`export-download-${file.name}`}
              title={`SHA-256 ${file.sha256}`}
              className="bg-slate-950 p-4 rounded-2xl border border-slate-800 hover:border-slate-700 text-left transition flex items-center justify-between gap-3 cursor-pointer"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {iconFor(file.name)}
                  <span className="text-xs font-black text-slate-100 truncate">{file.label}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 truncate">
                  {formatBytes(file.byteLength)} • {file.name}
                </p>
              </div>
              <Download className="w-4 h-4 text-cyan-400 shrink-0" />
            </button>
          ))}

          {!deliveryPackage && !isPackagingDelivery && (
            <p className="text-[11px] text-slate-500 sm:col-span-2">
              Nothing has been rendered yet. Every file offered here is produced from the project as it stands —
              there is no placeholder to download.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
