# My CVs — design

Companion to [plan.md](plan.md) and [progress.md](progress.md). This one covers
a single feature: keeping more than one CV in the app and switching between
them.

Status: **designed, not built.** Written 2026-09-03.

---

## 1. Why this reopens Q3

`progress.md` closed open question 3 with *one CV*, on the reasoning that M10's
`content.json` round-trip already covers "tailor a copy per application" —
export, edit, re-import.

That answered a different question than the one being asked now. The use case
here is **dozens of CVs, one per application**, kept side by side over time: a
frontend-targeted CV, a fullstack-targeted one, and a copy of whatever was
actually sent to each job. Export/import serves a copy you make and abandon. It
does not serve a set you maintain, because every switch is a manual file
round-trip and nothing remembers what you sent where.

Three decisions frame the design, taken before any of it was written:

| | |
| --- | --- |
| **Independence** | A CV is a complete, standalone document. Duplicating is a one-time copy; edits never propagate between CVs. |
| **Volume** | Dozens, accumulating over time. This is a library, not a two-item picker. |
| **Archiving** | None. Sort by last edited, search by name. "Archived" is emergent — old CVs sink — rather than a state anyone maintains. |

The first is what keeps this cheap: a CV is exactly today's `CVDocument`.

## 2. Data model

`SCHEMA_VERSION` stays at **3**. `CVDocument`, `cv.typ`, `parse.ts` and
`migrate.ts` are all untouched — the library wraps documents, it does not change
them.

```ts
type CVRecord = {
  id: string;        // crypto.randomUUID()
  label: string;     // "Frontend", "Fullstack — Acme"
  updatedAt: number; // Date.now(), the sort key
  doc: CVDocument;
};
```

One record per CV in the existing `docs` object store, keyed by `id`. A second
key, `"currentId"`, holds `{ id }` — which CV is open.

**Why one record per CV rather than an index.** Listing the library means
`getAll()`, which deserializes every document — roughly a megabyte at thirty
CVs, call it 10 ms, once, when the modal opens. The alternative (bodies under
`doc:<id>` plus a separate `library` index record) makes that read small and
constant, at the cost of a second write per save and a drift failure mode: index
says a CV exists, body is missing. That repair path would have to be written and
would never be exercised. The index is the upgrade if listing ever measures
slow; it is not the starting point.

**Why the metadata is not inside `CVDocument`.** Putting `id` and `label` in the
document would carry the name through an exported `content.json` — but it is a
schema migration, it puts library concerns inside the document, and an imported
file would collide on `id` with whatever is already stored. Re-minting on import
throws away the property that motivated it.

## 3. Migration off the single document

The `"current"` key holds a bare `CVDocument` today. On load:

1. `"currentId"` present → normal path, load that record.
2. `"currentId"` absent, `"current"` present → mint an id, wrap the document as
   a `CVRecord` labelled **"My CV"**, write it under the new id, set
   `"currentId"`, delete `"current"`.
3. Neither → `emptyDocument()` under a fresh id.

Explicit and one-time, the same shape as the existing `readLegacy()` path off
localStorage. Deliberately *not* an IndexedDB `onupgradeneeded`: the work would
happen inside an upgrade transaction, with parsing and id-minting in a context
that cannot await, for no benefit over doing it on the next read.

## 4. Where the seam goes

Two modules, split on the line the test suite already respects.

**`src/state/library.ts` — pure, tested.**
Sorting by `updatedAt`, search filtering, the default label on duplicate
(`"${label} copy"`), and the *decision* the migration makes given what was found
in storage. No IndexedDB anywhere in it.

**`src/state/persist.ts` — the IDB wrapper, untested.**
Extended with `list`, `save`, `remove`, `setCurrent`. Stays thin enough that
there is nothing in it to get wrong that a type would not catch.

This is the boundary M12 already draws. Keeping the new logic on the pure side
means `fake-indexeddb` stays unnecessary and the suite stays on bare node at
~200 ms. Any logic that wants a test belongs in `library.ts` by construction.

## 5. Switching

1. Flush the outgoing document immediately, cancelling the pending 500 ms
   debounce — the same `idbPut` the hidden-flush already makes.
2. Load the target record, write `"currentId"`.
3. Remount `Editor` with `key={id}`.

The remount is doing real work. `useHistory` re-initialises, so undo cannot
cross a CV boundary — which it never should. `useAutosave`'s `first.current`
guard resets, so arriving at a CV does not immediately re-save it and bump its
`updatedAt`. There is no flush-on-switch bug to fix because no state survives
the switch to go stale.

Library state (`records`, `currentId`) lives in `App`, above `Editor`.

## 6. The modal

A `MenuItem` labelled **"My CVs"** in the existing overflow menu — not a new
topbar button, because M6.9 spent real effort fitting that bar into 390 px.
It opens a Dialog titled **"Your CVs"**:

- a search input, filtering by label, substring, case-insensitive
- rows sorted by `updatedAt` descending, the current one marked
- per row: label, last-edited date, and duplicate / rename / delete
- a **New CV** action

**New CV creates a blank document**, labelled "Untitled", and switches to it.
Copying an existing one is the per-row *duplicate* instead — two separate
actions, because with one CV per application duplicate is the common one and
should not be buried inside a "new" flow that also has to ask what to copy.

Rename is inline in the row: the label is an input, committed on blur or Enter,
the same interaction every field in the editor already uses.

**Deleting the current CV** switches to the most recently edited of what
remains; if nothing remains, it creates a fresh empty one, so the app never has
to render an editor with no document. Delete goes through `window.confirm`,
matching "Start over" and import. Dates render with `toLocaleDateString()` — a relative
"3 days ago" needs a bucket helper, and an absolute date is honest for free.

Not "Open CV": it reads as OpenCV.

## 7. Out of scope

No archive flag, no folders, no tags — sort-and-search was the decision, and
this is the design that matches it. No per-CV template or theme, since there is
one template. No export-all, which belongs to M10.

## 8. Risks

**Everything lives in one browser.** One CV lost to a "clear site data" is
annoying; thirty is a year of applications. `requestPersistence()` already
exists in `persist.ts` and is called once there is something to lose — with a
library that stops being a nicety, and an export-all in M10 stops being
optional. This is the strongest argument for doing M10 next.

**`crypto.randomUUID` needs a secure context.** Creating or duplicating a CV
mints an id, so on a LAN dev URL those actions throw — same trap as M12, now on
a more common path.

**Deletion is the one irreversible action in the app.** Undo does not reach it,
by design, and nothing else here can lose work. `window.confirm` is the whole
mitigation; that is a deliberate floor, not an oversight.
