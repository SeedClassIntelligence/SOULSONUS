import React from 'react';
import { useStudioSession } from '../app/StudioSessionContext';
import { SeedCaptureStudio } from './SeedCaptureStudio';
import { IntegratedSoundBrowser } from './IntegratedSoundBrowser';
import { IntelligenceLaneInspector } from './IntelligenceLaneInspector';


import { StepSequencer64 } from './StepSequencer64';

import { SectionBuilder } from './SectionBuilder';
import { ShootAroundControls } from './ShootAroundControls';
import { LyricVocalStudio } from './LyricVocalStudio';
import { VocalLayer } from './VocalLayer';
import { MasterMixerConsole } from './MasterMixerConsole';
import { MixWorkspace } from './mix/MixWorkspace';
import { FinishWorkspace } from './workspaces/FinishWorkspace';
import { TrackProductionStrip } from './TrackProductionStrip';
import { WriteRecordStudio } from './WriteRecordStudio';
import { Sparkles, Layers, Mic, Sliders, ShieldCheck, ChevronUp, ChevronDown, Maximize2 } from 'lucide-react';
import { Track } from '../types/daw';

export const ContextualToolPanel: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const {
    activeWorkspace,
    tracks,
    dawState,
    sections,
    selectionContext,
    setSelectionContext,
    handleToggleMute,
    handleToggleSolo,
    handleChangeVolume,
    handleMasterVolumeChange,
    handleReverbLevelChange,
    handleDelayLevelChange,
  } = useStudioSession();

  const selectedTrack = tracks.find((t) => t.id === selectionContext.selectedTrackId) || tracks[0] || null;

  const handleUpdateSelectedTrack = (updates: Partial<Track>) => {
    if (!selectedTrack) return;
    if (updates.volume !== undefined) {
      handleChangeVolume(selectedTrack.id, updates.volume);
    }
  };

  const handleOpenAsSidePanel = () => {
    if (activeWorkspace === 'BUILD') {
      window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'workstation' }));
    } else if (activeWorkspace === 'WRITE_RECORD') {
      window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'songwriting' }));
    } else {
      window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'inspector' }));
    }
  };

  const getModeTitle = () => {
    switch (activeWorkspace) {
      case 'CREATE':
        return {
          label: 'CONTEXTUAL TOOL: INTELLIGENCE LANE INSPECTOR',
          desc: 'Inspect acoustic origin, MIDI transcription, Level 4 sound vaults, and realization candidate contracts.',
          icon: <Sparkles className="w-4 h-4 text-amber-400" />,
        };
      case 'BUILD':
        return {
          label: 'SELECTED TRACK PRODUCTION STRIP',
          desc: 'Inspect origin performance, edit 16-bar patterns & piano roll notes, audition Level 4 sound vaults, evaluate E05 candidates, sculpt sound params, and tweak channel DSP.',
          icon: <Layers className="w-4 h-4 text-cyan-400" />,
        };
      case 'WRITE_RECORD':
        return {
          label: 'CONTEXTUAL TOOL: SONGWRITING SUITE & VOCAL BOOTH',
          desc: 'Draft lyrics with 4/4 syncopated cadence and overdub synchronized vocal takes and harmonies.',
          icon: <Mic className="w-4 h-4 text-pink-400" />,
        };
      case 'MIX':
        return {
          label: 'CONTEXTUAL TOOL: DYNAMIC MULTI-TRACK MIXING CONSOLE',
          desc: 'Balance multi-track channel strips, filter EQ cutoffs, beatbox glue compression, sends, and master limiter.',
          icon: <Sliders className="w-4 h-4 text-emerald-400" />,
        };
      case 'FINISH':
      case 'MASTER':
      case 'RELEASE':
        return {
          label: 'CONTEXTUAL TOOL: BUSINESS, PROVENANCE & EXPORT LAYER',
          desc: 'Review collaborator splits, sign SeedSignature cryptographic hashes, verify licenses, and download master packages.',
          icon: <ShieldCheck className="w-4 h-4 text-purple-400" />,
        };
      default:
        return {
          label: 'CONTEXTUAL TOOL: INTELLIGENCE LANE INSPECTOR',
          desc: 'Inspect acoustic origin, MIDI transcription, Level 4 sound vaults, and realization candidate contracts.',
          icon: <Sparkles className="w-4 h-4 text-amber-400" />,
        };
    }
  };

  const mode = getModeTitle();

  return (
    <div className="w-full bg-slate-950/90 border border-slate-800/90 rounded-2xl p-4 shadow-2xl space-y-4">
      {/* Tool Panel Sub-header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
            {mode.icon}
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold text-slate-200">{mode.label}</h3>
            <p className="text-[10px] text-slate-400">{mode.desc}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleOpenAsSidePanel}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold flex items-center space-x-1.5 transition cursor-pointer"
            title="Open this workspace as a full side panel alongside the DAW canvas"
          >
            <Maximize2 className="w-3 h-3" />
            <span className="hidden sm:inline">OPEN AS SIDE PANEL</span>
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-[10px] font-bold transition cursor-pointer"
            title={isCollapsed ? 'Expand tool panel' : 'Collapse tool panel'}
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
          <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-400 font-mono text-[10px] border border-slate-800">
            MODE: {activeWorkspace}
          </span>
        </div>
      </div>

      {/* Dynamic Workspace Tool Interior */}
      {!isCollapsed && (
        <div className="w-full">
        {/* MODE 1: CREATE -> Live Acoustic Capture & Intelligence Lane */}
        {activeWorkspace === 'CREATE' && (
          <IntelligenceLaneInspector
            selectedTrack={selectedTrack}
            tracks={tracks}
            onUpdateTrack={handleUpdateSelectedTrack}
          />
        )}

        {/* MODE 2: BUILD -> Multi-Bar Section Builder & Arrangement Energy Engine */}
        {activeWorkspace === 'BUILD' && (
          <SectionBuilder />
        )}

        {/* MODE 3: WRITE & RECORD -> Full Vocal-Writing, Take Stack, Overdub & Stem Studio */}
        {activeWorkspace === 'WRITE_RECORD' && (
          <WriteRecordStudio
            track={selectedTrack}
            sections={sections}
            activeSectionId={selectionContext.selectedSectionId || sections[0]?.id || 'sec_verse'}
            onSelectSection={(secId) => setSelectionContext((prev) => ({ ...prev, selectedSectionId: secId }))}
            bpm={dawState.bpm}
            isPlaying={dawState.isPlaying}
            currentStep={dawState.currentStep}
            tracks={tracks}
          />
        )}

        {/* MODE 4: MIX -> Complete Multichannel Engineering Console */}
        {activeWorkspace === 'MIX' && (
          <MixWorkspace />
        )}

        {/* MODE 5: FINISH / MASTER / RELEASE -> Business, Provenance & Export Layer */}
        {(activeWorkspace === 'FINISH' || activeWorkspace === 'MASTER' || activeWorkspace === 'RELEASE') && (
          <FinishWorkspace />
        )}
      </div>
      )}
    </div>
  );
};
