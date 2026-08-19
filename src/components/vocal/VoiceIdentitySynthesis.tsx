import React, { useState, useEffect, useRef } from 'react';
import { Track, VoiceIdentitySettings, VocalCharacterType } from '../../types/daw';
import { useStudioSession } from '../../app/StudioSessionContext';
import {
  auditionVoiceCharacter,
  isPlayableAudioSource,
  CHARACTER_PRESETS,
  AuditionHandle,
} from '../../audio/vocalAudition';
import {
  ShieldCheck,
  Play,
  Check,
  FileCheck,
  Sparkles,
  Sliders,
  BookOpen,
  Mic,
  Volume2,
} from 'lucide-react';

const PROFILES = [
  {
    id: 'prof_creator_01',
    name: 'SoulSonus Creator Signature Voice',
    type: 'CREATOR_ORIGINAL',
    rights: 'VERIFIED & EXCLUSIVE',
    consentId: 'PROOF_AUTH_01',
    status: 'APPROVED',
    desc: 'Trained strictly on your authenticated seed performances.',
  },
  {
    id: 'prof_studio_session_warm',
    name: 'Studio Warm Baritone (Licensed)',
    type: 'STUDIO_VAULT',
    rights: 'ROYALTY_FREE_CLEARED',
    consentId: 'PROOF_LIC_BARI_88',
    status: 'APPROVED',
    desc: '100% commercially cleared studio session vocalist dataset.',
  },
  {
    id: 'prof_ethereal_soprano',
    name: 'Ethereal Soprano (Licensed)',
    type: 'STUDIO_VAULT',
    rights: 'ROYALTY_FREE_CLEARED',
    consentId: 'PROOF_LIC_SOPR_12',
    status: 'APPROVED',
    desc: 'Full dynamic vocal range cleared under E16 compliance.',
  },
];

const VOCAL_CHARACTERS: { id: VocalCharacterType; label: string; desc: string }[] = [
  { id: 'warm', label: 'WARM', desc: 'Full lower midrange presence & analog saturation' },
  { id: 'airy', label: 'AIRY', desc: 'Extended 12kHz+ top-end sheen & breath harmonics' },
  { id: 'raspy', label: 'RASPY', desc: 'Throat friction harmonics & gritty edge' },
  { id: 'intimate', label: 'INTIMATE', desc: 'Ultra-dry close proximity delivery' },
  { id: 'powerful', label: 'POWERFUL', desc: 'High dynamic chest voice compression' },
  { id: 'breathy', label: 'BREATHY', desc: 'Subtle aspiration & soft phonation' },
  { id: 'falsetto', label: 'FALSETTO', desc: 'Light upper register head-voice articulation' },
  { id: 'gritty', label: 'GRITTY', desc: 'Harmonic distortion & vocal drive' },
  { id: 'smooth', label: 'SMOOTH', desc: 'Linear phase rounded response' },
  { id: 'choir_stacked', label: 'CHOIR / STACK', desc: 'Multi-voice octave & unison choral double' },
];

interface VoiceIdentitySynthesisProps {
  track: Track | null;
}

export const VoiceIdentitySynthesis: React.FC<VoiceIdentitySynthesisProps> = ({ track }) => {
  const { tracks, handleUpdateVoiceIdentitySettings } = useStudioSession();

  const currentTrack = track || tracks.find((t) => t.id === 't-vocal') || tracks[0];

  const voice: VoiceIdentitySettings = currentTrack?.vocalState?.voiceIdentitySettings || {
    profileId: 'prof_creator_01',
    profileName: 'SoulSonus Creator Signature Voice',
    rightsVerified: true,
    consentProofId: 'proof_auth_01',
    licenseStatus: 'APPROVED',
    timbreBlend: 100,
    formantShift: 0,
    breathiness: 25,
    characterSettings: {
      character: 'intimate',
      breathiness: 30,
      intimacy: 85,
      grit: 15,
      formantShift: 0,
      airShelf: 3,
    },
    creativeReference: {
      id: 'ref_neo_soul_01',
      referenceName: 'Conversational R&B / Neo-Soul Phrasing',
      referenceCategory: 'VOCAL_PRODUCTION',
      narrativePerspective: 'First-person direct address',
      rhymeDensity: 75,
      dictionStyle: 'conversational',
      melodicCadence: '16th-note syncopated behind the beat',
      repetitionStrategy: 'Hook dynamic variation with call-and-response adlibs',
      declaredLicenseStatus: 'CREATOR_DECLARED_INFLUENCE',
      attributionTerms: 'Human authored lyrical expression with declared stylistic reference',
    },
  };

  const [selectedVoiceProfile, setSelectedVoiceProfile] = useState(voice.profileId);
  const [selectedCharacter, setSelectedCharacter] = useState<VocalCharacterType>(
    voice.characterSettings?.character || 'intimate'
  );
  const [isAuditioning, setIsAuditioning] = useState(false);
  const [auditionSource, setAuditionSource] = useState<'take' | 'synthetic' | null>(null);
  const auditionRef = useRef<AuditionHandle | null>(null);

  useEffect(() => {
    setSelectedVoiceProfile(voice.profileId);
  }, [voice.profileId]);

  useEffect(() => () => auditionRef.current?.stop(), []);

  // The most recent take that has real audio behind it. Preset takes carry a
  // synthetic asset id and nothing to play, so they are skipped.
  const playableTake = [...(currentTrack?.vocalTakes || [])]
    .reverse()
    .find((take) => isPlayableAudioSource(take.sourceAudioId));

  // Hooks run before this bail-out: returning above them would change the hook
  // count between renders the moment a track is deselected.
  if (!currentTrack) return <div className="p-6 text-center text-neutral-500">Select a vocal track for voice identity</div>;

  const activeProfileData = PROFILES.find((p) => p.id === selectedVoiceProfile) || PROFILES[0];

  const updateVoice = (updates: Partial<VoiceIdentitySettings>) => {
    handleUpdateVoiceIdentitySettings(currentTrack.id, updates);
  };

  // Runs a source through the character chain — air shelf, proximity, drive and
  // the formant peaks — so the settings are heard rather than described. The
  // track's own take is used when one has audio; otherwise a synthesized vowel
  // stands in, and the button says so.
  const handleAudition = async () => {
    if (auditionRef.current) {
      auditionRef.current.stop();
      auditionRef.current = null;
      setIsAuditioning(false);
      return;
    }

    setIsAuditioning(true);
    try {
      const handle = await auditionVoiceCharacter({
        settings: voice.characterSettings || CHARACTER_PRESETS[selectedCharacter],
        sourceUrl: playableTake?.sourceAudioId,
      });
      auditionRef.current = handle;
      setAuditionSource(handle.source);
      await handle.finished;
    } catch (err) {
      console.warn('[VoiceIdentitySynthesis] character audition failed:', err);
    } finally {
      auditionRef.current = null;
      setIsAuditioning(false);
    }
  };

  return (
    <div className="bg-slate-950/95 border border-slate-800/90 rounded-2xl p-4 shadow-2xl space-y-4 select-none text-xs font-mono">
      {/* 1. Header with Rights Governance Banner */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2.5 gap-2">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="font-black text-slate-100 uppercase tracking-wide">
            VOCAL CHARACTER, IDENTITY & INFLUENCE WORKSTATION
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black">
            E16 RIGHTS GOVERNANCE ADMITTED
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleAudition}
            data-testid="audition-voice-character"
            title={
              playableTake
                ? `Plays ${playableTake.name} through the character settings`
                : 'No recorded take on this track yet — plays a test tone through the character settings'
            }
            className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center space-x-1.5 transition cursor-pointer active:scale-95 ${
              isAuditioning
                ? 'bg-emerald-400 text-slate-950 animate-pulse'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-slate-950" />
            <span>
              {isAuditioning
                ? auditionSource === 'take'
                  ? 'PLAYING TAKE…'
                  : 'PLAYING TEST TONE…'
                : playableTake
                ? 'AUDITION TAKE'
                : 'AUDITION CHARACTER'}
            </span>
          </button>
        </div>
      </div>

      {/* 2. VOCAL CHARACTER SELECTOR (Separate from Voice Identity) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-bold text-amber-400 uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>1. VOCAL CHARACTER & DELIVERY AESTHETIC</span>
          </span>
          <span className="text-slate-400">Preserves Creator Performance Phrasing</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {VOCAL_CHARACTERS.map((char) => {
            const isSelected = selectedCharacter === char.id;
            return (
              <button
                key={char.id}
                onClick={() => {
                  setSelectedCharacter(char.id);
                  // Selecting a character moves the numbers it describes.
                  // Before this it set the label only, so every character
                  // produced the same settings and the same sound.
                  updateVoice({
                    characterSettings: {
                      ...CHARACTER_PRESETS[char.id],
                      character: char.id,
                    },
                  });
                }}
                className={`p-2 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500/40 font-bold'
                    : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <span className="text-[10px] font-black">{char.label}</span>
                <span className="text-[7.5px] opacity-70 mt-0.5 line-clamp-1">{char.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. VOICE IDENTITY & RIGHTS CLEARANCE (Strictly Separated) */}
      <div className="space-y-2 pt-1 border-t border-slate-900">
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-bold text-emerald-400 uppercase flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5" />
            <span>2. GOVERNED VOICE IDENTITY</span>
          </span>
          <span className="text-emerald-400 font-bold">✓ CONSENT VERIFIED</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {PROFILES.map((p) => {
            const isSelected = selectedVoiceProfile === p.id;
            return (
              <div
                key={p.id}
                onClick={() => {
                  setSelectedVoiceProfile(p.id);
                  updateVoice({
                    profileId: p.id,
                    profileName: p.name,
                    consentProofId: p.consentId,
                    rightsVerified: true,
                  });
                }}
                className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between space-y-1.5 ${
                  isSelected
                    ? 'bg-slate-900 border-emerald-500 ring-1 ring-emerald-500/40 shadow-lg'
                    : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900/90'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100 text-xs">{p.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />}
                </div>
                <p className="text-[8.5px] text-slate-400">{p.desc}</p>
                <div className="flex items-center justify-between text-[8.5px] pt-1 border-t border-slate-800">
                  <span className="text-slate-500 font-mono">#{p.consentId}</span>
                  <span className="text-emerald-400 font-bold">{p.rights}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. CREATIVE INFLUENCE / REFERENCE PROFILE LEDGER */}
      {voice.creativeReference && (
        <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-bold text-purple-300 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-purple-400" />
              <span>3. DECLARED WRITING INFLUENCE & PHRASING PROFILE</span>
            </span>
            <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[8.5px] font-bold border border-purple-500/40">
              {voice.creativeReference.declaredLicenseStatus}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[8.5px] font-mono">
            <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block">Perspective:</span>
              <span className="text-slate-200 font-bold">{voice.creativeReference.narrativePerspective}</span>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block">Rhyme Density:</span>
              <span className="text-amber-400 font-bold">{voice.creativeReference.rhymeDensity}%</span>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block">Melodic Cadence:</span>
              <span className="text-cyan-300 font-bold">{voice.creativeReference.melodicCadence}</span>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block">Repetition Strategy:</span>
              <span className="text-emerald-300 font-bold">{voice.creativeReference.repetitionStrategy}</span>
            </div>
          </div>
          <p className="text-[8px] text-slate-500 italic">
            Attribution Note: {voice.creativeReference.attributionTerms}
          </p>
        </div>
      )}
    </div>
  );
};
