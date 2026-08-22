import { useEffect, useMemo } from "react";
import type { CVDocument } from "../schema/cv";
import { parseDocument } from "../schema/parse";

const KEY = "cv-maker:doc";
const SAVE_MS = 500;

/**
 *  Storage is a trust boundary like any other JSON: a stored document is
 *  untrusted input by the time it comes back. Anything that fails to parse is
 *  logged and discarded rather than crashing the app on load.
 */
export function loadDoc(): CVDocument | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return null; // storage disabled — run in memory
  }
  if (!raw) return null;

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    console.warn("saved document is not valid JSON — discarding");
    return null;
  }

  const r = parseDocument(json);
  if (!r.ok) {
    console.warn(`saved document rejected — discarding:\n${r.error}`);
    return null;
  }
  return r.doc;
}

export function useAutosave(doc: CVDocument) {
  const json = useMemo(() => JSON.stringify(doc), [doc]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(KEY, json);
      } catch (e) {
        console.warn("autosave failed", e); // quota, or storage disabled
      }
    }, SAVE_MS);
    return () => clearTimeout(timer);
  }, [json]);
}
