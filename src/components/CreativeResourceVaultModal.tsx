import React, { useState } from 'react';
import { ResourceVaultType, CreativeResource, InstrumentType } from '../types/daw';
import { X, Search, Volume2, Sparkles, Database, Music, Sliders, ShieldCheck, Check, ChevronRight, Filter } from 'lucide-react';
import * as Tone from 'tone';

interface CreativeResourceVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResource?: (resource: CreativeResource) => void;
}

const MOCK_RESOURCE_REGISTRY: CreativeResource[] = [
  // R01 Sample Vault
  {
    resourceId: 'res_sample_808_01',
    resourceType: 'SAMPLE',
    name: 'TR-808 Sub Kick (Deep 54Hz)',
    vault: 'R01',
    category: 'kick',
    subcategory: '808',
    tags: ['sub', 'deep', 'analog', '54hz'],
    format: 'WAV 24-bit',
    durationMs: 650,
    semanticDescriptors: ['fat', 'meaty', 'deep', 'short tail'],
    admissionRecordId: 'adm_001_mit',
    createdAt: Date.now(),
  },
  {
    resourceId: 'res_sample_snare_01',
    resourceType: 'SAMPLE',
    name: 'Crispy Vintage Snare',
    vault: 'R01',
    category: 'snare',
    subcategory: 'vintage',
    tags: ['crispy', 'snare', 'short decay'],
    format: 'WAV 24-bit',
    durationMs: 350,
    semanticDescriptors: ['crispy snare with short decay'],
    admissionRecordId: 'adm_002_ccby',
    createdAt: Date.now(),
  },
  // R02 Instrument Vault
  {
    resourceId: 'res_inst_rhodes_01',
    resourceType: 'INSTRUMENT_SF2',
    name: 'Warm Dark Rhodes Mark I (SoundFont .sf2)',
    vault: 'R02',
    category: 'keyboard',
    subcategory: 'electric_piano',
    tags: ['warm', 'dark', 'rhodes', 'sf2'],
    format: 'SoundFont SF2',
    semanticDescriptors: ['warm dark Rhodes'],
    admissionRecordId: 'adm_003_lgpl',
    createdAt: Date.now(),
  },
  {
    resourceId: 'res_inst_cello_01',
    resourceType: 'INSTRUMENT_SFZ',
    name: 'Solo Cello Legato (SFZ Open Instrument)',
    vault: 'R02',
    category: 'strings',
    subcategory: 'cello',
    tags: ['cello', 'legato', 'sfz', 'orchestral'],
    format: 'SFZ Instrument',
    semanticDescriptors: ['cinematic solo cello'],
    admissionRecordId: 'adm_004_sfz_open',
    createdAt: Date.now(),
  },
  // R03 Synth & Preset Vault
  {
    resourceId: 'res_synth_bass_01',
    resourceType: 'SYNTH_PRESET',
    name: 'Surge XT Analog Sub-Bass Patch',
    vault: 'R03',
    category: 'bass',
    subcategory: 'analog_synth',
    tags: ['surge_xt', 'sub_bass', 'analog'],
    format: 'Surge XT Patch',
    semanticDescriptors: ['analog sub bass'],
    admissionRecordId: 'adm_005_gpl3',
    createdAt: Date.now(),
  },
  {
    resourceId: 'res_synth_keys_01',
    resourceType: 'SYNTH_PRESET',
    name: 'Dexed FM Electric Keys (DX7 Patch)',
    vault: 'R03',
    category: 'keyboard',
    subcategory: 'fm_synth',
    tags: ['dexed', 'dx7', 'fm_bell'],
    format: 'Dexed SYSEX',
    semanticDescriptors: ['dark FM bell'],
    admissionRecordId: 'adm_006_gpl3',
    createdAt: Date.now(),
  },
  // R04 FX / DSP Preset Vault
  {
    resourceId: 'res_dsp_vocal_01',
    resourceType: 'DSP_PRESET',
    name: 'Warm Vocal Presence Chain (EQ + DeEss + Tube)',
    vault: 'R04',
    category: 'vocal_preset',
    subcategory: 'chain',
    tags: ['vocal_chain', 'warm', 'dsp'],
    format: 'SoulSonus DSP Preset',
    semanticDescriptors: ['make my vocal warmer'],
    admissionRecordId: 'adm_007_native',
    createdAt: Date.now(),
  },
];

export const CreativeResourceVaultModal: React.FC<CreativeResourceVaultModalProps> = ({
  isOpen,
  onClose,
  onSelectResource,
}) => {
  if (!isOpen) return null;

  const [activeVault, setActiveVault] = useState<ResourceVaultType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);

  const filteredResources = MOCK_RESOURCE_REGISTRY.filter((res) => {
    const matchesVault = activeVault === 'ALL' || res.vault === activeVault;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      res.name.toLowerCase().includes(q) ||
      res.tags.some((t) => t.toLowerCase().includes(q)) ||
      (res.semanticDescriptors && res.semanticDescriptors.some((d) => d.toLowerCase().includes(q)));
    return matchesVault && matchesSearch;
  });

  const handleAudition = async (resource: CreativeResource) => {
    try {
      await Tone.start();
      setPlayingId(resource.resourceId);
      const synth = new Tone.PolySynth().toDestination();

      if (resource.category === 'kick' || resource.category === 'bass') {
        synth.triggerAttackRelease(['C1', 'G1'], '8n');
      } else if (resource.category === 'keyboard' || resource.category === 'strings') {
        synth.triggerAttackRelease(['C3', 'E3', 'G3'], '4n');
      } else {
        synth.triggerAttackRelease(['C4', 'E4'], '8n');
      }

      setTimeout(() => setPlayingId(null), 800);
    } catch {
      setPlayingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-100">Level 4 — Creative Resource Registry</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[10px] font-mono border border-emerald-500/30">
                  R01–R10 GOVERNED VAULTS
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Browse samples, SoundFont/SFZ instruments, synth patches, and DSP parameter chains.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* E04 CLAP Semantic Search & Vault Filter Toolbar */}
        <div className="p-6 py-4 bg-slate-950/60 border-b border-slate-800/80 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="E04 CLAP Semantic Search: e.g. 'deep meaty kick', 'warm dark Rhodes', 'crispy snare'..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:border-amber-500 focus:outline-none font-mono placeholder:text-slate-500"
            />
          </div>

          {/* Vault Tabs */}
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <button
              onClick={() => setActiveVault('ALL')}
              className={`px-3 py-1.5 rounded-lg border transition-all ${
                activeVault === 'ALL'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              All Vaults
            </button>
            <button
              onClick={() => setActiveVault('R01')}
              className={`px-3 py-1.5 rounded-lg border transition-all ${
                activeVault === 'R01'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              R01 Sample Vault (.wav)
            </button>
            <button
              onClick={() => setActiveVault('R02')}
              className={`px-3 py-1.5 rounded-lg border transition-all ${
                activeVault === 'R02'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              R02 Instrument Vault (.sf2 / .sfz)
            </button>
            <button
              onClick={() => setActiveVault('R03')}
              className={`px-3 py-1.5 rounded-lg border transition-all ${
                activeVault === 'R03'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              R03 Synth Vault (Surge / Dexed)
            </button>
            <button
              onClick={() => setActiveVault('R04')}
              className={`px-3 py-1.5 rounded-lg border transition-all ${
                activeVault === 'R04'
                  ? 'bg-pink-500/20 text-pink-300 border-pink-500/40'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              R04 FX / DSP Chains
            </button>
          </div>
        </div>

        {/* Resources Grid */}
        <div className="p-6 overflow-y-auto max-h-[50vh] space-y-3">
          {filteredResources.map((resource) => {
            const isPlaying = playingId === resource.resourceId;
            return (
              <div
                key={resource.resourceId}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 hover:border-slate-700 transition-all flex items-center justify-between gap-4"
              >
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleAudition(resource)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isPlaying
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-slate-100">{resource.name}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-cyan-300 border border-slate-700">
                        {resource.vault}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[10px] font-mono border border-emerald-500/30">
                        COMMERCIAL APPROVED
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {resource.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 rounded bg-slate-900 text-[10px] font-mono text-slate-400 border border-slate-800">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onSelectResource?.(resource);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
                >
                  <span>Select Asset</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2 font-mono text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>All assets audited by E16 Dataset Admission Engine</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold cursor-pointer"
          >
            Close Vault
          </button>
        </div>
      </div>
    </div>
  );
};
