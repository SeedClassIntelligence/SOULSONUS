import React, { useState, useEffect } from 'react';
import { Track } from '../types/daw';
import { useStudioSession } from '../app/StudioSessionContext';
import { productionHistory, ProductionOperation, CoProducerProposal } from '../lib/productionOperations';
import {
  Sparkles,
  Lock,
  Sliders,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Minimize2,
  Maximize2,
  Mic,
  Send,
  EyeOff,
  Undo2,
  Redo2,
  Zap,
  AlertTriangle,
  Play,
  Check,
  X,
  Radio,
} from 'lucide-react';

const SUGGESTED_TRACK_PROMPTS: { [instrument: string]: string } = {
  kick: 'Enhance the 80Hz thump, shorten decay, and automate filter sweep over the Hook.',
  snare: 'Add a crispy vintage snap transient and tighten release.',
  hihat: 'Add 1/16th velocity humanize jitter and boost 10kHz sheen.',
  bass: 'Make that 808 glide longer (140ms) and boost 60Hz sub weight by +3dB.',
  melody: 'Transpose chords to Eb Major, add warm Rhodes saturation, and automate reverb on Bar 8.',
  vocal_synth: 'Add tube warmth preamp (+2dB drive) and stereo vocal doubler send.',
  custom: 'Sculpt dynamic harmonics and balance stereo width.',
};

interface ContextualCoProducerProps {
  selectedTrack: Track | null;
  activeWorkspace: string;
  coProducerState?: 'hidden' | 'compact' | 'expanded';
  onStateChange?: (state: 'hidden' | 'compact' | 'expanded') => void;
}

export const ContextualCoProducer: React.FC<ContextualCoProducerProps> = ({
  selectedTrack,
  activeWorkspace,
  coProducerState: externalState,
  onStateChange,
}) => {
  const { tracks, setTracks } = useStudioSession();
  const [internalState, setInternalState] = useState<'hidden' | 'compact' | 'expanded'>('expanded');
  const viewState = externalState || internalState;

  const setViewState = (st: 'hidden' | 'compact' | 'expanded') => {
    if (onStateChange) onStateChange(st);
    else setInternalState(st);
  };

  const [prompt, setPrompt] = useState('Enhance the 808 glide to 140ms and boost 60Hz sub weight.');
  const [proposalState, setProposalState] = useState<'IDLE' | 'PROPOSING' | 'AUDITIONING' | 'COMMITTED'>('IDLE');
  const [currentProposal, setCurrentProposal] = useState<CoProducerProposal | null>(null);
  const [lastExecutedOp, setLastExecutedOp] = useState<string | null>(null);

  // Synchronize suggested prompt dynamically whenever selectedTrack changes
  useEffect(() => {
    if (selectedTrack) {
      const defaultSuggestion =
        SUGGESTED_TRACK_PROMPTS[selectedTrack.instrument] ||
        (selectedTrack.name.toLowerCase().includes('strings')
          ? 'Add lush concert hall reverb and rich cello harmonic depth.'
          : SUGGESTED_TRACK_PROMPTS.melody);
      setPrompt(defaultSuggestion);
      setProposalState('IDLE');
      setCurrentProposal(null);
    }
  }, [selectedTrack?.id]);

  const targetInstrument = selectedTrack?.instrument || 'kick';
  const targetName = selectedTrack ? selectedTrack.name : 'ALL TRACKS';

  // Step 1: PROPOSE -> Creates provisional auditionable candidate
  const handleGenerateProposal = () => {
    if (!selectedTrack) return;
    setProposalState('PROPOSING');

    setTimeout(() => {
      const proposalOp: ProductionOperation = {
        id: `op_ai_${Date.now()}`,
        type: 'SET_INSTRUMENT_PARAM',
        trackId: selectedTrack.id,
        description: `Co-Producer: Applied "${prompt.slice(0, 36)}..." to ${selectedTrack.name}`,
        source: 'CO_PRODUCER_AI',
        timestamp: Date.now(),
        undo: (allTracks) => allTracks,
        redo: (allTracks) => allTracks,
      };

      const proposal: CoProducerProposal = {
        id: `prop_${Date.now()}`,
        trackId: selectedTrack.id,
        prompt,
        description: `Boosted 60Hz sub weight (+3.0dB) & glide time (140ms) on ${selectedTrack.name}`,
        targetParameter: 'glideTime & subWeight',
        proposedValue: { glideTime: 140, subWeight: 3.5 },
        status: 'AUDITIONING',
        timestamp: Date.now(),
        operation: proposalOp,
      };

      productionHistory.setProposal(proposal);
      setCurrentProposal(proposal);
      setProposalState('AUDITIONING');
    }, 500);
  };

  // Step 2: COMMIT -> Creator confirms candidate into canonical project state
  const handleCommitProposal = () => {
    if (!currentProposal) return;
    const result = productionHistory.commitProposal(tracks);
    if (result.operation) {
      setTracks(result.updatedTracks);
      setLastExecutedOp(`Committed: ${result.operation.description}`);
    }
    setProposalState('COMMITTED');
    setTimeout(() => setProposalState('IDLE'), 2000);
  };

  // Step 3: REJECT -> Discard candidate
  const handleRejectProposal = () => {
    productionHistory.rejectProposal();
    setCurrentProposal(null);
    setProposalState('IDLE');
    setLastExecutedOp('Proposal discarded');
  };

  const handleUndo = () => {
    const res = productionHistory.undo(tracks);
    if (res.operation) {
      setTracks(res.updatedTracks);
      setLastExecutedOp(`Undid: ${res.operation.description}`);
    }
  };

  const handleRedo = () => {
    const res = productionHistory.redo(tracks);
    if (res.operation) {
      setTracks(res.updatedTracks);
      setLastExecutedOp(`Redid: ${res.operation.description}`);
    }
  };

  // State 1: HIDDEN (Small vertical tab trigger)
  if (viewState === 'hidden') {
    return (
      <div className="h-full flex items-center justify-center p-1">
        <button
          onClick={() => setViewState('compact')}
          className="py-3 px-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-amber-400 flex flex-col items-center space-y-2 shadow-lg transition cursor-pointer"
          title="Open Co-Producer"
        >
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="text-[10px] font-mono font-bold [writing-mode:vertical-lr] tracking-widest text-slate-300">
            CO-PRODUCER
          </span>
          <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
        </button>
      </div>
    );
  }

  // State 2: COMPACT (Minimal assistant bar)
  if (viewState === 'compact') {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-xl space-y-2 select-none flex flex-col justify-between h-full">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-200">Co-Producer</span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-amber-300 border border-slate-700">
              {targetName}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setViewState('expanded')}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Expand Co-Producer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewState('hidden')}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Hide Co-Producer"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Command intent for ${targetName}...`}
            className="flex-1 bg-transparent text-xs text-slate-200 focus:outline-none px-1 font-mono"
          />
          <button
            onClick={handleGenerateProposal}
            className="p-1.5 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 transition cursor-pointer"
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  // State 3: EXPANDED (Full PROPOSE -> AUDITION -> COMMIT Workflow)
  return (
    <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 shadow-2xl space-y-3 select-none flex flex-col justify-between h-full">
      {/* Header with Symmetrical History Controls */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold text-slate-100">CONTEXTUAL CO-PRODUCER</h3>
            <p className="text-[10px] font-mono text-slate-400">
              Target: <strong className="text-amber-300">{targetName.toUpperCase()}</strong> • Mode: {activeWorkspace}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={handleUndo}
            disabled={!productionHistory.canUndo()}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-40 transition cursor-pointer"
            title="Undo Last Operation"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={!productionHistory.canRedo()}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-40 transition cursor-pointer"
            title="Redo Operation"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewState('compact')}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            title="Compact Co-Producer"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewState('hidden')}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            title="Hide Co-Producer"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Prompts Input Box */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-slate-300 font-mono flex items-center justify-between">
          <span>PRODUCTION INTENT PROMPT</span>
          <span className="text-amber-400 text-[9px] font-bold">Targeting: {targetName}</span>
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={`Describe your musical intent for ${targetName}...`}
          className="w-full h-16 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:border-amber-500 focus:outline-none font-mono resize-none"
        />
      </div>

      {/* Target & Invariants Card */}
      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-[11px] font-mono">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
          <span className="text-slate-400">TARGET OBJECT:</span>
          <span className="font-bold text-amber-400 truncate max-w-[140px]">{targetName}</span>
        </div>

        <div className="flex items-center justify-between text-[10px]">
          <span className="text-slate-400 flex items-center space-x-1">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>LOCKED INVARIANTS:</span>
          </span>
          <span className="text-emerald-300 font-bold">Rhythm, Root Take, Lineage</span>
        </div>

        <div className="flex items-center justify-between text-[10px]">
          <span className="text-slate-400 flex items-center space-x-1">
            <Sliders className="w-3 h-3 text-cyan-400" />
            <span>MUTABLE PARAMS:</span>
          </span>
          <span className="text-cyan-300 font-bold">
            {targetInstrument === 'kick' || targetInstrument === 'snare'
              ? 'Transient Attack, Velocity, EQ'
              : targetInstrument === 'bass'
              ? 'Sub Weight, Glide, Automation'
              : targetInstrument === 'vocal_synth'
              ? 'Tube Drive, Pitch Tune, De-Esser'
              : 'Chords, ADSR, Filter Cutoff'}
          </span>
        </div>
      </div>

      {/* LIVE AUDITION & PROPOSAL DECK (PROPOSE -> AUDITION -> COMMIT) */}
      {proposalState === 'AUDITIONING' && currentProposal && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-slate-950 to-slate-900 border border-amber-500/50 space-y-2 text-xs font-mono shadow-xl">
          <div className="flex items-center justify-between text-[10px] text-amber-400 font-bold">
            <span className="flex items-center space-x-1">
              <Radio className="w-3 h-3 animate-pulse text-amber-400" />
              <span>AUDITIONING PROPOSAL IN LOOP</span>
            </span>
            <span className="text-slate-400">Preview Only</span>
          </div>

          <div className="text-[11px] text-slate-200 font-semibold">
            {currentProposal.description}
          </div>

          {/* Decision Actions: COMMIT vs REJECT */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleCommitProposal}
              className="py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] flex items-center justify-center space-x-1 transition cursor-pointer shadow-md shadow-emerald-500/20"
            >
              <Check className="w-3.5 h-3.5" />
              <span>COMMIT</span>
            </button>
            <button
              onClick={handleRejectProposal}
              className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] flex items-center justify-center space-x-1 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>REJECT</span>
            </button>
          </div>
        </div>
      )}

      {/* Feedback status */}
      {lastExecutedOp && proposalState !== 'AUDITIONING' && (
        <div className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-300 truncate">
          ✓ {lastExecutedOp}
        </div>
      )}

      {/* Primary Action Button */}
      {proposalState !== 'AUDITIONING' && (
        <button
          onClick={handleGenerateProposal}
          disabled={proposalState === 'PROPOSING' || !selectedTrack}
          className={`w-full py-2.5 rounded-xl font-bold text-xs font-mono flex items-center justify-center space-x-2 transition-all cursor-pointer border ${
            proposalState === 'PROPOSING'
              ? 'bg-slate-800 text-slate-400 border-slate-700 animate-pulse'
              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 active:scale-98'
          }`}
        >
          <span>{proposalState === 'PROPOSING' ? 'EVALUATING PROPOSAL...' : `PROPOSE & AUDITION FOR ${targetName.toUpperCase()}`}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
