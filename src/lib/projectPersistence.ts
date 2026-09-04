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
/**
 * 2 adds the root-seed store below. The bump is additive: IndexedDB keeps
 * every store it already has through an upgrade, and the handler only creates
 * what is missing, so a creator's saved projects come through untouched.
 */
const DB_VERSION = 2;
const STORE = 'projects';
/**
 * A creator's recorded root seeds.
 *
 * Separate from projects on purpose. A root seed is not part of one song --
 * it is the creator's own sound, and it has to be there in the next song and
 * the one after that. Keeping it in the project snapshot would have tied their
 * voice to whichever file it happened to be recorded in.
 */
const SEED_STORE = 'rootSeeds';

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
  dawState: unknown;
  tracks: unknown[];
  sections: unknown[];
  lyricSections: unknown;
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
  /**
   * Gaps between what the creator heard and what came back. Added after v1
   * shipped, so an older snapshot simply lacks them and loads with none --
   * which is correct: it has none, rather than having lost some.
   */
  relayGaps?: unknown[];
  /**
   * The contract the creator set. Added after v1 shipped; an older snapshot
   * lacks them and loads with the contract's long-standing defaults, which is
   * different from a creator who chose to hold nothing.
   */
  intentPreserve?: unknown[];
  intentStrictness?: unknown;
  /**
   * Which quantization mode each track is in, by track id. Added with
   * adjustable quantization; a snapshot without it is a project whose notes
   * are all where they were played.
   */
  trackTimingModes?: Record<string, unknown>;
  /**
   * The affective reading of the take in this project, and the creator's own
   * corrections to it. Added with the expression state; a snapshot without
   * them is a project nobody has read yet.
   */
  /** The production grammar the creator named. Added with genre-as-parameter. */
  genreId?: unknown;
  expressionState?: unknown;
  creatorExpressionReadings?: Record<string, unknown>;
  detectionSettings: unknown;
  activeWorkspace: string;
  /** Added after v1 shipped; older snapshots simply lack them. */
  editorPrefs?: unknown;
  writeRoomDraft?: unknown;
  /** The recorded vocal take, stored as the encoded blob it was captured as. */
  vocalTake: { blob: Blob; duration: number; waveformData: number[] } | null;
  /**
   * Audio for every take in the pool that carries a recording. A take's
   * sourceAudioId is an object URL and cannot survive a reload; the blob can,
   * and the URL is remade from it on load. Added after v1 shipped.
   */
  takeAudio?: { takeId: string; blob: Blob }[];
  /**
   * Timeline audio assets. The blob is the durable part; the asset's object URL
   * is dropped on save and remade on load. Added after v1 shipped.
   */
  audioAssets?: { asset: unknown; blob: Blob | null }[];
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
      if (!db.objectStoreNames.contains(SEED_STORE)) {
        db.createObjectStore(SEED_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Could not open the project database.'));
  });
}

function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
  storeName: string = STORE
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(storeName, mode);
        const req = run(t.objectStore(storeName));
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


/**
 * A root seed as it survives a reload.
 *
 * The blob is the durable part. The object URL the vault plays from cannot be
 * stored -- it is only valid for the tab that made it -- so it is dropped on
 * save and remade on load, the same way takes and timeline assets are handled
 * above. Storing the URL instead would have written a row that looks like a
 * recording and plays nothing, which is worse than storing nothing.
 */
export interface StoredRootSeed {
  id: string;
  name: string;
  category: string;
  tags: string[];
  freqHz: number;
  associatedGesture?: string;
  dateAdded: string;
  waveform?: number[];
  durationSeconds?: number;
  /** The audio the creator actually performed. */
  blob: Blob;
  savedAt: number;
}

/** Writes one root seed. Overwrites a seed with the same id. */
export async function saveRootSeed(seed: StoredRootSeed): Promise<void> {
  await tx('readwrite', (store) => store.put(seed), SEED_STORE);
}

/** Every root seed this creator has recorded, newest first. */
export async function listRootSeeds(): Promise<StoredRootSeed[]> {
  const all = await tx<StoredRootSeed[]>(
    'readonly',
    (store) => store.getAll() as IDBRequest<StoredRootSeed[]>,
    SEED_STORE
  );
  return all.sort((a, b) => b.savedAt - a.savedAt);
}

/** Removes one root seed permanently. */
export async function deleteRootSeed(id: string): Promise<void> {
  await tx('readwrite', (store) => store.delete(id) as unknown as IDBRequest<undefined>, SEED_STORE);
}
