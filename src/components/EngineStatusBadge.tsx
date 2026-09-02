import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Brain, RefreshCw } from 'lucide-react';
import {
  EngineStatus,
  EngineHealth,
  probeEngines,
  initialEngineStatuses,
  summarise,
} from '../lib/engineStatus';

/**
 * Reports what answered, not what is installed.
 *
 * The distinction is the whole point of this control. An inventory of engines
 * is written once and then drifts; a creator finds out it drifted at the
 * moment they needed the engine to work. So this asks, on mount and on
 * demand, and shows the reason it got back -- including the boring reason,
 * "runs in this bundle, there is nothing to ask".
 */

const DOT: Record<EngineHealth, string> = {
  IN_PROCESS: 'bg-emerald-400',
  REACHABLE: 'bg-emerald-400',
  UNREACHABLE: 'bg-rose-500',
  PROBING: 'bg-slate-500 animate-pulse',
};

const WORD: Record<EngineHealth, string> = {
  IN_PROCESS: 'IN THIS TAB',
  REACHABLE: 'ANSWERED',
  UNREACHABLE: 'NO ANSWER',
  PROBING: 'ASKING...',
};

const WORD_COLOR: Record<EngineHealth, string> = {
  IN_PROCESS: 'text-emerald-300',
  REACHABLE: 'text-emerald-300',
  UNREACHABLE: 'text-rose-300',
  PROBING: 'text-slate-400',
};

const EngineRow: React.FC<{ engine: EngineStatus }> = ({ engine }) => (
  <div className="px-3 py-2.5 border-b border-slate-800/70 last:border-b-0">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`w-2 h-2 rounded-full shrink-0 ${DOT[engine.health]}`} />
        <span className="text-[11px] font-mono font-bold text-slate-200 truncate">
          {engine.label}
        </span>
      </div>
      <span className={`text-[9px] font-mono font-black tracking-wider shrink-0 ${WORD_COLOR[engine.health]}`}>
        {WORD[engine.health]}
      </span>
    </div>

    <p className="mt-1 text-[10px] leading-snug text-slate-400 font-mono">{engine.detail}</p>

    {engine.endpoint && (
      <p className="mt-1 text-[9px] font-mono text-slate-600 truncate" title={engine.endpoint}>
        {engine.location === 'service' ? 'asked: ' : 'file: '}
        {engine.endpoint}
      </p>
    )}

    {engine.consequence && (
      <p className="mt-1 text-[10px] leading-snug text-amber-300/90 font-mono">
        {engine.consequence}
      </p>
    )}
  </div>
);

export const EngineStatusBadge: React.FC = () => {
  const [engines, setEngines] = useState<EngineStatus[]>(() => initialEngineStatuses());
  const [isOpen, setIsOpen] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const mounted = useRef(true);

  const runProbe = useCallback(async () => {
    setEngines(initialEngineStatuses());
    const next = await probeEngines();
    if (!mounted.current) return;
    setEngines(next);
    setLastChecked(new Date());
  }, []);

  useEffect(() => {
    mounted.current = true;
    void runProbe();
    return () => {
      mounted.current = false;
    };
  }, [runProbe]);

  // Close on an outside click. The panel is dense and sits over the arrange
  // view; leaving it open while the creator works would cover the thing they
  // opened it to get back to.
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [isOpen]);

  const { ready, total, probing } = summarise(engines);
  const allReady = !probing && ready === total;

  const pillTone = probing
    ? 'bg-slate-900 text-slate-400 border-slate-800'
    : allReady
      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
      : 'bg-rose-500/10 text-rose-300 border-rose-500/30';

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        data-testid="engine-status-badge"
        onClick={() => setIsOpen((v) => !v)}
        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold transition cursor-pointer ${pillTone}`}
        title="Which engines answered when this tab last asked them"
      >
        <Brain className={`w-3.5 h-3.5 ${probing ? 'animate-pulse' : ''}`} />
        <span className="hidden md:inline">AI ENGINES</span>
        <span className="font-black">
          {probing ? '--' : `${ready}/${total}`}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[22rem] max-w-[calc(100vw-2rem)] z-50 rounded-xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/60 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-800 bg-slate-900/70 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-mono font-black tracking-wider text-amber-300">
                WHAT ANSWERED
              </p>
              <p className="text-[9px] font-mono text-slate-500 truncate">
                {lastChecked
                  ? `asked at ${lastChecked.toLocaleTimeString()}`
                  : 'asking now'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void runProbe()}
              disabled={probing}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[9px] font-mono font-bold text-slate-300 hover:text-amber-300 hover:border-amber-500/40 transition cursor-pointer disabled:opacity-40 disabled:cursor-default"
              title="Ask every engine again"
            >
              <RefreshCw className={`w-3 h-3 ${probing ? 'animate-spin' : ''}`} />
              ASK AGAIN
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {engines.map((e) => (
              <EngineRow key={e.id} engine={e} />
            ))}
          </div>

          <p className="px-3 py-2 border-t border-slate-800 bg-slate-900/40 text-[9px] leading-snug font-mono text-slate-500">
            This is a live check, not a list of what is installed. A service that
            is not answering is not missing -- it is not running, or not reachable
            from this tab.
          </p>
        </div>
      )}
    </div>
  );
};
