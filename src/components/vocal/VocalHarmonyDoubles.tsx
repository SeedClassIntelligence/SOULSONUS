import React, { useState, useEffect, useRef } from 'react';
import { Track, HarmonySettings } from '../../types/daw';
import { useStudioSession } from '../../app/StudioSessionContext';
import {
  auditionHarmony,
  harmonyOffsetSemitones,
  AuditionHandle,
  HarmonyInterval,
} from '../../audio/vocalAudition';
import {
  Music,
  Play,
  Check,
  Plus,
  Layers,
} from 'lucide-react';

interface VocalHarmonyDoublesProps {
  track: Track | null;
}

export const VocalHarmonyDoubles: React.FC<VocalHarmonyDoublesProps> = ({ track }) => {
  const {
    tracks,
    handleUpdateHarmonySettings,
    handleAddTrack,
    handleAddTrackLayer,
  } = useStudioSession();

  const currentTrack = track || tracks.find((t) => t.id === 't-vocal') || tracks[0];

  const harmony: HarmonySettings = currentTrack?.vocalState?.harmonySettings || {
    enabled: true,
    mode: 'third_above',
    humanizeCents: 15,
    stereoSpread: 75,
    vocalRole: 'HARMONY_HIGH',
  };

  const key = currentTrack?.vocalState?.pitchSettings?.key || 'C';
  const scale = currentTrack?.vocalState?.pitchSettings?.scale || 'MINOR';

  const [selectedInterval, setSelectedInterval] = useState<HarmonyInterval>((harmony.mode as HarmonyInterval) || 'third_above');
  const [auditioningInterval, setAuditioningInterval] = useState<string | null>(null);
  const [committedCandidate, setCommittedCandidate] = useState<string | null>(null);
  const auditionRef = useRef<AuditionHandle | null>(null);

  useEffect(() => {
    if (harmony.mode) setSelectedInterval(harmony.mode as HarmonyInterval);
  }, [harmony.mode]);

  useEffect(() => () => auditionRef.current?.stop(), []);

  if (!currentTrack) return <div className='p-6 text-center text-neutral-500'>Select a vocal track for harmony</div>;

  // Plays the candidate against its root in the track's own key and scale, with
  // the detune and spread the sliders are set to — so a third in a minor key
  // sounds minor, and a double is heard widening rather than described as wide.
  const handleAudition = async (interval: string) => {
    if (auditionRef.current) {
      auditionRef.current.stop();
      auditionRef.current = null;
    }
    setAuditioningInterval(interval);
    try {
      const handle = await auditionHarmony({
        key,
        scale,
        interval: interval as HarmonyInterval,
        humanizeCents: harmony.humanizeCents,
        stereoSpread: harmony.stereoSpread,
      });
      auditionRef.current = handle;
      await handle.finished;
    } catch (err) {
      console.warn('[VocalHarmonyDoubles] harmony audition failed:', err);
    } finally {
      auditionRef.current = null;
      setAuditioningInterval((current) => (current === interval ? null : current));
    }
  };

  // The interval labels are derived, not written down, so the card cannot say
  // "+4st" while a minor key plays +3.
  const intervalLabel = (id: HarmonyInterval) => {
    if (id === 'double') return 'Vocal Double (Tight)';
    const semis = harmonyOffsetSemitones(id, scale);
    const sign = semis > 0 ? '+' : '';
    const name = id === 'third_above' ? '3rd Above' : id === 'third_below' ? '3rd Below' : id === 'fifth' ? 'Perfect 5th' : 'Octave';
    return `${name} (${sign}${semis}st)`;
  };

  const handleCommitToNewTrack = () => {
    const name = selectedInterval === 'double' ? 'Lead Vocal Double' : `Harmony (${selectedInterval.replace('_', ' ').toUpperCase()})`;
    handleAddTrack('vocal_synth', name);
    setCommittedCandidate(name);
    setTimeout(() => setCommittedCandidate(null), 3000);
  };

  const handleCommitAsLayer = () => {
    const name = selectedInterval === 'double' ? 'Vocal Double Layer' : `Harmony Layer (${selectedInterval.replace('_', ' ')})`;
    handleAddTrackLayer(currentTrack.id, {
      name,
      character: 'Harmonic Depth',
      vaultLabel: 'AI HARMONY STEM',
      volume: -4,
      pan: selectedInterval === 'third_above' ? 0.6 : -0.6,
    });
    setCommittedCandidate(name);
    setTimeout(() => setCommittedCandidate(null), 3000);
  };

  return (
    <div className="bg-slate-950/95 border border-slate-800/90 rounded-2xl p-4 shadow-2xl space-y-4 select-none text-xs font-mono">
      {/* 1. Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2.5 gap-2">
        <div className="flex items-center space-x-2">
          <Music className="w-4 h-4 text-purple-400" />
          <span className="font-black text-slate-100 uppercase tracking-wide">
            HARMONY GENERATOR & VOCAL DOUBLES • {currentTrack.name.toUpperCase()}
          </span>
          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-black">
            {`DIATONIC ${key} ${scale}`.toUpperCase()}
          </span>
        </div>

        {committedCandidate && (
          <div className="flex items-center space-x-1.5 text-emerald-400 font-bold text-[10px] animate-fadeIn">
            <Check className="w-3.5 h-3.5" />
            <span>Successfully generated {committedCandidate}!</span>
          </div>
        )}
      </div>

      {/* 2. Intervals Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
        {[
          { id: 'third_above' as HarmonyInterval, name: intervalLabel('third_above'), desc: 'Bright uplifting hook layer', color: 'border-pink-500' },
          { id: 'third_below' as HarmonyInterval, name: intervalLabel('third_below'), desc: 'Warm chest harmony', color: 'border-purple-500' },
          { id: 'fifth' as HarmonyInterval, name: intervalLabel('fifth'), desc: 'Spacious cinematic power', color: 'border-indigo-500' },
          { id: 'octave' as HarmonyInterval, name: intervalLabel('octave'), desc: 'Falsetto sheen & sparkle', color: 'border-cyan-500' },
          { id: 'double' as HarmonyInterval, name: intervalLabel('double'), desc: 'Stereo width & weight', color: 'border-amber-500' },
        ].map((item) => {
          const isSelected = selectedInterval === item.id;
          return (
            <div
              key={item.id}
              onClick={() => {
                setSelectedInterval(item.id);
                handleUpdateHarmonySettings(currentTrack.id, { mode: item.id as any });
              }}
              className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between space-y-2 ${
                isSelected
                  ? 'bg-slate-900 border-purple-500 ring-1 ring-purple-500/40 shadow-lg'
                  : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900/90'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-100 text-xs">{item.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-purple-400 stroke-[3]" />}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">{item.desc}</p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAudition(item.id);
                }}
                data-testid={`audition-harmony-${item.id}`}
                className={`w-full py-1.5 rounded-lg text-[10px] font-black flex items-center justify-center space-x-1 transition cursor-pointer ${
                  auditioningInterval === item.id
                    ? 'bg-purple-500 text-slate-950 animate-pulse'
                    : 'bg-slate-950 text-purple-300 border border-purple-500/40 hover:bg-purple-500/20'
                }`}
              >
                <Play className="w-3 h-3 fill-current" />
                <span>{auditioningInterval === item.id ? 'PLAYING…' : 'AUDITION'}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* 3. Realization & Mix Tuning Floor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800">
        {/* Sliders */}
        <div className="space-y-2.5">
          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>Stereo Width / Spread:</span>
              <span className="text-purple-300 font-bold">{harmony.stereoSpread}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={harmony.stereoSpread}
              onChange={(e) => handleUpdateHarmonySettings(currentTrack.id, { stereoSpread: Number(e.target.value) })}
              className="w-full accent-purple-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>Humanize Micro-Detune:</span>
              <span className="text-purple-300 font-bold">±{harmony.humanizeCents} cents</span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              value={harmony.humanizeCents}
              onChange={(e) => handleUpdateHarmonySettings(currentTrack.id, { humanizeCents: Number(e.target.value) })}
              className="w-full accent-purple-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Commit Actions */}
        <div className="flex flex-col justify-between space-y-2 md:pl-3 md:border-l md:border-slate-800">
          <div className="text-[10px] text-slate-400">
            Commit the auditioned candidate into the session:
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleCommitToNewTrack}
              className="flex-1 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-slate-950 font-black text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer shadow-md shadow-purple-500/20 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>SPAWN AS NEW TRACK</span>
            </button>

            <button
              onClick={handleCommitAsLayer}
              className="flex-1 px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-purple-500/50 text-purple-300 hover:text-white font-black text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer active:scale-95"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>STACK AS LAYER</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
