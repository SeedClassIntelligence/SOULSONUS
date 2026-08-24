import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Mic,
  Sparkles,
  ShieldCheck,
  AlertCircle,
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

/**
 * No singing-voice-synthesis model is wired into this deployment. ACE-Step's
 * real tasks -- cover, repaint, extract, lego, text2music, complete -- take
 * audio or a style prompt, not lyrics-plus-a-chosen-voice-identity; that's a
 * different capability (what a dedicated singing synthesizer does) that
 * nothing in this stack provides yet. This list used to carry fabricated
 * rights claims ("VERIFIED & EXCLUSIVE", consent IDs, "APPROVED") for voices
 * that were never real to begin with -- names only, so the picker below is
 * honest about being a preview of a feature, not a working one.
 */
const VOICE_PROFILES = [
  { id: 'prof_creator_01', name: 'Your Own Voice', desc: 'Would train on your own recordings, once a real identity model is wired in.' },
  { id: 'prof_studio_session_warm', name: 'Studio Warm Baritone', desc: 'A licensed session voice, once a real licensed voice library is wired in.' },
  { id: 'prof_ethereal_soprano', name: 'Ethereal Soprano', desc: 'A licensed session voice, once a real licensed voice library is wired in.' },
];

export const VoiceCloneDrawer: React.FC<VoiceCloneDrawerProps> = ({ isOpen, onClose }) => {
  const { tracks } = useStudioSession();

  const vocalTrack = tracks.find((t) => t.instrument === 'vocal_synth' || t.id === 't-vocal') || tracks[0];

  const [activeTab, setActiveTab] = useState<'CLONE_TRAIN' | 'SYNTHESIZE_LYRICS'>('SYNTHESIZE_LYRICS');
  const [selectedProfileId, setSelectedProfileId] = useState('prof_creator_01');
  const [lyricsInput, setLyricsInput] = useState('Late night in the city, neon reflections on the rain\nHeartbeat in the rhythm, breaking through the pain');
  const [timbreBlend, setTimbreBlend] = useState(100);
  const [formantShift, setFormantShift] = useState(0);
  const [breathiness, setBreathiness] = useState(25);

  const activeProfile = VOICE_PROFILES.find((p) => p.id === selectedProfileId) || VOICE_PROFILES[0];

  // No calibration-capture pipeline is wired in either -- there is nothing
  // for a recorded sample to train, so recording one and reporting a sample
  // count would be exactly the same fabrication as the synthesis button
  // below, one step earlier in the flow.
  const trainingUnavailable =
    'No voice-identity model is wired into this deployment, so there is nothing for a captured sample to train yet.';

  // No singing-voice-synthesis model is wired into this deployment -- ACE-
  // Step's real tasks don't take lyrics-plus-a-voice-identity as input, and
  // nothing else in this stack does either. This used to be a setTimeout
  // that unconditionally reported success and added a take with no audio
  // behind it after two seconds. It says the truth now instead.
  const synthesisUnavailable =
    'No singing-voice-synthesis model is wired into this deployment yet. ACE-Step (the model this build actually ' +
    'uses) generates and reshapes audio from a prompt or a source recording -- it does not sing lyrics in a chosen ' +
    'voice identity. That is a different capability, and nothing here provides it.';

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
                    <span className="text-amber-400 text-[10px]">NO MODEL WIRED</span>
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

                {/* Synthesize Action -- disabled, honestly, rather than a fake
                    progress bar over a two-second timer that used to always
                    "succeed" and add a take with no audio behind it. */}
                <button
                  disabled
                  title={synthesisUnavailable}
                  className="w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 bg-slate-800 text-slate-500 cursor-not-allowed"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>NO SINGING MODEL WIRED</span>
                </button>
                <p className="text-[10px] text-slate-500 leading-relaxed">{synthesisUnavailable}</p>
              </div>
            ) : (
              /* TAB 2: CLONE & TRAIN VOICE IDENTITY */
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-white text-xs uppercase">No Voice-Identity Model Wired</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    A real voice-cloning pipeline would train on captured vocalizations here. Nothing in this
                    deployment does that yet, so there is no identity to calibrate and no consent to record against
                    one.
                  </p>
                </div>

                {/* Record New Calibration Sample -- disabled, honestly, rather
                    than a fake setTimeout incrementing a sample count with
                    nothing behind it. */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase">Record New Voice Sample</h4>
                  <p className="text-[11px] text-slate-500">{trainingUnavailable}</p>

                  <button
                    disabled
                    title={trainingUnavailable}
                    className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-500 font-bold text-xs flex items-center justify-center space-x-2 cursor-not-allowed"
                  >
                    <Mic className="w-4 h-4" />
                    <span>NO MODEL TO TRAIN</span>
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
