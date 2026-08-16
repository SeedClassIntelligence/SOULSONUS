import React, { useState } from 'react';
import { InstrumentType, SoundAsset } from '../types/daw';
import { X, Search, Volume2, Sparkles, Check, Replace } from 'lucide-react';
import { SOUND_CATALOG, searchSoundCatalog } from '../data/soundLibrary';
import * as Tone from 'tone';

interface SoundLibraryModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onReplaceTrackSound?: (instrument: InstrumentType, newSound: SoundAsset) => void;
}

export const SoundLibraryModal: React.FC<SoundLibraryModalProps> = ({
  isOpen = true,
  onClose,
  onReplaceTrackSound,
}) => {
  if (!isOpen) return null;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<InstrumentType | 'all'>('all');
  const [playingId, setPlayingId] = useState<string | null>(null);

  const filteredAssets = searchSoundCatalog(
    searchQuery,
    selectedCategory === 'all' ? undefined : selectedCategory
  );

  const handleAudition = async (asset: SoundAsset) => {
    try {
      await Tone.start();
      setPlayingId(asset.id);

      const synth = new Tone.MembraneSynth().toDestination();
      if (asset.category === 'kick') {
        synth.triggerAttackRelease('C1', '8n');
      } else if (asset.category === 'snare') {
        const noise = new Tone.NoiseSynth().toDestination();
        noise.triggerAttackRelease('16n');
      } else if (asset.category === 'hihat') {
        const metal = new Tone.MetalSynth().toDestination();
        metal.triggerAttackRelease('C6', '32n');
      } else {
        const poly = new Tone.PolySynth().toDestination();
        poly.triggerAttackRelease(['C3', 'E3', 'G3'], '8n');
      }

      setTimeout(() => setPlayingId(null), 600);
    } catch {
      setPlayingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl relative text-slate-100 flex flex-col gap-5 max-h-[85vh]">
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
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-slate-100 flex items-center gap-2">
              <span>SOUND LIBRARY ENGINE</span>
              <span className="text-xs bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded border border-purple-500/30">
                CLAP EMBEDDINGS
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Search by natural language descriptors ("fat meaty kick", "bright snare", "lo-fi dusty hat").
            </p>
          </div>
        </div>

        {/* Search Bar & Category Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search voice descriptors e.g. "fat", "meaty", "clean", "dark"...'
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 text-xs text-slate-100 rounded-xl py-2.5 px-3 pl-9 outline-none transition placeholder:text-slate-500"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {(['all', 'kick', 'snare', 'hihat', 'melody'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition capitalize whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {cat === 'all' ? 'ALL CATEGORIES' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog List */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5 min-h-[300px]">
          {filteredAssets.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs font-medium">
              No sounds matching "{searchQuery}". Try searching "fat", "crisp", "sub", or "warm".
            </div>
          ) : (
            filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className="bg-slate-950 p-3 rounded-2xl border border-slate-800/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleAudition(asset)}
                    className={`p-2.5 rounded-xl border transition ${
                      playingId === asset.id
                        ? 'bg-amber-500 text-slate-950 border-amber-400 animate-bounce'
                        : 'bg-slate-900 hover:bg-slate-800 text-amber-400 border-slate-800'
                    }`}
                    title="Audition sound"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-100">{asset.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-amber-400 uppercase font-bold border border-slate-800">
                        {asset.category}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {asset.voiceDescriptors.map((desc) => (
                        <span
                          key={desc}
                          className="text-[10px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800"
                        >
                          #{desc}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <span className="text-[10px] text-emerald-400 font-bold hidden md:inline">
                    {asset.license}
                  </span>
                  <button
                    onClick={() => {
                      onReplaceTrackSound(asset.category as InstrumentType, asset);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition active:scale-95 flex items-center gap-1.5 shadow-md shadow-amber-500/10"
                  >
                    <Replace className="w-3.5 h-3.5" />
                    <span>LOAD INTO {asset.category.toUpperCase()}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
