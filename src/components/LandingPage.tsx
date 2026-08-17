import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  Mic,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
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
      q: 'How do the Mix and Mastering rooms work in SoulSonus?',
      a: 'SoulSonus includes a complete 32-channel visual mixing console desk (Room 4: MIX) with per-track 3-band parametric EQs, FET compressors, aux reverb/delay sends, sub-buses, and real-time Reference Track A/B auditioning. Room 5 (MASTER) features a 7-stage mastering DSP rack with ITU-R BS.1770-4 K-weighting LUFS loudness targets (-14 LUFS-I for streaming) and 4x oversampled true peak limiting.',
    },
    {
      q: 'How is SoulSonus fundamentally different from prompt-based AI music generators?',
      a: 'Prompt-based generators (like Suno or Udio) take a text prompt and generate a whole random MP3 where you have zero creative input, zero stem access, and zero control over individual notes. SoulSonus is a professional DAW where YOU provide the human performance (the Soul) — whether by beatboxing, humming, tapping, singing, or importing audio. The intelligence then non-destructively orchestrates production around your exact timing, dynamics, and melody without ever destroying your performance.',
    },
    {
      q: 'Does SoulSonus ever overwrite, replace, or regenerate my original performance?',
      a: 'Never without your explicit directive. SoulSonus operates on a "Bounded Intelligence" doctrine: the human intent is preserved as authoritative NoteEvents and audio tracks. You choose exactly what stays fixed (e.g. your melody, groove, vocal phrasing) and what takes shape in the production (sound design, synths, acoustic layers, mix balance).',
    },
    {
      q: 'Can I export stems, MIDI, and broadcast masters into Ableton Live, Logic Pro, or Pro Tools?',
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

        <div className="hidden xl:flex items-center space-x-5 text-xs font-mono text-slate-400">
          <a href="#philosophy" className="hover:text-amber-300 transition">PHILOSOPHY</a>
          <a href="#voice-cloning" className="hover:text-amber-300 transition">VOICE CLONE</a>
          <a href="#instruments" className="hover:text-amber-300 transition">INSTRUMENTS</a>
          <a href="#songwriting" className="hover:text-amber-300 transition">SONGWRITING</a>
          <a href="#mix-console" className="hover:text-amber-300 transition">MIX DESK</a>
          <a href="#mastering" className="hover:text-amber-300 transition">MASTERING</a>
          <a href="#release" className="hover:text-amber-300 transition">RELEASE</a>
          <a href="#hardware-workstation" className="hover:text-amber-300 transition">HARDWARE</a>
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
        <section className="text-center space-y-8 pt-4">
          {/* 6-Step Creator Journey Flowchart (At Top of Page) */}
          <div className="w-full max-w-5xl mx-auto overflow-x-auto no-scrollbar py-2">
            <div className="inline-flex items-center justify-center gap-1.5 sm:gap-2.5 px-3.5 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl font-mono text-left whitespace-nowrap">
              {/* 1. CREATE */}
              <div className="flex flex-col p-2 rounded-xl bg-slate-950/90 border border-amber-500/30 shadow-inner">
                <span className="text-[11px] font-black text-amber-400">1. CREATE</span>
                <span className="text-[9px] text-slate-400">Hum • Beatbox • Notes</span>
              </div>

              <span className="text-slate-600 font-bold text-xs px-0.5">➔</span>

              {/* 2. BUILD */}
              <div className="flex flex-col p-2 rounded-xl bg-slate-950/90 border border-cyan-500/30 shadow-inner">
                <span className="text-[11px] font-black text-cyan-400">2. BUILD</span>
                <span className="text-[9px] text-slate-400">Arranger • Piano Roll</span>
              </div>

              <span className="text-slate-600 font-bold text-xs px-0.5">➔</span>

              {/* 3. WRITE & RECORD */}
              <div className="flex flex-col p-2 rounded-xl bg-slate-950/90 border border-pink-500/30 shadow-inner">
                <span className="text-[11px] font-black text-pink-400">3. WRITE & RECORD</span>
                <span className="text-[9px] text-slate-400">Lyric Cadence • Comps</span>
              </div>

              <span className="text-slate-600 font-bold text-xs px-0.5">➔</span>

              {/* 4. MIX */}
              <div className="flex flex-col p-2 rounded-xl bg-slate-950/90 border border-emerald-500/30 shadow-inner">
                <span className="text-[11px] font-black text-emerald-400">4. MIX</span>
                <span className="text-[9px] text-slate-400">32-Ch Console • Buses</span>
              </div>

              <span className="text-slate-600 font-bold text-xs px-0.5">➔</span>

              {/* 5. MASTER */}
              <div className="flex flex-col p-2 rounded-xl bg-slate-950/90 border border-indigo-500/30 shadow-inner">
                <span className="text-[11px] font-black text-indigo-400">5. MASTER</span>
                <span className="text-[9px] text-slate-400">BS.1770-4 LUFS • Peak</span>
              </div>

              <span className="text-slate-600 font-bold text-xs px-0.5">➔</span>

              {/* 6. RELEASE */}
              <div className="flex flex-col p-2 rounded-xl bg-slate-950/90 border border-purple-500/30 shadow-inner">
                <span className="text-[11px] font-black text-purple-400">6. RELEASE</span>
                <span className="text-[9px] text-slate-400">SeedSignature • 24-Bit</span>
              </div>
            </div>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-5xl mx-auto leading-[1.08]">
            SoulSonus preserves the creator’s musical soul while giving it finished sound.
          </h1>

          <p className="text-lg sm:text-2xl text-slate-300 max-w-3xl mx-auto font-light leading-relaxed">
            From what you feel to what the world hears. You bring the <strong className="font-semibold text-amber-400">Soul</strong> — the idea, the performance, the instinct, the identity.
            <br className="hidden sm:inline" />
            <span className="text-slate-400"> SoulSonus shapes the </span>
            <strong className="font-semibold text-cyan-400">Sonus</strong> — the sound, the arrangement, the production, the finished record.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onEnterStudio}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 text-slate-950 font-mono font-black text-sm tracking-wider flex items-center justify-center space-x-3 shadow-xl shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-105 active:scale-95 transition cursor-pointer"
            >
              <span>ENTER THE STUDIO</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
            <a
              href="#mix-console"
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 font-mono font-bold text-xs tracking-wider flex items-center justify-center space-x-2 transition cursor-pointer"
            >
              <span>EXPLORE MIX & MASTERING</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Technical Badge Pill (Moved Below CTA) */}
          <div className="pt-2">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-300 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>6-ROOM PRODUCTION DAW • 32-CH MIX DESK • 7-STAGE MASTERING • SHA-256 PROVENANCE</span>
            </div>
          </div>
        </section>

        {/* SECTION 1: THE NAME IS THE PRODUCT */}
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
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold leading-relaxed">
                  <span className="text-amber-400">SOUL:</span> creator-originated intent, performance, phrasing, authorship, seed.
                </div>
                <h3 className="text-3xl font-black text-white pt-1 font-mono">SOUL</h3>
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
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold leading-relaxed">
                  <span className="text-cyan-400">SONUS:</span> the produced sound, realization, engineering, and finished sonic result.
                </div>
                <h3 className="text-3xl font-black text-white pt-1 font-mono">SONUS</h3>
              </div>
              <ul className="space-y-3.5 font-mono text-sm text-slate-300">
                <li className="flex items-center space-x-3">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                  <span>Multi-layer Synthesizer & Acoustic Instrumentation.</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                  <span>32-Channel Mixing Console & Sub-Buses.</span>
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
                  <span>7-Stage Mastering DSP Rack & ITU-R BS.1770-4 LUFS.</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                  <span>WebCrypto SHA-256 SeedSignature Provenance Ledger.</span>
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

        {/* SPOTLIGHT 1: CLONE YOUR OWN VOICE */}
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

            <div className="lg:col-span-6 p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-inner font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Mic className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-slate-200">CREATOR VOICE LAB • prof_signature_01</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                  VERIFIED BIOMETRIC
                </span>
              </div>

              <div className="space-y-3">
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

        {/* SPOTLIGHT 2: NEXT-GEN AI VIRTUAL INSTRUMENTS */}
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

        {/* SPOTLIGHT 3: ROOM 4 — PRO AUDIO MIX CONSOLE & SUB-BUSES */}
        <section id="mix-console" className="scroll-mt-24 space-y-10">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-emerald-500/10 via-slate-900/80 to-slate-950 border border-emerald-500/30 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-6">
              <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs border border-emerald-500/40">
                ROOM 4: PRO AUDIO MIXING DESK
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                Multichannel Console & Sub-Buses.
              </h2>
              <p className="text-slate-300 text-sm sm:text-base font-light leading-relaxed">
                Step into a professional 32-channel visual mixer desk. Shape punch, dimension, and clarity with per-channel 3-band parametric EQs, FET compressors, reverb/delay aux sends, sub-bus group routing, and instant Reference Track A/B matching.
              </p>

              <div className="grid grid-cols-2 gap-3 font-mono text-xs text-slate-300 pt-1">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="font-bold text-emerald-400">Sub-Bus Routing</div>
                  <div className="text-[11px] text-slate-400">Drums, Vocals, Synths</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="font-bold text-emerald-400">Dynamic 3-Band EQ</div>
                  <div className="text-[11px] text-slate-400">Low-cut, Mid-Q, Highs</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="font-bold text-emerald-400">FET Compressor</div>
                  <div className="text-[11px] text-slate-400">Fast attack punch</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="font-bold text-emerald-400">Reference Track A/B</div>
                  <div className="text-[11px] text-slate-400">Instant commercial check</div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onEnterStudio}
                  className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs tracking-wider flex items-center space-x-2 transition cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  <span>OPEN 32-CH MIX CONSOLE</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Console Desk Visual Mockup */}
            <div className="lg:col-span-6 p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-emerald-300">MIX DESK • 8 ACTIVE CHANNELS</span>
                <span className="text-[10px] text-slate-400">Sub-Bus Mode: DRUM + VOCAL</span>
              </div>
              <div className="grid grid-cols-4 gap-2 pt-1">
                {['Kick', 'Snare', 'Rhodes', 'Lead Vocal'].map((ch, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center space-y-2">
                    <span className="text-[10px] text-slate-300 font-bold">{ch}</span>
                    <div className="w-2 h-20 bg-slate-950 rounded-full flex flex-col justify-end p-0.5">
                      <div
                        className="w-full bg-emerald-400 rounded-full"
                        style={{ height: `${60 + idx * 10}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-emerald-300 font-bold">{idx === 0 ? '-2.0 dB' : idx === 3 ? '+1.5 dB' : '0.0 dB'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SPOTLIGHT 4: ROOM 5 — BROADCAST MASTERING SUITE & LUFS */}
        <section id="mastering" className="scroll-mt-24 space-y-10">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-indigo-500/10 via-slate-900/80 to-slate-950 border border-indigo-500/30 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-6">
              <span className="px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 font-mono font-bold text-xs border border-indigo-500/40">
                ROOM 5: BROADCAST MASTERING RACK
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                7-Stage Mastering & LUFS.
              </h2>
              <p className="text-slate-300 text-sm sm:text-base font-light leading-relaxed">
                Master your records to commercial streaming standards with an ITU-R BS.1770-4 compliant telemetry engine. 7-stage linear phase EQ, multiband harmonic saturation, stereo width imager, and 4x oversampled true peak brickwall limiter.
              </p>

              <div className="space-y-3 font-mono text-xs text-slate-300 pt-1">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Target Presets: Spotify (-14 LUFS), Apple (-16 LUFS), Club (-9 LUFS)</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>4x Oversampled True Peak Metering (±0.05 dBTP)</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Stereo Correlation & Vectorscope Imaging</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onEnterStudio}
                  className="px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-mono font-bold text-xs tracking-wider flex items-center space-x-2 transition cursor-pointer shadow-lg shadow-indigo-500/20"
                >
                  <span>LAUNCH MASTERING SUITE</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mastering Telemetry Mockup */}
            <div className="lg:col-span-6 p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-indigo-300">ITU-R BS.1770-4 LOUDNESS RADAR</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">STREAMING READY</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400">INTEGRATED LUFS</div>
                  <div className="text-xl font-black text-indigo-300">-14.0 LUFS</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400">TRUE PEAK</div>
                  <div className="text-xl font-black text-emerald-400">-0.1 dBTP</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400">STEREO CORR</div>
                  <div className="text-xl font-black text-cyan-400">+0.94</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SPOTLIGHT 5: ROOM 6 — RELEASE & SEEDSIGNATURE PROVENANCE */}
        <section id="release" className="scroll-mt-24 space-y-10">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-purple-500/10 via-slate-900/80 to-slate-950 border border-purple-500/30 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-6">
              <span className="px-3 py-1 rounded-lg bg-purple-500/20 text-purple-300 font-mono font-bold text-xs border border-purple-500/40">
                ROOM 6: RELEASE & COPYRIGHT LEDGER
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                5-Gate Release & SeedSignature.
              </h2>
              <p className="text-slate-300 text-sm sm:text-base font-light leading-relaxed">
                Release your music with mathematical certainty. Pass 5 automated quality gates, sign your immutable WebCrypto SHA-256 authorship certificate, and download lossless 24-bit WAV & FLAC master bundles with split sheets.
              </p>

              <div className="space-y-2.5 font-mono text-xs text-slate-300 pt-1">
                <div className="flex items-center space-x-3">
                  <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>5 Quality Finalization Gates (Clipping, Format, Loudness, Lineage, Consent)</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Unbroken Parent-Child Cryptographic Hash Chain</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Broadcast Delivery Manifest: 24-Bit WAV + Lossless FLAC</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onEnterStudio}
                  className="px-6 py-3 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-mono font-bold text-xs tracking-wider flex items-center space-x-2 transition cursor-pointer shadow-lg shadow-purple-500/20"
                >
                  <span>RELEASE & SIGN MASTER</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-6 p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-purple-300">FINALIZATION QUALITY GATES</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">5/5 PASSED</span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="p-2 rounded bg-slate-900 flex justify-between">
                  <span>Gate 1: Format Integrity (24-bit / 48kHz PCM)</span>
                  <span className="text-emerald-400 font-bold">PASSED</span>
                </div>
                <div className="p-2 rounded bg-slate-900 flex justify-between">
                  <span>Gate 2: True Peak Headroom (&lt; -0.1 dBTP)</span>
                  <span className="text-emerald-400 font-bold">PASSED</span>
                </div>
                <div className="p-2 rounded bg-slate-900 flex justify-between">
                  <span>Gate 3: Target Loudness (-14 LUFS-I ±0.5)</span>
                  <span className="text-emerald-400 font-bold">PASSED</span>
                </div>
                <div className="p-2 rounded bg-slate-900 flex justify-between">
                  <span>Gate 4: SeedSignature Parent-Child Lineage</span>
                  <span className="text-emerald-400 font-bold">LOCKED</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SPOTLIGHT 6: TACTILE WORKSTATION & HARDWARE MIDI INTEGRATION */}
        <section id="hardware-workstation" className="scroll-mt-24 space-y-10">
          <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/90 border border-cyan-500/30 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-6">
              <span className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono font-bold text-xs border border-cyan-500/40">
                HARDWARE INTEGRATION & TRACK WORKSTATION
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                Plug in Your Hardware.
              </h2>
              <p className="text-slate-300 text-sm sm:text-base font-light leading-relaxed">
                Connect external USB MIDI keyboards, drum pads, and hardware synthesizers via WebMIDI with zero driver setup. Shape sound envelopes, filter cutoffs, and dynamic inserts inside the slide-out Track Workstation.
              </p>

              <div className="grid grid-cols-2 gap-3 font-mono text-xs text-slate-300 pt-1">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-bold text-cyan-400">WebMIDI Hub</div>
                  <div className="text-[11px] text-slate-400">Auto-detect controller</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-bold text-cyan-400">Clock Sync</div>
                  <div className="text-[11px] text-slate-400">Sample-accurate timing</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-bold text-cyan-400">Sound Vault Access</div>
                  <div className="text-[11px] text-slate-400">25,000+ sound fonts</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-bold text-cyan-400">Native Studio Brain</div>
                  <div className="text-[11px] text-slate-400">On-device neural sandbox</div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onEnterStudio}
                  className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs tracking-wider flex items-center space-x-2 transition cursor-pointer shadow-lg shadow-cyan-500/20"
                >
                  <span>CONNECT HARDWARE MIDI</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-6 p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-cyan-300">WEBMIDI HARDWARE BUS</span>
                <span className="text-[10px] text-emerald-400 font-bold">● CONNECTED</span>
              </div>
              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center text-slate-300">
                  <span>Akai MPK Mini / USB MIDI</span>
                  <span className="text-[10px] text-cyan-400 font-bold">CH 1 • ACTIVE</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center text-slate-300">
                  <span>Microphone Capture (WebAudio)</span>
                  <span className="text-[10px] text-emerald-400 font-bold">48.0 kHz • LIVE</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center text-slate-300">
                  <span>Native Brain Inference Core</span>
                  <span className="text-[10px] text-purple-400 font-bold">0ms LATENCY</span>
                </div>
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
            <a href="#mix-console" className="hover:text-amber-300 transition">Mix Desk</a>
            <a href="#mastering" className="hover:text-amber-300 transition">Mastering</a>
            <a href="#release" className="hover:text-amber-300 transition">Release</a>
            <a href="#hardware-workstation" className="hover:text-amber-300 transition">Hardware</a>
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
