# Progress

Companion to [plan.md](plan.md). The plan says *what* and *why*; this says
*what's done* and *what was measured*. Update as milestones close.

Last updated: 2026-08-22

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
- [ ] **Root `LICENSE` — still undecided.** No license = all rights reserved.
      MIT is the low-friction default if this goes public; neither vendored
      license constrains the choice.
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
| app JS | 193 KB | 61 KB |
| worker JS | 111 KB | - |
| fonts (4 faces) | 1,198 KB | - |
| **precache manifest** | **12 entries / 1511 KiB** | - |

1511 KiB is *correct*, not the old precache bug: the shell and fonts are
precached, the WASM is deliberately excluded and handled by a `CacheFirst`
runtime rule instead.

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

## Milestone 6 — UI 🚧

Reducer and editors are done. Reordering is what is left.

- [x] `useReducer` over `CVDocument` — 15 actions, immer `produce`, generic
      `list/remove` + `list/move` over a `ListRef`
- [x] Navigation split out into `src/state/navigate.ts` — `section()` / `item()` /
      `block()` / `list()`, the last returning `unknown[]` because move and
      remove genuinely do not care what is in the list
- [x] Editors: `SectionEditor`, `ItemEditor` (+ `BodyEditor`, `Shell`),
      `BlockEditor`, `ContactsEditor`, `ListControls`
- [x] Dispatch through context — `src/ui/dispatch.ts`, React 19 `<Ctx value>`
- [x] Tailwind v4 + shadcn, custom theme preset, Libertinus in the UI
- [x] Resizable editor/preview split — `react-resizable-panels`, layout persisted
- [x] **Preview scaling** — `src/ui/Preview.tsx`, fit-to-width plus a zoom step
      control; see below
- [x] Resize handle made visible and grabbable — see below
- [ ] `dnd-kit` reorder — M6.5 is done, so this is now unblocked

### Two deliberate divergences from plan §5

**A switch, not an `ITEM_EDITORS` registry.** One `switch (item.kind)` inside
`ItemEditor` narrows the union just as well and needs no registry type. The three
branches are ~30 lines each and never justified separate files.

**Plan §5's six-component table has no `ContactsEditor`.** `doc.contacts` renders
into the header via `cv.typ`, but nothing edited it until now — a gap in the plan,
not just the code. It renders the whole list rather than one row, since contacts
are flat.

### `ListControls` is temporary

Three buttons (↑ ↓ ✕) on every row at every depth. dnd-kit collapses the arrows
into one drag handle; the ✕ stays. Bullet rows are visibly cramped until then.

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

`ListControls`-adjacent lesson: **the hit area was never the problem.**
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

**Blocks dnd-kit.** Plan §2 deliberately left bullet strings without ids: "making
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

## Milestone 7 — Persistence 🚧

- [x] localStorage autosave — `src/state/persist.ts`: `loadDoc()` +
      `useAutosave(doc)`, 500 ms debounce (lazier than the 200 ms compile, since
      nobody is watching the save)
- [x] Storage treated as a trust boundary — `loadDoc()` routes through
      `parseDocument()`, so a stale or corrupt document is logged and discarded
      rather than crashing the load
- [ ] Resolve: multiple CVs or one? (open Q3)
- [ ] IndexedDB + `navigator.storage.persist()`
- [ ] **A reset / new-document control.** Autosave has no in-app escape hatch:
      `localStorage.removeItem("cv-maker:doc")` in devtools is currently the only
      way back to the seed fixture.
- [ ] `App.tsx` still seeds from `sample/content-en.json` when storage is empty.
      Swap for `emptyDocument()` before shipping.

## Milestone 8 — PDF download

- [ ] `format: 'pdf'` → Blob → object URL
- [ ] iOS standalone-PWA fallback

## Milestone 9 — PWA hardening

- [ ] Manifest icons (192 / 512 / maskable)
- [ ] SW update prompt
- [ ] Offline verification on a real phone
- [ ] Revisit WASM download size

## Milestone 10 — Export

- [ ] Zip: `cv.typ` + `content.json` + template + LICENSE + README
- [ ] Bare `content.json` round-trip

---

## Open questions

| # | Question | Blocks | Status |
|---|---|---|---|
| 1 | `entry.variant` rendering | M4 | ✅ **resolved** — branch to `job`/`education`/`project`, not `twoline-item` |
| 2 | Multi-language | — | leaning separate documents; `sys.inputs` available either way |
| 3 | Multiple CVs vs one | M7 | open |
| 4 | Section labels free text or preset | M6 | ✅ **resolved** — free text |
| 5 | Compile-on-keystroke on mobile | M6 | **desktop resolved yes** (~8 ms round trip); phone untested |
