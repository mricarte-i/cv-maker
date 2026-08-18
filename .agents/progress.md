# Progress

Companion to [plan.md](plan.md). The plan says *what* and *why*; this says
*what's done* and *what was measured*. Update as milestones close.

Last updated: 2026-08-18

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
- [ ] **`.gitignore` still ignores `.agents` wholesale** ([.gitignore:14](../.gitignore#L14)),
      so `plan.md` and this file are untracked. Carve out with `!.agents/*.md`.

## Milestone 2 — Spike ✅

All four gates pass. Spike code lives in `src/spike/` and is throwaway —
except `fixtures.ts`, whose adversarial `SAMPLE` is reusable for parity work.

| Gate | Result | Evidence |
|---|---|---|
| **A** — no third-party requests | ✅ | Network panel: every request `localhost:4173`. No jsdelivr. |
| **B** — SVG on screen | ✅ | Full CV renders; correct faces; `# [ ] * _ @ -` all inert. |
| **C** — fast, flat recompiles | ✅ | 50x in 0.4 s, no upward drift across iterations. |
| **D** — offline reload | ✅ | Offline + normal reload renders; WASM from `typst-wasm` CacheFirst cache. |

### Measurements

| Context | init | compile | render |
|---|---|---|---|
| dev, warm | 115-153 ms | 1-4 ms | 0-2 ms |
| `preview` (prod), warm | 183 ms | 2-4 ms | 0-2 ms |
| **cold - empty cache** | **not yet measured** | - | - |

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

## Milestone 4 — `cv.typ` adapter 🚧

`src/typst/cv.typ` — written and committed, **not yet verified.**

- [x] One generic loop over `t.sections` — any sections, any labels, any order
- [x] Entry branch on `variant` (see below)
- [x] Empty-field handling
- [ ] **Visual parity vs `sample/cv-en.pdf`** — needs a `content.json` built
      from `sample/content-en.typ`, then a page-by-page diff
- [ ] **Re-run the adversarial `SAMPLE`** through the new adapter (`render-blocks`
      is new code between the JSON and the template)

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

**plan.md section 3 still says to prefer `twoline-item` and needs correcting.**

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

---

## Milestone 5 — Compile layer

- [ ] Worker with one long-lived compiler + renderer (productionize the spike)
- [ ] Debounce ~250 ms + monotonic-id supersession
- [ ] `diagnostics: 'full'` surfaced; last good preview survives errors

## Milestone 6 — UI

- [ ] `useReducer` over `CvDocument`
- [ ] Six editors + registry
- [ ] `dnd-kit` reorder; stable ids

## Milestone 7 — Persistence

- [ ] Resolve: multiple CVs or one? (open Q3)
- [ ] IndexedDB + autosave + `navigator.storage.persist()`

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
| 4 | Section labels free text or preset | M6 | leaning preset + editable |
| 5 | Compile-on-keystroke on mobile | M6 | **desktop resolved yes** (~8 ms round trip); phone untested |
