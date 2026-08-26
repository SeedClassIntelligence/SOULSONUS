import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Drum,
  Activity,
  Music,
  Wand2,
  AlertCircle,
  Trash2,
  Target,
  Plus,
  Play,
  Square,
  Download,
  CornerDownRight,
} from 'lucide-react';
import { useStudioSession } from '../app/StudioSessionContext';
import { SOUND_PRESETS } from './UnifiedTrackLane';
import { TICKS_PER_16TH, TICKS_PER_BEAT } from '../utils/musicMath';
import { audioEngine } from '../audio/audioEngine';
import { defaultTrackDsp } from '../audio/trackStrip';

/**
 * The performance instrument: one dedicated room, three tabs (Train / Play /
 * Packs), eight real pad slots. This replaced three links sitting flat in
 * the Create canvas -- each just firing a track into existence with nothing
 * else around it. Every control here calls a function that already exists
 * elsewhere in the app (handleQuickPerformanceCapture, handleCalibrateTrack,
 * handleQuantizeTrackNotes, handleUpdateChannelStrip, handleTransposeNotes)
 * -- this is a new surface over real capability, not a new implementation
 * of it.
 */
interface InstrumentRoomProps {
  onClose: () => void;
}

type Tab = 'TRAIN' | 'PLAY' | 'PACKS';
const PAD_COUNT = 8;

const MODALITIES: { modality: 'MOUTH' | 'BODY' | 'KEYS'; icon: React.ReactNode; color: string }[] = [
  { modality: 'MOUTH', icon: <Drum className="w-3.5 h-3.5" />, color: 'text-amber-400' },
  { modality: 'BODY', icon: <Activity className="w-3.5 h-3.5" />, color: 'text-cyan-400' },
  { modality: 'KEYS', icon: <Music className="w-3.5 h-3.5" />, color: 'text-purple-400' },
];

export const InstrumentRoom: React.FC<InstrumentRoomProps> = ({ onClose }) => {
  const {
    dawState,
    handleToggleMetronome,
    tracks,
    setTracks,
    selectionContext,
    setSelectionContext,
    detectionSettings,
    captureError,
    handleQuickPerformanceCapture,
    handleStopCapture,
    handleDeleteTrack,
    handleClearTrack,
    handleCalibrateTrack,
    calibratingTrackId,
    handleQuantizeTrackNotes,
    handleTransposeNotes,
    handleUpdateChannelStrip,
    audioAssets,
    handlePlaceAudioClip,
    handleRemoveAudioClip,
  } = useStudioSession();

  const [tab, setTab] = useState<Tab>('TRAIN');
  const [openSlotIndex, setOpenSlotIndex] = useState<number | null>(null);
  const [playingClipId, setPlayingClipId] = useState<string | null>(null);
  const [destTrackId, setDestTrackId] = useState<string>('');
  const [sentNote, setSentNote] = useState<string | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  // A take that is playing when this room closes would keep playing.
  useEffect(() => {
    return () => {
      audioElRef.current?.pause();
      audioElRef.current = null;
    };
  }, []);

  const takes = tracks.filter((t) => t.isSourceTrack);
  const padSlots = Array.from({ length: PAD_COUNT }, (_, i) => takes[i] || null);

  const selected = tracks.find((t) => t.id === selectionContext.selectedTrackId) || null;
  const selectedIsPad = selected?.isSourceTrack;
  const focused = selectedIsPad ? selected : null;

  const selectPad = (id: string) => {
    setSelectionContext((prev) => ({ ...prev, selectedTrackId: id }));
    setOpenSlotIndex(null);
  };

  const startInSlot = (modality: 'MOUTH' | 'BODY' | 'KEYS') => {
    handleQuickPerformanceCapture(modality);
    setOpenSlotIndex(null);
  };

  const previewPad = (track: (typeof tracks)[number]) => {
    audioEngine.triggerForInstrument(track.instrument, track.pitch || 'C3', 100, track);
  };

  /**
   * Every performance pass on a pad is already stored as its own immutable,
   * hashed asset plus a clip -- `stopSeedRecording` appends one per take. This
   * is that list, surfaced: real audio, real peaks, playable, and placeable on
   * a DAW track through the same `handlePlaceAudioClip` the vocal booth's
   * "→ TIMELINE" button uses.
   */
  const takesOnPad = focused?.audioClips || [];

  const stopTakePlayback = () => {
    audioElRef.current?.pause();
    audioElRef.current = null;
    setPlayingClipId(null);
  };

  const playTake = (clipId: string, url: string) => {
    stopTakePlayback();
    if (!url) return;
    const el = new Audio(url);
    audioElRef.current = el;
    setPlayingClipId(clipId);
    el.onended = () => setPlayingClipId(null);
    el.onerror = () => setPlayingClipId(null);
    void el.play().catch(() => setPlayingClipId(null));
  };

  /**
   * Where a take goes when it is sent. The default is a real arrangement
   * track, never the pad it came from -- sending a take back onto its own pad
   * just makes a second take on that pad, which is not what "to the DAW"
   * means.
   */
  const defaultDestId = tracks.find((t) => !t.isSourceTrack)?.id || focused?.id || '';

  /** Assign a take to a DAW track, at the playhead, on the notes' own grid. */
  const sendTakeToDaw = (assetId: string, label: string) => {
    const target = destTrackId || defaultDestId;
    if (!target) return;
    const clip = handlePlaceAudioClip(target, assetId, {
      startTick: (dawState.currentStep || 0) * TICKS_PER_16TH,
      sourceDescription: label,
    });
    const targetName = tracks.find((t) => t.id === target)?.name || 'track';
    setSentNote(clip ? `Sent to ${targetName} at the playhead.` : 'That take could not be placed.');
    window.setTimeout(() => setSentNote(null), 4000);
  };

  const renderTakeStack = () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Takes ({takesOnPad.length})
        </span>
        {takesOnPad.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-slate-600">send to</span>
            <select
              value={destTrackId || defaultDestId}
              onChange={(e) => setDestTrackId(e.target.value)}
              className="bg-white/5 text-slate-300 text-[10px] px-1.5 py-0.5 rounded border border-white/10 cursor-pointer max-w-[150px]"
            >
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {takesOnPad.length === 0 ? (
        <p className="text-[11px] text-slate-600">
          No takes on this pad yet. Each time you perform into it, the recording is kept here as its own take.
        </p>
      ) : (
        <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
          {takesOnPad.map((clip, i) => {
            const asset = audioAssets[clip.assetId];
            const peaks = asset?.peaks || [];
            const isPlaying = playingClipId === clip.id;
            const label = `Take ${String(i + 1).padStart(2, '0')}`;
            return (
              <div key={clip.id} className="p-2 rounded-lg bg-white/[0.03] border border-white/10 flex items-center gap-2">
                <button
                  onClick={() => (isPlaying ? stopTakePlayback() : playTake(clip.id, asset?.url || ''))}
                  disabled={!asset?.url}
                  className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                    isPlaying ? 'bg-amber-400 text-slate-950' : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                  title={asset?.url ? 'Play this take' : 'This take’s audio is not loaded in this session'}
                >
                  {isPlaying ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[10px] font-bold text-white">{label}</span>
                    <span className="text-[9px] font-mono text-slate-600">
                      {asset ? `${asset.durationSeconds.toFixed(1)}s` : '—'}
                    </span>
                  </div>
                  {/* Real peaks from the registered asset, not a drawn shape. */}
                  <div className="flex items-center gap-[1px] h-4 mt-0.5">
                    {peaks.length > 0 ? (
                      peaks.slice(0, 96).map((p, pi) => (
                        <div
                          key={pi}
                          className="flex-1 bg-orange-400/70 rounded-[1px]"
                          style={{ height: `${Math.max(6, Math.min(100, p * 100))}%` }}
                        />
                      ))
                    ) : (
                      <span className="text-[9px] text-slate-700">no waveform stored</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => sendTakeToDaw(clip.assetId, label)}
                  className="shrink-0 px-2 h-7 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 text-[9px] font-black flex items-center gap-1 transition cursor-pointer"
                  title="Place this take on a DAW track at the playhead"
                >
                  <CornerDownRight className="w-3 h-3" />
                  <span>TO DAW</span>
                </button>

                <button
                  onClick={() => {
                    if (playingClipId === clip.id) stopTakePlayback();
                    handleRemoveAudioClip(clip.id);
                  }}
                  className="shrink-0 p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                  title="Delete this take"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {sentNote && (
        <div className="text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2 py-1">
          {sentNote}
        </div>
      )}
    </div>
  );

  const renderPadGrid = () => (
    <div className="grid grid-cols-4 gap-3">
      {padSlots.map((t, i) => {
        if (!t) {
          const isOpen = openSlotIndex === i;
          return (
            <div
              key={`empty-${i}`}
              className="aspect-square rounded-xl border border-dashed border-white/12 bg-white/[0.02] flex flex-col items-center justify-center gap-2 p-2"
            >
              {isOpen ? (
                <div className="flex flex-col items-center gap-1.5">
                  {MODALITIES.map((m) => (
                    <button
                      key={m.modality}
                      onClick={() => startInSlot(m.modality)}
                      disabled={detectionSettings.enabled}
                      className={`w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 flex items-center justify-center ${m.color} transition cursor-pointer`}
                      title={`Start this pad as ${m.modality}`}
                    >
                      {m.icon}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  onClick={() => setOpenSlotIndex(i)}
                  className="w-9 h-9 rounded-full border border-white/12 text-slate-600 hover:text-slate-300 hover:border-white/25 flex items-center justify-center transition cursor-pointer"
                  title="Empty pad -- tap to choose how to fill it"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        }

        const isTrained = !!t.detectionProfile?.centerFreq;
        const isFocused = focused?.id === t.id;
        return (
          <button
            key={t.id}
            onClick={() => selectPad(t.id)}
            className={`aspect-square rounded-xl border p-2 flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
              isFocused
                ? 'border-white bg-white/[0.06]'
                : isTrained
                ? 'border-orange-500/50 bg-white/[0.02] hover:border-orange-400/70'
                : 'border-white/12 bg-white/[0.02] hover:border-white/25'
            }`}
            title={t.name}
          >
            <span className="text-[10px] font-bold text-white text-center leading-tight line-clamp-2">{t.name}</span>
            <span className="text-[8px] font-mono text-slate-500 truncate max-w-full">{t.vaultLabel || 'unassigned'}</span>
            <div className="flex gap-[1px] h-2.5 items-end w-full px-1">
              {t.steps.map((on, si) => (
                <div key={si} className={`flex-1 rounded-[1px] ${on ? 'bg-amber-400' : 'bg-white/10'}`} style={{ height: on ? '100%' : '35%' }} />
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );

  const dsp = focused ? { ...defaultTrackDsp(focused), ...focused.dspSettings } : null;

  return (
    <div className="w-full space-y-5 pb-8">
      {/* Room Banner */}
      <div className="p-4 rounded-2xl bg-black border border-white/10 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 cursor-pointer transition-colors" title="Back to Create">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="p-2.5 rounded-xl bg-white/5 text-orange-400 border border-white/10">
            <Drum className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Instrument</h2>
            <p className="text-xs text-slate-500">Train it on your voice, then play it. Part of the creation process, not the whole of it.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="mono px-2 py-0.5 rounded-full bg-white/5 text-orange-300 text-[10px] font-mono border border-white/10">{dawState.bpm} BPM</span>
          <button
            onClick={() => void handleToggleMetronome()}
            className={`px-3 h-9 rounded-lg font-black border text-xs transition cursor-pointer active:scale-95 ${
              dawState.metronomeOn ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-white/5 text-slate-500 border-white/10'
            }`}
          >
            {dawState.metronomeOn ? 'METRO ON' : 'METRO OFF'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/10 w-fit">
        {(['TRAIN', 'PLAY', 'PACKS'] as Tab[]).map((tName) => (
          <button
            key={tName}
            onClick={() => setTab(tName)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              tab === tName ? 'bg-white text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tName}
          </button>
        ))}
      </div>

      {/* Live status */}
      {(detectionSettings.enabled || captureError) && (
        <div className="p-3 rounded-2xl bg-black border border-white/10 space-y-2">
          {captureError && (
            <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{captureError}</span>
            </div>
          )}
          {detectionSettings.enabled && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                LISTENING — LOW {Math.round((detectionSettings.currentLowLevel || 0) * 100)}% / HIGH{' '}
                {Math.round((detectionSettings.currentHighLevel || 0) * 100)}%
              </span>
              <button
                onClick={() => void handleStopCapture()}
                className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition cursor-pointer active:scale-95"
              >
                STOP
              </button>
            </div>
          )}
        </div>
      )}

      {/* ================= TRAIN ================= */}
      {tab === 'TRAIN' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 p-5 rounded-2xl bg-black border border-white/10">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Pads</div>
            {renderPadGrid()}
          </div>
          <div className="lg:col-span-5 p-5 rounded-2xl bg-black border border-white/10 space-y-3">
            {focused ? (
              <>
                <div>
                  <div className="text-sm font-bold text-white">{focused.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {focused.detectionProfile?.centerFreq
                      ? `trained: ~${focused.detectionProfile.centerFreq}Hz signature`
                      : 'not trained yet'}
                  </div>
                </div>
                <button
                  onClick={() => void handleCalibrateTrack(focused.id)}
                  disabled={calibratingTrackId === focused.id}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                    calibratingTrackId === focused.id
                      ? 'bg-amber-500/20 text-amber-300 animate-pulse'
                      : 'bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 border border-orange-500/40'
                  }`}
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>{calibratingTrackId === focused.id ? 'LISTENING…' : 'TRAIN THIS SOUND'}</span>
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleClearTrack(focused.id)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition cursor-pointer"
                  >
                    Clear &amp; restart
                  </button>
                  <button
                    onClick={() => handleDeleteTrack(focused.id)}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                    title="Delete this pad"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="pt-3 border-t border-white/10">{renderTakeStack()}</div>
              </>
            ) : (
              <p className="text-xs text-slate-500">Pick a pad on the left — an empty one to start it, a filled one to keep training it.</p>
            )}
          </div>
        </div>
      )}

      {/* ================= PLAY ================= */}
      {tab === 'PLAY' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 p-5 rounded-2xl bg-black border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pads — tap to preview</div>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'export' }))}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>EXPORT</span>
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {padSlots.map((t, i) =>
                t ? (
                  <button
                    key={t.id}
                    onClick={() => {
                      selectPad(t.id);
                      previewPad(t);
                    }}
                    className={`aspect-square rounded-xl border p-2 flex flex-col items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 ${
                      focused?.id === t.id ? 'border-white bg-white/[0.06]' : 'border-white/12 bg-white/[0.02] hover:border-white/25'
                    }`}
                    title={`Preview ${t.name}`}
                  >
                    <Play className="w-4 h-4 text-slate-400" />
                    <span className="text-[9px] font-bold text-white text-center leading-tight line-clamp-2">{t.name}</span>
                  </button>
                ) : (
                  <div key={`e-${i}`} className="aspect-square rounded-xl border border-dashed border-white/10 bg-white/[0.01]" />
                )
              )}
            </div>
          </div>
          <div className="lg:col-span-5 p-5 rounded-2xl bg-black border border-white/10 space-y-3">
            {focused ? (
              <>
                <div className="text-sm font-bold text-white">{focused.name}</div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Pattern</div>
                  <div className="flex gap-[1.5px] h-8 items-end p-2 rounded-lg bg-white/[0.02] border border-white/10">
                    {focused.steps.map((on, i) => (
                      <div key={i} className={`flex-1 rounded-[1px] ${on ? 'bg-amber-400' : 'bg-white/10'}`} style={{ height: on ? '100%' : '30%' }} />
                    ))}
                  </div>
                  <div className="text-[9px] text-slate-600 mt-1">
                    {focused.steps.filter(Boolean).length} active hits — real timing, not yet quantized unless you choose to
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tighten</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleQuantizeTrackNotes(focused.id, [], TICKS_PER_16TH)}
                      className="flex-1 px-2 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold transition cursor-pointer"
                    >
                      1/16
                    </button>
                    <button
                      onClick={() => handleQuantizeTrackNotes(focused.id, [], TICKS_PER_BEAT)}
                      className="flex-1 px-2 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold transition cursor-pointer"
                    >
                      1/4
                    </button>
                  </div>
                </div>
                <button
                  onClick={() =>
                    window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: { type: 'realization', trackId: focused.id } }))
                  }
                  className="w-full px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[11px] font-black flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>ASK AI TO TWEAK</span>
                </button>
                <div className="pt-3 border-t border-white/10">{renderTakeStack()}</div>
              </>
            ) : (
              <p className="text-xs text-slate-500">Tap a pad to preview it and see its pattern.</p>
            )}
          </div>
        </div>
      )}

      {/* ================= PACKS ================= */}
      {tab === 'PACKS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 p-5 rounded-2xl bg-black border border-white/10">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Pads</div>
            {renderPadGrid()}
          </div>
          <div className="lg:col-span-7 p-5 rounded-2xl bg-black border border-white/10 space-y-4">
            {focused && dsp ? (
              <>
                <div className="text-sm font-bold text-white">{focused.name}</div>

                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Assign</div>
                  <select
                    value={focused.vaultLabel || (SOUND_PRESETS[focused.instrument] || [])[0] || ''}
                    onChange={(e) => setTracks((prev) => prev.map((tr) => (tr.id === focused.id ? { ...tr, vaultLabel: e.target.value } : tr)))}
                    className="w-full bg-white/5 text-slate-200 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-white/10 cursor-pointer"
                  >
                    {(SOUND_PRESETS[focused.instrument] || ['Default Sound Vault Asset']).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                      <span>GAIN</span><span className="text-cyan-300 font-mono">{dsp.volume ?? 0}dB</span>
                    </div>
                    <input type="range" min="-20" max="6" step="0.5" value={dsp.volume ?? 0}
                      onChange={(e) => handleUpdateChannelStrip(focused.id, { volume: parseFloat(e.target.value) })}
                      className="w-full accent-cyan-400 cursor-pointer h-1.5" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                      <span>PAN</span><span className="text-cyan-300 font-mono">{dsp.pan ?? 0}</span>
                    </div>
                    <input type="range" min="-1" max="1" step="0.05" value={dsp.pan ?? 0}
                      onChange={(e) => handleUpdateChannelStrip(focused.id, { pan: parseFloat(e.target.value) })}
                      className="w-full accent-cyan-400 cursor-pointer h-1.5" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                      <span>LOW</span><span className="text-cyan-300 font-mono">{dsp.lowGain}dB</span>
                    </div>
                    <input type="range" min="-12" max="12" step="0.5" value={dsp.lowGain}
                      onChange={(e) => handleUpdateChannelStrip(focused.id, { lowGain: parseFloat(e.target.value) })}
                      className="w-full accent-cyan-400 cursor-pointer h-1.5" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                      <span>HIGH</span><span className="text-cyan-300 font-mono">{dsp.highGain}dB</span>
                    </div>
                    <input type="range" min="-12" max="12" step="0.5" value={dsp.highGain}
                      onChange={(e) => handleUpdateChannelStrip(focused.id, { highGain: parseFloat(e.target.value) })}
                      className="w-full accent-cyan-400 cursor-pointer h-1.5" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Filter</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleUpdateChannelStrip(focused.id, { filterType: 'lowpass' })}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold ${dsp.filterType === 'lowpass' ? 'bg-cyan-500 text-slate-950' : 'bg-white/5 text-slate-400'}`}
                      >LP</button>
                      <button
                        onClick={() => handleUpdateChannelStrip(focused.id, { filterType: 'highpass' })}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold ${dsp.filterType === 'highpass' ? 'bg-cyan-500 text-slate-950' : 'bg-white/5 text-slate-400'}`}
                      >HP</button>
                    </div>
                  </div>
                  <input type="range" min="200" max="18000" step="50" value={dsp.filterFreq}
                    onChange={(e) => handleUpdateChannelStrip(focused.id, { filterFreq: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5" />
                  <div className="text-[9px] text-slate-600 font-mono text-right">{Math.round(dsp.filterFreq)}Hz</div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Pitch</div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleTransposeNotes(focused.id, -1)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs cursor-pointer">−1</button>
                    <button onClick={() => handleTransposeNotes(focused.id, -12)} className="px-2 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 font-bold text-[10px] cursor-pointer">-8ve</button>
                    <button onClick={() => handleTransposeNotes(focused.id, 12)} className="px-2 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 font-bold text-[10px] cursor-pointer">+8ve</button>
                    <button onClick={() => handleTransposeNotes(focused.id, 1)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs cursor-pointer">+1</button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-500">Pick a pad to assign its sound and shape it.</p>
            )}
          </div>
        </div>
      )}

      <p className="text-[11px] text-slate-600 text-center">
        Closing this room drops you back on the focused pad in the full grid to keep shaping it.
      </p>
    </div>
  );
};
