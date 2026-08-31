import { useCallback, useReducer, useRef } from "react";
import type { CVDocument } from "../schema/cv";
import { reducer, type Action } from "./reducer";

const LIMIT = 100;
/** a pause longer than this starts a new undo entry */
const IDLE_MS = 600;

/**
 * Actions that merge into the entry before them. The key is what "the same
 * edit" means: same action, same target, same field — so retitling a job and
 * then changing its date are two undos, not one.
 * Anything structural (adds, removes, moves, duplicates, doc/replace) returns
 * null and always starts a fresh entry.
 */
const coalesceKey = (a: Action): string | null => {
  const fields = (patch: object) => Object.keys(patch).sort().join(",");

  switch (a.type) {
    case "doc/set":
      return `doc/set:${a.field}`;
    case "section/update":
      return `section:${a.id}`;
    case "paragraph/update":
      return `paragraph:${a.id}`;
    case "bullet/update":
      return `bullet:${a.blockId}:${a.index}`;
    case "contact/update":
    case "oneline/update":
      return `${a.type}:${a.id}:${fields(a.patch)}`;
    case "entry/update":
      // the variant chip rearranges the whole row — that is a step, not typing
      return "variant" in a.patch ? null : `entry:${a.id}:${fields(a.patch)}`;
    case "tags/update":
      // adding, removing, or reordering pills is structural; the title is text
      return "items" in a.patch ? null : `tags:${a.id}`;
    default:
      return null;
  }
};

type State = {
  past: CVDocument[];
  doc: CVDocument;
  future: CVDocument[];
};

type HistoryAction =
  | { type: "history/edit"; action: Action; merge: boolean }
  | { type: "history/undo" }
  | { type: "history/redo" };

const historyReducer = (s: State, h: HistoryAction): State => {
  switch (h.type) {
    case "history/undo": {
      const prev = s.past.at(-1);
      return prev
        ? { past: s.past.slice(0, -1), doc: prev, future: [s.doc, ...s.future] }
        : s;
    }
    case "history/redo": {
      const [next, ...rest] = s.future;
      return next ? { past: [...s.past, s.doc], doc: next, future: rest } : s;
    }
    case "history/edit": {
      const doc = reducer(s.doc, h.action);
      // immer returns the base object when a recipe writes an identical value,
      // so retyping the same character never reaches the history at all
      if (doc === s.doc) {
        return s;
      }
      return {
        past: h.merge ? s.past : [...s.past, s.doc].slice(-LIMIT),
        doc,
        future: [],
      };
    }
  }
};

export function useHistory(initial: CVDocument) {
  const [state, raw] = useReducer(historyReducer, {
    past: [],
    doc: initial,
    future: [],
  });

  // the clock lives out here so the reducer stays pure — StrictMode invokes
  // reducers twice, and a Date.now() inside one is a real impurity
  const last = useRef<{ key: string | null; at: number }>({ key: null, at: 0 });

  const dispatch = useCallback((action: Action) => {
    const key = coalesceKey(action);
    const now = Date.now();
    const merge =
      key !== null &&
      key === last.current.key &&
      now - last.current.at < IDLE_MS;
    last.current = { key, at: now };
    raw({ type: "history/edit", action, merge });
  }, []);

  const step = useCallback((type: "history/undo" | "history/redo") => {
    // never merge across a jump — the next keystroke starts its own entry
    last.current = { key: null, at: 0 };
    raw({ type });
  }, []);

  const undo = useCallback(() => step("history/undo"), [step]);
  const redo = useCallback(() => step("history/redo"), [step]);

  return {
    doc: state.doc,
    dispatch,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
