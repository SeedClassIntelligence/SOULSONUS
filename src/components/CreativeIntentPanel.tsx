import React, { useMemo, useState } from 'react';
import { Target, ChevronDown, ChevronUp, Lock, Unlock } from 'lucide-react';
import { useStudioSession } from '../app/StudioSessionContext';
import { computeStyleProfile } from '../lib/styleProfile';
import { deriveCreativeIntent, intentCoverage } from '../lib/creativeIntent';

/**
 * The middle, on screen.
 *
 * Amendment A.8: "Your current screen does Performance -> Realization
 * extremely well visually. We need to expose the middle." This is that,
 * collapsible rather than a new room, because A.8 also says the intent model
 * should not consume permanent screen real estate.
 *
 * It reads and changes nothing. Phase 3a of the retrofit plan is deliberately
 * read-only: preserve and transform become editable in 3b, and wiring them to
 * `RealizationRequest.thresholdPolicy` before they are proven on screen would
 * be building the second half first.
 *
 * The part worth defending is what it does with what it does not know. Every
 * unmeasured field is listed by name, with the reason. An intent model that
 * showed a full set of confident fields over four measurements and three
 * defaults would be the most convincing lie in the studio -- it would look
 * exactly like understanding.
 */
interface CreativeIntentPanelProps {
  /**
   * What the active realization candidate declares it may change. Absent when
   * no candidate is open, and the Transform row then says so rather than
   * listing what some route would permit if one were selected.
   */
  transformable?: string[];
}

export const CreativeIntentPanel: React.FC<CreativeIntentPanelProps> = ({ transformable }) => {
  const {
    tracks,
    dawState,
    sections,
    detectionSettings,
    decisionRecords,
    creatorName,
    pitchResponse,
  } = useStudioSession();
  const [isOpen, setIsOpen] = useState(false);

  const intent = useMemo(() => {
    const style = computeStyleProfile({
      creatorName,
      tracks,
      bpm: dawState.bpm || 110,
      detectionSettings,
      decisionRecords,
      pitchResponse,
    });
    return deriveCreativeIntent({
      style,
      sections,
      transformable,
    });
  }, [
    creatorName,
    tracks,
    dawState.bpm,
    detectionSettings,
    decisionRecords,
    pitchResponse,
    sections,
    transformable,
  ]);

  const { known, total } = intentCoverage(intent);

  const Row: React.FC<{ label: string; icon?: React.ReactNode; value: { reads: string; from: string } | null; missing?: string }> = ({
    label,
    icon,
    value,
    missing,
  }) => (
    <div className="px-3 py-2 border-b border-slate-800/70 last:border-b-0">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-500">
          {label}
        </span>
      </div>
      {value ? (
        <>
          <p className="text-[11px] text-slate-200 mt-0.5">{value.reads}</p>
          {/* Never a statement without the measurement under it. */}
          <p className="text-[9px] font-mono text-slate-500 mt-0.5">{value.from}</p>
        </>
      ) : (
        <p className="text-[10px] font-mono text-amber-300/80 mt-0.5">{missing || 'not measured'}</p>
      )}
    </div>
  );

  const reasonFor = (prefix: string) =>
    intent.notMeasured.find((n) => n.startsWith(prefix))?.split('— ')[1];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden">
      <button
        type="button"
        data-testid="creative-intent-toggle"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-900/60 transition cursor-pointer"
      >
        <Target className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span className="text-[10px] font-mono font-black uppercase tracking-widest text-cyan-300">
          Creative Intent
        </span>
        <span className="text-[9px] font-mono text-slate-500">
          {known} of {total} fields measured
        </span>
        <span className="ml-auto text-slate-500">
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {isOpen && (
        <div data-testid="creative-intent-body">
          <Row label="Groove" value={intent.groove} missing={reasonFor('groove')} />
          <Row label="Energy" value={intent.energy} missing={reasonFor('energy')} />
          <Row
            label="Preserve"
            icon={<Lock className="w-3 h-3 text-emerald-400" />}
            value={intent.preserve}
          />
          <Row
            label="Transform"
            icon={<Unlock className="w-3 h-3 text-amber-400" />}
            value={intent.transform}
            missing={reasonFor('transform')}
          />
          <Row
            label="Arrangement"
            value={intent.arrangementTrajectory}
            missing={reasonFor('arrangement')}
          />
          <Row label="Emotion" value={null} missing={reasonFor('emotion')} />
          <Row label="Genre grammar" value={null} missing={reasonFor('genre')} />

          <p className="px-3 py-2 bg-slate-900/40 border-t border-slate-800 text-[9px] font-mono text-slate-500 leading-snug">
            Read-only. This is what the studio currently knows you are going for, from
            measurements taken elsewhere — nothing here is inferred to fill a gap, and nothing
            here changes a realization yet.
          </p>
        </div>
      )}
    </div>
  );
};
