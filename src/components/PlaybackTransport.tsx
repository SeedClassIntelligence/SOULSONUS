import React from 'react';
import { Play, Pause, Square, RotateCcw, Repeat, Clock } from 'lucide-react';
import { useStudioSession } from '../app/StudioSessionContext';

/**
 * The song's playback controls, and only those.
 *
 * The transport moved out of the bar above the rooms and down to the
 * microphone, where the creator is operating from. That left every room
 * without a microphone -- mix, master, release, sounds, write -- with no way
 * to start the song at all, and the mastering console drawing a playhead it
 * had no button to move.
 *
 * The owner's ruling on that: the parameters stay at the microphone, and the
 * rooms that only need to hear the song get the part that plays it. "Just
 * having record there without allowing me to set parameters like BPM, tap, to
 * be able to play it, reset and all of that stuff makes no sense." So there is
 * no record button here and no tempo field here: a control whose setup lives
 * on another screen is worse than no control. Play, pause, return to the top,
 * loop, and where the playhead is.
 *
 * One component. The microphone renders it too, so there is a single
 * implementation of play rather than two that drift.
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

/**
 * The same controls, introduced, for a room that is not the recording room.
 *
 * The label says where the rest of it is rather than leaving a creator to
 * hunt: tempo, the click and recording are one screen away, in CREATE, and
 * that is deliberate rather than missing.
 */
export const RoomPlaybackBar: React.FC<{ room: string }> = ({ room }) => (
  <div
    data-testid="room-playback-bar"
    className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 font-mono"
  >
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-[10px] font-black text-slate-300 tracking-wider whitespace-nowrap">
        HEAR THE SONG
      </span>
      <span className="hidden md:inline text-[9.5px] text-slate-500 truncate">
        {room} plays the project. Tempo, the click and recording live with the microphone, in CREATE.
      </span>
    </div>
    <PlaybackTransport />
  </div>
);
