# My CVs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep many CVs in the app, switch between them, and search inside them.

**Architecture:** A CV is today's `CVDocument` wrapped as a `CVRecord` and stored
under its own key in the existing IndexedDB `docs` store, with a `"currentId"`
pointer alongside. All decision logic — sorting, search, the boot migration — is
pure and lives in `src/state/library.ts`; `src/state/persist.ts` stays a thin
IDB wrapper. Switching remounts `Editor` with `key={id}`, which resets undo
history and autosave state for free.

**Tech Stack:** React 19, TypeScript, immer, zod, IndexedDB, vitest (bare node,
no jsdom), Tailwind 4, base-ui.

**Spec:** [.agents/my-cvs.md](my-cvs.md)

## Global Constraints

- `SCHEMA_VERSION` stays **3**. `schema/cv.ts`, `schema/parse.ts`,
  `schema/migrate.ts` and `typst/cv.typ` are not touched.
- **No new dependencies.** No `fake-indexeddb`, no jsdom, no fuzzy-search lib.
- Tests run on bare node. Anything needing a test goes in `library.ts`;
  `persist.ts` and all `.tsx` are verified by `pnpm build` plus manual check,
  matching the boundary in progress.md M12.
- Menu item reads **"My CVs"**. Dialog title reads **"Your CVs"**.
- New CV label is **"Untitled CV"**. Duplicate label is `` `${label} copy` ``.
- Delete confirms with `window.confirm`, matching "Start over" and import.
- Dates render with `toLocaleDateString()`.
- Run `pnpm test` and `pnpm lint` before every commit.

---

### Task 1: `library.ts` — record type, ordering, labels, boot decision

**Files:**
- Create: `src/state/library.ts`
- Test: `src/state/library.test.ts`

**Interfaces:**
- Consumes: `CVDocument` from `../schema/cv`
- Produces:
  - `type CVRecord = { id: string; label: string; updatedAt: number; doc: CVDocument }`
  - `type BootPlan = { kind: "load"; id: string } | { kind: "adopt"; doc: CVDocument } | { kind: "create" }`
  - `bootPlan(pointer: string | null, legacy: CVDocument | null): BootPlan`
  - `byRecent(records: CVRecord[]): CVRecord[]`
  - `copyLabel(label: string): string`
  - `NEW_LABEL: string`, `ADOPTED_LABEL: string`

- [x] **Step 1: Write the failing test**

`src/state/library.test.ts`:

```ts
import { expect, test } from "vitest";
import { emptyDocument } from "../schema/factory";
import { bootPlan, byRecent, copyLabel, type CVRecord } from "./library";

const rec = (id: string, label: string, updatedAt: number): CVRecord => ({
  id,
  label,
  updatedAt,
  doc: emptyDocument(),
});

test("byRecent puts the most recently edited first", () => {
  const out = byRecent([rec("a", "A", 10), rec("c", "C", 30), rec("b", "B", 20)]);
  expect(out.map((r) => r.id)).toEqual(["c", "b", "a"]);
});

test("byRecent does not mutate its input", () => {
  const input = [rec("a", "A", 10), rec("b", "B", 20)];
  byRecent(input);
  expect(input.map((r) => r.id)).toEqual(["a", "b"]);
});

test("a copy is named after its original", () => {
  expect(copyLabel("Frontend")).toBe("Frontend copy");
  expect(copyLabel("Frontend copy")).toBe("Frontend copy copy");
});

test("a stored pointer means load that record", () => {
  expect(bootPlan("abc", null)).toEqual({ kind: "load", id: "abc" });
});

test("no pointer but a legacy document means adopt it", () => {
  const doc = emptyDocument();
  expect(bootPlan(null, doc)).toEqual({ kind: "adopt", doc });
});

test("the pointer wins even when a legacy document is still lying around", () => {
  // the delete after adopting could have failed; the pointer is the truth
  expect(bootPlan("abc", emptyDocument())).toEqual({ kind: "load", id: "abc" });
});

test("nothing stored means create", () => {
  expect(bootPlan(null, null)).toEqual({ kind: "create" });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/state/library.test.ts`
Expected: FAIL — `Failed to resolve import "./library"`.

- [x] **Step 3: Write minimal implementation**

`src/state/library.ts`:

```ts
import type { CVDocument } from "../schema/cv";

/** a CV: today's document plus what the library needs to list it */
export type CVRecord = {
  id: string;
  label: string;
  updatedAt: number;
  doc: CVDocument;
};

export const NEW_LABEL = "Untitled CV";
export const ADOPTED_LABEL = "My CV";

/** what boot should do, decided from what storage held. pure so it can be
    tested without an IndexedDB */
export type BootPlan =
  | { kind: "load"; id: string }
  | { kind: "adopt"; doc: CVDocument }
  | { kind: "create" };

export function bootPlan(
  pointer: string | null,
  legacy: CVDocument | null,
): BootPlan {
  if (pointer) {
    return { kind: "load", id: pointer };
  }
  return legacy ? { kind: "adopt", doc: legacy } : { kind: "create" };
}

/** most recently edited first — the library's only ordering */
export const byRecent = (records: CVRecord[]): CVRecord[] =>
  [...records].sort((a, b) => b.updatedAt - a.updatedAt);

export const copyLabel = (label: string) => `${label} copy`;
```

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/state/library.test.ts`
Expected: PASS, 7 tests.

Then `pnpm build`. Vitest does not typecheck, so a green suite can still hide a
`noUnusedLocals` error in the test file — a dropped assertion whose import
stayed behind fails `tsc -b` while `pnpm test` passes. CI runs both.

- [x] **Step 5: Commit**

```bash
git add src/state/library.ts src/state/library.test.ts
git commit -m "add library record type, ordering and boot decision"
```

---

### Task 2: `library.ts` — search

**Files:**
- Modify: `src/state/library.ts`
- Test: `src/state/library.test.ts`

**Interfaces:**
- Consumes: `CVRecord` from Task 1
- Produces:
  - `strings(v: unknown): string[]`
  - `tokenize(query: string): string[]`
  - `matches(fields: string[], tokens: string[]): boolean`
  - `hit(fields: string[], token: string): string | null`
  - `cut(text: string, token: string, pad?: number): { before: string; match: string; after: string }`

- [ ] **Step 1: Write the failing test**

Append to `src/state/library.test.ts`:

```ts
import { cut, hit, matches, strings, tokenize } from "./library";

const doc = () => ({
  ...emptyDocument(),
  name: "Matias Ricarte",
  sections: [
    {
      id: "s1",
      label: "Experience",
      items: [
        {
          kind: "entry" as const,
          id: "e1",
          variant: "project" as const,
          title: "Ticker engine",
          subtitle: "Flowics",
          date: "2021",
          location: "Argentina",
          body: [
            {
              kind: "bullets" as const,
              id: "b1",
              items: [{ id: "x", text: "Rewrote the hooks in React" }],
            },
          ],
        },
      ],
    },
  ],
});

test("strings harvests human text, one entry per field", () => {
  const out = strings(doc());
  expect(out).toContain("Matias Ricarte");
  expect(out).toContain("Ticker engine");
  expect(out).toContain("Rewrote the hooks in React");
});

test("strings skips ids, kinds and variants", () => {
  const out = strings(doc());
  // without these skips, searching "project" or "entry" matches every CV
  expect(out).not.toContain("project");
  expect(out).not.toContain("entry");
  expect(out).not.toContain("e1");
  expect(out).not.toContain("s1");
});

test("tokenize splits on whitespace and drops empties", () => {
  expect(tokenize("  react   hooks ")).toEqual(["react", "hooks"]);
  expect(tokenize("   ")).toEqual([]);
});

test("every token must appear, order does not matter", () => {
  const fields = strings(doc());
  expect(matches(fields, tokenize("react hooks"))).toBe(true);
  expect(matches(fields, tokenize("hooks react"))).toBe(true);
  expect(matches(fields, tokenize("react kotlin"))).toBe(false);
});

test("tokens may live in different fields", () => {
  const fields = strings(doc());
  expect(matches(fields, tokenize("react flowics"))).toBe(true);
});

test("an empty query matches everything", () => {
  expect(matches(strings(doc()), tokenize(""))).toBe(true);
});

test("matching is case-insensitive", () => {
  expect(matches(strings(doc()), tokenize("REACT"))).toBe(true);
});

test("hit returns the first field holding the token", () => {
  expect(hit(strings(doc()), "hooks")).toBe("Rewrote the hooks in React");
  expect(hit(strings(doc()), "kotlin")).toBeNull();
});

test("cut windows around the match and splits it into three", () => {
  const c = cut("Rewrote the hooks in React", "hooks", 4);
  expect(c.before).toBe("…e the ");
  expect(c.match).toBe("hooks");
  expect(c.after).toBe(" in …");
});

test("cut keeps the real casing of the match, not the query's", () => {
  expect(cut("Rewrote in React", "react").match).toBe("React");
});

test("cut does not put an ellipsis on an edge it did not trim", () => {
  const c = cut("React", "react", 30);
  expect(c.before).toBe("");
  expect(c.after).toBe("");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/state/library.test.ts`
Expected: FAIL — `strings`, `tokenize`, `matches`, `hit`, `cut` are not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `src/state/library.ts`:

```ts
/** every human-authored string in a document, one entry per field. never
    joined: a joined haystack lets a snippet straddle two unrelated fields */
export const strings = (v: unknown): string[] =>
  typeof v === "string"
    ? [v]
    : Array.isArray(v)
      ? v.flatMap(strings)
      : typeof v === "object" && v !== null
        ? Object.entries(v).flatMap(([k, x]) =>
            // schema, not content — without these, "project" matches every CV
            k === "id" || k === "kind" || k === "variant" ? [] : strings(x),
          )
        : [];

export const tokenize = (query: string) =>
  query.toLowerCase().split(/\s+/).filter(Boolean);

/** every token somewhere, in any field, in any order */
export const matches = (fields: string[], tokens: string[]) =>
  tokens.every((t) => fields.some((f) => f.toLowerCase().includes(t)));

export const hit = (fields: string[], token: string) =>
  fields.find((f) => f.toLowerCase().includes(token)) ?? null;

/** a window around the first hit, split so React can wrap the middle without
    dangerouslySetInnerHTML or a regex built from user input */
export function cut(text: string, token: string, pad = 30) {
  const i = text.toLowerCase().indexOf(token);
  const start = Math.max(0, i - pad);
  const end = Math.min(text.length, i + token.length + pad);
  return {
    before: (start > 0 ? "…" : "") + text.slice(start, i),
    match: text.slice(i, i + token.length),
    after: text.slice(i + token.length, end) + (end < text.length ? "…" : ""),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS, all files.

- [ ] **Step 5: Commit**

```bash
git add src/state/library.ts src/state/library.test.ts
git commit -m "add content search: harvest, token matching, snippet"
```

---

### Task 3: `persist.ts` — store records instead of one document

**Files:**
- Modify: `src/state/persist.ts` (replaces `KEY`/`idbGet`/`idbPut`/`loadDoc`/`useStoredDocument`)

**Interfaces:**
- Consumes: `bootPlan`, `byRecent`, `CVRecord`, `NEW_LABEL`, `ADOPTED_LABEL` from Task 1
- Produces:
  - `listRecords(): Promise<CVRecord[]>` — sorted by `byRecent`
  - `saveRecord(r: CVRecord): Promise<void>`
  - `removeRecord(id: string): Promise<void>`
  - `setCurrentId(id: string): Promise<void>`
  - `newRecord(label?: string): CVRecord`
  - `useBoot(): CVRecord | null` — replaces `useStoredDocument`
  - `useAutosave(record: CVRecord): SaveState` — signature change from `CVDocument`

No automated test: this is the IDB wrapper, deliberately on the untested side of
the seam. Its decisions live in `library.ts` and were tested in Task 1.

- [ ] **Step 1: Replace the key constants and record helpers**

In `src/state/persist.ts`, replace `const KEY = "current";` with:

```ts
const LEGACY_DOC_KEY = "current"; // pre-library: one bare CVDocument
const POINTER = "currentId";
```

- [ ] **Step 2: Make the IDB helpers take a key**

Replace `idbGet` and `idbPut` with keyed versions and add the two the library needs:

```ts
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
```

- [ ] **Step 3: Add record validation and the public operations**

`check()` already parses a `CVDocument` and discards anything invalid. Add a
record-level wrapper beside it and the four operations:

```ts
/** a stored record is untrusted input, same as a stored document */
function checkRecord(raw: unknown): CVRecord | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const r = raw as Partial<CVRecord>;
  if (typeof r.id !== "string" || typeof r.label !== "string") {
    return null;
  }
  const doc = check(r.doc);
  return doc
    ? { id: r.id, label: r.label, updatedAt: r.updatedAt ?? 0, doc }
    : null;
}

export function newRecord(label = NEW_LABEL): CVRecord {
  return { id: newId(), label, updatedAt: Date.now(), doc: emptyDocument() };
}

export async function listRecords(): Promise<CVRecord[]> {
  const raw = await idbAll();
  return byRecent(raw.map(checkRecord).filter((r) => r !== null));
}

export const saveRecord = (r: CVRecord) => idbPut(r.id, r);
export const removeRecord = (id: string) => idbDelete(id);
export const setCurrentId = (id: string) => idbPut(POINTER, id);
```

Add `newId` to the existing import from `../schema/factory`, and import
`bootPlan`, `byRecent`, `ADOPTED_LABEL`, `NEW_LABEL` and `type CVRecord` from
`./library`.

`idbAll()` returns the pointer string too; `checkRecord` rejects it, because a
bare string is not an object. That is the filter, not an accident.

- [ ] **Step 4: Replace `loadDoc` with the boot path**

Replace `loadDoc()` and `useStoredDocument()` with:

```ts
async function boot(): Promise<CVRecord> {
  const legacyLocal = readLegacy(); // localStorage, pre-IndexedDB
  const pointer = await idbGet(POINTER);
  const stored = check(await idbGet(LEGACY_DOC_KEY)) ?? legacyLocal;

  const plan = bootPlan(typeof pointer === "string" ? pointer : null, stored);

  if (plan.kind === "load") {
    const found = checkRecord(await idbGet(plan.id));
    if (found) {
      return found;
    }
    // the pointer outlived its record — fall through and start clean
  }

  const record =
    plan.kind === "adopt"
      ? { id: newId(), label: ADOPTED_LABEL, updatedAt: Date.now(), doc: plan.doc }
      : newRecord();

  await saveRecord(record);
  await setCurrentId(record.id);
  if (plan.kind === "adopt") {
    await idbDelete(LEGACY_DOC_KEY);
    clearLegacy();
  }
  return record;
}

export function useBoot(): CVRecord | null {
  const [record, setRecord] = useState<CVRecord | null>(null);

  useEffect(() => {
    let alive = true;
    void boot().then((r) => {
      if (!alive) {
        return;
      }
      void requestPersistence(); // a library is worth more than one document
      setRecord(r);
    });
    return () => {
      alive = false;
    };
  }, []);

  return record;
}
```

`clearLegacy()` is the two lines `loadDoc` used to run inline — extract them so
`boot()` can call it:

```ts
function clearLegacy() {
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // storage disabled; nothing to clear
  }
}
```

`loadDoc` guarded its `idbPut`/`removeItem` pair in a try/catch so a failed
migration left the localStorage copy alone. `boot()` keeps that ordering:
`clearLegacy()` runs only after `saveRecord` and `setCurrentId` have resolved.

- [ ] **Step 5: Move `useAutosave` onto records, and flush on unmount**

Three changes. The signature and what it writes:

```ts
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
  }, [record]);
```

The hidden-flush effect keeps its shape; only the value it writes changes:

```ts
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === "hidden") {
        saveRecord({ ...latest.current, updatedAt: Date.now() }).catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, []);
```

And a third effect, which is load-bearing for switching:

```ts
  // switching CVs unmounts this Editor, and that cleanup clears the pending
  // debounce — so without this, the last 500 ms of typing in the CV you are
  // leaving is dropped rather than saved. `dirty` keeps StrictMode's
  // mount/unmount/mount from writing a spurious updatedAt on every dev reload.
  useEffect(() => {
    return () => {
      if (dirty.current) {
        saveRecord({ ...latest.current, updatedAt: Date.now() }).catch(() => {});
      }
    };
  }, []);
```

This is spec §5 step 1. The remount gives history and autosave a clean start for
free, but only this makes the outgoing document safe.

- [ ] **Step 6: Verify it compiles and nothing regressed**

Run: `pnpm test && pnpm build`
Expected: tests PASS; `tsc -b` fails only in `App.tsx`, which Task 4 fixes.

- [ ] **Step 7: Commit**

```bash
git add src/state/persist.ts
git commit -m "store CVs as records with a currentId pointer"
```

---

### Task 4: `App.tsx` — hold the current CV and switch by remounting

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useBoot`, `useAutosave`, `listRecords`, `setCurrentId` from Task 3;
  `CVRecord` from Task 1
- Produces: `Editor` takes `record: CVRecord`; `EditorTopbar` takes
  `onOpenLibrary: () => void`

- [ ] **Step 1: Switch the root component to records**

Replace the body of `App()`:

```tsx
function App() {
  const booted = useBoot();
  const [current, setCurrent] = useState<CVRecord | null>(null);
  const record = current ?? booted;

  if (!record) {
    return (
      <div className="grid h-screen place-items-center text-sm text-muted-foreground">
        loading…
      </div>
    );
  }

  // the key is the switch: a new CV remounts Editor, so useHistory starts over
  // and undo cannot cross a CV boundary
  return (
    <Editor
      key={record.id}
      record={record}
      onSwitch={(r) => {
        void setCurrentId(r.id);
        setCurrent(r);
      }}
    />
  );
}
```

- [ ] **Step 2: Thread the record through `Editor`**

In `Editor`, change the props and the two lines that consume them:

```tsx
function Editor({
  record,
  onSwitch,
}: {
  record: CVRecord;
  onSwitch: (r: CVRecord) => void;
}) {
  const [library, setLibrary] = useState(false);
  const { doc, dispatch, undo, redo, canUndo, canRedo } = useHistory(record.doc);
  const save = useAutosave({ ...record, doc });
```

`{ ...record, doc }` is what makes autosave write the edited document under this
CV's id while keeping its label.

- [ ] **Step 3: Add the menu item and mount the dialog**

In `EditorTopbar`, accept `onOpenLibrary: () => void` and add an item above
`About`:

```tsx
            <MenuSeparator />
            <MenuItem onClick={onOpenLibrary}>My CVs</MenuItem>
```

In `Editor`'s JSX, pass `onOpenLibrary={() => setLibrary(true)}` to
`EditorTopbar`, and mount the dialog next to `<UpdateDialog />`:

```tsx
          <LibraryDialog
            open={library}
            onOpenChange={setLibrary}
            currentId={record.id}
            onSwitch={onSwitch}
          />
```

- [ ] **Step 4: Verify**

Run: `pnpm test && pnpm build && pnpm lint`
Task 5 creates the real `LibraryDialog`. To make *this* task compile on its
own, create `src/ui/LibraryDialog.tsx` as a stub with the final signature —
Task 5 replaces the body, not the props:

```tsx
import type { CVRecord } from "@/state/library";

export function LibraryDialog(_: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentId: string;
  onSwitch: (r: CVRecord) => void;
}) {
  return null;
}
```

- [ ] **Step 5: Manual check**

Run `pnpm dev`. Expected: the existing CV loads exactly as before, edits still
autosave, and DevTools → Application → IndexedDB → `cv-maker` → `docs` shows a
`currentId` string plus one record keyed by a uuid, with `current` gone.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/ui/LibraryDialog.tsx
git commit -m "hold the current CV in App, switch by remounting Editor"
```

---

### Task 5: `LibraryDialog` — list, switch, create, duplicate, rename, delete

**Files:**
- Create: `src/ui/LibraryDialog.tsx`

**Interfaces:**
- Consumes: `listRecords`, `saveRecord`, `removeRecord`, `newRecord` from
  Task 3; `byRecent`, `copyLabel`, `CVRecord` from Task 1
- Produces: `LibraryDialog({ open, onOpenChange, currentId, onSwitch })`

- [ ] **Step 1: Build the list**

```tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { newId } from "@/schema/factory";
import { copyLabel, type CVRecord } from "@/state/library";
import {
  listRecords,
  newRecord,
  removeRecord,
  saveRecord,
} from "@/state/persist";

export function LibraryDialog({
  open,
  onOpenChange,
  currentId,
  onSwitch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentId: string;
  onSwitch: (r: CVRecord) => void;
}) {
  const [records, setRecords] = useState<CVRecord[]>([]);

  // re-list on open rather than mirroring autosave's writes: one source of
  // truth, and the list is only ever looked at when it is open
  useEffect(() => {
    if (open) {
      void listRecords().then(setRecords);
    }
  }, [open]);

  const refresh = () => void listRecords().then(setRecords);

  const pick = (r: CVRecord) => {
    onSwitch(r);
    onOpenChange(false);
  };

  const create = async () => {
    const r = newRecord();
    await saveRecord(r);
    pick(r);
  };

  const duplicate = async (r: CVRecord) => {
    await saveRecord({
      ...r,
      id: newId(),
      label: copyLabel(r.label),
      updatedAt: Date.now(),
    });
    refresh();
  };

  const rename = async (r: CVRecord, label: string) => {
    if (label.trim() && label !== r.label) {
      await saveRecord({ ...r, label: label.trim() });
      refresh();
    }
  };

  const destroy = async (r: CVRecord) => {
    if (!window.confirm(`Delete "${r.label}"? This cannot be undone.`)) {
      return;
    }
    await removeRecord(r.id);
    const left = await listRecords();
    setRecords(left);
    // deleting the CV you are in has to land somewhere
    if (r.id === currentId) {
      const next = left[0] ?? newRecord();
      if (!left[0]) {
        await saveRecord(next);
      }
      pick(next);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Your CVs</DialogTitle>
        </DialogHeader>

        <ul className="max-h-96 space-y-1 overflow-y-auto">
          {records.map((r) => (
            <li
              key={r.id}
              className="group/row hover:bg-muted flex items-baseline gap-2 rounded-sm px-2 py-1"
            >
              <span className="text-pencil w-3 shrink-0 text-xs">
                {r.id === currentId ? "▸" : ""}
              </span>
              <Input
                className="h-7 flex-1 border-b-transparent text-sm"
                defaultValue={r.label}
                aria-label="CV name"
                onBlur={(e) => void rename(r, e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              />
              <span className="text-pencil shrink-0 text-xs tabular-nums">
                {new Date(r.updatedAt).toLocaleDateString()}
              </span>
              <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover/row:opacity-100 pointer-coarse:opacity-100">
                <Button size="xs" variant="ghost" onClick={() => pick(r)}>
                  open
                </Button>
                <Button size="xs" variant="ghost" onClick={() => void duplicate(r)}>
                  duplicate
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => void destroy(r)}
                >
                  delete
                </Button>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex justify-end">
          <Button size="xs" onClick={() => void create()}>
            New CV
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm test && pnpm build && pnpm lint`
Expected: all pass.

- [ ] **Step 3: Manual check**

Run `pnpm dev` and, in order: create a CV, type a name into it, reopen the
dialog and confirm it sorted to the top; duplicate one and confirm the copy is
independent (edit it, check the original did not change); rename one and reopen
to confirm it stuck; delete a non-current one; delete the current one and
confirm you land in another CV rather than a blank screen.

- [ ] **Step 4: Commit**

```bash
git add src/ui/LibraryDialog.tsx
git commit -m "add the My CVs dialog: switch, create, duplicate, rename, delete"
```

---

### Task 6: Search inside the CVs

**Files:**
- Modify: `src/ui/LibraryDialog.tsx`

**Interfaces:**
- Consumes: `strings`, `tokenize`, `matches`, `hit`, `cut` from Task 2

- [ ] **Step 1: Add the query state and the filter**

Inside `LibraryDialog`, above the return:

```tsx
  const [query, setQuery] = useState("");
  const tokens = tokenize(query);

  // harvested once per list, not per keystroke
  const fields = useMemo(
    () => new Map(records.map((r) => [r.id, strings(r.doc)])),
    [records],
  );

  const shown = records.filter((r) =>
    matches([r.label, ...(fields.get(r.id) ?? [])], tokens),
  );
```

Add `useMemo` to the React import, and `cut`, `hit`, `matches`, `strings`,
`tokenize` to the `@/state/library` import. Render `shown` instead of `records`.

- [ ] **Step 2: Add the search input**

Directly under `<DialogHeader>`:

```tsx
        <Input
          className="h-8 text-sm"
          placeholder="search your CVs"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
```

- [ ] **Step 3: Add the snippet under each row**

Add this component in the same file:

```tsx
/** shows why a CV matched. a label hit needs no snippet — you can already see
    the label */
function Snippet({ fields, tokens }: { fields: string[]; tokens: string[] }) {
  const token = tokens[0];
  const field = token ? hit(fields, token) : null;
  if (!field) {
    return null;
  }
  const { before, match, after } = cut(field, token);
  return (
    <p className="text-pencil truncate pl-5 text-xs">
      {before}
      <mark className="bg-primary/20 rounded-[2px] text-inherit">{match}</mark>
      {after}
    </p>
  );
}
```

The `<li>` becomes a column: the existing row moves into an inner `div` that
keeps its classes verbatim, and the snippet sits under it. Replace the whole
`<li>` from Task 5 with:

```tsx
            <li
              key={r.id}
              className="group/row hover:bg-muted flex flex-col rounded-sm px-2 py-1"
            >
              <div className="flex items-baseline gap-2">
                <span className="text-pencil w-3 shrink-0 text-xs">
                  {r.id === currentId ? "▸" : ""}
                </span>
                <Input
                  className="h-7 flex-1 border-b-transparent text-sm"
                  defaultValue={r.label}
                  aria-label="CV name"
                  onBlur={(e) => void rename(r, e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                />
                <span className="text-pencil shrink-0 text-xs tabular-nums">
                  {new Date(r.updatedAt).toLocaleDateString()}
                </span>
                <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover/row:opacity-100 pointer-coarse:opacity-100">
                  <Button size="xs" variant="ghost" onClick={() => pick(r)}>
                    open
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => void duplicate(r)}>
                    duplicate
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => void destroy(r)}
                  >
                    delete
                  </Button>
                </div>
              </div>

              {tokens.length > 0 &&
                !r.label.toLowerCase().includes(tokens[0]) && (
                  <Snippet fields={fields.get(r.id) ?? []} tokens={tokens} />
                )}
            </li>
```

- [ ] **Step 4: Verify**

Run: `pnpm test && pnpm build && pnpm lint`
Expected: all pass.

- [ ] **Step 5: Manual check**

Run `pnpm dev` with at least two CVs whose bodies differ. Search a word that
appears only in one CV's bullets — expect that CV alone, with a snippet showing
the sentence and the word marked. Search two words in different fields
(`react flowics`) — expect the CV to match. Search a CV's name — expect it to
match with no snippet. Search `project` — expect it *not* to match everything,
which is the `variant` skip from Task 2 doing its job.

- [ ] **Step 6: Commit**

```bash
git add src/ui/LibraryDialog.tsx
git commit -m "search inside CVs, with the matching line shown"
```

---

## After the plan

Update `.agents/progress.md`: a new milestone for the library, and Q3 in the
open-questions table moves from "✅ resolved — one" to resolved the other way,
with the reason it was reopened (dozens of CVs maintained in parallel, which
export/import does not serve).

M10's export-all becomes materially more urgent — §8 of the spec. Thirty CVs in
one browser's IndexedDB is a year of applications behind a "clear site data".
