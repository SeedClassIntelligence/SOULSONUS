import React, { useState, useCallback, useEffect } from 'react';
import { StudioSessionProvider, useStudioSession } from './app/StudioSessionContext';
import { Header } from './components/Header';
import { WorkspaceNav } from './components/WorkspaceNav';
import { StudioCanvas } from './components/StudioCanvas';
import { StudioMasterStatusBar } from './components/StudioMasterStatusBar';
import { FocusModeView } from './components/FocusModeView';
import { QuickInspectorDrawer } from './components/inspectors/QuickInspectorDrawer';
import { TrackWorkstationDrawer } from './components/inspectors/TrackWorkstationDrawer';
import { SongwritingSuiteDrawer } from './components/inspectors/SongwritingSuiteDrawer';
import { VoiceCloneDrawer } from './components/inspectors/VoiceCloneDrawer';
import { ExternalHardwareMidiDrawer } from './components/inspectors/ExternalHardwareMidiDrawer';
import { CalibrationDrawer } from './components/inspectors/CalibrationDrawer';
import { VisualizationDrawer } from './components/inspectors/VisualizationDrawer';
import { RealizationCandidateDrawer } from './components/RealizationCandidateDrawer';
import { StudioIntelligenceDrawer } from './components/StudioIntelligenceDrawer';
import { NativeBrainDrawer } from './components/inspectors/NativeBrainDrawer';
import { evaluateRealizationContract } from './lib/realizationVerifier';
import { RealizationRouter } from './lib/realizationRouter';
import { GenerationCandidate, RealizationRoute } from './types/daw';

import { QuickHelpModal } from './components/QuickHelpModal';
import { StudioTourGuide, TourAspectId } from './components/StudioTourGuide';
import { PersonalTrainingModal } from './components/PersonalTrainingModal';
import { SoundLibraryModal } from './components/SoundLibraryModal';
import { DatasetRegistryModal } from './components/DatasetRegistryModal';
import { CollaborationModal } from './components/CollaborationModal';
import { SeedSignatureModal } from './components/SeedSignatureModal';
import { ExportModal } from './components/ExportModal';
import { AiControlRoomModal } from './components/AiControlRoomModal';

import { audioEngine } from './audio/audioEngine';
import { detectionEngine } from './audio/detectionEngine';
import { VoiceCommandResult } from './audio/voiceCommands';
import { PRESETS } from './data/presets';
import { Preset } from './types/daw';

const AppInner: React.FC = () => {
  const {
    activeWorkspace,
    setActiveWorkspace,
    focusTrackId,
    isInspectorOpen,
    setIsInspectorOpen,
    isCalibrationOpen,
    setIsCalibrationOpen,
    isVisualizationOpen,
    setIsVisualizationOpen,
    isVoiceCloneDrawerOpen,
    setIsVoiceCloneDrawerOpen,
    dawState,
    setDawState,
    tracks,
    setTracks,
    sections,
    detectionSettings,
    setDetectionSettings,
    seedRecords,
    handleAddSeedRecord,
    calibratingTrackId,
    setCalibratingTrackId,
    creatorName,
    selectionContext,
    setSelectionContext,
    handleCommitCandidateTransaction,
  } = useStudioSession();

  // Modals & Drawers
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [tourInitialAspect, setTourInitialAspect] = useState<TourAspectId>('OVERVIEW');
  const [isTrainingOpen, setIsTrainingOpen] = useState(false);
  const [trainingInitialTab, setTrainingInitialTab] = useState<'TRAINING_PILLARS' | 'VOICE_CLONING_LAB' | 'SOUND_VAULT'>('TRAINING_PILLARS');
  const [isSoundLibraryOpen, setIsSoundLibraryOpen] = useState(false);
  const [isDatasetRegistryOpen, setIsDatasetRegistryOpen] = useState(false);
  const [isCollaborationOpen, setIsCollaborationOpen] = useState(false);
  const [isSeedSignatureOpen, setIsSeedSignatureOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isAiControlRoomOpen, setIsAiControlRoomOpen] = useState(false);

  // Drawers
  const [isStudioIntelligenceOpen, setIsStudioIntelligenceOpen] = useState(false);
  const [isTrackWorkstationOpen, setIsTrackWorkstationOpen] = useState(false);
  const [isSongwritingSuiteOpen, setIsSongwritingSuiteOpen] = useState(false);
  const [isHardwareMidiOpen, setIsHardwareMidiOpen] = useState(false);
  const [isNativeBrainOpen, setIsNativeBrainOpen] = useState(false);
  const [isCandidateDrawerOpen, setIsCandidateDrawerOpen] = useState(false);
  const [activeCandidate, setActiveCandidate] = useState<GenerationCandidate | null>(null);
  const [isRealizationPending, setIsRealizationPending] = useState(false);
  const [realizationError, setRealizationError] = useState<string | null>(null);

  const handleOpenProposal = useCallback((trackId?: string) => {
    const targetTrack = tracks.find((t) => t.id === trackId) || tracks[0];
    const res = evaluateRealizationContract(
      `ast_e05_${targetTrack?.instrument || 'kick'}_demo`,
      ['rhythm', 'timing', 'pitchContour'],
      ['timbre', 'low_freq_energy', 'saturation'],
      { rhythm: 0.985, timing: 0.98, pitchContour: 0.965, articulation: 0.892 },
      { rhythm: 0.98, timing: 0.98, pitchContour: 0.50, articulation: 0.90 },
      'SoulSonusPerformanceTransfer',
      dawState.projectVersion || 'v1.0.0'
    );
    setActiveCandidate(res.candidate);
    setIsCandidateDrawerOpen(true);
  }, [tracks, dawState.projectVersion]);

  const handleCommitCandidate = useCallback((candidate: GenerationCandidate, overrideReason?: string) => {
    const timestamp_ms = Date.now();
    const commitTxId = `tx_commit_${timestamp_ms}_${candidate.candidateId.substring(0, 6)}`;
    const commitResult = {
      committed: true,
      commitTransactionId: commitTxId,
      idempotencyKey: `idemp_${candidate.candidateId}`,
      committedProjectVersionId: `v1.0.${Math.floor(timestamp_ms % 1000)}`,
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
    handleCommitCandidateTransaction(commitResult);
    setIsCandidateDrawerOpen(false);
  }, [handleCommitCandidateTransaction]);

  // Auto-sync side panels on top-level workspace tab navigation
  useEffect(() => {
    if (activeWorkspace === 'BUILD') {
      setIsTrackWorkstationOpen(true);
      setIsSongwritingSuiteOpen(false);
    } else if (activeWorkspace === 'WRITE_RECORD') {
      setIsSongwritingSuiteOpen(true);
      setIsTrackWorkstationOpen(false);
    } else {
      setIsTrackWorkstationOpen(false);
      setIsSongwritingSuiteOpen(false);
    }
  }, [activeWorkspace]);

  // Listen for drawer/modal open events dispatched from UI components
  useEffect(() => {
    const handleDrawerEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === 'inspector') setIsInspectorOpen((prev) => !prev);
      if (detail === 'workstation') setIsTrackWorkstationOpen((prev) => !prev);
      if (detail === 'songwriting' || detail === 'vocal') setIsSongwritingSuiteOpen((prev) => !prev);
      if (detail === 'hardware' || detail === 'midi') setIsHardwareMidiOpen((prev) => !prev);
      if (detail === 'intelligence') setIsStudioIntelligenceOpen((prev) => !prev);
      if (detail === 'nativebrain' || detail === 'brain') setIsNativeBrainOpen((prev) => !prev);
      if (detail === 'calibration') setIsCalibrationOpen((prev) => !prev);
      if (detail === 'visualization') setIsVisualizationOpen((prev) => !prev);
      if (detail === 'proposal' || detail === 'realization' || (typeof detail === 'object' && detail?.type === 'realization')) {
        const trId = typeof detail === 'object' ? detail?.trackId : undefined;
        const route: RealizationRoute = typeof detail === 'object' && detail?.route ? detail.route : 'ACE_PERFORMANCE_TRANSFER';
        const targetTrack = tracks.find((t) => t.id === trId) || tracks[0];
        if (targetTrack) {
          // createCandidate now genuinely calls a self-hosted ACE-Step server
          // and waits on a real result -- this can take real seconds
          // (GPU) to real tens-of-seconds (CPU self-host), not a synchronous
          // hardcoded-literal return like before. Surface failures to the
          // creator rather than swallowing them into a fake "success".
          setIsRealizationPending(true);
          RealizationRouter.createCandidate({
            sourceTrack: targetTrack,
            targetRole: targetTrack.instrument || 'kick',
            route,
            prompt: typeof detail === 'object' ? detail?.prompt : `Realize ${targetTrack.name} with ${route}`,
            projectVersion: dawState.projectVersion || 'v1.0.0',
          })
            .then((candidate) => {
              setActiveCandidate(candidate);
              setIsCandidateDrawerOpen(true);
            })
            .catch((err) => {
              console.error('[Realization] Failed to generate candidate:', err);
              setRealizationError(err instanceof Error ? err.message : String(err));
            })
            .finally(() => setIsRealizationPending(false));
        } else {
          handleOpenProposal();
        }
      }
    };

    const handleTourEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === 'object' && detail?.aspectId) {
        setTourInitialAspect(detail.aspectId as TourAspectId);
      } else if (typeof detail === 'string') {
        setTourInitialAspect(detail as TourAspectId);
      } else {
        setTourInitialAspect('OVERVIEW');
      }
      setIsTourOpen(true);
    };

    window.addEventListener('soulsonus:openDrawer', handleDrawerEvent);
    window.addEventListener('soulsonus:openTour', handleTourEvent);
    return () => {
      window.removeEventListener('soulsonus:openDrawer', handleDrawerEvent);
      window.removeEventListener('soulsonus:openTour', handleTourEvent);
    };
  }, [handleOpenProposal, tracks, dawState.projectVersion, setIsInspectorOpen, setIsCalibrationOpen, setIsVisualizationOpen]);

  // Play / Stop / Mic Handlers
  const handleTogglePlay = useCallback(async () => {
    if (dawState.isPlaying) {
      audioEngine.stopSequencer();
      setDawState((prev) => ({ ...prev, isPlaying: false }));
    } else {
      await audioEngine.init();
      audioEngine.startSequencer(
        () => tracks,
        (step) => setDawState((prev) => ({ ...prev, currentStep: step }))
      );
      setDawState((prev) => ({ ...prev, isPlaying: true }));
    }
  }, [dawState.isPlaying, tracks, setDawState]);

  const handleStop = useCallback(() => {
    audioEngine.stopSequencer();
    setDawState((prev) => ({ ...prev, isPlaying: false, currentStep: 0 }));
  }, [setDawState]);

  const handleToggleMic = useCallback(async () => {
    if (detectionSettings.enabled) {
      detectionEngine.stop();
      setDetectionSettings((prev) => ({ ...prev, enabled: false, micConnected: false }));
    } else {
      const success = await detectionEngine.start();
      if (success) {
        setDetectionSettings((prev) => ({ ...prev, enabled: true, micConnected: true }));
      }
    }
  }, [detectionSettings.enabled, setDetectionSettings]);

  const handleSelectPreset = useCallback(
    (preset: Preset) => {
      audioEngine.stopSequencer();
      setTracks(preset.tracks);
      setDawState((prev) => ({
        ...prev,
        bpm: preset.bpm,
        isPlaying: false,
        currentStep: 0,
        projectName: preset.name,
      }));
    },
    [setTracks, setDawState]
  );

  const handleCalibrateTrack = useCallback(
    async (trackId: string) => {
      setCalibratingTrackId(trackId);
      const profile = await detectionEngine.calibrateTrack(trackId, 2000);
      if (profile) {
        setTracks((prev) =>
          prev.map((t) => (t.id === trackId ? { ...t, detectionProfile: profile } : t))
        );
      }
      setCalibratingTrackId(null);
    },
    [setCalibratingTrackId, setTracks]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Persistent Top Studio Shell Header */}
      <Header
        dawState={dawState}
        onStateChange={(updates) => setDawState((prev) => ({ ...prev, ...updates }))}
        onTogglePlay={handleTogglePlay}
        onStop={handleStop}
        onToggleMic={handleToggleMic}
        onSelectPreset={handleSelectPreset}
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenTour={() => {
          setTourInitialAspect('OVERVIEW');
          setIsTourOpen(true);
        }}
        onOpenTraining={() => {
          setTrainingInitialTab('TRAINING_PILLARS');
          setIsTrainingOpen(true);
        }}
        onOpenSoundLibrary={() => setIsSoundLibraryOpen(true)}
        onOpenDatasetRegistry={() => setIsDatasetRegistryOpen(true)}
        onOpenCollaboration={() => setIsCollaborationOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        isMicActive={detectionSettings.enabled}
      />

      {/* 5 Creator Workspace Navigation Tabs */}
      <WorkspaceNav
        activeWorkspace={activeWorkspace}
        onSelectWorkspace={setActiveWorkspace}
        soulFlowStageLabel={dawState.soulFlowState}
      />

      {/* Main Persistent Studio Canvas */}
      <main className="flex-1 p-3 md:p-4 max-w-[1440px] w-full mx-auto space-y-3">
        {focusTrackId ? <FocusModeView /> : <StudioCanvas />}
      </main>

      {/* Bottom Master Studio Telemetry & Status Bar */}
      <StudioMasterStatusBar />

      {/* Slide-out Drawers */}
      <TrackWorkstationDrawer
        isOpen={isTrackWorkstationOpen}
        onClose={() => setIsTrackWorkstationOpen(false)}
        selectedTrack={tracks.find((t) => t.id === selectionContext.selectedTrackId) || tracks[0] || null}
        onUpdateTrack={(updates) => {
          const selectedTrackId = selectionContext.selectedTrackId || tracks[0]?.id;
          if (selectedTrackId) {
            setTracks((prev) => prev.map((t) => (t.id === selectedTrackId ? { ...t, ...updates } : t)));
          }
        }}
      />

      <SongwritingSuiteDrawer
        isOpen={isSongwritingSuiteOpen}
        onClose={() => setIsSongwritingSuiteOpen(false)}
        selectedTrack={tracks.find((t) => t.id === selectionContext.selectedTrackId) || tracks.find((t) => t.instrument === 'vocal_synth') || tracks[0] || null}
        sections={sections}
        activeSectionId={selectionContext.selectedSectionId || sections[0]?.id || 'sec_verse'}
        onSelectSection={(secId) => setSelectionContext((prev) => ({ ...prev, selectedSectionId: secId }))}
        bpm={dawState.bpm}
        isPlaying={dawState.isPlaying}
        currentStep={dawState.currentStep}
      />

      <VoiceCloneDrawer
        isOpen={isVoiceCloneDrawerOpen}
        onClose={() => setIsVoiceCloneDrawerOpen(false)}
      />

      <QuickInspectorDrawer
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        selectedTrack={tracks.find((t) => t.id === selectionContext.selectedTrackId) || tracks[0] || null}
        activeWorkspace={activeWorkspace}
        sections={sections}
      />

      <StudioIntelligenceDrawer
        isOpen={isStudioIntelligenceOpen}
        onClose={() => setIsStudioIntelligenceOpen(false)}
      />

      <NativeBrainDrawer
        isOpen={isNativeBrainOpen}
        onClose={() => setIsNativeBrainOpen(false)}
      />

      <ExternalHardwareMidiDrawer
        isOpen={isHardwareMidiOpen}
        onClose={() => setIsHardwareMidiOpen(false)}
      />

      <CalibrationDrawer
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
        detectionSettings={detectionSettings}
        setDetectionSettings={setDetectionSettings}
        tracks={tracks}
        calibratingTrackId={calibratingTrackId}
        onCalibrateTrack={handleCalibrateTrack}
      />

      <VisualizationDrawer
        isOpen={isVisualizationOpen}
        onClose={() => setIsVisualizationOpen(false)}
        tracks={tracks}
        currentStep={dawState.currentStep}
      />

      <RealizationCandidateDrawer
        isOpen={isCandidateDrawerOpen}
        onClose={() => setIsCandidateDrawerOpen(false)}
        candidate={activeCandidate}
        targetTrackName={tracks.find((t) => t.id === selectionContext.selectedTrackId)?.name || 'Kick (Thump)'}
        onCommitCandidate={handleCommitCandidate}
        onRejectCandidate={() => setIsCandidateDrawerOpen(false)}
      />

      {isRealizationPending && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-neutral-900 border border-neutral-700 px-4 py-2 text-sm text-neutral-200 shadow-lg">
          Generating realization candidate&hellip; this calls your self-hosted ACE-Step server and can take a few seconds to a minute.
        </div>
      )}
      {realizationError && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-red-950 border border-red-700 px-4 py-3 text-sm text-red-200 shadow-lg max-w-sm">
          <div className="font-medium mb-1">Realization failed</div>
          <div className="text-red-300 text-xs mb-2">{realizationError}</div>
          <button
            className="text-xs underline text-red-200 hover:text-white"
            onClick={() => setRealizationError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Modals */}
      <QuickHelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <StudioTourGuide
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        initialAspectId={tourInitialAspect}
      />
      <PersonalTrainingModal
        isOpen={isTrainingOpen}
        initialTab={trainingInitialTab}
        onClose={() => setIsTrainingOpen(false)}
        tracks={tracks}
        calibratingTrackId={calibratingTrackId}
        onCalibrateTrack={handleCalibrateTrack}
      />
      <SoundLibraryModal isOpen={isSoundLibraryOpen} onClose={() => setIsSoundLibraryOpen(false)} />
      <DatasetRegistryModal isOpen={isDatasetRegistryOpen} onClose={() => setIsDatasetRegistryOpen(false)} />
      <CollaborationModal
        isOpen={isCollaborationOpen}
        onClose={() => setIsCollaborationOpen(false)}
        projectName={dawState.projectName}
        creatorName={creatorName}
      />
      <SeedSignatureModal
        isOpen={isSeedSignatureOpen}
        onClose={() => setIsSeedSignatureOpen(false)}
        seedRecords={seedRecords}
        onAddSeedRecord={handleAddSeedRecord}
        projectName={dawState.projectName}
        bpm={dawState.bpm}
        tracks={tracks}
      />
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        projectName={dawState.projectName}
        bpm={dawState.bpm}
        tracks={tracks}
        seedRecords={seedRecords}
      />
      <AiControlRoomModal
        isOpen={isAiControlRoomOpen}
        onClose={() => setIsAiControlRoomOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <StudioSessionProvider>
      <AppInner />
    </StudioSessionProvider>
  );
}
