import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Type, Check, ShieldAlert, Loader2 } from 'lucide-react';
import { useStudioSession } from '../app/StudioSessionContext';
import { eventsFromTrack } from '../lib/interpretation';
import {
  deriveLyricSeed,
  layOverPhrase,
  seedComposition,
  SOURCE_KIND_LABEL,
  type LyricSeed,
  type LyricSourceKind,
} from '../lib/lyricSeed';
import {
  checkAgainstCadence,
  describeGate,
  preserveCadence,
  type CadenceGateResult,
  type CandidateLine,
} from '../lib/cadenceLock';
import { loadAiConfig, queryStudioIntelligence } from '../lib/studioIntelligenceService';
import { midiToNoteName } from '../utils/musicMath';

/**
 * The Vocal-to-Lyric Workstation. SRT-1 VI, Amendment E.1.
 *
 * Its own workstation rather than a panel, because it carries state nothing
 * else carries and runs its own loop:
 *
 *   vocal seed -> phonetic extraction -> semantic clues -> syllable map
 *   -> song context -> lyric alternatives -> creator approval
 *
 * Mode A already exists as the Lyric Cadence Studio, which structures words a
 * creator has typed. This is Mode B: a performance that carries cadence and no
 * words is a lyric seed, not a failed transcription, and language is fitted to
 * it.
 *
 * Two rules run this surface.
 *
 * The four things the seed insists are different stay different on screen --
 * a word that was heard, a sound carrying cadence, a sung position, and what
 * the take is about. Nothing in this build recognises speech, so no position
 * shows a word; that is stated rather than filled with a plausible one.
 *
 * And the cadence is the creator's. A proposal that changes the syllable
 * count, moves a beat inside a word or moves the rhyme off the end of the line
 * is refused before it reaches the screen, and what the creator sees is that
 * something was refused and why. Their own writing is theirs -- the lock
 * reports on it, it does not veto it.
 */
interface VocalToLyricWorkstationProps {
  isOpen: boolean;
  onClose: () => void;
}

const KIND_TONE: Record<LyricSourceKind, string> = {
  WORD_RECOGNIZED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  PHONETIC_FRAGMENT: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  SYLLABLE_POSITION: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
  SEMANTIC_INTENT: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
};

export const VocalToLyricWorkstation: React.FC<VocalToLyricWorkstationProps> = ({ isOpen, onClose }) => {
  const {
    tracks,
    dawState,
    sections,
    expressionState,
    writeRoomDraft,
    updateWriteRoomDraft,
    handleAddLyricLine,
    selectionContext,
    activeWorkspace,
    lastPassLyricSeed,
  } = useStudioSession();

  // Takes that carry a performance to read. A drum channel is not a lyric
  // seed, so it is not offered as one.
  const candidates = useMemo(
    () =>
      tracks.filter(
        (t) =>
          (t.noteEvents?.length ?? 0) >= 2 &&
          (t.instrument === 'melody' || t.instrument === 'vocal_synth' || t.instrument === 'bass' ||
            t.sourceModality === 'MOUTH')
      ),
    [tracks]
  );
  // The take that was just performed, read at full fidelity by the fan-out
  // (SRT-1 III) rather than rebuilt from the notes it was written to. Its
  // onsets carry the velocities and pitches the microphone measured; a channel
  // carries what survived quantisation and routing. Offered first when there
  // is one, and the creator can still read any channel instead.
  const PASS = '__last_pass__';
  const [seedTrackId, setSeedTrackId] = useState<string | null>(null);
  const readingPass = lastPassLyricSeed
    ? seedTrackId === PASS || seedTrackId === null
    : false;
  const track = readingPass
    ? null
    : candidates.find((t) => t.id === seedTrackId) ||
      candidates.find((t) => t.id === selectionContext.selectedTrackId) ||
      candidates[0] ||
      null;

  const theme = (writeRoomDraft as { lyricTheme?: string }).lyricTheme || '';
  const seed: LyricSeed | null = useMemo(() => {
    if (readingPass && lastPassLyricSeed) {
      // The pass already carries the creator's theme through the fan-out; it
      // is re-applied here so typing one updates the seed without a new take.
      return { ...lastPassLyricSeed, semanticIntent: theme || lastPassLyricSeed.semanticIntent };
    }
    if (!track) return null;
    const bpm = dawState.bpm || 110;
    const events = eventsFromTrack(track, bpm);
    return deriveLyricSeed(
      events.map((e) => ({
        atSeconds: (e as unknown as { atSeconds: number }).atSeconds,
        velocity: (e as unknown as { velocity: number }).velocity,
        pitchHz: (e as unknown as { pitchHz: number }).pitchHz,
      })),
      { bpm, semanticIntent: theme || null, expression: expressionState }
    );
  }, [track, dawState.bpm, theme, expressionState, readingPass, lastPassLyricSeed]);

  const [phraseIndex, setPhraseIndex] = useState(0);
  const [draft, setDraft] = useState('');
  const [gate, setGate] = useState<CadenceGateResult | null>(null);
  const [asking, setAsking] = useState(false);
  const [askNote, setAskNote] = useState<string | null>(null);

  const phrase = seed?.phrases[phraseIndex] || null;
  const check = seed && draft.trim() ? checkAgainstCadence(draft, seed, phraseIndex) : null;
  const overlay = seed && draft.trim() ? layOverPhrase(draft, seed, phraseIndex) : null;
  const composition = seed ? seedComposition(seed) : null;

  /**
   * Asks the studio for lines that fit, then refuses the ones that do not
   * before they reach the screen.
   *
   * The brief carries the cadence in the terms it has to be met in -- the
   * syllable count, which beats were hit, what the take is about -- because a
   * request that does not state the constraint produces answers the gate then
   * throws away.
   */
  const askForLines = async () => {
    if (!seed || !phrase) return;
    setAsking(true);
    setAskNote(null);
    try {
      const config = loadAiConfig();
      // The native brain reasons about the session -- routes, masking, the
      // arrangement -- and has no branch that writes verse. Asking it anyway
      // would return studio advice, which the gate would then refuse four
      // times over for changing the syllable count, and the creator would be
      // told their cadence was protected from something that was never a
      // lyric. Said plainly instead, and their own writing is checked either
      // way.
      if (config.provider === 'LOCAL_BRAIN') {
        setAskNote(
          'The native brain reasons about your session; it does not write verse. Point Studio ' +
            'Intelligence at a language model in its settings and this asks that instead — every ' +
            'line it returns is still checked against the cadence you performed before you see it.'
        );
        setGate(null);
        return;
      }
      const brief =
        `Write 4 alternative lyric lines for a song. Each line MUST be exactly ` +
        `${phrase.syllableCount} syllables. The stressed beats are at positions ` +
        `${seed.positions
          .filter((p) => p.phrase === phraseIndex && p.stressed)
          .map((p) => seed.positions.filter((q) => q.phrase === phraseIndex).indexOf(p) + 1)
          .join(', ') || 'none in particular'}, so a word must START on those. ` +
        (theme ? `The song is about: ${theme}. ` : '') +
        `Reply with the lines only, one per line, no numbering.`;
      const answer = await queryStudioIntelligence(
        brief,
        config,
        dawState,
        tracks,
        activeWorkspace,
        track,
        expressionState
      );
      const lines = (answer.content || '')
        .split('\n')
        .map((l) => l.replace(/^[-*\d.)\s]+/, '').trim())
        .filter((l) => l.length > 2 && !/^\*\*/.test(l))
        .slice(0, 8);
      if (!lines.length) {
        setAskNote(
          `${config.provider} returned nothing that reads as a lyric line. Your own lines are ` +
            `checked against the cadence either way.`
        );
        setGate(null);
        return;
      }
      const proposed: CandidateLine[] = lines.map((text, i) => ({
        id: `prop_${Date.now()}_${i}`,
        text,
        phraseIndex,
        from: 'STUDIO_INTELLIGENCE',
      }));
      setGate(preserveCadence(proposed, seed));
    } catch (err) {
      setAskNote(err instanceof Error ? err.message : String(err));
    } finally {
      setAsking(false);
    }
  };

  const keepLine = (text: string) => {
    const sectionId = sections[0]?.id || 'sec_verse';
    handleAddLyricLine(sectionId, text);
    setDraft('');
    setGate(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          data-testid="vocal-to-lyric"
          className="fixed right-0 top-0 bottom-0 w-full sm:w-[520px] md:w-[560px] bg-slate-950/98 border-l border-slate-800 shadow-2xl z-40 flex flex-col overflow-hidden font-mono select-none"
        >
          <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-900/90 shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30">
                <Type className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-100 uppercase tracking-wide">
                  Vocal to Lyric
                </h3>
                <p className="text-[10px] text-slate-400 font-sans">
                  What you sang is the cadence. Language is fitted to it.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              data-testid="vtl-close"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
            {/* WHICH TAKE */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Reading
                </span>
                <select
                  value={readingPass ? PASS : track?.id || ''}
                  onChange={(e) => setSeedTrackId(e.target.value || null)}
                  data-testid="vtl-take"
                  className="flex-1 bg-slate-900 border border-slate-800 focus:border-purple-500 text-[11px] text-slate-100 rounded-lg px-2 py-1 outline-none cursor-pointer"
                >
                  {candidates.length === 0 && !lastPassLyricSeed && (
                    <option value="">no take to read yet</option>
                  )}
                  {lastPassLyricSeed && (
                    <option value={PASS}>
                      the take you just performed — {lastPassLyricSeed.positions.length} onsets
                    </option>
                  )}
                  {candidates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.noteEvents?.length ?? 0} onsets
                    </option>
                  ))}
                </select>
              </div>
              {!candidates.length && !lastPassLyricSeed && (
                <p className="text-[10px] text-amber-300/80 mt-1.5 leading-snug">
                  Sing or hum a line first. This reads a performance; it has nothing to read yet,
                  and there is no cadence to fit words to.
                </p>
              )}
            </div>

            {seed && composition && (
              <>
                {/* THE FOUR KINDS, KEPT APART */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-2.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    What is in this seed
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1.5" data-testid="vtl-composition">
                    {(Object.keys(composition) as LyricSourceKind[]).map((kind) => (
                      <span
                        key={kind}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${KIND_TONE[kind]} ${
                          composition[kind] ? '' : 'opacity-40'
                        }`}
                      >
                        {SOURCE_KIND_LABEL[kind]}: {composition[kind]}
                      </span>
                    ))}
                  </div>
                  {seed.notMeasured.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5" data-testid="vtl-not-measured">
                      {seed.notMeasured.map((n) => (
                        <li key={n} className="text-[9px] text-amber-300/70 leading-snug">
                          {n}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* THE THEME -- theirs to state, never inferred */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-2.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    What it is about
                  </span>
                  <input
                    value={theme}
                    data-testid="vtl-theme"
                    onChange={(e) => updateWriteRoomDraft({ lyricTheme: e.target.value } as never)}
                    placeholder="Nothing here reads your mind. Say it and it goes into the brief."
                    className="w-full mt-1.5 bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-lg px-2 py-1.5 text-[11px] text-slate-100 placeholder-slate-600 outline-none"
                  />
                </div>

                {/* THE CADENCE */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      The cadence you performed
                    </span>
                    <span className="text-[9px] text-slate-500">
                      {seed.phrases.length} line{seed.phrases.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {seed.phrases.map((p) => (
                      <button
                        key={p.index}
                        type="button"
                        data-testid={`vtl-phrase-${p.index}`}
                        onClick={() => setPhraseIndex(p.index)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                          phraseIndex === p.index
                            ? 'bg-purple-500/15 text-purple-300 border-purple-500/40'
                            : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                        }`}
                      >
                        line {p.index + 1} · {p.syllableCount} syl · {p.stressPattern}
                      </button>
                    ))}
                  </div>

                  {/* Every position, with what is known about it. */}
                  {phrase && (
                    <div className="mt-2 flex flex-wrap gap-1" data-testid="vtl-positions">
                      {seed.positions
                        .filter((p) => p.phrase === phraseIndex)
                        .map((p, i) => {
                          const unit = overlay?.pairs[i]?.unit;
                          return (
                            <div
                              key={p.index}
                              className={`px-1.5 py-1 rounded-lg border text-center min-w-[46px] ${
                                p.stressed
                                  ? 'bg-slate-800 border-slate-600'
                                  : 'bg-slate-900 border-slate-800'
                              }`}
                              title={`${SOURCE_KIND_LABEL[p.kind]} · ${p.stressed ? 'hit hard' : 'light'} · ${
                                p.midiNote !== null ? midiToNoteName(p.midiNote) : 'no pitch'
                              }`}
                            >
                              <div
                                className={`text-[10px] font-bold ${
                                  unit ? 'text-slate-100' : 'text-slate-600'
                                }`}
                              >
                                {unit ? unit.text : p.stressed ? '/' : 'x'}
                              </div>
                              <div className="text-[8px] text-slate-500">
                                {p.midiNote !== null ? midiToNoteName(p.midiNote) : '—'}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* WRITING, WITH THE LOCK REPORTING */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-2.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Line {phraseIndex + 1}
                  </span>
                  <input
                    value={draft}
                    data-testid="vtl-draft"
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={phrase ? `${phrase.syllableCount} syllables, ${phrase.stressPattern}` : ''}
                    className="w-full mt-1.5 bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-lg px-2 py-1.5 text-[11px] text-slate-100 placeholder-slate-600 outline-none"
                  />
                  {check && (
                    <div className="mt-1.5" data-testid="vtl-check">
                      <p
                        className={`text-[10px] font-bold ${
                          check.ok ? 'text-emerald-300' : 'text-amber-300'
                        }`}
                      >
                        {check.ok
                          ? `fits: ${check.syllableCount} syllables on ${check.performedCount} positions`
                          : check.violations.map((v) => v.says).join(' · ')}
                      </p>
                      {/* The creator's own line is theirs. The lock reports on
                          it; it does not refuse it. E.3 governs what the
                          studio proposes, not what the creator writes. */}
                      <button
                        type="button"
                        data-testid="vtl-keep"
                        onClick={() => keepLine(draft)}
                        className="mt-1.5 px-2 py-1 rounded-lg bg-slate-900 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 text-[10px] font-bold cursor-pointer transition"
                      >
                        <Check className="w-3 h-3 inline mr-1" />
                        keep this line
                      </button>
                    </div>
                  )}
                </div>

                {/* PROPOSALS, GATED */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Alternatives
                    </span>
                    <button
                      type="button"
                      data-testid="vtl-ask"
                      disabled={asking || !phrase}
                      onClick={askForLines}
                      className="ml-auto px-2 py-1 rounded-lg bg-purple-500/15 border border-purple-500/40 text-purple-300 hover:bg-purple-500/25 disabled:opacity-40 text-[10px] font-bold cursor-pointer transition"
                    >
                      {asking ? (
                        <Loader2 className="w-3 h-3 inline animate-spin" />
                      ) : (
                        'ask for lines that fit'
                      )}
                    </button>
                  </div>

                  {askNote && (
                    <p data-testid="vtl-ask-note" className="text-[10px] text-amber-300/80 mt-1.5 leading-snug">
                      {askNote}
                    </p>
                  )}

                  {gate && (
                    <div className="mt-1.5 space-y-1.5">
                      <p data-testid="vtl-gate" className="text-[10px] text-slate-400 leading-snug">
                        {describeGate(gate)}
                      </p>
                      {gate.accepted.map(({ candidate }) => (
                        <div
                          key={candidate.id}
                          data-testid="vtl-accepted"
                          className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5"
                        >
                          <span className="text-[11px] text-slate-100 flex-1">{candidate.text}</span>
                          <button
                            type="button"
                            onClick={() => keepLine(candidate.text)}
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold border bg-slate-900 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 cursor-pointer"
                          >
                            keep
                          </button>
                        </div>
                      ))}
                      {gate.rejected.length > 0 && (
                        <div
                          data-testid="vtl-rejected"
                          className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-2 py-1.5"
                        >
                          <div className="flex items-center gap-1.5">
                            <ShieldAlert className="w-3 h-3 text-amber-400" />
                            <span className="text-[9px] font-bold text-amber-300 uppercase tracking-wider">
                              refused before you saw them
                            </span>
                          </div>
                          <ul className="mt-1 space-y-0.5">
                            {gate.rejected.map((r, i) => (
                              <li key={i} className="text-[9px] text-slate-400 leading-snug">
                                line {r.phraseIndex + 1}: {r.violations.map((v) => v.says).join('; ')}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
