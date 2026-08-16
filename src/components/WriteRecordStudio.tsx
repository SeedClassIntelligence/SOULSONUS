import React, { useState } from 'react';
import { Track, ArrangementSection } from '../types/daw';
import { LyricCadenceStudio } from './LyricCadenceStudio';
import { VocalTakeStack } from './VocalTakeStack';
import { VocalCompBuilder } from './vocal/VocalCompBuilder';
import { OverdubRecorder } from './OverdubRecorder';
import { VocalPitchTiming } from './vocal/VocalPitchTiming';
import { VocalHarmonyDoubles } from './vocal/VocalHarmonyDoubles';
import { VoiceIdentitySynthesis } from './vocal/VoiceIdentitySynthesis';
import { VocalDspChain } from './vocal/VocalDspChain';
import {
  AlignLeft,
  Layers,
  Scissors,
  Circle,
  Activity,
  Music,
  ShieldCheck,
  Sliders,
} from 'lucide-react';

interface WriteRecordStudioProps {
  track: Track | null;
  sections: ArrangementSection[];
  activeSectionId: string;
  onSelectSection?: (sectionId: string) => void;
  bpm: number;
  isPlaying: boolean;
  currentStep: number;
}

export const WriteRecordStudio: React.FC<WriteRecordStudioProps> = ({
  track,
  sections,
  activeSectionId,
  onSelectSection,
  bpm,
  isPlaying,
  currentStep,
}) => {
  const [activeTab, setActiveTab] = useState<
    'LYRICS' | 'TAKES' | 'COMP' | 'PUNCH' | 'PITCH_TIMING' | 'HARMONY' | 'VOICE_IDENTITY' | 'DSP'
  >('LYRICS');

  return (
    <div className="w-full space-y-3">
      {/* Top Write & Record Workspace Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl gap-2 text-xs font-mono">
        <div className="flex items-center space-x-2 pl-2">
          <div className="w-2.5 h-2.5 rounded-full bg-pink-400 animate-ping" />
          <span className="font-black text-slate-100 uppercase tracking-wide">
            WRITE & RECORD VOCAL ROOM
          </span>
          <span className="text-slate-500 hidden sm:inline">• Room 3 of Permanent Studio</span>
        </div>

        {/* 8 Primary Vocal Workstation Tabs */}
        <div className="flex flex-wrap items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 font-bold">
          <button
            onClick={() => setActiveTab('LYRICS')}
            className={`px-2.5 py-1.5 rounded-lg flex items-center space-x-1 transition cursor-pointer text-[11px] ${
              activeTab === 'LYRICS'
                ? 'bg-pink-500 text-slate-950 font-black shadow-md shadow-pink-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlignLeft className="w-3 h-3" />
            <span>1. LYRICS & CADENCE</span>
          </button>

          <button
            onClick={() => setActiveTab('TAKES')}
            className={`px-2.5 py-1.5 rounded-lg flex items-center space-x-1 transition cursor-pointer text-[11px] ${
              activeTab === 'TAKES'
                ? 'bg-pink-500 text-slate-950 font-black shadow-md shadow-pink-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>2. TAKES & POOL</span>
          </button>

          <button
            onClick={() => setActiveTab('COMP')}
            className={`px-2.5 py-1.5 rounded-lg flex items-center space-x-1 transition cursor-pointer text-[11px] ${
              activeTab === 'COMP'
                ? 'bg-pink-500 text-slate-950 font-black shadow-md shadow-pink-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scissors className="w-3 h-3" />
            <span>3. COMP BUILDER</span>
          </button>

          <button
            onClick={() => setActiveTab('PUNCH')}
            className={`px-2.5 py-1.5 rounded-lg flex items-center space-x-1 transition cursor-pointer text-[11px] ${
              activeTab === 'PUNCH'
                ? 'bg-pink-500 text-slate-950 font-black shadow-md shadow-pink-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Circle className="w-3 h-3 fill-current" />
            <span>4. PUNCH & OVERDUB</span>
          </button>

          <button
            onClick={() => setActiveTab('PITCH_TIMING')}
            className={`px-2.5 py-1.5 rounded-lg flex items-center space-x-1 transition cursor-pointer text-[11px] ${
              activeTab === 'PITCH_TIMING'
                ? 'bg-pink-500 text-slate-950 font-black shadow-md shadow-pink-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3 h-3" />
            <span>5. PITCH & TIMING</span>
          </button>

          <button
            onClick={() => setActiveTab('HARMONY')}
            className={`px-2.5 py-1.5 rounded-lg flex items-center space-x-1 transition cursor-pointer text-[11px] ${
              activeTab === 'HARMONY'
                ? 'bg-pink-500 text-slate-950 font-black shadow-md shadow-pink-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Music className="w-3 h-3" />
            <span>6. HARMONY & DOUBLES</span>
          </button>

          <button
            onClick={() => setActiveTab('VOICE_IDENTITY')}
            className={`px-2.5 py-1.5 rounded-lg flex items-center space-x-1 transition cursor-pointer text-[11px] ${
              activeTab === 'VOICE_IDENTITY'
                ? 'bg-pink-500 text-slate-950 font-black shadow-md shadow-pink-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3 h-3" />
            <span>7. VOICE IDENTITY</span>
          </button>

          <button
            onClick={() => setActiveTab('DSP')}
            className={`px-2.5 py-1.5 rounded-lg flex items-center space-x-1 transition cursor-pointer text-[11px] ${
              activeTab === 'DSP'
                ? 'bg-pink-500 text-slate-950 font-black shadow-md shadow-pink-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3 h-3" />
            <span>8. VOCAL DSP</span>
          </button>
        </div>
      </div>

      {/* Dynamic Active Workstation Interior */}
      <div className="w-full">
        {activeTab === 'LYRICS' && (
          <LyricCadenceStudio
            sections={sections}
            activeSectionId={activeSectionId}
            onSelectSection={onSelectSection}
            bpm={bpm}
            isPlaying={isPlaying}
            currentStep={currentStep}
          />
        )}

        {activeTab === 'TAKES' && (
          <VocalTakeStack track={track} />
        )}

        {activeTab === 'COMP' && (
          <VocalCompBuilder track={track} />
        )}

        {activeTab === 'PUNCH' && (
          <OverdubRecorder track={track} />
        )}

        {activeTab === 'PITCH_TIMING' && (
          <VocalPitchTiming track={track} />
        )}

        {activeTab === 'HARMONY' && (
          <VocalHarmonyDoubles track={track} />
        )}

        {activeTab === 'VOICE_IDENTITY' && (
          <VoiceIdentitySynthesis track={track} />
        )}

        {activeTab === 'DSP' && (
          <VocalDspChain track={track} />
        )}
      </div>
    </div>
  );
};

