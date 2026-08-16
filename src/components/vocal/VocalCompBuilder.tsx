import React, { useState } from 'react';
import { Track, VocalComp, VocalCompSegment } from '../../types/daw';
import { useStudioSession } from '../../app/StudioSessionContext';
import {
  Scissors,
  Check,
  Play,
  Sparkles,
} from 'lucide-react';

interface VocalCompBuilderProps {
  track: Track | null;
}

export const VocalCompBuilder: React.FC<VocalCompBuilderProps> = ({ track }) => {
  const {
    tracks,
    handleUpdateCompSegment,
    handleApplyCompProposal,
  } = useStudioSession();

  const currentTrack = track || tracks.find((t) => t.id === 't-vocal') || tracks[0];
  if (!currentTrack) return <div className='p-6 text-center text-neutral-500'>Select a vocal track for comp builder</div>;

  const takes = currentTrack?.vocalTakes || [];
  const comps = currentTrack?.vocalComps || [];

  const activeComp: VocalComp = comps.find((c) => c.sectionId === 'sec_hook' && c.active) ||
    comps[0] || {
      id: 'comp_hook_main',
      compId: 'comp_hook_main',
      trackId: currentTrack.id,
      sectionId: 'sec_hook',
      name: 'Master Hook Vocal Comp',
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sourceTakeIds: takes.map((t) => t.id),
      segments: [
        { segmentId: 'seg_01', phraseId: 'line_h1_1_p1', bar: 1, takeId: takes[0]?.id || 'take_v01', sourceStart: 0, sourceEnd: 2.18, timelineStart: 13, timelineEnd: 15, gainTrim: 0 },
        { segmentId: 'seg_02', phraseId: 'line_h1_1_p2', bar: 2, takeId: takes[1]?.id || 'take_v02', sourceStart: 2.18, sourceEnd: 4.36, timelineStart: 15, timelineEnd: 17, gainTrim: 0 },
        { segmentId: 'seg_03', phraseId: 'line_h1_2_p1', bar: 3, takeId: takes[2]?.id || 'take_v03', sourceStart: 4.36, sourceEnd: 6.54, timelineStart: 17, timelineEnd: 19, gainTrim: 0 },
        { segmentId: 'seg_04', phraseId: 'line_h1_2_p2', bar: 4, takeId: takes[3]?.id || 'take_v04', sourceStart: 6.54, sourceEnd: 8.72, timelineStart: 19, timelineEnd: 21, gainTrim: 0 },
      ],
    };

  const [auditioningTarget, setAuditioningTarget] = useState<string | null>(null);
  const [crossfadeMs, setCrossfadeMs] = useState<number>(25);

  // AI Comp Proposal State
  const [proposedComp, setProposedComp] = useState<{
    comp: VocalComp;
    reasoning: string;
  } | null>(null);

  const handleAudition = (id: string) => {
    setAuditioningTarget(id);
    setTimeout(() => {
      setAuditioningTarget(null);
    }, 3000);
  };

  const handleGenerateAiComp = () => {
    const aiProposal: VocalComp = {
      id: `comp_ai_${Date.now()}`,
      compId: `comp_ai_${Date.now()}`,
      trackId: currentTrack.id,
      sectionId: 'sec_hook',
      name: 'Co-Producer Recommended Comp',
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sourceTakeIds: ['take_v03', 'take_v01', 'take_v04', 'take_v02'],
      segments: [
        { segmentId: 'seg_01', phraseId: 'line_h1_1_p1', bar: 1, takeId: takes[2]?.id || 'take_v03', sourceStart: 0, sourceEnd: 2.18, timelineStart: 13, timelineEnd: 15, gainTrim: 0 },
        { segmentId: 'seg_02', phraseId: 'line_h1_1_p2', bar: 2, takeId: takes[0]?.id || 'take_v01', sourceStart: 2.18, sourceEnd: 4.36, timelineStart: 15, timelineEnd: 17, gainTrim: -0.5 },
        { segmentId: 'seg_03', phraseId: 'line_h1_2_p1', bar: 3, takeId: takes[3]?.id || 'take_v04', sourceStart: 4.36, sourceEnd: 6.54, timelineStart: 17, timelineEnd: 19, gainTrim: 0 },
        { segmentId: 'seg_04', phraseId: 'line_h1_2_p2', bar: 4, takeId: takes[1]?.id || 'take_v02', sourceStart: 6.54, sourceEnd: 8.72, timelineStart: 19, timelineEnd: 21, gainTrim: +1.0 },
      ],
    };

    setProposedComp({
      comp: aiProposal,
      reasoning: 'Take 3 has the cleanest attack on Phrase 1; Take 1 provides smooth cadence on Phrase 2; Take 4 delivers high-energy vibrato on Phrase 3; Take 2 delivers the emotional tail on Phrase 4.',
    });
  };

  const handleAcceptProposal = () => {
    if (!proposedComp) return;
    handleApplyCompProposal(currentTrack.id, 'sec_hook', proposedComp.comp);
    setProposedComp(null);
  };

  return (
    <div className="bg-slate-950/95 border border-slate-800/90 rounded-2xl p-4 shadow-2xl space-y-3 select-none text-xs font-mono">
      {/* 1. Header with AI Assist & Audition */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2.5 gap-2">
        <div className="flex items-center space-x-2">
          <Scissors className="w-4 h-4 text-pink-400" />
          <span className="font-black text-slate-100 uppercase tracking-wide">
            MASTER COMP BUILDER • {activeComp.name.toUpperCase()}
          </span>
          <span className="px-2 py-0.5 rounded bg-pink-500/10 text-pink-300 border border-pink-500/30 text-[9px] font-bold">
            HOOK (BARS 13–20)
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Equal Power Crossfade Selector */}
          <div className="flex items-center space-x-1 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800 text-[10px]">
            <span className="text-slate-400 font-bold">Crossfade:</span>
            {[10, 25, 50].map((ms) => (
              <button
                key={ms}
                onClick={() => setCrossfadeMs(ms)}
                className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                  crossfadeMs === ms ? 'bg-pink-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                {ms}ms
              </button>
            ))}
          </div>

          {/* AI Comp Recommendation */}
          <button
            onClick={handleGenerateAiComp}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center space-x-1.5 transition cursor-pointer shadow-md shadow-amber-500/20 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>✦ AI PROPOSE COMP</span>
          </button>

          {/* Audition Master Comp */}
          <button
            onClick={() => handleAudition('master_comp')}
            className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center space-x-1.5 transition cursor-pointer active:scale-95 ${
              auditioningTarget === 'master_comp'
                ? 'bg-pink-400 text-slate-950 animate-pulse'
                : 'bg-pink-500 hover:bg-pink-400 text-slate-950 shadow-md shadow-pink-500/20'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-slate-950" />
            <span>{auditioningTarget === 'master_comp' ? 'AUDITIONING...' : 'PLAY MASTER COMP'}</span>
          </button>
        </div>
      </div>

      {/* AI Proposal Card Banner (If proposed) */}
      {proposedComp && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border border-amber-500/50 space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
              <span className="font-black text-amber-300 text-xs">
                CO-PRODUCER COMP RECOMMENDATION READY
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => handleAudition('ai_comp')}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-[10px] font-black cursor-pointer flex items-center space-x-1"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>AUDITION PROPOSAL</span>
              </button>
              <button
                onClick={handleAcceptProposal}
                className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-black cursor-pointer"
              >
                ACCEPT & COMMIT
              </button>
              <button
                onClick={() => setProposedComp(null)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-[10px] cursor-pointer"
              >
                DISCARD
              </button>
            </div>
          </div>
          <p className="text-[10px] text-slate-300 italic">
            "{proposedComp.reasoning}"
          </p>
        </div>
      )}

      {/* 2. Phrase-by-Phrase Comping Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
        {[
          { bar: 1, phraseName: 'Phrase 1 (Bars 13–14)', text: 'Hold on to the sound tonight...' },
          { bar: 2, phraseName: 'Phrase 2 (Bars 15–16)', text: 'We are electric in the dark...' },
          { bar: 3, phraseName: 'Phrase 3 (Bars 17–18)', text: 'Feel the frequency ignite...' },
          { bar: 4, phraseName: 'Phrase 4 (Bars 19–20)', text: 'Lightning hitting like a spark...' },
        ].map((col) => {
          const activeSegment = activeComp.segments.find((s) => s.bar === col.bar);
          const currentTake = takes.find((t) => t.id === activeSegment?.takeId);

          return (
            <div key={col.bar} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-1 text-[10px]">
                  <span className="font-bold text-pink-300">{col.phraseName}</span>
                  <button
                    onClick={() => handleAudition(`phrase_${col.bar}`)}
                    className="p-0.5 text-slate-400 hover:text-pink-400 cursor-pointer"
                    title="Audition Phrase"
                  >
                    <Play className="w-3 h-3 fill-current" />
                  </button>
                </div>
                <div className="text-[9px] text-slate-400 italic mt-0.5 truncate">
                  "{col.text}"
                </div>
              </div>

              {/* Take Selection Blocks */}
              <div className="space-y-1 my-1">
                {takes.map((take) => {
                  const isSelected = activeSegment?.takeId === take.id;
                  return (
                    <button
                      key={take.id}
                      onClick={() => handleUpdateCompSegment(currentTrack.id, 'sec_hook', col.bar, take.id)}
                      className={`w-full px-2 py-1.5 rounded-lg text-left text-[10px] font-bold transition cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-pink-500 text-slate-950 font-black shadow-md shadow-pink-500/20'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <span className="truncate">{take.name.split(' ')[0]} {take.name.split(' ')[1]}</span>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>

              {/* Segment Gain Trim */}
              <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-500 font-bold">
                <span>GAIN TRIM:</span>
                <span className="text-slate-300 font-mono">
                  {activeSegment?.gainTrim ? `${activeSegment.gainTrim > 0 ? '+' : ''}${activeSegment.gainTrim}dB` : '0.0dB'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
