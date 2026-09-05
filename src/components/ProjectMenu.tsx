import React, { useEffect, useState } from 'react';
import { FolderOpen, Plus, Save, Trash2, X } from 'lucide-react';
import { useStudioSession } from '../app/StudioSessionContext';
import type { ProjectSummary } from '../lib/projectPersistence';

/**
 * Save, open and start projects.
 *
 * The rolling autosave means a reload already returns you to where you were;
 * this is for keeping named versions and moving between them.
 */
export const ProjectMenu: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const {
    dawState,
    handleSaveProjectAs,
    handleOpenProject,
    handleListProjects,
    handleDeleteProject,
    handleNewProject,
    persistenceError,
    lastSavedAt,
  } = useStudioSession();

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = () => handleListProjects().then(setProjects).catch(() => setProjects([]));

  useEffect(() => {
    if (!isOpen) return;
    setName(dawState.projectName || '');
    setNotice(null);
    refresh();
  }, [isOpen]);

  if (!isOpen) return null;

  // `busy` disables every control on this screen, so it is released in a
  // `finally`. Without one, a save or open that threw left the projects screen
  // permanently dead -- no message, no way to retry, and the creator's only
  // route to their saved work greyed out.
  const save = async () => {
    setBusy(true);
    try {
      const saved = await handleSaveProjectAs(name);
      setNotice(saved ? `Saved "${saved.name}".` : 'Give the project a name first.');
      refresh();
    } catch (err) {
      setNotice(err instanceof Error ? `Could not save: ${err.message}` : 'Could not save that version.');
    } finally {
      setBusy(false);
    }
  };

  const open = async (id: string, label: string) => {
    setBusy(true);
    try {
      const ok = await handleOpenProject(id);
      setNotice(ok ? `Opened "${label}".` : 'That project could not be opened.');
      if (ok) onClose();
    } catch (err) {
      setNotice(err instanceof Error ? `Could not open: ${err.message}` : 'That project could not be opened.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl text-slate-100 flex flex-col gap-4 font-mono text-xs">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-black tracking-wide">PROJECTS</h2>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              Your work is saved as you go
              {lastSavedAt ? ` — last saved ${new Date(lastSavedAt).toLocaleTimeString()}` : ''}. Save a named
              version to keep a copy you can come back to.
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {persistenceError && (
          <div data-testid="persistence-error" className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/50 text-[11px] text-rose-200 font-sans">
            {persistenceError}
          </div>
        )}
        {notice && (
          <div data-testid="project-notice" className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-[11px] text-emerald-200 font-sans">
            {notice}
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            data-testid="project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            className="flex-1 bg-slate-950 text-slate-200 text-xs p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500/60"
          />
          <button
            data-testid="save-project"
            onClick={save}
            disabled={busy}
            className="px-3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black transition cursor-pointer flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" /> SAVE VERSION
          </button>
        </div>

        <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
          {projects.length === 0 && (
            <p className="text-[11px] text-slate-500 font-sans py-2">No saved versions yet.</p>
          )}
          {projects.map((p) => (
            <div key={p.id} data-testid="project-row" className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
              <div className="truncate">
                <p className="font-bold text-slate-100 truncate">{p.name}</p>
                <p className="text-[10px] text-slate-500">
                  {new Date(p.savedAt).toLocaleString()} • {p.trackCount} tracks • {p.noteCount} notes
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  data-testid="open-project"
                  onClick={() => open(p.id, p.name)}
                  disabled={busy}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition cursor-pointer flex items-center gap-1"
                >
                  <FolderOpen className="w-3 h-3" /> OPEN
                </button>
                <button
                  onClick={async () => { await handleDeleteProject(p.id); refresh(); }}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white transition cursor-pointer"
                  title={`Delete "${p.name}"`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          data-testid="new-project"
          onClick={() => { handleNewProject(); setNotice('Started a new empty project.'); }}
          className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> NEW EMPTY PROJECT
        </button>
      </div>
    </div>
  );
};
