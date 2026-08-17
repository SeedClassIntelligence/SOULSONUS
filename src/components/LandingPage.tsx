import React from 'react';
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
  Headphones,
  FileText,
  ShieldCheck,
  Flame,
  AudioWaveform,
} from 'lucide-react';

interface LandingPageProps {
  onEnterStudio: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterStudio }) => {
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
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-400" />
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

        <div className="hidden md:flex items-center space-x-6 text-xs font-mono text-slate-400">
          <a href="#philosophy" className="hover:text-amber-300 transition">PHILOSOPHY</a>
          <a href="#modalities" className="hover:text-amber-300 transition">MODALITIES</a>
          <a href="#architecture" className="hover:text-amber-300 transition">SOUL vs SONUS</a>
          <a href="#intelligence" className="hover:text-amber-300 transition">INTELLIGENCE</a>
          <a href="#workspaces" className="hover:text-amber-300 transition">WORKSPACES</a>
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
      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-28 space-y-32">
        {/* HERO SECTION */}
        <section className="text-center space-y-8 pt-8">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>STUDIO BETA ONLINE • ITU-R BS.1770-4 TELEMETRY • BASIC PITCH ONNX</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.08]">
            From what you feel to what the world hears.
          </h1>

          <p className="text-lg sm:text-2xl text-slate-300 max-w-3xl mx-auto font-light leading-relaxed">
            You bring the <strong className="font-semibold text-amber-400">Soul</strong> — the idea, the performance, the instinct, the identity.
            <br className="hidden sm:inline" />
            <span className="text-slate-400">SoulSonus shapes the </span>
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
              href="#philosophy"
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 font-mono font-bold text-xs tracking-wider flex items-center justify-center space-x-2 transition cursor-pointer"
            >
              <span>EXPLORE THE PHILOSOPHY</span>
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
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              The name is the product.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* SOUL Column */}
            <div className="p-8 rounded-3xl bg-gradient-to-b from-amber-500/10 via-slate-900/60 to-slate-950 border border-amber-500/30 shadow-xl space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 text-7xl font-black text-amber-500/5 select-none font-mono">
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
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span>A melody you hear in your head.</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span>A rhythm you tap on your desk.</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span>A lyric cadence you write.</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span>A vocal take you sing.</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span>A beat you bring in.</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span>A production choice only you would make.</span>
                </li>
              </ul>
            </div>

            {/* SONUS Column */}
            <div className="p-8 rounded-3xl bg-gradient-to-b from-cyan-500/10 via-slate-900/60 to-slate-950 border border-cyan-500/30 shadow-xl space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 text-7xl font-black text-cyan-500/5 select-none font-mono">
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
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                  <span>Multi-layer Instrumentation.</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                  <span>Harmonic Arrangement & Progression.</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                  <span>Demucs 4-Stem Acoustic Separation.</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                  <span>Pitch, Harmony & Formant Tuning.</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                  <span>Surgical Dynamic Mixing & EQ.</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                  <span>ITU-R BS.1770-4 Broadcast Mastering.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Punchline Callout */}
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
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
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Start wherever the Soul shows up.
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base font-light">
              SoulSonus can understand each of these as creative source material and carry it forward into editable production.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { icon: <Mic className="w-5 h-5 text-amber-400" />, title: 'Hum it', desc: 'Neural pitch tracking maps sung melodies directly into MIDI.' },
              { icon: <Activity className="w-5 h-5 text-pink-400" />, title: 'Sing it', desc: 'Multi-take vocal comping, pitch-correction & formant DSP.' },
              { icon: <Zap className="w-5 h-5 text-cyan-400" />, title: 'Tap it', desc: 'Body percussion & finger taps mapped to drum transients.' },
              { icon: <Flame className="w-5 h-5 text-amber-400" />, title: 'Beatbox it', desc: 'Dual-band FFT isolates sub-kicks from snare pops.' },
              { icon: <Music className="w-5 h-5 text-purple-400" />, title: 'Play it', desc: 'Connect hardware MIDI keyboards or hardware synths.' },
              { icon: <FileText className="w-5 h-5 text-pink-400" />, title: 'Write it', desc: 'Lyric Cadence Studio with syllable-to-beat synchronization.' },
              { icon: <Headphones className="w-5 h-5 text-blue-400" />, title: 'Record it', desc: 'Studio microphone overdubbing with zero latency.' },
              { icon: <Disc className="w-5 h-5 text-emerald-400" />, title: 'Import it', desc: 'Drop any audio file or beat for 4-stem Demucs extraction.' },
            ].map((m, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition space-y-2.5"
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

        {/* SECTION 4: KEEP THE SOUL. CHANGE THE SONUS. */}
        <section id="architecture" className="scroll-mt-24 space-y-12">
          <div className="text-center space-y-3">
            <div className="text-[11px] font-mono font-black text-purple-400 uppercase tracking-widest">
              NON-DESTRUCTIVE PERFORMANCE PRESERVATION
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
              Keep the Soul. Change the Sonus.
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base font-light">
              Transform any performance into full studio orchestration while preserving your human timing, dynamics, and groove.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Example 1: Hum a Bassline */}
            <div className="p-7 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Mic className="w-4 h-4 text-amber-400" />
                  <span className="font-mono font-bold text-white text-sm">Example: Hum a Bassline</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 uppercase">Voice ➔ 808 Sub</span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="text-amber-400 font-black tracking-wider flex items-center space-x-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>KEEP (THE SOUL):</span>
                  </div>
                  <ul className="space-y-1.5 text-slate-300 pt-1">
                    <li>✓ Melody pitch contour</li>
                    <li>✓ Micro-timing onsets</li>
                    <li>✓ Humanized groove</li>
                    <li>✓ Vocal phrasing & cadence</li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-2">
                  <div className="text-cyan-400 font-black tracking-wider flex items-center space-x-1.5">
                    <Sliders className="w-3.5 h-3.5" />
                    <span>CHANGE (THE SONUS):</span>
                  </div>
                  <ul className="space-y-1.5 text-slate-300 pt-1">
                    <li>⚡ 808 Sub Bass synth</li>
                    <li>⚡ Analog tube saturation</li>
                    <li>⚡ Sidechain compressor</li>
                    <li>⚡ Studio frequency balance</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Example 2: Import a Beat */}
            <div className="p-7 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Disc className="w-4 h-4 text-cyan-400" />
                  <span className="font-mono font-bold text-white text-sm">Example: Import a Beat</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 uppercase">Audio ➔ 4-Stem Multitrack</span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="text-amber-400 font-black tracking-wider flex items-center space-x-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>KEEP (THE SOUL):</span>
                  </div>
                  <ul className="space-y-1.5 text-slate-300 pt-1">
                    <li>✓ Original session tempo</li>
                    <li>✓ Bass bounce & groove</li>
                    <li>✓ Raw vocal take energy</li>
                    <li>✓ Harmonic root progression</li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-2">
                  <div className="text-cyan-400 font-black tracking-wider flex items-center space-x-1.5">
                    <Sliders className="w-3.5 h-3.5" />
                    <span>CHANGE (THE SONUS):</span>
                  </div>
                  <ul className="space-y-1.5 text-slate-300 pt-1">
                    <li>⚡ 4-Bar arrangement</li>
                    <li>⚡ Acoustic Rhodes layers</li>
                    <li>⚡ Genre re-orchestration</li>
                    <li>⚡ Broadcast stereo width</li>
                  </ul>
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
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
              <div className="text-purple-300 font-bold">“Keep my performance. Change the instrument.”</div>
              <div className="text-slate-500 text-[11px]">Preserves exact note events, swaps sound font to Vintage Rhodes.</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
              <div className="text-purple-300 font-bold">“Keep this beat at 94 BPM. Recompose the harmony.”</div>
              <div className="text-slate-500 text-[11px]">Locks drum rhythm, generates complementary C Minor chords.</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
              <div className="text-purple-300 font-bold">“Keep my vocal phrasing. Try a different vocal character.”</div>
              <div className="text-slate-500 text-[11px]">Applies formant shifting and auto-tune without altering timing.</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
              <div className="text-purple-300 font-bold">“Keep the drums. Build the record around them.”</div>
              <div className="text-slate-500 text-[11px]">Anchors the kick and snare, orchestrates synth leads and sub bass.</div>
            </div>
          </div>
        </section>

        {/* SECTION 6: FROM SOUL TO SONUS (6 WORKSPACES) */}
        <section id="workspaces" className="scroll-mt-24 space-y-12">
          <div className="text-center space-y-3">
            <div className="text-[11px] font-mono font-black text-amber-400 uppercase tracking-widest">
              END-TO-END PRODUCTION PIPELINE
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              From Soul to Sonus. One studio.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 font-mono">
            {[
              { room: 'CREATE', label: 'Capture the idea.', color: 'border-amber-500/40 text-amber-300', desc: 'Real-time beatbox, body percussion, and voice pitch capture with dual FFT filters.' },
              { room: 'BUILD', label: 'Give it form.', color: 'border-cyan-500/40 text-cyan-300', desc: '480 PPQ Note Canvas with multi-tool drawing, stretching, splitting, and quantization.' },
              { room: 'WRITE & RECORD', label: 'Give it voice.', color: 'border-pink-500/40 text-pink-300', desc: 'Lyric cadence mapping, multi-take overdub recording, and granular vocal pitch shifting.' },
              { room: 'MIX', label: 'Give it dimension.', color: 'border-emerald-500/40 text-emerald-300', desc: 'Dynamic per-track channel strips with 3-band EQ, FET compression, and spatial sends.' },
              { room: 'MASTER', label: 'Give it finish.', color: 'border-purple-500/40 text-purple-300', desc: 'ITU-R BS.1770-4 telemetry with 4x oversampled true peak and LUFS-I loudness gating.' },
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

        {/* HEROIC CLOSING SECTION */}
        <section className="text-center space-y-8 py-12 border-t border-slate-800">
          <p className="text-2xl sm:text-3xl font-light text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Your <strong className="font-semibold text-amber-400">Soul</strong> was never the part that needed generating.
            <br />
            It needed a studio capable of hearing it.
          </p>

          <div className="space-y-3">
            <div className="text-3xl sm:text-5xl font-black font-mono tracking-wider bg-gradient-to-r from-amber-300 via-white to-cyan-300 bg-clip-text text-transparent">
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
      <footer className="border-t border-slate-800/80 bg-slate-950 py-8 px-6 text-center font-mono text-xs text-slate-500 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>© {new Date().getFullYear()} SOULSONUS • Advanced Creative Intelligence DAW</div>
          <div className="flex items-center space-x-4 text-[11px]">
            <span className="text-amber-400">SOUL: Human Intent</span>
            <span className="text-slate-700">•</span>
            <span className="text-cyan-400">SONUS: Finished Sound</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
