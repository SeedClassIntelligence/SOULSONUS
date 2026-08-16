import React, { useState } from 'react';
import { useStudioSession } from '../app/StudioSessionContext';
import { Track } from '../types/daw';
import {
  Search,
  Music,
  Disc,
  Drum,
  Sparkles,
  Volume2,
  Play,
  Check,
  Tag,
  Database,
  Layers,
  Wand2,
} from 'lucide-react';

interface SoundItem {
  id: string;
  name: string;
  category: 'Drums' | 'Bass' | 'Keys' | 'Strings' | 'Synths' | 'Vocals';
  subType: string;
  sourceVault: 'R01 Sample' | 'R02 SoundFont' | 'R03 Synth' | 'R04 DSP Chain';
  tag: string;
  previewNote?: string;
  license: string;
}

const SOUND_REGISTRY: SoundItem[] = [
  // Drums
  { id: 'snd_tr808_kick', name: 'TR-808 Sub Kick (54Hz)', category: 'Drums', subType: 'Kick', sourceVault: 'R01 Sample', tag: '#sub #deep #analog', license: 'COMMERCIAL' },
  { id: 'snd_punch_kick', name: 'Punchy Acoustic Kick', category: 'Drums', subType: 'Kick', sourceVault: 'R01 Sample', tag: '#punchy #tight #acoustic', license: 'COMMERCIAL' },
  { id: 'snd_vintage_snare', name: 'Crispy Vintage Snare', category: 'Drums', subType: 'Snare', sourceVault: 'R01 Sample', tag: '#crispy #snare #crack', license: 'COMMERCIAL' },
  { id: 'snd_clap_909', name: 'Analog 909 Clap', category: 'Drums', subType: 'Snare', sourceVault: 'R01 Sample', tag: '#analog #clap #warm', license: 'COMMERCIAL' },
  { id: 'snd_clean_hat', name: 'Tight Closed Hat', category: 'Drums', subType: 'Hats', sourceVault: 'R01 Sample', tag: '#crisp #clean #metal', license: 'COMMERCIAL' },

  // Bass
  { id: 'snd_glide_808', name: 'Heavy Distorted 808 Glide', category: 'Bass', subType: '808', sourceVault: 'R03 Synth', tag: '#808 #glide #sub', license: 'COMMERCIAL' },
  { id: 'snd_upright_bass', name: 'Acoustic Upright Jazz Bass', category: 'Bass', subType: 'Acoustic', sourceVault: 'R02 SoundFont', tag: '#jazz #acoustic #woody', license: 'COMMERCIAL' },
  { id: 'snd_moog_sub', name: 'Moog Minitaur Analog Sub', category: 'Bass', subType: 'Synth Bass', sourceVault: 'R03 Synth', tag: '#moog #analog #fat', license: 'COMMERCIAL' },

  // Keys & Melodies
  { id: 'snd_rhodes_mark1', name: 'Rhodes Mark I Electric Piano', category: 'Keys', subType: 'Rhodes', sourceVault: 'R02 SoundFont', tag: '#rhodes #warm #bell', license: 'COMMERCIAL' },
  { id: 'snd_grand_piano', name: 'Steinway Concert Grand Piano', category: 'Keys', subType: 'Piano', sourceVault: 'R02 SoundFont', tag: '#piano #acoustic #grand', license: 'COMMERCIAL' },
  { id: 'snd_dexed_fm', name: 'Dexed DX7 Classic FM EP', category: 'Keys', subType: 'FM Keys', sourceVault: 'R03 Synth', tag: '#dx7 #fm #glassy', license: 'COMMERCIAL' },

  // Strings
  { id: 'snd_solo_cello', name: 'Solo Expressive Cello', category: 'Strings', subType: 'Cello', sourceVault: 'R02 SoundFont', tag: '#cello #vibrato #warm', license: 'COMMERCIAL' },
  { id: 'snd_ensemble_strings', name: 'Cinematic String Ensemble', category: 'Strings', subType: 'Ensemble', sourceVault: 'R02 SoundFont', tag: '#orchestral #lush #pad', license: 'COMMERCIAL' },
  { id: 'snd_pizzicato', name: 'Chamber Pizzicato Strings', category: 'Strings', subType: 'Pizzicato', sourceVault: 'R02 SoundFont', tag: '#plucked #tight #short', license: 'COMMERCIAL' },

  // Synths
  { id: 'snd_surge_lead', name: 'Surge XT Vintage Analog Lead', category: 'Synths', subType: 'Lead', sourceVault: 'R03 Synth', tag: '#lead #analog #filter', license: 'COMMERCIAL' },
  { id: 'snd_warm_pad', name: 'Juno-106 Lush Chorus Pad', category: 'Synths', subType: 'Pad', sourceVault: 'R03 Synth', tag: '#juno #chorus #ambient', license: 'COMMERCIAL' },

  // Vocals
  { id: 'snd_vocal_chain', name: 'Warm Tube Vocal Processing Chain', category: 'Vocals', subType: 'Lead Vocal', sourceVault: 'R04 DSP Chain', tag: '#tube #opto #air', license: 'COMMERCIAL' },
  { id: 'snd_harmony_doubler', name: 'Stereo Micro-Pitch Harmony Doubler', category: 'Vocals', subType: 'Harmonies', sourceVault: 'R04 DSP Chain', tag: '#stereo #doubler #wide', license: 'COMMERCIAL' },
];

export const IntegratedSoundBrowser: React.FC = () => {
  const { tracks, setTracks, selectionContext } = useStudioSession();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [assignedSoundIds, setAssignedSoundIds] = useState<{ [trackId: string]: string }>({
    't-kick': 'snd_tr808_kick',
    't-snare': 'snd_vintage_snare',
    't-hat': 'snd_clean_hat',
    't-bass': 'snd_glide_808',
    't-melody': 'snd_rhodes_mark1',
    't-strings': 'snd_ensemble_strings',
    't-vocal': 'snd_vocal_chain',
    't-harmony': 'snd_harmony_doubler',
  });

  const selectedTrack = tracks.find((t) => t.id === selectionContext.selectedTrackId) || tracks[0] || null;

  const categories = ['ALL', 'Drums', 'Bass', 'Keys', 'Strings', 'Synths', 'Vocals'];

  const filteredSounds = SOUND_REGISTRY.filter((s) => {
    const matchCat = selectedCategory === 'ALL' || s.category === selectedCategory;
    const matchSearch =
      searchQuery === '' ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.subType.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleAssignSoundToTrack = (sound: SoundItem) => {
    if (!selectedTrack) return;
    setAssignedSoundIds((prev) => ({ ...prev, [selectedTrack.id]: sound.id }));

    // Update track name or pitch if appropriate
    setTracks((prev) =>
      prev.map((t) =>
        t.id === selectedTrack.id
          ? {
              ...t,
              name: `${sound.subType} (${sound.name.split(' ')[0]})`,
            }
          : t
      )
    );
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-3 select-none">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold text-slate-100">
              SOUND BANK & INSTRUMENT BROWSER (R01–R04)
            </h3>
            <p className="text-[10px] text-slate-400">
              Audition & swap sounds directly into target lane:{' '}
              <strong className="text-amber-300">{selectedTrack?.name}</strong>
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="flex items-center space-x-1.5 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800 w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search sounds, tags (e.g. '808', 'strings')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-200 focus:outline-none font-mono placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer whitespace-nowrap border ${
              selectedCategory === cat
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm shadow-emerald-500/20'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Sounds List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
        {filteredSounds.map((sound) => {
          const isAssigned = selectedTrack && assignedSoundIds[selectedTrack.id] === sound.id;

          return (
            <div
              key={sound.id}
              onClick={() => handleAssignSoundToTrack(sound)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                isAssigned
                  ? 'bg-slate-900 border-emerald-500/60 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                  : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'
              }`}
            >
              <div className="truncate">
                <div className="flex items-center space-x-1.5 truncate">
                  <span className="text-xs font-bold text-slate-100 truncate">{sound.name}</span>
                </div>
                <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400 pt-0.5">
                  <span className="text-emerald-400 font-semibold">{sound.sourceVault}</span>
                  <span>•</span>
                  <span className="truncate text-slate-500">{sound.tag}</span>
                </div>
              </div>

              {/* Action Pill */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAssignSoundToTrack(sound);
                }}
                className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold flex items-center space-x-1 transition flex-shrink-0 ${
                  isAssigned
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white hover:bg-slate-800'
                }`}
              >
                {isAssigned ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>ACTIVE</span>
                  </>
                ) : (
                  <span>SWAP</span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
