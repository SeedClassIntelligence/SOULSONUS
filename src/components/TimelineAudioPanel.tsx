import React from 'react';
import { AudioWaveform, ArrowLeft, ArrowRight, Trash2 } from 'lucide-react';
import { useStudioSession } from '../app/StudioSessionContext';
import { ticksToSeconds } from '../audio/audioClips';
import { TICKS_PER_16TH } from '../utils/musicMath';

const TICKS_PER_BAR = TICKS_PER_16TH * 16;

/**
 * What audio is on the timeline, and where.
 *
 * Clips have no waveform drawn on the grid yet — this is the honest interim:
 * every clip, the track it sits on, the bar it starts at, its length, and the
 * asset behind it, with controls to move or remove it. It shows what is really
 * in the project rather than implying an editor that does not exist.
 */
export const TimelineAudioPanel: React.FC = () => {
  const { tracks, audioAssets, dawState, handleMoveAudioClip, handleRemoveAudioClip } = useStudioSession();

  const clips = tracks.flatMap((track) =>
    (track.audioClips || []).map((clip) => ({ track, clip, asset: audioAssets[clip.assetId] }))
  );

  const bpm = dawState.bpm || 110;

  return (
    <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3" data-testid="timeline-audio">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 gap-2">
        <div className="flex items-center space-x-2">
          <AudioWaveform className="w-4 h-4 text-cyan-400" />
          <span className="font-black text-slate-100 uppercase tracking-wide text-xs font-mono">
            TIMELINE AUDIO
          </span>
          <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[9px] font-bold font-mono">
            {clips.length} CLIP{clips.length === 1 ? '' : 'S'}
          </span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">480 PPQ · same grid as the notes</span>
      </div>

      {clips.length === 0 ? (
        <p className="text-[11px] text-slate-500 py-3">
          No audio on the timeline yet. Record a take in the vocal booth and send it here with → TIMELINE.
        </p>
      ) : (
        <div className="space-y-2">
          {clips.map(({ track, clip, asset }) => {
            const startBar = clip.startTick / TICKS_PER_BAR + 1;
            const lengthSeconds = ticksToSeconds(clip.durationTicks, bpm);
            return (
              <div
                key={clip.id}
                data-testid={`clip-${clip.id}`}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-2 font-mono"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black text-slate-100 truncate">
                      {clip.provenance.sourceDescription || asset?.name || 'Audio clip'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[8px] font-bold text-slate-400">
                      {clip.provenance.origin}
                    </span>
                    {clip.provenance.creatorEdited && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-[8px] font-bold text-amber-300">
                        MOVED
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5 truncate">
                    {track.name} · bar {startBar.toFixed(2)} · {lengthSeconds.toFixed(2)}s ·{' '}
                    <span data-testid={`clip-start-${clip.id}`}>{clip.startTick} ticks</span>
                    {asset ? ` · ${asset.sampleRate / 1000}kHz ${asset.channels}ch · ${asset.sha256.slice(0, 8)}` : ' · asset missing'}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleMoveAudioClip(clip.id, -TICKS_PER_BAR)}
                    data-testid={`clip-left-${clip.id}`}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition cursor-pointer"
                    title="Move back one bar"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleMoveAudioClip(clip.id, TICKS_PER_BAR)}
                    data-testid={`clip-right-${clip.id}`}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition cursor-pointer"
                    title="Move forward one bar"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleRemoveAudioClip(clip.id)}
                    data-testid={`clip-remove-${clip.id}`}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-300 hover:border-rose-500/50 transition cursor-pointer"
                    title="Remove this clip from the timeline"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
