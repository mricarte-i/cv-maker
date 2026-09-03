# Progress

Companion to [plan.md](plan.md). The plan says *what* and *why*; this says
*what's done* and *what was measured*. Update as milestones close.

Last updated: 2026-09-03 (about dialog)

---

## Milestone 1 — Housekeeping

- [x] Vendor `silver-dev-cv.typ` (6415 B, byte-identical to published 1.0.2)
- [x] Vendor Libertinus Serif — 4 faces, 1.17 MB
- [x] `public/typst/LICENSE` — MIT, both copyright lines
- [x] `public/fonts/LICENSE` — OFL 1.1 verbatim from alerque/libertinus
- [x] `pnpm add` renderer, zod, dnd-kit
- [x] Workbox config fixed (see Milestone 2 / Gate D)
- [x] Replace Vite-boilerplate README
- [x] Delete starter leftovers (`src/assets/*`, `public/icons.svg`)
- [x] `git init`
- [x] **Root `LICENSE` — MIT**, settled at release. No license at all would
      have meant all rights reserved on a public repo; neither vendored license
      constrained the choice.
- [x] `.gitignore` — `.agents/*.md` now tracked, `*:Zone.Identifier` ignored
- [x] Root `tsconfig.json` reduced to a pure solution file. Its `baseUrl` tripped
      TS5101, so a bare `tsc --noEmit` exited before checking anything;
      `tsconfig.app.json` already carries `paths` *and* `ignoreDeprecations`.

## Milestone 2 — Spike ✅

All four gates pass. `src/spike/` has since been deleted — see M4 for why its
`fixtures.ts` was not worth salvaging.

| Gate | Result | Evidence |
|---|---|---|
| **A** — no third-party requests | ✅ | Network panel: every request `localhost:4173`. No jsdelivr. |
| **B** — SVG on screen | ✅ | Full CV renders; correct faces; `# [ ] * _ @ -` all inert. |
| **C** — fast, flat recompiles | ✅ | 50x in 0.4 s, no upward drift across iterations. |
| **D** — offline reload | ✅ | Offline + normal reload renders; WASM from `typst-wasm` CacheFirst cache. |

### Measurements

| Context | init | compile | render |
|---|---|---|---|
| dev, warm - toy fixture (3 sections) | 115-153 ms | 1-4 ms | 0-2 ms |
| `preview` (prod), warm - toy fixture | 183 ms | 2-4 ms | 0-2 ms |
| **dev, warm - real fixture (6 sections)** | **119 ms** | **~20 ms** | **~3 ms** |
| **cold - empty cache** | **not yet measured** | - | - |

**Use the 20 ms number, not the 8 ms one.** 50x on `sample/content-en.json`
takes 1.0 s, against 0.4 s for the 3-section spike fixture. That is content
size, not drift - the per-compile cost is flat across iterations either way.
A real CV with three jobs and ten bullets will land higher still, so treat
~20 ms as the floor when sizing the M5 debounce, not the expected value.

The cold number is the one input still missing. It decides section 6's question
of whether the loading state needs to be a real skeleton or just a spinner.
Measure in fresh incognito with DevTools "Disable cache" checked.

### Build sizes

| Asset | raw | gzip |
|---|---|---|
| compiler WASM | 28,325 KB | 10,947 KB |
| renderer WASM | 972 KB | 360 KB |
| app JS | 562 KB | 177 KB |
| app CSS | 58 KB | 11 KB |
| worker JS | 113 KB | - |
| fonts (4 faces) | 1,198 KB | - |
| icons (6 files) | 28 KB | - |
| **precache manifest** | **22 entries / 1923 KiB** | - |

Re-measured at release. The precache figure is *correct*, not the old precache
bug: shell, fonts, template and icons are precached, and the WASM is
deliberately excluded and handled by a `CacheFirst` runtime rule instead.

App JS tripled from the spike's 193 KB and now trips Vite's 500 kB chunk
warning. Next to an 11 MB compiler it is noise, so it stays unsplit until the
WASM question is answered.

### Decided during the spike

**WASM caching = runtime `CacheFirst`, not precache.** A 30 MB precache
manifest gates service-worker activation and forces the whole download before
the app is usable offline. Since `initCompiler()` runs on mount, the WASM is
fetched on first page load anyway - so CacheFirst populates at effectively the
same moment while keeping SW install at 1.5 MB. `maxEntries: 4` evicts stale
content-hashed blobs on upgrade.

Still open for release: ~11 MB gzipped on first visit is rough on mobile data.
Brotli takes it to ~8 MB. Revisit before shipping - see plan section 6.

### Gotchas found (all cost real time)

1. **`loadFonts(urls)` without an options object still fetches from jsdelivr.**
   The driver checks `fn._preloadRemoteFontOptions !== undefined` and appends
   its own asset loader when that's unset. Use `loadFonts(fonts, { assets: false })`.
2. **`format` must be `CompileFormatEnum`, not the string.** `compile()` forwards
   to `world.get_artifact(fmt: number, ...)`; `'vector'` is truthy and passes a
   string where WASM wants a number. Not re-exported from the index - import
   from the `/compiler` subpath.
3. **typst.ts never checks `res.ok` when fetching fonts** (`init.mjs:44`). A 404
   feeds an HTML error page to `add_raw_font`, which fails silently: layout
   rules draw, glyphs don't. **Pass `Uint8Array` rather than URLs.**
4. **`pagecount` is a dead parameter** in silver-dev-cv 1.0.2 - accepted, never
   referenced. No page numbers unless you add them.
5. **Ctrl+F5 bypasses the service worker.** Offline tests need a *normal* reload,
   after the SW has installed while online.

---

## Milestone 3 — Schema ✅

`src/schema/` — committed.

- [x] `cv.ts` — zod schemas + inferred `CvDocument`
- [x] `migrate.ts` — version-keyed migrations, throws if a step forgets to bump
- [x] `parse.ts` — `parseDocument()`, the only path from unknown JSON to `CvDocument`
- [x] `factory.ts` — `emptyDocument()` / `emptyItem()` / `newId()`

**Principle: strict on shape, permissive on content.** No `.min(1)` on user text —
an empty string is a valid intermediate state while typing, and a schema that
rejects it turns autosave into a trap. Three validation layers, deliberately
separate: reducer (shape) → `parseDocument` (trust boundary) → React component
(advisory hints only, never blocking).

Other calls: entry dates stay free text (`"2021 - 2026"`, `"2021 - present"`);
no `.url()` on contact links; stable ids on Section / Item / Block / Contact but
not on bullet strings (those get move up/down, where index keys are safe).
Schemas are not `strictObject` — unknown keys get stripped, so a document from a
future version degrades instead of failing to load.

## Milestone 4 — `cv.typ` adapter ✅

`src/typst/cv.typ` — written, committed, and verified against the reference PDF.

- [x] One generic loop over `t.sections` — any sections, any labels, any order
- [x] Entry branch on `variant` (see below)
- [x] Empty-field handling
- [x] **Visual parity vs `sample/cv-en.pdf`** ✅ — `sample/content-en.json` is the
      fixture (six sections, every item kind, both block kinds). Still one page;
      bullet indentation and both `h(1fr)` alignments match. The only known
      divergence is `sectionsep` placement, below - 1pt across the document.
- [x] **Adversarial input re-verified** through `render-blocks` — `# [ ] * _ @ -`
      plus an em dash, typed straight into a paragraph in the running editor.
      All inert in the preview.
- [x] **Blank-location education branch exercised** — clearing ITBA's location
      renders the institution with no trailing comma.

Both were done by hand in the editor rather than through the spike fixture, and
`src/spike/` was deleted afterwards. `SAMPLE` had rotted: blocks and contacts
gained ids in M3, so it no longer parsed (four `expected string, received
undefined`). Its `CV_TYP` was worse than dead — the superseded spike adapter,
routing every variant through `job()`, which is the exact thing M4 corrected.
The only thing in the file still worth anything was one adversarial string, and
the editor can now type it directly.

### Open Q1 resolved — and the plan's leaning was wrong

Plan section 3 recommends routing every entry through `twoline-item` as a single
codepath. **Don't.** `twoline-item` only emits a line break inside its `entry2`
and `entry4` branches, so when `entry4` is absent (education, project) the
description runs on straight after the subtitle. It is not a clean superset of
the three functions.

Call `job()` / `education()` / `project()` directly instead — they already encode
the correct breaks. The variant branch exists because the template genuinely
lays the same four fields out differently:

| variant | top-left | top-right | bottom-left | bottom-right |
|---|---|---|---|---|
| `job` | title | location | subtitle | date |
| `education` | title, location | date | subtitle | — |
| `project` | title | date | — | — |

Note `date` moves between top-right and bottom-right, and `location` is merged
into the title for education and dropped entirely for project.

Corrected in plan.md revision 3, section 3.

### Edge cases handled in the adapter

- **Dangling comma on education.** `education()` hardcodes `[#institution, #location]`,
  so an empty location renders `"Instituto Tecnológico de Buenos Aires, "`. The
  vendored template stays byte-identical, so `cv.typ` inlines the same layout
  (reusing the template's exported colour variables) when location is blank.
- **Empty contact links.** `display()` branches on `"link" in contact` and our
  JSON always has the key, so a blank link would emit `link("")`. The adapter
  maps the key away when empty.
- **`pagecount` dropped** — dead parameter, see gotcha 4.
- `render-blocks` skips empty paragraphs and empty bullet lists entirely.
  Consequence for the UI: a freshly added empty bullet shows nothing in the
  preview until a character is typed. Revisit when the editor exists.
- **`sectionsep` placement differs from `sample/cv.typ` by design.** The sample
  emits it *before* each section and skips it between Experience and Skills;
  the adapter emits it *after* every section, including a trailing one. That is
  two extra `v(0.5pt)` across the whole document. Sub-pixel, deliberately not
  chased - a generic loop cannot reproduce a hand-placed omission.

---

## Milestone 5 — Compile layer ✅

- [x] Spike promoted → `src/typst/{worker,client}.ts`
- [x] `useCompiledCV(doc)` → `{ svg, diagnostics, error, pending, ready }`;
      debounce (200 ms) and `seq` supersession moved out of `App.tsx`
- [x] Last good SVG survives a failed compile (`svg: r.ok ? r.svg : s.svg`)
- [x] `src/spike/` deleted

Two details worth keeping:

- **The compile trigger is `useMemo(() => JSON.stringify(doc), [doc])`.** Immer's
  structural sharing already returns the identical object on a no-op, and the
  stringify collapses equal-content documents on top of that — so a keystroke
  that changes nothing costs no compile.
- **`worker.onerror` resolves every pending call.** Without it a compiler crash
  leaves the hook waiting forever with `pending: true` and no way out.

## Milestone 6 — UI ✅

- [x] `useReducer` over `CVDocument` — 15 actions, immer `produce`, generic
      `list/remove` + `list/move` over a `ListRef`
- [x] Navigation split out into `src/state/navigate.ts` — `section()` / `item()` /
      `block()` / `list()`, the last returning `unknown[]` because move and
      remove genuinely do not care what is in the list
- [x] Editors: `SectionEditor`, `ItemEditor` (+ `BodyEditor`, `Shell`),
      `BlockEditor` (+ `BulletsEditor`), `ContactsEditor`, `Sortable`
- [x] Dispatch through context — `src/ui/dispatch.ts`, React 19 `<Ctx value>`
- [x] Tailwind v4 + shadcn, custom theme preset, Libertinus in the UI
- [x] Resizable editor/preview split — `react-resizable-panels`, layout persisted
- [x] **Preview scaling** — `src/ui/Preview.tsx`, fit-to-width plus a zoom step
      control; see below
- [x] Resize handle made visible and grabbable — see below
- [x] `dnd-kit` reorder — one `DndContext` per list, see below

### Two deliberate divergences from plan §5

**A switch, not an `ITEM_EDITORS` registry.** One `switch (item.kind)` inside
`ItemEditor` narrows the union just as well and needs no registry type. The three
branches are ~30 lines each and never justified separate files.

**Plan §5's six-component table has no `ContactsEditor`.** `doc.contacts` renders
into the header via `cv.typ`, but nothing edited it until now — a gap in the plan,
not just the code. It renders the whole list rather than one row, since contacts
are flat.

### Reordering — `src/ui/Sortable.tsx`

`ListControls` (↑ ↓ ✕ on every row at every depth) is gone. In its place:
`SortableList` takes a `ListRef` plus the array and owns the whole mechanism;
`RowControls` is the grip + ✕; `DragHandle` is the grip alone, used bare in
bullet rows where it doubles as the `•` marker.

**One `DndContext` per list, nested four deep** (sections → items → blocks →
bullets). A draggable registers with the *nearest* provider, so a drag cannot
leave the list it started in — cross-list drops are structurally impossible
rather than filtered out in the handler. Cost is one hidden live region per
context, ~30 for `content-en.json`. Cheap, but that's the number to watch.

`SortableList` takes a render prop and wraps each row itself, so a call site
cannot forget the wrapper or hand it ids that disagree with the rows. That also
killed the `length` prop from `SectionEditor` / `ItemEditor` / `Shell` /
`BodyEditor` / `BlockEditor` — it only ever existed to disable the ↓ arrow.

**No reducer change.** `list/move`'s `l.splice(to, 0, ...l.splice(from, 1))` is
already `arrayMove` semantics, so `onDragEnd` maps ids → indices and dispatches
the existing action. `ListRef` doing the naming is what made one wrapper cover
all five lists.

### Four things that cost time

1. **`@dnd-kit/utilities` is a transitive dep only.** `node_modules/@dnd-kit/`
   holds `core`, `modifiers`, `sortable` — nothing else, so pnpm's strict layout
   rejects `import { CSS } from "@dnd-kit/utilities"` even though the *types*
   resolve fine through the symlink. Hand-write `translate3d(0, ${y}px, 0)`;
   safe because `restrictToVerticalAxis` pins x at 0.
2. **`setActivatorNodeRef` + listeners on the handle only.** Spreading
   `listeners` on the row wrapper makes pointerdown inside a `Textarea` start a
   drag and kills text selection — which is most of this UI.
3. **`touch-none` on the handle.** dnd-kit does not set `touch-action` for you;
   without it a touch drag fights the panel's scroll.
4. **`onDragEnd`'s guard is a bail-out, not a proceed-if.** Written as
   `if (over && active.id !== over.id) return;` it returns on exactly the case
   that should dispatch, and the fall-through paths both no-op — so nothing
   throws, nothing logs, and every row animates back to where it started. Cost
   an hour. It is `if (!over || active.id === over.id) return;`.

Keyboard reordering came free and replaces what the arrows gave: focus the grip,
Space to lift, ↑/↓, Space to drop, Esc to cancel.

### Nested flex needs `min-w-0`

**Any flex or grid child that itself contains flex or grid needs `min-w-0`**, or a
long string blows the row past the panel instead of scrolling inside its input.
Cost real time twice — bullets rendering at zero width, and entry titles clipping
inside `Shell`. `min-h-0` is the vertical twin.

Related: `ResizablePanelGroup` sets `height: 100%` as an **inline** style, which
beats any `h-screen` class, so `html, body, #root { height: 100% }` in `index.css`
is what actually contains the panes.

Also: `react-resizable-panels` 4.x renamed `direction` → `orientation`, replaced
`autoSaveId` with `useDefaultLayout()`, and reads **numeric sizes as pixels,
string sizes as percent**. `defaultSize={50}` is a 50-*pixel* panel.

### Preview scaling

The renderer emits **one** root `<svg class="typst-doc">` (pages are nested `g`
elements, not sibling svgs) carrying `viewBox`, `width`/`height`, and
`data-width`/`data-height` in points. Because the `viewBox` gives an intrinsic
ratio, fit-to-width is pure CSS — `[&>svg]:w-full [&>svg]:h-auto` — with no
`ResizeObserver` and no attribute reading. CSS beats the `width`/`height`
presentation attributes.

Zoom is a step list where **1 means "fits the pane", not "actual page size"**.
Clicking the percentage resets to fit. True print zoom would measure against
`data-width="596.000"`; not done.

**The toolbar has to live outside the scroll box, not be `sticky` inside it.**
`sticky top-0` pins vertically only, so it scrolled away horizontally at zoom > 1.
`Preview` is now `flex h-full flex-col` with the page area as `min-h-0 flex-1
overflow-auto` — i.e. we deliberately own the scroll box one level below the
`Panel`'s. `min-h-0` is required or the flex child refuses to shrink and the
overflow escapes upward.

Known and left alone: at zoom > 1 the `p-6` right padding vanishes when scrolled
horizontally. Standard overflow-padding behaviour.

### The resize handle

Small-control lesson, same family as the drag handles: **the hit area was
never the problem.**
`Separator` takes its `getBoundingClientRect()` and inflates it to a minimum of
**10 px for a mouse, 20 px for touch** (`resizeTargetMinimumSize`, a `Group`
prop), then tests pointer coordinates against that rect. Detection is pure
geometry — the `after:` pseudo-element shadcn ships contributes nothing and was
removed.

What was missing was feedback. `Separator` sets `data-separator` to
`inactive | hover | active | focus | disabled`, and `hover` fires on entering the
*inflated* region — so `group/handle` + `group-data-[separator=hover]/handle:`
colours both the bar and the grip pill at exactly the right moment.

Also: the default separator is **vertical**, and the wrapper already rotates its
child 90° for the horizontal case, so the base glyph is `GripVertical`. The
shadcn default grip is `w-1` (4 px), which cannot show a 16 px icon.

## Milestone 6.5 — bullet ids (`SCHEMA_VERSION` 2) ✅

**Unblocked dnd-kit.** Plan §2 deliberately left bullet strings without ids: "making
them draggable later is a `schemaVersion` bump, which is what the field is for."
That day is now — uniform drag handles need a stable key per bullet.

`{ kind: "bullets"; items: string[] }` → `items: { id: string; text: string }[]`

- [x] `cv.ts` — `BulletSchema`; `SCHEMA_VERSION` bumped to 2
- [x] `migrate.ts` — first real entry in `MIGRATIONS`
- [x] `factory.ts` — `emptyBullet()`, `emptyBullets()`
- [x] `reducer.ts` — `bullet/add`, `bullet/update`
- [x] `BlockEditor.tsx` — keyed on the bullet id instead of the index
- [x] `cv.typ` — `list(..b.items.map(x => x.text))`
- [x] `sample/content-en.json` — **left at v1 on purpose**, so `migrate()` runs for
      real on every fresh load instead of sitting untested
- [x] `navigate.ts` — **no change needed, as predicted.** The `bullets` `ListRef`
      branch is already erased to `unknown[]`, so `list/move` and `list/remove`
      kept working untouched. The erasure earned its keep.

### What the migration had to get right

**It runs on untrusted JSON, before zod.** So it cannot assume shapes and must not
throw — a malformed document has to reach `parseDocument()` and produce a real
error, not blow up one layer early. Two helpers make pass-through the default:
`mapArray(v, f)` maps only if `v` is an array, `mapKey(v, key, f)` rewrites only
if `v` is an object that *has* that key. The `key in v` test is what stops a
`oneline` item — which has no `body` — from acquiring a stray `body: undefined`.

**`bullet/update` needed a new guard.** `b.items[a.index] = a.text` used to punch
a hole in the array on a stale index; `b.items[a.index].text = ...` throws. Same
action, different failure mode — hence `const bullet = b.items[a.index]; if (bullet)`.

**The action stayed index-based** (`{ blockId, index, text }`) rather than moving
to an id. Indices are already the currency for bullets via `list/move` and
`list/remove`; switching just this one would make it the odd action out and buy a
`bullet()` navigate helper nothing else needs.

The migration is exercised for free on both paths: `loadDoc()` → `parseDocument()`
→ `migrate()` upgrades anything already in localStorage, and the v1 fixture
covers the cold-start path.

## Milestone 6.6 — editor chrome ✅

- [x] `EditorTopbar` (in `App.tsx`) — pdf / import / export / sample / reset,
      lifted out of the editor pane so it spans both panels
- [x] Floating `+ section` button, bottom-right of the editor pane
- [x] `StatusToast` — compile *and* save status in one fading pill, bottom-left
- [x] `CompileErrorDialog` — a modal instead of an inline `<pre>`
- [x] Bullet textareas grow again
- [x] Borders and padding on blocks, sections, and the bullet list

### The topbar was never a `position` problem

It scrolled away because the layout was taller than the viewport: `#root` is
`height: 100%`, but the panel group carried `h-screen`, so topbar + 100vh
overflowed and the *page* got a scrollbar. Scrolling the preview then chained
to the page once its inner scroller bottomed out.

The fix is a column: topbar `shrink-0`, panel group `min-h-0 flex-1`, and the
editor pane owns its own `overflow-y-auto`. **`min-h-0` is the load-bearing
class** — a flex child defaults to `min-height: auto` and refuses to shrink
below its content, so `flex-1` alone hands the page scroll straight back. Same
trap as the `min-w-0` note above, one axis over.

Both floating controls are siblings of `<aside>`, not children — the aside is
the scroll container now, so anything `absolute` inside it scrolls away. A
`relative h-full` wrapper is what pins them. `pb-20` on the aside keeps the FAB
off the last section's controls.

### Fixed height beats `field-sizing`

Bullets stopped growing because their textarea had `h-8`. The base `Textarea`
already auto-grows via `field-sizing-content`; a fixed `h-*` pins it and clips
the overflow, where the paragraph textarea's `min-h-9` only sets a floor.
`min-h-8` restored it. Worth remembering that `field-sizing` is
Chromium-and-Firefox only — Safari falls back to `rows` plus the `min-h`, so
the M9 phone session is where this gets a real test.

### One toast, two sources

Compile settles at ~220 ms and the save at ~700 ms, so two toasts in the same
corner would have overlapping fades. `StatusToast` owns the fade mechanics and
nothing else — it takes `{ label, settled }`, and `App` decides what the corner
says, ordered compile-then-save so `saved` is the terminal message. `label` is
in the effect deps, so a new message re-shows a toast that had already faded.

`"could not save"` deliberately passes `settled: false`. A failed write is the
one message that must not quietly disappear.

`useAutosave` now reports `"saving" | "saved" | "failed"`, with the same `seq`
guard `useCompiledCV` uses: an in-flight write resolving after you have typed
again would otherwise report `saved` while a newer document is still pending.
A `first` ref skips the boot write-back, which the localStorage version had
been doing redundantly.

### The error dialog gates on arrival, not content

The preview compiles on every keystroke, so a modal keyed on the error *text*
would reopen constantly — Typst diagnostics carry positions that move as you
type. Instead a `seen` flag is set on dismiss and cleared when `error` goes
null, so it speaks once per failure episode and re-arms only after a compile
succeeds.

Its body says the preview is showing the last version that worked, because
`useCompiledCV` keeps the last good SVG on failure. Without that line the
preview looks correct next to an error modal and the modal reads as spurious.

## Milestone 6.7 — tags (`SCHEMA_VERSION` 3) ✅

- [x] `TagSchema` + a `tags` item kind — `{ title, items: Tag[] }`
- [x] v2 → v3 migration: a `oneline` whose content holds a comma becomes `tags`
- [x] `TagsInput` — pills, comma or Enter to commit, backspace or click to edit
- [x] `KeyboardKey` — an inline key cap for the hover hint
- [x] `tags/update` action, `+ tags` in the item row, a `cv.typ` branch

### A new kind, not a flag on `oneline`

`Skills` and `Spanish → Native` were both `oneline`, which is why pills looked
wrong on the second one. The alternative — a boolean on `oneline` — would have
put a UI concern in the data model. A new union member matches the grain of
`ItemSchema` and `BlockSchema`, and it stores a list as a list: a skill can now
contain a comma, which `React (hooks, context)` previously could not.

Tags carry `{ id, text }` rather than bare strings, on the M6.5 lesson —
retrofitting ids costs a migration, and `rectSortingStrategy` already ships in
the installed `@dnd-kit/sortable` if pills should ever be draggable. The id also
does immediate work as a React `key`, so duplicate skill names stop colliding.

**The migration heuristic is the comma.** `Skills` converts, `Native` does not.
It would also convert something like `Available → Mon, Tue`, which on a CV is
arguably the right reading anyway.

`silver-dev-cv.typ` needed no change at all: `cv.typ` joins the tags back into
a string and calls the same `oneline-title-item`. The split lives entirely on
our side of the adapter.

### Two guards that a second bodyless kind broke

`navigate.ts` spelled out `it.kind === "oneline"` in `block()` and `list()` to
skip items with no `body`. A second bodyless kind made that wrong, so both now
test `"body" in it` — TypeScript narrows a discriminated union through `in`,
and the check stops needing an edit every time a kind is added.

## Milestone 6.8 — editor redesign ✅

The editor pane spent most of its width and height on chrome. A bullet's text
sat inside five nested boxes and ~120 px of horizontal padding, and 62% of a
one-line bullet row's height was border, margin, and padding. Worse, all four
levels drew the _same_ box, so nesting repeated rather than encoded depth — and
the one thing worth knowing, _what kind of thing am I typing?_, was written
nowhere but the placeholder.

Replaced with a Notion-shaped editor whose vocabulary comes from typesetting
rather than an icon set: no boxes, indentation for depth, a copy-mark in the
gutter for kind, and the editor's own geometry mirroring what the template
prints.

**No schema change.** `SCHEMA_VERSION` stays at 3; `cv.typ`, `parse.ts`, and
`migrate.ts` are untouched. The only change outside the view layer is
`at?: number` on `block/add` and `bullet/add`.

### The row — `src/ui/Row.tsx`

One primitive file: `Row` (24 px gutter · content · 24 px control column),
`Rail` (one nesting level), `Mark`, `Chip`, `AddButton`, and the `FIELD` /
`TEXT` class constants shared by every field.

| depth | thing                          | mark                                                              |
| ----- | ------------------------------ | ----------------------------------------------------------------- |
| 0     | section                        | serif caps label over a rule — the same typography the PDF prints |
| 1     | entry / oneline / tags / prose | `▪` `–` `#` `¶`                                                   |
| 2     | paragraph, bullet              | `¶` `•`                                                           |

**The grip _is_ the mark.** `DragHandle` takes a `marker` and swaps it for
`GripVertical` on `group-hover/row`. One 24 px column, two jobs, nothing at rest
but the glyph.

**`bullets` and `prose` are transparent.** A `bullets` block has no content of
its own — it _is_ its bullets — so it contributes no row and no indent, and a
bullet sits at the same depth as a paragraph. That is what took bullet text from
~120 px of indent to ~62 px, and row height from ~54 px to ~28 px. Cost: the
block owns no gutter, so its delete lives on the trailing `+ bullet` row and
only appears once the list is empty, where "remove this" has exactly one
reading. Reordering a bullets block against a sibling paragraph is currently
impossible — that is stage 3's debt.

**The lit rail is the signature, and it is four lines of CSS.** Each `Rail` is a
`border-left` that tints on `:hover` and lights on `:focus-within`; because the
wrappers nest, a caret three levels deep lights its whole ancestry — a
breadcrumb drawn in the margin, costing nothing at rest. `:focus-within` is
declared last so it wins when both match.

**Both gutters are reserved, always.** The delete began absolutely positioned
and overlapped the text. A real 24 px column that renders empty when there is no
control keeps rows aligned whether hovered or not. The cost is that nested rows
staircase their right gutters exactly as they staircase their left.

**Fields are borderless.** `Input` and `Textarea` were already customised to
`border-transparent border-b-input px-0`, and `cn` is `twMerge`, so
`FIELD = "border-b-transparent hover:border-b-input focus-visible:border-b-ring"`
replaces the resting rule rather than fighting it. No primitive was edited.

### The entry is a wireframe of its own output

`SLOTS` is a direct transcription of plan.md §3's variant table, and it is now
the _only_ record of which fields a variant has — the old `USES` constant and the
`grid-cols-2` that let `location` wrap onto its own line are both gone.

```
job        JOB  Software Engineer II ──────────────  Argentina
                Flowics (acquired by Vizrt) ───────  2021 – 2026
education  EDU  Instituto Tecnológico…, Argentina ─  2017 – 2027
                Software Engineering
project    PRJ  Interactive 3D Scene Web App ──────  2025
```

`topLeft` is a _list_, because `education()` prints `[#institution, #location]`
on one line — that is why education has no location slot on the right, and the
comma between the two fields is the template's, not decoration.

Two supporting records earn their keep: `STYLE` (a field looks the same wherever
it lands — title serif bold, subtitle serif italic) and `NAMES`, which is where
plan.md §2's "the field names are intentionally generic" finally gets _said_.
The date placeholders are real dates (`2021 – present`) rather than the word
"date", so the free-text format documents itself.

Clicking the chip cycles the variant and visibly re-arranges the slots, which
teaches the mapping instead of leaving it in a table in plan.md.

`setField` is an exhaustive four-case switch rather than `set({ [field]: v })`,
which widens to a string index signature that `EntryPatch` will not accept
without a cast.

### Keyboard — `src/ui/focus.ts`

Enter in a bullet inserts the next bullet below and takes the caret; Enter in a
paragraph does the same for paragraph blocks; Backspace on an empty bullet
removes it and moves the caret up. This is the half that makes it feel like
writing — flat boxes alone still read as a form.

**The reducer mints the new row's id, so the caller cannot name the row it wants
focused — only the position it will land in.** Hence a module-level one-shot
token (`focusAfterRender(key)` / `useFocusClaim(key)`), keyed `parentId:index`.
The claim effect deliberately has **no dep array**: it has to be tested on the
very render that brought the row into existence.

Deliberately out:

- **No splitting.** Enter mid-text gives an empty row below rather than cutting
  at the caret. Splitting needs the reducer to write two rows in one action, and
  on a CV you type at the end of a line.
- **Backspace never removes the last bullet.** An empty `bullets` block renders
  nothing at all (M4), so backspacing through the last one would leave an
  invisible block and no field to type into.
- **Backspace on an empty paragraph does nothing.** Restoring the caret means
  landing it in whatever sits above, possibly a bullet — a different key space.
  Not worth the branch until stage 3 gives blocks a row menu.

Shift+Enter still types a literal newline. Harmless: Typst folds a single
newline into a space, which is also why Enter is free to mean "next block".

### Collapse — sections only

A disclosure caret on the section header, `useState` **local to
`SectionEditor`** because it is a view concern that has no business in the
document. Collapsed, a section reads as its rule, its label, and a row of the
marks of what it holds — `▪ ▪ ▪` for three jobs, `#` for skills. That summary is
information (which kinds are inside) rather than decoration, and it reuses the
gutter's own glyph vocabulary, so `MARK` moved out of `ItemEditor`'s switch into
one exported record.

Entries deliberately do not collapse: two disclosure interactions at two depths
for a much smaller win. "Collapse all" would need the state lifted into
`Editor`; not pre-built.

### Dark mode was inverted, not designed

The old `.dark` block was the light theme flipped, and it failed for one
specific reason: **the subject of this app is a white page, and it is on screen
at all times.** A near-black shell put a ΔL of ~0.85 next to the preview and
turned it into a floodlight.

Rebuilt as a _lamplit desk_ — nothing in the palette is black:

| name     | oklch            | role                             |
| -------- | ---------------- | -------------------------------- |
| slate    | `0.235 0.006 60` | the desk — editor shell          |
| felt     | `0.285 0.007 60` | raised surfaces, the preview mat |
| chalk    | `0.93 0.006 75`  | text you typed                   |
| graphite | `0.63 0.012 65`  | markers, placeholders            |
| ember    | `0.68 0.115 55`  | lit rail, focus, the pdf button  |

Five findings worth keeping, all of which were invisible until dark mode existed:

1. **Ink → chalk is not a symmetric transform.** The section rule was
   `border-foreground/70`; inverting its _colour_ inverted its _role_, from a
   line drawn in ink to a strip of light brighter than the label above it. It
   now has its own `--rule` token, dimmer than the label in dark and darker than
   it in light.
2. **A mid-lightness red on near-black reads as an error**, because that is what
   every linter gutter and failed field looks like. `--rail-lit` moved to an
   ember.
3. **A saturated accent gains lightness on a dark ground, it does not lose it.**
   `--primary` was being _darkened_ 0.553 → 0.47, which is why the pdf button
   looked muddy; it is 0.68 with dark foreground now.
4. **`--pencil` at 0.5 on 0.147 is ~3.5:1.** The markers are the whole navigation
   system of this design and cannot sit at the readability floor.
5. **`oklch(1 0 0 / 10%)` borders compose differently over every surface** and
   vanish on `--card`. In a design whose only structural device is a hairline,
   the hairline needs a real value.

`useTheme` cycles system → light → dark and toggles `.dark` on the root; the
`system` branch is the only one that keeps a `matchMedia` listener. `index.html`
carries an inline pre-paint script, or dark mode flashes white on load.

### Tags: sortable pills, and the position bug

Clicking a pill to edit it used to append the result at the end of the list.
`TagsInput` now tracks `home` — the hole the pill left — and splices the draft
back there; `onBlur` commits to `home` too, so clicking away no longer
relocates a tag. The one subtle line is
`j = draft.trim() && at <= i ? i + 1 : i`: flushing a pending draft shifts a pill
to its right one slot before it gets pulled out.

Pills reorder via `SortableList`, not a bespoke `DndContext` — the M6 lesson
about that `onDragEnd` guard was expensive enough once. `SortableList` grew a
`Move` union (`{ list }` **or** `{ onMove }`) so a locally-owned list can reuse
the whole mechanism while staying a controlled component with one update path,
and an `orientation="wrap"` that switches to `rectSortingStrategy` and unlocks
the x axis.

**`display: contents` has a zero-size rect.** The pills wrap in
`className="contents"` so they stay direct children of the flex-wrap row —
which means `restrictToParentElement` would clamp every pill to a point. A
`wrap` list runs with no modifiers at all.

The pill is its own drag handle: `PointerSensor`'s 5 px activation distance is
what keeps a plain click an edit rather than a drag. Its two inner buttons
`stopPropagation` on keydown, or the `KeyboardSensor` on the wrapping span would
eat their Space and Enter.

### Two things that looked like bugs and were geometry

1. **The bullet marker rendered above its own grip.** `BulletsList` had both
   `<DragHandle />` and `<Textarea>` as _children_ of `Row`, inside the
   `min-w-0 flex-1` content column; `Textarea` is `flex w-full`, so it wrapped to
   the next line. The grip belongs in the `marker` slot, not in the content.
2. **`+ bullet` as a filled chip was the only filled surface in the pane**, so it
   read as leftover chrome rather than as a different kind of thing. It is a
   plain `AddButton` now, matching `+ paragraph` / `+ bullets` below it. Kept
   even though Enter chains bullets, because it is the only way to put the first
   bullet back into an emptied list.

### Stage 3 — row menus ✅

`src/ui/Menu.tsx` wraps `@base-ui/react/menu` in the app's flat look and adds
`AddMenu`; `RowMenu` lives in `Sortable.tsx`, where it replaced `RowDelete`
entirely.

**The trigger is a `⋯` in the right gutter, not the grip.** Grip-click was the
plan — `activationConstraint: { distance: 5 }` means a plain click on a grip is
already a no-op, which looked like free real estate. It is not usable: a
dnd-kit drag _ends in a `click`_ on the grip, `s.isDragging` is already false by
then (pointerup → onDragEnd → click), and React's synthetic dispatch does not
honour `stopImmediatePropagation` between two handlers on one element. Every
workaround is a hand-rolled distance guard duplicating what `PointerSensor`
computes internally. The right gutter therefore did not shrink, which was
stage 3's other hoped-for win.

**Position moved into `RowCtx`.** `RowMenu` needs the list, the index, and the
length (to disable "move up" on the first row). Drilling three props through
`Shell` → `ItemEditor` → `BlockEditor` was the alternative; putting them in the
context `SortableList` already provides is both smaller and stronger — a row and
its menu cannot disagree about where the row sits. `list` is optional there,
because a `wrap` list (tags) is driven by `onMove` and has no `ListRef`.

**This is what finally paid the transparent-block debt.** The trailing
`+ bullet` row sits inside the _blocks_ `SortableRow` and outside the bullets
`SortableList`, so its `RowMenu` reads the block's context — a `bullets` block
can now be moved and deleted whether or not it has bullets, and the
delete-only-when-empty hack is gone.

Unplanned payoff: **keyboard reordering without a drag.** Move up / move down
work from any row at any depth, which the grip's Space-lift never made pleasant.

`AddMenu` folded `+ paragraph / + bullets` and
`+ entry / + oneline / + tags / + prose` into one `+ add` each, and its items
carry the same copy-marks the gutter uses. `+ bullet` stayed a plain
`AddButton` — Enter chains bullets now, but it is still the only way to put the
first one back into an emptied list.

### Duplicate reminted ids, and only where it can

`copyItem` / `copySection` in `factory.ts`, behind `section/duplicate` and
`item/duplicate`. **A copy has to remint every id**: React keys and `navigate()`
both look rows up by id, so a duplicate sharing them would silently edit the
original.

Two deliberate limits:

- **No generic `list/duplicate`.** `navigate.list()` erases to `unknown[]`, which
  is exactly what lets move and remove be one action each — a generic duplicate
  would have to undo that erasure to remint ids. Items and sections are also the
  only two things anyone duplicates on a CV.
- **`current(it)` before cloning.** Spreading a draft into a new object and
  splicing it back into the same draft is the kind of thing immer forgives until
  it doesn't; `current()` takes a plain snapshot, which is what a clone wants
  anyway.

**"Turn into" was cut.** paragraph ⇄ bullets and entry ⇄ oneline ⇄ tags are data
questions, not UI ones — what happens to three bullets when they become one
paragraph, or to an entry's body when it becomes a `oneline`? Deserves its own
pass.
## Milestone 6.9 — mobile 🚧

The redesign was measured in a desktop pane. On a 390 px phone the same class
stack spends **158 px on chrome and leaves 232 px for text**: 32 (`aside`
`pl-8`) + 7 (section rail) + 24 (item gutter) + 7 (body rail) + 24 (block
gutter) on the left, 24 (control column) + 40 (`pr-4` and the scrollbar) on the
right. Two panes side by side is not a layout question on that screen, it is a
subtraction problem.

- [x] `useMediaQuery` — a `useSyncExternalStore` over `matchMedia` — and a
      `write | preview` `TabSwitch` that is `md:hidden`. Above `md` the
      `ResizablePanelGroup` is untouched; below it, one pane at a time.
- [x] `StatusToast` and `CompileErrorDialog` moved out of `EditorPane` into the
      wrapper around both panes. A compile error has to be readable from the
      Preview tab — that is the tab you are on when you notice something is
      wrong.
- [x] One class for the whole touch story (below).
- [x] The four-slot print geometry stacks on a narrow row — `SLOTS`, `LABEL`
      and `META` in `Row.tsx`, container queries rather than breakpoints
      (below).
- [x] The topbar fits 390 px: `download pdf` is an icon-only 28 px button below
      `md`, and `TabSwitch` names only the tab you are on.
- [ ] Width trims: `pl-8`→`pl-3`, `pr-4`→`pr-2`, gutters `w-6`→`w-5`, rails
      `pl-1.5`→`pl-1` (~48 px), then dropping the body rail below `sm` (~31 px).
- [ ] Lift collapse state out of `SectionEditor` so "collapse all" can exist. A
      fully folded document is the outline view a phone actually wants, and
      `Summary` already renders it.
- [x] Pause `useCompiledCV` while the Preview tab is hidden — `useCompiledCV`
      takes an `active` flag, `wide || tab === "preview"`, and bails before the
      timer when it is false. `active` is a dep, so flipping to Preview
      recompiles through the same debounce; desktop pins it true and is
      byte-for-byte the old path. The debounce was never touched.

### Hover-only affordances were already solved, by accident

Every `group-hover/row:opacity-100` in the redesign was written paired with
`group-focus-within/row:opacity-100`, for keyboard users. Focus is not a mouse
concept, so touch inherited the entire design for free — tap a field and the
row's controls appear.

The only gap was rows you cannot focus without a side effect: a `bullets`
block's trailing `+ bullet` row, a section header. Hence a single
`pointer-coarse:opacity-100` on `Row`'s control column. It keys off the
_primary_ pointer, so a laptop with a touchscreen is unaffected.

**Deliberately not on `DragHandle`.** Its grip _replaces_ the copy-mark on
hover; making that permanent under `pointer-coarse` would delete the mark
vocabulary — the one thing the redesign exists to show — on every phone.

### The stack point is the row's width, not the screen's

The two-line, four-slot geometry `ItemEditor` draws — title and subtitle left,
date and location right — is the geometry the template prints, and it needs a
printed line's width to read as one. Narrower than that it has to become one
field per line.

`md:` would have been the wrong test. A desktop pane dragged narrow hits the
same wall, and a row three rails deep is already ~60 px narrower than a sibling
at depth 0 on the same screen. The measurement that matters is the row's own
content box, so `Row` declares `@container` and the three shared constants —
`SLOTS`, `LABEL`, `META` — query it at `@xs` (20 rem). Anything using them
outside a `Row` brings its own `@container`; the name-and-date block in
`EditorPane` is the only one.

**Stacked lines carry no gap.** `SLOTS` is `flex-col` with the gap on
`@xs:gap-2`, so once the fields stack they butt up like set copy — which is
what a label over its value should look like. The comma between an education's
title and subtitle is `hidden @sm:inline` for the same reason: it is
punctuation for a run-on line, and stacked there is no run-on line.

**The entry top line stacks later.** It carries one more slot than any other
line, so its title/subtitle pair holds `flex-col` to `@sm` and lets the date
move up beside them first. The only per-slot override in the file.

The rename fell out of this: `ItemEditor`'s per-variant slot map was also called
`SLOTS`, and the import needed an `as cSLOTS` alias to coexist. The map is
`LAYOUT` now — it describes where fields land, not the class that stacks them.


## Milestone 6.10 — undo/redo ✅

`src/state/history.ts` wraps `reducer` rather than changing it. `useHistory`
returns `{ doc, dispatch, undo, redo, canUndo, canRedo }`, and its `dispatch` is
still a `Dispatch<Action>`, so `DispatchCtx` and every editor under it are
untouched.

**Snapshots, not immer patches.** Consecutive `CVDocument`s share every subtree
that did not change, so a 100-entry stack is 100 shallow spines — the same
structural sharing the compile trigger and the autosave already lean on. Patches
would have cost `enablePatches()` and a reducer restructure to buy nothing.

### The whole problem is coalescing

Every keystroke dispatches, and undoing one character at a time is useless.
`coalesceKey(a)` decides what "the same edit" means: `null` for anything
structural, which always starts a fresh entry; otherwise a key of action plus
target plus fields. Two consequences worth writing down:

- **The fields are part of the key.** Retitling a job and then changing its date
  are two undos, not one, because `Object.keys(patch)` differs.
- **Two patch actions are structural in disguise.** `entry/update` carrying
  `variant` rearranges the row into a different slot layout, and `tags/update`
  carrying `items` adds, removes, or reorders pills. Both return `null`.

### Three things that keep it honest

- **The clock lives in a `useRef`, outside the reducer.** StrictMode invokes
  reducers twice; a `Date.now()` inside one is a real impurity. `merge` is
  computed at dispatch time and passed in.
- **`if (doc === s.doc) return s;`** — immer returns the base object when a
  recipe writes an identical value, so retyping the same character over itself
  never reaches the history.
- **Undo and redo clear the coalesce key**, or the next keystroke could merge
  into an entry from before the jump.

The break is idle-based, not a fixed budget: the timestamp updates on every
merged action, so continuous typing is one entry and a 600 ms pause starts the
next. One uninterrupted paragraph is therefore one undo. If that ever bites, a
character budget alongside the timer is the fix.

**Ctrl/Cmd+Z is taken outright**, `preventDefault()` and all, on a `window`
listener. Every field is controlled, so the browser's own undo stack is already
out of step with the document — letting both fire is worse than owning it.
Ctrl+Y and Ctrl/Cmd+Shift+Z redo. The topbar carries icon buttons gated on
`canUndo`/`canRedo`, because a phone has the history but no keyboard.

**`doc/replace` is undoable.** Reset, import and "load the sample" all land in
`past`, so Ctrl+Z brings the old CV back. The `confirm()` guards stay, but they
stopped being the only safety net.

## Milestone 7 — Persistence ✅

- [x] Autosave — `src/state/persist.ts`, 500 ms debounce (lazier than the 200 ms
      compile, since nobody is watching the save). Reports `SaveState` for the
      status toast — see Milestone 6.6
- [x] Storage treated as a trust boundary — every read routes through
      `parseDocument()`, so a stale or corrupt document is logged and discarded
      rather than crashing the load
- [x] Resolve: multiple CVs or one? — **one** (open Q3, resolved)
- [x] IndexedDB + `navigator.storage.persist()`
- [x] Reset control — `reset` and `sample` buttons in the editor header, both
      `doc/replace` behind a `window.confirm`
- [x] `App.tsx` no longer seeds from `sample/content-en.json` — an empty
      document is the default, and the fixture is a button

### Why the storage swap reshaped `App.tsx`

IndexedDB reads are async and `useReducer` is not, so the load has to gate the
render. `App` now does nothing but await `useStoredDocument()`; `Editor` mounts
underneath it with the document already in hand.

That ordering is the point, not a side effect. The alternative — seed the
reducer with `emptyDocument()` and hydrate later via `doc/replace` — leaves a
window where autosave can fire against the placeholder and write it over the
stored copy. Gating the mount deletes that race instead of guarding against it.

### Two things worth remembering

**The old `localStorage` key migrates itself.** First boot on the new store
reads `cv-maker:doc`, writes it into IndexedDB, and only then removes it. A
failed write leaves the old copy alone to retry next boot rather than losing it.
Same reason IndexedDB failing outright falls back to reading `localStorage`
instead of returning empty.

**Autosave dropped `JSON.stringify`.** It used to memoize on a serialized copy;
IndexedDB stores the object directly via structured clone, so the effect keys on
`doc` identity. That is more precise, not less — immer returns the base object
unchanged when a recipe writes an identical value, so retyping the same
character over itself schedules no write at all.

A `visibilitychange` handler flushes a pending debounce when the tab hides.
Best-effort: an IndexedDB write on the way out is not guaranteed to land.

## Milestone 8 — PDF download 🚧

- [x] `format: 'pdf'` → Blob → object URL
- [ ] iOS standalone-PWA fallback — **not started.** `<a download>` is inert in
      an iOS home-screen PWA: no download, no error. The workaround is opening
      the blob in a new tab for the share sheet, which needs the click handler
      to open the tab *before* any `await` or the popup blocker eats it. Same
      fix serves `content.json` export, so solve it once for both.
- [x] Libertinus embeds correctly — verified in the downloaded PDF. Worth having
      checked: `loadFonts` runs at init, but PDF embedding is a different path
      from SVG glyph rendering, so a good-looking download was not evidence.

### The PDF path skips the renderer entirely

`format: CompileFormatEnum.pdf` makes the compiler emit final bytes, so there is
no `vector` artifact and no `renderer.renderSvg` step — unlike `compile`, which
needs both halves. The worker transfers the buffer (`postMessage(msg, [buf])`)
rather than letting structured clone copy a few hundred KB.

Download deliberately does **not** reuse `useCompiledCV`'s debounced artifact.
It is a discrete action and compiles fresh at click time; inheriting a 200 ms
stale render would occasionally hand someone a PDF of what they had a moment
ago. `pdfBusy` covers the case where the compiler has not warmed up yet.

### `Uint8Array` went generic in TS 5.7

`new Blob([r.pdf])` failed: a bare `Uint8Array` now means
`Uint8Array<ArrayBufferLike>`, and `BlobPart` wants `ArrayBufferView<ArrayBuffer>`
— `SharedArrayBuffer` is the member that does not fit.

Fixed at the declaration, not the use site: `PdfResult.pdf` is
`Uint8Array<ArrayBuffer>` in `client.ts`. That is a statement of fact rather
than a cast — a `SharedArrayBuffer` in a transfer list throws, so transferring
the buffer already guarantees it is a plain `ArrayBuffer`. `call<T>` is an
unchecked generic over an untyped `postMessage`, so the annotation is the only
place that truth gets written down.

## Milestone 9 — PWA hardening

- [x] Manifest icons — 64 / 192 / 512 / maskable, plus an apple-touch icon and
      a `.ico`, generated by `@vite-pwa/assets-generator` from one SVG
- [x] Manifest screenshots — one `wide` (1280×720), one `narrow` (720×1280),
      both 16:9. Chrome's richer install UI needs one per form factor and will
      not say so anywhere except Application → Manifest. `globIgnores` keeps
      them out of the precache: the install prompt fetches them once, over the
      network, before the app is ever installed.
- [x] SW updates — check on resume, then ask before reloading (below)
- [ ] Offline verification on a real phone
- [ ] Revisit WASM download size

### Nothing was checking for a new worker

An installed copy on a phone kept serving its cached build until it was pulled
down to refresh. `registerType: "autoUpdate"` was not the problem — it only
governs what a *found* worker does. The generated `registerSW.js` is one line:

```js
if('serviceWorker' in navigator) {window.addEventListener('load', () =>
  navigator.serviceWorker.register('/cv-maker/sw.js', { scope: '/cv-maker/' }))}
```

It registers on `load` and never looks again. Resuming a standalone PWA from
the background is not a `load`, so nothing ever asked. Pull-to-refresh is a
navigation, which re-runs that line — hence the one gesture that worked.

`src/pwa.ts` asks on the way back in: `registration.update()` on
`visibilitychange` when the document turns visible. Both halves are native, so
there is no `virtual:pwa-register`, no `injectRegister` change, and no new
dependency — the injected script still does the registering.

**Resume is also the safe moment to reload.** `autoUpdate` gives the worker
`skipWaiting` and `clientsClaim`, so a new one takes control the instant
`update()` finds it — but the page keeps running the old chunks until it
reloads, so the reload is the half that actually ships the new version. It is
free of consequence here because `useAutosave` already flushes to IndexedDB on
`visibilitychange → hidden`: the document went to disk when you left, so the
500 ms `SAVE_MS` debounce has nothing left to lose when you come back.

Two things the eight lines are careful about:

- **`controllerchange` fires on first install too.** The listener is only
  attached when `navigator.serviceWorker.controller` already exists, or every
  first visit would reload a page that had just loaded.
- **No `setInterval`.** An hourly `update()` for a tab left open is the obvious
  addition, and its reload can land mid-keystroke — a path the hidden-flush does
  not cover, so it would eat up to 500 ms of typing. Add it when someone
  actually leaves the app open for a day, paired with a `pagehide` flush.

### Then the auto-reload was walked back

The first version reloaded on its own, on the reasoning that resume is a safe
moment because the document was flushed on the way out. That is true only if
the swap is instant, and it is not: the new worker precaches ~1.9 MB before it
activates, so `controllerchange` can land **seconds** after resume — by which
time you are typing, on a path the hidden-flush does not cover. Same 500 ms
exposure as the `setInterval` above, arriving through the front door.

So `registerType` is `"prompt"` now and `UpdateDialog` asks. Dismissing is
one-way for the session (`later`, the same shape as `CompileErrorDialog`'s
`seen`); the worker stays parked, so the next launch offers it again.

**`prompt` quietly drops two workbox settings, and one of them is load-bearing.**
The plugin only sets them for `autoUpdate` —

```js
if ((injectRegister === "auto" || injectRegister == null) && registerType === "autoUpdate") {
  workbox.skipWaiting = true;
  workbox.clientsClaim = true;
}
```

— so switching to `prompt` falls back to workbox's defaults. `skipWaiting:
false` is exactly what is wanted: it is what makes workbox generate the
`SKIP_WAITING` message listener the dialog posts to. But `clientsClaim: false`
means the new worker activates and **never takes control of the open page**, so
`controllerchange` never fires and the reload never happens — a dialog whose
button does nothing, with no error anywhere. `clientsClaim: true` goes back in
the `workbox` block by hand.

### About, and a build stamp

`AboutDialog` is what the app is, what it is powered by, and the credits —
lifted from the README's *Credits and licensing*, which means the two will now
drift independently. It hangs off a `MenuItem` in the existing overflow menu
rather than a new topbar button, because M6.9 spent real effort getting that bar
into 390 px.

It carries `__BUILD__`, a timestamp inlined by `define` in `vite.config.ts`.
That exists for the update flow above: without it a deploy proves the bundle
changed, and with it you can read the stamp on both sides of a reload and know
the swap actually happened.

### The icon is the app's own copy-mark

`public/favicon.svg` is a Libertinus Serif `¶`, outlined — pulled out of the
vendored OTF with the `typst` CLI (`--format svg`), so it rasterises anywhere
with no font dependency. `#ca3500` on `#eeedea` is `--primary` on `--paper`, the
same two tokens the editor uses. It replaced the starter's purple bolt, which
said nothing about a CV and matched no colour in the app.

Two things that were not obvious:

- **Typst centres the advance box, not the ink.** `align(center + horizon)` left
  the mark visibly low and right of centre. The transform baked into the SVG
  comes from solving the cubic extrema of the glyph path for a true ink box
  (27.002 × 42.182), sizing that to 40/64 of the canvas, and centring it.
- **The ground has to bleed to all four edges.** Android crops _into_ a
  maskable and iOS composites transparency onto black, but `minimal-2023`
  defaults a background only for splash screens — maskable and apple fall
  through with nothing. `pwa-assets.config.ts` sets `resizeOptions.background`
  on both, matching the art's own ground so the added padding is invisible.
  Pre-baking an opaque square instead is worse: the preset then shrinks _that_
  to 80% and you get a floating tile.

The whole set is 28 kB. The starter bolt was 9.5 kB on its own.

## Milestone 10 — Export

- [ ] Zip: `cv.typ` + `content.json` + template + LICENSE + README
- [x] Bare `content.json` round-trip

## Milestone 11 — first release ✅

Live at <https://mricarte-i.github.io/cv-maker/>, deployed by
`.github/workflows/deploy.yml`: build, `upload-pages-artifact`, `deploy-pages`,
with Pages' Source set to GitHub Actions rather than a branch. Root `LICENSE` is
MIT — see Milestone 1.

### A project Pages site is a subdirectory, and only some of that is free

`base: "/cv-maker/"` fixes more than expected. Vite rewrote the favicon and
manifest links in `index.html`, the emitted script and style tags,
`registerSW.js`, **and** the `url("/fonts/…")` in `index.css`'s four
`@font-face` blocks — none of which needed a source change.

What it cannot rewrite is a string evaluated at runtime. `worker.ts` carried
`fetch("/typst/silver-dev-cv.typ")` and its four font paths verbatim into the
bundle; on Pages those 404 into the SPA shell and the compiler never
initialises, with nothing in the console that names the cause. They are
`${import.meta.env.BASE_URL}…` now.

**The VFS paths are not URLs.** `/silver-dev-cv.typ`, `/cv.typ` and
`/content.json` live at the root of Typst's virtual filesystem and stay there
no matter where the site is served from.

**`start_url` does not inherit `base`.** vite-plugin-pwa derives `scope` from
it but leaves an explicitly-set `start_url` alone, so `"/"` survived next to
`"scope": "/cv-maker/"`. A start URL outside its own scope is an installability
failure and nothing warns about it.

### Two smaller traps

`pnpm build` is `tsc -b && vite build`, and `tsc -b` is incremental _per
project_. The node project — `vite.config.ts`, and now `pwa-assets.config.ts` —
had not been rechecked in a while, so editing the config surfaced errors that
predated the edit and looked like it caused them.

`crypto.randomUUID` needs a secure context. Pages over HTTPS and `localhost` are
both fine; testing from a phone against `http://192.168.x.x:5173` is not, and
every id mint throws. That is the trap waiting for M9's real-phone test.

No `404.html` and no `.nojekyll`: there is no router, so there are no deep links
to fall back from, and `upload-pages-artifact` deploys the tarball without ever
running Jekyll.

## Milestone 11.5 — prune ✅

A post-release sweep for things the codebase carried but never used. No
behaviour change except one addition, below.

- Deleted `card.tsx`, `label.tsx` and `select.tsx` — 328 lines of shadcn
  scaffold with no importer. `dialog.tsx` lost `DialogTrigger` and
  `DialogClose`, `button.tsx` lost `buttonVariants`; same reason.
- `loadDoc`, `requestPersistence`, `PdfResult`, `CompileResult` and
  `CompileState` are module-private now. Every one had a single caller, inside
  its own file.
- The four `@fontsource-variable` imports left `index.css`, along with the
  commented-out `--font-sans` block they fed. Everything has been drawn in
  Libertinus since M6.8, so four webfont families were bundling for nothing.
- `tailwindcss`, `@tailwindcss/vite`, `shadcn` and `tw-animate-css` moved to
  `devDependencies` — all build-time, and `shadcn` is a CLI.
- `navigate.ts`'s `block()` skipped `oneline` before a `"body" in it` guard that
  already excludes it. Two unreachable lines.
- `sample/*.typ` deleted, its two reference PDFs moved to `.agents/`, and
  `sample/` gitignored except `content-en.json`. Those were the M2 spike's
  hand-written inputs; `cv.typ` has been the source of truth since M4.

### The status toast reports the compile

`useCompiledCV` now returns `ms` — `compileMs + renderMs`, held from the last
*successful* compile so a failing keystroke does not blank it — and the settled
toast reads `Saved · 8 ms`. Both halves were already crossing the worker
boundary and being discarded. It is the cheapest available answer to Q5: point
a phone at the live URL and the number is on screen while you type on it.


## Milestone 12 — tests ✅

30 tests, four files, ~200 ms. `pnpm test` is `vitest run`; `deploy.yml` runs it
between `pnpm lint` and `pnpm build`, so a red test stops the release rather
than being noticed afterwards.

- [x] `schema/parse.test.ts` — the v1 → v3 path, on the real document
- [x] `state/history.test.ts` — `coalesceKey` and the undo stack
- [x] `state/reducer.test.ts` — reorder, duplicate, and the miss cases
- [x] `state/transfer.test.ts` — `slug` and JSON import
- [ ] `persist.ts` — the known gap (below)

### No jsdom, and that was a choice about *what* to test

Vitest inherits `vite.config.ts`, so the whole setup is one dev dependency and
one script — no `vitest.config.ts`, no environment. The suite reports
`environment 0ms` because every module under test is pure: migrations, a
reducer, a history stack, a slug. Picking those four first is what kept jsdom
out, and keeping jsdom out is what keeps the suite at 200 ms.

`resolveJsonModule` went into `tsconfig.app.json` so the v1 fixture is an
`import` rather than a `readFileSync` — the app project deliberately carries
`"types": ["vite/client"]` and no node types, and reaching for `node:fs` in
`src` does not typecheck.

### The fixture was already in the repo

`sample/content-en.json` is `"schemaVersion": 1` — the one file `.gitignore`
keeps out of the `sample/` exclusion. Migrations are the only place in this app
where a bug is silent: everything else fails on screen, but a bad v1 → v3 step
eats a document that was saved months ago and says nothing. Testing
`parseDocument` rather than `migrate` alone matches how it is actually called,
and covers the pass-through in `mapArray`/`mapKey` — malformed input has to
reach zod as a rejection, not throw on the way.

### Identity is the contract, not equality

`historyReducer` bails when immer hands back the base object, which is what
stops retyping the same character from eating an undo slot. So the tests assert
`toBe`, not `toEqual`, in three places: the no-op edit, the no-op drag
(`from === to`), and every action naming an id that does not exist. `toEqual`
passes on a structurally-equal clone and would let that contract rot silently
— which would then show up as phantom undo steps, three modules away.

`coalesceKey` and `historyReducer` needed exporting to be reached at all. The
alternative was driving `useHistory` through React and jsdom for logic that is
pure, and `coalesceKey` is worth exporting on its own: it *is* the written rule
for what counts as one undo. `IDLE_MS` stays uncovered — that decision lives in
the hook's ref, not the reducer.

### `typst/client.ts` is the edge of what node can import

It constructs its `Worker` at module scope, so *any* module reachable from it is
un-importable outside a browser — `transfer.ts` imports `compilePdf` for
`downloadPdf` and that alone was enough to fail the file before a single test
ran. The test stubs it with `vi.mock`; making the worker lazy to suit a test
would have traded away the warm start that M8's `pdfBusy` is built around.

That boundary, not effort, is what puts `useCompiledCV` and the PDF path below
the line. `persist.ts` is the one gap worth naming: it is the only module where
a bug loses real work, and it is also the only one that would cost a dependency
(`fake-indexeddb`) plus jsdom, with `loadDoc` private again since M11.5. Add it
the first time a document fails to come back.

### One bug, found by writing the tests rather than running them

`slug()` stripped every character outside `[a-z0-9]`, accents included, so the
author of this document downloaded `mat-as-ricarte.pdf`. `normalize("NFD")` and
a combining-marks strip, ahead of the existing chain, and it is
`matias-ricarte`. `"José A. Ñuñez"` → `jose-a-nunez`.

Unrelated but adjacent: `newId` is `crypto.randomUUID()`, which exists only in a
secure context. Node has no such rule, so the suite mints ids happily — but a
phone pointed at `http://192.168.x.x:5173` throws on every add. Hence the
comment on `newId`, and hence Q5 wanting the deployed URL.


## Milestone 13 — accessibility ✅

Lighthouse on the deployed build: **98 / 100 / 100 / 100**. Accessibility opened
at 84 with four failures and took three rounds to clear.

- [x] `<main>` — there were `<header>` and `<aside>` already; the pane wrapper
      was a bare `<div>`
- [x] Accessible names for every field and every icon-only button
- [x] `--pencil` contrast, both themes
- [x] Tap targets on `Chip`

### Lighthouse has no PWA category any more

Removed in Lighthouse 12 (mid-2024). The installability checks live in
DevTools → Application → Manifest now, and that is where the missing-screenshots
warning in M9 came from — nothing in a Lighthouse run would have mentioned it.

**And never audit performance against `pnpm dev`.** A dev-server run scored 54:
9,632 KiB of "unminified JavaScript" across 57 files, a 43 MB total payload, FCP
6.0 s, LCP 12.5 s. All of it is Vite serving raw ES modules plus the
unminified WASM, with no service worker (`devOptions.enabled: false`). The same
commit scores 98 deployed. Accessibility, SEO and best-practices *are*
meaningful on dev — they are structural — which is why the run was still worth
having.

### The placeholder was already the label

The editor deliberately has no visible field labels; the placeholder carries the
words. So rather than 12 `aria-label` attributes, the shared `Input` defaults
one from its own placeholder, declared *before* the prop spread so an explicit
`aria-label` still wins:

```tsx
aria-label={props.placeholder}
{...props}
```

One line, every current call site and every future one — including the dynamic
`NAMES[item.variant][field]` in `ItemEditor`.

**The gap is raw `<input>`s.** `TagsInput`'s draft field is not the `Input`
component (it wants none of the border and height), so nothing reached it, and
it has no placeholder to fall back to either. It carries its own
`aria-label="add tag"`. The zoom `−`/`+` in `Preview` were the same shape of
miss: icon-only buttons whose name lived in an SVG. The `100%` between them
passed all along, because its text child *is* its name.

### The contrast failure was one token

Measured against `--paper`, in oklch:

| pair | ratio |
| --- | --- |
| `--pencil` light, before | **2.46** |
| `--pencil` dark, before | **4.10** |
| `--muted-foreground` light | 4.09 — large text only |
| `--primary` light | 4.45 — misses by a hair |
| `--foreground` light | 16.81 |

`--pencil` is on twenty elements and it carries the copy-marks, which M6.8 makes
the *vocabulary* of the editor — informative, not decorative, so the 4.5 rule
applies and no "it's just an ornament" argument was available. Solved for the
lightest passing lightness rather than picked by eye: `0.68 → 0.53` light
(4.51:1) and `0.63 → 0.66` dark (4.61:1). Light mode is visibly darker now;
`--foreground` is still 16.8:1 against the same ground, so pencil remains three
and a half times quieter than body text.

Untouched and worth knowing: `--rail-lit` is **2.18:1** against paper in light
mode, and it is the focus indicator — WCAG wants 3:1 for those. Lighthouse does
not audit focus-indicator contrast, which is exactly why it survived a green run.

### Tap targets are measured from `getClientRects()`

`Chip` was `text-[10px]` with `py-px`, so about 12–14 px against a 24 px
minimum. It is `inline-flex min-h-6 min-w-6 items-center justify-center` now.

The tempting fix — a `::after` with negative insets to grow the hit area
without touching layout — is genuinely better for real fingers, but the audit
reads `getClientRects()`, which does not include pseudo-elements. It would have
helped users and still failed the check.


---

## Open questions

| # | Question | Blocks | Status |
|---|---|---|---|
| 1 | `entry.variant` rendering | M4 | ✅ **resolved** — branch to `job`/`education`/`project`, not `twoline-item` |
| 2 | Multi-language | — | leaning separate documents; `sys.inputs` available either way |
| 3 | Multiple CVs vs one | M7 | ✅ **resolved** — one. A switcher needs doc-level `id`/`label` (a v3 migration), a `doc/replace` action, a flush-on-switch fix for the autosave debounce, and delete/rename/duplicate. M10's `content.json` round-trip covers the real use case (tailor a copy per application) for free. `CVDocument` is self-contained and versioned, so adding a library wrapper later stays cheap. |
| 4 | Section labels free text or preset | M6 | ✅ **resolved** — free text |
| 5 | Compile-on-keystroke on mobile | M6 | **desktop resolved yes** (~8 ms round trip). The hidden-pane compile is gone (M6.9) and the status toast now prints the round trip, and the app is now installed on a phone — so the number only needs reading off the toast, which nobody has reported yet. Use the deployed HTTPS site, not a LAN dev URL: see `newId` in M12. |
