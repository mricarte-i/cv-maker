# Import a CV Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** From the My CVs view, pick a `content.json` and get a new CV from it.

**Architecture:** Nothing new parses anything. `importDocument(file)` already
reads a `File`, parses it and runs the v1 → v3 migration, and it is already
tested — this plan wires it to a file input in `CVList` and mints a `CVRecord`
around whatever comes back. The only new logic is the label the new CV gets,
which is pure and therefore lives in `library.ts`.

**Tech Stack:** React 19, TypeScript, zod, IndexedDB, vitest (bare node, no
jsdom), Tailwind 4.

**Spec:** [.agents/my-cvs.md](my-cvs.md) §2 — "an imported file would collide on
`id` with whatever is already stored. Re-minting on import throws away the
property that motivated it." Import mints a fresh `id` and takes its `label`
from outside the document, which is what this plan builds.

## Global Constraints

- `SCHEMA_VERSION` stays **3**. `schema/`, `state/transfer.ts` and
  `typst/cv.typ` are not touched.
- **No new dependencies.**
- Tests run on bare node. Anything needing a test goes in `library.ts`;
  `CVList.tsx` is verified by `pnpm build` plus manual check — the boundary from
  progress.md M12 and M14.
- Import **creates**, never replaces. No `window.confirm`: nothing is destroyed,
  so nothing needs confirming. This is the opposite of the topbar's
  `Import content.json`, which overwrites the open CV and therefore does ask.
- A file that fails to parse reports with `window.alert`, matching the existing
  handler in `App.tsx`.
- Button copy is **"Import content.json"**, matching the topbar's wording.
- Run `pnpm test` and `pnpm lint` before every commit.

## Review Focus

Five inputs this will actually meet. The first two are pinned by tests in
Task 1; the rest are manual checks in Task 2 Step 4, because they live in
`CVList.tsx`, on the untested side of the M12 seam.

1. **A file whose name is only an extension** (`.json`, `   .json`) — the label
   must fall back to `NEW_LABEL`, not produce a nameless row. *Task 1.*
2. **An extension in the wrong case** (`cv.JSON`) — stripped, not kept. *Task 1.*
3. **The same file picked twice in a row** — without resetting `e.target.value`
   the second pick fires no `change` event and the app looks frozen. *Task 2.*
4. **A v1 or v2 `content.json`** — `parseDocument` migrates it, so the new CV
   must land at `SCHEMA_VERSION` 3 and render. `sample/content-en.json` is a
   real v1 file and is the fixture to use. *Task 2.*
5. **Valid JSON that is not a CV** (`{"hello":1}`) — one alert, and **no record
   written**: the library must not gain a broken row. *Task 2.*

---

### Task 1: `library.ts` — the label an imported file gets

**Files:**
- Modify: `src/state/library.ts`
- Test: `src/state/library.test.ts`

**Interfaces:**
- Consumes: `NEW_LABEL` from the existing `library.ts`
- Produces: `importLabel(filename: string): string`

- [x] **Step 1: Write the failing test**

Append to `src/state/library.test.ts`, and add `importLabel` and `NEW_LABEL` to
the existing `./library.ts` import:

```ts
test("an imported CV is named after the file it came from", () => {
  expect(importLabel("frontend.json")).toBe("frontend");
  expect(importLabel("my cv (2).json")).toBe("my cv (2)");
});

test("the extension goes whatever case it is in", () => {
  expect(importLabel("cv.JSON")).toBe("cv");
});

test("a file with no name of its own falls back to the new-CV label", () => {
  expect(importLabel(".json")).toBe(NEW_LABEL);
  expect(importLabel("   .json")).toBe(NEW_LABEL);
  expect(importLabel("")).toBe(NEW_LABEL);
});

test("a file with no extension keeps its whole name", () => {
  expect(importLabel("content")).toBe("content");
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/state/library.test.ts`
Expected: FAIL — `importLabel is not a function`.

- [x] **Step 3: Write minimal implementation**

Append to `src/state/library.ts`:

```ts
/** an imported CV is named after its file. the document itself only carries
    the person's name, which is identical on every CV in the library, so it
    cannot tell two of them apart — the filename is the one part the user
    chose */
export const importLabel = (filename: string): string =>
  filename.replace(/\.json$/i, "").trim() || NEW_LABEL;
```

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS, 52 tests across five files.

Then `pnpm build`. Vitest does not typecheck, so a green suite can still hide a
`noUnusedLocals` error in the test file. CI runs both.

- [x] **Step 5: Commit**

```bash
git add src/state/library.ts src/state/library.test.ts
git commit -m "name an imported CV after its file"
```

---

### Task 2: `CVList` — the file picker

**Files:**
- Modify: `src/ui/CVList.tsx`

**Interfaces:**
- Consumes: `importLabel` from Task 1; `importDocument` from
  `src/state/transfer.ts`; `newRecord`, `saveRecord` from `src/state/persist.ts`
- Produces: nothing new. The button lands in `CVList`, so the welcome screen and
  the My CVs dialog both get it from one change.

- [ ] **Step 1: Add the imports**

In `src/ui/CVList.tsx`, add `importLabel` to the existing `@/state/library`
import, `useRef` to the `react` import, and:

```tsx
import { importDocument } from "@/state/transfer";
```

`transfer.ts` pulls in the typst client, which builds a Worker at module scope —
that is already in the bundle via `App.tsx`, so this costs nothing new.

- [ ] **Step 2: Add the handler**

Inside `CVList`, beside the other actions:

```tsx
  const fileInput = useRef<HTMLInputElement>(null);

  const importFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // so re-picking the same file fires change again
    if (!file) {
      return;
    }

    const r = await importDocument(file);
    if (!r.ok) {
      window.alert(`Could not import that file.\n\n${r.error}`);
      return;
    }

    // a fresh id: the imported document knows nothing about this library, and
    // spec §2 says re-minting on import is the point
    const record = { ...newRecord(importLabel(file.name)), doc: r.doc };
    await saveRecord(record).catch(() => {}); // in memory if storage is blocked
    onPick(record);
  };
```

- [ ] **Step 3: Add the button and the input**

Replace the action row at the bottom of the returned fragment:

```tsx
      <div className="flex justify-end gap-1">
        <Button
          size="xs"
          variant="ghost"
          onClick={() => fileInput.current?.click()}
        >
          Import content.json
        </Button>
        <Button size="xs" onClick={() => void create()}>
          New CV
        </Button>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => void importFile(e)}
      />
```

- [ ] **Step 4: Verify, then check the four things tests cannot**

Run: `pnpm test && pnpm build && pnpm lint`
Expected: all pass.

Then `pnpm dev`, and from the welcome screen:

1. Export a CV, then import the file back. Expect a **new** CV labelled after
   the file, the original untouched, and the list sorted with the import first.
2. Import the same file again without reloading. Expect a second CV — if
   nothing happens, `e.target.value = ""` is missing.
3. Import `sample/content-en.json`, which is `"schemaVersion": 1`. Expect it to
   open and render; the migration is `parseDocument`'s job and this is the only
   place it gets exercised by hand.
4. Import a file containing `{"hello":1}`. Expect one alert naming the failure
   and **no new row** in the list.

- [ ] **Step 5: Commit**

```bash
git add src/ui/CVList.tsx
git commit -m "import a content.json as a new CV"
```

---

## After the plan

`.agents/progress.md` M14 gains a line: import creates rather than replaces, and
the topbar's own `Import content.json` is now the odd one out — it still
overwrites the open CV. Worth deciding whether it should survive at all, since
the menu was cut from seven items to four on exactly that reasoning.
