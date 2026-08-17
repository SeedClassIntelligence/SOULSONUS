import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  Mic,
  Activity,
  Music,
  Disc,
  Layers,
  Sliders,
  Radio,
  Lock,
  Cpu,
  Zap,
  CheckCircle2,
  Volume2,
  ChevronRight,
  ChevronDown,
  Headphones,
  FileText,
  ShieldCheck,
  Flame,
  AudioWaveform,
  SlidersHorizontal,
  FolderDown,
  Share2,
  HelpCircle,
} from 'lucide-react';

interface LandingPageProps {
  onEnterStudio: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterStudio }) => {
  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

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
      {/* Dynamic Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 right-10 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-20 left-10 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[140px]" />
      </div>

      {/* Sticky Header Nav */}
      <nav className="sticky top-0 z-50 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-6 py-4 flex items-center justify-between">
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
          <a href="#modalities" className="hover:text-amber-300 transition">MODALITIES</a>
          <a href="#examples" className="hover:text-amber-300 transition">EXAMPLES</a>
          <a href="#intelligence" className="hover:text-amber-300 transition">INTELLIGENCE</a>
          <a href="#how-it-works" className="hover:text-amber-300 transition">HOW IT WORKS</a>
          <a href="#workspaces" className="hover:text-amber-300 transition">WORKSPACES</a>
          <a href="#features" className="hover:text-amber-300 transition">FEATURES</a>
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
            <span>STUDIO BETA LIVE • 480 PPQ SEQUENCER • SPOTIFY BASIC PITCH ONNX • BS.1770-4 MASTERING</span>
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
              href="#examples"
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 font-mono font-bold text-xs tracking-wider flex items-center justify-center space-x-2 transition cursor-pointer"
            >
              <span>SEE REAL EXAMPLES</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </section>

        {/* SECTION 2: THE NAME IS THE PRODUCT (THE CORE DUALITY) */}
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

          {/* Punchline Callout */}
          <div className="p-8 sm:p-10 rounded-3xl bg-slate-900/90 border border-slate-800 text-center space-y-3 shadow-xl">
            <p className="text-xl sm:text-2xl font-bold text-slate-100 max-w-3xl mx-auto leading-snug">
              SoulSonus exists to carry the <span className="text-amber-400">Soul</span> all the way into the <span className="text-cyan-400">Sonus</span> without losing the creator in between.
            </p>
          </div>
        </section>

        {/* SECTION 3: START WHEREVER THE SOUL SHOWS UP */}
        <section id="modalities" className="scroll-mt-24 space-y-12">
          <div className="text-center space-y-3">
            <div className="text-[11px] font-mono font-black text-cyan-400 uppercase tracking-widest">
              CREATIVE ORIGIN MODALITIES
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Start wherever the Soul shows up.
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base font-light">
              SoulSonus understands each of these as authoritative creative source material and carries it forward into editable, multi-track studio production.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { icon: <Mic className="w-5 h-5 text-amber-400" />, title: 'Hum it', desc: 'On-device neural pitch tracking extracts your melody straight into 480 PPQ MIDI notes.' },
              { icon: <Activity className="w-5 h-5 text-pink-400" />, title: 'Sing it', desc: 'Multi-take vocal comp builder, granular pitch shifting & formant transformation.' },
              { icon: <Zap className="w-5 h-5 text-cyan-400" />, title: 'Tap it', desc: 'Body percussion and surface taps detected into calibrated velocity-sensitive transients.' },
              { icon: <Flame className="w-5 h-5 text-orange-400" />, title: 'Beatbox it', desc: 'Dual-band FFT audio engine isolates sub-kick thumps from snappy snare pops.' },
              { icon: <Music className="w-5 h-5 text-purple-400" />, title: 'Play it', desc: 'Plug in any USB MIDI controller or draw notes directly onto the high-res Piano Roll.' },
              { icon: <FileText className="w-5 h-5 text-pink-400" />, title: 'Write it', desc: 'Lyric Cadence Studio maps written lines to 16th-note rhythmic sub-divisions.' },
              { icon: <Headphones className="w-5 h-5 text-blue-400" />, title: 'Record it', desc: 'Zero-latency studio overdubbing with real-time waveform visualization.' },
              { icon: <Disc className="w-5 h-5 text-emerald-400" />, title: 'Import it', desc: 'Import any audio track or beat for instant Demucs 4-stem multitrack extraction.' },
            ].map((m, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition space-y-2.5 shadow-md"
              >
                <div className="p-2.5 rounded-xl bg-slate-950 w-fit border border-slate-800">
                  {m.icon}
                </div>
                <h4 className="font-mono font-bold text-white text-sm">{m.title}.</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 4: KEEP THE SOUL. CHANGE THE SONUS. (6 REAL STUDIO EXAMPLES) */}
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

        {/* SECTION 5: THE INTELLIGENCE UNDERSTANDS THE DIFFERENCE */}
        <section id="intelligence" className="scroll-mt-24 p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-purple-500/15 via-slate-900/80 to-slate-950 border border-purple-500/30 shadow-2xl space-y-8">
          <div className="space-y-3">
            <span className="px-3 py-1 rounded-lg bg-purple-500/20 text-purple-300 font-mono font-bold text-xs border border-purple-500/40">
              BOUNDED CO-PRODUCER DOCTRINE
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              The intelligence understands the difference.
            </h2>
            <p className="text-slate-300 text-sm sm:text-base font-light max-w-3xl leading-relaxed">
              SoulSonus doesn’t assume that every part of a recording is fair game to regenerate.
              The creator defines what carries the <strong className="text-amber-400">Soul</strong> and what may change in the <strong className="text-cyan-400">Sonus</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1 shadow-md">
              <div className="text-purple-300 font-bold">“Keep my performance. Change the instrument.”</div>
              <div className="text-slate-400 text-[11px]">Preserves exact NoteEvents, swaps sound font to Warm Electric Rhodes.</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1 shadow-md">
              <div className="text-purple-300 font-bold">“Keep this beat at 94 BPM. Recompose the harmony.”</div>
              <div className="text-slate-400 text-[11px]">Locks drum rhythm, generates complementary C Minor chords.</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1 shadow-md">
              <div className="text-purple-300 font-bold">“Keep my vocal phrasing. Try a different vocal character.”</div>
              <div className="text-slate-400 text-[11px]">Applies formant shifting and auto-tune without altering timing.</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1 shadow-md">
              <div className="text-purple-300 font-bold">“Keep the drums. Build the record around them.”</div>
              <div className="text-slate-400 text-[11px]">Anchors the kick and snare, orchestrates synth leads and sub bass.</div>
            </div>
          </div>
        </section>

        {/* SECTION 6: HOW IT WORKS (4-STEP PRODUCTION FLOW) */}
        <section id="how-it-works" className="scroll-mt-24 space-y-12">
          <div className="text-center space-y-3">
            <div className="text-[11px] font-mono font-black text-amber-400 uppercase tracking-widest">
              SEAMLESS 4-STEP LIFECYCLE
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              How it works.
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base font-light">
              From the instant a spark enters your mind to an audio master ready for Spotify and Apple Music.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 font-mono">
            {[
              {
                step: '01',
                title: 'Capture Intent',
                badge: 'HUM / TAP / VOCAL',
                desc: 'Perform into your microphone or drag in audio. Real-time dual FFT filters and on-device neural inference isolate your timing and notes immediately.',
              },
              {
                step: '02',
                title: 'Sculpt & Arrange',
                badge: '480 PPQ NOTE ROLL',
                desc: 'Edit notes with Draw, Split, and Stretch tools. Quantize to C Minor or chromatic scales with sub-beat micro-timing accuracy.',
              },
              {
                step: '03',
                title: 'Shape the Sound',
                badge: 'BOUNDED INTELLIGENCE',
                desc: 'Direct the co-producer to orchestrate chords, apply granular pitch shifting, and shape dynamic 3-band channel strip EQs.',
              },
              {
                step: '04',
                title: 'Sign & Export',
                badge: '24-BIT MASTER + FLAC',
                desc: 'Measure ITU-R BS.1770-4 LUFS-I and true peak, hash your copyright SeedSignature, and export lossless 24-bit masters.',
              },
            ].map((st, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-lg relative overflow-hidden"
              >
                <div className="text-4xl font-black text-slate-800 select-none">
                  {st.step}
                </div>
                <div className="text-[10px] font-bold text-amber-400 tracking-wider">
                  {st.badge}
                </div>
                <h4 className="text-base font-bold text-white">{st.title}</h4>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 7: THE 6 ROOM WORKFLOW */}
        <section id="workspaces" className="scroll-mt-24 space-y-12">
          <div className="text-center space-y-3">
            <div className="text-[11px] font-mono font-black text-cyan-400 uppercase tracking-widest">
              THE 6 PRODUCTION ROOMS
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              From Soul to Sonus. One studio.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 font-mono">
            {[
              { room: 'CREATE', label: 'Capture the idea.', color: 'border-amber-500/40 text-amber-300', desc: 'Real-time beatbox, body percussion, and voice pitch capture with dual FFT filters and on-device neural transcription.' },
              { room: 'BUILD', label: 'Give it form.', color: 'border-cyan-500/40 text-cyan-300', desc: '480 PPQ Note Canvas with multi-tool drawing, stretching, splitting, and high-resolution velocity editing.' },
              { room: 'WRITE & RECORD', label: 'Give it voice.', color: 'border-pink-500/40 text-pink-300', desc: 'Lyric cadence mapping, multi-take overdub recording, and granular vocal pitch shifting with formant preservation.' },
              { room: 'MIX', label: 'Give it dimension.', color: 'border-emerald-500/40 text-emerald-300', desc: 'Dynamic per-track channel strips with 3-band EQ, FET compression, reverb/delay sends, and spatial panning.' },
              { room: 'MASTER', label: 'Give it finish.', color: 'border-purple-500/40 text-purple-300', desc: 'ITU-R BS.1770-4 telemetry with 4x oversampled true peak and integrated LUFS loudness compliance.' },
              { room: 'RELEASE', label: 'Give it to the world.', color: 'border-blue-500/40 text-blue-300', desc: 'WebCrypto SHA-256 SeedSignature provenance chain and 24-bit WAV & FLAC master packaging.' },
            ].map((ws, idx) => (
              <div
                key={idx}
                className={`p-6 rounded-3xl bg-slate-900/80 border ${ws.color.split(' ')[0]} space-y-3 shadow-lg`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black tracking-wider ${ws.color.split(' ')[1]}`}>
                    {ws.room}
                  </span>
                  <span className="text-[10px] text-slate-500">ROOM 0{idx + 1}</span>
                </div>
                <h4 className="text-base font-bold text-white">{ws.label}</h4>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">{ws.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 8: CREATOR POWERHOUSE FEATURES */}
        <section id="features" className="scroll-mt-24 space-y-12">
          <div className="text-center space-y-3">
            <div className="text-[11px] font-mono font-black text-amber-400 uppercase tracking-widest">
              EXCLUSIVE CREATOR CAPABILITIES
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              A studio engineered around you.
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base font-light">
              Explore the specialized modules built to empower your unique voice, protect your copyright, and elevate your production.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1: Signature Voice & Style Training */}
            <div className="p-8 rounded-3xl bg-slate-900/90 border border-amber-500/30 space-y-5 shadow-2xl flex flex-col justify-between relative overflow-hidden">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold text-amber-400 tracking-wider">E13 SIGNATURE PILLARS</span>
                  <h3 className="text-xl font-bold text-white">Train Your Voice & Style</h3>
                </div>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">
                  Train a personalized neural voice profile and playing style model. Blend timbres, adjust formant profiles, and preserve your unique acoustic signature across all future records with verified biometric consent.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-amber-300 flex items-center justify-between">
                <span>✦ Voice Cloning Lab</span>
                <span>Protected Identity</span>
              </div>
            </div>

            {/* Feature 2: Songwriting Suite & Lyric Cadence */}
            <div className="p-8 rounded-3xl bg-slate-900/90 border border-pink-500/30 space-y-5 shadow-2xl flex flex-col justify-between relative overflow-hidden">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-2xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400">
                  <Mic className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold text-pink-400 tracking-wider">VOCAL BOOTH & CADENCE</span>
                  <h3 className="text-xl font-bold text-white">Songwriting Suite</h3>
                </div>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">
                  Synchronize your lyrics directly to 16th-note sub-beat musical grids. Multi-take overdub recording, seamless vocal comp building, scale-locked auto-tuning, and diatonic 3-part vocal harmony generation.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-pink-300 flex items-center justify-between">
                <span>✦ Lyric Cadence Grid</span>
                <span>Comp Builder</span>
              </div>
            </div>

            {/* Feature 3: Native Studio Brain */}
            <div className="p-8 rounded-3xl bg-slate-900/90 border border-purple-500/30 space-y-5 shadow-2xl flex flex-col justify-between relative overflow-hidden">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold text-purple-400 tracking-wider">ON-DEVICE REASONING</span>
                  <h3 className="text-xl font-bold text-white">Native Studio Brain</h3>
                </div>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">
                  A bounded studio co-producer running 100% locally in your browser. Analyzes track keys, drum grooves, and chord tensions to propose harmonic arrangements, fills, and mix enhancements without sending audio to external clouds.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-purple-300 flex items-center justify-between">
                <span>✦ Local Neural Sandbox</span>
                <span>Zero Latency</span>
              </div>
            </div>

            {/* Feature 4: Creative Resource Vault */}
            <div className="p-8 rounded-3xl bg-slate-900/90 border border-emerald-500/30 space-y-5 shadow-2xl flex flex-col justify-between relative overflow-hidden">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Disc className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold text-emerald-400 tracking-wider">25,000+ CURATED ASSETS</span>
                  <h3 className="text-xl font-bold text-white">Sound Vault & Dataset Registry</h3>
                </div>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">
                  Access studio sound fonts, analog 808s, vintage electric Rhodes, acoustic drum sets, and synth presets. Filter by zero-shot semantic prompts with complete transparency into ethical licensing and attribution.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-emerald-300 flex items-center justify-between">
                <span>✦ Open-Source Vault</span>
                <span>100% Royalty Free</span>
              </div>
            </div>

            {/* Feature 5: SeedSignature IP Provenance */}
            <div className="p-8 rounded-3xl bg-slate-900/90 border border-blue-500/30 space-y-5 shadow-2xl flex flex-col justify-between relative overflow-hidden">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold text-blue-400 tracking-wider">WEBCRYPTO SHA-256</span>
                  <h3 className="text-xl font-bold text-white">SeedSignature IP Protection</h3>
                </div>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">
                  Every beatbox performance, hummed melody, and vocal take is cryptographically signed before any processing occurs. Establishes an unbroken, mathematically verifiable proof of human authorship for copyright and publishing.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-blue-300 flex items-center justify-between">
                <span>✦ Cryptographic Ledger</span>
                <span>Split Sheets Ready</span>
              </div>
            </div>

            {/* Feature 6: Demucs 4-Stem Acoustic Separation */}
            <div className="p-8 rounded-3xl bg-slate-900/90 border border-cyan-500/30 space-y-5 shadow-2xl flex flex-col justify-between relative overflow-hidden">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold text-cyan-400 tracking-wider">DEMUCS V4 NEURAL SPLIT</span>
                  <h3 className="text-xl font-bold text-white">4-Stem Multitrack Extraction</h3>
                </div>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">
                  Drop any stereo mix, legacy beat, or live recording to isolate Vocals, Drums, Bass, and Other instruments into separate editable tracks with on-device neural transcription into 480 PPQ MIDI notes.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-cyan-300 flex items-center justify-between">
                <span>✦ Stems + MIDI Isolation</span>
                <span>Instant Remixing</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 9: PRODUCER FAQ ACCORDION */}
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
            <a href="#examples" className="hover:text-amber-300 transition">Examples</a>
            <a href="#how-it-works" className="hover:text-amber-300 transition">How It Works</a>
            <a href="#features" className="hover:text-amber-300 transition">Features</a>
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
