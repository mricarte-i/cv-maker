import { useEffect, useRef, useState } from "react";
import type { CVDocument } from "../schema/cv";
import { emptyDocument } from "../schema/factory";
import { parseDocument } from "../schema/parse";

const DB = "cv-maker";
const STORE = "docs";
const KEY = "current";
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

async function idbGet(): Promise<unknown> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 *  Storage is a trust boundary like any other JSON: a stored document is
 *  untrusted input by the time it comes back. Anything that fails to parse is
 *  logged and discarded rather than crashing the app on load.
 */
function check(raw: unknown): CVDocument | null {
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
    return check(JSON.parse(raw));
  } catch {
    console.warn("saved document is not valid JSON — discarding");
    return null;
  }
}

export async function loadDoc(): Promise<CVDocument | null> {
  const legacy = readLegacy(); // read, but do not clear yet

  let stored: unknown;
  try {
    stored = await idbGet();
  } catch (e) {
    console.warn("indexeddb unavailable — falling back to localStorage", e);
    return legacy;
  }

  if (stored !== undefined) {
    return check(stored);
  }

  // first boot on the new store: adopt whatever localStorage still holds,
  // and only drop the old copy once the new one is safely across
  if (legacy) {
    try {
      await idbPut(legacy);
      localStorage.removeItem(LEGACY_KEY);
    } catch (e) {
      console.warn("could not migrate the saved document into indexeddb", e);
    }
  }
  return legacy;
}

/**
 *  Ask the browser not to evict us. Chrome decides silently from engagement
 *  heuristics; Firefox shows a permission prompt — so only ask once there is
 *  actually a saved document to lose.
 */
export async function requestPersistence(): Promise<boolean> {
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
export function useStoredDocument(): CVDocument | null {
  const [doc, setDoc] = useState<CVDocument | null>(null);

  useEffect(() => {
    let alive = true;
    void loadDoc().then((d) => {
      if (!alive) {
        return;
      }
      if (d) {
        void requestPersistence();
      }
      setDoc(d ?? emptyDocument());
    });
    return () => {
      alive = false;
    };
  }, []);

  return doc;
}

export type SaveState = "saving" | "saved" | "failed";

export function useAutosave(doc: CVDocument) {
  const [state, setState] = useState<SaveState>("saved");
  const latest = useRef(doc);
  const first = useRef(true);
  const seq = useRef(0);

  useEffect(() => {
    latest.current = doc;

    if (first.current) {
      first.current = false;
      return;
    }

    const id = ++seq.current;
    setState("saving");

    const timer = setTimeout(async () => {
      try {
        await idbPut(doc);
        if (id === seq.current) {
          setState("saved");
        }
      } catch (e) {
        console.warn("autosave failed", e);
        if (id === seq.current) {
          setState("failed");
        }
      }
    }, SAVE_MS);
    return () => clearTimeout(timer);
  }, [doc]);

  // a pending debounce dies with the tab — best-effort flush on the way out
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === "hidden") {
        idbPut(latest.current).catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, []);

  return state;
}
