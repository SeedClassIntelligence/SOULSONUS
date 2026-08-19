import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Track } from '../types/daw';
import { useStudioSession } from '../app/StudioSessionContext';
import { ticksToSeconds, secondsToTicks } from '../audio/audioClips';
import { TICKS_PER_4_BARS } from '../utils/musicMath';

interface TrackClipLaneProps {
  track: Track;
  /** Snap in ticks, from the canvas's universal snap control. */
  snapTicks: number;
}

type Gesture =
  | { kind: 'move'; clipId: string; grabTick: number; startTick: number }
  | { kind: 'trim-start'; clipId: string; grabTick: number; startTick: number; durationTicks: number; sourceOffsetSeconds: number; sourceDurationSeconds: number }
  | { kind: 'trim-end'; clipId: string; grabTick: number; durationTicks: number; sourceDurationSeconds: number };

const snap = (ticks: number, grid: number) => (grid > 0 ? Math.round(ticks / grid) * grid : Math.round(ticks));

/**
 * Audio clips drawn on the same four bars as the notes, and edited there.
 *
 * The waveform is the asset's own peaks, sliced to the part of it the clip
 * actually plays — so trimming a clip visibly shortens the shape rather than
 * squashing it, which would draw audio the clip does not contain.
 *
 * A gesture previews locally and commits once on release. Writing on every
 * pointer move would put sixty entries in the undo stack for one drag.
 */
export const TrackClipLane: React.FC<TrackClipLaneProps> = ({ track, snapTicks }) => {
  const { audioAssets, handleUpdateAudioClip, handleRemoveAudioClip, selectedClipId, setSelectedClipId, dawState } =
    useStudioSession();

  const laneRef = useRef<HTMLDivElement | null>(null);
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [preview, setPreview] = useState<Record<string, { startTick: number; durationTicks: number }>>({});

  const clips = track.audioClips || [];
  const bpm = dawState.bpm || 110;

  const tickAtClientX = useCallback((clientX: number) => {
    const el = laneRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    return ratio * TICKS_PER_4_BARS;
  }, []);

  const beginGesture = (e: React.PointerEvent, next: Gesture) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setSelectedClipId(next.clipId);
    setGesture(next);
  };

  useEffect(() => {
    if (!gesture) return;

    const onMove = (e: PointerEvent) => {
      const tick = tickAtClientX(e.clientX);
      const clip = clips.find((c) => c.id === gesture.clipId);
      if (!clip) return;

      if (gesture.kind === 'move') {
        const next = Math.max(0, snap(gesture.startTick + (tick - gesture.grabTick), snapTicks));
        setPreview({ [clip.id]: { startTick: next, durationTicks: clip.durationTicks } });
      } else if (gesture.kind === 'trim-end') {
        const delta = tick - gesture.grabTick;
        // A clip cannot grow past the audio it has left to play.
        const maxTicks = secondsToTicks(
          Math.max(0, (audioAssets[clip.assetId]?.durationSeconds || 0) - clip.sourceOffsetSeconds),
          bpm
        );
        const next = Math.max(snapTicks || 60, Math.min(maxTicks, snap(gesture.durationTicks + delta, snapTicks)));
        setPreview({ [clip.id]: { startTick: clip.startTick, durationTicks: next } });
      } else {
        const delta = snap(tick - gesture.grabTick, snapTicks);
        // Trimming the head moves the start and eats into the source offset by
        // the same amount, so the audio under the playhead does not shift.
        const bounded = Math.max(
          -secondsToTicks(gesture.sourceOffsetSeconds, bpm),
          Math.min(gesture.durationTicks - (snapTicks || 60), delta)
        );
        setPreview({
          [clip.id]: {
            startTick: Math.max(0, gesture.startTick + bounded),
            durationTicks: gesture.durationTicks - bounded,
          },
        });
      }
    };

    const onUp = () => {
      const clip = clips.find((c) => c.id === gesture.clipId);
      const shown = preview[gesture.clipId];
      setGesture(null);
      setPreview({});
      if (!clip || !shown) return;

      if (gesture.kind === 'move') {
        if (shown.startTick !== clip.startTick) {
          handleUpdateAudioClip(clip.id, { startTick: shown.startTick }, 'Move clip');
        }
        return;
      }

      if (gesture.kind === 'trim-end') {
        if (shown.durationTicks === clip.durationTicks) return;
        handleUpdateAudioClip(
          clip.id,
          {
            durationTicks: shown.durationTicks,
            sourceDurationSeconds: ticksToSeconds(shown.durationTicks, bpm),
          },
          'Trim clip'
        );
        return;
      }

      if (shown.startTick === clip.startTick) return;
      const eaten = ticksToSeconds(shown.startTick - gesture.startTick, bpm);
      handleUpdateAudioClip(
        clip.id,
        {
          startTick: shown.startTick,
          durationTicks: shown.durationTicks,
          sourceOffsetSeconds: Math.max(0, gesture.sourceOffsetSeconds + eaten),
          sourceDurationSeconds: ticksToSeconds(shown.durationTicks, bpm),
        },
        'Trim clip'
      );
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [gesture, preview, clips, snapTicks, bpm, audioAssets, tickAtClientX, handleUpdateAudioClip]);

  if (!clips.length) return null;

  return (
    <div
      ref={laneRef}
      data-testid={`clip-lane-${track.id}`}
      className="absolute inset-x-0 bottom-0 h-1/2 z-10 pointer-events-none"
    >
      {clips.map((clip) => {
        const asset = audioAssets[clip.assetId];
        const shown = preview[clip.id] || { startTick: clip.startTick, durationTicks: clip.durationTicks };
        const leftPercent = (shown.startTick / TICKS_PER_4_BARS) * 100;
        const widthPercent = (shown.durationTicks / TICKS_PER_4_BARS) * 100;
        const isSelected = selectedClipId === clip.id;
        // Clips can legitimately sit past the four bars this grid draws; they
        // are marked rather than hidden, so nothing is silently invisible.
        const offGrid = shown.startTick >= TICKS_PER_4_BARS;

        if (offGrid) {
          return (
            <div
              key={clip.id}
              data-testid={`clip-offgrid-${clip.id}`}
              className="absolute right-0 bottom-0 h-full px-1.5 flex items-center pointer-events-auto"
              title={`${clip.provenance.sourceDescription || asset?.name || 'Clip'} sits at tick ${clip.startTick}, past the four bars this grid draws`}
            >
              <span className="text-[8px] font-mono font-bold text-cyan-300 bg-slate-950/90 border border-cyan-500/40 rounded px-1 py-0.5">
                ▸ {Math.floor(clip.startTick / 1920) + 1}
              </span>
            </div>
          );
        }

        // The slice of the asset this clip plays, so a trimmed clip draws less
        // of the shape rather than the same shape compressed.
        const peaks = asset?.peaks || [];
        const from = asset?.durationSeconds
          ? Math.floor((clip.sourceOffsetSeconds / asset.durationSeconds) * peaks.length)
          : 0;
        const to = asset?.durationSeconds
          ? Math.ceil(((clip.sourceOffsetSeconds + clip.sourceDurationSeconds) / asset.durationSeconds) * peaks.length)
          : peaks.length;
        const slice = peaks.slice(Math.max(0, from), Math.max(from + 1, to));

        return (
          <div
            key={clip.id}
            data-testid={`clip-block-${clip.id}`}
            onPointerDown={(e) =>
              beginGesture(e, { kind: 'move', clipId: clip.id, grabTick: tickAtClientX(e.clientX), startTick: clip.startTick })
            }
            style={{ left: `${leftPercent}%`, width: `${Math.max(0.6, widthPercent)}%` }}
            className={`absolute bottom-0 h-full rounded-sm overflow-hidden pointer-events-auto cursor-grab active:cursor-grabbing border ${
              isSelected
                ? 'bg-cyan-500/25 border-cyan-400 ring-1 ring-cyan-400/50'
                : 'bg-cyan-500/15 border-cyan-500/50 hover:border-cyan-400'
            }`}
            title={`${clip.provenance.sourceDescription || asset?.name || 'Audio clip'} — drag to move, edges to trim`}
          >
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox={`0 0 ${Math.max(1, slice.length)} 100`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <polyline
                points={slice.map((p, i) => `${i},${50 - p * 46}`).join(' ')}
                fill="none"
                stroke="rgb(103, 232, 249)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                opacity="0.95"
              />
              <polyline
                points={slice.map((p, i) => `${i},${50 + p * 46}`).join(' ')}
                fill="none"
                stroke="rgb(103, 232, 249)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                opacity="0.95"
              />
            </svg>

            <span className="absolute top-0 left-1 text-[7.5px] font-mono font-bold text-cyan-100 truncate max-w-[85%] pointer-events-none">
              {clip.provenance.sourceDescription || asset?.name || 'clip'}
            </span>

            <div
              data-testid={`clip-trim-start-${clip.id}`}
              onPointerDown={(e) =>
                beginGesture(e, {
                  kind: 'trim-start',
                  clipId: clip.id,
                  grabTick: tickAtClientX(e.clientX),
                  startTick: clip.startTick,
                  durationTicks: clip.durationTicks,
                  sourceOffsetSeconds: clip.sourceOffsetSeconds,
                  sourceDurationSeconds: clip.sourceDurationSeconds,
                })
              }
              className="absolute left-0 top-0 bottom-0 w-1.5 bg-cyan-400/60 hover:bg-cyan-300 cursor-ew-resize"
              title="Trim the start"
            />
            <div
              data-testid={`clip-trim-end-${clip.id}`}
              onPointerDown={(e) =>
                beginGesture(e, {
                  kind: 'trim-end',
                  clipId: clip.id,
                  grabTick: tickAtClientX(e.clientX),
                  durationTicks: clip.durationTicks,
                  sourceDurationSeconds: clip.sourceDurationSeconds,
                })
              }
              className="absolute right-0 top-0 bottom-0 w-1.5 bg-cyan-400/60 hover:bg-cyan-300 cursor-ew-resize"
              title="Trim the end"
            />

            {isSelected && (
              <button
                data-testid={`clip-delete-${clip.id}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveAudioClip(clip.id);
                }}
                className="absolute top-0 right-2 text-[9px] font-bold text-rose-300 hover:text-rose-200 px-0.5"
                title="Remove this clip"
              >
                ×
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
