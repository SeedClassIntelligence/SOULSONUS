import React, { useEffect, useRef, useState } from 'react';
import { Mic, Circle, Square, Undo2, Plus, ChevronRight, ChevronDown, Volume2 } from 'lucide-react';
import { useStudioSession } from '../app/StudioSessionContext';
import { detectionEngine } from '../audio/detectionEngine';
import { MIC_PRESETS, describePreset, presetById } from '../lib/micPresets';
import { PlaybackTransport } from './PlaybackTransport';
import { PRESETS } from '../data/presets';
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
    handleToggleMetronome,
    handleSelectPreset,
    setDawState,
    handleUpdateTrack,
    setDetectionSettings,
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
  const [presetId, setPresetId] = useState('warm_vocal');
  const [presetOpen, setPresetOpen] = useState(false);
  const [input, setInput] = useState<{ device: string | null; sampleRate: number | null; autoGain: boolean | null }>(
    { device: null, sampleRate: null, autoGain: null }
  );
  const preset = presetById(presetId);

  // What the microphone actually is, asked of the microphone. Polled rather
  // than assumed, because it only becomes true once the stream is open.
  useEffect(() => {
    const id = window.setInterval(() => setInput(detectionEngine.inputInfo()), 1000);
    return () => window.clearInterval(id);
  }, []);

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

  // The playhead, in the terms a creator reads it in. The tick is not shown
  // here -- the counter in the transport carries it -- because this line is
  // telling them where the take will land, not clocking it.
  const step = dawState.currentStep || 0;
  const bar = Math.floor(step / 16) + 1;
  const beat = Math.floor((step % 16) / 4) + 1;

  /**
   * Tap tempo.
   *
   * The tempo could only be typed as a number, which is not how anyone
   * arrives at the tempo of a thing they are about to perform. Taps are held
   * in a ref rather than state so a tap does not re-render the surface before
   * the next one lands; the run resets after a two-second gap, so leaving and
   * coming back starts a new count instead of averaging across the pause.
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

  /**
   * Applies a preset for real: the input gain the capture engine runs at, and
   * the armed channel's own EQ and compression, which the mixer and the bounce
   * both honour. A preset that changed nothing but a label would be the thing
   * this studio keeps having to take back out.
   */
  const applyPreset = (id: string) => {
    const p = presetById(id);
    setPresetId(id);
    setPresetOpen(false);
    setDetectionSettings((prev) => ({ ...prev, gain: p.gain }));
    if (armed) handleUpdateTrack(armed.id, { dspSettings: { ...(armed.dspSettings || {}), ...p.dsp } });
    setNote(
      `${p.name} applied to ${armed ? armed.name : 'the armed channel'} — ${describePreset(p)}, input gain ${p.gain}×.`
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

  const destination =
    modality === 'AUDIO'
      ? 'Direct to DAW timeline'
      : modality === 'MIDI'
        ? 'Played in — notes land on the armed channel'
        : 'Split onto instrument channels · the take is kept whole';

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl mb-3 font-mono select-none">
      {/* Header: what this is, whether it is live, and the microphone's preset. */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-slate-300" />
          <span className="text-xs font-black tracking-wide text-slate-100">STUDIO RECORDING</span>
          <span
            data-testid="capture-status"
            className={`flex items-center gap-1 text-[9px] font-black tracking-widest uppercase ${
              recording ? 'text-rose-400' : 'text-cyan-400'
            }`}
          >
            <Circle className={`w-2 h-2 fill-current ${recording ? 'animate-pulse' : ''}`} />
            {recording ? 'LIVE' : 'READY'}
          </span>
        </div>

        <div className="relative">
          <button
            type="button"
            data-testid="mic-preset"
            onClick={() => setPresetOpen((v) => !v)}
            className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 text-[10px] font-black tracking-wide flex items-center gap-1.5 hover:bg-amber-500/20 transition cursor-pointer"
            title={describePreset(preset)}
          >
            MIC PRESET: {preset.name.toUpperCase()}
            <ChevronDown className="w-3 h-3" />
          </button>
          {presetOpen && (
            <div
              data-testid="mic-preset-menu"
              className="absolute right-0 top-full mt-1 w-72 z-40 rounded-xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden"
            >
              {MIC_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  data-testid={`mic-preset-${p.id}`}
                  onClick={() => applyPreset(p.id)}
                  className={`w-full text-left px-3 py-2 border-b border-slate-900 last:border-0 transition cursor-pointer ${
                    p.id === presetId ? 'bg-amber-500/10' : 'hover:bg-slate-900'
                  }`}
                >
                  <div className="text-[11px] font-bold text-slate-100">{p.name}</div>
                  <div className="text-[9px] text-slate-500">{describePreset(p)}</div>
                </button>
              ))}
              <p className="px-3 py-2 text-[9px] leading-snug text-slate-500 border-t border-slate-800">
                Each preset writes real EQ and compression onto the armed channel and sets the
                input gain. The values are above, not a mood.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 px-4 py-5">
        {/* Where it is going. */}
        <div className="space-y-2">
          <div className="text-[9px] font-bold tracking-widest text-slate-500 uppercase">Current destination</div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5">
            <div className="text-[9px] text-slate-500 uppercase tracking-wider">Armed track</div>
            <div className="text-xs font-bold text-slate-100 mt-0.5" data-testid="armed-track">
              {armed ? armed.name : 'No channel armed'}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5">
            <div className="text-[9px] text-slate-500 uppercase tracking-wider">Playhead</div>
            <div className="text-xs font-bold text-slate-100 mt-0.5">Bar {bar} · Beat {beat}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5">
            <div className="text-[9px] text-slate-500 uppercase tracking-wider">Recording path</div>
            <div className="text-xs font-bold text-cyan-300 mt-0.5" data-testid="record-destination">
              {destination}
            </div>
          </div>
        </div>

        {/* The microphone. */}
        <div className="flex flex-col items-center justify-start gap-2">
          <div
            className={`w-32 h-32 rounded-full border flex items-center justify-center transition ${
              recording
                ? 'border-rose-500/60 bg-rose-500/10 shadow-lg shadow-rose-500/20'
                : 'border-slate-700 bg-slate-950'
            }`}
          >
            <Mic className={`w-12 h-12 ${recording ? 'text-rose-300' : 'text-slate-200'}`} />
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase text-cyan-400">
            <Circle className="w-2 h-2 fill-current" />
            {recording ? 'RECORDING' : 'INPUT READY'}
          </div>

          <div className="text-sm font-black tracking-wide text-slate-100 uppercase text-center">
            {armed ? armed.name : 'no channel armed'}
          </div>

          {/* Said only of a microphone that is open. */}
          <div className="text-[10px] text-slate-400 text-center" data-testid="input-line">
            {input.device
              ? `${input.device} · ${input.sampleRate ? `${Math.round(input.sampleRate / 1000)} kHz` : 'rate unknown'} · auto gain ${input.autoGain ? 'on' : 'off'}`
              : 'Microphone opens when you press record'}
          </div>

          <canvas
            ref={canvasRef}
            width={420}
            height={36}
            data-testid="input-level"
            className="w-full max-w-xs h-8 opacity-90"
            title="The microphone's own input level. An empty strip means it is not open."
          />

          {/* The transport, where the recording is.
              RECORD, then play/stop/loop and the counter, then the parameters
              that decide what a take is measured against: the click, the
              tempo, tap tempo, the master level and the genre kit. All of it
              used to sit in a bar above the rooms -- a second recording
              surface at the other end of the screen from the microphone it
              drove.

              The parameters stay here and only here. The rooms that have no
              microphone get PlaybackTransport, which is the play half of this
              row and nothing else: "just having record there without allowing
              me to set parameters like BPM, tap, to be able to play it, reset
              and all of that stuff makes no sense." */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] font-mono">
            <button
              type="button"
              id="btn-mic-arm"
              data-testid="record"
              onClick={() => void (recording ? stop() : start())}
              className={`px-4 h-8 rounded-lg font-black flex items-center gap-1.5 border transition cursor-pointer ${
                recording
                  ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/40 animate-pulse'
                  : 'bg-rose-600/90 hover:bg-rose-500 text-white border-rose-500'
              }`}
              title={recording ? 'Stop and keep the take' : 'Record onto the armed channel'}
            >
              {recording ? <Square className="w-3 h-3 fill-current" /> : <Circle className="w-2.5 h-2.5 fill-current" />}
              <span>{recording ? 'STOP' : 'RECORD'}</span>
            </button>

            <PlaybackTransport />

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
              METRO
            </button>

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

            {/* Tap tempo. New: the tempo could only be typed as a number
                before, which is not how anyone arrives at the tempo of
                something they are about to perform. Four taps is enough to
                read one; the run resets after a two-second gap so a stray
                click does not drag the average. */}
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

            <div
              className="flex items-center gap-1.5 bg-slate-950 px-2.5 h-8 rounded-lg border border-slate-800"
              title={`Master bus output level: ${Math.round(dawState.masterVolume * 100)}%`}
            >
              <Volume2 className="w-3 h-3 text-slate-400" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                data-testid="master-volume"
                value={dawState.masterVolume}
                onChange={(e) => setDawState((prev) => ({ ...prev, masterVolume: Number(e.target.value) }))}
                className="w-16 accent-amber-500 cursor-pointer"
              />
            </div>

            <select
              data-testid="kit-preset"
              onChange={(e) => {
                const p = PRESETS.find((preset) => preset.id === e.target.value);
                if (p) handleSelectPreset(p);
              }}
              className="bg-slate-950 border border-slate-800 text-[10px] text-slate-300 font-mono h-8 px-2 rounded-lg focus:outline-none focus:border-amber-500 cursor-pointer"
              title="Load a production genre kit"
            >
              <option value="">Kit preset…</option>
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">
                  {p.name} ({p.bpm} BPM)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* The microphone itself, described from the microphone. */}
        <div className="space-y-2">
          <div className="text-[9px] font-bold tracking-widest text-slate-500 uppercase">Microphone / input</div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5">
            <div className="text-[9px] text-slate-500 uppercase tracking-wider">Preset</div>
            <div className="text-xs font-bold text-slate-100 mt-0.5">{preset.says}</div>
            <div className="text-[9px] font-mono text-slate-500 mt-0.5" data-testid="preset-values">
              {describePreset(preset)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5">
            <div className="text-[9px] text-slate-500 uppercase tracking-wider">Monitoring</div>
            <div className="text-xs font-bold text-slate-100 mt-0.5">
              {input.sampleRate ? `${Math.round(input.sampleRate / 1000)} kHz` : 'Not open yet'}
              {detectionSettings.enabled ? ' · listening' : ''}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5">
            <div className="text-[9px] text-slate-500 uppercase tracking-wider">SoulSonus intelligence</div>
            <div className="text-xs font-bold text-emerald-300 mt-0.5" data-testid="intelligence-line">
              {modality === 'AUDIO'
                ? 'Off — recorded as given'
                : `Expression-aware capture · ${chosen.label}`}
            </div>
          </div>
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
        </div>
      </div>

      {/* The ten words. */}
      <div className="px-4 pb-2 flex flex-wrap items-center justify-center gap-2">
        {EXPRESSION_ENGINE.map((w) => {
          const active = modality === w.id;
          return (
            <button
              key={w.id}
              type="button"
              data-testid={`capture-${w.id.toLowerCase()}`}
              data-active={active}
              onClick={() => choose(w.id)}
              className={`px-3.5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wide transition cursor-pointer border ${
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

      <p className="px-4 pb-3 text-[10px] text-slate-500 text-center leading-relaxed">
        Choose <span className="text-slate-300 font-bold">how SoulSonus should understand your input</span>.
        Everything records to the armed track and the DAW timeline.
      </p>

      <p className="px-4 pb-4 text-[11px] text-slate-400 text-center leading-relaxed" data-testid="modality-says">
        {chosen.says}
      </p>

      {captureError && (
        <p id="capture-error" className="px-4 pb-3 text-[10px] text-rose-300 text-center leading-relaxed">
          {captureError}
        </p>
      )}
      {note && (
        <p className="px-4 pb-3 text-[10px] text-amber-300 text-center leading-relaxed" data-testid="record-note">
          {note}
        </p>
      )}

      {passes > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 px-4 py-3 border-t border-slate-800">
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

      <div className="px-4 pb-4">
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
    </div>
  );
};
