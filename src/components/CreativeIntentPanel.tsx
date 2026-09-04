import React, { useMemo, useState } from 'react';
import { Target, ChevronDown, ChevronUp, Lock, Unlock } from 'lucide-react';
import { useStudioSession } from '../app/StudioSessionContext';
import { computeStyleProfile } from '../lib/styleProfile';
import { deriveCreativeIntent, intentCoverage } from '../lib/creativeIntent';
import {
  EXPRESSION_DIMENSIONS,
  EXPRESSION_POLES,
  expressionCoverage,
} from '../audio/expressionState';
import type { ExpressionDimensionName } from '../types/daw';
import {
  DEFAULT_PRESERVE,
  STRICTNESS_LABEL,
  STRICTNESS_MEANING,
  describeUnlocked,
  type PreservableProperty,
  type Strictness,
} from '../lib/intentPolicy';

/**
 * The middle, on screen.
 *
 * Amendment A.8: "Your current screen does Performance -> Realization
 * extremely well visually. We need to expose the middle." This is that,
 * collapsible rather than a new room, because A.8 also says the intent model
 * should not consume permanent screen real estate.
 *
 * Phase 3b makes preserve and strictness editable, and they now reach the
 * contract that judges every candidate. Before this they were concepts with no
 * way in: `lockedProperties` was a local `let` in the router, the same four for
 * every route and every creator, and `RealizationRequest.thresholdPolicy` was
 * settable by a caller that never set it.
 *
 * Unlocking is a real decision with a real consequence, and it is stated where
 * it is made rather than discovered later: take timing out of the set and a
 * candidate that mangles your timing will pass, because the contract was told
 * to stop checking. Amendment E puts that call with the owner. It does not
 * permit making it quietly.
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
    intentPreserve,
    setIntentPreserve,
    intentStrictness,
    setIntentStrictness,
    realizationTransformables,
    expressionState,
    setExpressionReading,
    creatorExpressionReadings,
  } = useStudioSession();
  // The prop still wins when a caller supplies one; otherwise the session's
  // active candidate is the answer, and the row can finally fill.
  const transformableNow = transformable ?? realizationTransformables;
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
      transformable: transformableNow,
      expression: expressionState,
    });
  }, [
    creatorName,
    tracks,
    dawState.bpm,
    detectionSettings,
    decisionRecords,
    pitchResponse,
    sections,
    transformableNow,
    expressionState,
  ]);

  const { known, total } = intentCoverage(intent);
  const { known: expressionKnown, total: expressionTotal } = expressionCoverage(expressionState);
  const unlocked = DEFAULT_PRESERVE.filter((p) => !intentPreserve.includes(p));
  const unlockedWarning = describeUnlocked(unlocked);

  const togglePreserve = (prop: PreservableProperty) =>
    setIntentPreserve(
      intentPreserve.includes(prop)
        ? intentPreserve.filter((p) => p !== prop)
        : DEFAULT_PRESERVE.filter((p) => intentPreserve.includes(p) || p === prop)
    );

  const PROP_LABEL: Record<PreservableProperty, string> = {
    rhythm: 'rhythm',
    timing: 'timing',
    pitchContour: 'pitch contour',
    articulation: 'articulation',
  };

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
          {/* Editable. Every property the contract can refuse a candidate
              over, and the creator's say in which of them it holds. */}
          <div className="px-3 py-2 border-b border-slate-800/70">
            <div className="flex items-center gap-2">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-500">
                Preserve
              </span>
              <span className="text-[9px] font-mono text-slate-600">
                the contract refuses a candidate that breaks these
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {DEFAULT_PRESERVE.map((prop) => {
                const held = intentPreserve.includes(prop);
                return (
                  <button
                    key={prop}
                    type="button"
                    data-testid={`preserve-${prop}`}
                    onClick={() => togglePreserve(prop)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold border transition cursor-pointer ${
                      held
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-900 text-slate-500 border-slate-800 line-through'
                    }`}
                    title={held ? `Held. Click to stop checking ${PROP_LABEL[prop]}.` : `Not checked. Click to hold ${PROP_LABEL[prop]}.`}
                  >
                    {PROP_LABEL[prop]}
                  </button>
                );
              })}
            </div>
            {unlockedWarning && (
              <p
                data-testid="unlocked-warning"
                className="text-[10px] font-mono text-amber-300 mt-1.5 leading-snug"
              >
                {unlockedWarning}
              </p>
            )}
          </div>

          {/* How hard the held properties are held. */}
          <div className="px-3 py-2 border-b border-slate-800/70">
            <span className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-500">
              Strictness
            </span>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {(['as_performed', 'close', 'loose'] as Strictness[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  data-testid={`strictness-${s}`}
                  onClick={() => setIntentStrictness(s)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold border transition cursor-pointer ${
                    intentStrictness === s
                      ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                      : 'bg-slate-900 text-slate-500 border-slate-800'
                  }`}
                  title={STRICTNESS_MEANING[s]}
                >
                  {STRICTNESS_LABEL[s]}
                </button>
              ))}
            </div>
            <p className="text-[9px] font-mono text-slate-500 mt-1">
              {STRICTNESS_MEANING[intentStrictness]}
            </p>
          </div>
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
          {/* EMOTION -- SRT-1 V.
              Seven dimensions rather than a label, each with the measurement
              behind it, and each one the creator can overrule. A dimension the
              take could not support is named as unread rather than shown at
              zero: seven confident numbers over a pass that supports three
              would look exactly like understanding. */}
          <div className="px-3 py-2 border-b border-slate-800/70">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-500">
                Emotion
              </span>
              <span className="text-[9px] font-mono text-slate-500">
                {expressionState
                  ? `${expressionKnown} of ${expressionTotal} dimensions read from ${expressionState.measuredFrom.onsets} onsets`
                  : 'nothing performed yet'}
              </span>
            </div>

            {!expressionState && (
              <p className="text-[10px] font-mono text-amber-300/80 mt-0.5">
                {reasonFor('emotion') || 'no pass has been read yet'}
              </p>
            )}

            {expressionState && (
              <div className="mt-1.5 space-y-1.5" data-testid="expression-dimensions">
                {EXPRESSION_DIMENSIONS.map((name) => {
                  const dim = expressionState[name];
                  const [low, high] = EXPRESSION_POLES[name];
                  const said = creatorExpressionReadings[name];
                  const absent = expressionState.notMeasured.find((n) => n.startsWith(name));
                  return (
                    <div key={name} data-testid={`expression-${name}`}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 w-[62px] shrink-0">
                          {name}
                        </span>
                        {dim ? (
                          <>
                            {/* The axis, with the poles named at its ends.
                                A bar with no poles on it is a number nobody
                                can read. */}
                            <span className="text-[8px] font-mono text-slate-600 w-[52px] text-right shrink-0">
                              {low}
                            </span>
                            <div className="relative h-[3px] flex-1 rounded-full bg-slate-800">
                              <div className="absolute inset-y-0 left-1/2 w-px bg-slate-700" />
                              <div
                                className={`absolute top-[-2px] w-[7px] h-[7px] rounded-full ${
                                  dim.fromCreator ? 'bg-amber-400' : 'bg-cyan-400'
                                }`}
                                style={{ left: `calc(${((dim.value + 1) / 2) * 100}% - 3.5px)` }}
                              />
                            </div>
                            <span className="text-[8px] font-mono text-slate-600 w-[52px] shrink-0">
                              {high}
                            </span>
                          </>
                        ) : (
                          <span className="text-[9px] font-mono text-amber-300/70 flex-1 truncate">
                            {absent ? absent.split('— ')[1] || 'not measured' : 'not measured'}
                          </span>
                        )}
                      </div>

                      {/* The say-row is offered whether or not the studio
                          measured this dimension. SRT-1 V lists the creator's
                          own emotional intent as an input in its own right,
                          not as a correction to a machine reading -- so a
                          dimension the take could not support is one they can
                          still state, and a percussive take is not a take
                          about which they have nothing to say. */}
                      <div className="flex items-center gap-1.5 pl-[62px]">
                          <p className="text-[9px] font-mono text-slate-500 flex-1 leading-snug">
                            {!dim
                              ? 'the studio could not read this one — say it yourself'
                              : dim.fromCreator
                                ? `you: ${dim.reads}`
                                : `${dim.reads} — ${dim.from}`}
                          </p>
                          {/* Amendment B: the creator's reading replaces the
                              studio's on that dimension, and is labelled as
                              theirs rather than blended into a measurement. */}
                          <div className="flex gap-0.5 shrink-0">
                            {([[-0.8, low], [0.8, high]] as [number, string][]).map(([v, label]) => (
                              <button
                                key={label}
                                type="button"
                                data-testid={`say-${name}-${v < 0 ? 'low' : 'high'}`}
                                onClick={() => setExpressionReading(name as ExpressionDimensionName, v)}
                                className={`px-1 py-0.5 rounded text-[8px] font-mono font-bold border transition cursor-pointer ${
                                  said === v
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                                    : 'bg-slate-900 text-slate-600 border-slate-800 hover:text-slate-300'
                                }`}
                                title={`Tell the studio this take is ${label}. Your reading replaces what it measured.`}
                              >
                                {label}
                              </button>
                            ))}
                            {said !== undefined && (
                              <button
                                type="button"
                                data-testid={`clear-${name}`}
                                onClick={() => setExpressionReading(name as ExpressionDimensionName, null)}
                                className="px-1 py-0.5 rounded text-[8px] font-mono font-bold border bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300 cursor-pointer"
                                title="Hand this dimension back to what was measured."
                              >
                                ↺
                              </button>
                            )}
                          </div>
                        </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <Row label="Genre grammar" value={null} missing={reasonFor('genre')} />

          <p className="px-3 py-2 bg-slate-900/40 border-t border-slate-800 text-[9px] font-mono text-slate-500 leading-snug">
            Preserve and strictness govern every realization this session asks for. The
            measured rows above are read-only and nothing in them is inferred to fill a gap.
          </p>
        </div>
      )}
    </div>
  );
};
