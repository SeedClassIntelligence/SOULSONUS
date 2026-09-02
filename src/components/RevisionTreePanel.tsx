import React, { useEffect, useRef, useState } from 'react';
import { GitBranch, Mic, Sparkles, Pencil, Home, CornerDownRight, Download } from 'lucide-react';
import { useStudioSession } from '../app/StudioSessionContext';
import {
  childrenOf,
  isBranchPoint,
  type AdoptScope,
  type Revision,
  type RevisionOrigin,
} from '../lib/revisionTree';

/**
 * The shape of the session, and a way back into any part of it.
 *
 * Undo and redo already existed and were good. What they could not do is the
 * thing every producer needs at two in the morning: walk back three states to
 * hear where a take was going, decide the older one was right, make an edit --
 * and still be able to return to the three states that decision walked away
 * from. A linear stack drops them on that next edit.
 *
 * This does not replace undo. It shows that the discarded path is still there,
 * and lets the creator stand in it again.
 */

const ORIGIN_ICON: Record<RevisionOrigin, React.ReactNode> = {
  root: <Home className="w-3 h-3" />,
  edit: <Pencil className="w-3 h-3" />,
  capture: <Mic className="w-3 h-3" />,
  realization: <Sparkles className="w-3 h-3" />,
};

const ORIGIN_TONE: Record<RevisionOrigin, string> = {
  root: 'text-slate-500',
  edit: 'text-slate-400',
  capture: 'text-rose-400',
  realization: 'text-amber-400',
};

/** Depth-first so a branch reads under the thing it branched from. */
function flatten(revisions: Revision[], parentId: string | null, depth = 0): { rev: Revision; depth: number }[] {
  return childrenOf(revisions, parentId).flatMap((rev) => [
    { rev, depth },
    ...flatten(revisions, rev.revisionId, depth + 1),
  ]);
}

export const RevisionTreePanel: React.FC = () => {
  const { revisions, currentRevisionId, handleJumpToRevision, handleAdoptFromRevision } =
    useStudioSession();
  const [isOpen, setIsOpen] = useState(false);
  /** Which revision's track list is open for picking. Only ever one at a time. */
  const [takingFrom, setTakingFrom] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [scope, setScope] = useState<AdoptScope>('performance');
  const [tookNote, setTookNote] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const togglePick = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [isOpen]);

  const rows = flatten(revisions, null);
  const branchCount = revisions.filter((r) => isBranchPoint(revisions, r.revisionId)).length;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        data-testid="revision-tree-badge"
        onClick={() => setIsOpen((v) => !v)}
        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold transition cursor-pointer ${
          branchCount > 0
            ? 'bg-violet-500/10 text-violet-300 border-violet-500/30'
            : 'bg-slate-900 text-slate-400 border-slate-800'
        }`}
        title={
          branchCount > 0
            ? `${revisions.length} revisions, ${branchCount} point${branchCount === 1 ? '' : 's'} where you went a different way`
            : `${revisions.length} revisions in this session`
        }
      >
        <GitBranch className="w-3.5 h-3.5" />
        <span className="hidden lg:inline">HISTORY</span>
        <span className="font-black">{revisions.length}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[24rem] max-w-[calc(100vw-2rem)] z-50 rounded-xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/60 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-800 bg-slate-900/70">
            <p className="text-[10px] font-mono font-black tracking-wider text-violet-300">
              EVERY STATE THIS SESSION HAS BEEN IN
            </p>
            <p className="text-[9px] font-mono text-slate-500">
              {branchCount > 0
                ? `${branchCount} place${branchCount === 1 ? '' : 's'} where you went back and took another route. Both routes are still here.`
                : 'Undo away from something and come back to it here, even after editing.'}
            </p>
          </div>

          <div className="max-h-[55vh] overflow-y-auto">
            {rows.length === 0 ? (
              <p className="px-3 py-4 text-[10px] font-mono text-slate-500">
                Nothing recorded yet. The first edit or take starts the history.
              </p>
            ) : (
              rows.map(({ rev, depth }) => {
                const isCurrent = rev.revisionId === currentRevisionId;
                const branches = isBranchPoint(revisions, rev.revisionId);
                const isTaking = takingFrom === rev.revisionId;
                return (
                  <div
                    key={rev.revisionId}
                    className={`border-b border-slate-800/70 last:border-b-0 ${isCurrent ? 'bg-violet-500/10' : ''}`}
                  >
                  <div className="flex items-stretch">
                  <button
                    type="button"
                    onClick={() => { handleJumpToRevision(rev.revisionId); setIsOpen(false); }}
                    disabled={isCurrent}
                    className={`flex-1 min-w-0 text-left px-3 py-2 transition ${
                      isCurrent ? 'cursor-default' : 'hover:bg-slate-900 cursor-pointer'
                    }`}
                    title={isCurrent ? 'You are here' : `Stand in "${rev.label}" again`}
                  >
                    <div className="flex items-start gap-2" style={{ paddingLeft: `${Math.min(depth, 6) * 12}px` }}>
                      {depth > 0 && <CornerDownRight className="w-3 h-3 text-slate-700 mt-0.5 shrink-0" />}
                      <span className={`${ORIGIN_TONE[rev.origin]} mt-0.5 shrink-0`}>
                        {ORIGIN_ICON[rev.origin]}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className={`text-[11px] font-bold truncate ${isCurrent ? 'text-violet-200' : 'text-slate-300'}`}>
                            {rev.label}
                          </span>
                          {isCurrent && (
                            <span className="px-1 rounded bg-violet-500/20 text-violet-300 text-[8px] font-black border border-violet-500/30 shrink-0">
                              HERE
                            </span>
                          )}
                          {branches && (
                            <span
                              className="px-1 rounded bg-amber-500/15 text-amber-300 text-[8px] font-black border border-amber-500/30 shrink-0"
                              title="You went two different ways from this point. Both are below."
                            >
                              FORK
                            </span>
                          )}
                        </span>
                        <span className="block text-[9px] font-mono text-slate-500">
                          {rev.origin} · {new Date(rev.at).toLocaleTimeString()}
                        </span>
                      </span>
                    </div>
                  </button>

                  {/* XI.7 -- take material from this revision without leaving
                      where you are. "Give me the drums from version 12." */}
                  {!isCurrent && rev.tracks.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setTookNote(null);
                        setPicked(new Set());
                        setTakingFrom(isTaking ? null : rev.revisionId);
                      }}
                      className={`px-2.5 shrink-0 border-l border-slate-800/70 transition cursor-pointer ${
                        isTaking ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-600 hover:text-cyan-300 hover:bg-slate-900'
                      }`}
                      title={`Take tracks from "${rev.label}" into what you have now, without moving off it`}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}
                  </div>

                  {isTaking && (
                    <div className="px-3 pb-2.5 pt-1 bg-slate-950 space-y-2">
                      <p className="text-[9px] font-mono text-slate-500">
                        Take from "{rev.label}" into what you have now. This does not move you
                        off where you are, and it makes its own revision.
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {rev.tracks.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => togglePick(t.id)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold border transition cursor-pointer ${
                              picked.has(t.id)
                                ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {t.name}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(['performance', 'whole_track'] as AdoptScope[]).map((sc) => (
                          <button
                            key={sc}
                            type="button"
                            onClick={() => setScope(sc)}
                            className={`px-2 py-1 rounded-lg text-[9px] font-mono font-bold border transition cursor-pointer ${
                              scope === sc
                                ? 'bg-slate-800 text-slate-100 border-slate-600'
                                : 'bg-slate-950 text-slate-500 border-slate-800'
                            }`}
                            title={
                              sc === 'performance'
                                ? 'What was played. Leaves the mix you have built since alone.'
                                : 'The whole track, including how it was set up then.'
                            }
                          >
                            {sc === 'performance' ? 'what was played' : 'whole track'}
                          </button>
                        ))}
                        <button
                          type="button"
                          disabled={picked.size === 0}
                          onClick={() => {
                            const res = handleAdoptFromRevision(rev.revisionId, [...picked], scope);
                            setTookNote(res ? res.summary : 'Nothing was taken.');
                            setPicked(new Set());
                          }}
                          className="ml-auto px-2.5 py-1 rounded-lg bg-cyan-500 text-slate-950 text-[9px] font-mono font-black hover:bg-cyan-400 transition cursor-pointer disabled:opacity-30 disabled:cursor-default"
                        >
                          TAKE {picked.size > 0 ? `(${picked.size})` : ''}
                        </button>
                      </div>
                      {tookNote && (
                        <p className="text-[9px] font-mono text-cyan-300 leading-relaxed">{tookNote}</p>
                      )}
                    </div>
                  )}
                  </div>
                );
              })
            )}
          </div>

          <p className="px-3 py-2 border-t border-slate-800 bg-slate-900/40 text-[9px] leading-snug font-mono text-slate-500">
            Going back is itself undoable, and leaving where you are does not lose it.
          </p>
        </div>
      )}
    </div>
  );
};
