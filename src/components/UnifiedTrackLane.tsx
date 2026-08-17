import React, { useState, useRef, useCallback } from 'react';
import { Track, NoteEvent, PianoRollTool } from '../types/daw';
import { useStudioSession } from '../app/StudioSessionContext';
import { audioEngine } from '../audio/audioEngine';
import {
  TICKS_PER_16TH,
  TICKS_PER_4_BARS,
  midiToNoteName,
  noteNameToMidi,
  snapTick,
  isNoteInScale,
  snapMidiToScale,
} from '../utils/musicMath';
import {
  Volume2,
  Sliders,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Trash2,
  Drum,
  Disc,
  Music,
  Target,
  Mic,
  Activity,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface UnifiedTrackLaneProps {
  track: Track;
  trackIdx: number;
  isSelected: boolean;
  activeTool: PianoRollTool;
  snapGridTicks: number;
  snapToScale: boolean;
  showVelocityLane: boolean;
  playheadPercent: number;
  onSelectTrack: () => void;
  onShiftRow: (dir: 'up' | 'down') => void;
}

interface DragState {
  noteId: string;
  action: 'MOVE' | 'RESIZE_RIGHT' | 'RESIZE_LEFT';
  startTick: number;
  durationTicks: number;
  midiNote: number;
}

const INSTRUMENT_ICONS: Record<string, React.ReactNode> = {
  kick: <Drum className="w-3.5 h-3.5 text-amber-400" />,
  snare: <Target className="w-3.5 h-3.5 text-cyan-400" />,
  hihat: <Sparkles className="w-3.5 h-3.5 text-emerald-400" />,
  melody: <Music className="w-3.5 h-3.5 text-purple-400" />,
  bass: <Disc className="w-3.5 h-3.5 text-rose-400" />,
  vocal_synth: <Mic className="w-3.5 h-3.5 text-pink-400" />,
  percussion: <Activity className="w-3.5 h-3.5 text-amber-400" />,
  strings: <Music className="w-3.5 h-3.5 text-blue-400" />,
  harmony: <Mic className="w-3.5 h-3.5 text-indigo-400" />,
};

const SOUND_PRESETS: Record<string, string[]> = {
  kick: ['TR-808 Heavy Kick', 'Punchy Studio Kick', 'Acoustic Maple Kick', 'Dubler Oral Kick'],
  snare: ['Crisp Vintage Snare', 'Layered Clap Pop', 'Acoustic Snare', 'Dubler Oral Snare'],
  hihat: ['Tight 808 Closed Hat', 'Semi-Open Sizzle Hat', 'Acoustic Studio Hat', 'Dubler Oral Hat'],
  bass: ['Analog Sub Glide', 'Sliding 808 Bass', 'Warm Synth Bass', 'Fretless Bass'],
  melody: ['Poly Keys Synth', 'Rhodes Mark I', 'Cinematic Strings', 'Lead Pluck'],
  strings: ['Chamber Strings Ensemble', 'Solo Cello (Expressive)', 'Warm Analog Pad'],
  vocal_synth: ['Session Vocal Lead', 'Phonetic Vocoder', 'Harmonic Double'],
};

export const UnifiedTrackLane: React.FC<UnifiedTrackLaneProps> = ({
  track,
  trackIdx,
  isSelected,
  activeTool,
  snapGridTicks,
  snapToScale,
  showVelocityLane,
  playheadPercent,
  onSelectTrack,
  onShiftRow,
}) => {
  const {
    handleToggleMute,
    handleToggleSolo,
    handleChangeVolume,
    handleAddNote,
    handleMoveNotes,
    handleResizeNote,
    handleSplitNote,
    handleDeleteNotes,
    handleTransposeNotes,
    handleNudgeTrackPattern,
    handleClearTrack,
    selectedNoteIds,
    setSelectedNoteIds,
    setSelectionContext,
    setTracks,
  } = useStudioSession();

  const isDrum =
    track.instrument === 'kick' ||
    track.instrument === 'snare' ||
    track.instrument === 'hihat' ||
    track.instrument === 'percussion';

  // Melodic tracks default to expanded pitch view (height: 200px)
  const [isExpanded, setIsExpanded] = useState<boolean>(!isDrum);
  const [trackHeight, setTrackHeight] = useState<number>(isDrum ? 60 : 200);
  const [activeDrag, setActiveDrag] = useState<DragState | null>(null);

  const laneContainerRef = useRef<HTMLDivElement>(null);
  const lastPlayedMidiRef = useRef<number | null>(null);

  const defaultMidi = noteNameToMidi(
    track.pitch || (track.instrument === 'kick' ? 'C1' : track.instrument === 'snare' ? 'D1' : track.instrument === 'hihat' ? 'F#1' : 'C2')
  );

  const notes = track.noteEvents || [];
  const trackColor = track.color || (isDrum ? '#f59e0b' : '#a855f7');
  const projectKey = 'C';
  const projectScale = 'minor';

  // Pitch rows for expanded melodic piano roll (e.g. C1-C3 for Bass, C3-C5 for Melody)
  const minMidi = track.instrument === 'bass' ? 24 : 48; // C1 (24) or C3 (48)
  const maxMidi = track.instrument === 'bass' ? 48 : 72; // C3 (48) or C5 (72)
  const totalPitches = maxMidi - minMidi + 1; // 25 semitones (2 octaves)
  const pitchArray = Array.from({ length: totalPitches }, (_, i) => maxMidi - i); // High to low

  // Live Sound Preview
  const previewHit = useCallback(
    (midi: number, dur = 0.25) => {
      const pitchName = midiToNoteName(midi);
      if (track.instrument === 'kick') audioEngine.triggerKick(pitchName, undefined, 0.9, track, dur);
      else if (track.instrument === 'snare') audioEngine.triggerSnare(undefined, 0.9, track, dur);
      else if (track.instrument === 'hihat') audioEngine.triggerHiHat(undefined, 0.8, track, dur);
      else if (track.instrument === 'bass') audioEngine.triggerBass(pitchName, undefined, 0.9, track, dur);
      else audioEngine.triggerMelody(pitchName, undefined, 0.9, track, dur);
    },
    [track]
  );

  // Click on Track Lane to place a note
  const handleLaneMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!laneContainerRef.current) return;
    const rect = laneContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const tick = Math.max(0, Math.min(TICKS_PER_4_BARS - 1, Math.round((x / rect.width) * TICKS_PER_4_BARS)));
    const snapped = snapTick(tick, snapGridTicks || TICKS_PER_16TH);

    let targetMidi = defaultMidi;
    if (!isDrum && isExpanded) {
      const rowHeight = rect.height / totalPitches;
      const rowIndex = Math.floor(y / rowHeight);
      targetMidi = pitchArray[Math.max(0, Math.min(totalPitches - 1, rowIndex))] || defaultMidi;
      if (snapToScale) targetMidi = snapMidiToScale(targetMidi, projectKey, projectScale);
    }

    if (activeTool === 'PENCIL') {
      previewHit(targetMidi, 0.3);
      handleAddNote(track.id, {
        startTick: snapped,
        durationTicks: Math.max(snapGridTicks || TICKS_PER_16TH, TICKS_PER_16TH),
        midiNote: targetMidi,
        velocity: 100,
      });
    }
  };

  // Note Interaction: Drag (Pitch + Timing), Stretch, Split, Erase
  const handleNoteMouseDown = (
    e: React.MouseEvent,
    note: NoteEvent,
    action: 'MOVE' | 'RESIZE_RIGHT' | 'RESIZE_LEFT'
  ) => {
    e.stopPropagation();

    if (activeTool === 'ERASER') {
      handleDeleteNotes(track.id, [note.id]);
      return;
    }

    if (activeTool === 'SCISSOR') {
      if (!laneContainerRef.current) return;
      const rect = laneContainerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const splitTick = Math.max(0, Math.min(TICKS_PER_4_BARS, Math.round((x / rect.width) * TICKS_PER_4_BARS)));
      handleSplitNote(track.id, note.id, splitTick);
      return;
    }

    // Select note and preview its sound immediately
    previewHit(note.midiNote, 0.4);

    if (!selectedNoteIds.includes(note.id)) {
      if (e.shiftKey) setSelectedNoteIds((prev) => [...prev, note.id]);
      else setSelectedNoteIds([note.id]);
    }

    const startX = e.clientX;
    const startY = e.clientY;
    const initialStartTick = note.startTick;
    const initialDuration = note.durationTicks;
    const initialMidi = note.midiNote;

    lastPlayedMidiRef.current = initialMidi;
    setActiveDrag({
      noteId: note.id,
      action,
      startTick: initialStartTick,
      durationTicks: initialDuration,
      midiNote: initialMidi,
    });

    let currentCalculatedStart = initialStartTick;
    let currentCalculatedDur = initialDuration;
    let currentCalculatedMidi = initialMidi;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!laneContainerRef.current) return;
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const rect = laneContainerRef.current.getBoundingClientRect();
      const deltaTicks = Math.round((deltaX / rect.width) * TICKS_PER_4_BARS);

      if (action === 'MOVE') {
        const newStart = snapTick(
          Math.max(0, Math.min(TICKS_PER_4_BARS - initialDuration, initialStartTick + deltaTicks)),
          snapGridTicks || TICKS_PER_16TH
        );
        let newMidi = initialMidi;
        if (!isDrum && isExpanded) {
          const rowHeight = rect.height / totalPitches;
          const semitoneDelta = -Math.round(deltaY / rowHeight);
          newMidi = Math.max(minMidi, Math.min(maxMidi, initialMidi + semitoneDelta));
          if (snapToScale) newMidi = snapMidiToScale(newMidi, projectKey, projectScale);

          // Acoustic feedback when pitch row changes
          if (newMidi !== lastPlayedMidiRef.current) {
            lastPlayedMidiRef.current = newMidi;
            previewHit(newMidi, 0.2);
          }
        }

        currentCalculatedStart = newStart;
        currentCalculatedMidi = newMidi;

        setActiveDrag({
          noteId: note.id,
          action: 'MOVE',
          startTick: newStart,
          durationTicks: initialDuration,
          midiNote: newMidi,
        });
      } else if (action === 'RESIZE_RIGHT') {
        const newDur = snapTick(
          Math.max(15, initialDuration + deltaTicks),
          snapGridTicks || TICKS_PER_16TH
        );
        currentCalculatedDur = newDur;

        setActiveDrag({
          noteId: note.id,
          action: 'RESIZE_RIGHT',
          startTick: initialStartTick,
          durationTicks: newDur,
          midiNote: initialMidi,
        });
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      // Commit final position to DAW state
      if (action === 'MOVE') {
        const deltaTicks = currentCalculatedStart - note.startTick;
        const deltaMidi = currentCalculatedMidi - note.midiNote;
        if (deltaTicks !== 0 || deltaMidi !== 0) {
          handleMoveNotes(track.id, [note.id], deltaTicks, deltaMidi);
        }
      } else if (action === 'RESIZE_RIGHT') {
        if (currentCalculatedDur !== note.durationTicks) {
          handleResizeNote(track.id, note.id, currentCalculatedDur);
        }
      }

      setActiveDrag(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Drag Track Bottom Edge to Vertically Zoom/Resize
  const handleHeightResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const startY = e.clientY;
    const initialH = trackHeight;

    const handleMouseMove = (moveEv: MouseEvent) => {
      const newH = Math.max(isDrum ? 56 : 120, Math.min(480, initialH + (moveEv.clientY - startY)));
      setTrackHeight(newH);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const currentSoundList = SOUND_PRESETS[track.instrument] || ['Default Sound Vault Asset', 'Analog Model', 'PCM Sample'];

  return (
    <div
      onClick={onSelectTrack}
      className={`flex flex-col bg-slate-950/95 rounded-2xl border transition-all cursor-pointer shadow-lg overflow-hidden ${
        isSelected
          ? 'border-amber-500/80 ring-1 ring-amber-500/30 bg-slate-900/90'
          : 'border-slate-800/80 hover:border-slate-700'
      }`}
    >
      <div className="flex items-stretch">
        {/* 1. LEFT TRACK HEADER */}
        <div
          className="w-72 shrink-0 p-2.5 border-r border-slate-800/80 flex flex-col justify-between gap-1.5 bg-slate-950/80 font-mono text-xs select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top: Icon (Click to Audition), Name, Notes Count, Mute, Solo, DSP, Expand/Zoom */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  previewHit(defaultMidi, 0.6);
                }}
                className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 transition cursor-pointer active:scale-95 group"
                title={`Click to audition / preview ${track.name} sound`}
              >
                {INSTRUMENT_ICONS[track.instrument] || <Activity className="w-3.5 h-3.5 text-amber-400" />}
              </button>
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-slate-100 text-xs truncate max-w-[95px]" title={track.name}>
                    {track.name}
                  </span>
                  <span className="text-[9px] text-slate-400 font-normal">
                    ({notes.length} {notes.length === 1 ? 'note' : 'notes'})
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Native Track Height / Expand Toggle */}
              {!isDrum && (
                <div className="flex items-center gap-0.5 bg-slate-900 p-0.5 rounded border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !isExpanded;
                      setIsExpanded(next);
                      setTrackHeight(next ? 200 : 60);
                    }}
                    className="p-0.5 text-slate-400 hover:text-slate-100 transition cursor-pointer"
                    title={isExpanded ? 'Collapse pitch lane' : 'Expand pitch lane'}
                  >
                    {isExpanded ? <Minimize2 className="w-2.5 h-2.5" /> : <Maximize2 className="w-2.5 h-2.5" />}
                  </button>
                  {isExpanded && (
                    <>
                      <button
                        type="button"
                        onClick={() => setTrackHeight((h) => Math.max(120, h - 40))}
                        className="p-0.5 text-slate-400 hover:text-amber-400 transition cursor-pointer"
                        title="Zoom out track height"
                      >
                        <ZoomOut className="w-2.5 h-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setTrackHeight((h) => Math.min(480, h + 40))}
                        className="p-0.5 text-slate-400 hover:text-amber-400 transition cursor-pointer"
                        title="Zoom in track height"
                      >
                        <ZoomIn className="w-2.5 h-2.5" />
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Workstation DSP Drawer Toggle */}
              <button
                onClick={() => {
                  setSelectionContext((prev) => ({ ...prev, selectedTrackId: track.id }));
                  window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'workstation' }));
                }}
                className="w-5 h-5 rounded bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 flex items-center justify-center text-[10px] transition cursor-pointer"
                title="Toggle Track Workstation Drawer"
              >
                <Sliders className="w-2.5 h-2.5" />
              </button>

              {/* Mute */}
              <button
                onClick={() => handleToggleMute(track.id)}
                className={`w-5 h-5 rounded text-[9.5px] font-black transition cursor-pointer ${
                  track.mute ? 'bg-rose-500 text-white shadow' : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
                title={track.mute ? 'Unmute' : 'Mute'}
              >
                M
              </button>

              {/* Solo */}
              <button
                onClick={() => handleToggleSolo(track.id)}
                className={`w-5 h-5 rounded text-[9.5px] font-black transition cursor-pointer ${
                  track.solo ? 'bg-amber-400 text-slate-950 shadow' : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
                title={track.solo ? 'Unsolo' : 'Solo'}
              >
                S
              </button>
            </div>
          </div>

          {/* Middle: SOURCE, SOUND Vault, Octave Transpose */}
          <div className="flex items-center justify-between gap-1 text-[9px]">
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-bold">SOURCE:</span>
              <span className="text-amber-400 font-bold">
                {track.originType === 'ORAL_SEED' ? 'MOUTH' : isDrum ? 'BEATBOX' : 'PERF'}
              </span>
            </div>

            {/* Sound Preset Selector */}
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-bold">SOUND:</span>
              <select
                value={track.vaultLabel || currentSoundList[0]}
                onChange={(e) => {
                  const val = e.target.value;
                  setTracks((prev) =>
                    prev.map((t) => (t.id === track.id ? { ...t, vaultLabel: val } : t))
                  );
                  previewHit(defaultMidi, 0.5);
                }}
                className="bg-slate-900 text-cyan-300 text-[9px] font-bold px-1 py-0.5 rounded border border-slate-800 focus:outline-none cursor-pointer max-w-[90px] truncate"
              >
                {currentSoundList.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SONUS + Transpose + LEVEL Fader */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[9px]">
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-bold">SONUS:</span>
              <button
                type="button"
                onClick={() => {
                  setSelectionContext((prev) => ({ ...prev, selectedTrackId: track.id }));
                  const targetRoute = track.sourceTakeAudioUrl
                    ? 'ACE_PERFORMANCE_TRANSFER'
                    : isDrum
                    ? 'SAMPLE'
                    : 'INSTRUMENT';
                  window.dispatchEvent(
                    new CustomEvent('soulsonus:openDrawer', {
                      detail: { type: 'realization', trackId: track.id, route: targetRoute },
                    })
                  );
                }}
                className="px-1.5 py-0.5 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-[8.5px] font-black flex items-center space-x-1 cursor-pointer transition shadow-sm"
                title="Generate SoulSonus realization candidate"
              >
                <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                <span>SONUS</span>
              </button>

              {/* Quick Track Semitone & Octave Transposition Buttons */}
              {!isDrum && (
                <div className="flex items-center gap-0.5 bg-slate-900 px-1 py-0.2 rounded border border-slate-800 ml-1">
                  <button
                    type="button"
                    onClick={() => handleTransposeNotes(track.id, -1)}
                    className="text-[8px] font-mono text-slate-300 hover:text-amber-400 px-0.5 cursor-pointer"
                    title="Transpose all track notes down 1 semitone (-1 st)"
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTransposeNotes(track.id, 1)}
                    className="text-[8px] font-mono text-slate-300 hover:text-amber-400 px-0.5 cursor-pointer"
                    title="Transpose all track notes up 1 semitone (+1 st)"
                  >
                    +1
                  </button>
                  <span className="text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={() => handleTransposeNotes(track.id, -12)}
                    className="text-[8px] font-mono text-slate-300 hover:text-amber-400 px-0.5 cursor-pointer"
                    title="Transpose all track notes down 1 octave (-12 semitones)"
                  >
                    -8ve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTransposeNotes(track.id, 12)}
                    className="text-[8px] font-mono text-slate-300 hover:text-amber-400 px-0.5 cursor-pointer"
                    title="Transpose all track notes up 1 octave (+12 semitones)"
                  >
                    +8ve
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Volume2 className="w-2.5 h-2.5 text-slate-500" />
              <input
                type="range"
                min={-20}
                max={6}
                value={track.volume || 0}
                onChange={(e) => handleChangeVolume(track.id, Number(e.target.value))}
                className="w-12 accent-amber-500 cursor-pointer h-1"
                title={`Track Volume: ${track.volume || 0} dB`}
              />
            </div>
          </div>

          {/* Transform Command Strip (Nudge, Shift Up/Down, Clear) */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[8.5px]">
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-bold">TRANSFORM:</span>
              {track.detectionProfile && (
                <span className="text-[7.5px] font-mono text-emerald-400 bg-emerald-950/80 px-1 rounded border border-emerald-500/40">
                  🎯 {track.detectionProfile.centerFreq}Hz
                </span>
              )}
            </div>

            <div className="flex items-center gap-0.5">
              <button
                onClick={() => handleNudgeTrackPattern(track.id, 'left')}
                className="p-0.5 rounded bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 transition cursor-pointer"
                title="Nudge Pattern Left (1/16th)"
              >
                <ChevronLeft className="w-2.5 h-2.5" />
              </button>
              <button
                onClick={() => handleNudgeTrackPattern(track.id, 'right')}
                className="p-0.5 rounded bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 transition cursor-pointer"
                title="Nudge Pattern Right (1/16th)"
              >
                <ChevronRight className="w-2.5 h-2.5" />
              </button>
              <div className="w-px h-2 bg-slate-800 mx-0.5" />
              <button
                onClick={() => onShiftRow('up')}
                className="p-0.5 rounded bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 transition cursor-pointer"
                title="Shift Row Up"
              >
                <ArrowUp className="w-2.5 h-2.5" />
              </button>
              <button
                onClick={() => onShiftRow('down')}
                className="p-0.5 rounded bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 transition cursor-pointer"
                title="Shift Row Down"
              >
                <ArrowDown className="w-2.5 h-2.5" />
              </button>
              <div className="w-px h-2 bg-slate-800 mx-0.5" />
              <button
                onClick={() => handleClearTrack(track.id)}
                className="p-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition cursor-pointer"
                title="Clear Track Notes"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 2. RIGHT HIGH-RESOLUTION PIANO ROLL & EVENT CANVAS */}
        <div
          style={{ height: `${isDrum ? 60 : isExpanded ? trackHeight : 60}px` }}
          className="flex-1 flex relative bg-slate-950 select-none overflow-hidden group transition-[height] duration-75"
        >
          {/* Piano Keyboard Key Strip on Left of Melodic Tracks */}
          {!isDrum && isExpanded && (
            <div className="w-10 shrink-0 border-r border-slate-800 flex flex-col bg-slate-950 z-20">
              {pitchArray.map((pMidi) => {
                const inScale = isNoteInScale(pMidi, projectKey, projectScale);
                const isRoot = pMidi % 12 === 0;
                const isBlackKey = [1, 3, 6, 8, 10].includes(pMidi % 12);

                return (
                  <button
                    key={`key_${pMidi}`}
                    type="button"
                    onClick={() => previewHit(pMidi, 0.3)}
                    className={`flex-1 border-b border-slate-900 flex items-center justify-end pr-1 text-[8px] font-mono transition cursor-pointer ${
                      isRoot
                        ? 'bg-amber-500/30 text-amber-300 font-bold hover:bg-amber-500/40'
                        : inScale
                        ? isBlackKey
                          ? 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                          : 'bg-slate-950 text-slate-300 hover:bg-slate-900'
                        : isBlackKey
                        ? 'bg-black text-slate-700 hover:bg-slate-900'
                        : 'bg-slate-950 text-slate-700 hover:bg-slate-900'
                    }`}
                    title={`Play ${midiToNoteName(pMidi)} (MIDI ${pMidi})`}
                  >
                    <span className="opacity-80 leading-none">{midiToNoteName(pMidi)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Timeline & Note Placement Surface */}
          <div
            ref={laneContainerRef}
            onMouseDown={handleLaneMouseDown}
            className="flex-1 relative cursor-crosshair overflow-hidden"
          >
            {/* Horizontal Pitch Guidelines for Expanded Melodic View */}
            {!isDrum && isExpanded && (
              <div className="absolute inset-0 flex flex-col pointer-events-none">
                {pitchArray.map((pMidi) => {
                  const inScale = isNoteInScale(pMidi, projectKey, projectScale);
                  const isRoot = pMidi % 12 === 0;
                  return (
                    <div
                      key={pMidi}
                      className={`flex-1 border-b border-slate-900/40 ${
                        isRoot ? 'bg-amber-500/5' : inScale ? 'bg-slate-900/10' : 'bg-black/20'
                      }`}
                    />
                  );
                })}
              </div>
            )}

            {/* Continuous 4-Bar Timeline Grid Lines (Global alignment) */}
            <div className="absolute inset-0 grid grid-cols-4 pointer-events-none">
              {[0, 1, 2, 3].map((b) => (
                <div key={b} className="border-r border-slate-800/70 relative">
                  {/* 16th-note subtle ticks */}
                  <div className="absolute inset-0 grid grid-cols-4">
                    {[0, 1, 2, 3].map((t) => (
                      <div key={t} className="border-r border-slate-900/40" />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Real-time Global Sweeping Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] pointer-events-none z-30"
              style={{ left: `${playheadPercent}%` }}
            />

            {/* Rendered Note / Rhythmic Event Blocks */}
            <div className="absolute inset-0 pointer-events-none">
              {notes.map((note) => {
                // Read live position if currently dragging
                const isBeingDragged = activeDrag?.noteId === note.id;
                const liveStartTick = isBeingDragged ? activeDrag.startTick : note.startTick;
                const liveDuration = isBeingDragged ? activeDrag.durationTicks : note.durationTicks;
                const liveMidi = isBeingDragged ? activeDrag.midiNote : note.midiNote;

                const leftPercent = (liveStartTick / TICKS_PER_4_BARS) * 100;
                const widthPercent = Math.max(1.2, (liveDuration / TICKS_PER_4_BARS) * 100);
                const isNoteSelected = selectedNoteIds.includes(note.id);
                const noteName = isDrum ? track.name.split(' ')[0].toUpperCase() : midiToNoteName(liveMidi);

                let topPercent = 15;
                let heightPercent = 70;
                if (!isDrum && isExpanded) {
                  const pitchIndex = pitchArray.indexOf(liveMidi);
                  topPercent = pitchIndex !== -1 ? (pitchIndex / totalPitches) * 100 : 50;
                  heightPercent = Math.max(3.8, (1 / totalPitches) * 100);
                }

                return (
                  <div
                    key={note.id}
                    onMouseDown={(e) => handleNoteMouseDown(e, note, 'MOVE')}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNotes(track.id, [note.id]);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteNotes(track.id, [note.id]);
                    }}
                    style={{
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`,
                      top: `${topPercent}%`,
                      height: `${heightPercent}%`,
                      backgroundColor: trackColor,
                    }}
                    className={`absolute rounded-md shadow-md pointer-events-auto flex items-center justify-between px-1 text-[9px] font-mono font-bold text-slate-950 transition-all cursor-grab active:cursor-grabbing select-none overflow-hidden ${
                      isNoteSelected
                        ? 'ring-2 ring-white shadow-[0_0_12px_rgba(255,255,255,0.8)] z-20 brightness-110'
                        : 'hover:brightness-105 z-10'
                    }`}
                    title={`${noteName} | Drag to Move/Transpose | Drag Right Edge to Stretch | Double-Click to Delete`}
                  >
                    {/* Left Nudge Resize Handle */}
                    <div
                      onMouseDown={(e) => handleNoteMouseDown(e, note, 'RESIZE_LEFT')}
                      className="absolute left-0 top-0 bottom-0 w-2 hover:bg-white/40 cursor-ew-resize"
                      title="Drag left to nudge start"
                    />

                    {/* Note Label & Grab Icon */}
                    <div className="truncate flex items-center space-x-1 pl-1">
                      <span className="text-[7.5px] opacity-70">⠿</span>
                      <span>{noteName}</span>
                      {note.lyric && (
                        <span className="px-1 py-0.2 rounded bg-black/40 text-white text-[8px] font-normal truncate">
                          "{note.lyric}"
                        </span>
                      )}
                    </div>

                    {/* Right Duration Stretch Handle */}
                    <div
                      onMouseDown={(e) => handleNoteMouseDown(e, note, 'RESIZE_RIGHT')}
                      title="Drag to Stretch Duration"
                      className="absolute right-0 top-0 bottom-0 w-3 hover:bg-white/60 cursor-ew-resize flex items-center justify-center group/stretch"
                    >
                      <div className="w-1 h-3 bg-black/40 group-hover/stretch:bg-black/70 rounded-full" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Velocity Automation Sub-Lane (if toggled) */}
            {showVelocityLane && (
              <div className="absolute bottom-0 left-0 right-0 h-5 bg-slate-900/80 border-t border-slate-800/80 pointer-events-none flex items-end">
                {notes.map((note) => {
                  const leftPercent = (note.startTick / TICKS_PER_4_BARS) * 100;
                  const hPercent = (note.velocity / 127) * 100;
                  return (
                    <div
                      key={`vel_${note.id}`}
                      style={{ left: `${leftPercent}%`, height: `${hPercent}%` }}
                      className="absolute w-1 bg-amber-400 rounded-t"
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. BOTTOM TRACK RESIZE DRAG HANDLE (Vertical Zoom) */}
      {!isDrum && isExpanded && (
        <div
          onMouseDown={handleHeightResizeStart}
          className="h-1.5 bg-slate-900 hover:bg-amber-500/60 border-t border-slate-800/60 cursor-ns-resize flex items-center justify-center transition-colors group/handle"
          title="Drag to Vertically Zoom Track Height"
        >
          <div className="w-8 h-0.5 bg-slate-700 group-hover/handle:bg-amber-300 rounded-full" />
        </div>
      )}
    </div>
  );
};
