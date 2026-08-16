import React, { useState } from 'react';
import { LyricProject, VocalTrackState } from '../types/daw';
import { PenTool, Sparkles, Mic, Volume2, Shield, Play, Square } from 'lucide-react';
import { VocalLayer } from './VocalLayer';

interface LyricVocalStudioProps {
  vocalTrack: VocalTrackState;
  onToggleRecordVocal: () => void;
  onClearVocal: () => void;
  onChangeVocalVolume: (vol: number) => void;
  onToggleVocalMute: () => void;
  onToggleVocalSolo: () => void;
  onChangeVocalDelay: (delay: number) => void;
  onChangeVocalReverb: (reverb: number) => void;
}

export const LyricVocalStudio: React.FC<LyricVocalStudioProps> = ({
  vocalTrack,
  onToggleRecordVocal,
  onClearVocal,
  onChangeVocalVolume,
  onToggleVocalMute,
  onToggleVocalSolo,
  onChangeVocalDelay,
  onChangeVocalReverb,
}) => {
  const [lyricData, setLyricData] = useState<LyricProject>({
    title: 'Untitled Vocal & Lyric Track',
    lyrics:
      '[Intro]\n(Mouth Beatbox Drop)\nYeah, SoulSonus in the studio...\n\n[Hook]\nBounce on the beatbox, beat on the grid,\nSoulSonus catch every rhythm I did.\nLow kick thump when the baseline slide,\nSoulFlow lock it when the voices align.\n\n[Verse 1]\nHumming the melody, baseline groove,\nTap on the table, watch the playhead move...',
    hookSuggestions: [
      'Bounce on the beatbox, beat on the grid...',
      'Voice is the instrument, rhythm is live...',
    ],
    verseSuggestions: [
      'Humming the melody, baseline groove...',
      'Mic catch the transient, 16th step slide...',
    ],
    cadenceNotes: '4/4 Trap / Boom-Bap hybrid cadence at 120 BPM',
    aiInfluenceAware: true,
  });

  const handleInsertSuggestion = (text: string) => {
    setLyricData((prev) => ({
      ...prev,
      lyrics: prev.lyrics + `\n\n` + text,
    }));
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col gap-5 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <PenTool className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase text-slate-100 tracking-wider">
                LYRIC & VOCAL ENGINE
              </h3>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-500/30">
                LAYER 09
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Draft lyrics with cadence mapping and record aligned vocal stems directly over the beat.
            </p>
          </div>
        </div>

        {/* Rights Awareness Badge */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold text-emerald-300">Influence-Aware Writing Engine</span>
        </div>
      </div>

      {/* Grid Layout: Lyric Workspace + Vocal Recording Control */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Lyric Editor & AI Assistant (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">LYRIC DRAFTING & CADENCE</span>
            <span className="text-[10px] font-mono text-slate-500">{lyricData.cadenceNotes}</span>
          </div>

          <textarea
            value={lyricData.lyrics}
            onChange={(e) => setLyricData((prev) => ({ ...prev, lyrics: e.target.value }))}
            rows={8}
            className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 text-xs text-slate-200 font-mono p-3 rounded-2xl outline-none leading-relaxed transition"
            placeholder="Type lyrics here..."
          />

          {/* AI Suggestions Row */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> AI Hook Ideas:
            </span>
            {lyricData.hookSuggestions.map((sug, i) => (
              <button
                key={i}
                onClick={() => handleInsertSuggestion(sug)}
                className="text-[11px] bg-slate-950 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-xl border border-slate-800 transition truncate max-w-xs"
              >
                + "{sug}"
              </button>
            ))}
          </div>
        </div>

        {/* Right: Aligned Vocal Recording & FX Chain (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <span className="text-xs font-bold text-slate-300">ALIGNED VOCAL TRACK & FX CHAIN</span>
          <VocalLayer
            vocalState={vocalTrack}
            onStartRecordVocal={onToggleRecordVocal}
            onStopRecordVocal={onToggleRecordVocal}
            onClearVocal={onClearVocal}
            onUpdateVocalState={(updates) => {
              if (updates.volume !== undefined) onChangeVocalVolume(updates.volume);
              if (updates.mute !== undefined) onToggleVocalMute();
              if (updates.solo !== undefined) onToggleVocalSolo();
              if (updates.delaySend !== undefined) onChangeVocalDelay(updates.delaySend);
              if (updates.reverbSend !== undefined) onChangeVocalReverb(updates.reverbSend);
            }}
            isPlayingSequencer={false}
            currentStep={0}
          />
        </div>
      </div>
    </div>
  );
};
