import React, { useState } from 'react';
import { CreatorMusicSignature } from '../types/daw';
import {
  X,
  Mic,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Sliders,
  Volume2,
  FolderLock,
  Plus,
  Play,
  Check,
  Zap,
  Activity,
  Music,
  Lock,
  Tag,
  Wand2,
  Layers,
  Radio,
  FileCheck,
  Disc,
  Flame,
  Clock,
  VolumeX,
} from 'lucide-react';
import { signatureService } from '../lib/seedSignature';
import { useStudioSession } from '../app/StudioSessionContext';

interface PersonalTrainingModalProps {
  isOpen?: boolean;
  creatorName?: string;
  onClose: () => void;
  onSaveSignature?: (signature: CreatorMusicSignature) => void;
  tracks?: any[];
  calibratingTrackId?: string | null;
  onCalibrateTrack?: (trackId: string) => void;
  initialTab?: 'TRAINING_PILLARS' | 'VOICE_CLONING_LAB' | 'SOUND_VAULT';
}

interface SoundVaultItem {
  id: string;
  name: string;
  category: 'vocal_percussion' | 'body_sound' | 'voice_sample' | 'keys_instrument' | 'found_audio';
  tags: string[];
  freqHz: number;
  sampleUrl: string;
  associatedGesture?: string;
  isRootSeed: boolean;
  dateAdded: string;
}

interface VoiceCharacterModel {
  id: string;
  name: string;
  register: string;
  timbreProfile: string;
  samplesCount: number;
  consentProofId: string;
  isTrained: boolean;
}

export const PersonalTrainingModal: React.FC<PersonalTrainingModalProps> = ({
  isOpen = true,
  creatorName = 'SoulSonus Master Creator',
  onClose,
  onSaveSignature,
  initialTab = 'TRAINING_PILLARS',
}) => {
  if (!isOpen) return null;

  const { tracks, handleAddVocalTake } = useStudioSession();
  const vocalTrack = tracks.find((t) => t.instrument === 'vocal_synth' || t.id === 't-vocal') || tracks[0];

  // Top-Level Studio Navigation Tabs
  const [studioTab, setStudioTab] = useState<'TRAINING_PILLARS' | 'VOICE_CLONING_LAB' | 'SOUND_VAULT'>(initialTab);

  React.useEffect(() => {
    if (initialTab) setStudioTab(initialTab);
  }, [initialTab]);

  // Pillar 1-7 Navigation
  const [activePillar, setActivePillar] = useState<number>(1);

  // -------------------------------------------------------------
  // PILLAR 1: MULTI-CATEGORY VOCAL & BODY PERCUSSION
  // -------------------------------------------------------------
  const [percussionCategories, setPercussionCategories] = useState([
    { id: 'p_kick', name: 'Mouth Kick / Sub Thump', gesture: 'Deep "Boom" Mouth Thump', freq: '55-90 Hz', recorded: true, count: 4 },
    { id: 'p_snare', name: 'Lip Snare / Beatbox Pop', gesture: 'Sharp "Pff" Lip Pop', freq: '220-1.8k Hz', recorded: true, count: 3 },
    { id: 'p_hihat', name: 'Tongue Hi-Hat / Tss', gesture: 'Crisp "Tss" Tongue Tap', freq: '6k-12k Hz', recorded: true, count: 6 },
    { id: 'p_chest', name: 'Chest Thump / Body Sub', gesture: 'Physical Fist-to-Chest Thump', freq: '45-75 Hz', recorded: false, count: 0 },
    { id: 'p_clap', name: 'Hand Clap / Finger Snap', gesture: 'Acoustic Palm Snap', freq: '1.2k-3.5k Hz', recorded: true, count: 2 },
    { id: 'p_throat', name: 'Throat Bass / 808 Growl', gesture: 'Low Throat Vibration & Hum', freq: '35-65 Hz', recorded: false, count: 0 },
    { id: 'p_rim', name: 'Vocal Rimshot / Click', gesture: 'Cheek Pop & Tongue Click', freq: '800-2.4k Hz', recorded: false, count: 0 },
    { id: 'p_breath', name: 'Breath / Shaker Sizzle', gesture: 'Rhythmic Inhale/Exhale Pulse', freq: '4k-9k Hz', recorded: false, count: 0 },
  ]);

  // -------------------------------------------------------------
  // PILLAR 2: VOCAL RANGE, REGISTER & PITCH GLIDES
  // -------------------------------------------------------------
  const [vocalRegister, setVocalRegister] = useState<'Bass' | 'Baritone' | 'Tenor' | 'Alto' | 'Mezzo' | 'Soprano'>('Baritone');
  const [lowestNote, setLowestNote] = useState('C2 (65.4 Hz)');
  const [highestNote, setHighestNote] = useState('G4 (392.0 Hz)');
  const [falsettoCeiling, setFalsettoCeiling] = useState('D5 (587.3 Hz)');
  const [vibratoRateHz, setVibratoRateHz] = useState(5.4);

  // -------------------------------------------------------------
  // PILLAR 3 / VOICE CLONING LAB: MULTI-CHARACTER MODELS
  // -------------------------------------------------------------
  const [voiceModels, setVoiceModels] = useState<VoiceCharacterModel[]>([
    {
      id: 'vm_lead_natural',
      name: 'My Lead Singing Voice',
      register: 'Baritone / Tenor Blend',
      timbreProfile: 'Warm, dynamic, authentic personal resonance',
      samplesCount: 8,
      consentProofId: 'PROOF_AUTH_LEAD_01',
      isTrained: true,
    },
    {
      id: 'vm_gritty_hook',
      name: 'My Gritty / Saturated Hook Voice',
      register: 'Chest Compression',
      timbreProfile: 'Raspy harmonics with tube warmth',
      samplesCount: 5,
      consentProofId: 'PROOF_AUTH_GRIT_02',
      isTrained: true,
    },
    {
      id: 'vm_airy_falsetto',
      name: 'My Airy Falsetto & Adlibs',
      register: 'Head Voice / Aspiration',
      timbreProfile: 'High breathiness with subtle formant lift',
      samplesCount: 3,
      consentProofId: 'PROOF_AUTH_AIR_03',
      isTrained: false,
    },
  ]);

  const [selectedVoiceModelId, setSelectedVoiceModelId] = useState('vm_lead_natural');
  const [phoneticVowels, setPhoneticVowels] = useState([
    { vowel: 'AH (as in Father)', freqPeak: '800 Hz', recorded: true },
    { vowel: 'EE (as in See)', freqPeak: '2.4 kHz', recorded: true },
    { vowel: 'IH (as in Bit)', freqPeak: '1.9 kHz', recorded: true },
    { vowel: 'OH (as in Go)', freqPeak: '500 Hz', recorded: true },
    { vowel: 'OO (as in Boot)', freqPeak: '300 Hz', recorded: false },
  ]);

  // Voice Synthesis Controls
  const [synthesisLyrics, setSynthesisLyrics] = useState(
    'Late night in the city, neon reflections on the rain\nHeartbeat in the rhythm, breaking through the pain'
  );
  const [timbreBlend, setTimbreBlend] = useState(100);
  const [formantShift, setFormantShift] = useState(0);
  const [breathiness, setBreathiness] = useState(25);
  const [isSynthesizingVoice, setIsSynthesizingVoice] = useState(false);
  const [synthesisSuccess, setSynthesisSuccess] = useState(false);

  // -------------------------------------------------------------
  // PILLAR 4 & 5: RHYTHM, SWING & POCKET
  // -------------------------------------------------------------
  const [swingAmount, setSwingAmount] = useState(58);
  const [pocketTendency, setPocketTendency] = useState<'PUSHED' | 'DEAD_CENTER' | 'LAID_BACK'>('LAID_BACK');
  const [accentDynamics, setAccentDynamics] = useState('Heavy Downbeat Accents with Ghost Notes');

  // -------------------------------------------------------------
  // PILLAR 6: COMMAND VOCABULARY
  // -------------------------------------------------------------
  const [vocabularyDictionary, setVocabularyDictionary] = useState<Record<string, string>>({
    'beefier': 'Add +3dB 60Hz Sub Low-End & Soft Saturation',
    'make that knock': 'Boost 120Hz transient attack & 2.5kHz snap',
    'warmer': 'Cut 6kHz harshness, boost 400Hz body with tape warmth',
    'give it more bounce': 'Apply 62% swing & syncopate 16th-note off-beats',
    'dirty': 'Tube distortion + analog clipper on mid-frequencies',
    'airy': 'High-shelf boost @ 12kHz with subtle chorus spread',
    'crushed': '8-bit sample reduction with 4:1 compression punch',
  });
  const [newPhraseKey, setNewPhraseKey] = useState('');
  const [newPhraseAction, setNewPhraseAction] = useState('');

  // -------------------------------------------------------------
  // R09 SOUND VAULT & ROOT CREATIVITY SEEDS
  // -------------------------------------------------------------
  const [vaultFilter, setVaultFilter] = useState<'ALL' | 'VOCAL' | 'BODY' | 'KEYS' | 'FOUND'>('ALL');
  const [vaultSounds, setVaultSounds] = useState<SoundVaultItem[]>([
    {
      id: 'vs_01',
      name: 'Mouth Kick Root Seed #1',
      category: 'vocal_percussion',
      tags: ['root_seed', 'mouth_kick', 'raw_wav', '58hz'],
      freqHz: 58,
      sampleUrl: '/audio/realization/realization_kick_cand_ace_1.wav',
      associatedGesture: 'Deep "Boom" Mouth Thump',
      isRootSeed: true,
      dateAdded: '2026-08-15',
    },
    {
      id: 'vs_02',
      name: 'Lip Snare Crack Root Seed #2',
      category: 'vocal_percussion',
      tags: ['root_seed', 'lip_pop', 'snare_snap'],
      freqHz: 1240,
      sampleUrl: '/audio/stems/drum_layer_snare_1786815776569.wav',
      associatedGesture: 'Sharp "Pff" Lip Pop',
      isRootSeed: true,
      dateAdded: '2026-08-15',
    },
    {
      id: 'vs_03',
      name: 'Chest Thump Acoustic Sub #1',
      category: 'body_sound',
      tags: ['body_percussion', 'chest_sub', 'organic'],
      freqHz: 52,
      sampleUrl: '/audio/realization/realization_bass_cand_ace_1786813844336.wav',
      associatedGesture: 'Physical Fist-to-Chest Thump',
      isRootSeed: true,
      dateAdded: '2026-08-15',
    },
    {
      id: 'vs_04',
      name: 'Late Night Hum C Minor Lead',
      category: 'voice_sample',
      tags: ['hum', 'verse_lead', 'c_minor', 'root_seed'],
      freqHz: 261,
      sampleUrl: '/audio/realization/realization_bass_cand_ace_1786813844336.wav',
      associatedGesture: 'Throat Hum C3-G4',
      isRootSeed: true,
      dateAdded: '2026-08-15',
    },
  ]);

  // Live Recording Simulator
  const [isRecording, setIsRecording] = useState(false);
  const [activeRecordingLabel, setActiveRecordingLabel] = useState<string | null>(null);

  const handleTriggerRecording = (
    label: string,
    category: 'vocal_percussion' | 'body_sound' | 'voice_sample' | 'keys_instrument' | 'found_audio'
  ) => {
    setIsRecording(true);
    setActiveRecordingLabel(label);

    setTimeout(() => {
      setIsRecording(false);
      setActiveRecordingLabel(null);

      // 1. Auto-save raw root creativity seed to R09 Vault
      const newSeedItem: SoundVaultItem = {
        id: `vs_root_${Date.now()}`,
        name: `${label} (Root Seed)`,
        category,
        tags: ['root_seed', 'creator_recorded', 'raw_wav'],
        freqHz: 65,
        sampleUrl: '/audio/realization/realization_bass_cand_ace_1786813844336.wav',
        associatedGesture: label,
        isRootSeed: true,
        dateAdded: new Date().toLocaleDateString(),
      };

      setVaultSounds((prev) => [newSeedItem, ...prev]);

      // 2. Update category counter
      setPercussionCategories((prev) =>
        prev.map((p) => (p.name === label ? { ...p, recorded: true, count: p.count + 1 } : p))
      );
    }, 1800);
  };

  const handleSynthesizeSingingTake = () => {
    if (!synthesisLyrics.trim()) return;
    setIsSynthesizingVoice(true);
    setSynthesisSuccess(false);

    setTimeout(() => {
      setIsSynthesizingVoice(false);
      setSynthesisSuccess(true);

      const activeModel = voiceModels.find((v) => v.id === selectedVoiceModelId) || voiceModels[0];

      // Add real synthetic vocal take to DAW track
      if (vocalTrack) {
        handleAddVocalTake(vocalTrack.id, {
          takeName: `Cloned Vocal Take (${activeModel.name})`,
          type: 'SYNTHETIC_CLONE',
          isCompCandidate: true,
          rating: 5,
          color: '#ec4899',
        });
      }
    }, 2200);
  };

  const handleAddCustomVocabulary = () => {
    if (!newPhraseKey.trim() || !newPhraseAction.trim()) return;
    setVocabularyDictionary((prev) => ({
      ...prev,
      [newPhraseKey.trim().toLowerCase()]: newPhraseAction.trim(),
    }));
    setNewPhraseKey('');
    setNewPhraseAction('');
  };

  const handleSaveSignature = async () => {
    const rawSig: CreatorMusicSignature = {
      id: `sig_creator_${Date.now()}`,
      creatorId: `user_${creatorName.toLowerCase().replace(/\s+/g, '_')}`,
      creatorName,
      version: 'v1.5.0-master-profile',
      createdDate: new Date().toLocaleDateString(),
      dictionary: {
        kickMouthSound: percussionCategories[0].gesture,
        snarePopSound: percussionCategories[1].gesture,
        hihatTssSound: percussionCategories[2].gesture,
        vocalPitchRange: `${vocalRegister}: ${lowestNote} to ${highestNote}`,
      },
      thresholds: {
        kickSensitivity: 0.45,
        snareSensitivity: 0.55,
      },
      soundPreferences: ['Fat 808 Sub', 'Crisp Acoustic Snare', 'Custom Root Seeds'],
      signatureHash: 'pending',
    };

    const sigRecord = await signatureService.createSeedSignatureRecord(
      rawSig.id,
      'training_profile',
      creatorName,
      rawSig
    );
    rawSig.signatureHash = sigRecord.hash;

    if (onSaveSignature) onSaveSignature(rawSig);
    onClose();
  };

  const filteredVaultSounds = vaultSounds.filter((s) => {
    if (vaultFilter === 'ALL') return true;
    if (vaultFilter === 'VOCAL') return s.category === 'vocal_percussion';
    if (vaultFilter === 'BODY') return s.category === 'body_sound';
    if (vaultFilter === 'KEYS') return s.category === 'keys_instrument';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 md:p-6 select-none font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full h-[90vh] shadow-2xl relative text-slate-100 flex flex-col justify-between overflow-hidden">
        
        {/* TOP SHELL HEADER */}
        <div className="p-4 md:px-6 border-b border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-black tracking-tight text-white uppercase font-mono">
                  CREATOR TRAINING & MY SOUNDS STUDIO
                </h2>
                <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-500/30 font-mono">
                  E13 + R09 + VOICE CLONING
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                “I'm not training AI to replace my creativity. I'm training my studio to understand my creativity.”
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Top Workspace Tab Switcher */}
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono font-bold">
              <button
                onClick={() => setStudioTab('TRAINING_PILLARS')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  studioTab === 'TRAINING_PILLARS'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>1. SIGNATURE TRAINING</span>
              </button>

              <button
                onClick={() => setStudioTab('VOICE_CLONING_LAB')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  studioTab === 'VOICE_CLONING_LAB'
                    ? 'bg-pink-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>2. VOICE CLONING & SINGING</span>
              </button>

              <button
                onClick={() => setStudioTab('SOUND_VAULT')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  studioTab === 'SOUND_VAULT'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FolderLock className="w-3.5 h-3.5" />
                <span>3. R09 MY SOUNDS & ROOTS ({vaultSounds.length})</span>
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* WORKSPACE INTERIOR */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar text-xs font-mono">
          
          {/* TAB 1: E13 SIGNATURE TRAINING PILLARS */}
          {studioTab === 'TRAINING_PILLARS' && (
            <div className="space-y-5">
              {/* 7 Pillar Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {[
                  { num: 1, label: '1. Vocal & Body Drums' },
                  { num: 2, label: '2. Register & Range' },
                  { num: 3, label: '3. Voice Character' },
                  { num: 4, label: '4. Whistle & Hum' },
                  { num: 5, label: '5. Rhythm & Pocket' },
                  { num: 6, label: '6. Command Vocab' },
                  { num: 7, label: '7. Seed Lock' },
                ].map((pill) => (
                  <button
                    key={pill.num}
                    onClick={() => setActivePillar(pill.num)}
                    className={`p-2.5 rounded-xl border text-center font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      activePillar === pill.num
                        ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-md shadow-amber-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{pill.label}</span>
                  </button>
                ))}
              </div>

              {/* PILLAR 1: VOCAL & BODY PERCUSSION BANK */}
              {activePillar === 1 && (
                <div className="space-y-4 bg-slate-950/70 border border-slate-800 rounded-2xl p-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-sm font-black text-white uppercase flex items-center gap-2">
                        <Disc className="w-4 h-4 text-amber-400" />
                        <span>Vocal Percussion & Physical Body Sounds Bank</span>
                      </h3>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Train SoulSonus on your mouth beats, chest thumps, snaps, and mouth clicks. Raw seeds are saved to R09.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                      {percussionCategories.filter((c) => c.recorded).length} / {percussionCategories.length} Categories Calibrated
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {percussionCategories.map((cat) => (
                      <div
                        key={cat.id}
                        className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-3 hover:border-slate-700 transition"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-xs">{cat.name}</span>
                            {cat.recorded && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                          </div>
                          <div className="text-[10px] text-amber-300 font-mono mt-1">“{cat.gesture}”</div>
                          <div className="text-[9px] text-slate-500 mt-0.5">Frequency: {cat.freq} • Samples: {cat.count}</div>
                        </div>

                        <button
                          onClick={() => handleTriggerRecording(cat.name, 'vocal_percussion')}
                          disabled={isRecording}
                          className={`w-full py-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer ${
                            isRecording && activeRecordingLabel === cat.name
                              ? 'bg-amber-400 text-slate-950 animate-pulse'
                              : 'bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200'
                          }`}
                        >
                          <Mic className="w-3.5 h-3.5" />
                          <span>
                            {isRecording && activeRecordingLabel === cat.name
                              ? 'Recording Live...'
                              : cat.recorded
                              ? 'Record Extra Seed'
                              : 'Record 3 Samples'}
                          </span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PILLAR 2: REGISTER & PITCH GLIDES */}
              {activePillar === 2 && (
                <div className="space-y-4 bg-slate-950/70 border border-slate-800 rounded-2xl p-5">
                  <div className="border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-black text-white uppercase flex items-center gap-2">
                      <Music className="w-4 h-4 text-cyan-400" />
                      <span>Vocal Register, Pitch Span & Octave Boundaries</span>
                    </h3>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Calibrate how high and low you naturally sing or hum. SoulSonus auto-transposes instruments to match your register.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <span className="text-[10px] text-slate-400 uppercase">Primary Vocal Register:</span>
                      <select
                        value={vocalRegister}
                        onChange={(e: any) => setVocalRegister(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-cyan-300 font-bold text-xs"
                      >
                        <option value="Bass">Bass (E2 - E4)</option>
                        <option value="Baritone">Baritone (A2 - A4)</option>
                        <option value="Tenor">Tenor (C3 - C5)</option>
                        <option value="Alto">Alto (F3 - F5)</option>
                        <option value="Mezzo">Mezzo-Soprano (A3 - A5)</option>
                        <option value="Soprano">Soprano (C4 - C6)</option>
                      </select>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <span className="text-[10px] text-slate-400 uppercase">Lowest Natural Note:</span>
                      <input
                        type="text"
                        value={lowestNote}
                        onChange={(e) => setLowestNote(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono text-xs"
                      />
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <span className="text-[10px] text-slate-400 uppercase">Highest Chest / Belt Note:</span>
                      <input
                        type="text"
                        value={highestNote}
                        onChange={(e) => setHighestNote(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Record Smooth Pitch Glide Calibration</div>
                      <p className="text-[10px] text-slate-400">Glide from your lowest chest note up to your highest falsetto note over 4 seconds.</p>
                    </div>
                    <button
                      onClick={() => handleTriggerRecording('Octave Glide', 'voice_sample')}
                      className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>{isRecording ? 'Listening to Glide...' : 'RECORD 4s PITCH GLIDE'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* PILLAR 3: VOICE CHARACTER & PHONETIC VOWELS */}
              {activePillar === 3 && (
                <div className="space-y-4 bg-slate-950/70 border border-slate-800 rounded-2xl p-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-sm font-black text-white uppercase flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-pink-400" />
                        <span>Phonetic Vowels & Timbre Resonance</span>
                      </h3>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Record 5 sustained vowels so the synthesis engine reproduces your exact throat, nasal, and lip acoustics.
                      </p>
                    </div>
                    <button
                      onClick={() => setStudioTab('VOICE_CLONING_LAB')}
                      className="px-3 py-1.5 rounded-lg bg-pink-500/20 text-pink-300 border border-pink-500/40 text-xs font-bold hover:bg-pink-500 hover:text-slate-950 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Open Full Voice Cloning Lab →</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                    {phoneticVowels.map((v, i) => (
                      <div key={v.vowel} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-2">
                        <div className="text-xs font-bold text-white">{v.vowel}</div>
                        <div className="text-[10px] text-pink-300 font-mono">{v.freqPeak}</div>
                        <button
                          onClick={() => handleTriggerRecording(`Vowel ${v.vowel}`, 'voice_sample')}
                          className={`w-full py-1.5 rounded text-[10px] font-bold transition cursor-pointer ${
                            v.recorded ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-300 hover:bg-pink-500 hover:text-slate-950'
                          }`}
                        >
                          {v.recorded ? '✓ Re-Record' : 'Record 2s'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PILLAR 5: RHYTHM & POCKET */}
              {activePillar === 5 && (
                <div className="space-y-4 bg-slate-950/70 border border-slate-800 rounded-2xl p-5">
                  <div className="border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-black text-white uppercase flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      <span>Rhythm Profile, MPC Swing & Pocket Latency</span>
                    </h3>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Learn your natural groove swing and micro-timing tendencies (e.g. laid-back in the pocket).
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Groove Swing Percentage:</span>
                        <span className="text-emerald-300 font-bold">{swingAmount}% (MPC / Dilla Pocket)</span>
                      </div>
                      <input
                        type="range"
                        min={50}
                        max={75}
                        value={swingAmount}
                        onChange={(e) => setSwingAmount(Number(e.target.value))}
                        className="w-full accent-emerald-500 h-2 bg-slate-950 rounded cursor-pointer"
                      />
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                      <span className="text-slate-400 text-xs">Pocket Placement Tendency:</span>
                      <div className="grid grid-cols-3 gap-2 text-[10px] font-bold">
                        {(['PUSHED', 'DEAD_CENTER', 'LAID_BACK'] as const).map((p) => (
                          <button
                            key={p}
                            onClick={() => setPocketTendency(p)}
                            className={`p-2 rounded-lg border transition cursor-pointer ${
                              pocketTendency === p
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {p.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PILLAR 6: COMMAND VOCABULARY */}
              {activePillar === 6 && (
                <div className="space-y-4 bg-slate-950/70 border border-slate-800 rounded-2xl p-5">
                  <div className="border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-black text-white uppercase flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>Custom Command Vocabulary & Intent Dictionary</span>
                    </h3>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Teach SoulSonus what you mean when you speak natural creative requests during production.
                    </p>
                  </div>

                  {/* Add New Phrase */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap gap-2 items-center">
                    <input
                      type="text"
                      placeholder='Phrase (e.g. "make it crunch")...'
                      value={newPhraseKey}
                      onChange={(e) => setNewPhraseKey(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono flex-1 min-w-[150px]"
                    />
                    <input
                      type="text"
                      placeholder='Action (e.g. "+4dB drive on 1.5kHz")...'
                      value={newPhraseAction}
                      onChange={(e) => setNewPhraseAction(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono flex-1 min-w-[200px]"
                    />
                    <button
                      onClick={handleAddCustomVocabulary}
                      className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Mapping</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries(vocabularyDictionary).map(([phrase, action]) => (
                      <div key={phrase} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1">
                        <span className="text-amber-300 font-bold text-xs">“{phrase}”</span>
                        <span className="text-slate-400 text-[11px]">→ {action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PILLAR 7: SEED LOCK & EXPORT */}
              {activePillar === 7 && (
                <div className="space-y-4 bg-slate-950/70 border border-slate-800 rounded-2xl p-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-400 mx-auto flex items-center justify-center shadow-lg shadow-purple-500/20">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase font-mono">
                      Seed Lock & E14 Cryptographic Signature Seal
                    </h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                      Binds all 7 training pillars and your raw root seed audio into an immutable SHA-256 profile owned 100% by you.
                    </p>
                  </div>
                  <button
                    onClick={handleSaveSignature}
                    className="px-8 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs font-mono transition cursor-pointer shadow-xl shadow-purple-600/30"
                  >
                    LOCK & SEAL MASTER CREATOR SIGNATURE™
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VOICE CLONING & SINGING SYNTHESIS LAB */}
          {studioTab === 'VOICE_CLONING_LAB' && (
            <div className="space-y-5">
              {/* Voice Models List */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {voiceModels.map((vm) => {
                  const isSelected = selectedVoiceModelId === vm.id;
                  return (
                    <div
                      key={vm.id}
                      onClick={() => setSelectedVoiceModelId(vm.id)}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                        isSelected
                          ? 'bg-slate-900 border-pink-500 ring-1 ring-pink-500/50 shadow-xl'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs">{vm.name}</span>
                          {isSelected && <Check className="w-4 h-4 text-pink-400 stroke-[3]" />}
                        </div>
                        <div className="text-[10px] text-pink-300 font-mono mt-1">{vm.register}</div>
                        <p className="text-[10px] text-slate-400 mt-1">{vm.timbreProfile}</p>
                      </div>

                      <div className="flex items-center justify-between text-[9px] pt-2 border-t border-slate-800 font-mono">
                        <span className="text-slate-400">{vm.samplesCount} Training Samples</span>
                        <span className="text-emerald-400 font-bold">#{vm.consentProofId}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Singing Synthesis from Written Lyrics */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-pink-400" />
                      <span>Synthesize Singing Performance from Written Lyrics</span>
                    </h3>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      SoulSonus renders a vocal performance sung in your cloned voice and drops it directly onto the vocal take stack.
                    </p>
                  </div>
                  <span className="text-slate-400 font-mono text-[10px]">C Minor • 110 BPM</span>
                </div>

                <textarea
                  rows={3}
                  value={synthesisLyrics}
                  onChange={(e) => setSynthesisLyrics(e.target.value)}
                  placeholder="Enter lyrics for your cloned voice to sing..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-pink-500 resize-none"
                />

                {/* Synthesis Sculpting Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Timbre Identity Blend:</span>
                      <span className="text-pink-300 font-bold">{timbreBlend}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={timbreBlend}
                      onChange={(e) => setTimbreBlend(Number(e.target.value))}
                      className="w-full accent-pink-500 h-1.5 bg-slate-950 rounded cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Formant Shift:</span>
                      <span className="text-pink-300 font-bold">{formantShift > 0 ? `+${formantShift}` : formantShift} st</span>
                    </div>
                    <input
                      type="range"
                      min={-12}
                      max={12}
                      value={formantShift}
                      onChange={(e) => setFormantShift(Number(e.target.value))}
                      className="w-full accent-pink-500 h-1.5 bg-slate-950 rounded cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Acoustic Breathiness:</span>
                      <span className="text-pink-300 font-bold">{breathiness}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={breathiness}
                      onChange={(e) => setBreathiness(Number(e.target.value))}
                      className="w-full accent-pink-500 h-1.5 bg-slate-950 rounded cursor-pointer"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSynthesizeSingingTake}
                  disabled={isSynthesizingVoice || !synthesisLyrics.trim()}
                  className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg ${
                    isSynthesizingVoice
                      ? 'bg-pink-400 text-slate-950 animate-pulse'
                      : synthesisSuccess
                      ? 'bg-emerald-600 text-white'
                      : 'bg-pink-600 hover:bg-pink-500 text-white shadow-pink-600/30'
                  }`}
                >
                  <Wand2 className="w-4 h-4" />
                  <span>
                    {isSynthesizingVoice
                      ? 'Synthesizing Vocals with Cloned Voice Model...'
                      : synthesisSuccess
                      ? '✓ Vocal Take Rendered & Placed on Track!'
                      : 'SYNTHESIZE & COMMIT SUNG VOCAL TAKE'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: R09 CREATOR SOUND VAULT ("MY SOUNDS & ROOTS") */}
          {studioTab === 'SOUND_VAULT' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  {(['ALL', 'VOCAL', 'BODY', 'KEYS'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setVaultFilter(filter)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono transition cursor-pointer ${
                        vaultFilter === filter
                          ? 'bg-emerald-500 text-slate-950 font-black'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {filter} SOUNDS
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handleTriggerRecording('Custom Root Audio', 'found_audio')}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>RECORD NEW ROOT SEED</span>
                </button>
              </div>

              {/* Sounds List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredVaultSounds.map((snd) => (
                  <div
                    key={snd.id}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <Volume2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs flex items-center gap-2">
                          <span>{snd.name}</span>
                          {snd.isRootSeed && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[8px] font-bold border border-amber-500/30">
                              ROOT SEED
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          <span>{snd.category}</span> • <span>Freq: {snd.freqHz}Hz</span> • <span>{snd.dateAdded}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => console.log('Auditioning vault sound', snd.sampleUrl)}
                      className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
                      title="Audition Sound"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="p-3 md:px-6 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs font-mono shrink-0">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>All recorded root seeds & trained voice models are 100% exclusive to creator.</span>
          </div>

          <button
            onClick={handleSaveSignature}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-md shadow-amber-500/20"
          >
            SAVE & CLOSE STUDIO
          </button>
        </div>
      </div>
    </div>
  );
};
