import { useEffect, useRef, useState } from "react";
import type { CVDocument } from "../schema/cv";
import { emptyDocument, newId } from "../schema/factory";
import { parseDocument } from "../schema/parse";
import {
  ADOPTED_LABEL,
  bootPlan,
  byRecent,
  NEW_LABEL,
  type CVRecord,
} from "./library";

const DB = "cv-maker";
const STORE = "docs";
const LEGACY_DOC_KEY = "current";
const POINTER = "currentId";
const LEGACY_KEY = "cv-maker:doc"; // the localStorage key, pre-IndexedDB
const SAVE_MS = 500;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function idbGet(key: string): Promise<unknown> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbAll(): Promise<unknown[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 *  Storage is a trust boundary like any other JSON: a stored document is
 *  untrusted input by the time it comes back. Anything that fails to parse is
 *  logged and discarded rather than crashing the app on load.
 */
function checkDocument(raw: unknown): CVDocument | null {
  if (raw === undefined) {
    return null; // nothing stored, nothing to check
  }

  const r = parseDocument(raw);
  if (!r.ok) {
    console.warn(`saved document rejected — discarding:\n${r.error}`);
    return null;
  }

  return r.doc;
}

function readLegacy(): CVDocument | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(LEGACY_KEY);
  } catch {
    return null; // storage disabled
  }
  if (!raw) {
    return null;
  }

  try {
    return checkDocument(JSON.parse(raw));
  } catch {
    console.warn("saved document is not valid JSON — discarding");
    return null;
  }
}

function clearLegacy() {
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Ignore errors
  }
}

function checkRecord(raw: unknown): CVRecord | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }

  const r = raw as Partial<CVRecord>;
  if (typeof r.id !== "string" || typeof r.label !== "string") {
    return null;
  }

  const doc = checkDocument(r.doc);
  return doc
    ? { id: r.id, label: r.label, updatedAt: r.updatedAt ?? 0, doc }
    : null;
}

export function newRecord(label = NEW_LABEL): CVRecord {
  return {
    id: newId(),
    label,
    updatedAt: Date.now(),
    doc: emptyDocument(),
  };
}

export async function listRecords(): Promise<CVRecord[]> {
  const raw = await idbAll();
  return byRecent(raw.map(checkRecord).filter((r) => r !== null));
}

export const saveRecord = (r: CVRecord) => idbPut(r.id, r);
export const removeRecord = (r: CVRecord) => idbDelete(r.id);
export const setCurrentId = (id: string) => idbPut(POINTER, id);

async function boot(): Promise<CVRecord> {
  const legacyLocal = readLegacy(); // localStorage
  const pointer = await idbGet(POINTER);
  // Check for a saved document in IndexedDB, or fall back to localStorage
  const stored = checkDocument(await idbGet(LEGACY_DOC_KEY)) ?? legacyLocal;

  const plan = bootPlan(typeof pointer === "string" ? pointer : null, stored);

  if (plan.kind === "load") {
    const found = checkRecord(await idbGet(plan.id));
    if (found) {
      return found;
    }
    // the pointer outlived the record, fall through and start fresh
  }

  const record =
    plan.kind === "adopt"
      ? {
          id: newId(),
          label: ADOPTED_LABEL,
          updatedAt: Date.now(),
          doc: plan.doc,
        }
      : newRecord();

  await saveRecord(record);
  await setCurrentId(record.id);

  if (plan.kind === "adopt") {
    await idbDelete(LEGACY_DOC_KEY);
    clearLegacy();
  }

  return record;
}

/**
 *  Ask the browser not to evict us. Chrome decides silently from engagement
 *  heuristics; Firefox shows a permission prompt — so only ask once there is
 *  actually a saved document to lose.
 */
async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage) {
    return false;
  }
  try {
    return (await navigator.storage.persisted()) || navigator.storage.persist();
  } catch {
    return false;
  }
}

/** null while the read is in flight — callers render a placeholder */

export function useBoot(): CVRecord | null {
  const [record, setRecord] = useState<CVRecord | null>(null);

  useEffect(() => {
    let alive = true;
    void boot()
      .catch((e) => {
        console.warn("indexexdDB unavailable, edits will not be saved", e);
        const doc = readLegacy();
        return doc ? { ...newRecord(ADOPTED_LABEL), doc } : newRecord();
      })
      .then((r) => {
        if (!alive) {
          return;
        }
        void requestPersistence();
        setRecord(r);
      });

    return () => {
      alive = false;
    };
  }, []);

  return record;
}

export type SaveState = "saving" | "saved" | "failed";

export function useAutosave(record: CVRecord) {
  const [state, setState] = useState<SaveState>("saved");
  const latest = useRef(record);
  const first = useRef(true);
  const seq = useRef(0);
  const dirty = useRef(false);

  useEffect(() => {
    latest.current = record;

    if (first.current) {
      first.current = false;
      return;
    }

    const id = ++seq.current;
    dirty.current = true;
    setState("saving");

    const timer = setTimeout(async () => {
      try {
        await saveRecord({ ...record, updatedAt: Date.now() });
        dirty.current = false;

        if (seq.current === id) {
          setState("saved");
        }
      } catch (e) {
        console.warn("failed to save record", e);

        if (seq.current === id) {
          setState("failed");
        }
      }
    }, SAVE_MS);

    return () => clearTimeout(timer);
  }, [record]);

  // a pending debounce dies with the tab — best-effort flush on the way out
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === "hidden") {
        saveRecord({ ...latest.current, updatedAt: Date.now() }).catch(
          () => {},
        );
      }
    };

    document.addEventListener("visibilitychange", flush);

    return () => document.removeEventListener("visibilitychange", flush);
  }, []);

  // switching CVs unmounts this Editor, and that cleanup clears the pending
  // debounce — so without this, the last 500 ms of typing in the CV you are
  // leaving is dropped rather than saved. `dirty` keeps StrictMode's
  // mount/unmount/mount from writing a spurious updatedAt on every dev reload.
  useEffect(() => {
    return () => {
      if (dirty.current) {
        saveRecord({ ...latest.current, updatedAt: Date.now() }).catch(
          () => {},
        );
      }
    };
  }, []);

  return state;
}
