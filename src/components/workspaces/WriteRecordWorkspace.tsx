import React, { useState } from 'react';
import { useStudioSession } from '../../app/StudioSessionContext';
import { Mic, Music, Sparkles, Layers, Volume2, Wand2, Disc, PenTool, ShieldCheck, Plus, Trash2, Play } from 'lucide-react';
import { audioEngine } from '../../audio/audioEngine';
import { VocalLayer } from '../VocalLayer';

interface VocalTake {
  id: string;
  name: string;
  type: 'lead' | 'harmony' | 'adlib';
  muted: boolean;
  volume: number;
}

export const WriteRecordWorkspace: React.FC = () => {
  const {
    vocalState,
    setVocalState,
    sections,
    selectionContext,
    setSelectionContext,
    dawState,
    tracks,
  } = useStudioSession();

  const selectedSection = sections.find((s) => s.id === selectionContext.selectedSectionId) || sections[0];

  const [lyrics, setLyrics] = useState(
    `[Chorus — ${selectedSection?.name || 'Hook'}]\nBounce on the beatbox, beat on the grid,\nSoulSonus catch every rhythm I did.\nLow kick thump when the baseline slide,\nSoulFlow lock it when the voices align.\n\n[Verse]\nHumming the melody, baseline groove,\nTap on the table, watch the playhead move...`
  );

  const [cadence, setCadence] = useState('4/4 Syncopated Southern Soul / Trap Cadence at 110 BPM');

  const [takes, setTakes] = useState<VocalTake[]>([
    { id: 'take_1', name: 'Lead Vocal — Main Take', type: 'lead', muted: false, volume: 0 },
    { id: 'take_2', name: 'Harmony 1 — High Third', type: 'harmony', muted: false, volume: -3 },
    { id: 'take_3', name: 'Harmony 2 — Low Fifth', type: 'harmony', muted: true, volume: -4 },
    { id: 'take_4', name: 'Ad-Libs & Accents', type: 'adlib', muted: false, volume: -2 },
  ]);

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

  const handleAddTake = (type: 'lead' | 'harmony' | 'adlib') => {
    const newTake: VocalTake = {
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

            {/* AI Rhyme & Cadence Assist Buttons */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 font-bold flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>AI Writing Assist:</span>
              </span>
              <button
                onClick={() => setLyrics((prev) => prev + '\n\n[Hook Alternative]\nVoice is the instrument, rhythm is live...')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                + Hook Idea
              </button>
              <button
                onClick={() => setLyrics((prev) => prev + '\n\n[Verse Cadence]\nTap on the table, watch the playhead move...')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                + Verse Cadence
              </button>
            </div>
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
                onStartRecord={handleStartVocalRecording}
                onStopRecord={handleStopVocalRecording}
                onChangeVolume={(vol) => {
                  audioEngine.setVocalVolume(vol);
                  setVocalState((prev) => ({ ...prev, volume: vol }));
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
