import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Track, NoteEvent, PianoRollTool } from '../../types/daw';
import { useStudioSession } from '../../app/StudioSessionContext';
import { audioEngine } from '../../audio/audioEngine';
import {
  PPQ,
  TICKS_PER_16TH,
  TICKS_PER_BEAT,
  TICKS_PER_BAR,
  NOTE_NAMES,
  midiToNoteName,
  noteNameToMidi,
  snapTick,
  isNoteInScale,
  snapMidiToScale,
  stepToTick,
  tickToStep,
} from '../../utils/musicMath';
import {
  MousePointer,
  Pencil,
  Scissors,
  Eraser,
  Sparkles,
  ArrowLeftRight,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Volume2,
  Sliders,
  Check,
  Zap,
} from 'lucide-react';

interface TrackPianoRollEditorProps {
  track: Track;
  onClose?: () => void;
}

// Display range: C2 (MIDI 36) to C6 (MIDI 84) - 4 octaves = 49 notes
const MIN_MIDI = 36; // C2
const MAX_MIDI = 84; // C6
const TOTAL_PITCHES = MAX_MIDI - MIN_MIDI + 1;

export const TrackPianoRollEditor: React.FC<TrackPianoRollEditorProps> = ({ track }) => {
  const {
    dawState,
    handleAddNote,
    handleMoveNotes,
    handleResizeNote,
    handleSplitNote,
    handleDeleteNotes,
    handleSetNoteVelocity,
    handleSetNoteLyric,
    handleTransposeNotes,
    handleQuantizeTrackNotes,
    selectedNoteIds,
    setSelectedNoteIds,
  } = useStudioSession();

  const [activeTool, setActiveTool] = useState<PianoRollTool>('POINTER');
  const [snapGridTicks, setSnapGridTicks] = useState<number>(TICKS_PER_16TH); // 120 ticks
  const [snapToScale, setSnapToScale] = useState<boolean>(true);
  const [showVelocityLane, setShowVelocityLane] = useState<boolean>(false);
  const [showWaveformGhost, setShowWaveformGhost] = useState<boolean>(true);
  const [editingLyricNoteId, setEditingLyricNoteId] = useState<string | null>(null);
  const [lyricInputText, setLyricInputText] = useState<string>('');

  const gridContainerRef = useRef<HTMLDivElement>(null);
  const pianoRulerRef = useRef<HTMLDivElement>(null);

  const notes = track.noteEvents || [];
  const projectKey = 'C';
  const projectScale = 'minor';

  const isDrumTrack =
    track.instrument === 'kick' ||
    track.instrument === 'snare' ||
    track.instrument === 'hihat' ||
    track.instrument === 'percussion';

  const defaultDrumMidi = useMemo(() => {
    return noteNameToMidi(track.pitch || (track.instrument === 'kick' ? 'C1' : track.instrument === 'snare' ? 'D1' : 'F#1'));
  }, [track.pitch, track.instrument]);

  // Build sorted array of MIDI notes descending (highest on top)
  const pitchList = useMemo(() => {
    if (isDrumTrack) {
      return [defaultDrumMidi];
    }
    const list: number[] = [];
    for (let m = MAX_MIDI; m >= MIN_MIDI; m--) {
      list.push(m);
    }
    return list;
  }, [isDrumTrack, defaultDrumMidi]);

  // Center view around track's notes or middle octave on mount
  useEffect(() => {
    if (gridContainerRef.current && !isDrumTrack) {
      // Find average pitch of existing notes or C4 (MIDI 60)
      const avgMidi =
        notes.length > 0
          ? Math.round(notes.reduce((acc, n) => acc + n.midiNote, 0) / notes.length)
          : 60;
      const pitchIndex = MAX_MIDI - avgMidi;
      const rowHeight = 22; // px
      gridContainerRef.current.scrollTop = Math.max(0, pitchIndex * rowHeight - 120);
    }
  }, [track.id, isDrumTrack]);

  // Sound Preview helper
  const previewMidiPitch = useCallback(
    (midi: number, durationSec = 0.25) => {
      const pitchName = midiToNoteName(midi);
      if (track.instrument === 'bass') {
        audioEngine.triggerBass(pitchName, undefined, 0.9, track, durationSec);
      } else if (track.instrument === 'kick') {
        audioEngine.triggerKick(pitchName, undefined, 0.9, track, durationSec);
      } else if (track.instrument === 'snare') {
        audioEngine.triggerSnare(undefined, 0.9, track, durationSec);
      } else if (track.instrument === 'hihat') {
        audioEngine.triggerHiHat(undefined, 0.8, track, durationSec);
      } else {
        audioEngine.triggerMelody(pitchName, undefined, 0.9, track, durationSec);
      }
    },
    [track]
  );

  // --- MOUSE DRAG / DRAW STATE ---
  const [isDraggingNote, setIsDraggingNote] = useState<boolean>(false);
  const [dragAction, setDragAction] = useState<'MOVE' | 'RESIZE_RIGHT' | 'RESIZE_LEFT' | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number; tick: number; midi: number } | null>(null);
  const [dragActiveNote, setDragActiveNote] = useState<NoteEvent | null>(null);

  const getGridCoordsFromEvent = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!gridContainerRef.current) return { tick: 0, midi: isDrumTrack ? defaultDrumMidi : 60 };
      const rect = gridContainerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top + gridContainerRef.current.scrollTop;

      const totalWidth = rect.width;
      const tick = Math.max(0, Math.min(songSpanTicks, Math.round((x / totalWidth) * songSpanTicks)));
      const snappedTick = snapTick(tick, snapGridTicks);

      if (isDrumTrack) {
        return { tick: snappedTick, midi: defaultDrumMidi, rawTick: tick, rawMidi: defaultDrumMidi };
      }

      const rowHeight = 22;
      const pitchIndex = Math.floor(y / rowHeight);
      const midi = Math.max(MIN_MIDI, Math.min(MAX_MIDI, MAX_MIDI - pitchIndex));
      const finalMidi = snapToScale ? snapMidiToScale(midi, projectKey, projectScale) : midi;

      return { tick: snappedTick, midi: finalMidi, rawTick: tick, rawMidi: midi };
    },
    [snapGridTicks, snapToScale, isDrumTrack, defaultDrumMidi]
  );

  // --- GRID CANVAS CLICK / CREATE ---
  const handleGridMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === 'PENCIL') {
      const { tick, midi } = getGridCoordsFromEvent(e);
      previewMidiPitch(midi, 0.3);
      handleAddNote(track.id, {
        startTick: tick,
        durationTicks: Math.max(snapGridTicks, TICKS_PER_16TH),
        midiNote: midi,
        velocity: 100,
      });
    }
  };

  // --- NOTE BLOCK INTERACTION ---
  const handleNoteMouseDown = (e: React.MouseEvent, note: NoteEvent, action: 'MOVE' | 'RESIZE_RIGHT' | 'RESIZE_LEFT') => {
    e.stopPropagation();

    if (activeTool === 'ERASER') {
      handleDeleteNotes(track.id, [note.id]);
      return;
    }

    if (activeTool === 'SCISSOR') {
      const { tick } = getGridCoordsFromEvent(e as any);
      handleSplitNote(track.id, note.id, tick);
      return;
    }

    // Selection
    if (!selectedNoteIds.includes(note.id)) {
      if (e.shiftKey) {
        setSelectedNoteIds((prev) => [...prev, note.id]);
      } else {
        setSelectedNoteIds([note.id]);
      }
    }

    previewMidiPitch(note.midiNote, 0.2);
    setIsDraggingNote(true);
    setDragAction(action);
    setDragActiveNote(note);
    setDragStartPos({
      x: e.clientX,
      y: e.clientY,
      tick: note.startTick,
      midi: note.midiNote,
    });
  };

  // Window MouseMove / MouseUp for Smooth Dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingNote || !dragActiveNote || !dragStartPos || !gridContainerRef.current) return;

      const rect = gridContainerRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragStartPos.x;
      const deltaY = e.clientY - dragStartPos.y;

      const deltaTicksRaw = (deltaX / rect.width) * songSpanTicks;
      const deltaTicks = snapTick(deltaTicksRaw, snapGridTicks);

      const rowHeight = 22;
      const deltaPitches = -Math.round(deltaY / rowHeight);

      if (dragAction === 'MOVE') {
        const newStartTick = Math.max(
          0,
          Math.min(songSpanTicks - dragActiveNote.durationTicks, dragStartPos.tick + deltaTicks)
        );
        let newMidi = Math.max(MIN_MIDI, Math.min(MAX_MIDI, dragStartPos.midi + deltaPitches));
        if (snapToScale) {
          newMidi = snapMidiToScale(newMidi, projectKey, projectScale);
        }

        if (newStartTick !== dragActiveNote.startTick || newMidi !== dragActiveNote.midiNote) {
          handleMoveNotes(
            track.id,
            [dragActiveNote.id],
            newStartTick - dragActiveNote.startTick,
            newMidi - dragActiveNote.midiNote
          );
        }
      } else if (dragAction === 'RESIZE_RIGHT') {
        const newDuration = Math.max(
          snapGridTicks,
          Math.min(songSpanTicks - dragActiveNote.startTick, dragActiveNote.durationTicks + deltaTicks)
        );
        if (newDuration !== dragActiveNote.durationTicks) {
          handleResizeNote(track.id, dragActiveNote.id, newDuration);
        }
      }
    };

    const handleMouseUp = () => {
      setIsDraggingNote(false);
      setDragAction(null);
      setDragStartPos(null);
      setDragActiveNote(null);
    };

    if (isDraggingNote) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingNote, dragActiveNote, dragStartPos, dragAction, snapGridTicks, snapToScale, track.id]);

  // Lyric Text Edit Submit
  const handleSaveLyric = (noteId: string) => {
    handleSetNoteLyric(track.id, noteId, lyricInputText);
    setEditingLyricNoteId(null);
    setLyricInputText('');
  };

  // Playhead position in percent
  // This roll spans the song, not a fixed four bars.
  const songBarCount = Math.max(1, Math.round(dawState.songBars || 4));
  const songSpanTicks = songBarCount * TICKS_PER_BAR;
  const playheadPercent = ((dawState.currentStep % (songBarCount * 16)) / (songBarCount * 16)) * 100;

  return (
    <div className="w-full bg-slate-950 border border-slate-800/90 rounded-2xl overflow-hidden shadow-2xl flex flex-col font-mono text-xs select-none">
      {/* 1. TOP TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-slate-900/95 border-b border-slate-800 gap-2">
        {/* Left: Track Name & Tools */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-black">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: track.color || '#a855f7' }} />
            <span className="uppercase">{track.name}</span>
            <span className="text-[10px] text-slate-400 font-normal">({notes.length} notes)</span>
          </div>

          {/* Tools Palette */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTool('POINTER')}
              title="Pointer / Move Tool (V)"
              className={`p-1.5 rounded-md transition cursor-pointer ${
                activeTool === 'POINTER' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MousePointer className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTool('PENCIL')}
              title="Pencil / Draw Note Tool (B)"
              className={`p-1.5 rounded-md transition cursor-pointer ${
                activeTool === 'PENCIL' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTool('STRETCH')}
              title="Stretch / Resize Tool (S)"
              className={`p-1.5 rounded-md transition cursor-pointer ${
                activeTool === 'STRETCH' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTool('SCISSOR')}
              title="Scissor / Split Tool (C)"
              className={`p-1.5 rounded-md transition cursor-pointer ${
                activeTool === 'SCISSOR' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTool('ERASER')}
              title="Eraser Tool (E)"
              className={`p-1.5 rounded-md transition cursor-pointer ${
                activeTool === 'ERASER' ? 'bg-rose-500 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Center: Grid Snap & Scale Lock */}
        <div className="flex items-center space-x-2">
          {/* Snap Selector */}
          <div className="flex items-center space-x-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400">SNAP:</span>
            <select
              value={snapGridTicks}
              onChange={(e) => setSnapGridTicks(parseInt(e.target.value))}
              className="bg-transparent text-slate-200 text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value={TICKS_PER_16TH} className="bg-slate-900">1/16</option>
              <option value={TICKS_PER_BEAT / 2} className="bg-slate-900">1/8</option>
              <option value={TICKS_PER_BEAT} className="bg-slate-900">1/4</option>
              <option value={TICKS_PER_16TH / 2} className="bg-slate-900">1/32</option>
              <option value={1} className="bg-slate-900">Off</option>
            </select>
          </div>

          {/* Scale Lock Toggle (Melodic tracks only) */}
          {!isDrumTrack && (
            <button
              onClick={() => setSnapToScale(!snapToScale)}
              title="Snap Notes to Project Scale (C Minor)"
              className={`px-2 py-1 rounded-lg border text-[11px] font-bold flex items-center space-x-1 transition cursor-pointer ${
                snapToScale
                  ? 'bg-pink-500/20 text-pink-300 border-pink-500/40'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3 h-3 text-pink-400" />
              <span>SCALE: {projectKey} {projectScale.toUpperCase()}</span>
            </button>
          )}
        </div>

        {/* Right: Quick Operations & Toggles */}
        <div className="flex items-center space-x-2">
          {/* Transpose Octave (Melodic tracks only) */}
          {!isDrumTrack && (
            <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-0.5">
              <button
                onClick={() => handleTransposeNotes(track.id, selectedNoteIds, -12)}
                title="Transpose Down 1 Octave (-12 semitones)"
                className="px-2 py-0.5 text-[10px] font-bold text-slate-300 hover:bg-slate-800 rounded transition cursor-pointer"
              >
                -8ve
              </button>
              <button
                onClick={() => handleTransposeNotes(track.id, selectedNoteIds, 12)}
                title="Transpose Up 1 Octave (+12 semitones)"
                className="px-2 py-0.5 text-[10px] font-bold text-slate-300 hover:bg-slate-800 rounded transition cursor-pointer"
              >
                +8ve
              </button>
            </div>
          )}

          {/* Quantize Button */}
          <button
            onClick={() => handleQuantizeTrackNotes(track.id, selectedNoteIds, snapGridTicks)}
            title="Quantize selected or all notes to grid"
            className="px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 text-[11px] font-bold transition cursor-pointer flex items-center space-x-1"
          >
            <Zap className="w-3 h-3 text-cyan-400" />
            <span>QUANTIZE</span>
          </button>

          {/* Velocity Lane Toggle */}
          <button
            onClick={() => setShowVelocityLane(!showVelocityLane)}
            title="Toggle Velocity Automation Lane"
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              showVelocityLane ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-950 text-slate-400 border-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. TIMELINE RULER (BARS 1..4) */}
      <div className="flex border-b border-slate-800 bg-slate-900/80 text-[10px] font-mono text-slate-400">
        {/* Key Ruler spacer (60px) */}
        <div className="w-[60px] flex-shrink-0 border-r border-slate-800 px-2 py-1 text-slate-500 font-bold text-center">
          {isDrumTrack ? 'HIT' : 'KEY'}
        </div>
        {/* 4 Bars Header */}
        <div className="flex-1 grid grid-cols-4 relative h-6">
          {[1, 2, 3, 4].map((bar) => (
            <div key={bar} className="border-r border-slate-800/80 px-2 flex items-center justify-between">
              <span className="font-bold text-slate-300">BAR {bar}</span>
              <span className="text-[9px] text-slate-600">.1 .2 .3 .4</span>
            </div>
          ))}
          {/* Animated Playhead indicator on ruler */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] pointer-events-none z-20"
            style={{ left: `${playheadPercent}%` }}
          />
        </div>
      </div>

      {/* 3. MAIN PERFORMANCE / NOTE CANVAS SCROLL AREA */}
      <div
        ref={gridContainerRef}
        onMouseDown={handleGridMouseDown}
        className={`relative flex-1 overflow-y-auto ${isDrumTrack ? 'h-[38px]' : 'max-h-[300px]'} bg-slate-950 select-none custom-scrollbar`}
      >
        {/* Background Ghost Waveform Trace (if available from recorded takes) */}
        {showWaveformGhost && track.vocalTakes?.[0]?.waveformData && (
          <div className="absolute inset-0 left-[60px] pointer-events-none opacity-10 flex items-center z-0">
            <svg className="w-full h-32" preserveAspectRatio="none" viewBox="0 0 100 100">
              <polyline
                fill="none"
                stroke="#ec4899"
                strokeWidth="2"
                points={track.vocalTakes[0].waveformData
                  .map((val, idx, arr) => `${(idx / (arr.length - 1)) * 100},${50 - val * 45}`)
                  .join(' ')}
              />
            </svg>
          </div>
        )}

        {/* Pitch / Drum Rows */}
        <div className="relative min-w-full">
          {pitchList.map((midi) => {
            const noteName = isDrumTrack ? (track.instrument?.toUpperCase() || 'HIT') : midiToNoteName(midi);
            const isBlackKey = !isDrumTrack && noteName.includes('#');
            const isRootC = !isDrumTrack && noteName.startsWith('C') && !isBlackKey;
            const inScale = isDrumTrack || isNoteInScale(midi, projectKey, projectScale);
            const rowHeight = isDrumTrack ? 36 : 22;

            return (
              <div
                key={midi}
                style={{ height: `${rowHeight}px` }}
                className={`flex border-b border-slate-900/70 group ${
                  isBlackKey ? 'bg-slate-950/90' : 'bg-slate-900/30'
                } ${inScale ? 'hover:bg-slate-800/40' : 'hover:bg-slate-900/60'}`}
              >
                {/* Vertical Key / Drum Hit Label */}
                <div
                  onClick={() => previewMidiPitch(midi, 0.4)}
                  className={`w-[60px] flex-shrink-0 flex items-center justify-between px-1.5 border-r border-slate-800 text-[10px] cursor-pointer transition ${
                    isDrumTrack
                      ? 'bg-slate-900/90 text-amber-300 font-bold hover:bg-slate-800'
                      : isBlackKey
                      ? 'bg-slate-950 text-slate-400 hover:bg-slate-900 hover:text-white'
                      : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white font-semibold'
                  } ${isRootC ? 'border-l-2 border-l-amber-400 text-amber-300 font-black' : ''}`}
                >
                  <span className="truncate">{noteName}</span>
                  {inScale && !isDrumTrack && <span className="w-1 h-1 rounded-full bg-pink-400/60" />}
                </div>

                {/* Horizontal Grid Row (64 16th subdivisions across 4 bars) */}
                <div className="flex-1 grid grid-cols-64 relative">
                  {/* Subtle Bar Lines */}
                  <div
                    className="absolute inset-0 grid pointer-events-none"
                    style={{ gridTemplateColumns: `repeat(${songBarCount}, minmax(0, 1fr))` }}
                  >
                    {Array.from({ length: songBarCount }).map((_, b) => (
                      <div key={b} className="border-r border-slate-800/60" />
                    ))}
                  </div>
                  {/* Beat Lines */}
                  <div
                    className="absolute inset-0 grid pointer-events-none"
                    style={{ gridTemplateColumns: `repeat(${songBarCount * 4}, minmax(0, 1fr))` }}
                  >
                    {Array.from({ length: songBarCount * 4 }).map((_, b) => (
                      <div key={b} className="border-r border-slate-900/40" />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {/* RENDERED NOTE BLOCKS OVERLAY */}
          <div className="absolute inset-0 left-[60px] pointer-events-none">
            {notes.map((note) => {
              const rowHeight = isDrumTrack ? 36 : 22;
              const pitchIndex = isDrumTrack ? 0 : MAX_MIDI - note.midiNote;
              const rowTop = pitchIndex * rowHeight;
              const leftPercent = (note.startTick / songSpanTicks) * 100;
              const widthPercent = Math.max(1.2, (note.durationTicks / songSpanTicks) * 100);
              const noteSelection = selectedNoteIds || [];
              const isSelected = noteSelection.includes(note.id);
              const noteColor = track.color || '#a855f7';

              return (
                <div
                  key={note.id}
                  onMouseDown={(e) => handleNoteMouseDown(e, note, 'MOVE')}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingLyricNoteId(note.id);
                    setLyricInputText(note.lyric || '');
                  }}
                  style={{
                    top: `${rowTop + 2}px`,
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                    height: `${rowHeight - 4}px`,
                    backgroundColor: noteColor,
                  }}
                  className={`absolute rounded-md shadow-lg pointer-events-auto flex items-center justify-between px-1.5 transition-shadow cursor-move text-[10px] font-bold text-slate-950 overflow-hidden ${
                    isSelected ? 'ring-2 ring-white shadow-[0_0_12px_rgba(255,255,255,0.6)] z-10 brightness-110' : 'hover:brightness-105 z-0'
                  }`}
                >
                  {/* Left Edge Resize Handle (Nudge) */}
                  <div
                    onMouseDown={(e) => handleNoteMouseDown(e, note, 'RESIZE_LEFT')}
                    className="absolute left-0 top-0 bottom-0 w-2 hover:bg-white/40 cursor-ew-resize"
                  />

                  {/* Note Label / Syllable Lyric */}
                  <div className="truncate flex items-center space-x-1">
                    <span>{midiToNoteName(note.midiNote)}</span>
                    {note.lyric && (
                      <span className="px-1 py-0.2 rounded bg-black/30 text-white text-[9px] font-normal truncate">
                        "{note.lyric}"
                      </span>
                    )}
                  </div>

                  {/* Right Edge Resize Handle (Stretch Duration) */}
                  <div
                    onMouseDown={(e) => handleNoteMouseDown(e, note, 'RESIZE_RIGHT')}
                    title="Drag to Stretch Note Duration"
                    className="absolute right-0 top-0 bottom-0 w-2.5 hover:bg-white/50 cursor-ew-resize flex items-center justify-center"
                  >
                    <div className="w-0.5 h-3 bg-black/40 rounded-full" />
                  </div>
                </div>
              );
            })}

            {/* Real-time Playhead Vertical Line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] pointer-events-none z-30"
              style={{ left: `${playheadPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4. OPTIONAL BOTTOM VELOCITY AUTOMATION LANE */}
      {showVelocityLane && (
        <div className="h-20 bg-slate-900 border-t border-slate-800 flex flex-col px-3 py-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800 pb-1 mb-1">
            <span>VELOCITY AUTOMATION LANE (0..127)</span>
            <span>Drag stems to adjust dynamics</span>
          </div>
          <div className="flex-1 relative left-[60px]">
            {notes.map((note) => {
              const leftPercent = (note.startTick / songSpanTicks) * 100;
              const heightPercent = (note.velocity / 127) * 100;
              const isSelected = selectedNoteIds.includes(note.id);

              return (
                <div
                  key={`vel_${note.id}`}
                  style={{ left: `${leftPercent}%` }}
                  className="absolute bottom-0 flex flex-col items-center group cursor-ns-resize"
                  onMouseDown={(e) => {
                    const startY = e.clientY;
                    const startVel = note.velocity;
                    const handleMove = (mv: MouseEvent) => {
                      const deltaY = startY - mv.clientY;
                      const newVel = Math.max(1, Math.min(127, startVel + deltaY * 1.5));
                      handleSetNoteVelocity(track.id, note.id, newVel);
                    };
                    const handleUp = () => {
                      window.removeEventListener('mousemove', handleMove);
                      window.removeEventListener('mouseup', handleUp);
                    };
                    window.addEventListener('mousemove', handleMove);
                    window.addEventListener('mouseup', handleUp);
                  }}
                >
                  <div
                    style={{ height: `${heightPercent}%`, backgroundColor: track.color || '#a855f7' }}
                    className={`w-1 rounded-t-full transition ${
                      isSelected ? 'bg-white ring-1 ring-white' : 'opacity-80 group-hover:opacity-100'
                    }`}
                  />
                  <div className="w-2.5 h-2.5 rounded-full bg-white shadow -mt-1 group-hover:scale-125 transition" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. INLINE SYLLABLE LYRIC EDIT MODAL */}
      {editingLyricNoteId && (
        <div className="p-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2 z-40">
          <div className="flex items-center space-x-2 flex-1">
            <span className="text-[11px] font-bold text-pink-400">ATTACH SYLLABLE / LYRIC:</span>
            <input
              type="text"
              autoFocus
              value={lyricInputText}
              onChange={(e) => setLyricInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveLyric(editingLyricNoteId);
                if (e.key === 'Escape') setEditingLyricNoteId(null);
              }}
              placeholder="e.g. 'walk-', 'ing', 'neon', 'rain'"
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-100 text-xs focus:border-pink-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleSaveLyric(editingLyricNoteId)}
              className="px-3 py-1 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs cursor-pointer flex items-center space-x-1"
            >
              <Check className="w-3 h-3" />
              <span>SAVE</span>
            </button>
            <button
              onClick={() => setEditingLyricNoteId(null)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
