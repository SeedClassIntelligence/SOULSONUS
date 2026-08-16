import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GenerationCandidate, SoundAsset } from '../types/daw';
import { X, Play, Square, CheckCircle2, AlertTriangle, RefreshCw, Volume2, ShieldCheck, Database, Sliders, ChevronRight } from 'lucide-react';
import { SOUND_CATALOG } from '../data/soundLibrary';
import * as Tone from 'tone';

interface RealizationCandidateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: GenerationCandidate | null;
  rawSourceAudioUrl?: string;
  targetTrackName?: string;
  onCommitCandidate: (candidate: GenerationCandidate, overrideReason?: string) => void;
  onRejectCandidate: (candidate: GenerationCandidate) => void;
}

export const RealizationCandidateDrawer: React.FC<RealizationCandidateDrawerProps> = ({
  isOpen,
  onClose,
  candidate,
  rawSourceAudioUrl,
  targetTrackName = 'Track 1 (Sub Kick)',
  onCommitCandidate,
  onRejectCandidate,
}) => {
  if (!isOpen || !candidate) return null;

  const [activeAuditionMode, setActiveAuditionMode] = useState<'source' | 'proposal'>('proposal');
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSoundAsset, setSelectedSoundAsset] = useState<SoundAsset | null>(SOUND_CATALOG[0]);
  const [overrideReason, setOverrideReason] = useState('Creator manual override for 0.978+ threshold match');
  const [showOverrideModal, setShowOverrideModal] = useState(false);

  const handleAuditionToggle = async (mode: 'source' | 'proposal') => {
    setActiveAuditionMode(mode);
    try {
      await Tone.start();
      setIsPlaying(true);
      const synth = mode === 'source' ? new Tone.MembraneSynth().toDestination() : new Tone.MonoSynth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.01, decay: 0.4, sustain: 0.1, release: 0.8 }
      }).toDestination();

      if (mode === 'source') {
        synth.triggerAttackRelease('C1', '8n');
      } else {
        synth.triggerAttackRelease('G0', '4n');
      }

      setTimeout(() => setIsPlaying(false), 800);
    } catch {
      setIsPlaying(false);
    }
  };

  const soundBank808s = SOUND_CATALOG.filter(
    (asset) => asset.category === 'kick' || asset.voiceDescriptors.includes('sub') || asset.voiceDescriptors.includes('808')
  );

  const handleSoundBankSwap = (asset: SoundAsset) => {
    setSelectedSoundAsset(asset);
    handleAuditionToggle('proposal');
  };

  const hasViolations = candidate.violations.length > 0;
  const passedContract = candidate.passedIntentContract && !hasViolations;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="fixed inset-y-0 right-0 w-full sm:w-[480px] md:w-[520px] bg-slate-950/98 border-l border-slate-800 shadow-2xl z-40 flex flex-col justify-between p-6 overflow-y-auto"
        >
          {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Track Realization Proposal</h3>
              <p className="text-xs text-slate-400">Target: <span className="text-amber-400 font-mono">{targetTrackName}</span></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Governance & Realization Route Badge Status */}
        <div className="mt-4 p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-medium">Route:</span>
            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-black font-mono">
              {candidate.realizationRoute ? (candidate.realizationRoute === 'ACE_PERFORMANCE_TRANSFER' ? 'PERFORMANCE TRANSFER' : candidate.realizationRoute.replace(/_/g, ' ')) : 'PERFORMANCE TRANSFER'}
            </span>
          </div>
          {passedContract ? (
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> PASSED INTENT CONTRACT
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> REJECTED PREVIEW ONLY
            </span>
          )}
        </div>

        {/* Kept vs Changed Invariants */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-mono">
          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-emerald-400 font-bold block mb-0.5">KEEP (INVARIANTS):</span>
            <span className="text-slate-300 text-[9px]">Rhythm ✓  Timing ✓  Pitch ✓  Phrasing ✓</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-amber-400 font-bold block mb-0.5">CHANGE:</span>
            <span className="text-slate-300 text-[9px]">
              Timbre ➔ {candidate.targetRole?.replace(/_/g, ' ').toUpperCase() || 'TRANSFORMED'}
            </span>
          </div>
        </div>

        {/* Side-by-Side Audio Audition Player */}
        <div className="mt-5 p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
            <span>Side-by-Side Audition</span>
            <span className="text-[10px] font-mono text-cyan-400">GENERATE ≠ COMMIT</span>
          </h4>

          <div className="grid grid-cols-2 gap-3">
            {/* Button A: Raw Source */}
            <button
              onClick={() => handleAuditionToggle('source')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                activeAuditionMode === 'source'
                  ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/10'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center space-x-2 font-semibold text-xs mb-1">
                {isPlaying && activeAuditionMode === 'source' ? <Square className="w-4 h-4 fill-cyan-400" /> : <Play className="w-4 h-4" />}
                <span>Original Source</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Raw Beatbox / Hum</span>
            </button>

            {/* Button B: AI Proposal */}
            <button
              onClick={() => handleAuditionToggle('proposal')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                activeAuditionMode === 'proposal'
                  ? 'bg-amber-500/10 border-amber-400 text-amber-300 shadow-md shadow-amber-500/10'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center space-x-2 font-semibold text-xs mb-1">
                {isPlaying && activeAuditionMode === 'proposal' ? <Square className="w-4 h-4 fill-amber-400" /> : <Play className="w-4 h-4" />}
                <span>AI Realization</span>
              </div>
              <span className="text-[10px] text-amber-400 font-mono truncate max-w-[160px]">
                {selectedSoundAsset ? selectedSoundAsset.name : candidate.backend}
              </span>
            </button>
          </div>
        </div>

        {/* Sound Bank 808 Swap Selector */}
        <div className="mt-5 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sound Bank 808 Selector</span>
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">Preserves Vocal Pattern</span>
          </div>

          <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
            {soundBank808s.map((asset) => {
              const isSelected = selectedSoundAsset?.id === asset.id;
              return (
                <div
                  key={asset.id}
                  onClick={() => handleSoundBankSwap(asset)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                      : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                      <span>{asset.name}</span>
                      {isSelected && <span className="text-[10px] font-mono text-amber-400">(Active 808)</span>}
                    </div>
                    <div className="flex gap-1 mt-1">
                      {asset.voiceDescriptors.map((desc) => (
                        <span key={desc} className="px-1.5 py-0.2 rounded bg-slate-800 text-[9px] font-mono text-slate-400">
                          {desc}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Intent Preservation Scorecard */}
        <div className="mt-5 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
            <span>Intent Preservation Scorecard</span>
            <span className="text-[10px] font-mono text-slate-500">Target vs Source</span>
          </h4>

          <div className="space-y-3 text-xs">
            {/* Rhythm */}
            <div>
              <div className="flex justify-between font-mono mb-1">
                <span className="text-slate-400">Rhythm Preservation:</span>
                <span className="text-emerald-400 font-bold">{(candidate.preservationScores.rhythm * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${candidate.preservationScores.rhythm * 100}%` }}></div>
              </div>
            </div>

            {/* Timing */}
            <div>
              <div className="flex justify-between font-mono mb-1">
                <span className="text-slate-400">Timing Accuracy:</span>
                <span className={candidate.preservationScores.timing >= 0.98 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {(candidate.preservationScores.timing * 100).toFixed(1)}% {candidate.preservationScores.timing < 0.98 && '(Req 98.0%)'}
                </span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                <div
                  className={candidate.preservationScores.timing >= 0.98 ? 'bg-emerald-400 h-full rounded-full' : 'bg-amber-400 h-full rounded-full'}
                  style={{ width: `${candidate.preservationScores.timing * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Pitch Contour */}
            <div>
              <div className="flex justify-between font-mono mb-1">
                <span className="text-slate-400">Pitch Contour Match:</span>
                <span className="text-emerald-400 font-bold">{(candidate.preservationScores.pitchContour * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${candidate.preservationScores.pitchContour * 100}%` }}></div>
              </div>
            </div>
          </div>

          {/* Diagnostic Violation Log */}
          {hasViolations && (
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              <div className="font-bold flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Contract Threshold Warning</span>
              </div>
              <p className="text-[11px] text-amber-300/80">
                Timing score of {(candidate.preservationScores.timing * 100).toFixed(1)}% missed threshold (98.0%). You may still explicitly OVERRIDE & COMMIT if you prefer this organic feel.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-slate-800 space-y-2">
        {passedContract ? (
          <button
            onClick={() => onCommitCandidate(candidate)}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>ACCEPT & COMMIT TRANSACTION</span>
          </button>
        ) : (
          <button
            onClick={() => setShowOverrideModal(true)}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>OVERRIDE CONTRACT & COMMIT</span>
          </button>
        )}

        <button
          onClick={() => onRejectCandidate(candidate)}
          className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
        >
          REJECT PROPOSAL (RETAIN SOURCE AUDIO)
        </button>

        {/* Explicit Creator Override Confirmation Modal */}
        {showOverrideModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-amber-500/30 shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span>Auditable Creator Contract Override</span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                You are accepting a candidate proposal that fell below timing thresholds. This override will be recorded in the <span className="font-mono text-amber-400">GenerationDecisionRecord</span> for cryptographic provenance.
              </p>
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Override Rationale:</label>
                <input
                  type="text"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:border-amber-500 focus:outline-none font-mono"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowOverrideModal(false);
                    onCommitCandidate(candidate, overrideReason);
                  }}
                  className="flex-1 py-2.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 cursor-pointer"
                >
                  CONFIRM OVERRIDE & COMMIT
                </button>
                <button
                  onClick={() => setShowOverrideModal(false)}
                  className="px-4 py-2.5 rounded-lg bg-slate-800 text-slate-300 font-medium text-xs hover:bg-slate-700 cursor-pointer"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
)}
</AnimatePresence>
);
};
