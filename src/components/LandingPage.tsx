import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  Mic,
  Activity,
  Disc,
  Sliders,
  Lock,
  Zap,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  FileText,
  ShieldCheck,
  Flame,
  Piano,
} from 'lucide-react';

interface LandingPageProps {
  onEnterStudio: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterStudio }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeInstrument, setActiveInstrument] = useState<string>('rhodes');

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const instruments = [
    { id: 'rhodes', name: 'Vintage Rhodes', category: 'Keys', icon: '🎹', tag: 'Acoustic / Warm' },
    { id: 'strings', name: 'Strings Section', category: 'Orchestral', icon: '🎻', tag: 'Budapest Cinema' },
    { id: 'sub808', name: 'Analog 808 Sub', category: 'Bass', icon: '⚡', tag: 'Deep Punch' },
    { id: 'drums', name: 'Vinyl Boom-Bap', category: 'Drums', icon: '🥁', tag: 'Fat Membrane' },
    { id: 'brass', name: 'Soul Horns', category: 'Brass', icon: '🎺', tag: 'Expressive Stack' },
    { id: 'guitar', name: 'Muted Electric', category: 'Guitar', icon: '🎸', tag: 'Stereo Groove' },
  ];

  const faqs = [
    {
      q: 'How is SoulSonus fundamentally different from prompt-based AI music generators?',
      a: 'Prompt-based generators (like Suno or Udio) take a text prompt and generate a whole random MP3 where you have zero creative input, zero stem access, and zero control over individual notes. SoulSonus is a professional DAW where YOU provide the human performance (the Soul) — whether by beatboxing, humming, tapping, singing, or importing audio. The intelligence then non-destructively orchestrates production around your exact timing, dynamics, and melody without ever destroying your performance.',
    },
    {
      q: 'Does SoulSonus ever overwrite, replace, or regenerate my original performance?',
      a: 'Never without your explicit directive. SoulSonus operates on a "Bounded Intelligence" doctrine: the human intent is preserved as authoritative NoteEvents and audio tracks. You choose exactly what stays fixed (e.g. your melody, groove, vocal phrasing) and what takes shape in the production (sound design, synths, acoustic layers, mix balance).',
    },
    {
      q: 'Can I export stems, MIDI, and masters into Ableton Live, Logic Pro, or Pro Tools?',
      a: 'Yes. SoulSonus exports broadcast-quality 24-bit / 48kHz PCM WAV files, spec-compliant lossless FLAC streams, isolated multi-track stems, and 480 PPQ MIDI sequences with full cryptographic SeedSignature provenance metadata.',
    },
    {
      q: 'What is a SeedSignature and how does it protect my intellectual property?',
      a: 'Every vocal take, beatbox performance, note sequence, and mix decision is hashed in real-time using browser WebCrypto SHA-256. This forms an unbroken, verifiable provenance chain proving that you are the original human author of the idea before any AI orchestration was applied.',
    },
    {
      q: 'Do I need heavy GPU hardware or cloud subscriptions to run this?',
      a: 'No. The entire client-side DAW runs 100% in your browser with zero latency. Tone.js audio synthesis, Spotify Basic Pitch neural pitch tracking (ONNX), granular pitch shifting, and ITU-R BS.1770-4 mastering telemetry all execute locally on your machine.',
    },
    {
      q: 'How do I plug in my studio microphone or MIDI keyboard?',
      a: 'SoulSonus connects to your computer’s default audio interface, USB microphone, or laptop mic via the Web Audio API with zero driver setup. Hardware MIDI controllers are automatically detected via WebMIDI with zero mapping required.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950 relative overflow-x-hidden">
      {/* Dynamic Ambient Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 left-1/4 w-[700px] h-[700px] bg-amber-500/10 rounded-full blur-[160px]" />
        <div className="absolute top-1/3 right-5 w-[700px] h-[700px] bg-cyan-500/10 rounded-full blur-[160px]" />
        <div className="absolute bottom-20 left-10 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[160px]" />
      </div>

      {/* Sticky Top Header Nav */}
      <nav className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-cyan-400 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-black text-amber-400 font-mono text-sm">
              S
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-mono font-black text-base tracking-widest bg-gradient-to-r from-amber-300 via-slate-100 to-cyan-300 bg-clip-text text-transparent">
              SOULSONUS
            </span>
            <span className="font-mono text-[9px] text-slate-400 tracking-wider">
              DAW & INTELLIGENCE
            </span>
          </div>
        </div>

        <div className="hidden lg:flex items-center space-x-6 text-xs font-mono text-slate-400">
          <a href="#philosophy" className="hover:text-amber-300 transition">PHILOSOPHY</a>
          <a href="#voice-cloning" className="hover:text-amber-300 transition">VOICE CLONING</a>
          <a href="#instruments" className="hover:text-amber-300 transition">INSTRUMENTS</a>
          <a href="#examples" className="hover:text-amber-300 transition">SOUL vs SONUS</a>
          <a href="#songwriting" className="hover:text-amber-300 transition">SONGWRITING</a>
          <a href="#generative-kits" className="hover:text-amber-300 transition">GENERATIVE KITS</a>
          <a href="#provenance" className="hover:text-amber-300 transition">PROVENANCE</a>
          <a href="#faq" className="hover:text-amber-300 transition">FAQ</a>
        </div>

        <button
          onClick={onEnterStudio}
          className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 text-slate-950 font-mono font-black text-xs tracking-wider flex items-center space-x-2 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
        >
          <span>ENTER THE STUDIO</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </nav>

      {/* Main Content Container */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-28 space-y-36">
        {/* HERO SECTION */}
        <section className="text-center space-y-8 pt-8">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>STUDIO BETA LIVE • 480 PPQ SEQUENCER • ON-DEVICE NEURAL INFERENCE • BS.1770-4 MASTERING</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.06]">
            From what you feel to what the world hears.
          </h1>

          <p className="text-lg sm:text-2xl text-slate-300 max-w-3xl mx-auto font-light leading-relaxed">
            You bring the <strong className="font-semibold text-amber-400">Soul</strong> — the idea, the performance, the instinct, the identity.
            <br className="hidden sm:inline" />
            <span className="text-slate-400"> SoulSonus shapes the </span>
            <strong className="font-semibold text-cyan-400">Sonus</strong> — the sound, the arrangement, the production, the finished record.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onEnterStudio}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 text-slate-950 font-mono font-black text-sm tracking-wider flex items-center justify-center space-x-3 shadow-xl shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-105 active:scale-95 transition cursor-pointer"
            >
              <span>ENTER THE STUDIO</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
            <a
              href="#voice-cloning"
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 font-mono font-bold text-xs tracking-wider flex items-center justify-center space-x-2 transition cursor-pointer"
            >
              <span>SEE HOW IT WORKS</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </section>

        {/* SECTION 1: THE NAME IS THE PRODUCT (THE CORE DUALITY) */}
        <section id="philosophy" className="scroll-mt-24 space-y-12">
          <div className="text-center space-y-3">
            <div className="text-[11px] font-mono font-black text-amber-400 uppercase tracking-widest">
              THE CORE ARCHITECTURE
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              The name is the product.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* SOUL Column */}
            <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-amber-500/10 via-slate-900/70 to-slate-950 border border-amber-500/30 shadow-2xl space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 text-8xl font-black text-amber-500/5 select-none font-mono">
                SOUL
              </div>
              <div className="space-y-2">
                <span className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold text-xs border border-amber-500/40">
                  THE HUMAN ORIGIN
                </span>
                <h3 className="text-3xl font-black text-white pt-2 font-mono">SOUL</h3>
              </div>
              <ul className="space-y-3.5 font-mono text-sm text-slate-300">
                <li className="flex items-center space-x-3">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <span>A melody you hear in your head.</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <span>A rhythm you tap on your desk.</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <span>A lyric cadence you write.</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <span>A vocal take you sing into the mic.</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <span>A beat or sample you bring in.</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <span>A production choice only you would make.</span>
                </li>
              </ul>
            </div>

            {/* SONUS Column */}
            <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-cyan-500/10 via-slate-900/70 to-slate-950 border border-cyan-500/30 shadow-2xl space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 text-8xl font-black text-cyan-500/5 select-none font-mono">
                SONUS
              </div>
              <div className="space-y-2">
                <span className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono font-bold text-xs border border-cyan-500/40">
                  THE SOUND THAT TAKES SHAPE
                </span>
                <h3 className="text-3xl font-black text-white pt-2 font-mono">SONUS</h3>
              </div>
              <ul className="space-y-3.5 font-mono text-sm text-slate-300">
                <li className="flex items-center space-x-3">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                  <span>Multi-layer Synthesizer & Acoustic Instrumentation.</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                  <span>Harmonic Arrangement & Chord Progressions.</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                  <span>Demucs v4 4-Stem Acoustic Separation.</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                  <span>Scale Quantization, Pitch Correction & Formant Tuning.</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                  <span>Surgical Dynamic Compression & 3-Band Parametric EQ.</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                  <span>ITU-R BS.1770-4 24-Bit Broadcast Mastering.</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="p-8 sm:p-10 rounded-3xl bg-slate-900/90 border border-slate-800 text-center space-y-3 shadow-xl">
            <p className="text-xl sm:text-2xl font-bold text-slate-100 max-w-3xl mx-auto leading-snug">
              SoulSonus exists to carry the <span className="text-amber-400">Soul</span> all the way into the <span className="text-cyan-400">Sonus</span> without losing the creator in between.
            </p>
          </div>
        </section>

        {/* FEATURE SPOTLIGHT 1: CLONE YOUR OWN VOICE & SIGNATURE */}
        <section id="voice-cloning" className="scroll-mt-24 space-y-10">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-amber-500/10 via-slate-900/80 to-slate-950 border border-amber-500/30 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-6">
              <span className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold text-xs border border-amber-500/40">
                VOICE IDENTITY & STYLE TRAINING
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                Clone Your OWN VOICE.
              </h2>
              <p className="text-slate-300 text-sm sm:text-base font-light leading-relaxed">
                Upload your vocal takes or hummed ideas and train your custom AI singing and rapping voice model in just a few clicks. Your timbre, pitch curve, and expressive style stay 100% yours — protected by verified biometric cryptographic consent.
              </p>

              <div className="space-y-3 pt-2 font-mono text-xs text-slate-300">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Timbre Blend & Breathiness Control (0–100%)</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Peaking Formant Shifting (±12 Semitones)</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Private On-Device Neural Model Storage</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onEnterStudio}
                  className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs tracking-wider flex items-center space-x-2 transition cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  <span>TRAIN YOUR SIGNATURE VOICE</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Visual DAW Mockup Card */}
            <div className="lg:col-span-6 p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 font-mono text-xs">
                <div className="flex items-center space-x-2">
                  <Mic className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-slate-200">CREATOR VOICE LAB • prof_signature_01</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                  VERIFIED BIOMETRIC
                </span>
              </div>

              {/* Waveform & Voice Parameters UI */}
              <div className="space-y-3 font-mono text-xs">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Acoustic Waveform Analysis</span>
                    <span className="text-amber-400">48,000 Hz / 24-Bit</span>
                  </div>
                  <div className="h-12 bg-slate-950 rounded-lg p-2 flex items-center justify-between gap-1 overflow-hidden">
                    {Array.from({ length: 32 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-amber-400/80 rounded-full transition-all duration-300"
                        style={{ height: `${Math.max(15, Math.sin(i * 0.4) * 80 + 20)}%` }}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div className="text-[10px] text-slate-400">TIMBRE BLEND</div>
                    <div className="text-base font-black text-amber-300">100% Signature</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div className="text-[10px] text-slate-400">FORMANT SHIFT</div>
                    <div className="text-base font-black text-cyan-300">+0.0 st (Locked)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURE SPOTLIGHT 2: NEXT-GENERATION AI VIRTUAL INSTRUMENTS */}
        <section id="instruments" className="scroll-mt-24 space-y-10">
          <div className="text-center space-y-3">
            <div className="text-[11px] font-mono font-black text-cyan-400 uppercase tracking-widest">
              NEXT-GENERATION VIRTUAL INSTRUMENTS
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Acoustic Realism. Zero Bulk.
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base font-light">
              Say goodbye to 100GB sample libraries. Generate expressive, natural-sounding instrument performances from your voice, taps, or MIDI while retaining full multi-track control.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2 font-mono text-xs">
              <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">✦ Natural-Play</span>
              <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">✦ Auto-Expressive Dynamics</span>
              <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">✦ 100% Royalty-Free</span>
            </div>
          </div>

          {/* Interactive Instrument Grid Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {instruments.map((inst) => {
              const isSelected = activeInstrument === inst.id;
              return (
                <button
                  key={inst.id}
                  onClick={() => setActiveInstrument(inst.id)}
                  className={`p-4 rounded-2xl border text-left space-y-2 transition cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-b from-cyan-500/20 to-slate-900 border-cyan-400 shadow-lg shadow-cyan-500/20 scale-[1.02]'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="text-2xl">{inst.icon}</div>
                  <div>
                    <div className="text-xs font-bold text-white">{inst.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{inst.tag}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Piano Roll & Ensemble Showcase */}
          <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center space-x-2 text-cyan-400 font-mono text-xs font-bold">
                <Piano className="w-4 h-4" />
                <span>480 PPQ HIGH-RESOLUTION NOTE CANVAS</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white">
                Perform with Precision.
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-light">
                Sub-beat 16th-note ticks (120 ticks per step). Draw, stretch, split, and transpose individual notes across 88 keys with continuous velocity modulation and scale snapping in C Minor.
              </p>
            </div>

            <div className="lg:col-span-5 p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
              <div className="text-slate-400 text-[10px] uppercase font-bold">Ensemble Stacking Mode</div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-bold text-amber-300">Layer 1 (Lead)</span>
                  <span className="text-[10px] text-slate-400">Vintage Rhodes (C3)</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-bold text-cyan-300">Layer 2 (Harmony)</span>
                  <span className="text-[10px] text-slate-400">Strings Section (+3rd)</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-bold text-purple-300">Layer 3 (Sub)</span>
                  <span className="text-[10px] text-slate-400">Analog 808 (-8ve)</span>
                </div>
              </div>
              <div className="text-[10px] text-slate-500">All 3 instruments trigger in sample-accurate phase alignment.</div>
            </div>
          </div>
        </section>

        {/* SECTION 3: KEEP THE SOUL. CHANGE THE SONUS. (6 REAL EXAMPLES) */}
        <section id="examples" className="scroll-mt-24 space-y-12">
          <div className="text-center space-y-3">
            <div className="text-[11px] font-mono font-black text-purple-400 uppercase tracking-widest">
              NON-DESTRUCTIVE PERFORMANCE PRESERVATION
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Keep the Soul. Change the Sonus.
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base font-light">
              Generic AI destroys your performance by regenerating random sounds. SoulSonus anchors your human intent and transforms the production non-destructively.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Example 1: Beatbox to Drum Kit */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-5 flex flex-col justify-between shadow-xl">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <span className="font-mono font-bold text-white text-xs">Beatbox ➔ Custom Drum Kit</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">RHYTHM</span>
                </div>
                <p className="text-xs text-slate-400">You beatbox an organic boom-bap rhythm into your laptop mic.</p>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                  <div className="text-amber-400 font-bold flex items-center space-x-1">
                    <Lock className="w-3 h-3" />
                    <span>KEEP (THE SOUL):</span>
                  </div>
                  <div className="text-slate-300 text-[11px]">Syncopated pocket, micro-timing swing, ghost notes, velocity dynamics.</div>
                </div>
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-1">
                  <div className="text-cyan-400 font-bold flex items-center space-x-1">
                    <Sliders className="w-3 h-3" />
                    <span>CHANGE (THE SONUS):</span>
                  </div>
                  <div className="text-slate-300 text-[11px]">Punchy 808 sub kick, crispy vinyl snare, stereo hi-hats, studio compression.</div>
                </div>
              </div>
            </div>

            {/* Example 2: Hum a Bassline */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-5 flex flex-col justify-between shadow-xl">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <Mic className="w-4 h-4 text-cyan-400" />
                    <span className="font-mono font-bold text-white text-xs">Hum ➔ Analog Moog Sub Bass</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">MELODY</span>
                </div>
                <p className="text-xs text-slate-400">You hum a bassline melody while riding in your car.</p>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                  <div className="text-amber-400 font-bold flex items-center space-x-1">
                    <Lock className="w-3 h-3" />
                    <span>KEEP (THE SOUL):</span>
                  </div>
                  <div className="text-slate-300 text-[11px]">Exact pitch contour, slide transitions, note lengths, expressive phrasing.</div>
                </div>
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-1">
                  <div className="text-cyan-400 font-bold flex items-center space-x-1">
                    <Sliders className="w-3 h-3" />
                    <span>CHANGE (THE SONUS):</span>
                  </div>
                  <div className="text-slate-300 text-[11px]">Moog 24dB ladder filter, analog sawtooth oscillators, sidechain pump.</div>
                </div>
              </div>
            </div>

            {/* Example 3: Body Percussion & Claps */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-5 flex flex-col justify-between shadow-xl">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-pink-400" />
                    <span className="font-mono font-bold text-white text-xs">Clap / Tap ➔ Studio Percussion</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 font-bold">GROOVE</span>
                </div>
                <p className="text-xs text-slate-400">You tap a polyrhythm on your tabletop or snap your fingers.</p>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                  <div className="text-amber-400 font-bold flex items-center space-x-1">
                    <Lock className="w-3 h-3" />
                    <span>KEEP (THE SOUL):</span>
                  </div>
                  <div className="text-slate-300 text-[11px]">Human polyrhythmic micro-groove, syncopated accents, natural timing.</div>
                </div>
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-1">
                  <div className="text-cyan-400 font-bold flex items-center space-x-1">
                    <Sliders className="w-3 h-3" />
                    <span>CHANGE (THE SONUS):</span>
                  </div>
                  <div className="text-slate-300 text-[11px]">Orchestral shakers, conga hits, tight handclaps, wide stereo delay.</div>
                </div>
              </div>
            </div>

            {/* Example 4: Raw Vocal Take to Lead & Harmonies */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-5 flex flex-col justify-between shadow-xl">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-purple-400" />
                    <span className="font-mono font-bold text-white text-xs">Raw Vocal ➔ 3-Part Stack</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">VOCALS</span>
                </div>
                <p className="text-xs text-slate-400">You sing a passionate hook on a noisy smartphone mic.</p>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                  <div className="text-amber-400 font-bold flex items-center space-x-1">
                    <Lock className="w-3 h-3" />
                    <span>KEEP (THE SOUL):</span>
                  </div>
                  <div className="text-slate-300 text-[11px]">Emotional vocal delivery, lyrical inflections, vibrato, authentic phrasing.</div>
                </div>
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-1">
                  <div className="text-cyan-400 font-bold flex items-center space-x-1">
                    <Sliders className="w-3 h-3" />
                    <span>CHANGE (THE SONUS):</span>
                  </div>
                  <div className="text-slate-300 text-[11px]">Diatonic 3rd & 5th vocal doubles, C Minor scale snap, formant shift.</div>
                </div>
              </div>
            </div>

            {/* Example 5: Import a Beat / Sample */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-5 flex flex-col justify-between shadow-xl">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <Disc className="w-4 h-4 text-emerald-400" />
                    <span className="font-mono font-bold text-white text-xs">Audio File ➔ 4 Stems + Chords</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">STEMS</span>
                </div>
                <p className="text-xs text-slate-400">You drop in a stereo bounce of an old beat you made years ago.</p>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                  <div className="text-amber-400 font-bold flex items-center space-x-1">
                    <Lock className="w-3 h-3" />
                    <span>KEEP (THE SOUL):</span>
                  </div>
                  <div className="text-slate-300 text-[11px]">Original 94 BPM tempo, drum bounce, vocal samples, bassline foundation.</div>
                </div>
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-1">
                  <div className="text-cyan-400 font-bold flex items-center space-x-1">
                    <Sliders className="w-3 h-3" />
                    <span>CHANGE (THE SONUS):</span>
                  </div>
                  <div className="text-slate-300 text-[11px]">Demucs 4-stem split, Vintage Rhodes chords, new arrangement structure.</div>
                </div>
              </div>
            </div>

            {/* Example 6: Lyric Cadence to Track */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-5 flex flex-col justify-between shadow-xl">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span className="font-mono font-bold text-white text-xs">Lyrics ➔ Syllable Grid Timing</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">CADENCE</span>
                </div>
                <p className="text-xs text-slate-400">You write a multi-rhyme verse in the Lyric Cadence Studio.</p>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                  <div className="text-amber-400 font-bold flex items-center space-x-1">
                    <Lock className="w-3 h-3" />
                    <span>KEEP (THE SOUL):</span>
                  </div>
                  <div className="text-slate-300 text-[11px]">Written poetry, internal rhymes, breath pauses, author identity.</div>
                </div>
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-1">
                  <div className="text-cyan-400 font-bold flex items-center space-x-1">
                    <Sliders className="w-3 h-3" />
                    <span>CHANGE (THE SONUS):</span>
                  </div>
                  <div className="text-slate-300 text-[11px]">16th-note sub-beat grid snapping, overdub take punch-ins, stereo doubling.</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURE SPOTLIGHT 4: SONGWRITING SUITE & VOCAL BOOTH */}
        <section id="songwriting" className="scroll-mt-24 space-y-10">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-pink-500/10 via-slate-900/80 to-slate-950 border border-pink-500/30 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-6">
              <span className="px-3 py-1 rounded-lg bg-pink-500/20 text-pink-300 font-mono font-bold text-xs border border-pink-500/40">
                LYRIC CADENCE & MULTI-TAKE VOCAL BOOTH
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                Give Voice to Your Soul.
              </h2>
              <p className="text-slate-300 text-sm sm:text-base font-light leading-relaxed">
                A dedicated environment for vocalists, songwriters, and rappers. Align words to 16th-note sub-beat subdivisions, record multiple takes with seamless punch-in regions, and build pristine vocal comps with granular pitch correction.
              </p>

              <div className="grid grid-cols-2 gap-3 font-mono text-xs text-slate-300 pt-1">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="font-bold text-pink-400">Cadence Grid</div>
                  <div className="text-[11px] text-slate-400">Syllable meter sync</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="font-bold text-pink-400">Comp Builder</div>
                  <div className="text-[11px] text-slate-400">Best-phrase comping</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="font-bold text-pink-400">Scale Auto-Tune</div>
                  <div className="text-[11px] text-slate-400">C Minor / Major Lock</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="font-bold text-pink-400">3-Part Harmonies</div>
                  <div className="text-[11px] text-slate-400">Diatonic intervals</div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onEnterStudio}
                  className="px-6 py-3 rounded-xl bg-pink-500 hover:bg-pink-400 text-slate-950 font-mono font-bold text-xs tracking-wider flex items-center space-x-2 transition cursor-pointer shadow-lg shadow-pink-500/20"
                >
                  <span>LAUNCH SONGWRITING SUITE</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Vocal Comping Mockup */}
            <div className="lg:col-span-6 p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-pink-300">VOCAL COMP STACK • Lead Vocal</span>
                <span className="text-[10px] text-slate-400">4 Takes Recorded</span>
              </div>
              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-pink-500/20 border border-pink-500/40 flex justify-between items-center text-pink-200">
                  <span>Take 01 (Verse 1 - Line 1)</span>
                  <span className="text-[10px] font-bold bg-pink-500 text-slate-950 px-1.5 py-0.5 rounded">ACTIVE COMP</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center text-slate-400">
                  <span>Take 02 (Verse 1 - Line 2)</span>
                  <span className="text-[10px]">Audition</span>
                </div>
                <div className="p-2.5 rounded-lg bg-pink-500/20 border border-pink-500/40 flex justify-between items-center text-pink-200">
                  <span>Take 03 (Hook Climax)</span>
                  <span className="text-[10px] font-bold bg-pink-500 text-slate-950 px-1.5 py-0.5 rounded">ACTIVE COMP</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURE SPOTLIGHT 5: GENERATIVE KITS & CO-PRODUCER */}
        <section id="generative-kits" className="scroll-mt-24 space-y-12">
          <div className="text-center space-y-3">
            <div className="text-[11px] font-mono font-black text-purple-400 uppercase tracking-widest">
              NEW WAY TO PRODUCE
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Generative Co-Producer Kits.
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base font-light">
              Collaborate with an intelligent co-producer that respects your performance boundaries.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Inspire Me */}
            <div className="p-8 rounded-3xl bg-slate-900/90 border border-purple-500/30 space-y-6 shadow-2xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 font-bold">
                  ✦
                </div>
                <h3 className="text-2xl font-bold text-white">Inspire Me</h3>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  Spark your ideas with limitless generated track proposals that follow your exact tempo, key, and rhythm. Ask for complementary Rhodes chords, syncopated 808 sub fills, or melodic string counterpoints.
                </p>
              </div>

              {/* Prompt UI Mockup */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 font-mono text-xs">
                <div className="text-[10px] text-slate-500">NATURAL LANGUAGE CO-PRODUCER</div>
                <div className="p-2.5 rounded-lg bg-slate-900 text-purple-300 border border-slate-800 text-[11px]">
                  “Generate a warm neo-soul Rhodes progression in C Minor to support this beatbox rhythm.”
                </div>
              </div>
            </div>

            {/* Add a Layer */}
            <div className="p-8 rounded-3xl bg-slate-900/90 border border-cyan-500/30 space-y-6 shadow-2xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold">
                  🎛️
                </div>
                <h3 className="text-2xl font-bold text-white">Add a Layer</h3>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  Create layer by layer, note by note, sample by sample. Tell the studio what to keep (your drum swing and vocal take) and what to add (cinematic vinyl strings, orchestral brass, or analog sidechain pads).
                </p>
              </div>

              {/* Multi-Track Arranger Mockup */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 font-mono text-xs">
                <div className="text-[10px] text-slate-500">NON-DESTRUCTIVE MULTI-TRACK STACK</div>
                <div className="space-y-1 text-[11px]">
                  <div className="p-1.5 rounded bg-amber-500/15 text-amber-300 flex justify-between">
                    <span>[🔒 KEPT] Kick + Snare (Mouth Beatbox)</span>
                    <span className="text-[10px]">Author Intent</span>
                  </div>
                  <div className="p-1.5 rounded bg-cyan-500/15 text-cyan-300 flex justify-between">
                    <span>[⚡ ADDED] Vintage Rhodes Chords</span>
                    <span className="text-[10px]">Generated Layer</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURE SPOTLIGHT 6: SEEDSIGNATURE PROVENANCE & COPYRIGHT */}
        <section id="provenance" className="scroll-mt-24 space-y-10">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-blue-500/10 via-slate-900/80 to-slate-950 border border-blue-500/30 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-6">
              <span className="px-3 py-1 rounded-lg bg-blue-500/20 text-blue-300 font-mono font-bold text-xs border border-blue-500/40">
                PROVABLE INTELLECTUAL PROPERTY
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                SeedSignature™ Provenance.
              </h2>
              <p className="text-slate-300 text-sm sm:text-base font-light leading-relaxed">
                Your human idea is protected the moment you perform it. Every beatbox rhythm, vocal take, and note pattern is cryptographically signed via WebCrypto SHA-256 before any AI processing occurs — creating an immutable, court-ready ledger of your authorship.
              </p>

              <div className="space-y-2.5 font-mono text-xs text-slate-300 pt-1">
                <div className="flex items-center space-x-3">
                  <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Unbroken Parent-Child Cryptographic Lineage</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Automated Split Sheets & Collaborator Attribution</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Export JSON Provenance Manifest with Masters</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onEnterStudio}
                  className="px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-mono font-bold text-xs tracking-wider flex items-center space-x-2 transition cursor-pointer shadow-lg shadow-blue-500/20"
                >
                  <span>EXPLORE SEEDSIGNATURE LEDGER</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Cryptographic Ledger Card */}
            <div className="lg:col-span-6 p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-blue-300">CRYPTOGRAPHIC PROVENANCE MANIFEST</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">VERIFIED</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-[11px]">
                <div className="text-slate-400">Root Take Hash:</div>
                <div className="text-blue-300 break-all font-mono">0x15b53ba7a98ae0ae4a311a63f2f589e49ce646a5</div>
                <div className="text-slate-400 pt-1">Dataset License Status:</div>
                <div className="text-emerald-400 font-bold">100% COMPLIANT (Human Author Provenance)</div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 7: PRODUCER FAQ ACCORDION */}
        <section id="faq" className="scroll-mt-24 space-y-12">
          <div className="text-center space-y-3">
            <div className="text-[11px] font-mono font-black text-amber-400 uppercase tracking-widest">
              FREQUENTLY ASKED QUESTIONS
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Questions & Answers.
            </h2>
          </div>

          <div className="space-y-4 max-w-3xl mx-auto font-mono">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden transition"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 hover:text-amber-300 transition cursor-pointer"
                  >
                    <span className="font-bold text-white text-sm">{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-amber-400' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs text-slate-300 font-sans leading-relaxed border-t border-slate-800/60">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* HEROIC CLOSING SECTION */}
        <section className="text-center space-y-8 py-16 border-t border-slate-800">
          <p className="text-2xl sm:text-3xl font-light text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Your <strong className="font-semibold text-amber-400">Soul</strong> was never the part that needed generating.
            <br />
            It needed a studio capable of hearing it.
          </p>

          <div className="space-y-3">
            <div className="text-4xl sm:text-6xl font-black font-mono tracking-wider bg-gradient-to-r from-amber-300 via-white to-cyan-300 bg-clip-text text-transparent">
              SOULSONUS
            </div>
            <div className="text-xs sm:text-sm font-mono text-slate-400 tracking-widest uppercase">
              Keep the Soul. Shape the Sound.
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={onEnterStudio}
              className="px-10 py-5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 text-slate-950 font-mono font-black text-sm tracking-wider inline-flex items-center space-x-3 shadow-2xl shadow-amber-500/40 hover:shadow-amber-500/60 hover:scale-105 active:scale-95 transition cursor-pointer"
            >
              <span>ENTER THE STUDIO</span>
              <ArrowRight className="w-5 h-5 stroke-[3]" />
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-10 px-6 font-mono text-xs text-slate-500 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-500 to-cyan-400 flex items-center justify-center font-bold text-xs text-slate-950">
              S
            </div>
            <span className="font-bold text-slate-300">SOULSONUS</span>
            <span>• Built for Human Creators</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] text-slate-400">
            <a href="#philosophy" className="hover:text-amber-300 transition">Philosophy</a>
            <a href="#voice-cloning" className="hover:text-amber-300 transition">Voice Cloning</a>
            <a href="#instruments" className="hover:text-amber-300 transition">AI Instruments</a>
            <a href="#examples" className="hover:text-amber-300 transition">Soul vs Sonus</a>
            <a href="#songwriting" className="hover:text-amber-300 transition">Songwriting</a>
            <a href="#generative-kits" className="hover:text-amber-300 transition">Generative Kits</a>
            <a href="#provenance" className="hover:text-amber-300 transition">SeedSignature</a>
            <a href="#faq" className="hover:text-amber-300 transition">FAQ</a>
            <button onClick={onEnterStudio} className="text-amber-400 hover:underline">Launch DAW</button>
          </div>

          <div className="text-[11px] text-slate-500">
            © {new Date().getFullYear()} SOULSONUS. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
