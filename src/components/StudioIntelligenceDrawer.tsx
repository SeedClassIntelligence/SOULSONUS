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
} from 'lucide-react';
import { useStudioSession } from '../app/StudioSessionContext';
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
  confidence: number;
  rhythmScore: number;
  timingScore: number;
  operationType: string;
  lockedInvariants: string[];
  mutableParams: string[];
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

const STUDIO_EMPHASES: { id: StudioEmphasis; label: string; icon: React.ReactNode; desc: string }[] = [
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
  const {
    activeWorkspace,
    dawState,
    setDawState,
    tracks,
    setTracks,
    selectionContext,
    sections,
    creatorName,
  } = useStudioSession();

  const [config, setConfig] = useState<StudioIntelligenceConfig>(loadAiConfig());
  const [promptInput, setPromptInput] = useState('');
  const [isAuditioning, setIsAuditioning] = useState<string | null>(null);
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
      text: `SoulSonus Studio Intelligence active for **${creatorName || 'Creator'}** in Room **${activeWorkspace}** (${tracks.length} tracks at ${dawState.bpm} BPM in C Minor).\n\nAsk any question or issue a production instruction above. All proposed changes appear as auditionable candidate cards requiring your explicit approval.`,
      timestamp: Date.now(),
    },
    {
      sender: 'creator',
      text: "Something about this hook isn't hitting. I think the bass needs to move more but don't change my drums.",
      timestamp: Date.now() + 1000,
    },
    {
      sender: 'intelligence',
      text: "I hear it. Listening across the whole session: The 808 Sub Bass is holding a 140ms sustain against the Bar 11 Kick transient, causing low-end frequency mud. I have prepared three realization candidates while locking 100% of your drum patterns:",
      timestamp: Date.now() + 2000,
      options: [
        {
          id: 'opt-1',
          title: 'Option A: Shorten 808 Decay to 650ms + 1/8th Bounce',
          description: 'Tightens the sub release curve so the kick punches through with zero frequency masking.',
          targetParameter: '808 Release Decay',
          proposedValue: '650ms',
          confidence: 98,
          rhythmScore: 99.4,
          timingScore: 98.8,
          operationType: 'TIGHTEN_SUB',
          lockedInvariants: ['Kick & Snare Pattern', 'Hi-Hat Groove', 'Master BPM (94)'],
          mutableParams: ['808 Decay (650ms)', 'Low-End EQ Carve (-2.5dB @ 60Hz)'],
        },
        {
          id: 'opt-2',
          title: 'Option B: Add Portamento Glide (140ms) on Bar 12',
          description: 'Adds an expressive vocal-style glide on the 808 note transition into the hook turnaround.',
          targetParameter: 'Portamento Glide',
          proposedValue: '140ms',
          confidence: 95,
          rhythmScore: 98.9,
          timingScore: 98.2,
          operationType: 'ADD_GLIDE',
          lockedInvariants: ['Drum Kit Samples', 'Chord Structure (C Minor)'],
          mutableParams: ['Portamento Time (140ms)', 'Pitch Bend Range (+2)'],
        },
        {
          id: 'opt-3',
          title: 'Option C: Octave Jump on 4th Beat + Tube Saturation',
          description: 'Lifts the energy into the hook with a +12 semitone bounce and subtle analog tape warmth.',
          targetParameter: 'Octave Lift & Tube Drive',
          proposedValue: '+1 Octave / +2.5dB Drive',
          confidence: 92,
          rhythmScore: 98.0,
          timingScore: 97.6,
          operationType: 'OCTAVE_LIFT',
          lockedInvariants: ['Drum Pattern Grid', 'Vocal Space Pocket'],
          mutableParams: ['Note Pitch (+12st)', 'Drive Saturation (+2.5dB)'],
        },
      ],
    },
  ]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSelectEmphasis = (newEmphasis: StudioEmphasis) => {
    const updated = { ...config, emphasis: newEmphasis };
    setConfig(updated);
    saveAiConfig(updated);

    const empLabel = STUDIO_EMPHASES.find((e) => e.id === newEmphasis)?.label || newEmphasis;
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
          text: `I couldn't find a ${option.apply.targetInstrument || 'target'} track to apply "${option.title}" to.`,
          timestamp: Date.now(),
        },
      ]);
      return;
    }

    const previousDsp = target.dspSettings ? { ...target.dspSettings } : undefined;
    const nextDsp = { ...(target.dspSettings || DEFAULT_TRACK_DSP), ...option.apply.dspSettings };

    setTracks((prev) => prev.map((t) => (t.id === target.id ? { ...t, dspSettings: nextDsp } : t)));

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

  const handleSendPrompt = (textToSend?: string) => {
    const userText = textToSend || promptInput.trim();
    if (!userText) return;

    setPromptInput('');
    setMessages((prev) => [
      ...prev,
      { sender: 'creator', text: userText, timestamp: Date.now() },
    ]);

    const lower = userText.toLowerCase();
    let replyText = `Understood. Analyzing full session context for "${userText}" on ${selectedTrack.name} in Room ${activeWorkspace}...`;
    let proposalOptions: ProposalOption[] = [];

    if (lower.includes('kick') && lower.includes('808')) {
      replyText = `Understood. Resolving frequency masking between ${selectedTrack.name} and the Sub Kick:`;
      proposalOptions = [
        {
          id: `opt-carve-${Date.now()}`,
          title: `Dynamic Sidechain Ducking (2.5dB @ 60Hz) on 808 Bass`,
          description: `Automatically dips the 808 transient by 2.5dB during the first 45ms of each kick strike, eliminating sub-bass mud.`,
          targetParameter: 'Dynamic EQ Cut',
          proposedValue: '-2.5dB @ 60Hz',
          confidence: 99,
          rhythmScore: 99.5,
          timingScore: 99.2,
          operationType: 'SIDECHAIN_EQ',
          lockedInvariants: ['Kick Pattern', '808 Groove', 'Master BPM'],
          mutableParams: ['808 EQ 60Hz Cut', 'Sidechain Trigger Envelope'],
          apply: {
            targetInstrument: 'bass',
            dspSettings: { lowGain: -2.5 },
            summary: 'low-band gain set to -2.5 dB',
          },
        },
      ];
    } else if (lower.includes('chord') || lower.includes('chords')) {
      replyText = `Here are three diatonic chord progression candidates in C Minor for the next section:`;
      proposalOptions = [
        {
          id: `opt-chords-${Date.now()}`,
          title: `i - VI - III - VII (Cm - Ab - Eb - Bb) Neo-Soul Cadence`,
          description: `Rich 7th & 9th voice leading with smooth harmonic tension into the chorus turnaround.`,
          targetParameter: 'Track NoteEvents',
          proposedValue: 'Cm9 - AbMaj7 - EbMaj9 - Bb7',
          confidence: 97,
          rhythmScore: 98.8,
          timingScore: 98.4,
          operationType: 'SET_CHORD_PROGRESSION',
          lockedInvariants: ['Drum Kit Groove', 'Scale: C Minor'],
          mutableParams: ['Keys Voice Leading', 'Chord Extensions'],
        },
      ];
    }

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'intelligence',
          text: replyText,
          options: proposalOptions.length > 0 ? proposalOptions : undefined,
          timestamp: Date.now(),
        },
      ]);
    }, 600);
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
              onClick={() => handleSendPrompt()}
              disabled={!promptInput.trim()}
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
            {STUDIO_EMPHASES.map((emp) => {
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
                  <div className="whitespace-pre-wrap">{msg.text}</div>

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
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                              {opt.confidence}% MATCH
                            </span>
                          </div>

                          <p className="text-[10px] text-slate-400 font-sans">{opt.description}</p>

                          {/* Invariant Scorecard */}
                          <div className="grid grid-cols-2 gap-1.5 text-[8.5px]">
                            <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800">
                              <span className="text-emerald-400 font-bold block mb-0.5">LOCKED INVARIANTS:</span>
                              <span className="text-slate-300">{opt.lockedInvariants.join(' • ')}</span>
                            </div>
                            <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800">
                              <span className="text-amber-400 font-bold block mb-0.5">MUTABLE ATTRIBUTES:</span>
                              <span className="text-slate-300">{opt.mutableParams.join(' • ')}</span>
                            </div>
                          </div>

                          {/* Audition / Commit Action Bar */}
                          <div className="flex items-center gap-2 pt-1 border-t border-slate-900">
                            <button
                              onClick={() => handleAudition(opt)}
                              className={`flex-1 py-1 px-2 rounded-lg font-bold text-[10px] flex items-center justify-center space-x-1 transition cursor-pointer ${
                                isAuditioning === opt.id
                                  ? 'bg-amber-400 text-slate-950 animate-pulse'
                                  : 'bg-slate-900 text-slate-200 hover:bg-slate-800 border border-slate-700'
                              }`}
                            >
                              <Play className="w-3 h-3" />
                              <span>{isAuditioning === opt.id ? 'AUDITIONING...' : 'AUDITION CANDIDATE'}</span>
                            </button>

                            <button
                              onClick={() => handleCommit(opt)}
                              className="py-1 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] flex items-center space-x-1 transition cursor-pointer shadow-md shadow-emerald-500/20"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>COMMIT TO DAW</span>
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
