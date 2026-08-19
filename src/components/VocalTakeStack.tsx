import React, { useState, useEffect, useRef } from 'react';
import { Track, VocalTake } from '../types/daw';
import { useStudioSession } from '../app/StudioSessionContext';
import { startTakeRecording, TakeRecording } from '../audio/takeRecorder';
import { auditionCompSegment, isPlayableAudioSource, AuditionHandle } from '../audio/vocalAudition';
import {
  Layers,
  Play,
  Trash2,
  Star,
  Repeat,
} from 'lucide-react';

interface VocalTakeStackProps {
  track: Track | null;
}

export const VocalTakeStack: React.FC<VocalTakeStackProps> = ({ track }) => {
  const {
    tracks,
    handleAddVocalTake,
    handleSetActiveTake,
    handleDeleteTake,
    handleUpdateTakeRating,
    handlePlaceTakeOnTimeline,
    vocalSelectionContext,
    setVocalSelectionContext,
  } = useStudioSession();

  const currentTrack = track || tracks.find((t) => t.id === 't-vocal') || tracks[0];

  const takes = currentTrack?.vocalTakes || [];

  const [playingTakeId, setPlayingTakeId] = useState<string | null>(null);
  const [isLoopRecording, setIsLoopRecording] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [placingTakeId, setPlacingTakeId] = useState<string | null>(null);
  const playbackRef = useRef<AuditionHandle | null>(null);
  const recordingRef = useRef<TakeRecording | null>(null);

  useEffect(
    () => () => {
      playbackRef.current?.stop();
      recordingRef.current?.cancel();
    },
    []
  );

  if (!currentTrack) return <div className='p-6 text-center text-neutral-500'>No vocal track selected</div>;

  // Plays the take's own recording. A take with nothing behind it says so
  // rather than glowing for three seconds over silence.
  const handlePlayTake = async (take: VocalTake) => {
    if (playbackRef.current) {
      playbackRef.current.stop();
      playbackRef.current = null;
      if (playingTakeId === take.id) {
        setPlayingTakeId(null);
        return;
      }
    }
    if (!isPlayableAudioSource(take.sourceAudioId)) return;

    setPlayingTakeId(take.id);
    try {
      const handle = await auditionCompSegment({ sourceUrl: take.sourceAudioId, gainTrimDb: take.gainTrim || 0 });
      playbackRef.current = handle;
      await handle.finished;
    } catch (err) {
      console.warn('[VocalTakeStack] take playback failed:', err);
    } finally {
      playbackRef.current = null;
      setPlayingTakeId((current) => (current === take.id ? null : current));
    }
  };

  // Records for real. This used to be a setTimeout that produced a take record
  // with an invented waveform and no audio at all.
  const handleRecordLoopTake = async () => {
    if (recordingRef.current) {
      const recording = recordingRef.current;
      recordingRef.current = null;
      const audio = await recording.stop();
      setIsLoopRecording(false);
      const takeNum = takes.length + 1;
      handleAddVocalTake(currentTrack.id, {
        takeNumber: takeNum,
        name: `Take ${String(takeNum).padStart(2, '0')} (Loop Capture)`,
        sectionId: 'sec_hook',
        timelineStart: 13,
        timelineEnd: 20,
        duration: Math.round(audio.durationSeconds * 100) / 100,
        waveformData: audio.waveform,
        audioBlob: audio.blob,
      });
      return;
    }

    setRecordError(null);
    try {
      recordingRef.current = await startTakeRecording();
      setIsLoopRecording(true);
    } catch (err) {
      setRecordError(err instanceof Error ? err.message : 'Microphone unavailable.');
    }
  };

  return (
    <div className="bg-slate-950/95 border border-slate-800/90 rounded-2xl p-4 shadow-2xl space-y-3 select-none text-xs font-mono">
      {/* 1. Header with Recording & Pool Stats */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2.5 gap-2">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-pink-400" />
          <span className="font-black text-slate-100 uppercase tracking-wide">
            VOCAL TAKE POOL • {currentTrack.name.toUpperCase()} ({takes.length} Takes)
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold">
            IMMUTABLE RAW PROVENANCE LOCKED
          </span>
        </div>

        {/* Record Take in Loop Button */}
        <button
          onClick={handleRecordLoopTake}
          data-testid="record-loop-take"
          className={`px-3.5 py-1.5 rounded-xl font-black text-xs flex items-center space-x-1.5 transition cursor-pointer active:scale-95 shadow-md ${
            isLoopRecording
              ? 'bg-rose-500 text-white animate-pulse'
              : 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-slate-950 shadow-pink-500/20'
          }`}
        >
          <Repeat className={`w-3.5 h-3.5 ${isLoopRecording ? 'animate-spin' : ''}`} />
          <span>{isLoopRecording ? 'STOP & KEEP TAKE' : '+ RECORD TAKE (HOOK LOOP)'}</span>
        </button>
      </div>

      {/* 2. Takes List */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
        {takes.map((take) => {
          const isPlaying = playingTakeId === take.id;
          const hasAudio = isPlayableAudioSource(take.sourceAudioId);
          const isContextSelected = vocalSelectionContext.takeId === take.id;

          return (
            <div
              key={take.id}
              onClick={() =>
                setVocalSelectionContext((prev) => ({
                  ...prev,
                  takeId: take.id,
                }))
              }
              className={`p-3 rounded-xl border transition cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
                isContextSelected
                  ? 'bg-slate-900 border-pink-500 ring-1 ring-pink-500/40 shadow-lg'
                  : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900/90'
              }`}
            >
              {/* Left: Take Info & Rating */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!hasAudio) return;
                    setPlacingTakeId(take.id);
                    try {
                      await handlePlaceTakeOnTimeline(currentTrack.id, take.id);
                    } finally {
                      setPlacingTakeId(null);
                    }
                  }}
                  disabled={!hasAudio}
                  data-testid={`place-take-${take.id}`}
                  className={`h-8 px-2 rounded-xl text-[9px] font-black tracking-wide flex items-center justify-center transition ${
                    !hasAudio
                      ? 'bg-slate-950 border border-slate-900 text-slate-700 cursor-not-allowed'
                      : placingTakeId === take.id
                      ? 'bg-cyan-400 text-slate-950 animate-pulse cursor-pointer'
                      : 'bg-slate-950 border border-slate-800 text-cyan-300 hover:border-cyan-500 cursor-pointer'
                  }`}
                  title={hasAudio ? 'Place this take on the timeline at the playhead' : 'No recorded audio behind this take'}
                >
                  {placingTakeId === take.id ? '…' : '→ TIMELINE'}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void handlePlayTake(take);
                  }}
                  disabled={!hasAudio}
                  data-testid={`play-take-${take.id}`}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition ${
                    !hasAudio
                      ? 'bg-slate-950 border border-slate-900 text-slate-700 cursor-not-allowed'
                      : isPlaying
                      ? 'bg-amber-400 text-slate-950 animate-pulse cursor-pointer'
                      : 'bg-slate-950 border border-slate-800 text-pink-300 hover:border-pink-500 cursor-pointer'
                  }`}
                  title={hasAudio ? 'Play this take' : 'No recorded audio behind this take'}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                </button>

                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-slate-100 text-xs">{take.name}</span>
                    {take.isActive && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black">
                        ACTIVE TRACK TAKE
                      </span>
                    )}
                    {take.isScratchVocal && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold">
                        SCRATCH MELODY
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                    <span>Bars {take.timelineStart}–{take.timelineEnd} ({take.duration}s)</span>
                    <span>•</span>
                    <span className="text-slate-500 font-mono text-[9px]">ID: {take.rawAudioAssetId || take.id}</span>
                  </div>
                </div>
              </div>

              {/* Center: Waveform Amplitude Visualization */}
              <div className="flex-1 w-full md:w-auto h-8 bg-slate-950 rounded-lg p-1.5 flex items-center justify-between border border-slate-800/80 gap-0.5">
                {take.waveformData.length === 0 && (
                  <span className="text-[9px] text-slate-600 w-full text-center">no audio recorded</span>
                )}
                {take.waveformData.map((amp, aIdx) => {
                  // Older take records store peaks as 0..100, newer ones as
                  // 0..1. Drawing both on one scale would make one of them a
                  // flat line and the other overflow the box.
                  const peak = Math.max(...take.waveformData);
                  const normalised = peak > 1 ? amp / 100 : amp;
                  return (
                    <div
                      key={aIdx}
                      className={`flex-1 rounded-full transition-all ${
                        isPlaying ? 'bg-pink-400' : take.isActive ? 'bg-emerald-400' : 'bg-slate-600'
                      }`}
                      style={{ height: `${Math.max(8, Math.min(100, normalised * 100))}%` }}
                    />
                  );
                })}
              </div>

              {/* Right: Actions (Set Active, Star Rating, Delete) */}
              <div className="flex items-center space-x-2">
                {/* 5-Star Rating */}
                <div className="flex items-center space-x-0.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateTakeRating(currentTrack.id, take.id, star);
                      }}
                      className="cursor-pointer p-0.5"
                    >
                      <Star
                        className={`w-3 h-3 ${
                          star <= (take.rating || 3)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-700'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetActiveTake(currentTrack.id, take.id);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer ${
                    take.isActive
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {take.isActive ? 'PRIMARY' : 'SET PRIMARY'}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTake(currentTrack.id, take.id);
                  }}
                  className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-500 hover:text-red-400 hover:border-red-500/40 transition cursor-pointer"
                  title="Delete Take"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
