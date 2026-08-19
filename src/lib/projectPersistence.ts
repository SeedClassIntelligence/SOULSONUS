/**
 * Project persistence.
 *
 * Until now nothing in the app saved or loaded anything: a reload discarded
 * the entire session, which is the real reason every project opened on the
 * same demo pattern. Capture, the mastering chain and the bounce are all real
 * now, so without this none of what a creator makes survives.
 *
 * IndexedDB rather than localStorage: a session holds recorded vocal takes as
 * Blobs, which localStorage cannot store at all and whose size would blow its
 * ~5 MB budget anyway.
 */

const DB_NAME = 'soulsonus';
const DB_VERSION = 1;
const STORE = 'projects';

/** Fixed key for the rolling autosave, so a reload always finds the last session. */
export const AUTOSAVE_ID = '__autosave__';

/**
 * Bump when the shape changes. A snapshot from a newer schema is refused
 * rather than half-read, which would silently drop a creator's work.
 */
export const SCHEMA_VERSION = 1;

export interface ProjectSnapshot {
  schemaVersion: number;
  id: string;
  name: string;
  savedAt: number;
  /** Everything below is the creative work; transient UI state is not stored. */
  dawState: Record<string, unknown>;
  tracks: unknown[];
  sections: unknown[];
  lyricSections: Record<string, unknown>;
  masteringChain: unknown;
  masterCandidates: unknown[];
  activeMasterCandidateId: string;
  buses: unknown[];
  mixSnapshots: unknown[];
  referenceTrack: unknown;
  acceptedMixPrint: unknown;
  seedRecords: unknown[];
  lineageRecords: unknown[];
  decisionRecords: unknown[];
  detectionSettings: Record<string, unknown>;
  activeWorkspace: string;
  /** Added after v1 shipped; older snapshots simply lack them. */
  editorPrefs?: Record<string, unknown>;
  writeRoomDraft?: Record<string, unknown>;
  /** The recorded vocal take, stored as the encoded blob it was captured as. */
  vocalTake: { blob: Blob; duration: number; waveformData: number[] } | null;
}

export interface ProjectSummary {
  id: string;
  name: string;
  savedAt: number;
  trackCount: number;
  noteCount: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('This browser has no IndexedDB, so projects cannot be saved.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Could not open the project database.'));
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('Project database request failed.'));
        t.oncomplete = () => db.close();
      })
  );
}

/** Writes a snapshot. Overwrites any snapshot with the same id. */
export async function saveProject(snapshot: ProjectSnapshot): Promise<void> {
  await tx('readwrite', (store) => store.put(snapshot));
}

export async function loadProject(id: string): Promise<ProjectSnapshot | null> {
  const found = await tx<ProjectSnapshot | undefined>('readonly', (store) => store.get(id));
  if (!found) return null;
  if (found.schemaVersion > SCHEMA_VERSION) {
    throw new Error(
      `"${found.name}" was saved by a newer version of SoulSonus (format ${found.schemaVersion}). ` +
        'Update the app to open it — opening it here would drop the parts this version does not understand.'
    );
  }
  return found;
}

export async function deleteProject(id: string): Promise<void> {
  await tx('readwrite', (store) => store.delete(id));
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const all = await tx<ProjectSnapshot[]>('readonly', (store) => store.getAll());
  return all
    .filter((p) => p.id !== AUTOSAVE_ID)
    .map((p) => ({
      id: p.id,
      name: p.name,
      savedAt: p.savedAt,
      trackCount: Array.isArray(p.tracks) ? p.tracks.length : 0,
      noteCount: Array.isArray(p.tracks)
        ? (p.tracks as { noteEvents?: unknown[] }[]).reduce(
            (acc, t) => acc + (t.noteEvents?.length ?? 0),
            0
          )
        : 0,
    }))
    .sort((a, b) => b.savedAt - a.savedAt);
}

/** Rough byte size of what is stored, so the UI can be honest about usage. */
export async function estimateUsage(): Promise<{ usageBytes: number; quotaBytes: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
  const est = await navigator.storage.estimate();
  return { usageBytes: est.usage ?? 0, quotaBytes: est.quota ?? 0 };
}
