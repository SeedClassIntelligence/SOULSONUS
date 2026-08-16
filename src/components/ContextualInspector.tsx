import React, { useState } from 'react';
import { Track, ArrangementSection } from '../types/daw';
import { useStudioSession } from '../app/StudioSessionContext';
import { productionHistory, ProductionOperation } from '../lib/productionOperations';
import {
  Mic,
  Sliders,
  Volume2,
  Activity,
  Layers,
  Sparkles,
  Music,
  Drum,
  Disc,
  Clock,
  Target,
  ShieldCheck,
  Check,
  Radio,
  SlidersVertical,
  Maximize2,
  Tag,
  Headphones,
  TrendingUp,
  Search,
  Database,
  Play,
  RotateCcw,
  Zap,
  Hand,
  Keyboard,
  Upload,
  FileText,
  AlignLeft,
  Plus,
} from 'lucide-react';

interface VaultSoundItem {
  id: string;
  name: string;
  vault: 'R01' | 'R02' | 'R03' | 'R04';
  vaultLabel: string;
  category: string;
  subGenre: string;
  freqRange: string;
  character: string;
}

const VAULT_SOUNDS: { [instrument: string]: VaultSoundItem[] } = {
  kick: [
    { id: 'k1', name: 'TR-808 Sub Kick (54Hz)', vault: 'R01', vaultLabel: 'R01 Sample', category: 'Sub Kick', subGenre: 'Trap', freqRange: '35Hz–90Hz', character: 'Clean Sub Tail' },
    { id: 'k2', name: 'Punchy Acoustic Studio Kick', vault: 'R01', vaultLabel: 'R01 Sample', category: 'Acoustic', subGenre: 'Neo-Soul', freqRange: '60Hz–120Hz', character: 'Fast Attack' },
    { id: 'k3', name: '90s BoomBap Gritty Kick', vault: 'R01', vaultLabel: 'R01 Sample', category: 'Vintage', subGenre: 'BoomBap', freqRange: '50Hz–110Hz', character: 'Tape Warmth' },
    { id: 'k4', name: 'Analog 909 Tight Dance Kick', vault: 'R01', vaultLabel: 'R01 Sample', category: 'Electronic', subGenre: 'Dance', freqRange: '70Hz–140Hz', character: 'Snappy Click' },
  ],
  snare: [
    { id: 's1', name: 'Crispy Vintage Snare', vault: 'R01', vaultLabel: 'R01 Sample', category: 'Vintage', subGenre: 'Hip-Hop', freqRange: '180Hz–5kHz', character: 'Snap' },
    { id: 's2', name: 'Analog 909 Clap Snare', vault: 'R01', vaultLabel: 'R01 Sample', category: 'Electronic', subGenre: 'Dance', freqRange: '200Hz–8kHz', character: 'Crisp Clap' },
  ],
  hihat: [
    { id: 'h1', name: 'Tight Closed Studio Hat', vault: 'R01', vaultLabel: 'R01 Sample', category: 'Acoustic', subGenre: 'R&B', freqRange: '4kHz–16kHz', character: 'Crisp' },
    { id: 'h2', name: '808 Metallic Trap Hat', vault: 'R01', vaultLabel: 'R01 Sample', category: 'Electronic', subGenre: 'Trap', freqRange: '5kHz–18kHz', character: 'Sizzle' },
  ],
  bass: [
    { id: 'b1', name: '808 Sub Glide (Sustained)', vault: 'R03', vaultLabel: 'R03 Synth', category: '808 Sub', subGenre: 'Trap', freqRange: '30Hz–120Hz', character: 'Portamento Glide' },
    { id: 'b2', name: 'Moog Minitaur Analog Sub', vault: 'R03', vaultLabel: 'R03 Synth', category: 'Analog', subGenre: 'Electronic', freqRange: '35Hz–250Hz', character: 'Ladder Filter' },
    { id: 'b3', name: 'Upright Acoustic Double Bass', vault: 'R02', vaultLabel: 'R02 SFZ', category: 'Acoustic', subGenre: 'Jazz', freqRange: '40Hz–350Hz', character: 'Wood Body' },
  ],
  melody: [
    { id: 'm1', name: 'Rhodes Mark I Electric Piano', vault: 'R02', vaultLabel: 'R02 SFZ', category: 'Keys', subGenre: 'R&B', freqRange: '80Hz–6kHz', character: 'Bell Dynamics' },
    { id: 'm2', name: 'Cinematic Chamber Strings', vault: 'R02', vaultLabel: 'R02 SFZ', category: 'Orchestral', subGenre: 'Cinematic', freqRange: '65Hz–10kHz', character: 'Lush Legato' },
  ],
  vocal_synth: [
    { id: 'v1', name: 'Warm Tube Lead Vocal Chain', vault: 'R04', vaultLabel: 'R04 DSP', category: 'Vocal DSP', subGenre: 'Modern R&B', freqRange: '100Hz–16kHz', character: 'Tube Warmth' },
    { id: 'v2', name: 'Stereo Doubler + Saturation', vault: 'R04', vaultLabel: 'R04 DSP', category: 'Vocal DSP', subGenre: 'Pop', freqRange: '120Hz–14kHz', character: 'Wide Stereo' },
  ],
};

interface ContextualInspectorProps {
  selectedTrack: Track | null;
  activeWorkspace: string;
  sections?: ArrangementSection[];
}

export const ContextualInspector: React.FC<ContextualInspectorProps> = ({
  selectedTrack,
  activeWorkspace,
  sections = [],
}) => {
  const {
    tracks,
    setTracks,
    handleExtractStemsFromSource,
    handleExtractSingleInstrument,
    handleAddTrackLayer,
    handleRemoveTrackLayer,
    handleUpdateTrackLayer,
    handleExplodeLayersToTracks,
    activeProductionScope,
  } = useStudioSession();

  const [activeTab, setActiveTab] = useState<'QUICK' | 'SOUNDS' | 'WORKSTATION'>('QUICK');
  const [auditionSound, setAuditionSound] = useState<VaultSoundItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [timingTighten, setTimingTighten] = useState<'Original' | 'Light' | 'Tight' | 'Custom'>('Light');
  const [isExtracting, setIsExtracting] = useState(false);

  if (!selectedTrack) {
    return (
      <div className="h-full flex flex-col justify-between p-3 bg-slate-950 text-xs font-mono text-slate-500">
        <div className="space-y-2">
          <div className="flex items-center space-x-1.5 text-slate-300 font-bold border-b border-slate-800 pb-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>QUICK PRODUCTION INSPECTOR</span>
          </div>
          <p className="text-[10px] text-slate-400">Select any track on the timeline for fast polymorphic interaction.</p>
        </div>
      </div>
    );
  }

  const isVocal = selectedTrack.instrument === 'vocal_synth' || selectedTrack.name.toLowerCase().includes('vocal');
  const isDrums = selectedTrack.instrument === 'kick' || selectedTrack.instrument === 'snare' || selectedTrack.instrument === 'hihat';
  const isBass = selectedTrack.instrument === 'bass';
  const isSource = selectedTrack.isSourceTrack || selectedTrack.id.includes('source') || selectedTrack.name.toLowerCase().includes('seed') || selectedTrack.name.toLowerCase().includes('mouth') || selectedTrack.name.toLowerCase().includes('body');

  const thirdTabLabel = isSource
    ? 'DECOMPOSE'
    : isDrums
    ? 'PADS'
    : isBass
    ? 'NOTES'
    : isVocal
    ? 'PERFORMANCE'
    : 'CHORDS';

  const vaultList = VAULT_SOUNDS[selectedTrack.instrument] || VAULT_SOUNDS.melody;

  const handleCommitSound = (snd: VaultSoundItem) => {
    const prevName = selectedTrack.name;
    const op: ProductionOperation = {
      id: `op_snd_${Date.now()}`,
      type: 'ASSIGN_SOUND',
      trackId: selectedTrack.id,
      description: `Assigned ${snd.name} to ${selectedTrack.name}`,
      source: 'MANUAL_UI',
      timestamp: Date.now(),
      undo: (tList) => tList.map((t) => (t.id === selectedTrack.id ? { ...t, name: prevName } : t)),
      redo: (tList) => tList.map((t) => (t.id === selectedTrack.id ? { ...t, name: snd.name } : t)),
    };
    productionHistory.recordOperation(op);

    setTracks((prev) => prev.map((t) => (t.id === selectedTrack.id ? { ...t, name: snd.name } : t)));
    setAuditionSound(null);
  };

  const layers = selectedTrack.layers || [
    {
      id: `layer_orig_${selectedTrack.id}`,
      name: 'Layer A (Core)',
      soundId: `snd_orig_${selectedTrack.id}`,
      soundName: selectedTrack.name,
      volume: 0,
      pan: 0,
      mute: false,
      solo: false,
      character: 'Authoritative Core',
      vaultLabel: 'CORE SOUND',
      originType: 'ROOT_PERFORMANCE' as const,
    },
  ];

  return (
    <div className="h-full flex flex-col justify-between p-2.5 bg-slate-950 text-xs font-mono select-none space-y-2">
      {/* 1. Header & Polymorphic 3 Tabs */}
      <div className="border-b border-slate-800 pb-2 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            QUICK INSPECTOR
          </span>
          <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 text-[8px] border border-amber-500/20 font-bold uppercase">
            {selectedTrack.instrument}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: selectedTrack.color || '#f59e0b' }}
          />
          <h4 className="font-black text-slate-100 text-xs truncate">{selectedTrack.name}</h4>
        </div>

        {/* Polymorphic 3 Tabs: QUICK | SOUNDS | PADS/NOTES/CHORDS/PERFORMANCE */}
        <div className="grid grid-cols-3 gap-1 pt-1 text-[9px] font-bold">
          <button
            onClick={() => setActiveTab('QUICK')}
            className={`py-1 rounded border transition cursor-pointer ${
              activeTab === 'QUICK' ? 'bg-amber-500 text-slate-950 border-amber-400 font-black' : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            QUICK
          </button>
          <button
            onClick={() => setActiveTab('SOUNDS')}
            className={`py-1 rounded border transition cursor-pointer ${
              activeTab === 'SOUNDS' ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black' : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            SOUNDS
          </button>
          <button
            onClick={() => setActiveTab('WORKSTATION')}
            className={`py-1 rounded border transition cursor-pointer ${
              activeTab === 'WORKSTATION' ? 'bg-purple-500 text-slate-950 border-purple-400 font-black' : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            {thirdTabLabel}
          </button>
        </div>
      </div>

      {/* 2. Main Body Content */}
      <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
        
        {/* TAB 1: QUICK PRODUCTION CONTROLS & LAYERING */}
        {activeTab === 'QUICK' && (
          <div className="space-y-2">
            {/* Quick Volume Fader */}
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="flex justify-between text-slate-400 text-[10px]">
                <span>Track Trim Fader:</span>
                <span className="text-amber-300 font-bold">{selectedTrack.volume || 0} dB</span>
              </div>
              <input
                type="range"
                min={-20}
                max={6}
                value={selectedTrack.volume || 0}
                onChange={(e) => {
                  const vol = Number(e.target.value);
                  setTracks((prev) => prev.map((t) => (t.id === selectedTrack.id ? { ...t, volume: vol } : t)));
                }}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Quick Track Layer Stacking Widget */}
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5 text-[10px]">
              <div className="flex items-center justify-between text-slate-300 font-bold border-b border-slate-800 pb-1">
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>TRACK LAYERS ({layers.length})</span>
                </span>
                {layers.length > 1 && (
                  <button
                    onClick={() => handleExplodeLayersToTracks(selectedTrack.id)}
                    className="px-1.5 py-0.5 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-[8px] font-bold transition cursor-pointer active:scale-95"
                    title="Explode layers into individual DAW tracks"
                  >
                    EXPLODE TO TRACKS
                  </button>
                )}
              </div>

              {/* Layer list */}
              <div className="space-y-1 pt-0.5">
                {layers.map((lay, lIdx) => (
                  <div key={lay.id} className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-1 text-[9px]">
                    <div className="flex items-center gap-1 truncate max-w-[110px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span className="font-bold text-slate-200 truncate">{lay.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] text-slate-400 font-mono">{lay.volume >= 0 ? `+${lay.volume}` : lay.volume}dB</span>
                      <button
                        onClick={() => handleUpdateTrackLayer(selectedTrack.id, lay.id, { mute: !lay.mute })}
                        className={`px-1 rounded text-[8px] font-bold ${lay.mute ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400'}`}
                      >
                        M
                      </button>
                      {lIdx > 0 && (
                        <button
                          onClick={() => handleRemoveTrackLayer(selectedTrack.id, lay.id)}
                          className="text-slate-500 hover:text-rose-400 px-0.5"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Layer Buttons */}
              <div className="grid grid-cols-2 gap-1 pt-1">
                <button
                  onClick={() =>
                    handleAddTrackLayer(selectedTrack.id, {
                      name: `Layer ${String.fromCharCode(65 + layers.length)} (Sub Body)`,
                      soundName: `${selectedTrack.name} Sub Thump`,
                      volume: -3,
                      character: 'Deep Low End',
                    })
                  }
                  className="py-1 px-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-[8px] flex items-center justify-center space-x-1 transition cursor-pointer active:scale-95"
                >
                  <Plus className="w-2.5 h-2.5" />
                  <span>+ SUB LAYER</span>
                </button>
                <button
                  onClick={() =>
                    handleAddTrackLayer(selectedTrack.id, {
                      name: `Layer ${String.fromCharCode(65 + layers.length)} (Click Transient)`,
                      soundName: `${selectedTrack.name} Acoustic Snap`,
                      volume: -5,
                      character: 'Sharp Attack',
                    })
                  }
                  className="py-1 px-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-[8px] flex items-center justify-center space-x-1 transition cursor-pointer active:scale-95"
                >
                  <Plus className="w-2.5 h-2.5" />
                  <span>+ TRANSIENT</span>
                </button>
              </div>
            </div>

            {/* If Source Track: Prominent Extraction Card */}
            {isSource && (
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 space-y-2 text-[10px]">
                <div className="flex items-center justify-between font-bold text-amber-300">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    <span>SOURCE DECOMPOSITION</span>
                  </span>
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {selectedTrack.sourceModality || 'SOURCE'}
                  </span>
                </div>
                <p className="text-[9px] text-slate-300">
                  {selectedTrack.sourceModality === 'MOUTH' && 'Analyze beatbox performance and manifest into Kick, Snare, Hi-Hat, 808 Bass, and Melodic stems.'}
                  {selectedTrack.sourceModality === 'BODY' && 'Analyze physical taps/claps and manifest into Kick/Thump, Snare/Clap, Surface Tap, and Rimshot tracks.'}
                  {selectedTrack.sourceModality === 'KEYS' && 'Analyze MIDI idea and manifest into Chord Progression, Bass Root Line, and Lead Melody tracks.'}
                  {selectedTrack.sourceModality === 'AUDIO' && 'Separate imported audio into clean Drums, Bass, and Harmonic Instrument stems.'}
                  {selectedTrack.sourceModality === 'LYRICS' && 'Analyze lyric writing/cadence and manifest into Vocal Cadence Guide and Rhyme Pocket stems.'}
                  {!selectedTrack.sourceModality && 'Decompose performance into constituent musical stems.'}
                </p>
                {/* Mode Selector: Full Composition vs Single Instrument */}
                <div className="space-y-1.5 pt-1">
                  <button
                    onClick={() => {
                      setIsExtracting(true);
                      setTimeout(() => {
                        handleExtractStemsFromSource(selectedTrack.id);
                        setIsExtracting(false);
                      }, 500);
                    }}
                    disabled={isExtracting}
                    className="w-full py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer shadow-md shadow-amber-500/20 active:scale-95 disabled:opacity-50"
                  >
                    <Zap className={`w-3.5 h-3.5 ${isExtracting ? 'animate-spin' : ''}`} />
                    <span>{isExtracting ? 'ANALYZING & MANIFESTING...' : '✦ DECOMPOSE ALL STEMS'}</span>
                  </button>

                  <div className="pt-1 text-[8px] text-slate-400 font-bold flex justify-between">
                    <span>EXTRACT SINGLE INSTRUMENT:</span>
                    <span className="text-amber-400/80">RETAIN LINEAGE</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {(['kick', 'snare', 'hihat', 'bass'] as const).map((inst) => (
                      <button
                        key={inst}
                        onClick={() => handleExtractSingleInstrument(selectedTrack.id, inst)}
                        className="py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-[8px] font-bold text-slate-300 transition cursor-pointer uppercase active:scale-95"
                      >
                        +{inst}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-[8px] text-slate-500 text-center pt-0.5">
                  Original performance is preserved as authoritative root take.
                </div>
              </div>
            )}

            {/* If Vocal: Timing Tighten */}
            {isVocal && (
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-[10px]">
                <div className="flex justify-between text-slate-400">
                  <span>Timing Alignment:</span>
                  <span className="text-emerald-400 font-bold">{timingTighten}</span>
                </div>
                <div className="grid grid-cols-4 gap-1 text-[8px] font-bold">
                  {(['Original', 'Light', 'Tight', 'Custom'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimingTighten(t)}
                      className={`py-1 rounded cursor-pointer ${timingTighten === t ? 'bg-pink-500 text-slate-950' : 'bg-slate-950 text-slate-400'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Channel Inserts */}
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 space-y-1 text-[10px]">
              <div className="text-slate-300 font-bold flex justify-between">
                <span>CHANNEL DSP</span>
                <span className="text-cyan-400">Active</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Low EQ (80Hz):</span>
                <span className="text-slate-200">+2.0 dB</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Compressor:</span>
                <span className="text-slate-200">4:1 @ -16dB</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Reverb Send:</span>
                <span className="text-purple-400">15%</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LEVEL 4 SOUND & REALIZATION ROUTER */}
        {activeTab === 'SOUNDS' && (
          <div className="space-y-2.5">
            {/* Realization Capability Routes */}
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-[9px]">
              <div className="flex items-center justify-between text-slate-400 font-bold">
                <span>REALIZATION CAPABILITY:</span>
                <span className="text-[8px] text-amber-400 font-mono">E05 ENGINE</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[8px] font-bold">
                <button
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent('soulsonus:openDrawer', {
                        detail: { type: 'realization', trackId: selectedTrack.id, route: 'SAMPLE', prompt: `Sample swap for ${selectedTrack.name}` },
                      })
                    );
                  }}
                  className="p-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-left cursor-pointer transition"
                >
                  <div className="text-cyan-400 font-black">R01 SAMPLE</div>
                  <div className="text-[7.5px] text-slate-500 font-normal">Vault Hit Swap</div>
                </button>
                <button
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent('soulsonus:openDrawer', {
                        detail: { type: 'realization', trackId: selectedTrack.id, route: 'INSTRUMENT', prompt: `SoundFont instrument for ${selectedTrack.name}` },
                      })
                    );
                  }}
                  className="p-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-left cursor-pointer transition"
                >
                  <div className="text-emerald-400 font-black">R02 SOUNDFONT</div>
                  <div className="text-[7.5px] text-slate-500 font-normal">SFZ / Multi-Sample</div>
                </button>
                <button
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent('soulsonus:openDrawer', {
                        detail: { type: 'realization', trackId: selectedTrack.id, route: 'SYNTH', prompt: `Virtual synth patch for ${selectedTrack.name}` },
                      })
                    );
                  }}
                  className="p-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-left cursor-pointer transition"
                >
                  <div className="text-pink-400 font-black">R03 SYNTH</div>
                  <div className="text-[7.5px] text-slate-500 font-normal">Sub / FM / Analog</div>
                </button>
                <button
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent('soulsonus:openDrawer', {
                        detail: {
                          type: 'realization',
                          trackId: selectedTrack.id,
                          route: 'ACE_PERFORMANCE_TRANSFER',
                          prompt: `ACE Performance-preserving timbral transfer for ${selectedTrack.name}`,
                        },
                      })
                    );
                  }}
                  className="p-1.5 rounded bg-gradient-to-r from-amber-500/20 to-purple-500/20 hover:from-amber-500/30 hover:to-purple-500/30 border border-amber-500/40 text-amber-300 text-left cursor-pointer transition shadow-sm"
                >
                  <div className="text-amber-300 font-black flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                    <span>ACE TRANSFER</span>
                  </div>
                  <div className="text-[7.5px] text-amber-400/80 font-normal">Preserve Phrasing & Timing</div>
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search Sound Vault..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {auditionSound && (
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/40 space-y-1">
                <div className="flex justify-between text-[8px] text-emerald-400 font-bold">
                  <span>AUDITIONING LIVE</span>
                  <span>Looping</span>
                </div>
                <div className="font-bold text-emerald-300 text-[10px] truncate">{auditionSound.name}</div>
                <button
                  onClick={() => handleCommitSound(auditionSound)}
                  className="w-full py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[9px] transition cursor-pointer"
                >
                  ✔ COMMIT TO TRACK
                </button>
              </div>
            )}

            <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
              {vaultList.map((snd) => (
                <div
                  key={snd.id}
                  onClick={() => setAuditionSound(snd)}
                  className={`p-1.5 rounded-lg border transition cursor-pointer text-[9px] ${
                    auditionSound?.id === snd.id
                      ? 'bg-slate-900 border-emerald-500'
                      : 'bg-slate-900/50 border-slate-800 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex justify-between font-bold text-slate-200">
                    <span className="truncate">{snd.name}</span>
                    <span className="text-[8px] text-amber-400">{snd.vaultLabel}</span>
                  </div>
                  <div className="text-[8px] text-slate-400 flex justify-between pt-0.5">
                    <span>{snd.character}</span>
                    <span className="text-emerald-400">Audition 🔊</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: DEEP WORKSTATION SURFACE */}
        {activeTab === 'WORKSTATION' && (
          <div className="space-y-2">
            {/* 3A. SOURCE STEM EXTRACTION */}
            {isSource && (
              <div className="space-y-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[10px]">
                <div className="font-bold text-amber-300 flex justify-between items-center border-b border-slate-800 pb-1.5">
                  <span className="flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    <span>SOURCE DECOMPOSITION</span>
                  </span>
                  <span className="text-[8px] text-slate-500 font-mono">{selectedTrack.sourceModality || 'SOURCE'}</span>
                </div>

                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5 font-mono text-[9px]">
                  <div className="text-slate-400 font-bold">SOURCE ROOT PERFORMANCE:</div>
                  <div className="text-amber-300 font-bold">{selectedTrack.name}</div>
                  <div className="pl-2 border-l border-slate-700 space-y-0.5 text-slate-400 text-[8px]">
                    {selectedTrack.sourceModality === 'MOUTH' && (
                      <>
                        <div>├── 🥁 Kick (Beatbox Transient Onsets)</div>
                        <div>├── 🎯 Snare (Vocal Pop & Snap)</div>
                        <div>├── ✨ Hi-Hat (1/16th Rolling Tss)</div>
                        <div>├── 🎹 808 Bass (Vocal Throat Sub Fundamental)</div>
                        <div>└── 🎻 Melody / Keys (Hummed Pitch Contour)</div>
                      </>
                    )}
                    {selectedTrack.sourceModality === 'BODY' && (
                      <>
                        <div>├── 🥁 Kick / Thump (Chest / Body Tap)</div>
                        <div>├── 🎯 Snare / Clap (Hand Clap Accent)</div>
                        <div>├── ✨ Finger Drums (Surface Tap)</div>
                        <div>└── 🎯 Rimshot (Physical Knock)</div>
                      </>
                    )}
                    {selectedTrack.sourceModality === 'KEYS' && (
                      <>
                        <div>├── 🎹 Keys / Chords (Harmonic Voicings)</div>
                        <div>├── 🎹 Bass Root (Fundamental Baseline)</div>
                        <div>└── 🎻 Lead Melody (Top-Line Solo)</div>
                      </>
                    )}
                    {selectedTrack.sourceModality === 'AUDIO' && (
                      <>
                        <div>├── 🥁 Drums Stem (Source Separated)</div>
                        <div>├── 🎹 Bass Stem (Source Separated)</div>
                        <div>└── 🎻 Instruments & Harmonies (Separated)</div>
                      </>
                    )}
                    {selectedTrack.sourceModality === 'LYRICS' && (
                      <>
                        <div>├── 📝 Lead Vocal Cadence Guide (Meter & Syllables)</div>
                        <div>└── 📝 Vocal Pocket & Rhyme Stem</div>
                      </>
                    )}
                  </div>
                </div>

                {/* Extract Button */}
                <button
                  onClick={() => {
                    setIsExtracting(true);
                    setTimeout(() => {
                      handleExtractStemsFromSource(selectedTrack.id);
                      setIsExtracting(false);
                    }, 500);
                  }}
                  disabled={isExtracting}
                  className="w-full py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer shadow-md shadow-amber-500/20 active:scale-95 disabled:opacity-50"
                >
                  <Zap className={`w-3.5 h-3.5 ${isExtracting ? 'animate-spin' : ''}`} />
                  <span>{isExtracting ? 'ANALYZING & MANIFESTING...' : '✦ DECOMPOSE & MANIFEST TRACKS'}</span>
                </button>
              </div>
            )}

            {/* 3B. DRUM BEAT PADS IN INSPECTOR */}
            {isDrums && (
              <div className="space-y-2 p-2 rounded-xl bg-slate-900 border border-slate-800 text-[10px]">
                <div className="font-bold text-amber-300 flex justify-between">
                  <span>16-STEP TRIGGER GRID</span>
                  <span>1/16 Quantize</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {Array.from({ length: 16 }).map((_, padIdx) => {
                    const isHit = selectedTrack.steps[padIdx * 4];
                    return (
                      <button
                        key={padIdx}
                        onClick={() => {
                          const newSteps = [...selectedTrack.steps];
                          newSteps[padIdx * 4] = !newSteps[padIdx * 4];
                          setTracks((prev) =>
                            prev.map((t) => (t.id === selectedTrack.id ? { ...t, steps: newSteps } : t))
                          );
                        }}
                        className={`h-8 rounded-lg border text-[9px] font-bold transition cursor-pointer flex items-center justify-center ${
                          isHit
                            ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/30'
                            : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {padIdx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3C. SYNTH ADSR & RES FILTER */}
            {isBass && (
              <div className="space-y-1.5 p-2 rounded-xl bg-slate-900 border border-slate-800 text-[10px]">
                <div className="font-bold text-cyan-300 flex justify-between">
                  <span>SUB & GLIDE SYNTH</span>
                  <span>Moog Filter</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Portamento Glide: 140ms</span>
                  <input type="range" min={0} max={500} defaultValue={140} className="w-20 accent-cyan-500" />
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>60Hz Sub Boost: +3.5dB</span>
                  <input type="range" min={0} max={12} defaultValue={3.5} className="w-20 accent-cyan-500" />
                </div>
              </div>
            )}

            {/* 3D. VOCAL COMPING IN INSPECTOR */}
            {isVocal && (
              <div className="space-y-1.5 p-2 rounded-xl bg-slate-900 border border-slate-800 text-[10px]">
                <div className="font-bold text-pink-300 flex justify-between">
                  <span>TAKE STACK & COMP</span>
                  <span>4 Takes</span>
                </div>
                {['Take 01 (Natural)', 'Take 02 (Energy)', 'Take 03 (Whisper)'].map((tk, idx) => (
                  <div key={idx} className="p-1 rounded bg-slate-950 border border-slate-800 flex justify-between text-[9px] text-slate-300">
                    <span>{tk}</span>
                    <span className="text-emerald-400">Active</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Footer Telemetry */}
      <div className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[9px] text-slate-400 flex justify-between">
        <span className="text-emerald-400 font-bold">✓ Master: -0.5 dB</span>
        <span>DSP CPU: 2.8%</span>
      </div>
    </div>
  );
};
