import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  X,
  Mic,
  Send,
  Radio,
  Check,
  RotateCcw,
  Volume2,
  Lock,
  Sliders,
  Play,
  Pause,
  AlertTriangle,
  Activity,
  Layers,
  Wand2,
  Music,
  Disc,
  Drum,
  Zap,
  CheckCircle2,
  BarChart2,
  Headphones,
  SlidersHorizontal,
  GraduationCap,
  Compass,
  FolderKanban,
  Cpu,
  Settings,
  ShieldCheck,
  ChevronDown,
  Gauge,
  RefreshCw,
} from 'lucide-react';
import { useStudioSession } from '../app/StudioSessionContext';
import type { GenerationCandidate } from '../types/daw';
import {
  buildChangeSet,
  ACTION_MEANING,
  BASIS_LABEL,
  type ChangeSet,
} from '../lib/changeSet';
import { readAddress } from '../lib/sessionBand';
import { productionHistory, ProductionOperation } from '../lib/productionOperations';
import type { Track, TrackDspSettings } from '../types/daw';

/** Baseline used when a track has no DSP settings yet. */
const DEFAULT_TRACK_DSP: TrackDspSettings = {
  lowGain: 0,
  midGain: 0,
  highGain: 0,
  compressorThreshold: -18,
  compressorRatio: 3,
  reverbSend: 0.15,
  delaySend: 0.1,
  pan: 0,
  volume: 0,
};
import {
  StudioEmphasis,
  StudioIntelligenceConfig,
  loadAiConfig,
  queryStudioIntelligence,
  saveAiConfig,
} from '../lib/studioIntelligenceService';
import * as Tone from 'tone';

interface StudioIntelligenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProposalOption {
  id: string;
  title: string;
  description: string;
  targetParameter: string;
  proposedValue: any;
  /**
   * `confidence`, `rhythmScore` and `timingScore` used to live here, and every
   * option in this file carried a literal for all three -- 98 / 99.4 / 98.8
   * and so on -- rendered as a "% MATCH" badge. Nothing computed them. A
   * suggestion is worth judging on what it proposes, so it says that instead.
   */
  operationType: string;
  lockedInvariants: string[];
  mutableParams: string[];
  /**
   * The proposal as a contract: what changes, what is guaranteed not to, and
   * what is behind each guarantee. Clause C.6.
   */
  changeSet?: ChangeSet;
  /** Present when a realization stands behind the proposal, so Reject can open a gap on it. */
  realizationCandidate?: GenerationCandidate;
  /**
   * What committing this proposal actually changes. Without it there is
   * nothing to apply, and the commit must say so rather than report success.
   */
  apply?: {
    /** Which track to change; falls back to the instrument named here. */
    targetInstrument?: Track['instrument'];
    dspSettings?: Partial<TrackDspSettings>;
    /** Human-readable summary of the change, used in the confirmation. */
    summary: string;
  };
}

const getStudioEmphases = (): { id: StudioEmphasis; label: string; icon: React.ReactNode; desc: string }[] => [
  { id: 'CO_PRODUCER', label: 'PRODUCER', icon: <Music className="w-3.5 h-3.5 text-amber-400" />, desc: 'Composition, chords, arrangement, bounce & songwriting' },
  { id: 'AUDIO_ENGINEER', label: 'ENGINEER', icon: <Activity className="w-3.5 h-3.5 text-cyan-400" />, desc: 'Acoustic mud, 808/kick carving, vocal dynamics & LUFS' },
  { id: 'TUTOR', label: 'TUTOR', icon: <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />, desc: 'Music theory explanations, acoustic principles & techniques' },
  { id: 'PLATFORM_GUIDE', label: 'GUIDE', icon: <Compass className="w-3.5 h-3.5 text-purple-400" />, desc: 'SoulSonus DAW navigation, routing & trigger help' },
  { id: 'STUDIO_MANAGER', label: 'MANAGER', icon: <FolderKanban className="w-3.5 h-3.5 text-blue-400" />, desc: 'Track inventory, session organization & stems' },
];

export const StudioIntelligenceDrawer: React.FC<StudioIntelligenceDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const studioEmphases = getStudioEmphases();
  const {
    activeWorkspace,
    dawState,
    setDawState,
    tracks,
    setTracks,
    selectionContext,
    sections,
    creatorName,
    handleCallSessionPlayer,
    intentPreserve,
    handleRejectCandidate,
    updateTracksWithHistory,
    labelNextEdit,
    labelNextRevisionOrigin,
    relayGaps,
    handleAddGapWords,
    handleResolveGap,
    expressionState,
  } = useStudioSession();
  const [gapReply, setGapReply] = useState<Record<string, string>>({});

  const [config, setConfig] = useState<StudioIntelligenceConfig>(loadAiConfig());
  const [promptInput, setPromptInput] = useState('');
  const [isAuditioning, setIsAuditioning] = useState<string | null>(null);
  /** What the creator heard instead, per proposal, before they press Reject. */
  const [rejectWords, setRejectWords] = useState<Record<string, string>>({});
  const [showMasterBus, setShowMasterBus] = useState(true);
  const [masterVolume, setMasterVolume] = useState(0); // dB
  const [isLimiterActive, setIsLimiterActive] = useState(true);

  const selectedTrack = tracks.find((t) => t.id === selectionContext.selectedTrackId) || tracks[0];
  const activeSection = sections.find((s) => s.id === selectionContext.selectedSectionId) || sections[0];
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<
    { sender: 'creator' | 'intelligence'; text: string; options?: ProposalOption[]; timestamp: number }[]
  >([
    {
      sender: 'intelligence',
      // This opened on a scripted exchange: a creator line nobody typed, and a
      // reply asserting "the 808 is holding a 140ms sustain against the Bar 11
      // kick transient" over three options badged 98% / 95% / 92% MATCH. None
      // of it was read from the session, and none of the percentages were
      // computed. It opens empty now, and answers what is actually asked.
      text:
        `SoulSonus Studio Intelligence, ${config.emphasis.replace(/_/g, ' ').toLowerCase()}, ` +
        `for **${creatorName || 'Creator'}** in Room **${activeWorkspace}** — ` +
        `${tracks.length} tracks at ${dawState.bpm} BPM.\n\n` +
        `Ask a question, issue a directive, or address a player: *"bass player, play what you feel in the hook"*. ` +
        `Anything that changes the session arrives as a candidate you approve.`,
      timestamp: Date.now(),
    },
  ]);
  const [isThinking, setIsThinking] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSelectEmphasis = (newEmphasis: StudioEmphasis) => {
    const updated = { ...config, emphasis: newEmphasis };
    setConfig(updated);
    saveAiConfig(updated);

    const empLabel = studioEmphases.find((e) => e.id === newEmphasis)?.label || newEmphasis;
    setMessages((prev) => [
      ...prev,
      {
        sender: 'intelligence',
        text: `Studio Intelligence emphasis shifted to **${empLabel}**.`,
        timestamp: Date.now(),
      },
    ]);
  };

  const handleAudition = async (option: ProposalOption) => {
    if (isAuditioning === option.id) {
      setIsAuditioning(null);
      return;
    }

    setIsAuditioning(option.id);
    try {
      await Tone.start();
      const synth = new Tone.MembraneSynth().toDestination();
      synth.triggerAttackRelease('C1', '4n');
      setTimeout(() => setIsAuditioning(null), 1400);
    } catch {
      setIsAuditioning(null);
    }
  };

  /**
   * Ask the same question again, without this answer.
   *
   * C.6 names Alternative as one of the four, and there was no way to get a
   * second answer except to retype the question -- which asks it fresh, with
   * nothing excluded, so the same suggestion could come straight back. The
   * exclusion is stated in the re-ask rather than filtered afterwards, so the
   * reasoning layer is the thing avoiding the repeat.
   */
  const handleAlternative = (option: ProposalOption) => {
    const asked = [...messages].reverse().find((m) => m.sender === 'creator')?.text;
    if (!asked) return;
    void handleSendPrompt(
      `${asked}\n\n(Not "${option.title}" — I have already seen that one. Something else.)`
    );
  };

  /**
   * Turn it down, and say what was heard instead.
   *
   * Step 5's entry point, as the plan says. When the proposal carries a
   * realization candidate the rejection opens a relay gap against it, so the
   * creator's words survive attached to the thing they were said about. When
   * it does not -- a mix suggestion, an arrangement note -- there is nothing
   * to attach a gap to, and it is dismissed with that said out loud rather
   * than silently.
   */
  const handleRejectProposal = (option: ProposalOption) => {
    const candidate = option.realizationCandidate;
    if (candidate) {
      handleRejectCandidate(candidate, rejectWords[option.id]?.trim() || undefined);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'intelligence',
          text: rejectWords[option.id]?.trim()
            ? `Turned down. What you heard is kept against that candidate, and stays open until you close it.`
            : `Turned down. The rejection is recorded; nothing was committed.`,
          timestamp: Date.now(),
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'intelligence',
          text:
            `Turned down "${option.title}". There is no realization candidate behind this one, so there is ` +
            `nothing for a relay gap to attach to — it is dismissed and nothing was committed.`,
          timestamp: Date.now(),
        },
      ]);
    }
    setRejectWords((prev) => ({ ...prev, [option.id]: '' }));
  };

  const handleCommit = (option: ProposalOption) => {
    // A proposal with nothing applicable behind it is reported as such. Saying
    // "committed" over an unchanged session is worse than saying nothing.
    if (!option.apply) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'intelligence',
          text:
            `I can't commit "${option.title}" yet — this suggestion has no change I can apply to the session. ` +
            `It's a recommendation to carry out by hand for now.`,
          timestamp: Date.now(),
        },
      ]);
      return;
    }

    const target =
      (option.apply.targetInstrument && tracks.find((t) => t.instrument === option.apply!.targetInstrument)) ||
      selectedTrack;

    if (!target) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'intelligence',
          text: `I couldn't find a ${option.apply!.targetInstrument || 'target'} track to apply "${option.title}" to.`,
          timestamp: Date.now(),
        },
      ]);
      return;
    }

    const previousDsp = target.dspSettings ? { ...target.dspSettings } : undefined;
    const nextDsp = { ...(target.dspSettings || DEFAULT_TRACK_DSP), ...option.apply.dspSettings };

    // Through the history writer, not the raw setter.
    //
    // This called setTracks directly, which is React's own dispatch: no undo
    // entry, and no node in the revision tree. So applying a co-producer's mix
    // change could not be taken back, and the tree built in Step 5b had a hole
    // in it exactly where the plan says "Apply on a ChangeSet writes a new
    // revision rather than overwriting", and this bypassed the tree one step
    // after it was built.
    labelNextEdit(`Applied: ${option.title}`);
    labelNextRevisionOrigin('realization');
    updateTracksWithHistory((prev) =>
      prev.map((t) => (t.id === target.id ? { ...t, dspSettings: nextDsp } : t))
    );

    const op: ProductionOperation = {
      id: `op_${Date.now()}`,
      type: 'SET_DSP_PARAM',
      trackId: target.id,
      description: `Committed: ${option.title}`,
      source: 'CO_PRODUCER_AI',
      timestamp: Date.now(),
      undo: (trks) => trks.map((t) => (t.id === target.id ? { ...t, dspSettings: previousDsp } : t)),
      redo: (trks) => trks.map((t) => (t.id === target.id ? { ...t, dspSettings: nextDsp } : t)),
    };
    productionHistory.recordOperation(op);

    setMessages((prev) => [
      ...prev,
      {
        sender: 'intelligence',
        text: `Applied to ${target.name}: ${option.apply!.summary}. Nothing else in the session was changed.`,
        timestamp: Date.now(),
      },
    ]);
  };

  /**
   * Asks the reasoning provider, rather than answering from a script.
   *
   * This function used to hold its own canned replies: two `if` branches
   * matching on keywords, each returning a fixed option list with a literal
   * confidence. Meanwhile a real reasoning provider existed, with a real
   * bounded-context compiler and operation planner behind it, and nothing in
   * the app reached it -- this drawer is the mounted one, and the dock that
   * did call the provider is imported by no file. So the reachable path was
   * the scripted one and the honest path was the dead one.
   */
  const handleSendPrompt = async (textToSend?: string) => {
    const userText = (textToSend || promptInput).trim();
    if (!userText || isThinking) return;

    setPromptInput('');
    setMessages((prev) => [
      ...prev,
      { sender: 'creator', text: userText, timestamp: Date.now() },
    ]);
    setIsThinking(true);

    try {
      const answer = await queryStudioIntelligence(
        userText,
        config,
        dawState,
        tracks,
        activeWorkspace,
        selectedTrack || null,
        // What the last pass was measured to express. Without it the
        // intelligence cannot answer a question about the feel of a take with
        // anything but a generality.
        expressionState
      );

      const proposal = answer.actionProposal;
      const options: ProposalOption[] | undefined = proposal
        ? [
            {
              id: proposal.id,
              title: proposal.title,
              description: proposal.description,
              targetParameter: proposal.category,
              proposedValue: proposal.proposedChanges.actionSummary,
              operationType: proposal.category,
              lockedInvariants:
                proposal.proposedChanges.realizationCandidate?.preservedProperties || [],
              mutableParams:
                proposal.proposedChanges.realizationCandidate?.modifiedProperties || [],
              realizationCandidate: proposal.proposedChanges.realizationCandidate,
              changeSet: buildChangeSet({
                candidate: proposal.proposedChanges.realizationCandidate || null,
                dspSettings: proposal.proposedChanges.dspSettings || null,
                preserve: intentPreserve,
                trackName: proposal.targetTrackName || selectedTrack?.name,
              }),
              apply: proposal.proposedChanges.dspSettings
                ? {
                    dspSettings: proposal.proposedChanges.dspSettings,
                    summary: proposal.proposedChanges.actionSummary,
                  }
                : undefined,
            },
          ]
        : undefined;

      // A request addressed to a player is placed as well as answered. The
      // reasoning half writes the brief; this half calls the musician and
      // reports what actually came back -- a take, or the reason there is not
      // one. The two are appended as one reply so the brief and its outcome
      // are never separated.
      let text = answer.content;
      const address = readAddress(userText);
      if (address.role) {
        const called = await handleCallSessionPlayer(
          address.role,
          address.grant || 'PLAY_WHAT_YOU_FEEL',
          userText
        );
        text = `${text}\n\n${called.message}`;
      }

      setMessages((prev) => [
        ...prev,
        { sender: 'intelligence', text, options, timestamp: Date.now() },
      ]);
    } catch (err) {
      // Say what went wrong. A reasoning failure that renders as a confident
      // answer is the failure mode this whole pass exists to remove.
      setMessages((prev) => [
        ...prev,
        {
          sender: 'intelligence',
          text: `I couldn't answer that: ${err instanceof Error ? err.message : String(err)}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="fixed inset-y-0 right-0 w-full sm:w-[540px] md:w-[620px] bg-slate-950/98 border-l border-slate-800 shadow-2xl z-50 flex flex-col justify-between overflow-hidden font-mono text-xs select-none"
      >
        {/* 1. TOP HEADER & PROMINENT QUESTION INPUT (Directly at Top - No Scrolling Required) */}
        <div className="p-3.5 border-b border-slate-800 space-y-2.5 bg-slate-950">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-100 uppercase tracking-wide">
                  STUDIO INTELLIGENCE & MASTER HUB
                </h3>
                <p className="text-[9.5px] text-slate-400">
                  Focus: <strong className="text-cyan-300">{selectedTrack?.name}</strong> • Room: <strong className="text-amber-300">{activeWorkspace}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              {/* Native Brain Provider Badge */}
              <div className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[9.5px]">
                <Cpu className="w-3 h-3 text-amber-400" />
                <span className="font-bold text-slate-300">
                  {config.provider === 'LOCAL_BRAIN' ? 'NATIVE BRAIN' : config.provider}
                </span>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Prominent "Ask Studio Intelligence" Prompt Bar Right At The Top */}
          <div className="flex items-center space-x-1.5 bg-slate-900 border border-amber-500/40 rounded-xl p-1 shadow-lg shadow-amber-500/5">
            <input
              id="intelligence-input"
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendPrompt();
              }}
              placeholder={`Ask ${config.emphasis} or issue a production directive...`}
              className="flex-1 bg-transparent px-2.5 py-1.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none"
              autoFocus
            />

            <button
              id="intelligence-ask"
              onClick={() => handleSendPrompt()}
              disabled={!promptInput.trim() || isThinking}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-[10px] flex items-center space-x-1 transition cursor-pointer shadow-md"
            >
              <Send className="w-3 h-3" />
              <span>ASK</span>
            </button>
          </div>

          {/* Quick Action Chips */}
          <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-0.5 text-[8.5px]">
            <span className="text-slate-500 font-bold uppercase shrink-0">QUICK:</span>
            {[
              'Why is my kick clashing with the 808?',
              'Suggest chord changes in C Minor',
              'Tighten vocal hook harmonies',
              'Mastering LUFS safety check',
            ].map((q) => (
              <button
                key={q}
                onClick={() => handleSendPrompt(q)}
                className="px-2 py-0.5 rounded-md bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800 shrink-0 hover:border-slate-700 transition cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Emphasis Role Tabs (Producer, Engineer, Tutor, Guide, Manager) */}
          <div className="grid grid-cols-5 gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            {studioEmphases.map((emp) => {
              const isSelected = config.emphasis === emp.id;
              return (
                <button
                  key={emp.id}
                  onClick={() => handleSelectEmphasis(emp.id)}
                  className={`py-1 px-1 rounded-lg text-[9px] font-bold flex items-center justify-center space-x-1 transition cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                  title={emp.desc}
                >
                  {emp.icon}
                  <span className="hidden sm:inline">{emp.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. MASTER BUS & ACOUSTIC TELEMETRY HUB (Integrated from bottom) */}
        <div className="p-3 border-b border-slate-800 bg-slate-900/60 space-y-2">
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center space-x-2">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold text-slate-200 uppercase">MASTER BUS & ACOUSTIC TELEMETRY</span>
            </div>
            <button
              onClick={() => setShowMasterBus(!showMasterBus)}
              className="text-[9px] text-slate-400 hover:text-slate-200 font-mono underline cursor-pointer"
            >
              {showMasterBus ? 'COLLAPSE' : 'EXPAND'}
            </button>
          </div>

          {showMasterBus && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[9px] font-mono">
              {/* Master Volume Fader */}
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>MASTER FADER:</span>
                  <span className="text-amber-300 font-bold">{masterVolume > 0 ? `+${masterVolume}` : masterVolume} dB</span>
                </div>
                <input
                  type="range"
                  min="-20"
                  max="6"
                  value={masterVolume}
                  onChange={(e) => setMasterVolume(Number(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              {/* Integrated LUFS & Peak Ceiling */}
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>LUFS TARGET:</span>
                  <span className="text-emerald-400 font-bold">-14.0 LUFS</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>TRUE PEAK:</span>
                  <span className="text-cyan-300 font-bold">-1.0 dBFS</span>
                </div>
              </div>

              {/* Master Limiter / Bus Glue */}
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block">MASTER LIMITER:</span>
                  <span className="text-emerald-400 font-bold">{isLimiterActive ? 'ENGAGED' : 'BYPASS'}</span>
                </div>
                <button
                  onClick={() => setIsLimiterActive(!isLimiterActive)}
                  className={`px-2 py-1 rounded-lg text-[9px] font-bold cursor-pointer transition ${
                    isLimiterActive
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isLimiterActive ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 3. SESSION DIALOGUE & CANDIDATE ACTION PROPOSALS */}
        <div className="flex-1 p-3.5 overflow-y-auto custom-scrollbar space-y-3 bg-slate-950/80">

          {/* WHAT YOU HEARD, AND STILL DO NOT.
              Amendment B: this is a retained conversation, not a verdict. It
              sits above the session dialogue because an unclosed gap outranks
              whatever else is being discussed -- B.5 puts relay fidelity above
              every machine metric, and burying it under scores would be that
              inversion in layout form. */}
          {relayGaps.filter((g) => !g.resolvedByCreator).map((gap) => (
            <div key={gap.gapId} className="rounded-2xl border border-cyan-500/40 bg-slate-950 overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-800 flex items-center gap-2">
                <span className="text-[9px] font-mono font-black tracking-widest text-cyan-300">
                  THAT'S NOT WHAT I HEARD
                </span>
                <span className="text-[9px] font-mono text-slate-500 truncate">
                  {gap.attributedTo} · {new Date(gap.openedAt).toLocaleString()}
                </span>
                <span className="ml-auto text-[9px] font-mono text-amber-300 shrink-0">OPEN</span>
              </div>

              <div className="p-3 space-y-2">
                {gap.exchange.map((turn) => (
                  <div key={turn.exchangeId} className={turn.from === 'creator' ? 'text-right' : ''}>
                    <p className="text-[9px] font-mono text-slate-500 mb-0.5">
                      {turn.from === 'creator' ? gap.attributedTo : 'THE STUDIO'}
                    </p>
                    <div
                      className={`inline-block text-left p-2.5 rounded-xl text-[11px] leading-relaxed max-w-lg ${
                        turn.from === 'creator'
                          ? 'bg-cyan-500/15 text-cyan-100 border border-cyan-500/30'
                          : 'bg-slate-900 text-slate-300 border border-slate-800'
                      }`}
                    >
                      {turn.words}
                      {turn.basis && turn.basis.length > 0 && (
                        <ul className="mt-1.5 space-y-0.5 border-t border-slate-800 pt-1.5">
                          {turn.basis.map((b, i) => (
                            <li key={i} className="text-[9px] font-mono text-slate-500">{b}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={gapReply[gap.gapId] ?? ''}
                    onChange={(e) => setGapReply((prev) => ({ ...prev, [gap.gapId]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (gapReply[gap.gapId] ?? '').trim()) {
                        handleAddGapWords(gap.gapId, gapReply[gap.gapId]);
                        setGapReply((prev) => ({ ...prev, [gap.gapId]: '' }));
                      }
                    }}
                    placeholder="Add to this. However it comes out."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                  <button
                    onClick={() => handleResolveGap(gap.gapId)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-[10px] font-mono font-bold text-slate-400 hover:text-emerald-300 transition cursor-pointer shrink-0"
                    title="Only you can close this. No score and no later candidate closes it for you."
                  >
                    THIS IS SETTLED
                  </button>
                </div>
              </div>
            </div>
          ))}

          {messages.map((msg, idx) => {
            const isUser = msg.sender === 'creator';
            return (
              <div key={idx} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}>
                <div className="flex items-center space-x-1.5 text-[9px] text-slate-500">
                  <span>{isUser ? 'CREATOR' : `SOULSONUS INTELLIGENCE (${config.emphasis})`}</span>
                  <span>•</span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div
                  className={`p-3 rounded-2xl max-w-xl text-xs leading-relaxed font-sans ${
                    isUser
                      ? 'bg-amber-500 text-slate-950 font-bold rounded-tr-none'
                      : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none space-y-2'
                  }`}
                >
                  <div className={`whitespace-pre-wrap${msg.sender === 'intelligence' ? ' intelligence-reply' : ''}`}>{msg.text}</div>

                  {/* Render Action Proposal Cards if present */}
                  {msg.options && (
                    <div className="space-y-2.5 pt-2">
                      {msg.options.map((opt) => (
                        <div
                          key={opt.id}
                          className="p-3 rounded-xl bg-slate-950 border border-amber-500/40 space-y-2 font-mono text-xs shadow-lg"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-400 text-xs">{opt.title}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-bold">
                              {opt.operationType.replace(/_/g, ' ')}
                            </span>
                          </div>

                          <p className="text-[10px] text-slate-400 font-sans">{opt.description}</p>

                          {/* THE CHANGESET CONTRACT -- clause C.6.
                              These were two boxes rendering `array.join(' • ')`,
                              so an empty list left a heading reading LOCKED
                              INVARIANTS with nothing under it: a guarantee
                              about nothing, which is worse than no heading.
                              The promise is now stated as a promise, and what
                              is behind each one is stated with it. */}
                          {opt.changeSet && (
                            <div data-testid="changeset" className="space-y-1.5 text-[9px]">
                              {opt.changeSet.willChange.length > 0 && (
                                <div className="p-2 rounded-lg bg-slate-900/80 border border-amber-500/25">
                                  <span className="text-amber-400 font-black block mb-1">WILL CHANGE</span>
                                  <ul className="space-y-0.5">
                                    {opt.changeSet.willChange.map((c) => (
                                      <li key={c} className="text-slate-300 flex gap-1.5">
                                        <span className="text-amber-400/70">→</span>
                                        <span>{c}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {opt.changeSet.willNotChange.length > 0 && (
                                <div className="p-2 rounded-lg bg-slate-900/80 border border-emerald-500/25">
                                  <span className="text-emerald-400 font-black block mb-1">
                                    WILL NOT CHANGE
                                  </span>
                                  <ul className="space-y-1">
                                    {opt.changeSet.willNotChange.map((g) => (
                                      <li key={g.property} className="flex gap-1.5">
                                        {/* The tick belongs only to what was
                                            actually measured. A promise gets a
                                            circle and says it is a promise. */}
                                        <span
                                          className={
                                            g.basis === 'MEASURED'
                                              ? 'text-emerald-400'
                                              : g.basis === 'BY_CONSTRUCTION'
                                                ? 'text-cyan-400'
                                                : 'text-slate-500'
                                          }
                                        >
                                          {g.basis === 'BY_CONTRACT' ? '○' : '✓'}
                                        </span>
                                        <span className="min-w-0">
                                          <span className="text-slate-200">{g.property}</span>
                                          <span className="text-slate-500"> — {BASIS_LABEL[g.basis]}</span>
                                          <span className="block text-slate-600 leading-snug">{g.detail}</span>
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {opt.changeSet.note && (
                                <p
                                  data-testid="changeset-note"
                                  className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-amber-300/90 leading-snug"
                                >
                                  {opt.changeSet.note}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Optional, and next to Reject rather than behind
                              it: a rejection is registered whether or not the
                              creator has words ready, and Amendment B.6 says
                              never to require them.
                              Shown only when a realization candidate stands
                              behind the proposal, because that is the only
                              case where a relay gap has something to attach
                              to. Offering the field otherwise would invite
                              words and then drop them, which is the same
                              defect as a form that simulates success. */}
                          {opt.realizationCandidate && (
                            <input
                              type="text"
                              data-testid="cs-reject-words"
                              value={rejectWords[opt.id] ?? ''}
                              onChange={(e) =>
                                setRejectWords((prev) => ({ ...prev, [opt.id]: e.target.value }))
                              }
                              placeholder="If you reject it: what did you hear instead? (optional)"
                              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 text-[10px] text-slate-200 rounded-lg py-1.5 px-2 outline-none transition"
                            />
                          )}

                          {/* The four C.6 names. Preview and Apply existed;
                              Alternative and Reject did not, so the only way
                              to turn something down was to ignore it, and
                              wanting a different answer meant retyping the
                              question. */}
                          <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-900">
                            <button
                              data-testid="cs-preview"
                              onClick={() => handleAudition(opt)}
                              title={ACTION_MEANING.PREVIEW}
                              className={`py-1 px-2 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer ${
                                isAuditioning === opt.id
                                  ? 'bg-amber-400 text-slate-950 animate-pulse'
                                  : 'bg-slate-900 text-slate-200 hover:bg-slate-800 border border-slate-700'
                              }`}
                            >
                              <Play className="w-3 h-3" />
                              <span>{isAuditioning === opt.id ? 'PREVIEWING…' : 'PREVIEW'}</span>
                            </button>

                            <button
                              data-testid="cs-apply"
                              onClick={() => handleCommit(opt)}
                              title={ACTION_MEANING.APPLY}
                              className="py-1 px-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] flex items-center justify-center gap-1 transition cursor-pointer shadow-md shadow-emerald-500/20"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>APPLY</span>
                            </button>

                            <button
                              data-testid="cs-alternative"
                              onClick={() => handleAlternative(opt)}
                              title={ACTION_MEANING.ALTERNATIVE}
                              className="py-1 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>ALTERNATIVE</span>
                            </button>

                            <button
                              data-testid="cs-reject"
                              onClick={() => handleRejectProposal(opt)}
                              title={ACTION_MEANING.REJECT}
                              className="py-1 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-700 font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                              <span>REJECT</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
