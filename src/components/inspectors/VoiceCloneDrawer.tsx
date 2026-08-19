import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Mic,
  Sparkles,
  ShieldCheck,
  Play,
  Check,
  Plus,
  Volume2,
  FileCheck,
  Layers,
  Wand2,
  Music,
  Sliders,
} from 'lucide-react';
import { useStudioSession } from '../../app/StudioSessionContext';
import { VoiceIdentitySettings } from '../../types/daw';

interface VoiceCloneDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const VOICE_PROFILES = [
  {
    id: 'prof_creator_01',
    name: 'SoulSonus Creator Signature Voice',
    type: 'CREATOR_ORIGINAL',
    rights: 'VERIFIED & EXCLUSIVE',
    consentId: 'PROOF_AUTH_01',
    status: 'APPROVED',
    desc: 'Trained strictly on your authenticated personal recordings.',
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

export const VoiceCloneDrawer: React.FC<VoiceCloneDrawerProps> = ({ isOpen, onClose }) => {
  const { tracks, handleUpdateVoiceIdentitySettings, handleAddVocalTake } = useStudioSession();

  const vocalTrack = tracks.find((t) => t.instrument === 'vocal_synth' || t.id === 't-vocal') || tracks[0];

  const [activeTab, setActiveTab] = useState<'CLONE_TRAIN' | 'SYNTHESIZE_LYRICS'>('SYNTHESIZE_LYRICS');
  const [selectedProfileId, setSelectedProfileId] = useState('prof_creator_01');
  const [lyricsInput, setLyricsInput] = useState('Late night in the city, neon reflections on the rain\nHeartbeat in the rhythm, breaking through the pain');
  const [timbreBlend, setTimbreBlend] = useState(100);
  const [formantShift, setFormantShift] = useState(0);
  const [breathiness, setBreathiness] = useState(25);
  const [isRecordingTraining, setIsRecordingTraining] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [trainingSamplesCount, setTrainingSamplesCount] = useState(3);
  const [synthesizedSuccess, setSynthesizedSuccess] = useState(false);

  const activeProfile = VOICE_PROFILES.find((p) => p.id === selectedProfileId) || VOICE_PROFILES[0];

  const handleRecordSample = () => {
    setIsRecordingTraining(true);
    setTimeout(() => {
      setIsRecordingTraining(false);
      setTrainingSamplesCount((prev) => prev + 1);
    }, 1500);
  };

  const handleSynthesizeSinging = () => {
    if (!lyricsInput.trim()) return;
    setIsSynthesizing(true);
    setSynthesizedSuccess(false);

    setTimeout(() => {
      setIsSynthesizing(false);
      setSynthesizedSuccess(true);

      // Create synthetic vocal take and add to vocal track
      if (vocalTrack) {
        handleAddVocalTake(vocalTrack.id, {
          name: `Cloned Voice (${activeProfile.name.slice(0, 15)}...)`,
          rating: 5,
        });
      }
    }, 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="fixed right-0 top-0 bottom-0 w-full sm:w-[500px] md:w-[540px] lg:w-[580px] bg-slate-950/98 border-l border-slate-800 shadow-2xl z-50 flex flex-col justify-between overflow-hidden font-mono select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wide flex items-center gap-2">
                  <span>VOICE CLONING & SINGING STUDIO</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px]">
                    E13 + R08
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400 font-sans">
                  Clone your voice identity & synthesize singing performances from lyrics
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="p-3 border-b border-slate-800/80 bg-slate-950 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs w-full">
              <button
                onClick={() => setActiveTab('SYNTHESIZE_LYRICS')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'SYNTHESIZE_LYRICS'
                    ? 'bg-pink-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>1. SING FROM LYRICS</span>
              </button>
              <button
                onClick={() => setActiveTab('CLONE_TRAIN')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'CLONE_TRAIN'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>2. CLONE & TRAIN VOICE</span>
              </button>
            </div>
          </div>

          {/* Interior Floor */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 text-xs font-mono">
            {activeTab === 'SYNTHESIZE_LYRICS' ? (
              /* TAB 1: SINGING SYNTHESIS FROM LYRICS */
              <div className="space-y-4">
                {/* Voice Profile Selector */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-300 uppercase flex items-center justify-between">
                    <span>Select Singing Voice Model</span>
                    <span className="text-emerald-400 text-[10px]">E16 AUTHORIZED</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {VOICE_PROFILES.map((p) => {
                      const isSelected = selectedProfileId === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedProfileId(p.id)}
                          className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-slate-900 border-pink-500 ring-1 ring-pink-500/40 shadow-lg'
                              : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900/90'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
                              <Music className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold text-white text-xs">{p.name}</div>
                              <div className="text-[10px] text-slate-400">{p.desc}</div>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-pink-400 stroke-[3]" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Lyrics Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 uppercase">
                    <span>Lyrics & Phrasing</span>
                    <span className="text-slate-400 text-[10px]">C Minor • 110 BPM</span>
                  </div>
                  <textarea
                    rows={4}
                    value={lyricsInput}
                    onChange={(e) => setLyricsInput(e.target.value)}
                    placeholder="Enter or paste lyrics for the vocalist to sing..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-pink-500 resize-none"
                  />
                </div>

                {/* Timbre & Acoustic Controls */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="text-[11px] font-bold text-slate-300 uppercase">Voice Sculpting Parameters</div>
                  
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Identity / Timbre Blend:</span>
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
                      <span>Formant Character Shift:</span>
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

                {/* Synthesize Action */}
                <button
                  onClick={handleSynthesizeSinging}
                  disabled={isSynthesizing || !lyricsInput.trim()}
                  className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition cursor-pointer shadow-lg ${
                    isSynthesizing
                      ? 'bg-pink-400 text-slate-950 animate-pulse'
                      : synthesizedSuccess
                      ? 'bg-emerald-600 text-white'
                      : 'bg-pink-600 hover:bg-pink-500 text-white shadow-pink-600/30'
                  }`}
                >
                  <Wand2 className="w-4 h-4" />
                  <span>
                    {isSynthesizing
                      ? 'Synthesizing Vocals with Cloned Voice...'
                      : synthesizedSuccess
                      ? 'Vocal Take Added to Track!'
                      : 'SYNTHESIZE SUNG VOCAL TAKE'}
                  </span>
                </button>
              </div>
            ) : (
              /* TAB 2: CLONE & TRAIN VOICE IDENTITY */
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white text-xs uppercase">Your Exclusive Cloned Voice</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    SoulSonus builds your personal singing voice model by capturing short vocalizations (vowels, humming, and pitch glides).
                  </p>
                  <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-slate-800">
                    <span className="text-slate-400">Calibrated Samples:</span>
                    <span className="text-amber-400 font-bold">{trainingSamplesCount} Samples Trained</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Consent Proof Token:</span>
                    <span className="text-emerald-400 font-bold">#PROOF_AUTH_01 (Signed)</span>
                  </div>
                </div>

                {/* Record New Calibration Sample */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-amber-500/30 space-y-3">
                  <h4 className="text-xs font-bold text-amber-300 uppercase">Record New Voice Sample</h4>
                  <p className="text-[11px] text-slate-400">
                    Sing a sustained vowel "Ahhh" (C3) for 3 seconds to update your vocal tract harmonics.
                  </p>

                  <button
                    onClick={handleRecordSample}
                    disabled={isRecordingTraining}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 transition cursor-pointer"
                  >
                    <Mic className="w-4 h-4" />
                    <span>{isRecordingTraining ? 'Recording Voice Vowel...' : 'RECORD 3-SECOND VOCAL SAMPLE'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
