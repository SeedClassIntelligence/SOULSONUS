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
import { InstrumentRoom } from './components/InstrumentRoom';
import { VoiceCloneDrawer } from './components/inspectors/VoiceCloneDrawer';
import { ExternalHardwareMidiDrawer } from './components/inspectors/ExternalHardwareMidiDrawer';
import { CalibrationDrawer } from './components/inspectors/CalibrationDrawer';
import { VisualizationDrawer } from './components/inspectors/VisualizationDrawer';
import { RealizationCandidateDrawer } from './components/RealizationCandidateDrawer';
import { StudioIntelligenceDrawer } from './components/StudioIntelligenceDrawer';
import { NativeBrainDrawer } from './components/inspectors/NativeBrainDrawer';
import { MixWorkspace } from './components/mix/MixWorkspace';
import { FinishMasterWorkspace } from './components/finish/FinishMasterWorkspace';
import { FinalizationGateAndSign } from './components/finish/FinalizationGateAndSign';
import { WriteRecordWorkspace } from './components/workspaces/WriteRecordWorkspace';
import { RealizationRouter } from './lib/realizationRouter';
import { proposeRealization } from './lib/realizationProposal';
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
import { VirtualPianoKeyboard } from './components/VirtualPianoKeyboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProjectMenu } from './components/ProjectMenu';
import { StudioUtilityBar } from './components/StudioUtilityBar';

import { audioEngine } from './audio/audioEngine';
import { detectionEngine } from './audio/detectionEngine';
import { VoiceCommandResult } from './audio/voiceCommands';
import { VoiceCommandBar } from './components/VoiceCommandBar';
import { SoulFlowOrchestratorBar } from './components/SoulFlowOrchestratorBar';
import { Preset } from './types/daw';
import { LandingPage } from './components/LandingPage';

interface AppInnerProps {
  onBackToLanding?: () => void;
}

// Input types that genuinely swallow an undo shortcut. A range, checkbox or
// radio does not — undo must keep working while a fader has focus.
const TEXT_INPUT_TYPES = new Set(['text', 'search', 'email', 'url', 'tel', 'password', 'number', 'date', 'time']);

const AppInner: React.FC<AppInnerProps> = ({ onBackToLanding }) => {
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
    handleStepChange,
    tracks,
    setTracks,
    sections,
    detectionSettings,
    setDetectionSettings,
    seedRecords,
    handleAddSeedRecord,
    calibratingTrackId,
    handleCalibrateTrack,
    creatorName,
    selectionContext,
    setSelectionContext,
    handleCommitCandidateTransaction,
    handleUndo,
    handleRedo,
    handleUpdateTrack,
    audioAssets,
    handleCloneBarToAll,
    handleNudgeTrackPattern,
    handleInvertPattern,
    handleClearTrack,
    handleStopCapture,
    creatorSignature,
    handleSaveCreatorSignature,
    isInstrumentOpen,
    setIsInstrumentOpen,
    isInstrumentFull,
    setIsInstrumentFull,
  } = useStudioSession();

  // Undo was reachable only from the Build room's control cluster, while takes
  // are recorded in Create — so undoing one meant leaving the room it was made
  // in. The keyboard works everywhere the studio does.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'z' || !(e.metaKey || e.ctrlKey)) return;
      const el = document.activeElement as HTMLElement | null;
      // Never steal undo from a field the creator is typing in — but a fader is
      // an <input> too, and having undo go dead because a slider still has focus
      // would be worse than the gap this shortcut closes.
      const typing =
        !!el &&
        (el.isContentEditable ||
          el.tagName === 'TEXTAREA' ||
          (el.tagName === 'INPUT' && TEXT_INPUT_TYPES.has(((el as HTMLInputElement).type || 'text').toLowerCase())));
      if (typing) return;
      e.preventDefault();
      if (e.shiftKey) handleRedo();
      else handleUndo();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo]);

  // Modals & Drawers
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [tourInitialAspect, setTourInitialAspect] = useState<TourAspectId>('OVERVIEW');
  const [isTrainingOpen, setIsTrainingOpen] = useState(false);
  const [trainingInitialTab] = useState<'TRAINING_PILLARS' | 'VOICE_CLONING_LAB' | 'SOUND_VAULT'>('TRAINING_PILLARS');
  const [isSoundLibraryOpen, setIsSoundLibraryOpen] = useState(false);
  const [isDatasetRegistryOpen, setIsDatasetRegistryOpen] = useState(false);
  const [isCollaborationOpen, setIsCollaborationOpen] = useState(false);
  const [isSeedSignatureOpen, setIsSeedSignatureOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isAiControlRoomOpen, setIsAiControlRoomOpen] = useState(false);
  const [isPianoOpen, setIsPianoOpen] = useState(false);
  const [isSoulFlowOpen, setIsSoulFlowOpen] = useState(false);

  // Drawers
  const [isStudioIntelligenceOpen, setIsStudioIntelligenceOpen] = useState(false);
  const [isTrackWorkstationOpen, setIsTrackWorkstationOpen] = useState(false);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [isSongwritingSuiteOpen, setIsSongwritingSuiteOpen] = useState(false);
  /** The instrument's full Train / Play / Packs room, opened from the strip. */
  const [isHardwareMidiOpen, setIsHardwareMidiOpen] = useState(false);
  const [isNativeBrainOpen, setIsNativeBrainOpen] = useState(false);
  const [isCandidateDrawerOpen, setIsCandidateDrawerOpen] = useState(false);
  const [activeCandidate, setActiveCandidate] = useState<GenerationCandidate | null>(null);
  const [isRealizationPending, setIsRealizationPending] = useState(false);
  const [realizationError, setRealizationError] = useState<string | null>(null);

  const handleOpenProposal = useCallback((trackId?: string) => {
    const targetTrack = tracks.find((t) => t.id === trackId) || tracks[0];
    // This opened the drawer on a demo candidate: an asset id ending `_demo`
    // and four literal scores (0.985 / 0.98 / 0.965 / 0.892) that the drawer
    // then rendered as a passing Intent Contract. Nothing had been realized
    // and nothing had been measured. It opens on an honest proposal now, and
    // the drawer shows it as unrealized until a realization actually runs.
    setActiveCandidate(
      proposeRealization({
        route: 'ACE_PERFORMANCE_TRANSFER',
        targetRole: targetTrack?.instrument || 'kick',
        prompt: `Realize ${targetTrack?.name || 'this track'}`,
        backend: 'ACERealizer',
        modelVersion: 'ace-step-1.5',
        modifiedProperties: ['timbre', 'low_freq_energy', 'saturation'],
        intendedInvariants: ['rhythm', 'timing', 'pitchContour'],
      })
    );
    setIsCandidateDrawerOpen(true);
  }, [tracks]);

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

  // Write & Record used to auto-open the full Songwriting Suite drawer on
  // arrival, covering the room's own lyric studio and quick vocal recorder
  // the same way Build's drawer once covered the section builder -- that
  // case was already removed for Build; this was the other half of it.
  // The room works on its own now; the Suite is a deliberate pull-out via
  // the Studio Utilities button, same as Track Workstation for Mix.

  // Listen for drawer/modal open events dispatched from UI components
  useEffect(() => {
    const handleDrawerEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === 'inspector') setIsInspectorOpen((prev) => !prev);
      if (detail === 'workstation') setIsTrackWorkstationOpen((prev) => !prev);
      if (detail === 'songwriting' || detail === 'vocal') setIsSongwritingSuiteOpen((prev) => !prev);
      if (detail === 'voiceclone' || detail === 'voice') setIsVoiceCloneDrawerOpen((prev) => !prev);
      if (detail === 'hardware' || detail === 'midi') setIsHardwareMidiOpen((prev) => !prev);
      if (detail === 'intelligence') setIsStudioIntelligenceOpen((prev) => !prev);
      if (detail === 'nativebrain' || detail === 'brain') setIsNativeBrainOpen((prev) => !prev);
      if (detail === 'calibration') setIsCalibrationOpen((prev) => !prev);
      if (detail === 'visualization' || detail === 'radar') setIsVisualizationOpen((prev) => !prev);
      if (detail === 'seedsignature' || detail === 'signature_inspector') setIsSeedSignatureOpen(true);
      if (detail === 'training') setIsTrainingOpen(true);
      if (detail === 'vault' || detail === 'library') setIsSoundLibraryOpen(true);
      if (detail === 'collab' || detail === 'collaboration') setIsCollaborationOpen(true);
      if (detail === 'export') setIsExportOpen(true);
      if (detail === 'projects' || detail === 'save') setIsProjectMenuOpen(true);
      if (detail === 'piano' || detail === 'keyboard') setIsPianoOpen((prev) => !prev);
      if (detail === 'soulflow' || detail === 'pipeline') setIsSoulFlowOpen((prev) => !prev);
      if (detail === 'capture' || detail === 'performance') setIsInstrumentOpen((prev) => !prev);

      if (detail === 'proposal' || detail === 'realization' || (typeof detail === 'object' && detail?.type === 'realization')) {
        const trId = typeof detail === 'object' ? detail?.trackId : undefined;
        const targetTrack = tracks.find((t) => t.id === trId) || tracks[0];
        const route: RealizationRoute = typeof detail === 'object' && detail?.route
          ? detail.route
          : targetTrack?.sourceTakeAudioUrl
          ? 'ACE_PERFORMANCE_TRANSFER'
          : 'INSTRUMENT';
        if (targetTrack) {
          setIsRealizationPending(true);
          RealizationRouter.createCandidate({
            sourceTrack: targetTrack,
            targetRole: targetTrack.instrument || 'kick',
            route,
            prompt: typeof detail === 'object' ? detail?.prompt : `Realize ${targetTrack.name} with ${route}`,
            projectVersion: dawState.projectVersion || 'v1.0.0',
            creatorSignature,
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
  }, [handleOpenProposal, tracks, dawState.projectVersion, creatorSignature, setIsInspectorOpen, setIsCalibrationOpen, setIsVisualizationOpen]);

  // Play / Stop / Mic Handlers
  const handleTogglePlay = useCallback(async () => {
    if (dawState.isPlaying) {
      audioEngine.stopSequencer();
      audioEngine.clearAudioClips();
      setDawState((prev) => ({ ...prev, isPlaying: false }));
    } else {
      await audioEngine.init();
      // Clips are scheduled before the transport rolls, since a player synced
      // after the start would miss its own cue.
      await audioEngine.syncAudioClips(tracks, audioAssets, dawState.bpm || 110);
      audioEngine.startSequencer(
        () => tracks,
        (step) => handleStepChange(step),
        () => (dawState.songBars || 4) * 16
      );
      setDawState((prev) => ({ ...prev, isPlaying: true }));
    }
  }, [dawState.isPlaying, tracks, audioAssets, dawState.bpm, dawState.songBars, handleStepChange, setDawState]);

  const handleStop = useCallback(() => {
    audioEngine.stopSequencer();
    audioEngine.clearAudioClips();
    handleStepChange(0);
    setDawState((prev) => ({ ...prev, isPlaying: false }));
  }, [handleStepChange, setDawState]);

  const handleToggleMic = useCallback(async () => {
    if (detectionSettings.enabled) {
      // Every control that stops capture goes through the one path, so the
      // performance is kept whichever button ends it.
      await handleStopCapture();
    } else {
      const success = await detectionEngine.start();
      if (success) {
        setDetectionSettings((prev) => ({ ...prev, enabled: true, micConnected: true }));
      }
    }
  }, [detectionSettings.enabled, setDetectionSettings, handleStopCapture]);

  /**
   * Runs a voice command and reports what it actually did.
   *
   * The parser used to hand back a completed-sounding sentence -- "Nudged
   * pattern 1/16th step left." -- which the bar showed the moment the words
   * were parsed, before anything ran and regardless of whether anything
   * could. The parser now only says what it heard; this decides what
   * happened, and an action with no target says so.
   */
  const handleVoiceCommand = useCallback(
    (result: VoiceCommandResult): { ok: boolean; message: string } => {
      const target =
        tracks.find((t) => t.id === selectionContext.selectedTrackId) || tracks[0] || null;
      const needsTrack = () =>
        target ? null : { ok: false, message: 'No channel is selected, so there is nothing to change.' };

      switch (result.action) {
        case 'CLONE_BAR_1':
          handleCloneBarToAll(0);
          return { ok: true, message: `Cloned bar 1 across ${tracks.length} channels.` };

        case 'NUDGE_LEFT':
        case 'NUDGE_RIGHT': {
          const missing = needsTrack();
          if (missing) return missing;
          const dir = result.action === 'NUDGE_LEFT' ? 'left' : 'right';
          handleNudgeTrackPattern(target!.id, dir);
          return { ok: true, message: `Nudged ${target!.name} one 16th ${dir}.` };
        }

        case 'INVERT_PATTERN': {
          const before = tracks.reduce((n, t) => n + (t.steps || []).filter(Boolean).length, 0);
          handleInvertPattern();
          return { ok: true, message: `Inverted the grid — ${before} active steps become their opposite.` };
        }

        case 'CLEAR_ALL': {
          const missing = needsTrack();
          if (missing) return missing;
          const had = (target!.steps || []).filter(Boolean).length;
          handleClearTrack(target!.id);
          return { ok: true, message: `Cleared ${had} steps from ${target!.name}.` };
        }

        case 'TOGGLE_PLAY': {
          const wasPlaying = dawState.isPlaying;
          void handleTogglePlay();
          return { ok: true, message: wasPlaying ? 'Stopped the transport.' : 'Started the transport.' };
        }

        case 'TOGGLE_REC': {
          const wasOn = detectionSettings.enabled;
          void handleToggleMic();
          return { ok: true, message: wasOn ? 'Microphone off.' : 'Microphone on.' };
        }

        case 'CHANGE_BPM': {
          const delta = result.payload?.bpmDelta ?? 0;
          const from = dawState.bpm || 110;
          const to = Math.max(40, Math.min(240, result.payload?.targetBpm ?? from + delta));
          setDawState((prev) => ({ ...prev, bpm: to }));
          void audioEngine.setBPM(to);
          return { ok: true, message: `Tempo ${from} → ${to} BPM.` };
        }

        case 'REPLACE_SOUND_QUERY':
          // Honest about the seam: the command is understood and there is no
          // sound-swap action behind it yet, so it says so rather than
          // reporting a search it did not run.
          return {
            ok: false,
            message: `Heard a request for a ${result.payload?.targetInstrument || 'sound'}. Choosing sounds is in the channel workstation — this command cannot do it yet.`,
          };

        default:
          return { ok: false, message: result.feedbackText };
      }
    },
    [
      tracks,
      selectionContext.selectedTrackId,
      dawState.isPlaying,
      dawState.bpm,
      detectionSettings.enabled,
      handleCloneBarToAll,
      handleNudgeTrackPattern,
      handleInvertPattern,
      handleClearTrack,
      handleTogglePlay,
      handleToggleMic,
      setDawState,
    ]
  );


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
        onOpenSoundLibrary={() => setIsSoundLibraryOpen(true)}
        onOpenDatasetRegistry={() => setIsDatasetRegistryOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenProjects={() => setIsProjectMenuOpen(true)}
        onBackToLanding={onBackToLanding}
        isMicActive={detectionSettings.enabled}
      />

      {/* 5 Creator Workspace Navigation Tabs */}
      <WorkspaceNav
        activeWorkspace={activeWorkspace}
        onSelectWorkspace={setActiveWorkspace}
        soulFlowStageLabel={dawState.soulFlowState}
      />

      {/* Sleek Collapsible Studio Utilities Bar */}
      <div className="pt-2">
        <StudioUtilityBar />
      </div>

      {/* Main Studio Canvas & 6-Workspace Room Switching */}
      <main className="flex-1 p-3 md:p-4 max-w-[1440px] w-full mx-auto space-y-3">
        {focusTrackId ? (
          <FocusModeView />
        ) : isInstrumentFull ? (
          <InstrumentRoom onClose={() => setIsInstrumentFull(false)} />
        ) : activeWorkspace === 'MIX' ? (
          <MixWorkspace />
        ) : activeWorkspace === 'MASTER' ? (
          <FinishMasterWorkspace />
        ) : activeWorkspace === 'RELEASE' ? (
          <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-4 space-y-4 font-mono text-xs">
            <div className="px-4 py-2 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center justify-between">
              <span className="font-bold text-purple-300">ROOM 6: RELEASE & SEEDSIGNATURE PROVENANCE</span>
              <span className="text-[10px] text-slate-400">5-Gate Quality Finalization • SHA-256 Ledger • 24-Bit / FLAC Export</span>
            </div>
            <FinalizationGateAndSign />
          </div>
        ) : activeWorkspace === 'WRITE_RECORD' ? (
          <WriteRecordWorkspace />
        ) : (
          // Create and Build were two destinations for one continuous act --
          // beatbox, shape it, beatbox more -- so a session that used to be
          // spent crossing between them now happens on this one screen.
          // 'BUILD' is kept only so a project saved before this merge still
          // resolves somewhere real instead of a blank room.
          <StudioCanvas />
        )}
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
          // Through the session, so the edit is undoable — this used to write
          // tracks directly and could not be taken back.
          if (selectedTrackId) handleUpdateTrack(selectedTrackId, updates);
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
        onToggleMic={handleToggleMic}
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
      <ProjectMenu isOpen={isProjectMenuOpen} onClose={() => setIsProjectMenuOpen(false)} />

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
        onSaveSignature={handleSaveCreatorSignature}
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
      />
      <AiControlRoomModal
        isOpen={isAiControlRoomOpen}
        onClose={() => setIsAiControlRoomOpen(false)}
      />
      <VirtualPianoKeyboard
        isOpen={isPianoOpen}
        onClose={() => setIsPianoOpen(false)}
      />

      {/*
        * The pipeline gate. `soulFlowState` has been on the project state all
        * along and nothing ever validated a move between stages, so it
        * advanced or did not with no requirement checked. The governor that
        * does the checking existed, with a passing test, and no file rendered
        * the bar that calls it.
        */}
      {isSoulFlowOpen && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 w-[min(1100px,94vw)]">
          <SoulFlowOrchestratorBar
            currentState={dawState.soulFlowState || 'CAPTURED'}
            onSelectState={(next) => setDawState((prev) => ({ ...prev, soulFlowState: next }))}
            onOpenSeedSignature={() => setIsSeedSignatureOpen(true)}
            onAddSeedRecord={handleAddSeedRecord}
            validationContext={{
              tracks,
              detectionSettings,
              seedRecords,
              project: {
                id: dawState.projectVersion || 'proj_root',
                name: dawState.projectName || 'Untitled',
                bpm: dawState.bpm || 110,
                soulFlowState: dawState.soulFlowState || 'CAPTURED',
                tracks,
              },
              creatorName,
            }}
          />
          <button
            onClick={() => setIsSoulFlowOpen(false)}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
            title="Close the pipeline"
          >
            ×
          </button>
        </div>
      )}

    </div>
  );
};

export default function App() {
  const [viewMode, setViewMode] = useState<'LANDING' | 'STUDIO'>(() => {
    if (
      typeof window !== 'undefined' &&
      (window.location.hash === '#studio' || window.location.search.includes('view=studio'))
    ) {
      return 'STUDIO';
    }
    return 'LANDING';
  });

  const handleEnterStudio = () => {
    setViewMode('STUDIO');
    if (typeof window !== 'undefined') {
      window.location.hash = 'studio';
    }
  };

  const handleBackToLanding = () => {
    setViewMode('LANDING');
    if (typeof window !== 'undefined') {
      window.location.hash = '';
    }
  };

  if (viewMode === 'LANDING') {
    return <LandingPage onEnterStudio={handleEnterStudio} />;
  }

  return (
    <ErrorBoundary>
      <StudioSessionProvider>
        <AppInner onBackToLanding={handleBackToLanding} />
      </StudioSessionProvider>
    </ErrorBoundary>
  );
}
