import React from 'react';
import { X, Plus, Square } from 'lucide-react';
import { useStudioSession } from '../app/StudioSessionContext';
import type { Track } from '../types/daw';

/**
 * The take slots, pulled out of the create surface.
 *
 * These pads sat permanently under the live expression engine, between the
 * interpretation the studio had just made and the waveform the creator was
 * watching. The creator's own reading of that, which is the one that settles it
 * (Amendment B.v): "I wanna beatbox, create, and it go to the wave. The pads
 * are what's throwing me off -- that reminds me of sampling. It doesn't give me
 * the feel of creation, the freedom to do it, without having to go through that
 * process."
 *
 * That is a layout complaint, not a capability complaint, so nothing here is
 * removed -- Amendment D: organizing is not replacing, and depth already earned
 * is not up for renegotiation. The slots keep every behaviour they had: select
 * which one the next pass lands on, see how much is on each, stop the take from
 * the one that is recording, and add another. They are simply one reach away
 * now instead of always on screen, which is what Amendment A §17 means by
 * filed rather than hidden.
 *
 * Nothing depends on this being open. The capture row arms and stops; the
 * channels below hold the takes and can be selected there; the transport plays
 * them. A creator who never opens this drawer loses nothing.
 */
export const PerformanceTakePads: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const {
    tracks,
    setTracks,
    selectionContext,
    setSelectionContext,
    dawState,
    handleStopCapture,
  } = useStudioSession();

  if (!isOpen) return null;

  const takes = tracks.filter((t) => t.isSourceTrack);
  const selectedTrackId = selectionContext.selectedTrackId;
  /**
   * Adds an empty slot for the next pass.
   *
   * Moved here whole, with one correction: it wrote `events: []`, which is not
   * a field on `Track` -- the notes live on `noteEvents` -- so every pad this
   * created reported "0 events" however much was performed onto it. That was
   * the source of a bug fixed on the reading side earlier; this is where it was
   * written.
   */
  const handleAddNewPadSlot = () => {
    if (dawState.isRecordingMic) {
      void handleStopCapture();
      return;
    }
    const newPadId = `track_pad_${Date.now()}`;
    const padNumber = takes.length + 1;
    // The slot used to be typed by whichever modality tab was showing when the
    // button was pressed, and that tab is state on the create surface this no
    // longer sits inside. It is an empty slot either way: arming the microphone
    // makes the seed track for whatever is actually performed, and that is what
    // decides the modality. So the slot is made plain, and the performance
    // names it.
    const inst = 'oral_beatbox';
    const modality: 'MOUTH' | 'BODY' | 'KEYS' = 'MOUTH';

    const newPadTrack = {
      id: newPadId,
      name: `Pad 0${padNumber}`,
      instrument: inst,
      color: '#06b6d4',
      steps: new Array(64).fill(false),
      noteEvents: [],
      mute: false,
      solo: false,
      volume: 0,
      pitch: 'C2',
      isSourceTrack: true,
      sourceModality: modality,
      audioClips: [],
    } as unknown as Track;

    setTracks((prev) => [...prev, newPadTrack]);
    setSelectionContext((prev) => ({ ...prev, selectedTrackId: newPadId }));
  };

  return (
    <div
      className="fixed right-0 top-0 bottom-0 w-full sm:w-[440px] bg-slate-950/98 border-l border-slate-800 shadow-2xl z-50 flex flex-col font-mono select-none"
      data-testid="take-pads-drawer"
    >
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-800">
        <div className="min-w-0">
          <h2 className="text-sm font-black tracking-tight text-slate-100">PERFORMANCE TAKES</h2>
          <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
            One slot per pass. Pick which one the next take lands on, or add another.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition cursor-pointer shrink-0"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {takes.length === 0 ? (
          <p className="text-[11px] leading-relaxed text-slate-500 bg-slate-900/60 border border-slate-800 rounded-2xl p-3">
            No slots yet. One is made for you the moment you record — you do not have to
            come in here first. This is where they collect once you have a few.
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          {takes.map((takeTrack, i) => {
            const isSelected = selectedTrackId === takeTrack.id;

            return (
              <div
                key={takeTrack.id}
                data-testid={`take-pad-${takeTrack.id}`}
                onClick={() =>
                  setSelectionContext((prev) => ({ ...prev, selectedTrackId: takeTrack.id }))
                }
                className={`p-3 rounded-xl border flex flex-col justify-between h-24 transition cursor-pointer relative ${
                  isSelected
                    ? 'bg-gradient-to-b from-slate-800 to-slate-900 border-cyan-400 ring-2 ring-cyan-400/40 shadow-lg shadow-cyan-500/10'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-slate-500 uppercase tracking-wider">
                    {takeTrack.sourceModality || 'MOUTH'}
                  </span>
                  {dawState.isRecordingMic && isSelected && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  )}
                </div>

                <div className="font-black text-xs text-white truncate">
                  {takeTrack.name || `Pad 0${i + 1}`}
                </div>

                <div className="flex items-center justify-between text-[9px] text-slate-400">
                  <span>{takeTrack.noteEvents?.length || 0} events</span>
                  <span className="text-cyan-400 font-bold">READY</span>
                </div>

                {/* Stopping from the slot that is recording, kept. */}
                {dawState.isRecordingMic && isSelected && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleStopCapture();
                    }}
                    className="absolute inset-0 bg-red-600/95 rounded-xl flex items-center justify-center space-x-1.5 text-white font-black text-xs z-20 animate-pulse cursor-pointer shadow-2xl"
                    title="Click to stop recording"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>STOP</span>
                  </button>
                )}
              </div>
            );
          })}

          <button
            type="button"
            data-testid="add-take-pad"
            onClick={handleAddNewPadSlot}
            className="p-3 rounded-xl border border-dashed border-slate-700 hover:border-cyan-400 bg-slate-950/50 hover:bg-cyan-500/10 flex flex-col items-center justify-center gap-1 h-24 transition cursor-pointer text-slate-400 hover:text-cyan-300"
            title="Add another performance take slot"
          >
            <Plus className="w-5 h-5 text-cyan-400" />
            <span className="text-[10px] font-black uppercase">ADD SLOT</span>
          </button>
        </div>
      </div>

      <p className="px-4 py-3 border-t border-slate-800 text-[10px] leading-relaxed text-slate-500">
        You do not have to be in here to record. Pick a modality in the capture row, press
        record, and the take finds its slot.
      </p>
    </div>
  );
};
