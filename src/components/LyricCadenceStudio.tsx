import React, { useState, useEffect } from 'react';
import { ArrangementSection, LyricLine, LyricVersion } from '../types/daw';
import { useStudioSession } from '../app/StudioSessionContext';
import {
  Play,
  Plus,
  Trash2,
  AlignLeft,
  Clock,
  History,
  Bookmark,
} from 'lucide-react';

interface LyricCadenceStudioProps {
  sections: ArrangementSection[];
  activeSectionId: string;
  onSelectSection?: (sectionId: string) => void;
  bpm: number;
  isPlaying: boolean;
  currentStep: number;
}

export const LyricCadenceStudio: React.FC<LyricCadenceStudioProps> = ({
  sections,
  activeSectionId,
  onSelectSection,
  bpm,
}) => {
  const {
    lyricSections,
    handleAddLyricLine,
    handleUpdateLyricLine,
    handleDeleteLyricLine,
    handleCreateLyricVersion,
    handleRestoreLyricVersion,
    vocalSelectionContext,
    setVocalSelectionContext,
  } = useStudioSession();

  const [newLineText, setNewLineText] = useState('');
  const [selectedLineId, setSelectedLineId] = useState<string | null>('line_h1_1');
  const [isAuditioningCadence, setIsAuditioningCadence] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');

  // Fallback to active section in context or sec_hook
  const currentSection = sections.find((s) => s.id === activeSectionId) || sections[0] || {
    id: 'sec_hook',
    name: 'Hook',
    bars: [13, 14, 15, 16, 17, 18, 19, 20],
  };

  const sectionData = lyricSections[currentSection.id] || {
    sectionId: currentSection.id,
    sectionName: currentSection.name,
    lines: [],
    versions: [],
    activeVersionId: 'ver_1',
  };

  useEffect(() => {
    const firstLineId = sectionData.lines[0]?.lineId || '';
    setSelectedLineId(firstLineId);
    setVocalSelectionContext((prev) => ({
      ...prev,
      sectionId: activeSectionId,
      phraseId: firstLineId,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSectionId]);

  const lines = sectionData.lines;
  const activeLine = lines.find((l) => l.lineId === selectedLineId) || lines[0] || null;

  const handleAdd = () => {
    if (!newLineText.trim()) return;
    handleAddLyricLine(currentSection.id, newLineText.trim());
    setNewLineText('');
  };

  const handleToggleEmphasis = (sylIdx: number) => {
    if (!activeLine) return;
    const newEmphasis = [...activeLine.cadenceEmphasis];
    newEmphasis[sylIdx] = !newEmphasis[sylIdx];
    handleUpdateLyricLine(currentSection.id, activeLine.lineId, { cadenceEmphasis: newEmphasis });
  };

  const handleSaveVersion = () => {
    if (!newVersionName.trim()) return;
    handleCreateLyricVersion(currentSection.id, newVersionName.trim(), 'CREATOR');
    setNewVersionName('');
    setShowVersionModal(false);
  };

  const handleAuditionCadence = () => {
    setIsAuditioningCadence(true);
    setTimeout(() => {
      setIsAuditioningCadence(false);
    }, 3500);
  };

  // 16th-Note Subdivisions for E08 Cadence Grid (1 e & a | 2 e & a | 3 e & a | 4 e & a)
  const SUBDIVISIONS = [
    { label: '1', type: 'down' },
    { label: 'e', type: 'sub' },
    { label: '&', type: 'off' },
    { label: 'a', type: 'sub' },
    { label: '2', type: 'snare' },
    { label: 'e', type: 'sub' },
    { label: '&', type: 'off' },
    { label: 'a', type: 'sub' },
    { label: '3', type: 'down' },
    { label: 'e', type: 'sub' },
    { label: '&', type: 'off' },
    { label: 'a', type: 'sub' },
    { label: '4', type: 'snare' },
    { label: 'e', type: 'sub' },
    { label: '&', type: 'off' },
    { label: 'a', type: 'sub' },
  ];

  return (
    <div className="bg-slate-950/95 border border-slate-800/90 rounded-2xl p-4 shadow-2xl space-y-3 select-none text-xs font-mono">
      {/* 1. Header with Section Selector, Version Dropdown & BPM */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2.5 gap-2">
        <div className="flex items-center space-x-2">
          <AlignLeft className="w-4 h-4 text-pink-400" />
          <span className="font-black text-slate-100 uppercase tracking-wide">
            LYRIC & CADENCE WORKSPACE • {currentSection.name.toUpperCase()}
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-pink-300 font-bold">
            {bpm} BPM • 4/4
          </span>
        </div>

        {/* Section Tabs & Version Controls */}
        <div className="flex items-center space-x-2">
          {/* Version Selector */}
          <div className="flex items-center space-x-1 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800 text-[10px]">
            <History className="w-3 h-3 text-amber-400" />
            <select
              value={sectionData.activeVersionId}
              onChange={(e) => handleRestoreLyricVersion(currentSection.id, e.target.value)}
              className="bg-transparent text-slate-200 font-bold focus:outline-none cursor-pointer"
            >
              {sectionData.versions.map((ver) => (
                <option key={ver.versionId} value={ver.versionId} className="bg-slate-900 text-slate-200">
                  {ver.versionName}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowVersionModal(!showVersionModal)}
              className="ml-1 px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 hover:bg-pink-500/30 font-bold cursor-pointer"
              title="Save New Version"
            >
              + VER
            </button>
          </div>

          {/* Section Pills */}
          <div className="flex items-center space-x-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            {sections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => {
                  onSelectSection?.(sec.id);
                  setVocalSelectionContext((prev) => ({ ...prev, sectionId: sec.id }));
                }}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
                  activeSectionId === sec.id
                    ? 'bg-pink-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sec.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Save Version Inline Bar */}
      {showVersionModal && (
        <div className="flex items-center space-x-2 p-2 rounded-xl bg-slate-900 border border-pink-500/40 animate-fadeIn">
          <Bookmark className="w-3.5 h-3.5 text-pink-400" />
          <span className="text-[10px] text-slate-300 font-bold">New Version Name:</span>
          <input
            type="text"
            value={newVersionName}
            onChange={(e) => setNewVersionName(e.target.value)}
            placeholder={`e.g. ${currentSection.name} v2 (Syncopated Hook)`}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 text-xs focus:border-pink-500 focus:outline-none"
          />
          <button
            onClick={handleSaveVersion}
            className="px-3 py-1 rounded-lg bg-pink-500 hover:bg-pink-400 text-slate-950 font-black text-xs cursor-pointer"
          >
            SAVE VERSION
          </button>
          <button
            onClick={() => setShowVersionModal(false)}
            className="px-2 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs cursor-pointer"
          >
            CANCEL
          </button>
        </div>
      )}

      {/* 2. Main Writing & Phrase List Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left Column: Section Phrases & Line-by-Line Editor */}
        <div className="lg:col-span-6 space-y-2">
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
            <span>LYRIC LINES ({lines.length} Lines in {currentSection.name})</span>
            <span>Click to align cadence</span>
          </div>

          <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar">
            {lines.map((line, idx) => {
              const isSelected = activeLine?.lineId === line.lineId;
              return (
                <div
                  key={line.lineId}
                  onClick={() => {
                    setSelectedLineId(line.lineId);
                    setVocalSelectionContext((prev) => ({
                      ...prev,
                      phraseId: line.lineId,
                    }));
                  }}
                  className={`p-2.5 rounded-xl border transition cursor-pointer flex flex-col justify-between space-y-1.5 ${
                    isSelected
                      ? 'bg-slate-900 border-pink-500 ring-1 ring-pink-500/40 shadow-md'
                      : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900/90'
                  }`}
                >
                  <div className="flex items-center justify-between text-[9px]">
                    <div className="flex items-center space-x-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-slate-950 text-pink-300 font-bold border border-slate-800">
                        LINE {idx + 1} • BAR {line.bar}
                      </span>
                      {line.rhymeSchemeTag && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-black border border-purple-500/30">
                          RHYME: {line.rhymeSchemeTag}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-400 font-semibold">{line.syllables.length} Syllables</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLyricLine(currentSection.id, line.lineId);
                        }}
                        className="text-slate-500 hover:text-red-400 p-0.5 transition cursor-pointer"
                        title="Delete Line"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="text-slate-100 font-medium text-[11px] leading-relaxed">
                    {line.text}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add New Line Input */}
          <div className="flex items-center space-x-1.5 pt-1">
            <input
              type="text"
              value={newLineText}
              onChange={(e) => setNewLineText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder={`Type line for ${currentSection.name}...`}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 text-xs focus:border-pink-500 focus:outline-none font-mono"
            />
            <button
              onClick={handleAdd}
              className="px-3.5 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-slate-950 font-black transition cursor-pointer flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>ADD</span>
            </button>
          </div>
        </div>

        {/* Right Column: Interactive 16th-Note Cadence & Syllable Stress Alignment Grid */}
        <div className="lg:col-span-6 space-y-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-slate-200 text-[10px] flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>E08 CADENCE & 16TH-NOTE RHYTHMIC GRID</span>
            </span>
            <button
              onClick={handleAuditionCadence}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center space-x-1 transition cursor-pointer ${
                isAuditioningCadence
                  ? 'bg-amber-400 text-slate-950 animate-pulse'
                  : 'bg-slate-950 text-amber-300 border border-amber-500/40 hover:bg-amber-500/20'
              }`}
            >
              <Play className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{isAuditioningCadence ? 'AUDITIONING...' : 'AUDITION CADENCE'}</span>
            </button>
          </div>

          {activeLine ? (
            <div className="space-y-2.5">
              {/* Syllable Stress Bubbles */}
              <div>
                <div className="text-[10px] text-slate-400 mb-1 font-bold">
                  Syllables & Downbeat Stresses (Click to toggle downbeat hit):
                </div>
                <div className="flex flex-wrap gap-1.5 py-1">
                  {activeLine.syllables.map((syl, sIdx) => {
                    const isEmphasized = activeLine.cadenceEmphasis[sIdx];
                    return (
                      <button
                        key={sIdx}
                        onClick={() => handleToggleEmphasis(sIdx)}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition cursor-pointer ${
                          isEmphasized
                            ? 'bg-pink-500 text-slate-950 border-pink-300 shadow-md shadow-pink-500/30'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {syl}
                        {isEmphasized && <span className="ml-1 text-[8px] font-black">▲</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 16th-Note Cadence Timeline Grid (1 e & a | 2 e & a | 3 e & a | 4 e & a) */}
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold">
                  <span>16TH NOTE SUB-BEAT RESOLUTION (BAR {activeLine.bar}):</span>
                  <span className="text-pink-300 font-mono">1 e & a | 2 e & a | 3 e & a | 4 e & a</span>
                </div>
                <div className="grid grid-cols-16 gap-0.5 text-center">
                  {SUBDIVISIONS.map((sub, idx) => {
                    const isDownbeat = sub.type === 'down';
                    const isSnare = sub.type === 'snare';
                    
                    let hasSyllable = false;
                    let emphasized = false;
                    let syllableText = '';

                    if (activeLine.cadenceGrid) {
                      const beat = Math.floor(idx / 4) + 1;
                      const subBeat = (idx % 4) + 1;
                      const gridEntry = activeLine.cadenceGrid.find(g => g.beat === beat && g.subBeat === subBeat);
                      if (gridEntry) {
                        hasSyllable = true;
                        emphasized = gridEntry.emphasized;
                        syllableText = gridEntry.word;
                      }
                    } else {
                      hasSyllable = idx < activeLine.syllables.length;
                      emphasized = hasSyllable && activeLine.cadenceEmphasis[idx];
                      syllableText = hasSyllable ? activeLine.syllables[idx] : '';
                    }

                    return (
                      <div
                        key={idx}
                        className={`p-1 rounded flex flex-col items-center justify-between min-h-[44px] border ${
                          emphasized
                            ? 'bg-pink-500/20 border-pink-500 text-pink-300'
                            : isDownbeat
                            ? 'bg-slate-900 border-slate-700 text-slate-200'
                            : isSnare
                            ? 'bg-cyan-950/40 border-cyan-800 text-cyan-300'
                            : 'bg-slate-900/40 border-slate-800 text-slate-500'
                        }`}
                      >
                        <span className="text-[8px] font-mono font-bold">{sub.label}</span>
                        {hasSyllable ? (
                          <span className="text-[7px] font-bold text-slate-100 truncate w-full">
                            {syllableText.replace('-', '')}
                          </span>
                        ) : (
                          <span className="text-[7px] text-slate-600">•</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-500 text-[10px] py-8">Select a line to edit cadence.</div>
          )}
        </div>
      </div>
    </div>
  );
};
