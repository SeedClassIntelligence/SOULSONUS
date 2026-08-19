import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Track, ArrangementSection, SectionTag } from '../types/daw';
import {
  Layers,
  Wand2,
  Plus,
  Trash2,
  Sparkles,
  Sliders,
  Tag,
  Music,
  Check,
  ChevronRight,
  Info,
  VolumeX,
  Volume2,
  RefreshCw,
  Zap,
  BarChart2,
  Eye,
  Activity,
  Award,
} from 'lucide-react';

export interface SectionBuilderProps {
  tracks: Track[];
  currentStep: number;
  sections: ArrangementSection[];
  onUpdateSections: (sections: ArrangementSection[]) => void;
  onSelectBarView: (barView: 'all' | 1 | 2 | 3 | 4) => void;
  onApplySectionMutes?: (trackMutes: Record<string, boolean>) => void;
}

const SECTION_TAG_CONFIG: Record<
  SectionTag,
  {
    label: string;
    defaultEnergy: 'low' | 'medium' | 'high' | 'peak';
    bg: string;
    border: string;
    badgeBg: string;
    textColor: string;
    description: string;
  }
> = {
  Intro: {
    label: 'Intro',
    defaultEnergy: 'low',
    bg: 'bg-blue-500/10 hover:bg-blue-500/20',
    border: 'border-blue-500/40',
    badgeBg: 'bg-blue-500 text-slate-950 font-black',
    textColor: 'text-blue-300',
    description: 'Sparse intro atmosphere setting up the rhythm foundation.',
  },
  Verse: {
    label: 'Verse',
    defaultEnergy: 'medium',
    bg: 'bg-cyan-500/10 hover:bg-cyan-500/20',
    border: 'border-cyan-500/40',
    badgeBg: 'bg-cyan-400 text-slate-950 font-black',
    textColor: 'text-cyan-300',
    description: 'Steady groove carrying storytelling lyrics or melody.',
  },
  'Pre-Chorus': {
    label: 'Pre-Chorus',
    defaultEnergy: 'high',
    bg: 'bg-amber-500/10 hover:bg-amber-500/20',
    border: 'border-amber-500/40',
    badgeBg: 'bg-amber-400 text-slate-950 font-black',
    textColor: 'text-amber-300',
    description: 'Rising tension and fill acceleration before the main hook.',
  },
  Chorus: {
    label: 'Chorus',
    defaultEnergy: 'high',
    bg: 'bg-yellow-500/10 hover:bg-yellow-500/20',
    border: 'border-yellow-500/40',
    badgeBg: 'bg-yellow-400 text-slate-950 font-black',
    textColor: 'text-yellow-300',
    description: 'Peak thematic hook with full instrumentation.',
  },
  Drop: {
    label: 'Drop',
    defaultEnergy: 'peak',
    bg: 'bg-rose-500/10 hover:bg-rose-500/20',
    border: 'border-rose-500/40',
    badgeBg: 'bg-rose-500 text-white font-black',
    textColor: 'text-rose-300',
    description: 'Maximum energy payoff with intense kick and bass drive.',
  },
  Bridge: {
    label: 'Bridge',
    defaultEnergy: 'medium',
    bg: 'bg-purple-500/10 hover:bg-purple-500/20',
    border: 'border-purple-500/40',
    badgeBg: 'bg-purple-400 text-slate-950 font-black',
    textColor: 'text-purple-300',
    description: 'Harmonic contrast or rhythmic departure from main loop.',
  },
  Breakdown: {
    label: 'Breakdown',
    defaultEnergy: 'low',
    bg: 'bg-indigo-500/10 hover:bg-indigo-500/20',
    border: 'border-indigo-500/40',
    badgeBg: 'bg-indigo-400 text-slate-950 font-black',
    textColor: 'text-indigo-300',
    description: 'Stripped back beat isolating melody or vocal harmonics.',
  },
  Outro: {
    label: 'Outro',
    defaultEnergy: 'low',
    bg: 'bg-emerald-500/10 hover:bg-emerald-500/20',
    border: 'border-emerald-500/40',
    badgeBg: 'bg-emerald-400 text-slate-950 font-black',
    textColor: 'text-emerald-300',
    description: 'Resolving fadeout or tail section ending the track.',
  },
};

const DEFAULT_SECTIONS: ArrangementSection[] = [
  {
    id: 'sec_1',
    name: 'Intro Groove',
    tag: 'Intro',
    bars: [1],
    energy: 'low',
    color: '#3b82f6',
    description: 'Minimal kick & hi-hat intro',
  },
  {
    id: 'sec_2',
    name: 'Verse Rhythm',
    tag: 'Verse',
    bars: [2],
    energy: 'medium',
    color: '#06b6d4',
    description: 'Main pocket beat with snare',
  },
  {
    id: 'sec_3',
    name: 'Main Chorus / Hook',
    tag: 'Chorus',
    bars: [3],
    energy: 'high',
    color: '#eab308',
    description: 'Full arrangement with melody lead',
  },
  {
    id: 'sec_4',
    name: 'Outro Tail',
    tag: 'Outro',
    bars: [4],
    energy: 'low',
    color: '#10b981',
    description: 'Stripped resolving tail',
  },
];

export const SectionBuilder: React.FC<SectionBuilderProps> = ({
  tracks,
  currentStep,
  sections,
  onUpdateSections,
  onSelectBarView,
  onApplySectionMutes,
}) => {
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [structureStyle, setStructureStyle] = useState<'dynamic' | 'pop' | 'edm' | 'hiphop'>('dynamic');

  const currentBarNumber = Math.floor(currentStep / 16) + 1; // 1, 2, 3, or 4

  // Analyze step density per bar (1..4) across tracks
  const barStats = useMemo(() => {
    return [1, 2, 3, 4].map((barNum) => {
      const startIndex = (barNum - 1) * 16;
      const endIndex = barNum * 16;

      let totalActiveSteps = 0;
      let kickCount = 0;
      let snareCount = 0;
      let hihatCount = 0;
      let melodyCount = 0;

      tracks.forEach((track) => {
        const barSteps = track.steps.slice(startIndex, endIndex);
        const count = barSteps.filter(Boolean).length;
        totalActiveSteps += count;

        if (track.instrument === 'kick') kickCount += count;
        if (track.instrument === 'snare') snareCount += count;
        if (track.instrument === 'hihat') hihatCount += count;
        if (track.instrument === 'melody') melodyCount += count;
      });

      // Max possible active steps per bar = tracks.length * 16
      const maxPossible = tracks.length * 16 || 64;
      const densityPercent = Math.round((totalActiveSteps / maxPossible) * 100);

      let suggestedTag: SectionTag = 'Verse';
      if (densityPercent < 15) {
        suggestedTag = barNum === 1 ? 'Intro' : 'Outro';
      } else if (densityPercent > 45 || (kickCount > 4 && melodyCount > 4)) {
        suggestedTag = 'Chorus';
      } else if (snareCount > 4 && hihatCount > 8) {
        suggestedTag = 'Pre-Chorus';
      } else if (kickCount > 2 && snareCount > 2) {
        suggestedTag = 'Verse';
      }

      return {
        barNum,
        totalActiveSteps,
        densityPercent,
        kickCount,
        snareCount,
        hihatCount,
        melodyCount,
        suggestedTag,
      };
    });
  }, [tracks]);

  // Current active section based on current playing bar
  const activeSection = useMemo(() => {
    return sections.find((sec) => sec.bars.includes(currentBarNumber));
  }, [sections, currentBarNumber]);

  // Heuristic Generator Logic
  const handleGenerateStructure = (style: 'dynamic' | 'pop' | 'edm' | 'hiphop' = structureStyle) => {
    const generated: ArrangementSection[] = [];

    if (style === 'pop') {
      generated.push(
        {
          id: `sec_pop_1_${Date.now()}`,
          name: 'Intro Verse',
          tag: 'Intro',
          bars: [1],
          energy: 'low',
          color: '#3b82f6',
          description: 'Acoustic / vocal beatbox intro',
        },
        {
          id: `sec_pop_2_${Date.now()}`,
          name: 'Verse 1 Groove',
          tag: 'Verse',
          bars: [2],
          energy: 'medium',
          color: '#06b6d4',
          description: 'Rhythmic kick-snare pocket',
        },
        {
          id: `sec_pop_3_${Date.now()}`,
          name: 'Chorus Lead Hook',
          tag: 'Chorus',
          bars: [3],
          energy: 'high',
          color: '#eab308',
          description: 'Full arrangement with lead melody',
        },
        {
          id: `sec_pop_4_${Date.now()}`,
          name: 'Outro Fade',
          tag: 'Outro',
          bars: [4],
          energy: 'low',
          color: '#10b981',
          description: 'Tail resolving loop',
        }
      );
    } else if (style === 'edm') {
      generated.push(
        {
          id: `sec_edm_1_${Date.now()}`,
          name: 'Intro Atmosphere',
          tag: 'Intro',
          bars: [1],
          energy: 'low',
          color: '#3b82f6',
          description: 'Filtered intro pulse',
        },
        {
          id: `sec_edm_2_${Date.now()}`,
          name: 'Snare Roll Build',
          tag: 'Pre-Chorus',
          bars: [2],
          energy: 'high',
          color: '#f59e0b',
          description: 'Accelerating snare tension',
        },
        {
          id: `sec_edm_3_${Date.now()}`,
          name: 'Main Peak Drop',
          tag: 'Drop',
          bars: [3],
          energy: 'peak',
          color: '#f43f5e',
          description: 'Maximum sub kick + synths',
        },
        {
          id: `sec_edm_4_${Date.now()}`,
          name: 'Outro Breakdown',
          tag: 'Breakdown',
          bars: [4],
          energy: 'low',
          color: '#6366f1',
          description: 'Isolated vocal synth tail',
        }
      );
    } else if (style === 'hiphop') {
      generated.push(
        {
          id: `sec_hip_1_${Date.now()}`,
          name: 'Intro Sample',
          tag: 'Intro',
          bars: [1],
          energy: 'low',
          color: '#3b82f6',
          description: 'Melody loop intro',
        },
        {
          id: `sec_hip_2_${Date.now()}`,
          name: 'Main Verse BoomBap',
          tag: 'Verse',
          bars: [2, 3],
          energy: 'high',
          color: '#06b6d4',
          description: 'Heavy kick snare pocket with hi-hats',
        },
        {
          id: `sec_hip_4_${Date.now()}`,
          name: 'Outro Hook',
          tag: 'Outro',
          bars: [4],
          energy: 'medium',
          color: '#10b981',
          description: 'Scratched outro tail',
        }
      );
    } else {
      // Dynamic Heuristic Mapping based on bar density analysis
      barStats.forEach((stat) => {
        let tag: SectionTag = stat.suggestedTag;
        let energy: 'low' | 'medium' | 'high' | 'peak' = 'medium';

        if (tag === 'Intro' || tag === 'Outro' || tag === 'Breakdown') energy = 'low';
        else if (tag === 'Verse' || tag === 'Bridge') energy = 'medium';
        else if (tag === 'Chorus' || tag === 'Pre-Chorus') energy = 'high';
        else if (tag === 'Drop') energy = 'peak';

        const config = SECTION_TAG_CONFIG[tag];

        generated.push({
          id: `sec_dyn_${stat.barNum}_${Date.now()}`,
          name: `Bar ${stat.barNum} ${tag}`,
          tag,
          bars: [stat.barNum],
          energy,
          color: config.badgeBg.includes('blue')
            ? '#3b82f6'
            : config.badgeBg.includes('cyan')
            ? '#06b6d4'
            : config.badgeBg.includes('amber') || config.badgeBg.includes('yellow')
            ? '#eab308'
            : config.badgeBg.includes('rose')
            ? '#f43f5e'
            : '#10b981',
          description: `Pattern Density: ${stat.densityPercent}% (${stat.totalActiveSteps} active triggers)`,
        });
      });
    }

    onUpdateSections(generated);
  };

  const handleAddSection = () => {
    const newBar = Math.min(4, sections.length + 1);
    const newSec: ArrangementSection = {
      id: `sec_custom_${Date.now()}`,
      name: `Custom Section ${sections.length + 1}`,
      tag: 'Verse',
      bars: [newBar],
      energy: 'medium',
      color: '#06b6d4',
      description: 'Custom arrangement segment',
    };
    onUpdateSections([...sections, newSec]);
  };

  const handleDeleteSection = (id: string) => {
    onUpdateSections(sections.filter((s) => s.id !== id));
  };

  const handleUpdateSectionField = (id: string, field: keyof ArrangementSection, value: any) => {
    onUpdateSections(
      sections.map((sec) => {
        if (sec.id === id) {
          const updated = { ...sec, [field]: value };
          if (field === 'tag') {
            const config = SECTION_TAG_CONFIG[value as SectionTag];
            updated.energy = config.defaultEnergy;
          }
          return updated;
        }
        return sec;
      })
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl select-none">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-100 flex items-center gap-2">
              ARRANGEMENT SECTION BUILDER
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40">
                PHASE 06: STRUCTURE
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Map pattern bar indices to arrangement tags (Intro, Verse, Chorus, Drop) with automated structure heuristics.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Generate Structure Heuristics */}
          <button
            type="button"
            id="btn-generate-structure-heuristics"
            onClick={() => handleGenerateStructure()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 text-slate-950 text-xs font-extrabold transition shadow-md shadow-amber-500/20 active:scale-95"
            title="Auto-analyze active patterns and map arrangement sections"
          >
            <Wand2 className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
            <span>GENERATE STRUCTURE</span>
          </button>

          {/* Add Custom Section */}
          <button
            type="button"
            id="btn-add-section"
            onClick={handleAddSection}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>ADD SEGMENT</span>
          </button>
        </div>
      </div>

      {/* Bar Density & Real-time Playhead Visualizer */}
      <div className="mb-4 bg-slate-950 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-400 mb-2">
          <span className="flex items-center gap-1.5 text-slate-200">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            LIVE ARRANGEMENT TIMELINE & PATTERN DENSITY
          </span>
          {activeSection && (
            <span className="text-xs text-amber-300 font-mono bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40">
              NOW PLAYING: <strong className="uppercase">{activeSection.name}</strong> (BAR {currentBarNumber})
            </span>
          )}
        </div>

        {/* 4-Bar Timeline Strip */}
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((barNum) => {
            const stat = barStats.find((s) => s.barNum === barNum);
            const mappedSec = sections.find((s) => s.bars.includes(barNum));
            const isPlayingThisBar = currentBarNumber === barNum;
            const tagConfig = mappedSec ? SECTION_TAG_CONFIG[mappedSec.tag] : null;

            return (
              <div
                key={barNum}
                onClick={() => onSelectBarView(barNum as 1 | 2 | 3 | 4)}
                className={`relative p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isPlayingThisBar
                    ? 'bg-slate-900 border-amber-400 ring-2 ring-amber-400/40 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Playing Indicator */}
                {isPlayingThisBar && (
                  <span className="absolute -top-2 right-2 px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black uppercase tracking-wider animate-pulse">
                    PLAYING
                  </span>
                )}

                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-mono font-black text-slate-300">BAR {barNum}</span>
                  {tagConfig && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${tagConfig.badgeBg}`}>
                      {mappedSec?.tag}
                    </span>
                  )}
                </div>

                <div className="text-[11px] font-bold text-slate-200 truncate mb-2">
                  {mappedSec ? mappedSec.name : `Bar ${barNum} Pattern`}
                </div>

                {/* Density Meter Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>DENSITY</span>
                    <span className="text-cyan-400">{stat?.densityPercent}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-amber-400 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, stat?.densityPercent || 0)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Arrangement Presets Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          STRUCTURE PRESETS:
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => handleGenerateStructure('dynamic')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold border border-slate-700 transition"
          >
            ⚡ Auto-Heuristic
          </button>
          <button
            onClick={() => handleGenerateStructure('pop')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold border border-slate-700 transition"
          >
            🎤 Pop Hook
          </button>
          <button
            onClick={() => handleGenerateStructure('edm')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold border border-slate-700 transition"
          >
            🔥 EDM Drop
          </button>
          <button
            onClick={() => handleGenerateStructure('hiphop')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold border border-slate-700 transition"
          >
            🎧 Hip-Hop Beat
          </button>
        </div>
      </div>

      {/* Mapping Table / Segment Cards */}
      <div className="space-y-2">
        <AnimatePresence>
          {sections.map((sec, idx) => {
            const config = SECTION_TAG_CONFIG[sec.tag] || SECTION_TAG_CONFIG.Verse;

            return (
              <motion.div
                key={sec.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className={`p-3 rounded-xl border transition-all ${config.bg} ${config.border} flex flex-wrap items-center justify-between gap-3`}
              >
                {/* Tag & Name */}
                <div className="flex items-center gap-3 min-w-[200px]">
                  <span className={`text-xs px-2.5 py-1 rounded-lg shadow-sm ${config.badgeBg}`}>
                    {sec.tag}
                  </span>
                  <div>
                    <input
                      type="text"
                      value={sec.name}
                      data-testid={`section-name-${sec.id}`}
                      onChange={(e) => handleUpdateSectionField(sec.id, 'name', e.target.value)}
                      className="bg-transparent text-xs font-black text-slate-100 focus:outline-none border-b border-transparent focus:border-amber-400"
                    />
                    <div className="text-[10px] text-slate-400 font-mono truncate max-w-[220px]">
                      {sec.description || config.description}
                    </div>
                  </div>
                </div>

                {/* Tag Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400 font-bold">TAG</span>
                  <select
                    value={sec.tag}
                    onChange={(e) => handleUpdateSectionField(sec.id, 'tag', e.target.value as SectionTag)}
                    className="bg-slate-950 text-slate-200 text-xs font-bold px-2 py-1 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-400"
                  >
                    {(Object.keys(SECTION_TAG_CONFIG) as SectionTag[]).map((tagKey) => (
                      <option key={tagKey} value={tagKey}>
                        {tagKey}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Mapped Bars Checklist */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-slate-400 font-bold">MAPPED BARS:</span>
                  {[1, 2, 3, 4].map((b) => {
                    const isChecked = sec.bars.includes(b);
                    return (
                      <button
                        key={b}
                        type="button"
                        onClick={() => {
                          const newBars = isChecked ? sec.bars.filter((x) => x !== b) : [...sec.bars, b].sort();
                          handleUpdateSectionField(sec.id, 'bars', newBars.length ? newBars : [b]);
                        }}
                        className={`w-6 h-6 rounded-md text-[10px] font-mono font-black transition ${
                          isChecked
                            ? 'bg-amber-400 text-slate-950 shadow'
                            : 'bg-slate-950 text-slate-500 hover:text-slate-300 border border-slate-800'
                        }`}
                      >
                        B{b}
                      </button>
                    );
                  })}
                </div>

                {/* Energy Level Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400 font-bold">ENERGY</span>
                  <select
                    value={sec.energy}
                    onChange={(e) => handleUpdateSectionField(sec.id, 'energy', e.target.value)}
                    className="bg-slate-950 text-amber-400 text-xs font-mono font-bold px-2 py-1 rounded-lg border border-slate-800 focus:outline-none"
                  >
                    <option value="low">LOW (1)</option>
                    <option value="medium">MID (2)</option>
                    <option value="high">HIGH (3)</option>
                    <option value="peak">PEAK (4)</option>
                  </select>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectBarView(sec.bars[0] as 1 | 2 | 3 | 4)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 transition"
                    title={`Focus Sequencer on Bar ${sec.bars[0]}`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    data-testid={`delete-section-${sec.id}`}
                    onClick={() => handleDeleteSection(sec.id)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                    title="Delete section"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
