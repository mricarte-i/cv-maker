# Typing Lag — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Typing a fast burst into the editor keeps up with the keyboard. Today
characters are still landing after your hands have left the keys.

**Diagnosis (done, 2026-11-18):** the cause is React re-rendering, not the
compile. The compile runs in a Web Worker and is debounced 200 ms
(`useCompiledCV.ts`), so it cannot block the input. With the debounce raised to
5000 ms the lag stays, which rules out the SVG swap in `Preview`. What does block
it: every keystroke produces a
new `doc`, `Editor` re-renders, and **nothing in `src/` is memoised**, so every
section, item, block, contact and `useSortable` row in the CV re-renders to
change a single field. `pnpm dev` doubles this, because `StrictMode` renders
twice and React's dev build is slower.

**Architecture:** Immer already does the hard part. The reducer runs on
`produce`, so an edit gives new objects only along the path to the field that
changed, and every other section, item and contact is the *same object* as
before. `memo` on the components that take those objects turns that sharing
into skipped renders: type in one bullet and only its section and item render;
the rest of the CV stops at a props comparison.

**Tech Stack:** React 19, TypeScript, immer, vitest (bare node, no jsdom).

## Global Constraints

- **No new dependencies.** React Compiler would memoise everything
  automatically, but it adds a babel plugin to the build. Hand `memo` on three
  components is smaller.
- `SCHEMA_VERSION`, `schema/`, `typst/` and `state/reducer.ts` are not touched.
- Render counts can't be tested on bare node (no jsdom; the M12 boundary). What
  *can* be tested is the property `memo` depends on: untouched branches keep
  their identity. That's Task 1. The render savings are checked by hand in
  Task 4.
- Run `pnpm test`, `pnpm build` and `pnpm lint` before every commit.

## Review Focus

1. **A fresh object as a prop defeats `memo` silently.** `SectionEditor`
   rebuilds `items: ListRef` on every render and passes it to `ItemEditor` as
   `parent`. Unless that object is stable, a memoised `ItemEditor` still
   re-renders every time. *Task 3.*
2. **Context bypasses `memo`.** `SortableRow` passes a fresh `RowCtx` value on
   every render, so each section's `DragHandle` and `RowMenu` still re-render
   while the rest of the section is skipped. That's two small components per
   section, and accepted. Fixing it would mean memoising `useSortable`'s output,
   which changes on every render anyway.
3. **Focus hand-off still works.** `useFocusClaim` (`ui/focus.ts`) checks on
   every render of the row asking for focus. Every action that calls
   `focusAfterRender` (bullet add, paragraph add, contact add) changes the item
   or the contacts array that holds the new row, so the parent re-renders and
   the claim runs. Checked by hand in Task 4.

---

### Task 1: pin structural sharing in `reducer.test.ts`

**Files:**
- Test: `src/state/reducer.test.ts`

This test passes as soon as it's written. That's intended: it pins existing
immer behaviour that the rest of the plan depends on. If a future reducer change
deep-clones the document, this test fails before the editor gets slow again.

- [x] **Step 1: Add the test**

Inside `describe("patches", …)`, after the last test: below line 184, above
the `});` that closes the `describe` on line 185:

```ts
  test("an edit leaves every untouched branch the same object", () => {
    // two sections, the first with two items — the fixture has one of each
    const setup: Action[] = [
      { type: "item/duplicate", sectionId: "s1", index: 0 },
      { type: "section/duplicate", index: 0 },
    ];
    const d0 = setup.reduce(reducer, doc());

    const d1 = reducer(d0, {
      type: "bullet/update",
      blockId: "blk1",
      index: 0,
      text: "uno",
    });

    expect(d1.sections[0]).not.toBe(d0.sections[0]); // the path that changed
    expect(d1.sections[0].items[1]).toBe(d0.sections[0].items[1]);
    expect(d1.sections[1]).toBe(d0.sections[1]);
    expect(d1.contacts).toBe(d0.contacts);
  });
```

- [x] **Step 2: Run it**

Run: `pnpm exec vitest run src/state/reducer.test.ts`
Expected: PASS. If it fails, stop: something is cloning branches it doesn't
need to, and `memo` won't help until that's fixed.

- [x] **Step 3: Commit**

```bash
git add src/state/reducer.test.ts
git commit -m "pin that an edit keeps untouched branches by identity"
```

---

### Task 2: memoise what `EditorPane` renders per keystroke

**Files:**
- Modify: `src/ui/SectionEditor.tsx`
- Modify: `src/ui/ContactsEditor.tsx`

`SectionEditor` takes `section` (immer-stable) and `index` (a number).
`ContactsEditor` takes `contacts` (immer-stable). Neither needs anything else
before `memo` works.

- [x] **Step 1: `SectionEditor.tsx`**

Line 9:
```tsx
import { memo, useMemo, useState } from "react";
```

Line 35:
```tsx
export const SectionEditor = memo(function SectionEditor({
```

Line 116, the function's closing brace:
```tsx
});
```

(`useMemo` is for Task 3. Import it now so the line only changes once.)

- [x] **Step 2: `ContactsEditor.tsx`**

Add an import:
```tsx
import { memo } from "react";
```

Line 72:
```tsx
export const ContactsEditor = memo(function ContactsEditor({
  contacts,
}: {
  contacts: Contact[];
}) {
```

and its closing brace (the file's last line) becomes `});`.

- [x] **Step 3: Verify**

Run: `pnpm test && pnpm build && pnpm lint`
Expected: all pass. `build` is the one that matters: it typechecks the
`memo(function …)` wrappers.

- [x] **Step 4: Commit**

```bash
git add src/ui/SectionEditor.tsx src/ui/ContactsEditor.tsx
git commit -m "skip re-rendering sections and contacts a keystroke didn't touch"
```

---

### Task 3: memoise `ItemEditor`, with a stable `parent`

**Files:**
- Modify: `src/ui/SectionEditor.tsx`
- Modify: `src/ui/ItemEditor.tsx`

After Task 2, typing re-renders only the section you're in, but still every
item in it. Experience is the longest section and the one most often edited.

- [ ] **Step 1: stabilise `items` in `SectionEditor.tsx`**

Line 44:
```tsx
  // ItemEditor is memoised on this as `parent` — a fresh object would defeat it
  const items = useMemo<ListRef>(
    () => ({ kind: "items", sectionId: section.id }),
    [section.id],
  );
```

- [ ] **Step 2: `ItemEditor.tsx`**

Line 1:
```tsx
import { Fragment, memo } from "react";
```

Line 173:
```tsx
export const ItemEditor = memo(function ItemEditor({
```

Line 328, the function's closing brace:
```tsx
});
```

- [ ] **Step 3: Verify**

Run: `pnpm test && pnpm build && pnpm lint`
Expected: all pass. The existing `only-export-components` warning on
`ItemEditor.tsx` (from `MARK`) is unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/ui/SectionEditor.tsx src/ui/ItemEditor.tsx
git commit -m "skip re-rendering items a keystroke didn't touch"
```

---

### Task 4: check by hand

- [ ] **Step 1: Watch the renders**

`pnpm dev`, open React DevTools → Profiler → ⚙ → "Highlight updates when
components render". Type in a bullet of one job entry. Expect only that entry
(and the topbar and preview pane) to flash, not the other sections, the other
entries or the contacts.

- [ ] **Step 2: Feel**

Run the burst that showed the lag in `pnpm dev`, then again in `pnpm build &&
pnpm preview`. Expect the characters to stop when your fingers stop.

- [ ] **Step 3: Nothing regressed**

1. Enter in a bullet adds a bullet below and moves the caret into it.
2. Enter in a paragraph adds a paragraph below and moves the caret into it.
3. Adding a contact moves the caret into the new row.
4. Dragging a section, an item and a bullet each reorder and show the moved
   row's content, not a stale copy.
5. "Duplicate" on a section and on an item each add a copy below.
6. Undo/redo across a typed word repaints the field.

---

## Not doing, and when to

- **`BlockEditor` memo.** After Task 3, typing re-renders a single item and its
  blocks. Add it if one item with a long bullet list still lags. It needs the
  same `useMemo` for `parent` in `BodyEditor` (`ItemEditor.tsx:94`).
- **`EditorTopbar` and `Preview`.** Both re-render per keystroke and both are
  small. `Preview` is given the same `svg` string, so React leaves the
  `innerHTML` alone.
- **React Compiler.** Worth it if hand `memo` starts spreading past these three
  components.
