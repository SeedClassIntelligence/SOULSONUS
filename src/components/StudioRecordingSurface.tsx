import React, { useEffect, useRef, useState } from 'react';
import { Mic, Circle, Square, Undo2, Plus, ChevronRight } from 'lucide-react';
import { useStudioSession } from '../app/StudioSessionContext';
import { detectionEngine } from '../audio/detectionEngine';
import { InterpretationPanel } from './InterpretationPanel';
import { CreativeIntentPanel } from './CreativeIntentPanel';

/**
 * The microphone, the song underneath it, and the record button.
 *
 * This replaces the Live Expression Engine block, on the creator's own reading
 * of what that block was doing to them:
 *
 *   "We were allowing the technology underneath SoulSonus to dictate the
 *    interface. That's what made it complicated. The creator doesn't need to
 *    see an Expression Engine. They need to feel like: I'm in the studio.
 *    There's my microphone. There's my song underneath me. I hit record and
 *    perform. Everything sophisticated happens behind that experience."
 *
 * Nothing is removed. Record Loop, Stack Overdub, Undo Last Pass, the pass
 * count, the interpretation layer and the creative intent are all still here --
 * the first three as a row that only exists once there is a take to talk
 * about, and the last two as a card that appears after a pass rather than a
 * panel standing open before one. Amendment D: organizing is not replacing.
 *
 * The ten words under the microphone are the whole product statement, and they
 * are not ten workstations. They are ways of putting something into this
 * session, and each one changes only what the studio does with what it hears:
 *
 *   Record Audio  don't interpret it -- keep exactly what was given
 *   Beatbox       read it rhythmically, split onto percussion channels
 *   Clap          the same, for body percussion
 *   Hum           read pitch and melody
 *   Mimic         you are imitating an instrument; work out its part
 *   Sing          a sung performance
 *   Speak         listen for creative direction, not for notes
 *   MIDI          hardware keys, played in
 *   Import        a performance you already recorded
 *   Melody        a melodic idea, for the channel that is armed
 *
 * Each of them does what it says here and nothing it does not: every word is
 * wired to a capture path that already exists and is tested, and where two
 * words share a mechanism the difference is what the studio is told to do with
 * the result, which is stated on the card rather than implied by the label.
 */

/**
 * The modalities the seed names, and two more the platform grew.
 *
 * SRT-1 XVII.2 lists Talk | Sing | Hum | Beatbox | Mimic | Upload, and
 * Amendment A.9 lists Beatbox | Hum | Sing | Mimic | Clap/Tap | Speak | MIDI.
 * All of them are here, plus Record Audio (keep it as given) and Melody (a
 * melodic idea aimed at the armed channel).
 */
export type ExpressionModality =
  | 'AUDIO'
  | 'BEATBOX'
  | 'CLAP'
  | 'HUM'
  | 'MIMIC'
  | 'SING'
  | 'SPEAK'
  | 'MIDI'
  | 'IMPORT'
  | 'MELODY';

export interface ExpressionModalityDef {
  id: ExpressionModality;
  label: string;
  /** One line, shown when this modality is chosen. Never a slogan. */
  says: string;
}

/**
 * The Live Expression Engine, as a table rather than a panel.
 *
 * Amendment A.10 -- "then context changes depending on what you're doing" --
 * is what this is: the engine did not go away when its panel did, it became
 * the thing that decides what the studio does with what it hears and what the
 * surface says it will do. Clause C.2 is the reason the entries are equals in
 * a row rather than Beatbox with the rest hanging off it.
 */
export type ExpressionEngine = ExpressionModalityDef[];

export const EXPRESSION_ENGINE: ExpressionEngine = [
  { id: 'AUDIO', label: 'Record Audio', says: 'Recorded as given. Nothing is interpreted into notes — the audio lands on the armed channel.' },
  { id: 'BEATBOX', label: 'Beatbox', says: 'Read rhythmically. Kicks, snares and hats are split onto their own channels as you perform.' },
  { id: 'CLAP', label: 'Clap', says: 'Body percussion — claps, taps, knees, chest. Read the same way, with the low thump kept apart from the slap.' },
  { id: 'HUM', label: 'Hum', says: 'Read for pitch. What you hum becomes notes, in the register you hummed them.' },
  { id: 'MIMIC', label: 'Mimic', says: 'You are imitating an instrument. Rhythm, pitch and articulation are read together to work out the part.' },
  { id: 'SING', label: 'Sing', says: 'A sung performance. Kept as your voice, and read for pitch and phrasing.' },
  { id: 'SPEAK', label: 'Speak', says: 'Listening for direction, not for notes. Opens the command bar, which carries anything that is not a direct instruction to the co-producer.' },
  { id: 'MIDI', label: 'MIDI', says: 'Hardware keys, played straight in. No microphone involved.' },
  { id: 'IMPORT', label: 'Import', says: 'A performance you already recorded, read by the same processors a live pass gets.' },
  { id: 'MELODY', label: 'Melody', says: 'A melodic idea for the channel that is armed. Read for pitch, and aimed at that instrument rather than at a lead voice.' },
];

/** Which of these open the microphone rather than another door. */
const MIC_MODALITIES: ExpressionModality[] = ['AUDIO', 'BEATBOX', 'CLAP', 'HUM', 'MIMIC', 'SING', 'MELODY'];

export const StudioRecordingSurface: React.FC = () => {
  const {
    tracks,
    selectionContext,
    dawState,
    detectionSettings,
    captureError,
    handleQuickPerformanceCapture,
    handleStopCapture,
    startSeedRecording,
    stopSeedRecording,
    setIsAudioImportModalOpen,
    setMimicryTargetId,
    handleUndo,
    canUndo,
    lastInterpretation,
    expressionState,
    revisions,
  } = useStudioSession();

  const [modality, setModality] = useState<ExpressionModality>('BEATBOX');
  /** Set only while a plain audio take is running, which does not arm the classifier. */
  const [audioTakeTrackId, setAudioTakeTrackId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  /**
   * The input level, drawn from the microphone rather than from a formula.
   *
   * The surface this replaces drew a waveform out of `Math.sin` and
   * `Math.random` -- it animated the same whether the microphone was open or
   * refused. This reads the analyser: a flat line is silence, and an empty
   * strip is a microphone that is not open. That difference is the whole
   * reason the meter is worth having.
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const history: number[] = new Array(120).fill(0);
    let frame = 0;

    const draw = () => {
      const level = detectionEngine.inputLevel();
      history.push(level ?? 0);
      history.shift();

      const { width, height } = canvas;
      const mid = height / 2;
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = level === null ? '#1e293b' : '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, mid);
      ctx.lineTo(width, mid);
      ctx.stroke();

      if (level !== null) {
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        history.forEach((v, i) => {
          const x = (i / (history.length - 1)) * width;
          const amp = Math.min(1, v * 6) * (height * 0.45);
          if (i === 0) ctx.moveTo(x, mid - amp);
          else ctx.lineTo(x, mid - amp);
        });
        ctx.stroke();
        ctx.beginPath();
        history.forEach((v, i) => {
          const x = (i / (history.length - 1)) * width;
          const amp = Math.min(1, v * 6) * (height * 0.45);
          if (i === 0) ctx.moveTo(x, mid + amp);
          else ctx.lineTo(x, mid + amp);
        });
        ctx.stroke();
      }

      frame = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(frame);
  }, []);

  const armed =
    tracks.find((t) => t.id === selectionContext.selectedTrackId) || tracks[0] || null;

  const recording = dawState.isRecordingMic || audioTakeTrackId !== null;
  const chosen = EXPRESSION_ENGINE.find((w) => w.id === modality) as ExpressionModalityDef;

  // The playhead, in the terms a creator reads it in.
  const step = dawState.currentStep || 0;
  const bar = Math.floor(step / 16) + 1;
  const beat = Math.floor((step % 16) / 4) + 1;

  const passes = revisions.filter((r) => r.origin === 'capture').length;

  const start = async () => {
    setNote(null);
    if (!armed) {
      setNote('There is no channel to record onto. Add a track first.');
      return;
    }

    if (modality === 'AUDIO') {
      // Straight to the armed channel, with no classifier in the way: the
      // recorder writes the audio and places it as a clip on that track.
      const kept = await startSeedRecording(armed.id);
      if (!kept) {
        setNote('The microphone did not open, so nothing is being recorded.');
        return;
      }
      setAudioTakeTrackId(armed.id);
      return;
    }

    if (modality === 'MELODY') {
      // The difference between this and Hum is what the reading is aimed at.
      setMimicryTargetId(armed.id);
    }
    if (modality === 'MIMIC' && !dawState.isRecordingMic) {
      setMimicryTargetId(armed.id);
    }

    const captureModality =
      modality === 'BEATBOX' ? 'MOUTH'
      : modality === 'CLAP' ? 'BODY'
      : modality === 'MIMIC' ? 'MIMIC'
      : modality === 'MIDI' ? 'KEYS'
      : 'VOICE';

    await handleQuickPerformanceCapture(
      captureModality as 'MOUTH' | 'BODY' | 'KEYS' | 'VOICE' | 'MIMIC'
    );
  };

  const stop = async () => {
    if (audioTakeTrackId) {
      const kept = await stopSeedRecording();
      setAudioTakeTrackId(null);
      setNote(
        kept
          ? `Kept ${kept.seconds.toFixed(1)}s on ${armed?.name || 'the armed channel'}.`
          : 'Nothing usable was recorded, so nothing was written.'
      );
      return;
    }
    await handleStopCapture();
  };

  /**
   * Acting on a reading: the same route the deck used, kept whole. The panel
   * never commits anything itself -- this opens the realization drawer on the
   * channel the reading is about.
   */
  const realizeAs = (h: { role: string; instrument: string; targetRole: string }) => {
    const target =
      tracks.find((t) => t.instrument === h.instrument) ||
      tracks.find((t) => t.id === selectionContext.selectedTrackId);
    if (!target) return;
    window.dispatchEvent(
      new CustomEvent('soulsonus:openDrawer', {
        detail: {
          type: 'realization',
          trackId: target.id,
          prompt: `Realize ${target.name} as ${h.role}`,
        },
      })
    );
  };

  const choose = (id: ExpressionModality) => {
    setNote(null);
    if (id === 'SPEAK') {
      window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'voice' }));
      return;
    }
    if (id === 'IMPORT') {
      setIsAudioImportModalOpen(true);
      return;
    }
    setModality(id);
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-6 shadow-2xl mb-3 font-mono select-none flex flex-col items-center gap-4">
      {/* Whether the microphone is actually open. Not a decoration: a mic that
          says it is live and is not is the failure this studio was built out
          of. */}
      <div
        data-testid="capture-status"
        className={`flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase ${
          recording ? 'text-rose-400' : 'text-slate-500'
        }`}
      >
        <Circle className={`w-2 h-2 ${recording ? 'fill-current animate-pulse' : 'fill-current opacity-40'}`} />
        <span>{recording ? 'LIVE' : detectionSettings.micConnected ? 'MIC READY' : 'INPUT READY'}</span>
      </div>

      <canvas
        ref={canvasRef}
        width={520}
        height={44}
        data-testid="input-level"
        className="w-full max-w-lg h-9 opacity-90"
        title="The microphone's own input level. An empty strip means the microphone is not open."
      />

      <div
        className={`w-28 h-28 rounded-full border flex items-center justify-center transition ${
          recording
            ? 'border-rose-500/60 bg-rose-500/10 shadow-lg shadow-rose-500/20'
            : 'border-slate-700 bg-slate-950'
        }`}
      >
        <Mic className={`w-10 h-10 ${recording ? 'text-rose-300' : 'text-slate-300'}`} />
      </div>

      {/* The song underneath: which channel is armed, and where the playhead is
          standing. Recording happens there, not on a pad and not on a second
          timeline. */}
      <div className="text-center">
        <div className="text-sm font-black tracking-wide text-slate-100 uppercase" data-testid="armed-track">
          {armed ? armed.name : 'no channel armed'}
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">Studio Microphone</div>
        <div className="text-[10px] font-mono text-slate-500 mt-1" data-testid="record-destination">
          Bar {bar} · Beat {beat} · {dawState.bpm} BPM · records onto this channel
        </div>
      </div>

      <button
        type="button"
        data-testid="record"
        onClick={() => void (recording ? stop() : start())}
        disabled={!MIC_MODALITIES.includes(modality) && modality !== 'MIDI'}
        className={`px-10 py-3 rounded-2xl font-black text-sm tracking-wide transition active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
          recording
            ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
            : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20'
        }`}
      >
        {recording ? <Square className="w-4 h-4 fill-current" /> : <Circle className="w-3.5 h-3.5 fill-current" />}
        <span>{recording ? 'STOP' : 'RECORD'}</span>
      </button>

      {/* The ten words. They are the product statement, so they are plain,
          equal, and unexplained until one is chosen. */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-3xl">
        {EXPRESSION_ENGINE.map((w) => {
          const active = modality === w.id;
          return (
            <button
              key={w.id}
              type="button"
              data-testid={`capture-${w.id.toLowerCase()}`}
              data-active={active}
              onClick={() => choose(w.id)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer border ${
                active
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-100 hover:border-slate-700'
              }`}
            >
              {w.label}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-400 text-center max-w-xl leading-relaxed" data-testid="modality-says">
        {chosen.says}
      </p>

      {captureError && (
        <p id="capture-error" className="text-[10px] text-rose-300 text-center max-w-xl leading-relaxed">
          {captureError}
        </p>
      )}
      {note && (
        <p className="text-[10px] text-amber-300 text-center max-w-xl leading-relaxed" data-testid="record-note">
          {note}
        </p>
      )}

      {/* Everything that only means something once there is a take. It does not
          stand open in front of a creator who has not performed yet. */}
      {passes > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1 border-t border-slate-800 w-full">
          <span className="text-[10px] font-mono text-slate-500" data-testid="pass-count">
            {passes} pass{passes === 1 ? '' : 'es'} recorded
          </span>
          <button
            type="button"
            data-testid="stack-overdub"
            onClick={() => void start()}
            disabled={recording}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-bold text-slate-300 hover:text-white hover:border-slate-700 transition cursor-pointer disabled:opacity-40"
          >
            <Plus className="w-3 h-3 inline mr-1" />
            Stack another pass
          </button>
          <button
            type="button"
            data-testid="undo-pass"
            onClick={() => handleUndo()}
            disabled={!canUndo || recording}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-bold text-slate-300 hover:text-white hover:border-slate-700 transition cursor-pointer disabled:opacity-40"
          >
            <Undo2 className="w-3 h-3 inline mr-1" />
            Undo last pass
          </button>
        </div>
      )}

      {/* The microphone's own settings live where a creator would look for
          them, and the deep ones stay one reach further in rather than on this
          surface: input device, gain, monitoring and thresholds are the
          calibration drawer's job and it already does it. */}
      <button
        type="button"
        data-testid="mic-setup"
        onClick={() =>
          window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'calibration' }))
        }
        className="text-[10px] font-mono text-slate-500 hover:text-slate-300 transition cursor-pointer flex items-center gap-1"
        title="Input device, gain, monitoring, detection thresholds"
      >
        Mic setup <ChevronRight className="w-3 h-3" />
      </button>

      {/* What the studio made of the take, when there is a take to talk about.
          Before a pass this is not collapsed -- it is absent, because there is
          nothing it could honestly say. Creative intent sits with it, and
          stays folded until asked for: the reading is the thing a creator just
          earned, and what the studio understands them to be going for is the
          question behind it rather than beside it. */}
      {(lastInterpretation || expressionState) && (
        <div className="w-full pt-2 space-y-2" data-testid="after-the-take">
          <InterpretationPanel onRealizeAs={realizeAs} />
          <CreativeIntentPanel />
        </div>
      )}
    </div>
  );
};
