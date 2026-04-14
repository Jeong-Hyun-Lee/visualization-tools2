export type SldExportPayload = {
  format: 'ge-vernova-sld';
  version: 1;
  exportedAt: string;
  graph: unknown;
};

export type SldSavedTab = {
  diagramId: string;
  diagramName: string;
  payload: SldExportPayload;
};

export type SldSavedSession = {
  format: 'ge-vernova-sld-session';
  version: 1;
  savedAt: string;
  tabs: SldSavedTab[];
};

const DB_NAME = 'ge-vernova-sld-indexdb';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';
const CURRENT_KEY = 'current';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function saveCurrentSldSessionToIndexDB(
  session: SldSavedSession,
): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(session, CURRENT_KEY);
  await txDone(tx);
  db.close();
}

export async function loadCurrentSldSessionFromIndexDB(): Promise<
  SldSavedSession | null
> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const req = tx.objectStore(STORE_NAME).get(CURRENT_KEY);

  const result = await new Promise<SldSavedSession | null>((resolve, reject) => {
    req.onsuccess = () => resolve((req.result as SldSavedSession | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });

  await txDone(tx);
  db.close();
  return result;
}

