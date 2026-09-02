import React, { useEffect, useRef, useState } from 'react';
import { GitBranch, Mic, Sparkles, Pencil, Home, CornerDownRight } from 'lucide-react';
import { useStudioSession } from '../app/StudioSessionContext';
import { childrenOf, isBranchPoint, type Revision, type RevisionOrigin } from '../lib/revisionTree';

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
  const { revisions, currentRevisionId, handleJumpToRevision } = useStudioSession();
  const [isOpen, setIsOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

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
                return (
                  <button
                    key={rev.revisionId}
                    type="button"
                    onClick={() => { handleJumpToRevision(rev.revisionId); setIsOpen(false); }}
                    disabled={isCurrent}
                    className={`w-full text-left px-3 py-2 border-b border-slate-800/70 last:border-b-0 transition ${
                      isCurrent
                        ? 'bg-violet-500/10 cursor-default'
                        : 'hover:bg-slate-900 cursor-pointer'
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
