import React, { useState } from 'react';
import { useStudioSession } from '../../app/StudioSessionContext';
import { StepSequencer64 } from '../StepSequencer64';
import { RealizationCandidateDrawer } from '../RealizationCandidateDrawer';
import { IntelligenceLaneStrip } from '../IntelligenceLaneStrip';
import { IntelligenceLaneInspector } from '../IntelligenceLaneInspector';
import { ContextualCoProducer } from '../ContextualCoProducer';
import { evaluateRealizationContract } from '../../lib/realizationVerifier';
import { GenerationCandidate, Track } from '../../types/daw';
import {
  Sparkles,
  Mic,
  Sliders,
  Eye,
  Plus,
  Target,
  Volume2,
  ShieldCheck,
  Layers,
  Play,
  Square,
  Repeat,
  Activity,
  ChevronDown,
  ChevronUp,
  Radio,
} from 'lucide-react';

export const CreateWorkspace: React.FC = () => {
  const {
    tracks,
    dawState,
    sections,
    selectionContext,
    setSelectionContext,
    setIsCalibrationOpen,
    setIsVisualizationOpen,
    handleAddTrack,
    handleToggleStep,
    handleChangeStepNote,
    handleToggleMute,
    handleToggleSolo,
    handleChangeVolume,
    handleChangePitch,
    setDawState,
    handleCloneBarToAll,
    handleNudgeTrackPattern,
    handleShiftTrackRow,
    handleClearTrack,
    handleClearAll,
    handleRandomize,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
    vocalState,
    calibratingTrackId,
    setFocusTrackId,
    handleDeleteTrack,
    handleCommitCandidateTransaction,
  } = useStudioSession();

  const [activeCandidate, setActiveCandidate] = useState<GenerationCandidate | null>(null);
  const [isCandidateDrawerOpen, setIsCandidateDrawerOpen] = useState(false);
  const [isGridExpanded, setIsGridExpanded] = useState(false);
  const [armedTrackIds, setArmedTrackIds] = useState<string[]>(['track-1']); // default first track armed

  const selectedTrack = tracks.find((t) => t.id === selectionContext.selectedTrackId) || tracks[0] || null;

  const handleToggleArm = (trackId: string) => {
    setArmedTrackIds((prev) =>
      prev.includes(trackId) ? prev.filter((id) => id !== trackId) : [...prev, trackId]
    );
  };

  const handleUpdateSelectedTrack = (updates: Partial<Track>) => {
    if (!selectedTrack) return;
    if (updates.volume !== undefined) {
      handleChangeVolume(selectedTrack.id, updates.volume);
    }
  };

  const handleOpenProposalAudition = (trackId?: string) => {
    const targetTrack = tracks.find((t) => t.id === trackId) || selectedTrack;
    const res = evaluateRealizationContract(
      `ast_e05_${targetTrack?.instrument || 'kick'}_demo`,
      ['rhythm', 'timing', 'pitchContour'],
      ['timbre', 'low_freq_energy', 'saturation'],
      { rhythm: 0.985, timing: 0.978, pitchContour: 0.965, articulation: 0.892 },
      { rhythm: 0.98, timing: 0.98, pitchContour: 0.50, articulation: 0.90 },
      'SoulSonusPerformanceTransfer',
      dawState.projectVersion || 'v1.0.0'
    );
    setActiveCandidate(res.candidate);
    setIsCandidateDrawerOpen(true);
  };

  const handleCommitFromDrawer = (candidate: GenerationCandidate, overrideReason?: string) => {
    const timestamp_ms = Date.now();
    const commitTxId = `tx_commit_${timestamp_ms}_${candidate.candidateId.substring(0, 6)}`;
    const newVersionId = `v1.0.${Math.floor(timestamp_ms % 1000)}`;

    const commitResult = {
      committed: true,
      commitTransactionId: commitTxId,
      idempotencyKey: `idemp_${candidate.candidateId}`,
      committedProjectVersionId: newVersionId,
      candidate: {
        ...candidate,
        creatorDecision: 'ACCEPTED' as const,
        governanceState: 'COMMITTED' as const,
        overrideIntentContract: !!overrideReason,
        overrideReason,
      },
      lineageRecord: {
        lineageId: `lin_${timestamp_ms}`,
        commitTransactionId: commitTxId,
        assetId: candidate.audioAssetId,
        sourceAssetId: 'ast_src_orig',
        candidateId: candidate.candidateId,
        operationType: 'PERFORMANCE_TRANSFER',
        backend: candidate.backend,
        modelVersion: candidate.modelVersion,
        intentContractProfileId: 'profile_kick_v1',
        seedSignatureRecordId: `seed_${timestamp_ms}`,
        timestamp: timestamp_ms,
      },
      decisionRecord: {
        decisionId: `dec_${timestamp_ms}`,
        commitTransactionId: commitTxId,
        candidateId: candidate.candidateId,
        decision: 'ACCEPTED' as const,
        overrideIntentContract: !!overrideReason,
        overrideReason,
        timestamp: timestamp_ms,
      },
      seedSignatureRecord: {
        id: `seed_${timestamp_ms}`,
        commitTransactionId: commitTxId,
        assetId: candidate.audioAssetId,
        assetType: 'audio' as const,
        timestamp: new Date().toISOString(),
        hash: `0xsha256_seed_${commitTxId.substring(0, 16)}`,
        signerId: 'creator_master',
        signerName: 'Master Creator',
        provenanceChain: ['0x3f1a28e9', '0xsha256'],
        datasetLicenseStatus: 'COMPLIANT' as const,
        status: 'VERIFIED' as const,
      },
      commitTimestamp: timestamp_ms,
    };

    handleCommitCandidateTransaction(commitResult, selectedTrack?.id);
    setIsCandidateDrawerOpen(false);
  };

  const handleRejectFromDrawer = () => {
    setIsCandidateDrawerOpen(false);
  };

  return (
    <div className="w-full flex flex-col justify-between space-y-5 pb-8 select-none">
      {/* Studio Master Recording Console Control Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        {/* Left Console Brand & Status */}
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-inner">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-black tracking-wide text-slate-100 uppercase">
                Studio Recording Console
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/30">
                LIVE INPUT ACTIVE
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              Mic Sensitivity: <span className="text-amber-300">-12dB</span> • Metronome: <span className="text-emerald-400">ON</span> • 44.1kHz PCM
            </p>
          </div>
        </div>

        {/* Console Action Triggers */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsCalibrationOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer border border-slate-700"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Calibration</span>
          </button>

          <button
            onClick={() => setIsVisualizationOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer border border-slate-700"
          >
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>Radial Radar</span>
          </button>

          <button
            onClick={() => handleAddTrack('melody')}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 text-xs font-black flex items-center space-x-1.5 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Lane</span>
          </button>
        </div>
      </div>

      {/* Intelligence Lanes Multi-Track Recording Strips */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-400 font-mono flex items-center space-x-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <span>ACTIVE INTELLIGENCE LANES ({tracks.length})</span>
          </span>
          <span className="text-[10px] font-mono text-slate-500">
            Click lane to inspect • ARM to record mouth audio
          </span>
        </div>

        <div className="space-y-2.5">
          {tracks.map((track) => (
            <IntelligenceLaneStrip
              key={track.id}
              track={track}
              isSelected={selectedTrack?.id === track.id}
              isArmed={armedTrackIds.includes(track.id)}
              isPlaying={dawState.isPlaying}
              currentStep={dawState.currentStep}
              onSelect={() => setSelectionContext((prev) => ({ ...prev, selectedTrackId: track.id }))}
              onToggleArm={() => handleToggleArm(track.id)}
              onToggleMute={() => handleToggleMute(track.id)}
              onToggleSolo={() => handleToggleSolo(track.id)}
              onChangeVolume={(vol) => handleChangeVolume(track.id, vol)}
              onAuditionProposal={() => handleOpenProposalAudition(track.id)}
            />
          ))}
        </div>
      </div>

      {/* 2-Column Console Floor: TRACK / INTELLIGENCE INSPECTOR (Left 60%) + CONTEXTUAL CO-PRODUCER (Right 40%) */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch pt-1">
        <div className="lg:col-span-7">
          <IntelligenceLaneInspector
            track={selectedTrack}
            onUpdateTrack={handleUpdateSelectedTrack}
          />
        </div>
        <div className="lg:col-span-5">
          <ContextualCoProducer
            selectedTrack={selectedTrack}
            activeWorkspace="CREATE"
          />
        </div>
      </div>

      {/* Collapsible 64-Step Grid Matrix Drawer */}
      <div className="pt-2">
        <button
          onClick={() => setIsGridExpanded((prev) => !prev)}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono font-bold text-slate-300 transition-all cursor-pointer shadow-md"
        >
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>64-STEP SEQUENCER & DRUM PROGRAMMING MATRIX</span>
            <span className="text-[10px] text-slate-500 font-normal">
              ({isGridExpanded ? 'COLLAPSE' : 'EXPAND TO EDIT STEPS'})
            </span>
          </div>
          {isGridExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {isGridExpanded && (
          <div className="mt-3">
            <StepSequencer64
              tracks={tracks}
              currentStep={dawState.currentStep}
              activeBarView={dawState.activeBarView}
              onToggleStep={(tId, sIdx) => {
                setSelectionContext((prev) => ({ ...prev, selectedTrackId: tId }));
                handleToggleStep(tId, sIdx);
              }}
              onChangeStepNote={handleChangeStepNote}
              onToggleMute={handleToggleMute}
              onToggleSolo={handleToggleSolo}
              onChangeVolume={handleChangeVolume}
              onChangePitch={handleChangePitch}
              onSelectBarView={(view) => setDawState((prev) => ({ ...prev, activeBarView: view }))}
              onAddTrack={handleAddTrack}
              onDeleteTrack={handleDeleteTrack}
              calibratingTrackId={calibratingTrackId}
              vocalState={vocalState}
              onCloneBarToAll={handleCloneBarToAll}
              onNudgeTrackPattern={handleNudgeTrackPattern}
              onShiftTrackRow={handleShiftTrackRow}
              onClearTrack={handleClearTrack}
              onClearAll={handleClearAll}
              onRandomize={handleRandomize}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={handleUndo}
              onRedo={handleRedo}
            />
          </div>
        )}
      </div>

      {/* Realization Candidate Audition Drawer */}
      <RealizationCandidateDrawer
        isOpen={isCandidateDrawerOpen}
        onClose={() => setIsCandidateDrawerOpen(false)}
        candidate={activeCandidate}
        targetTrackName={selectedTrack?.name}
        onCommitCandidate={handleCommitFromDrawer}
        onRejectCandidate={handleRejectFromDrawer}
      />
    </div>
  );
};
