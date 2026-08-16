import React, { useState } from 'react';
import {
  X,
  Mic,
  Activity,
  Repeat,
  Radio,
  Disc,
  Sparkles,
  Search,
  BookOpen,
  Sliders,
  Layers,
  Music,
  ShieldCheck,
  Zap,
  Volume2,
  Wand2,
  FolderLock,
  Keyboard,
  ArrowRight,
  HelpCircle,
  Play,
  CheckCircle2,
  Clock,
  Compass,
  FileCheck,
  Share2,
  Download,
} from 'lucide-react';

interface QuickHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ManualSection {
  id: string;
  category: 'ROOMS' | 'TRIGGERS' | 'TRAINING_VOICE' | 'MIX_MASTER' | 'COMMANDS' | 'SHORTCUTS';
  title: string;
  badge: string;
  summary: string;
  steps: string[];
  tips: string;
}

const MANUAL_ARTICLES: ManualSection[] = [
  // 1. SIX STUDIO ROOMS
  {
    id: 'room_create',
    category: 'ROOMS',
    title: 'Room 1: CREATE (Idea Capture & Groove)',
    badge: 'ROOM 1',
    summary: 'The primary ideation workstation. Mouth your beatbox rhythms or hum melodic motifs directly into the 64-step grid.',
    steps: [
      'Click ENABLE MIC (or press M) in the top transport header.',
      'Make a low "Boom" sound for the Kick, a sharp "Pff" pop for the Snare, and a crisp "Tss" for the Hi-Hat.',
      'Hum or whistle a melody to trigger the polyphonic synth or cello in real time.',
      'Click on any of the 16 step boxes per bar to tweak or draw note triggers manually.',
    ],
    tips: 'Use "Clone Bar 1 to All" to instantly turn a 1-bar beatbox groove into a full 4-bar loop.',
  },
  {
    id: 'room_build',
    category: 'ROOMS',
    title: 'Room 2: BUILD (Arrangement & Sections)',
    badge: 'ROOM 2',
    summary: 'Structure your beat into a complete full-length song arrangement across Intro, Verse, Chorus, Bridge, and Outro blocks.',
    steps: [
      'Organize song blocks along the arrangement timeline.',
      'Assign energy levels (Low, Medium, High, Climax) to each section.',
      'Duplicate, reorder, or mute track stems per section (e.g. drop the drums during the Verse).',
      'Preview seamless cross-section loop transitions.',
    ],
    tips: 'Click on any arrangement block to scope the DAW playback loop to that exact section.',
  },
  {
    id: 'room_write_record',
    category: 'ROOMS',
    title: 'Room 3: WRITE & RECORD (Vocal Suite & Comping)',
    badge: 'ROOM 3',
    summary: 'The complete songwriting and vocal recording suite. Write lyrics with cadence mapping, record live takes, and build perfect comps.',
    steps: [
      'Open Sub-Tab 1 (Lyrics & Cadence) to write song lyrics and mark syllable dynamic accents.',
      'Open Sub-Tab 2 & 4 to record live mic takes and punch-in overdubs.',
      'Open Sub-Tab 3 (Comp Builder) to audition phrases across multiple takes and assemble the master vocal lane.',
      'Open Sub-Tab 5 & 8 to apply C-Minor scale pitch correction, formant shifts, and the vocal DSP chain.',
    ],
    tips: 'Use Sub-Tab 7 (Voice Identity) to synthesize singing performances in your cloned voice!',
  },
  {
    id: 'room_mix',
    category: 'ROOMS',
    title: 'Room 4: MIX (32-Channel Console & Routing)',
    badge: 'ROOM 4',
    summary: 'Professional multi-bus mixing console with dedicated Drums, Bass, Music, Vocals, FX, and Master buses.',
    steps: [
      'Balance levels with high-precision faders (-inf to +6dB) and pan knobs.',
      'Engage Solo (S), Mute (M), or Dim (-20dB) on individual channels or sub-mix buses.',
      'Insert Linear Phase EQ, 1176 FET Compressor, Dynamic De-Esser, or Studio Reverb.',
      'Use Reference Track A/B Comparison to compare your mix against a commercial target in real time.',
      'Click "Print Mix Snapshot" to freeze and lock an approved mix stage.',
    ],
    tips: 'Sub-mix your drum layers into the Drums Bus to apply punchy bus glue compression across the entire kit.',
  },
  {
    id: 'room_master',
    category: 'ROOMS',
    title: 'Room 5: MASTER (Broadcast Mastering & ITU LUFS)',
    badge: 'ROOM 5',
    summary: 'Final broadcast mastering suite engineered for Spotify, Apple Music, and vinyl loudness compliance.',
    steps: [
      'Monitor Integrated LUFS (Target: -14.0 LUFS-I) and True Peak (Ceiling: -1.0 dBTP).',
      'Shape tonal balance with the 5-band Linear Phase Mastering EQ.',
      'Engage Multi-Band Stereo Imaging to keep sub frequencies (<120Hz) strictly mono while widening high air (>6kHz).',
      'Audition multiple mastering candidate profiles (Streaming Balanced, Warm Vinyl, Club Heavy).',
    ],
    tips: 'Ensure the True-Peak safety limiter ceiling is set to -1.0 dBTP to avoid inter-sample clipping on streaming services.',
  },
  {
    id: 'room_release',
    category: 'ROOMS',
    title: 'Room 6: RELEASE (Finalization & Multi-Format Export)',
    badge: 'ROOM 6',
    summary: 'Lock project governance, verify collaborator split sheets, inspect the provenance graph, and export master audio.',
    steps: [
      'Check the 5 Finalization Gates (Mix Printed, LUFS Validated, Splits Signed, Seed Signed, Provenance Sealed).',
      'Verify 100% collaborator ownership split sheet.',
      'Inspect the Asset Lineage Graph tracing every track back to its original mouth beatbox / hum seed.',
      'Click "Lock Project & Seal Master SeedSignature" to compute the immutable SHA-256 master signature.',
      'Export master packages in 24-bit/48kHz WAV, 24-bit/44.1kHz WAV, Lossless FLAC, 320kbps MP3, and Individual Stems.',
    ],
    tips: 'The exported ZIP includes full cryptographic JSON provenance guaranteeing 100% creator ownership.',
  },

  // 2. TRIGGERING SOUNDS
  {
    id: 'trig_mic',
    category: 'TRIGGERS',
    title: 'Trigger Method 1: Live Voice & Beatbox Mic',
    badge: 'CORE INNOVATION',
    summary: 'Turn your voice into any instrument in real time without touching a keyboard or mouse.',
    steps: [
      'Press M (or click the MIC button in the top transport).',
      'Mouth "Boom" ➔ Triggers Track 1 Kick / 808.',
      'Mouth "Pff / Pop" ➔ Triggers Track 2 Snare / Clap.',
      'Mouth "Tss / Tap" ➔ Triggers Track 3 Hi-Hat.',
      'Hum or sing notes ➔ Triggers Track 4 Melody / Cello / Rhodes at exact detected pitch.',
      'Press RECORD (●) + PLAY (▶) to write your mouth performance directly into the grid.',
    ],
    tips: 'Calibrate your microphone sensitivity in TRAIN SIGNATURE for zero false triggers.',
  },
  {
    id: 'trig_grid',
    category: 'TRIGGERS',
    title: 'Trigger Method 2: The 16/64-Step Sequencer Grid',
    badge: 'DAW CANVAS',
    summary: 'Manual step sequencing for precise drum groove programming.',
    steps: [
      'Look at the 16 step boxes on each track row.',
      'Click Step 1, 5, 9, 13 on the Kick track for four-on-the-floor.',
      'Click Step 5, 13 on the Snare track for backbeat snaps.',
      'Click any step to toggle notes ON/OFF.',
      'Press SPACEBAR to start playback and watch the playhead trigger notes in real time.',
    ],
    tips: 'Use the bar view selector (Bar 1, Bar 2, Bar 3, Bar 4, or ALL) to edit 64-step variations.',
  },
  {
    id: 'trig_vault',
    category: 'TRIGGERS',
    title: 'Trigger Method 3: Global Sound Vault Audition',
    badge: 'SOUND VAULT',
    summary: 'Browse and audition over 25,000+ open-source instruments, 808s, soundfonts, and synths.',
    steps: [
      'Click SOUND VAULT in the top header.',
      'Search in natural language (e.g. "punchy acoustic snare", "vintage rhodes", "solo cello").',
      'Click the ▶ Play button on any row to audition through Web Audio.',
      'Click "LOAD TO TRACK" to assign that sound to Track 1, 2, 3, or 4.',
    ],
    tips: 'Natural language search is powered by LAION CLAP 512-dimensional semantic embeddings.',
  },
  {
    id: 'trig_midi',
    category: 'TRIGGERS',
    title: 'Trigger Method 4: USB / MIDI Hardware Keyboards',
    badge: 'HARDWARE MIDI',
    summary: 'Connect any physical MIDI keyboard or drum pad for live tactile playing.',
    steps: [
      'Click the MIDI / HARDWARE button in the top bar to open the MIDI Drawer.',
      'Connect your USB keyboard (auto-detected via Web MIDI API).',
      'Select any track (e.g. Rhodes or Cello) and play keys with velocity sensitivity.',
    ],
    tips: 'SpessaSynth SoundFonts dynamically trigger brighter acoustic velocity layers when you strike keys harder.',
  },

  // 3. TRAINING & VOICE CLONING
  {
    id: 'train_pillars',
    category: 'TRAINING_VOICE',
    title: 'Creator Training & The 7 Signature Pillars (E13)',
    badge: 'TRAIN SIGNATURE',
    summary: 'Teach SoulSonus your personal creative vocabulary, mouth gestures, pocket tendencies, and sound bank.',
    steps: [
      'Click TRAIN SIGNATURE in the top header.',
      'Pillar 1: Calibrate 8 drum & body percussion categories (Kick, Snare, Hat, Chest Thump, Snap, Throat Bass).',
      'Pillar 2: Calibrate your vocal register (Baritone, Tenor, Soprano) and record a 4-second pitch glide.',
      'Pillar 3: Record 5 phonetic vowels [AH, EE, IH, OH, OO] to map your throat and formant acoustics.',
      'Pillar 4: Set automatic octave transposition for humming basslines vs whistling leads.',
      'Pillar 5: Dial in your natural groove swing % and pocket placement (Pushed, Dead Center, Laid-back).',
      'Pillar 6: Teach custom slang words ("beefier", "make that knock", "dirty", "warmer").',
      'Pillar 7: Cryptographically seal your profile with an immutable E14 SeedSignature.',
    ],
    tips: 'All raw audio recordings are automatically preserved in your R09 Creator Sound Vault.',
  },
  {
    id: 'train_voice_cloning',
    category: 'TRAINING_VOICE',
    title: 'Voice Cloning Lab & Lyric-to-Singing Synthesis',
    badge: 'VOICE CLONING',
    summary: 'Clone your singing voice and render full vocal performances from written lyrics.',
    steps: [
      'Click VOICE CLONE in the top header (or Tab 2 in Training Studio).',
      'Choose your voice model (My Lead Singing Voice, My Gritty Hook Voice, My Airy Falsetto).',
      'Type or paste your lyrics into the box.',
      'Adjust Timbre Blend (0-100%), Formant Shift (-12 to +12 st), and Breathiness (0-100%).',
      'Click "SYNTHESIZE & COMMIT SUNG VOCAL TAKE" to render your cloned voice directly onto the vocal track!',
    ],
    tips: 'Your cloned voice is protected by cryptographic consent token #PROOF_AUTH_01 under E16 Governance.',
  },

  // 4. NATURAL LANGUAGE COMMANDS
  {
    id: 'commands_dock',
    category: 'COMMANDS',
    title: 'Natural Language Commands & Intent Vocabulary',
    badge: 'SOULSONUS INTELLIGENCE',
    summary: 'Speak or type natural musical requests without tweaking technical plugin parameters.',
    steps: [
      'Open the SoulSonus Intelligence Dock at the bottom.',
      'Type or speak requests like: "make this kick beefier", "turn my hum into cello", "give it more bounce", "make that knock".',
      'SoulSonus analyzes your request and generates a non-destructive Provisional Candidate Card.',
      'Click AUDITION to preview the proposed change.',
      'Click ACCEPT to atomically commit the change to your track with full SeedSignature provenance.',
    ],
    tips: 'SoulSonus never overrides your tracks without your audition and explicit approval.',
  },

  // 5. SHORTCUTS
  {
    id: 'shortcuts_ref',
    category: 'SHORTCUTS',
    title: 'Master Studio Keyboard Shortcuts',
    badge: 'CHEATSHEET',
    summary: 'High-speed keyboard commands for effortless studio navigation and workflow.',
    steps: [
      'SPACEBAR ➔ Play / Pause Master Transport',
      'M ➔ Toggle Live Microphone Input',
      'R ➔ Toggle Live Performance Recording',
      '1, 2, 3, 4, 5, 6 ➔ Switch Studio Rooms (1:Create, 2:Build, 3:Write, 4:Mix, 5:Master, 6:Release)',
      'CTRL + Z ➔ Undo Last Action',
      'CTRL + Y ➔ Redo Action',
      'ESCAPE ➔ Close any open drawer or modal',
    ],
    tips: 'Keep your hands on the keyboard for lightning-fast beatmaking.',
  },
];

export const QuickHelpModal: React.FC<QuickHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [activeCategory, setActiveCategory] = useState<
    'ALL' | 'ROOMS' | 'TRIGGERS' | 'TRAINING_VOICE' | 'MIX_MASTER' | 'COMMANDS' | 'SHORTCUTS'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticleId, setSelectedArticleId] = useState<string>('room_create');

  const filteredArticles = MANUAL_ARTICLES.filter((art) => {
    const matchesCategory = activeCategory === 'ALL' || art.category === activeCategory;
    const matchesQuery =
      searchQuery.trim() === '' ||
      art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.steps.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesQuery;
  });

  const currentArticle = MANUAL_ARTICLES.find((a) => a.id === selectedArticleId) || filteredArticles[0] || MANUAL_ARTICLES[0];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 md:p-6 select-none font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full h-[90vh] shadow-2xl relative text-slate-100 flex flex-col justify-between overflow-hidden">
        {/* Top Header */}
        <div className="p-4 md:px-6 border-b border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-black tracking-tight text-white uppercase font-mono">
                  SOULSONUS MASTER STUDIO MANUAL & RESOURCE CENTER
                </h2>
                <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-500/30 font-mono">
                  COMPLETE CREATOR GUIDE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Never guess a process. Interactive workflows, trigger guides, voice cloning, and mixing manuals.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="p-3 md:px-6 border-b border-slate-800/80 bg-slate-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search studio manual (e.g. 'how to clone voice', 'how to trigger kick', 'mixing bus')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Category Ribbon */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono font-bold">
            {[
              { key: 'ALL', label: 'All Manuals' },
              { key: 'ROOMS', label: '6 Studio Rooms' },
              { key: 'TRIGGERS', label: 'Triggering Sounds' },
              { key: 'TRAINING_VOICE', label: 'Training & Voice Cloning' },
              { key: 'COMMANDS', label: 'Voice Commands' },
              { key: 'SHORTCUTS', label: 'Shortcuts' },
            ].map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key as any)}
                className={`px-2.5 py-1.5 rounded-lg border transition cursor-pointer whitespace-nowrap ${
                  activeCategory === cat.key
                    ? 'bg-amber-500 text-slate-950 border-amber-500 font-black'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Two-Column Manual Explorer */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden font-mono text-xs">
          {/* Left Column: Article Index */}
          <div className="w-full md:w-[320px] lg:w-[360px] border-r border-slate-800/80 bg-slate-950/60 overflow-y-auto p-3 space-y-2 custom-scrollbar shrink-0">
            <div className="text-[10px] text-slate-500 uppercase font-bold px-1">
              Articles ({filteredArticles.length})
            </div>

            {filteredArticles.map((art) => {
              const isSelected = art.id === currentArticle.id;
              return (
                <div
                  key={art.id}
                  onClick={() => setSelectedArticleId(art.id)}
                  className={`p-3 rounded-xl border transition cursor-pointer space-y-1 ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/60 text-white shadow-md'
                      : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-amber-300 border border-slate-700 font-bold">
                      {art.badge}
                    </span>
                    <span className="text-[9px] text-slate-500">{art.category}</span>
                  </div>
                  <div className="font-bold text-xs text-white">{art.title}</div>
                  <p className="text-[10px] text-slate-400 line-clamp-2">{art.summary}</p>
                </div>
              );
            })}
          </div>

          {/* Right Column: Full Article Display */}
          <div className="flex-1 overflow-y-auto p-5 md:p-7 custom-scrollbar space-y-5 bg-slate-900/40">
            {currentArticle ? (
              <div className="space-y-5 max-w-3xl">
                {/* Article Header */}
                <div className="space-y-2 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {currentArticle.badge}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase">• {currentArticle.category} GUIDE</span>
                  </div>
                  <h1 className="text-lg md:text-xl font-black text-white">{currentArticle.title}</h1>
                  <p className="text-xs text-slate-300 font-sans leading-relaxed">{currentArticle.summary}</p>
                </div>

                {/* Step-by-Step Instructions */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-amber-400 uppercase flex items-center gap-2">
                    <Compass className="w-4 h-4" />
                    <span>How to Execute This Step-by-Step</span>
                  </h3>

                  <div className="space-y-2">
                    {currentArticle.steps.map((step, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 flex items-start gap-3"
                      >
                        <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </div>
                        <div className="text-xs text-slate-200 leading-relaxed font-sans mt-0.5">{step}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pro Tip Box */}
                {currentArticle.tips && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-amber-300 font-mono">PRO TIP:</span>
                      <p className="text-xs text-slate-300 font-sans mt-0.5">{currentArticle.tips}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">
                No manual found matching your search. Try another query.
              </div>
            )}
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="p-3 md:px-6 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs font-mono shrink-0">
          <div className="flex items-center gap-2 text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>SoulSonus v1.5 Studio Operating System • Press [ESC] to return to DAW</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-md shadow-amber-500/20"
          >
            CLOSE MANUAL & RETURN TO DAW
          </button>
        </div>
      </div>
    </div>
  );
};
