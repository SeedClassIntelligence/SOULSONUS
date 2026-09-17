import React, { useRef, useState } from 'react';
import { Music2, Undo2 } from 'lucide-react';
import { PlaybackTransport } from './PlaybackTransport';
import { useStudioSession } from '../app/StudioSessionContext';

/**
 * Project, transport and lifecycle. One row, always there.
 *
 * This row existed once before, above the rooms, and was taken out on the
 * owner's ruling: "the record play button, loop, the timing, key, all of that
 * should be where the microphone is. It shouldn't be in the same bar with
 * create, sounds, write, record, mix, master and release."
 *
 * Both halves of that sentence were acted on then, and only the second half
 * was ever the complaint. The transport was sharing a bar with the rooms. It
 * has its own row now, between the project header and the room tabs, and it
 * carries the parameters with it -- tempo, tap, key, signature, the click --
 * because the other thing the owner said is that a play button with no way to
 * set what it plays against "makes no sense". Nothing here is a control whose
 * setup lives on a different screen.
 *
 * RECORD is deliberately not in this row. It stays at the microphone, with
 * the arming, the input meaning and the monitoring that decide what recording
 * even means on a given pass -- and because a record button in a room with no
 * visible armed channel is a button that does something the creator cannot
 * see. The counter, the tempo and the click are the song's; record is the
 * booth's.
 *
 * Level 1, and honestly so: this renders in every room, so `transport: 1` in
 * disclosureLevels is now true by construction rather than by each room
 * remembering to include a bar.
 */
export const StudioTransportBar: React.FC = () => {
  const { dawState, setDawState, handleToggleMetronome, handleTransposeAllTracks, handleUndo } =
    useStudioSession();

  /**
   * Tap tempo, moved here from the microphone with the tempo field it sets.
   *
   * Taps are held in a ref rather than state so a tap does not re-render the
   * bar before the next one lands; the run resets after a two-second gap, so
   * leaving and coming back starts a new count instead of averaging across
   * the pause.
   */
  const tapsRef = useRef<number[]>([]);
  const [tapCount, setTapCount] = useState(0);
  const tapTempo = () => {
    const now = performance.now();
    const taps = tapsRef.current;
    if (taps.length && now - taps[taps.length - 1] > 2000) taps.length = 0;
    taps.push(now);
    if (taps.length > 5) taps.shift();
    setTapCount(taps.length);
    if (taps.length < 2) return;
    const gaps = taps.slice(1).map((t, i) => t - taps[i]);
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const bpm = Math.round(60000 / mean);
    // Outside the field's own range it is a mis-tap, not a tempo.
    if (bpm >= 40 && bpm <= 240) setDawState((prev) => ({ ...prev, bpm }));
  };

  return (
    <div
      data-testid="studio-transport-bar"
      className="bg-slate-950 border-b border-slate-900 px-4 py-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[10px] select-none"
    >
      <button
        type="button"
        id="btn-undo-project"
        onClick={() => handleUndo()}
        className="w-8 h-8 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
        title="Undo the last change to the project"
      >
        <Undo2 className="w-3.5 h-3.5" />
      </button>

      <PlaybackTransport />

      <div className="h-5 w-px bg-slate-800 hidden sm:block" />

      {/* The parameters a take is measured against. They travel with the
          transport rather than living a screen away from it. */}
      <div
        className="flex items-center gap-1.5 bg-slate-950 px-2.5 h-8 rounded-lg border border-slate-800"
        title="Master project tempo (40-240 BPM)"
      >
        <span className="text-slate-500 font-bold">BPM</span>
        <input
          type="number"
          min={40}
          max={240}
          data-testid="bpm"
          value={dawState.bpm}
          onChange={(e) => setDawState((prev) => ({ ...prev, bpm: Number(e.target.value) }))}
          className="w-11 bg-transparent text-slate-100 font-black focus:outline-none text-center"
        />
      </div>

      <button
        type="button"
        id="btn-tap-tempo"
        data-testid="tap-tempo"
        onClick={tapTempo}
        className={`px-2.5 h-8 rounded-lg font-bold border transition cursor-pointer ${
          tapCount > 0
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
        }`}
        title="Tap the tempo you hear. Four taps reads it; a two-second gap starts a new count."
      >
        TAP{tapCount > 1 ? ` ${tapCount}` : ''}
      </button>

      {/* Key, with the transpose steppers it came with. Moved out of the
          project header: it is a thing a take is played against, not a piece
          of chrome. */}
      <div
        className="flex items-center gap-1 bg-slate-950 px-2.5 h-8 rounded-lg border border-slate-800"
        title="Project root key and global transposition"
      >
        <Music2 className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-slate-500 font-bold">KEY</span>
        <span className="text-cyan-300 font-black">C MIN</span>
        <div className="flex items-center gap-0.5 ml-1 border-l border-slate-800 pl-1.5">
          <button
            type="button"
            onClick={() => handleTransposeAllTracks(-1)}
            className="px-1 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-300 text-[9px] font-bold cursor-pointer"
            title="Transpose all melodic notes down 1 semitone (-1 st)"
          >
            -1
          </button>
          <button
            type="button"
            onClick={() => handleTransposeAllTracks(1)}
            className="px-1 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-300 text-[9px] font-bold cursor-pointer"
            title="Transpose all melodic notes up 1 semitone (+1 st)"
          >
            +1
          </button>
          <button
            type="button"
            onClick={() => handleTransposeAllTracks(-12)}
            className="px-1 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-300 text-[9px] font-bold cursor-pointer"
            title="Transpose all melodic notes down 1 octave (-12 st)"
          >
            -8ve
          </button>
          <button
            type="button"
            onClick={() => handleTransposeAllTracks(12)}
            className="px-1 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-300 text-[9px] font-bold cursor-pointer"
            title="Transpose all melodic notes up 1 octave (+12 st)"
          >
            +8ve
          </button>
        </div>
      </div>

      <div
        className="hidden sm:flex items-center gap-1.5 bg-slate-950 px-2.5 h-8 rounded-lg border border-slate-800"
        title="Project time signature (4 quarter-note beats per measure)"
      >
        <span className="text-slate-500 font-bold">SIG</span>
        <span className="text-slate-100 font-black">4/4</span>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          id="btn-metronome"
          onClick={() => void handleToggleMetronome()}
          className={`px-2.5 h-8 rounded-lg font-bold border transition cursor-pointer ${
            dawState.metronomeOn
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
          }`}
          title="Audible click on the quarter beats"
        >
          METRO {dawState.metronomeOn ? 'ON' : 'OFF'}
        </button>

        {/* A readout, not a selector. The grid this project is written on is
            sixteen steps to the bar, which is what the counter beside it
            divides by. There was a Q: dropdown here once with three options
            and no consumer anywhere in the app; what actually decides how a
            take is treated against the grid is the timing mode carried on the
            take itself, so this says what is true and sends you there. */}
        <div
          data-testid="grid-readout"
          className="hidden md:flex items-center gap-1.5 bg-slate-950 px-2.5 h-8 rounded-lg border border-slate-800 text-slate-400"
          title="The project grid is 1/16. How a take is treated against it is the timing mode on that take -- literal, assisted or groove -- set per pass, not globally."
        >
          <span className="text-slate-500 font-bold">GRID</span>
          <span className="text-slate-200 font-black">1/16</span>
        </div>
      </div>
    </div>
  );
};
