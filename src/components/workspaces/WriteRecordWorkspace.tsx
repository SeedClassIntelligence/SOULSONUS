import React, { useState } from 'react';
import { useStudioSession } from '../../app/StudioSessionContext';
import { Mic, Music, Sparkles, Layers, Volume2, Wand2, Disc, PenTool, ShieldCheck, Plus, Trash2, Play, AlertCircle } from 'lucide-react';
import { audioEngine } from '../../audio/audioEngine';
import { VocalLayer } from '../VocalLayer';
import type { WriteRoomTake } from '../../app/StudioSessionContext';
import { loadAiConfig, queryStudioIntelligence } from '../../lib/studioIntelligenceService';

export const WriteRecordWorkspace: React.FC = () => {
  const {
    vocalState,
    setVocalState,
    sections,
    selectionContext,
    setSelectionContext,
    dawState,
    tracks,
    writeRoomDraft,
    updateWriteRoomDraft,
    expressionState,
  } = useStudioSession();

  const [isWritingAssist, setIsWritingAssist] = useState<'hook' | 'cadence' | null>(null);
  const [writingAssistError, setWritingAssistError] = useState<string | null>(null);

  const selectedSection = sections.find((s) => s.id === selectionContext.selectedSectionId) || sections[0];

  // The draft lives in the session. Held locally, leaving this room to check
  // the mix destroyed whatever had been written and restored the demo text.
  const { lyrics, cadence, takes } = writeRoomDraft;
  const setLyrics = (v: string | ((p: string) => string)) =>
    updateWriteRoomDraft({ lyrics: typeof v === 'function' ? v(lyrics) : v });
  const setCadence = (v: string) => updateWriteRoomDraft({ cadence: v });
  const setTakes = (v: WriteRoomTake[] | ((p: WriteRoomTake[]) => WriteRoomTake[])) =>
    updateWriteRoomDraft({ takes: typeof v === 'function' ? v(takes) : v });

  const handleStartVocalRecording = async () => {
    setVocalState((prev) => ({ ...prev, isRecording: true }));
    await audioEngine.startVocalRecord(
      () => tracks,
      () => {},
      (result) => {
        setVocalState((prev) => ({
          ...prev,
          isRecording: false,
          audioBlob: result.blob,
          audioBuffer: result.buffer,
          waveformData: result.waveform,
          duration: result.duration,
        }));
      }
    );
  };

  const handleStopVocalRecording = async () => {
    await audioEngine.stopVocalRecord();
    setVocalState((prev) => ({ ...prev, isRecording: false }));
  };

  /**
   * "+ Hook Idea" and "+ Verse Cadence" used to append one of two hardcoded
   * sentences, always exactly the same text regardless of the song, labeled
   * "AI Writing Assist" over a plain string literal. The Native Studio Brain
   * (the built-in reasoning engine, zero-config) has no branch for creative
   * writing prompts -- it would answer a lyric request with a generic status
   * line, which is honest but useless for this button's actual job. So this
   * only calls the real reasoning pipeline when a real generative provider
   * (Ollama, Gemini, OpenAI) is configured in Native Brain settings, and
   * says exactly that when none is, rather than silently producing a
   * non-answer dressed up as a suggestion.
   */
  const handleWritingAssist = async (kind: 'hook' | 'cadence') => {
    const config = loadAiConfig();
    if (config.provider === 'LOCAL_BRAIN') {
      setWritingAssistError(
        'The built-in Native Brain reasons about DAW actions, not open-ended lyric writing. Configure a real ' +
          'provider (Ollama, Gemini, or OpenAI) in Native Brain settings to enable this.'
      );
      return;
    }
    setWritingAssistError(null);
    setIsWritingAssist(kind);
    try {
      const instruction =
        kind === 'hook'
          ? `Write one alternative hook line for this song, in the voice already established below. Return only the line itself, no preamble.\n\nExisting lyrics:\n${lyrics || '(nothing written yet)'}`
          : `Suggest a short verse line built around the song's cadence at ${dawState.bpm} BPM. Return only the line itself, no preamble.\n\nExisting lyrics:\n${lyrics || '(nothing written yet)'}`;
      const response = await queryStudioIntelligence(
        instruction,
        config,
        dawState,
        tracks,
        'WRITE_RECORD',
        tracks.find((t) => t.id === selectionContext.selectedTrackId) || null,
        expressionState
      );
      const label = kind === 'hook' ? 'Hook Alternative' : 'Verse Cadence';
      setLyrics((prev) => `${prev}\n\n[${label}]\n${response.content.trim()}`);
    } catch (err) {
      setWritingAssistError(err instanceof Error ? err.message : 'The reasoning provider did not answer.');
    } finally {
      setIsWritingAssist(null);
    }
  };

  const handleAddTake = (type: 'lead' | 'harmony' | 'adlib') => {
    const newTake: WriteRoomTake = {
      id: `take_${Date.now()}`,
      name: `${type.toUpperCase()} Take ${takes.length + 1}`,
      type,
      muted: false,
      volume: 0,
    };
    setTakes((prev) => [...prev, newTake]);
  };

  return (
    <div className="w-full space-y-6 pb-8">
      {/* Workspace Header */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30">
            <Mic className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-100">Recording Room & Songwriting Suite</h2>
              <span className="px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-300 text-[10px] font-mono border border-pink-500/30">
                Write & Record
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Draft lyrics with cadence mapping and record authoritative vocal takes over the active arrangement.
            </p>
          </div>
        </div>

        {/* Target Section Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-mono">Target Section:</span>
          <div className="flex items-center space-x-1">
            {sections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => setSelectionContext((prev) => ({ ...prev, selectedSectionId: sec.id }))}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  selectionContext.selectedSectionId === sec.id
                    ? 'bg-pink-500 text-slate-950 font-bold shadow-md shadow-pink-500/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {sec.name}
              </button>
            ))}
          </div>
        </div>

        {/* Level 2 is the activity at hand, and Amendment A §17's own example
            of it is "if you're writing: Lyrics + melody + structure". Reading
            a sung take as a lyric seed is that work, and it was reachable only
            from the level 4 rail — filed correctly, but not present in the
            activity it belongs to. It is still on the rail; this is the second
            door, not a move. */}
        <button
          type="button"
          data-testid="write-room-vocal-to-lyric"
          onClick={() => window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'lyric' }))}
          className="px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/40 text-purple-300 hover:bg-purple-500/25 text-xs font-bold cursor-pointer transition"
          title="Read a sung or hummed take as a lyric seed, and fit words to the cadence you performed"
        >
          VOCAL → LYRIC
        </button>
      </div>

      {/* 2-Column Songwriting & Vocal Take Stack Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Lyric Studio */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <PenTool className="w-4 h-4 text-pink-400" />
                <h3 className="text-sm font-bold text-slate-200">LYRIC DRAFTING & CADENCE STUDIO</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                {cadence}
              </span>
            </div>

            {/* Lyric Text Area */}
            <div className="mt-4">
              <textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                rows={12}
                className="w-full bg-slate-950 border border-slate-800 focus:border-pink-500 text-xs text-slate-200 font-mono p-4 rounded-xl outline-none leading-relaxed transition"
                placeholder="Write lyrics here..."
              />
            </div>

            {/* AI Rhyme & Cadence Assist Buttons -- real reasoning-provider
                calls now, not two fixed sentences. */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 font-bold flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>AI Writing Assist:</span>
              </span>
              <button
                onClick={() => handleWritingAssist('hook')}
                disabled={isWritingAssist !== null}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-semibold"
              >
                {isWritingAssist === 'hook' ? 'Thinking…' : '+ Hook Idea'}
              </button>
              <button
                onClick={() => handleWritingAssist('cadence')}
                disabled={isWritingAssist !== null}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-semibold"
              >
                {isWritingAssist === 'cadence' ? 'Thinking…' : '+ Verse Cadence'}
              </button>
            </div>
            {writingAssistError && (
              <div className="mt-2 p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-[10px] text-amber-200 font-sans leading-snug flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>{writingAssistError}</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Rights & Influence-Aware Writing Active</span>
            </span>
            <span>Target: {selectedSection?.name}</span>
          </div>
        </div>

        {/* Right Column (5 cols): Authoritative Vocal Take Stack & Recorder */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Mic className="w-4 h-4 text-pink-400" />
                <h3 className="text-sm font-bold text-slate-200">VOCAL TAKE STACK</h3>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleAddTake('harmony')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-pink-400" />
                  <span>+ Harmony</span>
                </button>
              </div>
            </div>

            {/* Vocal Recorder Strip */}
            <div className="mt-4">
              <VocalLayer
                vocalState={vocalState}
                currentStep={dawState.currentStep}
                isPlayingSequencer={dawState.isPlaying}
                onStartRecordVocal={handleStartVocalRecording}
                onStopRecordVocal={handleStopVocalRecording}
                onUpdateVocalState={(updates) => {
                  if (typeof updates.volume === 'number') audioEngine.setVocalVolume(updates.volume);
                  setVocalState((prev) => ({ ...prev, ...updates }));
                }}
                onClearVocal={() => {
                  audioEngine.setVocalBuffer(null);
                  setVocalState((prev) => ({
                    ...prev,
                    audioBlob: null,
                    audioBuffer: null,
                    waveformData: [],
                    duration: 0,
                  }));
                }}
              />
            </div>

            {/* Take Stack List */}
            <div className="mt-4 space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Vocal Stems & Takes ({takes.length})
              </div>
              {takes.map((take) => (
                <div
                  key={take.id}
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-200">{take.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">Type: {take.type.toUpperCase()}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        setTakes((prev) =>
                          prev.map((t) => (t.id === take.id ? { ...t, muted: !t.muted } : t))
                        )
                      }
                      className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        take.muted ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {take.muted ? 'MUTED' : 'ON'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-500">
            <span>Synchronized Transport Lock</span>
            <span className="text-pink-400 font-semibold">{vocalState.duration > 0 ? `${vocalState.duration.toFixed(1)}s` : 'No vocal buffer'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
