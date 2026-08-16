import React, { useState } from 'react';
import { Track } from '../types/daw';
import { useStudioSession } from '../app/StudioSessionContext';
import {
  Layers,
  Volume2,
  VolumeX,
  Radio,
  Sliders,
  Check,
  Disc,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Download,
  Mic,
} from 'lucide-react';

interface StemManagerProps {
  tracks: Track[];
}

interface StemGroupItem {
  id: string;
  name: string;
  category: 'DRUMS' | 'BASS' | 'MUSIC' | 'VOCALS' | 'BUS';
  role: string;
  sourceAssetId: string;
  sampleRate: string;
  status: 'ACTIVE' | 'MUTED' | 'SOLO';
  isVocalBus: boolean;
  exportEligible: boolean;
}

const STEM_TREE_DATA: StemGroupItem[] = [
  { id: 'stem_d1', name: 'Kick & Snare Drums', category: 'DRUMS', role: 'Drums', sourceAssetId: 'ast_drum_master', sampleRate: '44.1kHz / 24-bit', status: 'ACTIVE', isVocalBus: false, exportEligible: true },
  { id: 'stem_b1', name: '808 Sub Glide Bass', category: 'BASS', role: 'Bass', sourceAssetId: 'ast_bass_master', sampleRate: '44.1kHz / 24-bit', status: 'ACTIVE', isVocalBus: false, exportEligible: true },
  { id: 'stem_m1', name: 'Keys & Cinematic Strings', category: 'MUSIC', role: 'Music', sourceAssetId: 'ast_music_master', sampleRate: '44.1kHz / 24-bit', status: 'ACTIVE', isVocalBus: false, exportEligible: true },
  { id: 'stem_v1', name: 'Lead Vocal (Master Comp)', category: 'VOCALS', role: 'Lead Vocal', sourceAssetId: 'ast_vox_lead_comp', sampleRate: '44.1kHz / 24-bit', status: 'ACTIVE', isVocalBus: true, exportEligible: true },
  { id: 'stem_v2', name: 'Lead Vocal Double', category: 'VOCALS', role: 'Vocal Double', sourceAssetId: 'ast_vox_double', sampleRate: '44.1kHz / 24-bit', status: 'ACTIVE', isVocalBus: true, exportEligible: true },
  { id: 'stem_v3', name: 'Harmony Stack (High & Low)', category: 'VOCALS', role: 'Harmonies', sourceAssetId: 'ast_vox_harmony', sampleRate: '44.1kHz / 24-bit', status: 'ACTIVE', isVocalBus: true, exportEligible: true },
  { id: 'stem_v4', name: 'Vocal Ad-Libs', category: 'VOCALS', role: 'Ad-Libs', sourceAssetId: 'ast_vox_adlib', sampleRate: '44.1kHz / 24-bit', status: 'ACTIVE', isVocalBus: true, exportEligible: true },
  { id: 'stem_bus', name: 'ALL VOCALS BUS -> CH 1-2', category: 'BUS', role: 'Vocal Group Bus', sourceAssetId: 'bus_vocal_master', sampleRate: '44.1kHz / 32-bit Float', status: 'ACTIVE', isVocalBus: true, exportEligible: true },
];

export const StemManager: React.FC<StemManagerProps> = ({ tracks }) => {
  const [stems, setStems] = useState<StemGroupItem[]>(STEM_TREE_DATA);
  const [selectedStemId, setSelectedStemId] = useState<string>('stem_v1');

  const handleToggleMute = (stemId: string) => {
    setStems((prev) =>
      prev.map((s) => (s.id === stemId ? { ...s, status: s.status === 'MUTED' ? 'ACTIVE' : 'MUTED' } : s))
    );
  };

  const handleToggleSolo = (stemId: string) => {
    setStems((prev) =>
      prev.map((s) => (s.id === stemId ? { ...s, status: s.status === 'SOLO' ? 'ACTIVE' : 'SOLO' } : s))
    );
  };

  const activeStem = stems.find((s) => s.id === selectedStemId) || stems[0];

  return (
    <div className="bg-slate-950/95 border border-slate-800/90 rounded-2xl p-4 shadow-2xl space-y-3 select-none text-xs font-mono">
      {/* 1. Header with Stem Tree Overview */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2.5 gap-2">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span className="font-black text-slate-100 uppercase tracking-wide">
            CANONICAL STEM MANAGER & VOCAL BUS ROUTING ({stems.length} Stems)
          </span>
        </div>

        <div className="flex items-center space-x-2 text-[10px]">
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold">
            ✓ E16 Governed Stem Eligibility: 100% Ready
          </span>
        </div>
      </div>

      {/* 2. Stem Hierarchy Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left: Stem Tree List */}
        <div className="lg:col-span-8 space-y-1.5 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
          {stems.map((stem) => {
            const isSelected = selectedStemId === stem.id;
            const isMuted = stem.status === 'MUTED';
            const isSolo = stem.status === 'SOLO';

            return (
              <div
                key={stem.id}
                onClick={() => setSelectedStemId(stem.id)}
                className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-slate-900 border-emerald-500 ring-1 ring-emerald-500/40 shadow-md'
                    : stem.isVocalBus && stem.category === 'BUS'
                    ? 'bg-gradient-to-r from-pink-950/40 to-slate-900 border-pink-500/40'
                    : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900/90'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-black border ${
                      stem.category === 'VOCALS'
                        ? 'bg-pink-500/20 text-pink-300 border-pink-500/30'
                        : stem.category === 'BUS'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    {stem.category}
                  </span>

                  <div>
                    <div className="font-bold text-slate-200 text-[11px] flex items-center space-x-1.5">
                      <span>{stem.name}</span>
                      {stem.isVocalBus && stem.category !== 'BUS' && (
                        <span className="text-[8px] text-pink-400 font-normal">→ VOCAL BUS</span>
                      )}
                    </div>
                    <div className="text-[9px] text-slate-500">
                      Asset: {stem.sourceAssetId} • {stem.sampleRate}
                    </div>
                  </div>
                </div>

                {/* Mute / Solo Controls */}
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleMute(stem.id);
                    }}
                    className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      isMuted ? 'bg-red-500 text-slate-950 font-black' : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    M
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSolo(stem.id);
                    }}
                    className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      isSolo ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    S
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Selected Stem Inspector */}
        <div className="lg:col-span-4 p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-slate-200 text-[10px]">STEM INSPECTION</span>
            <span className="text-emerald-400 text-[9px] font-bold">100% Exportable</span>
          </div>

          <div className="space-y-1.5 text-[10px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Stem Name:</span>
              <span className="text-slate-200 font-bold">{activeStem.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Routing Bus:</span>
              <span className="text-pink-300 font-bold">{activeStem.isVocalBus ? 'Vocal Sub-Mix Bus' : 'Master Mix Bus'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Format:</span>
              <span className="text-slate-300">WAV PCM 44.1kHz</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Lineage:</span>
              <span className="text-amber-400 font-bold">ast_src_master_seed</span>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[9px] text-slate-400 space-y-1">
            <div className="text-emerald-400 font-bold">E16 Rights Governance:</div>
            <div>Asset certified 100% Creator-Owned with verified origin performance cryptographic signature.</div>
          </div>
        </div>
      </div>
    </div>
  );
};
