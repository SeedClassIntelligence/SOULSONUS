import React, { useState } from 'react';
import { SoulFlowState, SeedSignatureRecord } from '../types/daw';
import {
  soulFlowGovernor,
  SOULFLOW_STAGES,
  ValidationContext,
  TransitionValidationResult,
} from '../lib/soulFlowGovernor';
import {
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  AlertTriangle,
  Zap,
  Check,
  X,
  Lock,
} from 'lucide-react';

interface SoulFlowOrchestratorBarProps {
  currentState: SoulFlowState;
  onSelectState: (state: SoulFlowState) => void;
  onOpenSeedSignature: () => void;
  validationContext?: ValidationContext;
  onAddSeedRecord?: (record: SeedSignatureRecord) => void;
}

export const SoulFlowOrchestratorBar: React.FC<SoulFlowOrchestratorBarProps> = ({
  currentState,
  onSelectState,
  onOpenSeedSignature,
  validationContext,
  onAddSeedRecord,
}) => {
  const currentIndex = soulFlowGovernor.getStageIndex(currentState);
  const [blockedResult, setBlockedResult] = useState<TransitionValidationResult | null>(null);

  const handleStageClick = (targetState: SoulFlowState) => {
    if (!validationContext) {
      onSelectState(targetState);
      return;
    }

    const result = soulFlowGovernor.validateTransition(currentState, targetState, validationContext);
    if (result.valid) {
      onSelectState(targetState);
    } else {
      setBlockedResult(result);
    }
  };

  const handleFulfillAndAdvance = async () => {
    if (!blockedResult || !validationContext || !onAddSeedRecord) {
      if (blockedResult) onSelectState(blockedResult.targetState);
      setBlockedResult(null);
      return;
    }

    const nextState = await soulFlowGovernor.autoFulfillAndTransition(
      blockedResult.targetState,
      validationContext,
      onAddSeedRecord
    );
    onSelectState(nextState);
    setBlockedResult(null);
  };

  const handleForceAdvance = () => {
    if (blockedResult) {
      onSelectState(blockedResult.targetState);
    }
    setBlockedResult(null);
  };

  return (
    <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none">
      {/* Label & Active Stage Summary */}
      <div className="flex items-center gap-3">
        <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-extrabold flex items-center gap-1.5 shrink-0">
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span>SOULFLOW™ GOVERNOR</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 font-mono text-[11px]">
          <span className="text-slate-400">ACTIVE STAGE:</span>
          <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-black border border-amber-500/40">
            {currentState} ({currentIndex + 1}/10)
          </span>
        </div>
      </div>

      {/* 10-Stage Progress Sequence Bar */}
      <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
        {SOULFLOW_STAGES.map((s, idx) => {
          const isActive = s.state === currentState;
          const isPassed = idx < currentIndex;

          return (
            <button
              key={s.state}
              onClick={() => handleStageClick(s.state)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap border ${
                isActive
                  ? 'bg-amber-500 text-slate-950 font-black border-amber-400 shadow-md shadow-amber-500/20 scale-105'
                  : isPassed
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title={`${s.label}: ${s.description}`}
            >
              {isPassed ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : isActive ? (
                <Sparkles className="w-3.5 h-3.5 text-slate-950" />
              ) : (
                <span className="text-[10px] opacity-75">{idx + 1}</span>
              )}
              <span className="font-bold">{s.shortLabel}</span>
              {idx < SOULFLOW_STAGES.length - 1 && (
                <ArrowRight className="w-3 h-3 text-slate-600 ml-1 hidden lg:inline" />
              )}
            </button>
          );
        })}
      </div>

      {/* SeedSignature Status Badge */}
      <button
        onClick={onOpenSeedSignature}
        className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition active:scale-95 shrink-0"
      >
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span className="hidden md:inline">SeedSignature™</span>
        <span>Verified</span>
      </button>

      {/* TRANSITION VALIDATION MODAL */}
      {blockedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2 text-amber-400 font-black">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="text-xs uppercase tracking-wider font-mono">
                  SOULFLOW™ TRANSITION GATE
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBlockedResult(null)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500">CURRENT STAGE</span>
                  <span className="font-black text-slate-200">{blockedResult.currentState}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-400" />
                <div className="flex flex-col text-right">
                  <span className="text-[10px] text-slate-500">TARGET STAGE</span>
                  <span className="font-black text-amber-400">{blockedResult.targetState}</span>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-mono text-slate-400 mb-2 uppercase font-bold">
                  Missing Stage Requirements:
                </h4>
                <ul className="space-y-1.5">
                  {blockedResult.missingRequirements.map((req, i) => (
                    <li
                      key={i}
                      className="text-xs font-mono text-rose-300 bg-rose-950/50 border border-rose-500/30 p-2 rounded-lg flex items-start gap-2"
                    >
                      <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleForceAdvance}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold transition"
                >
                  FORCE OVERRIDE
                </button>
                <button
                  type="button"
                  onClick={handleFulfillAndAdvance}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-black transition flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <Zap className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
                  <span>FULFILL & ADVANCE</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
