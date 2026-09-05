import React, { useState } from 'react';
import { useStudioSession } from '../app/StudioSessionContext';
import {
  TIMING_MODES,
  TIMING_MODE_LABEL,
  TIMING_MODE_MEANING,
  type TimingMode,
  type TimingResult,
} from '../lib/timingModes';

/**
 * The middle of the sentence, on screen: what the studio believes the
 * performance means, before anything is realized from it.
 *
 * Amendment A.8 asks for exactly this and says why -- "your current screen
 * does Performance -> Realization extremely well visually. We need to expose
 * the middle" -- and clause C.3 names it the Interpretation layer. It was
 * built, and it was 140 lines of JSX inside the expression engine, so the
 * thing the seed names had no name here. This is that panel, called what the
 * seed calls it.
 *
 * Nothing about its behaviour changes by moving: it renders after the material
 * is already committed to its tracks, so ignoring it entirely leaves the take
 * exactly as performed (Amendment F.v), and every control it carries kept its
 * test handle.
 *
 * Three things live here, and they are one thought:
 *
 *   the ranked readings, each with the measurement behind it, and a way to
 *   act on any of them rather than only look at them;
 *   the disagreement, when the take contradicts what the creator declared;
 *   and the timing row, because SRT-1 VII's quantization choice is a choice
 *   about the pass that was just read.
 */
export const InterpretationPanel: React.FC<{
  /** Propose a realization of one reading. The panel never commits anything. */
  onRealizeAs: (h: { role: string; instrument: string; targetRole: string }) => void;
}> = ({ onRealizeAs }) => {
  const {
    tracks,
    selectionContext,
    lastInterpretation,
    clearLastInterpretation,
    interpretationSubjectId,
    trackTimingModes,
    applyTrackTiming,
  } = useStudioSession();

  /**
   * Adjustable quantization, on the material the reading is about.
   *
   * SRT-1 VII: "the user should retain the feel of their performance.
   * Therefore quantization should be adjustable." The channel is named rather
   * than implied -- a pass can write several, and a row that said "Timing"
   * over an unnamed target would be quantizing something the creator cannot
   * see.
   */
  const timingTrack =
    (interpretationSubjectId ? tracks.find((t) => t.id === interpretationSubjectId) : null) ||
    (lastInterpretation?.hypotheses.length
      ? tracks.find((t) => t.instrument === lastInterpretation.hypotheses[0].instrument)
      : null) ||
    tracks.find((t) => t.id === selectionContext.selectedTrackId) ||
    null;
  const timingNoteCount = timingTrack?.noteEvents?.length ?? 0;
  const [timingReport, setTimingReport] = useState<TimingResult | null>(null);
  const activeTimingMode: TimingMode =
    (timingTrack && trackTimingModes[timingTrack.id]) || 'literal';

  const chooseTiming = (mode: TimingMode) => {
    if (!timingTrack) return;
    setTimingReport(applyTrackTiming(timingTrack.id, mode));
  };

  /**
   * The fourth mode SRT-1 VII names: "use the beatbox as rhythmic intent and
   * generate a polished production pattern." It is not a quantize and does not
   * move a note, so it opens the realization drawer on this channel rather
   * than running through `applyTrackTiming`.
   */
  const chooseReinterpretation = () => {
    if (!timingTrack) return;
    setTimingReport(null);
    window.dispatchEvent(
      new CustomEvent('soulsonus:openDrawer', {
        detail: { type: 'realization', trackId: timingTrack.id },
      })
    );
  };

  // Nothing read means nothing shown. The take is on its tracks either way.
  if (!lastInterpretation || lastInterpretation.hypotheses.length === 0) return null;

  return (
    <div className="mt-2 rounded-xl border border-cyan-500/30 bg-slate-950/70 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800">
        <span className="text-[10px] font-mono font-black uppercase tracking-widest text-cyan-300">
          What SoulSonus heard
        </span>
        <span className="text-[10px] text-slate-500 font-mono truncate">{lastInterpretation.summary}</span>
        <button
          type="button"
          onClick={clearLastInterpretation}
          className="ml-auto text-[10px] font-mono text-slate-500 hover:text-slate-200 cursor-pointer shrink-0"
          title="Dismiss. The take is already on its tracks either way."
        >
          dismiss
        </button>
      </div>

      {/* When the take contradicts what the creator declared, say it here
          rather than quietly ranking the declaration anyway. Amendment B
          gives the creator "that's not what I heard"; this is the studio
          saying the same thing back, and it is the reason declaring a
          target is worth anything. */}
      {lastInterpretation.disagreement && (
        <div className="px-3 py-2 border-b border-slate-800 bg-amber-500/5">
          <p className="text-[10px] font-mono text-amber-300 leading-relaxed">
            {lastInterpretation.disagreement}
          </p>
          <p className="text-[9px] font-mono text-slate-500 mt-0.5">
            Your take was kept exactly as performed. The readings below are what was
            actually measured.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-800">
        {lastInterpretation.hypotheses.slice(0, 6).map((h, i) => (
          <div key={h.role} className="bg-slate-950 px-3 py-2 space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className={`text-[11px] font-bold ${i === 0 ? 'text-cyan-300' : 'text-slate-300'}`}>
                {h.role}
                {h.declared && (
                  <span
                    className="ml-1.5 px-1 py-0.2 rounded bg-amber-500/15 text-amber-300 text-[8px] font-black border border-amber-500/30 align-middle"
                    title="You said this is what you were imitating. It is ranked on the evidence for it, the same as every other reading here."
                  >
                    YOURS
                  </span>
                )}
              </span>
              <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                {Math.round(h.confidence * 100)}%
              </span>
            </div>
            <div className="h-[3px] rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${i === 0 ? 'bg-cyan-400' : 'bg-slate-600'}`}
                style={{ width: `${Math.round(h.confidence * 100)}%` }}
              />
            </div>
            {/* Never a bare percentage. The reason it holds is stated. */}
            <p className="text-[9px] leading-relaxed text-slate-500 font-mono">{h.basis[0]}</p>
            <button
              type="button"
              data-testid={`realize-as-${h.targetRole}`}
              onClick={() => onRealizeAs(h)}
              className="w-full mt-0.5 py-1 rounded-lg bg-slate-900 border border-cyan-500/30 text-cyan-300 hover:bg-slate-800 text-[9px] font-mono font-bold transition cursor-pointer"
              title={`Propose a realization of this take as ${h.role}. Nothing is committed until you accept the candidate.`}
            >
              REALIZE AS {h.role.toUpperCase()}
            </button>
          </div>
        ))}
      </div>

      {/* TIMING -- the mockup's second row, on the named channel.
          Undoable and written as a revision, so trying one is not a
          commitment. `literal` restores the performed placement exactly:
          each note carries where it was played, so no mode is a one-way
          door. */}
      {timingTrack && timingNoteCount > 0 && (
        <div className="px-3 py-2 border-t border-slate-800" data-testid="timing-row">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-500">
              Timing
            </span>
            <span className="text-[9px] font-mono text-slate-500">
              {timingTrack.name} — {timingNoteCount} note{timingNoteCount === 1 ? '' : 's'}
            </span>
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {TIMING_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                data-testid={`timing-${mode}`}
                onClick={() => chooseTiming(mode)}
                className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold border transition cursor-pointer ${
                  activeTimingMode === mode
                    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                    : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                }`}
                title={TIMING_MODE_MEANING[mode]}
              >
                {TIMING_MODE_LABEL[mode]}
              </button>
            ))}
            {/* The fourth mode. Kept in the same row because the seed
                lists it with the other three, and visibly apart because
                it makes a proposal rather than a change. */}
            <button
              type="button"
              data-testid="timing-reinterpretation"
              onClick={chooseReinterpretation}
              className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold border transition cursor-pointer bg-slate-900 text-purple-300 border-purple-500/40 hover:bg-purple-500/10"
              title="Use this take as rhythmic intent and propose a produced pattern from it. It moves nothing — it opens a candidate you can turn down."
            >
              reinterpret it
            </button>
          </div>
          {/* What happened, not what was asked for. */}
          <p
            data-testid="timing-report"
            className="text-[9px] font-mono text-slate-500 mt-1 leading-snug"
          >
            {timingReport ? timingReport.summary : TIMING_MODE_MEANING[activeTimingMode]}
          </p>
        </div>
      )}

      <p className="px-3 py-1.5 text-[9px] font-mono text-slate-600 border-t border-slate-800">
        Your take is already on its tracks. Keeping it as recorded is the default — these only
        propose a candidate, and nothing changes until you accept one.
      </p>
    </div>
  );
};
