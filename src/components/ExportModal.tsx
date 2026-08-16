import React, { useState } from 'react';
import { X, Download, FileAudio, FileCode, Music, ShieldCheck, CheckCircle2, Sparkles } from 'lucide-react';
import { Track, VocalTrackState } from '../types/daw';

interface ExportModalProps {
  isOpen?: boolean;
  projectName?: string;
  bpm?: number;
  tracks?: Track[];
  vocalTrack?: VocalTrackState;
  seedRecords?: any[];
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen = true,
  projectName = 'Dubler Vocal Beatbox Master',
  bpm = 110,
  tracks = [],
  vocalTrack,
  onClose,
}) => {
  if (!isOpen) return null;
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  const handleSimulateDownload = (format: string) => {
    setDownloadingFormat(format);

    setTimeout(() => {
      // Create mock file download trigger
      let content = `SoulSonus Studio Export Package\nProject: ${projectName}\nBPM: ${bpm}\nTracks: ${tracks.length}\nSeedSignature: Verified`;
      let fileName = `${projectName.toLowerCase().replace(/\s+/g, '_')}_export.${format === 'json' ? 'json' : 'txt'}`;

      if (format === 'json') {
        content = JSON.stringify(
          {
            project: projectName,
            bpm,
            tracks: tracks.map((t) => ({ name: t.name, instrument: t.instrument, steps: t.steps })),
            seedSignature: {
              status: 'VERIFIED',
              hash: '0x3f1a28e901b2c3d4e5f6a7b8c9d0e1f2',
              provenance: ['CAPTURED', 'INTERPRETED', 'TRANSLATED', 'COMPOSED', 'SIGNED'],
            },
          },
          null,
          2
        );
        fileName = `${projectName.toLowerCase().replace(/\s+/g, '_')}_provenance.json`;
      }

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      setDownloadingFormat(null);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative text-slate-100 flex flex-col gap-5">
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
            <Download className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-slate-100 flex items-center gap-2">
              <span>MASTER EXPORT & STEM BUNDLE ENGINE</span>
              <span className="text-xs bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-500/30">
                LAYER 11
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Export high-fidelity 24-bit WAV, MP3, isolated multitrack stems, MIDI patterns, and SeedSignature provenance.
            </p>
          </div>
        </div>

        {/* Export Formats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* WAV */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between gap-3 hover:border-slate-700 transition">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-100">24-BIT MASTER WAV</span>
                <FileAudio className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Uncompressed studio master render at {bpm} BPM.
              </p>
            </div>
            <button
              onClick={() => handleSimulateDownload('wav')}
              disabled={downloadingFormat === 'wav'}
              className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition active:scale-95 flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingFormat === 'wav' ? 'RENDERING WAV...' : 'EXPORT WAV'}</span>
            </button>
          </div>

          {/* MP3 */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between gap-3 hover:border-slate-700 transition">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-100">320 KBPS HIGH MP3</span>
                <Music className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Optimized streaming audio export.
              </p>
            </div>
            <button
              onClick={() => handleSimulateDownload('mp3')}
              disabled={downloadingFormat === 'mp3'}
              className="py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition active:scale-95 flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/10"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingFormat === 'mp3' ? 'RENDERING MP3...' : 'EXPORT MP3'}</span>
            </button>
          </div>

          {/* STEMS */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between gap-3 hover:border-slate-700 transition">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-100">MULTITRACK STEMS (ZIP)</span>
                <Sparkles className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Kick, Snare, Hi-Hat, Synth, and Vocal stems separated.
              </p>
            </div>
            <button
              onClick={() => handleSimulateDownload('stems')}
              disabled={downloadingFormat === 'stems'}
              className="py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-black text-xs transition active:scale-95 flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/10"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingFormat === 'stems' ? 'PACKAGING STEMS...' : 'EXPORT STEMS (ZIP)'}</span>
            </button>
          </div>

          {/* SeedSignature Provenance Package */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between gap-3 hover:border-slate-700 transition">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-100">SEEDSIGNATURE™ PROVENANCE (JSON)</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Cryptographic audit trail for rights, splits, and dataset provenance.
              </p>
            </div>
            <button
              onClick={() => handleSimulateDownload('json')}
              disabled={downloadingFormat === 'json'}
              className="py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition active:scale-95 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingFormat === 'json' ? 'GENERATING JSON...' : 'EXPORT PROVENANCE'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
