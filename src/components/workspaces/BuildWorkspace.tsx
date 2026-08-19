import React from 'react';
import { useStudioSession } from '../../app/StudioSessionContext';
import { SectionBuilder } from '../SectionBuilder';
import { ShootAroundControls } from '../ShootAroundControls';
import { Layers, Wand2, Plus, Sparkles, RefreshCw, Grid } from 'lucide-react';
import { ArrangementSection } from '../../types/daw';

export const BuildWorkspace: React.FC = () => {
  const {
    sections,
    setSections,
    tracks,
    selectionContext,
    setSelectionContext,
    handleCloneBarToAll,
    handleNudgeTrackPattern,
    handleInvertPattern,
    handleClearTrack,
    handleClearAll,
    handleRandomize,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
    handleAddTrack,
    handleUpdateSections,
    dawState,
    updateEditorPrefs,
  } = useStudioSession();

  const selectedSection = sections.find((s) => s.id === selectionContext.selectedSectionId) || sections[0] || null;

  return (
    <div className="w-full space-y-6 pb-8">
      {/* Workspace Header */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-100">Song Timeline & Arrangement Workspace</h2>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 text-[10px] font-mono border border-cyan-500/30">
                Composition Authority
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Build full arrangements across Intro, Verse, Hook, Chorus & Outro without leaving live project state.
            </p>
          </div>
        </div>

        {/* AI Realization Quick Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleAddTrack('melody')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer border border-slate-700"
          >
            <Plus className="w-4 h-4 text-cyan-400" />
            <span>+ Add Instrument</span>
          </button>

          <button className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 hover:bg-cyan-400 text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer shadow-lg shadow-cyan-500/20">
            <Wand2 className="w-4 h-4" />
            <span>AI Realization</span>
          </button>
        </div>
      </div>

      {/* Structural Authority: Song Section Timeline Builder */}
      <div className="w-full">
        <SectionBuilder
          sections={sections}
          onUpdateSections={handleUpdateSections}
          tracks={tracks}
          currentStep={dawState.currentStep}
          onSelectBarView={(barView) => updateEditorPrefs({ activeBarView: barView })}
        />
      </div>

      {/* Section-Scoped Intelligence Lanes Overview */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Grid className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-200">
              Arrangement Scoped Focus:{' '}
              <span className="text-amber-400 font-mono">{selectedSection?.name || 'Full Song'}</span>
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Bar Range: {selectedSection?.bars ? `Bar ${selectedSection.bars.join(', ')}` : 'All Bars'}
          </span>
        </div>

        {/* Intelligence Lanes Timeline Blocks */}
        <div className="space-y-3">
          {tracks.map((track) => (
            <div
              key={track.id}
              className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between"
            >
              <div className="flex items-center space-x-3 w-48">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: track.color || '#3b82f6' }} />
                <span className="text-xs font-semibold text-slate-200">{track.name}</span>
              </div>

              {/* Block visualization */}
              <div className="flex-1 grid grid-cols-4 gap-2 mx-4">
                {[1, 2, 3, 4].map((barNum) => {
                  const isHighlighted = selectedSection?.bars.includes(barNum);
                  const activeCount = track.steps.slice((barNum - 1) * 16, barNum * 16).filter(Boolean).length;
                  return (
                    <div
                      key={barNum}
                      className={`h-8 rounded-lg border flex items-center justify-center text-[10px] font-mono transition-all ${
                        isHighlighted
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold shadow-inner'
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                    >
                      Bar {barNum}: {activeCount} steps
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <button
                onClick={() => handleNudgeTrackPattern(track.id, 'right')}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold cursor-pointer"
              >
                Nudge
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Shoot Around Transformation Panel */}
      <div className="w-full">
        {/* Prop names the component actually declares. The previous four were
            invented — onCloneBarToAll, onNudgeGlobal, onRandomize and an
            onInvertPattern that was never passed at all — so every button in
            this cluster called undefined. */}
        <ShootAroundControls
          onCloneBar1ToAll={() => handleCloneBarToAll(0)}
          onNudgeLeft={() => handleNudgeTrackPattern('all', 'left')}
          onNudgeRight={() => handleNudgeTrackPattern('all', 'right')}
          onRandomizeBar1={() => handleRandomize(0)}
          onClearAll={handleClearAll}
          onInvertPattern={handleInvertPattern}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={() => { handleUndo(); }}
          onRedo={() => { handleRedo(); }}
        />
      </div>
    </div>
  );
};
