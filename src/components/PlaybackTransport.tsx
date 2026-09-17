import React from 'react';
import { Play, Pause, Square, RotateCcw, Repeat, Clock } from 'lucide-react';
import { useStudioSession } from '../app/StudioSessionContext';

/**
 * The song's playback controls, and only those. Play, pause, return to the
 * top, loop, and where the playhead is.
 *
 * There is exactly one of these on screen, inside StudioTransportBar, which
 * every room sits under. It was briefly the other way round -- the transport
 * at the microphone, and a second bar drawn by each room that had no
 * microphone -- and that is the arrangement this replaced: five copies of the
 * play button, none of them next to the tempo they play at.
 *
 * No record button here. Record belongs with the arming and the input meaning
 * that decide what it does, which is the booth.
 */
export const PlaybackTransport: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { dawState, setDawState, handleTogglePlay, handleStopTransport } = useStudioSession();

  const step = dawState.currentStep || 0;
  const bar = Math.floor(step / 16) + 1;
  const beat = Math.floor((step % 16) / 4) + 1;
  const tick = (step % 4) + 1;

  return (
    <div className={`flex items-center gap-1.5 text-[10px] font-mono ${className}`}>
      <button
        type="button"
        id="btn-rewind"
        onClick={() => handleStopTransport()}
        className="w-8 h-8 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
        title="Rewind to Start"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        id="btn-play-pause"
        onClick={() => void handleTogglePlay()}
        className={`w-10 h-8 rounded-lg font-black flex items-center justify-center transition cursor-pointer ${
          dawState.isPlaying
            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
            : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
        }`}
        title={dawState.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
      >
        {dawState.isPlaying ? (
          <Pause className="w-4 h-4 fill-slate-950" />
        ) : (
          <Play className="w-4 h-4 fill-slate-100 ml-0.5" />
        )}
      </button>

      <button
        type="button"
        id="btn-stop"
        onClick={() => handleStopTransport()}
        className="w-8 h-8 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
        title="Stop Playhead"
      >
        <Square className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        id="btn-loop"
        onClick={() => setDawState((prev) => ({ ...prev, isLooping: !prev.isLooping }))}
        className={`px-2.5 h-8 rounded-lg font-bold border transition cursor-pointer flex items-center gap-1 ${
          dawState.isLooping
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
        }`}
        title="Toggle Continuous Loop Mode"
      >
        <Repeat className="w-3 h-3" />
        LOOP
      </button>

      <div
        className="bg-slate-950 px-2.5 h-8 rounded-lg border border-slate-800 flex items-center gap-1.5 text-amber-300 font-bold tracking-widest"
        title="Bar : beat . tick"
      >
        <Clock className="w-3 h-3 text-amber-400" />
        <span data-testid="transport-time">{`${bar}:${String(beat).padStart(2, '0')}.${tick}`}</span>
      </div>
    </div>
  );
};
