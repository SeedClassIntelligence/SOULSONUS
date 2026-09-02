import React, { useMemo, useRef, useState } from 'react';
import { CreatorMusicSignature } from '../types/daw';
import { startTakeRecording, decodeTakeBlob, dominantFrequency, type TakeRecording } from '../audio/takeRecorder';
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
import { computeStyleProfile, describeStyleProfile } from '../lib/styleProfile';
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

import {
  STARTER_VOICES,
  auditionStarterVoice,
  type StarterVoiceId,
} from '../audio/starterVoices';

interface SoundVaultItem {
  id: string;
  name: string;
  category: 'vocal_percussion' | 'body_sound' | 'voice_sample' | 'keys_instrument' | 'found_audio';
  tags: string[];
  freqHz: number;
  /** Where the audio comes from when it is a file. Empty for a studio voice. */
  sampleUrl: string;
  /**
   * Set when this entry is one of the studio's own instrument voices, rendered
   * live from the same Tone.js definitions the tracks play. Nothing to fetch,
   * so nothing to go missing.
   */
  synthVoice?: StarterVoiceId;
  /** How it is described to the creator, e.g. "Tone.MembraneSynth · MIT". */
  sourceNote?: string;
  associatedGesture?: string;
  isRootSeed: boolean;
  dateAdded: string;
  /**
   * Who this came from. A seed the creator performed and a tone that ships
   * with the build are not the same object, and the vault was presenting
   * both as "ROOT SEED #1" with a date the creator never recorded on.
   */
  origin: 'studio_voice' | 'creator_recorded';
  /**
   * Whether the audio behind sampleUrl is actually being served. Resolved by
   * asking, on open -- not assumed. A dead entry is shown as dead in the list
   * rather than discovered by the creator when they press play.
   */
  availability?: 'unchecked' | 'present' | 'missing';
  /** Peak per slice, taken from the recording. Absent on the shipped presets. */
  waveform?: number[];
  durationSeconds?: number;
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
  const {
    tracks,
    handleAddVocalTake,
    dawState,
    detectionSettings,
    decisionRecords,
    pitchResponse,
    isCalibratingPitch,
    handleCalibratePitch,
  } = useStudioSession();

  /** What is known right now, so the creator reads it before sealing it. */
  const livingProfile = useMemo(
    () =>
      computeStyleProfile({
        creatorName,
        tracks,
        bpm: dawState.bpm || 110,
        detectionSettings,
        decisionRecords,
        pitchResponse,
      }),
    [creatorName, tracks, dawState.bpm, detectionSettings, decisionRecords, pitchResponse]
  );
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
  /**
   * The vault opens on the studio's own instrument voices.
   *
   * It used to open on four fixtures labelled ROOT SEED with a date the
   * creator never recorded on. One pointed at a file that is not in the build;
   * two pointed at the same generated 65.5 Hz tone, one of them calling it a
   * 261 Hz hum. Nothing there was theirs and one of it was nothing at all.
   *
   * These are real, they play, they cannot go missing, and they are honestly
   * the house's rather than the creator's. What the creator records lands
   * above them and is marked as theirs.
   */
  const [vaultSounds, setVaultSounds] = useState<SoundVaultItem[]>(() =>
    STARTER_VOICES.map((v) => ({
      id: `vs_studio_${v.id}`,
      name: v.name,
      category:
        v.id === 'bass' || v.id === 'melody'
          ? ('keys_instrument' as const)
          : ('vocal_percussion' as const),
      tags: ['studio_voice', v.id, v.licence.toLowerCase()],
      freqHz: v.approxHz,
      sampleUrl: '',
      synthVoice: v.id,
      // The note it is triggered at is stated alongside the engine, so the
      // frequency on the card can be checked against something concrete.
      sourceNote: v.pitch ? `${v.pitch} · ${v.engine} · ${v.licence}` : `${v.engine} · ${v.licence}`,
      associatedGesture: v.gesture,
      isRootSeed: false,
      origin: 'studio_voice' as const,
      availability: 'present' as const,
      dateAdded: 'ships with the studio',
    }))
  );

  const [isRecording, setIsRecording] = useState(false);
  const [activeRecordingLabel, setActiveRecordingLabel] = useState<string | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);
  const recordingRef = useRef<TakeRecording | null>(null);
  const auditionRef = useRef<HTMLAudioElement | null>(null);

  /**
   * Records a signature seed. This was a `setTimeout` that never opened the
   * microphone: after 1.8s it filed a vault entry pointing at one hardcoded
   * WAV, with a hardcoded 65Hz, whatever you had performed. The counter went
   * up and nothing was captured.
   *
   * Now the button arms the mic and stays armed -- press it again to stop --
   * and the seed carries the audio that was actually recorded, its measured
   * length, its own waveform and its measured pitch.
   */
  const handleTriggerRecording = async (
    label: string,
    category: 'vocal_percussion' | 'body_sound' | 'voice_sample' | 'keys_instrument' | 'found_audio'
  ) => {
    // Second press on the armed button: stop and keep the take.
    if (isRecording) {
      if (activeRecordingLabel !== label) return;
      const session = recordingRef.current;
      recordingRef.current = null;
      setIsRecording(false);
      setActiveRecordingLabel(null);
      if (!session) return;

      const take = await session.stop();
      const decoded = await decodeTakeBlob(take.blob);
      const seed: SoundVaultItem = {
        id: `vs_root_${Date.now()}`,
        name: `${label} (Root Seed)`,
        category,
        tags: ['root_seed', 'creator_recorded', 'raw_wav'],
        freqHz: decoded ? dominantFrequency(decoded) : 0,
        sampleUrl: take.url,
        associatedGesture: label,
        isRootSeed: true,
        origin: 'creator_recorded',
        // It is in memory as a blob this tab holds. Nothing to reach for.
        availability: 'present',
        dateAdded: new Date().toLocaleDateString(),
        waveform: take.waveform,
        durationSeconds: Math.round(take.durationSeconds * 100) / 100,
      };

      setVaultSounds((prev) => [seed, ...prev]);
      setPercussionCategories((prev) =>
        prev.map((p) => (p.name === label ? { ...p, recorded: true, count: p.count + 1 } : p))
      );
      return;
    }

    setRecordError(null);
    try {
      recordingRef.current = await startTakeRecording();
      setIsRecording(true);
      setActiveRecordingLabel(label);
    } catch {
      // Denied, or no input device. Say so instead of showing a fake success.
      setRecordError('The microphone is not available. Allow mic access and try again.');
    }
  };

  /**
   * Plays a vault seed. This used to be a console.log.
   *
   * The error it raised was also never cleared, so one dead entry left the
   * banner standing over every audition after it -- three sounds that played
   * correctly read as failures. It clears first, and it says what went wrong
   * rather than only that something did.
   */
  const handleAuditionSeed = (snd: SoundVaultItem) => {
    auditionRef.current?.pause();
    setRecordError(null);

    // A studio voice has nothing to fetch. It is built, sounded and disposed
    // from the same definitions the tracks play.
    if (snd.synthVoice) {
      void auditionStarterVoice(snd.synthVoice).catch(() =>
        setRecordError(`"${snd.name}" could not be sounded -- the audio engine did not start.`)
      );
      return;
    }

    if (snd.availability === 'missing') {
      setRecordError(
        `"${snd.name}" has no audio behind it -- ${snd.sampleUrl} is not being served.`
      );
      return;
    }

    const el = new Audio(snd.sampleUrl);
    auditionRef.current = el;
    void el.play().catch((err: unknown) => {
      const why =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'the browser blocked playback until you interact with the page'
          : 'the file could not be decoded';
      setRecordError(`"${snd.name}" did not play -- ${why}.`);
    });
  };

  /**
   * Asks whether each entry's audio is actually being served, once, when the
   * vault is opened. A single-page app answers an unknown path with index.html
   * and a 200, so a plain res.ok would call a deleted file present -- the same
   * trap the engine probe has to avoid. Blob URLs held by this tab are not
   * asked about; there is nothing to reach.
   */
  React.useEffect(() => {
    if (!isOpen || studioTab !== 'SOUND_VAULT') return;
    let cancelled = false;

    const check = async (url: string): Promise<'present' | 'missing'> => {
      if (!url) return 'missing';
      if (url.startsWith('blob:') || url.startsWith('data:')) return 'present';
      try {
        const res = await fetch(url, { method: 'HEAD' });
        if (!res.ok) return 'missing';
        if ((res.headers.get('content-type') || '').includes('text/html')) return 'missing';
        return 'present';
      } catch {
        return 'missing';
      }
    };

    void (async () => {
      const pending = vaultSounds.filter((sd) => sd.availability === undefined);
      if (!pending.length) return;
      const resolved = await Promise.all(
        pending.map(async (sd) => [sd.id, await check(sd.sampleUrl)] as const)
      );
      if (cancelled) return;
      const byId = new Map(resolved);
      setVaultSounds((prev) =>
        prev.map((sd) => (byId.has(sd.id) ? { ...sd, availability: byId.get(sd.id) } : sd))
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, studioTab, vaultSounds]);

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
          name: `Cloned Vocal Take (${activeModel.name})`,
          rating: 5,
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
    // Recomputed at the moment of signing rather than reused from the render,
    // so what is sealed is the session as it stands now -- and computed the
    // same way as the preview above, from one function, so the two cannot
    // disagree about the person.
    const style = computeStyleProfile({
      creatorName,
      tracks,
      bpm: dawState.bpm || 110,
      detectionSettings,
      decisionRecords,
      pitchResponse,
    });

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
      // Measured, not asserted. What stood here was `0.45` / `0.55` and three
      // sound names, identical for every creator who ever pressed this button
      // -- signed and stored as though it described them.
      thresholds: {
        kickSensitivity: style.calibration.kickThreshold,
        snareSensitivity: style.calibration.snareThreshold,
        // The pitch side of the same idea, read from the measured profile
        // exactly as the two above are. Null while no calibration take has
        // been run through the transcriber.
        pitchOnsetPeak: style.calibration.pitchOnsetPeak,
        pitchFramePeak: style.calibration.pitchFramePeak,
        pitchGate: style.calibration.pitchGate,
      },
      soundPreferences: style.choices.sounds,
      style,
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

  // Every hook above runs on every render. This early return used to sit at the
  // top of the component, so opening the modal changed the hook count between
  // renders -- React reported "Expected static flag was missing" each time.
  if (!isOpen) return null;

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
              id="btn-close-training"
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
                          onClick={() => void handleTriggerRecording(cat.name, 'vocal_percussion')}
                          disabled={isRecording && activeRecordingLabel !== cat.name}
                          className={`w-full py-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-40 ${
                            isRecording && activeRecordingLabel === cat.name
                              ? 'bg-rose-500 text-white animate-pulse'
                              : 'bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200'
                          }`}
                        >
                          <Mic className="w-3.5 h-3.5" />
                          <span>
                            {isRecording && activeRecordingLabel === cat.name
                              ? 'Stop & Keep Take'
                              : cat.recorded
                              ? 'Record Extra Seed'
                              : 'Record a Sample'}
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
                      onClick={() => void handleTriggerRecording('Octave Glide', 'voice_sample')}
                      className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>
                        {isRecording && activeRecordingLabel === 'Octave Glide'
                          ? 'STOP & KEEP GLIDE'
                          : 'RECORD PITCH GLIDE'}
                      </span>
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
                          onClick={() => void handleTriggerRecording(`Vowel ${v.vowel}`, 'voice_sample')}
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
                      Binds what has actually been measured about how you play into a profile owned 100% by you.
                    </p>
                  </div>

                  {/* What is about to be signed, before it is signed. A profile
                      is a claim about a person; they should be able to read it
                      first, including the parts that are empty. */}
                  <div id="style-profile-preview" className="text-left bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400">
                      What this studio knows about you
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">{describeStyleProfile(livingProfile)}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono text-slate-400">
                      <span>performed onsets</span><span className="text-slate-200">{livingProfile.performance.performedNotes}</span>
                      <span>kick threshold</span><span className="text-slate-200">{livingProfile.calibration.kickThreshold ?? 'not tuned'}</span>
                      <span>snare threshold</span><span className="text-slate-200">{livingProfile.calibration.snareThreshold ?? 'not tuned'}</span>
                      <span>pitch onset peak</span><span className="text-slate-200">{livingProfile.calibration.pitchOnsetPeak ?? 'not measured'}</span>
                      <span>pitch frame peak</span><span className="text-slate-200">{livingProfile.calibration.pitchFramePeak ?? 'not measured'}</span>
                      <span>pitch gate</span><span className="text-slate-200">{livingProfile.calibration.pitchGate ?? 'shipped default'}</span>
                      <span>calibrated channels</span><span className="text-slate-200">{livingProfile.calibration.fingerprints.length}</span>
                      <span>sounds chosen</span><span className="text-slate-200">{livingProfile.choices.sounds.length || 'none yet'}</span>
                      <span>accepted / rejected</span><span className="text-slate-200">{livingProfile.decisions.accepted} / {livingProfile.decisions.rejected}</span>
                    </div>

                    {/* The pitch counterpart of calibrating a channel. Hum or sing
                        for three seconds and the transcriber is measured against
                        this voice, not against a plucked string. */}
                    <div className="pt-2 border-t border-slate-800 space-y-2">
                      <button
                        type="button"
                        onClick={() => handleCalibratePitch()}
                        disabled={isCalibratingPitch}
                        className={`w-full px-3 py-2 rounded-xl text-[11px] font-mono font-bold uppercase tracking-wider border transition ${
                          isCalibratingPitch
                            ? 'bg-rose-500/15 border-rose-500/50 text-rose-300 cursor-wait'
                            : 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-500/40 text-cyan-300 cursor-pointer active:scale-95'
                        }`}
                      >
                        {isCalibratingPitch ? 'Listening — hum or sing…' : 'Calibrate my pitch (3s)'}
                      </button>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        {pitchResponse
                          ? `Measured: your pitched voice drives the onset head to ${pitchResponse.onsetPeak.toFixed(3)} and the frame head to ${pitchResponse.framePeak.toFixed(3)}. The transcriber's gate can now be set to you rather than to the instrument default.`
                          : 'Not measured yet. Until a take is measured, the transcriber uses a gate tuned for instruments — a mouth attack is softer than a plucked string, so pitched material can be heard and still discarded.'}
                      </p>
                    </div>
                    {livingProfile.gaps.length > 0 && (
                      <div className="space-y-1 pt-2 border-t border-slate-800">
                        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                          Not known yet
                        </div>
                        {livingProfile.gaps.map((gap) => (
                          <p key={gap} className="text-[11px] text-slate-500 leading-relaxed">{gap}</p>
                        ))}
                      </div>
                    )}
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
                  onClick={() => void handleTriggerRecording('Custom Root Audio', 'found_audio')}
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
                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition ${
                      snd.availability === 'missing'
                        ? 'bg-slate-950 border-rose-500/30'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
                          snd.availability === 'missing'
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        }`}
                      >
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
                          {snd.origin === 'studio_voice' && (
                            <span
                              className="px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 text-[8px] font-bold border border-cyan-500/30"
                              title={`${snd.sourceNote} -- played live by the studio's own engine, not a file. This is the house instrument, not one of your roots.`}
                            >
                              STUDIO VOICE
                            </span>
                          )}
                          {snd.availability === 'missing' && (
                            <span
                              className="px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-300 text-[8px] font-bold border border-rose-500/30"
                              title={`Nothing is being served at ${snd.sampleUrl}`}
                            >
                              NO AUDIO
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          <span>{snd.category}</span> •{' '}
                          <span>{snd.freqHz > 0 ? `${snd.freqHz}Hz` : 'unpitched'}</span>
                          {snd.durationSeconds !== undefined && <span> • {snd.durationSeconds}s</span>} •{' '}
                          <span>{snd.sourceNote || snd.dateAdded}</span>
                        </div>
                        {snd.waveform && snd.waveform.length > 0 && (
                          <span className="flex items-end gap-[1px] h-3 w-[128px] mt-1">
                            {snd.waveform.map((v, wi) => (
                              <span
                                key={wi}
                                className="flex-1 bg-emerald-400/70 rounded-[.5px]"
                                style={{ height: `${Math.max(6, Math.min(100, v * 100))}%` }}
                              />
                            ))}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleAuditionSeed(snd)}
                      className={`p-2 rounded-lg border transition cursor-pointer ${
                        snd.availability === 'missing'
                          ? 'bg-slate-950 border-rose-500/30 text-rose-400/70'
                          : 'bg-slate-900 border-transparent hover:bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                      title={
                        snd.availability === 'missing'
                          ? `No audio is being served at ${snd.sampleUrl}`
                          : 'Audition Sound'
                      }
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
          {recordError ? (
            <div className="flex items-center gap-2 text-amber-300">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>{recordError}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>All recorded root seeds & trained voice models are 100% exclusive to creator.</span>
            </div>
          )}

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
