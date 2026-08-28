import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Compass,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  Music,
  Mic,
  Sliders,
  ShieldCheck,
  Brain,
  FileAudio,
  Play,
  RotateCcw,
  CheckCircle2,
  Lock,
  ArrowRight,
  HelpCircle,
  Eye,
  Wand2,
  Split,
  Download,
} from 'lucide-react';

export type TourAspectId =
  | 'OVERVIEW'
  | 'CANVAS_ARRANGER'
  | 'PIANO_ROLL'
  | 'AUDIO_INGESTION'
  | 'STEM_DECOMPOSITION'
  | 'REMIX_LOCKS'
  | 'VOCAL_SUITE'
  | 'STUDIO_INTELLIGENCE'
  | 'NATIVE_BRAIN'
  | 'MIX_MASTER_RELEASE';

export interface TourStep {
  title: string;
  subtitle: string;
  badge: string;
  description: string;
  keyPoints: string[];
  actionPrompt?: string;
  targetElementSelector?: string;
  highlightIcon: React.ReactNode;
}

export interface TourAspect {
  id: TourAspectId;
  title: string;
  shortLabel: string;
  icon: string;
  badgeColor: string;
  summary: string;
  steps: TourStep[];
}

export const getTourAspects = (): TourAspect[] => [
  {
    id: 'OVERVIEW',
    title: 'Platform Overview & Human-First Philosophy',
    shortLabel: 'Overview',
    icon: '✨',
    badgeColor: 'amber',
    summary: 'A complete guided journey through the SoulSonus studio architecture.',
    steps: [
      {
        title: 'Welcome to SoulSonus Master Studio',
        subtitle: 'The Human First Instrument Platform',
        badge: 'PHILOSOPHY',
        description:
          'SoulSonus gives you professional DAW control powered by open-source intelligence. You own the creative decision; open-source models only execute authorized capabilities.',
        keyPoints: [
          'Single Permanent Multitrack Canvas (zero secondary windows or external AI DAWs)',
          'High-Resolution Note Events (480 PPQ) as the authoritative single source of truth',
          'Deterministic Invariant Contracts preventing generative drift and tempo instability',
          'Cryptographic SeedSignatures (SHA-256) tracking full artistic provenance',
        ],
        actionPrompt: 'Explore the workspace tabs or click NEXT to tour the Arranger.',
        highlightIcon: <Sparkles className="w-5 h-5 text-amber-400" />,
      },
      {
        title: 'Studio Layout & Navigation Hierarchy',
        subtitle: 'Top-to-Bottom Functional Flow',
        badge: 'LAYOUT',
        description:
          'Everything is arranged to give you maximum vertical space for timeline composition without modal clutter.',
        keyPoints: [
          '1. Top Header: Project Name, Key/Scale, Train Signature, Sound Vault, Manual, Collab, Export',
          '2. Studio Utilities Bar: Direct triggers for Studio Intelligence, Native Brain, Workstation, and Songwriting Suite',
          '3. Universal Arranger Toolbar: Pointer, Pencil, Stretch, Split, Eraser, Snap, Scale, and + ADD TRACK',
          '4. Permanent Multitrack Canvas: All remaining viewport height dedicated to multitrack editing',
        ],
        actionPrompt: 'Use the Studio Utilities buttons to pop open specialized drawers at any time.',
        highlightIcon: <Layers className="w-5 h-5 text-cyan-400" />,
      },
    ],
  },
  {
    id: 'CANVAS_ARRANGER',
    title: 'Permanent Multitrack Canvas & Arranger Toolbar',
    shortLabel: 'Arranger',
    icon: '🎛️',
    badgeColor: 'cyan',
    summary: 'Master the universal editing toolbar and multitrack timeline ruler.',
    steps: [
      {
        title: 'Universal Arranger Editing Tools',
        subtitle: 'Pointer (V), Pencil (B), Stretch (S), Split (C), Eraser (E)',
        badge: 'TOOLS',
        description:
          'The top Arranger Toolbar houses professional DAW editing tools mapped to standard keyboard shortcuts for lightning-fast workflow.',
        keyPoints: [
          'SELECT (V): Click and marquee-select notes across tracks',
          'DRAW (B): Click and drag to create new notes with snap grid alignment',
          'STRETCH (S): Drag note end-handles to stretch duration with real-time audio playback envelopes',
          'SPLIT (C): Scissor cut notes or audio clips at the playhead position',
          'ERASE (E): Click to delete notes or clips instantly',
        ],
        actionPrompt: 'Press (V) for Select, (B) for Pencil, or (S) for Stretch.',
        highlightIcon: <Sliders className="w-5 h-5 text-cyan-400" />,
      },
      {
        title: 'Musical Scales, Quantize & Track Creation',
        subtitle: 'Snap: 1/16 • Scale: C Minor • Transpose • [+ ADD TRACK]',
        badge: 'HARMONY',
        description:
          'Maintain harmonic coherence across all instruments with diatonic scale highlighting and instantaneous track creation.',
        keyPoints: [
          'SNAP: Align notes to 1/4, 1/8, 1/16, or 1/32 grid subdivisions',
          'SCALE GUIDES: Highlight diatonic scale notes (C Minor: C, D, Eb, F, G, Ab, Bb)',
          'TRANSPOSE: Shift selected notes or whole tracks up/down by octaves (-8ve / +8ve)',
          '+ ADD TRACK: Add 808 Kick, Snare, Hi-Hat, Sub Bass, Keys, Guitar, Strings, Brass, or Vocal Synth',
        ],
        actionPrompt: 'Click [+ ADD TRACK] in the Arranger Toolbar to add new instruments.',
        highlightIcon: <Music className="w-5 h-5 text-purple-400" />,
      },
    ],
  },
  {
    id: 'PIANO_ROLL',
    title: 'Tactile Note Editor & Expandable Piano Roll',
    shortLabel: 'Piano Roll',
    icon: '🎹',
    badgeColor: 'purple',
    summary: 'Direct in-track pitch editing with drag-stretch handles and velocity stalks.',
    steps: [
      {
        title: 'In-Track Expandable Piano Roll',
        subtitle: 'No Giant Secondary Windows — Directly on the Timeline',
        badge: 'NOTE EDITOR',
        description:
          'Melodic and harmonic tracks (Sub Bass, Lead Synth, Rhodes Keys) expand directly inside the multitrack lane to reveal an interactive pitch editor.',
        keyPoints: [
          'Vertical Piano Keyboard Ruler: C2 to C6 with interactive pitch auditioning on click',
          'Horizontal Stretch Handles: Drag the right edge of any note to extend its sustain length',
          'Diatonic Scale Highlighting: In-scale pitch rows are illuminated; out-of-scale rows are dimmed',
          'Continuous Playhead Sync: The playhead sweeps across the exact same timeline ruler',
        ],
        actionPrompt: 'Click the [▲] arrow on any pitch track to expand its Piano Roll.',
        highlightIcon: <Music className="w-5 h-5 text-purple-400" />,
      },
      {
        title: 'Velocity Stalks & Inline Syllable Lyrics',
        subtitle: 'Fine Dynamic Control (0..127) & Vocal Word Placement',
        badge: 'EXPRESSION',
        description:
          'Sculpt dynamics note-by-note with vertical velocity automation and attach vocal syllables directly to melody notes.',
        keyPoints: [
          'Velocity Lane: Drag the vertical velocity stalks (0..127) at the bottom of each note',
          'Inline Lyric Labels: Syllables like "Yeah", "Baby", "Hold" display directly on the note blocks',
          'Ghost Waveform Underlay: See your original oral beatbox or hum waveform behind the note grid',
          'SONUS Button [⚡ SONUS]: Audition performance transfer realization for any track',
        ],
        actionPrompt: 'Adjust velocity stalks to give your parts realistic human dynamics.',
        highlightIcon: <Sliders className="w-5 h-5 text-emerald-400" />,
      },
    ],
  },
  {
    id: 'AUDIO_INGESTION',
    title: 'AUDIO-001: Intelligent Audio Ingestion & Telemetry',
    shortLabel: 'Audio Ingest',
    icon: '📁',
    badgeColor: 'cyan',
    summary: 'Drag & drop audio files with deterministic acoustic analysis.',
    steps: [
      {
        title: 'Drag & Drop Audio Ingestion Dropzone',
        subtitle: 'WAV • FLAC • MP3 • AIF Support',
        badge: 'INGEST',
        description:
          'Drop any beat, instrumental loop, or full song into the AUDIO tab in Seed Capture Studio for instant analysis.',
        keyPoints: [
          'Universal File Format Support: Ingests 24-bit WAV, lossless FLAC, MP3, and AIFF files',
          'Zero Generative Cloud Guessing: Source audio remains immutable on your device',
          'Cryptographic Lineage: Automatically registers an SHA-256 provenance hash for the asset',
        ],
        actionPrompt: 'Switch to the AUDIO tab in Seed Capture to drop your audio file.',
        highlightIcon: <FileAudio className="w-5 h-5 text-cyan-400" />,
      },
      {
        title: 'Deterministic Acoustic Telemetry',
        subtitle: 'Exact BPM • Root Key • Time Signature • Waveform',
        badge: 'TELEMETRY',
        description:
          'SoulSonus measures the exact musical properties of your audio deterministically before any transformation occurs.',
        keyPoints: [
          'True BPM Detection: Measures tempo accurately (e.g. 94.00 BPM)',
          'Key & Scale Analysis: Identifies root tonality (e.g. C Natural Minor)',
          'Meter & Transient Analysis: Detects 4/4 time signature and transient peak positions',
          'Waveform Display: High-resolution visual representation of peaks and dynamics',
        ],
        actionPrompt: 'Lock the detected BPM to ensure zero tempo drift across transformations.',
        highlightIcon: <Sparkles className="w-5 h-5 text-amber-400" />,
      },
    ],
  },
  {
    id: 'STEM_DECOMPOSITION',
    title: 'AUDIO-001: Two-Level Stem Decomposition',
    shortLabel: 'Stems & Extract',
    icon: '⚡',
    badgeColor: 'emerald',
    summary: 'Separate audio into Quick 4-Stems or Deep 12-Class targeted stems.',
    steps: [
      {
        title: 'Level 1: Quick 4-Stem Separation (Demucs E06)',
        subtitle: 'Drums • Bass • Vocals • Music',
        badge: 'QUICK STEMS',
        description:
          'Quickly decompose any mixed stereo beat into the four primary stems using the deterministic Meta Demucs v4 model.',
        keyPoints: [
          'Drums Stem: Isolated kick, snare, claps, and cymbals',
          'Bass Stem: Isolated sub-bass, 808, and bass guitar',
          'Vocals Stem: Isolated lead vocals and spoken voice',
          'Music Stem: Harmonic accompaniment, synths, and chords',
        ],
        actionPrompt: 'Click [QUICK 4-STEM] to separate a stereo track in seconds.',
        highlightIcon: <Split className="w-5 h-5 text-cyan-400" />,
      },
      {
        title: 'Level 2: Deep 12-Class Targeted Extraction (E06)',
        subtitle: 'Strings • Brass • Keys • Guitar • Percussion • FX',
        badge: 'DEEP EXTRACT',
        description:
          'Extract specific instrumental layers with precision using targeted deep extraction classes.',
        keyPoints: [
          'Target Specific Classes: Strings, Brass/Horns, Piano/Keys, Guitar, Percussion, Synths, FX',
          'Multi-Select Chips: Choose exactly which instruments to extract from the mix',
          'POPULATE TO DAW: Converts all separated stems directly into normal, editable multitrack lanes',
        ],
        actionPrompt: 'Click [POPULATE TO DAW] to load all stems onto the multitrack timeline.',
        highlightIcon: <Layers className="w-5 h-5 text-emerald-400" />,
      },
    ],
  },
  {
    id: 'REMIX_LOCKS',
    title: 'AUDIO-002: Remix & Recompose with Creator Locks',
    shortLabel: 'Remix Locks',
    icon: '🔒',
    badgeColor: 'amber',
    summary: 'Transform audio while locking tempo, groove, chords, and melody.',
    steps: [
      {
        title: 'Remix vs. Recompose Transformation Modes',
        subtitle: 'Decide Exactly What Changes and What Survives',
        badge: 'MODES',
        description:
          'SoulSonus distinguishes between changing sound palette (Remix) versus changing musical composition (Recompose).',
        keyPoints: [
          'REMIX (TIMBRE): Keeps all notes, chords, and melodies; transforms sound design, instrumentation, and genre',
          'RECOMPOSE (HARMONY): Keeps tempo and groove; re-harmonizes chords and arrangements',
          'BUILD ON VOCAL (Vocal-to-BGM): Keeps human vocal authoritative; composes backing production around it',
        ],
        actionPrompt: 'Select your transformation mode in the Invariant Locks card.',
        highlightIcon: <Wand2 className="w-5 h-5 text-purple-400" />,
      },
      {
        title: 'Creator Invariant Locks & Role-Specific Tolerances',
        subtitle: 'Drums: ±6ms • Bass: ±12ms • Keys: ±25ms',
        badge: 'INVARIANTS',
        description:
          'Lock specific musical dimensions with dynamic, style-adaptive timing tolerances that protect the human pocket.',
        keyPoints: [
          '[x] Keep Tempo (Locked 94.00 BPM): Rejects any candidate that drifts off tempo',
          '[x] Keep Groove / Pocket: Enforces transient timing bounds (±6ms for drums, ±12ms for bass)',
          '[x] Keep Chords & Melody: Protects melodic phrasing and chord progressions',
          '[x] Keep Lead Vocal: Prevents generative models from altering the human voice',
        ],
        actionPrompt: 'Check the boxes for the invariants you want to preserve.',
        highlightIcon: <Lock className="w-5 h-5 text-amber-400" />,
      },
    ],
  },
  {
    id: 'VOCAL_SUITE',
    title: 'VOCAL-001: 4-Layer Vocal Architecture & Rights',
    shortLabel: 'Vocal Suite',
    icon: '🎙️',
    badgeColor: 'rose',
    summary: 'Separate performance, character aesthetic, voice identity, and DSP.',
    steps: [
      {
        title: 'The 4 Independent Vocal Layers',
        subtitle: 'Human Performance Kept Distinct from Voice Identity',
        badge: '4-LAYER VOCAL',
        description:
          'Inside WRITE & RECORD, vocal production is structured into four non-conflated dimensions.',
        keyPoints: [
          '1. PERFORMANCE: Raw takes 01..04, phrasing timing, syllable cadence, comp segments',
          '2. VOCAL CHARACTER: 10 delivery aesthetics (Warm, Airy, Raspy, Intimate, Powerful, Breathy, Falsetto, Gritty, Smooth, Choir)',
          '3. VOICE IDENTITY: My Voice, Original Performance, Licensed Session Singers with E16 Consent Proofs',
          '4. VOCAL DSP: Real-time formant shifting (-12..+12st), Diatonic Scale snap, 1176 FET comp, Plate Reverb',
        ],
        actionPrompt: 'Open Songwriting Suite from Studio Utilities to inspect the Vocal Booth.',
        highlightIcon: <Mic className="w-5 h-5 text-rose-400" />,
      },
      {
        title: 'Creative Reference & Influence Profile Ledger',
        subtitle: 'Stylistic Influence vs. Legal Consent Separation',
        badge: 'RIGHTS & LEDGER',
        description:
          'Record stylistic inspiration safely without confusing reference influence with digital replica rights.',
        keyPoints: [
          'Stylistic Attributes: Narrative perspective, Rhyme density %, Diction style, Melodic cadence',
          'Declared License Status: CREATOR_DECLARED_INFLUENCE vs LICENSED_STYLE_AGREEMENT',
          'Digital Replica Consent: Cryptographic proof IDs (e.g. #PROOF_LIC_BARI_88) for commercial safety',
        ],
        actionPrompt: 'Audition session singer profiles with verified consent proofs.',
        highlightIcon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
      },
    ],
  },
  {
    id: 'STUDIO_INTELLIGENCE',
    title: 'Studio Intelligence & Master Bus Telemetry Hub',
    shortLabel: 'Intelligence',
    icon: '✦',
    badgeColor: 'amber',
    summary: 'Interact with Producer, Engineer, Tutor, Guide & Manager roles.',
    steps: [
      {
        title: 'Top-Level Ask Intelligence & Role Emphases',
        subtitle: '[PRODUCER] [ENGINEER] [TUTOR] [GUIDE] [MANAGER]',
        badge: 'CO-PRODUCER',
        description:
          'Get intelligent suggestions, mix advice, and musical arrangement proposals from your multi-role studio partner.',
        keyPoints: [
          'Top Query Input: Type questions or use quick chips like "Fix kick clash", "Add strings", "Tuning"',
          'PRODUCER Role: Focuses on song structure, arrangement energy, and counter-melodies',
          'ENGINEER Role: Focuses on EQ masking, compression ratios, phase coherence, and mastering targets',
          'TUTOR & GUIDE: Step-by-step guidance on music theory, chord progressions, and DAW controls',
        ],
        actionPrompt: 'Click [✦ STUDIO INTELLIGENCE] in Studio Utilities to chat with the AI Co-Producer.',
        highlightIcon: <Sparkles className="w-5 h-5 text-amber-400" />,
      },
      {
        title: 'Master Bus Telemetry & Non-Destructive Proposals',
        subtitle: '-14.0 LUFS Target • -1.0 dBFS Peak • Invariant Scorecards',
        badge: 'MASTER HUB',
        description:
          'Monitor broadcast acoustic telemetry and review candidate proposals with Invariant Scorecards before committing.',
        keyPoints: [
          'Integrated Master Fader: Real-time volume control (-20dB to +6dB)',
          'Acoustic Standards: -14.0 LUFS integrated loudness target and -1.0 dBFS True Peak ceiling',
          'Master Limiter: Studio-grade peak limiter with instant toggle',
          'Invariant Scorecards: Displays rhythm, timing, and pitch preservation percentages before you commit',
        ],
        actionPrompt: 'Audition A/B candidates before committing changes non-destructively.',
        highlightIcon: <Sliders className="w-5 h-5 text-cyan-400" />,
      },
    ],
  },
  {
    id: 'NATIVE_BRAIN',
    title: 'Native Brain Workstation & Local Inference',
    shortLabel: 'Native Brain',
    icon: '🧠',
    badgeColor: 'purple',
    summary: '100% private, on-device offline reasoning and model configuration.',
    steps: [
      {
        title: '100% Private On-Device Neural Sandbox',
        subtitle: 'Zero Telemetry Upload • Fully Offline Capable',
        badge: 'PRIVACY',
        description:
          'Native Brain runs on-device reasoning so your musical ideas, stems, and lyrics never leave your computer.',
        keyPoints: [
          'Offline Execution: Operates with 100% privacy without requiring an internet connection',
          'Provider Flexibility: Choose SoulSonus Native Brain, Local Ollama, Google Gemini, or OpenAI',
          'Neural Hyperparameters: Customize Creativity / Temperature (0.0 to 1.5) and Context Window',
          'Live Connection Handshake: Test model responsiveness with sub-35ms local latency',
        ],
        actionPrompt: 'Click [🧠 NATIVE BRAIN] in Studio Utilities to configure your reasoning engine.',
        highlightIcon: <Brain className="w-5 h-5 text-purple-400" />,
      },
    ],
  },
  {
    id: 'MIX_MASTER_RELEASE',
    title: 'Mix Console, Mastering Telemetry & Release Package',
    shortLabel: 'Mix & Release',
    icon: '🚀',
    badgeColor: 'emerald',
    summary: '32-channel mixing console, 7-stage master rack, and master export package.',
    steps: [
      {
        title: '32-Channel Console & DSP Inserts',
        subtitle: 'Faders • Stereo Pan • Mute/Solo • Linear Phase DSP',
        badge: 'MIX CONSOLE',
        description:
          'Mix your tracks with studio-grade channel strips, grouping buses, and real-time spectral clash detection.',
        keyPoints: [
          'Console Faders & Meters: Real-time dB level indicators and peak hold',
          'Sub-Group Buses: Drum Bus, Bass Bus, Vocal Bus, and Music Bus for clean grouping',
          'DSP Channel Inserts: 4-Band Parametric EQ, 1176 FET Compressor, Stereo Chorus, Reverb, Delay',
        ],
        actionPrompt: 'Switch to MIX workspace to adjust faders and bus routing.',
        highlightIcon: <Sliders className="w-5 h-5 text-emerald-400" />,
      },
      {
        title: 'Release Packaging & SeedSignature Locks',
        subtitle: '24-Bit 48kHz WAV • Lossless FLAC • MP3 • Provenance Manifest',
        badge: 'RELEASE',
        description:
          'Export broadcast-ready master audio packages with cryptographic provenance and royalty split sheets.',
        keyPoints: [
          'Master Package Export: 24-bit / 48kHz Master WAV, 44.1kHz Streaming WAV, and true FLAC bitstream',
          'Individual Stems: Zip archive of isolated instrument tracks for remixing or live performance',
          'Cryptographic SeedSignature: Immutable SHA-256 provenance record protecting your authorship',
          'Split Sheet Signatures: Cryptographically signed contributor split agreements',
        ],
        actionPrompt: 'Click [EXPORT] in the top header to generate your master delivery package.',
        highlightIcon: <Download className="w-5 h-5 text-amber-400" />,
      },
    ],
  },
];

interface StudioTourGuideProps {
  isOpen: boolean;
  onClose: () => void;
  initialAspectId?: TourAspectId;
}

export const StudioTourGuide: React.FC<StudioTourGuideProps> = ({
  isOpen,
  onClose,
  initialAspectId = 'OVERVIEW',
}) => {
  const [activeAspectId, setActiveAspectId] = useState<TourAspectId>(initialAspectId);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (initialAspectId) {
      setActiveAspectId(initialAspectId);
      setCurrentStepIndex(0);
    }
  }, [initialAspectId]);

  if (!isOpen) return null;

  const tourAspects = getTourAspects();
  const currentAspect = tourAspects.find((a) => a.id === activeAspectId) || tourAspects[0];
  const currentStep = currentAspect.steps[currentStepIndex] || currentAspect.steps[0];
  const totalStepsInAspect = currentAspect.steps.length;

  const handleNext = () => {
    if (currentStepIndex < totalStepsInAspect - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      // Advance to next aspect if available
      const currentAspectIdx = tourAspects.findIndex((a) => a.id === activeAspectId);
      if (currentAspectIdx < tourAspects.length - 1) {
        setActiveAspectId(tourAspects[currentAspectIdx + 1].id);
        setCurrentStepIndex(0);
      } else {
        onClose();
      }
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    } else {
      const currentAspectIdx = tourAspects.findIndex((a) => a.id === activeAspectId);
      if (currentAspectIdx > 0) {
        const prevAspect = tourAspects[currentAspectIdx - 1];
        setActiveAspectId(prevAspect.id);
        setCurrentStepIndex(prevAspect.steps.length - 1);
      }
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md select-none font-mono">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className="w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Top Tour Navigation Bar */}
          <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span>SOULSONUS STUDIO TOUR</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold">
                    GUIDED WALKTHROUGH
                  </span>
                </h2>
                <p className="text-[10px] text-slate-400">
                  Interactive aspect-by-aspect guide to the single permanent multitrack DAW
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Aspect Selection Carousel Strip */}
          <div className="px-4 py-2 bg-slate-950 border-b border-slate-900 flex items-center space-x-1.5 overflow-x-auto scrollbar-none">
            {tourAspects.map((aspect) => {
              const isActive = aspect.id === activeAspectId;
              return (
                <button
                  key={aspect.id}
                  onClick={() => {
                    setActiveAspectId(aspect.id);
                    setCurrentStepIndex(0);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 border ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md shadow-amber-500/20 scale-105'
                      : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <span>{aspect.icon}</span>
                  <span>{aspect.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Main Tour Step Card */}
          <div className="p-6 flex-1 overflow-y-auto space-y-5 bg-gradient-to-b from-slate-950 via-slate-900/40 to-slate-950">
            {/* Step Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-inner">
                  {currentStep.highlightIcon}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                      {currentAspect.title}
                    </span>
                    <span className="px-2 py-0.2 rounded bg-slate-800 text-slate-300 text-[8.5px] font-bold">
                      STEP {currentStepIndex + 1} OF {totalStepsInAspect}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-white mt-0.5">{currentStep.title}</h3>
                  <p className="text-xs text-slate-400 font-bold">{currentStep.subtitle}</p>
                </div>
              </div>

              <div className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-bold">
                {currentStep.badge}
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
              {currentStep.description}
            </p>

            {/* Key Capabilities & Workflows List */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                KEY HIGHLIGHTS & INTERACTIONS:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {currentStep.keyPoints.map((point, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-start space-x-2.5"
                  >
                    <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      ✓
                    </div>
                    <span className="text-[10.5px] text-slate-200 leading-normal">{point}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Prompt / Pro-Tip Callout */}
            {currentStep.actionPrompt && (
              <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-cyan-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs text-amber-200 font-bold">{currentStep.actionPrompt}</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls & Step Navigation */}
          <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            {/* Step Indicators */}
            <div className="flex items-center space-x-1.5">
              {currentAspect.steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === currentStepIndex
                      ? 'w-6 bg-amber-500'
                      : 'w-2 bg-slate-800 hover:bg-slate-700'
                  }`}
                />
              ))}
            </div>

            {/* Previous & Next Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrevious}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition cursor-pointer flex items-center space-x-1 border border-slate-800"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>PREVIOUS</span>
              </button>

              <button
                onClick={handleNext}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs transition cursor-pointer flex items-center space-x-1.5 shadow-md shadow-amber-500/20 active:scale-95"
              >
                <span>
                  {currentStepIndex === totalStepsInAspect - 1 &&
                  activeAspectId === tourAspects[tourAspects.length - 1].id
                    ? 'FINISH TOUR'
                    : 'NEXT STEP'}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
