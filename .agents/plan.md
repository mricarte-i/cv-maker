# Typst CV Editor — Build Plan

A React PWA that lets a user fill in structured CV data and get a live-previewed,
downloadable PDF, compiled entirely in the browser with the real Typst compiler.
Single fixed template: `silver-dev-cv` (MIT).

**Revision 3.** Every claim here is checked against the installed `typst.ts@0.7.0`
and the published `silver-dev-cv@1.0.2`, and revision 3 additionally reflects
what the spike actually proved. See §10 for what changed and why.

Status and measurements live in [progress.md](progress.md). This document is the
design contract — *what* and *why*. That one is *what's done*.

---

## 1. Core architectural decision

**The user never writes Typst.** App state is a plain TypeScript object, serialized
to `content.json` with `JSON.stringify`. A fixed `cv.typ` reads it with Typst's
native `json()` and renders it.

```
React form (useReducer over CvDocument)
      │
      ▼
JSON.stringify  ─────────────►  content.json  ─┐
src/typst/cv.typ (constant) ───────────────────┤
vendored silver-dev-cv.typ ────────────────────┼──► Web Worker
Libertinus Serif bytes ────────────────────────┘    (typst.ts compiler)
                                                          │
                                              vector IR   │  pdf
                                                          ▼
                                          typst.ts renderer → SVG
                                                          │
                                                          ▼
                                                    preview pane
      IndexedDB ◄── autosave (CvDocument as JSON)
```

Why this shape:

- `JSON.stringify` **is** the codegen. No hand-rolled Typst escaping, so no bugs
  from users typing `#`, `[`, `*`, `_`, `@`, or a leading `-`. Verified in the
  spike: all of those render inert.
- Markup is expressed as **structured data**, not markup inside strings. Every
  string stays inert plain text end to end.
- **Do not use Typst's `eval()`** to interpret user strings as markup. It reopens
  the injection hole and can hang the worker on a pathological input. If rich
  inline text is ever needed, parse it in TS into structured spans.

---

## 2. Data model

`src/schema/` — zod schemas with inferred types.

```ts
type Block =
  | { kind: "paragraph"; id: string; text: string }
  | { kind: "bullets";   id: string; items: string[] };

type EntryVariant = "job" | "project" | "education";

type Item =
  | { kind: "entry"; id: string; variant: EntryVariant;
      title: string; subtitle: string;
      date: string; location: string; body: Block[] }
  | { kind: "oneline"; id: string; title: string; content: string }
  | { kind: "prose";   id: string; body: Block[] };

type Section = { id: string; label: string; items: Item[] };

type CvDocument = {
  schemaVersion: number;
  name: string; address: string;
  date: string;            // ISO, shown as "last updated"
  contacts: { id: string; text: string; link: string }[];
  sections: Section[];
};
```

**Deliberate constraint:** three item kinds, two block kinds. That is everything
`silver-dev-cv` can render. Do not add arbitrary nesting or user-defined item
types — that turns this into a schema editor, which is where this kind of
project dies.

The `entry` field names are intentionally generic. `title`/`subtitle` mean
different things per variant; naming them `position`/`institution` would bake in
the `job` reading. See §3 for the mapping.

### Three validation layers, deliberately separate

| Layer | Where | Job |
|---|---|---|
| **Shape** | reducer | `items` is always an array of known kinds |
| **Trust** | `parseDocument()` | untrusted JSON really is a `CvDocument` |
| **Guidance** | React component | advisory hints, never blocking |

**Strict on shape, permissive on content.** No `.min(1)` on user-facing text — an
empty string is a valid intermediate state while typing, and a schema that
rejects it turns autosave into a trap. No `.url()` on contact links; `mailto:`,
bare domains, and half-typed input all have to survive.

Schemas are **not** `strictObject`. Unknown keys get stripped, so a document
written by a future version degrades instead of failing to load.

Stable ids on Section / Item / Block / Contact — needed as React keys and dnd
handles. Not on bullet strings: those get move up/down controls, where index
keys are safe. Making them draggable later is a `schemaVersion` bump, which is
what the field is for.

Entry dates stay free text (`"2021 - 2026"`, `"2021 - present"`). The template
just prints them; modelling them as ranges buys a date picker and loses
"present".

---

## 3. The Typst side

`src/typst/cv.typ` is a constant shipped with the app — a thin adapter mapping
the JSON onto silver-dev-cv's API. It is never edited by the user and never
generated; only `content.json` changes.

Not to be confused with `sample/cv.typ`, which is the hand-written original for
one specific CV. That one hardcodes the name, contacts, and section order, and
reads data from a Typst file. It is a **reference fixture**, not app code — its
output `sample/cv-en.pdf` is the parity target.

The template is a **single 6,415-byte file**, not a package directory. The
published package contains only `README.md`, `silver-dev-cv.typ`, `template/`,
`thumbnail.png`, `typst.toml`. Vendored at `public/typst/silver-dev-cv.typ`,
byte-identical, imported by relative path.

Verified names: `section(title)`, `sectionsep`,
`job(position:, institution:, location:, date:, description:)`,
`education(institution:, major:, date:, location:, description:)`,
`project(title:, description:, date:)`, `oneline-title-item(title:, content:)`,
`descript(content)`, `twoline-item(...)`, and
`cv(font-type:, continue-header:, name:, address:, lastupdated:, pagecount:, date:, contacts:, mainbody)`.
Also present and unused: `oneline-two`, `award`, `info`, `subsection`.

### The variant branch

The template renders four positioned slots plus a body:

```
┌──────────────────────────────────┐
│ top-left             top-right   │
│ bottom-left       bottom-right   │
│ description …                    │
└──────────────────────────────────┘
```

The same four schema fields land in different slots per variant:

| variant | top-left | top-right | bottom-left | bottom-right |
|---|---|---|---|---|
| `job` | title | location | subtitle | date |
| `education` | title, location | date | subtitle | — |
| `project` | title | date | — | — |

`date` moves between top-right and bottom-right. `location` is merged into the
title for education and dropped entirely for project.

**Call `job()` / `education()` / `project()` directly. Do not route through
`twoline-item`.** Revision 2 recommended that as a single codepath; it is wrong.
`twoline-item` only emits a line break inside its `entry2` and `entry4` branches,
so when `entry4` is absent the description runs on straight after the subtitle.
It is not a clean superset of the three functions, and they already encode the
correct breaks.

### Edge cases the adapter must handle

- **Dangling comma on education.** `education()` hardcodes `[#institution, #location]`,
  so a blank location renders `"Instituto Tecnológico de Buenos Aires, "`. The
  vendored file stays byte-identical, so `cv.typ` inlines the same layout —
  reusing the template's exported colour variables — when location is empty.
- **Empty contact links.** `display()` branches on `"link" in contact` and our
  JSON always has the key, so a blank link would emit `link("")`. Map the key
  away when empty.
- **`pagecount` is a dead parameter** — accepted by `cv()`, never referenced. No
  page numbers unless you add them yourself.
- `render-blocks` skips empty paragraphs and empty bullet lists. Consequence: a
  freshly added empty bullet shows nothing in the preview until a character is
  typed.

### Licensing

The published package **ships no LICENSE file**. `typst.toml` declares
`license = "MIT"`, `authors = "Gabriel Benmergui, Santiago Barraza"`. Its README
links to a LICENSE in `jxpeng98/Typst-CV-Resume` (© 2023 Academic Template
Collective) — a *different* project it derives from. Do not copy that link: MIT
requires the notice be included, a link is useless in the offline export zip,
and it misattributes the copyright.

- `public/typst/LICENSE` — MIT text, both copyright lines, derivation noted.
- Do not strip lines 1–10 of `silver-dev-cv.typ`; that header is a preserved
  copyright notice.
- `public/fonts/LICENSE` — Libertinus is **OFL 1.1**, a separate obligation.
  Reserved Font Names are "Linux Libertine", "Biolinum", "STIX Fonts" —
  "Libertinus" is *not* reserved, so the filenames and `"Libertinus Serif"` are
  unrestricted. Serving the `.otf` files is redistribution under clause 2, so the
  license ships with the app. Clause 5 exempts documents made with the font, so
  **generated PDFs carry no OFL obligation**.

---

## 4. Compilation layer

Three packages, all self-hosted:

| package | role |
|---|---|
| `@myriaddreamin/typst.ts` | JS API |
| `@myriaddreamin/typst-ts-web-compiler` | compiler WASM (**28 MB raw**) |
| `@myriaddreamin/typst-ts-renderer` | renderer WASM — **required for SVG** |

**The compiler cannot emit SVG.** `CompileFormatEnum` is `{ vector, pdf }`;
`vector` is typst.ts's internal IR. Preview is
`compile({format: vector}) → renderer.renderSvg() → string`. PDF comes straight
from the compiler and needs no renderer.

Load both WASM blobs as Vite URL imports so they get content-hashed filenames:

```ts
import compilerWasm from '@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url';
import rendererWasm from '@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm?url';
```

### Three gotchas that cost real time in the spike

1. **`loadFonts(urls)` without an options object still fetches from jsdelivr.**
   The driver checks `fn._preloadRemoteFontOptions !== undefined` and appends its
   own asset loader when unset. Use `loadFonts(fonts, { assets: false })`.
   (`disableDefaultFontAssets()` is literally `loadFonts([], { assets: false })`.)
2. **`format` must be `CompileFormatEnum`, not the string.** `compile()` forwards
   to `world.get_artifact(fmt: number, …)`; `'vector'` is truthy and would pass a
   string. Not re-exported from the index — import from the `/compiler` subpath.
3. **typst.ts never checks `res.ok` when fetching fonts** (`init.mjs:44`). A 404
   feeds an HTML error page to `add_raw_font`, which fails silently: layout rules
   draw, glyphs don't. **Fetch fonts yourself and pass `Uint8Array`.**

### Other constraints

- Run it in a **Web Worker**. One long-lived compiler instance; init is expensive
  and must not repeat per keystroke.
- VFS: `addSource(path, string)` for `.typ`, `mapShadow(path, Uint8Array)` for
  bytes. `cv.typ` and `silver-dev-cv.typ` go in once at init. `content.json` is
  bytes — `mapShadow('/content.json', encoder.encode(json))`.
- **Never call `compiler.reset()` between compiles.** It drops loaded fonts and
  cached source modules — a full re-init wearing a cheap-looking name, and
  tempting to reach for after a failed compile.
- Pass `diagnostics: 'full'` for structured
  `{package, path, severity, range, message}` objects. Surface them; a failure
  shows the error and keeps the last good preview rather than blanking it.
  Surface *warnings* too — that is how a missing font announces itself.
- Debounce ~250 ms and **supersede in-flight compiles** with a monotonic id.
  Note the worker cannot truly abort a running WASM compile — there is no
  cancellation point — so supersession discards results rather than saving CPU.
  That is why the debounce stays.
- `sys.inputs` is available via `compile({ inputs })`. It persists across compiles
  when passed `undefined`, so pass it explicitly or never.

### Fonts

**There are no system fonts under WASM.** Only fonts explicitly loaded exist.
Typst's embedded defaults are Libertinus Serif, New Computer Modern (+ Math), and
DejaVu Sans Mono — so Libertinus Serif is the default and nothing exotic is
needed. Disabling default assets also drops DejaVu Sans Mono: harmless today,
relevant the day a monospace block kind is added.

- Ship `.ttf` / `.otf` only. Typst does not read woff/woff2. Serve with brotli.
- Do not subset — arbitrary user text, accents, em dashes, ampersands.
- The four Libertinus faces total 1.17 MB.
- **Fonts can be swapped after init.** `createTypstFontBuilder()` → build a
  resolver → `compiler.setFonts(resolver)`. No teardown. A font picker is
  therefore cheap.

---

## 5. UI

Schema-driven with a registry. Six components — **not one per section**.

| Component | Responsibility |
|---|---|
| `SectionList` | add / remove / rename / reorder sections |
| `ItemList` | add / remove / reorder items; dispatches via registry |
| `EntryEditor` | variant + title, subtitle, date, location + `BlockEditor[]` |
| `OnelineEditor` | title + content |
| `ProseEditor` | `BlockEditor[]` |
| `BlockEditor` | the paragraph ⇄ bullets toggle; reused everywhere |

```ts
const ITEM_EDITORS = { entry: EntryEditor, oneline: OnelineEditor, prose: ProseEditor } as const;
```

Resist a fully generic form renderer. Six concrete components beat one clever one.

### State: a reducer, not a form library

**There is no submit and no server.** Form state *is* the document; every
keystroke goes into `CvDocument` and straight to the compiler. Form libraries
exist to manage the gap between form state and submitted values — dirty/touched
tracking, validation timing, submit lifecycle — and this app has none of that gap.

One `useReducer` over `CvDocument` with `updateField` / `addItem` / `removeItem` /
`moveItem` / `addSection`, and zod at the boundary per §2.

A generic form library also fights the discriminated union — inference on
`sections[0].items[1]` is awkward for all of them, while the registry hands a
*concrete* item to a *concrete* editor and sidesteps it. Same instinct as
"resist a generic form renderer", one layer down.

Re-render cost of a single top-level reducer is the one real objection. At
~30–50 inputs it is a non-issue; optimize only if a profiler says so.

`dnd-kit` for reordering — genuinely fiddly, worth the dependency.

---

## 6. PWA

- **Self-host the WASM and fonts.** No jsdelivr. See §4 gotcha 1 — that is the
  one that fails silently.
- **WASM is runtime-cached (`CacheFirst`), not precached.** A 30 MB precache
  manifest gates service-worker activation and forces the whole download before
  the app is usable offline. Since compiler init runs on mount, the WASM is
  fetched on first page load anyway, so `CacheFirst` populates at effectively the
  same moment while keeping SW install at ~1.5 MB. `maxEntries: 4` evicts stale
  content-hashed blobs on upgrade; `cacheableResponse` keeps a response from
  being silently skipped.

```ts
workbox: {
  globPatterns: ["**/*.{js,css,html,typ,otf,svg}"],   // shell + fonts
  maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
  runtimeCaching: [{
    urlPattern: /\.wasm$/,
    handler: "CacheFirst",
    options: {
      cacheName: "typst-wasm",
      expiration: { maxEntries: 4 },
      cacheableResponse: { statuses: [0, 200] },
    },
  }],
}
```

- Serve WASM as `application/wasm`, and make sure the cached response preserves
  the content type or `instantiateStreaming` fails.
- **No COOP/COEP needed** — single-threaded compiler, skip cross-origin isolation.
- IndexedDB for documents. Call `navigator.storage.persist()`.
- Lazy-init the compiler after first paint.
- iOS: blob downloads inside a standalone PWA are unreliable. Fall back to a new
  tab or the Web Share API.
- Add an update prompt. A stale SW pinning an old compiler against new codegen
  output is a nasty bug class.
- Manifest still needs icons — 192, 512, maskable.

**Testing offline:** the SW must install *while online* first, and **Ctrl+F5
bypasses the service worker** — use a normal reload.

**Open for release:** ~11 MB gzipped on first visit is rough on mobile data.
Brotli takes it to ~8 MB. Revisit before shipping.

---

## 7. Export artifact

```
cv.typ
content.json
silver-dev-cv.typ
LICENSE                    (MIT, per §3)
README.md                  (one line: the compile command)
```

**No font files needed.** The Typst CLI embeds Libertinus Serif as a built-in
default, so this compiles on a bare machine and the zip carries no OFL
obligation. Because the template imports by relative path rather than `@preview`,
it works fully offline.

Also offer a bare `content.json` export/import for round-tripping data.

---

## 8. Milestones

Moved to [progress.md](progress.md) so there is one place to update, not two.

---

## 9. Open questions

| # | Question | Blocks | Status |
|---|---|---|---|
| 1 | `entry.variant` rendering | M4 | ✅ resolved — see §3 |
| 2 | Multi-language: one doc per language, or per-field translations? | — | Separate documents; `sys.inputs` available either way |
| 3 | Multiple saved CVs vs a single document | M7 | open |
| 4 | Section labels free text, or preset per language? | M6 | preset but editable |
| 5 | Compile-on-keystroke on mobile | M6 | desktop resolved yes (~8 ms); phone untested |

Photo/avatar is settled: `silver-dev-cv` has no slot for one. Skip.

---

## 10. What changed in revision 3

1. **§3 reverses the `twoline-item` recommendation.** It drops the line break when
   `entry4` is absent, so it is not a superset of `job`/`education`/`project`.
   Call the three functions directly. This closed open question 1.
2. **§6 reverses precache → runtime `CacheFirst` for WASM.** Revision 2's reason
   for rejecting runtime caching ("first load must be online") is equally true of
   precaching, so it never distinguished them. What does distinguish them is a
   30 MB precache manifest blocking SW activation.
3. **§3 documents two adapter edge cases** found while writing it — education's
   hardcoded comma and empty contact links.
4. **§4 records three typst.ts gotchas** confirmed from source during the spike.
5. **§2 adds the three-validation-layer split** and the "strict on shape,
   permissive on content" principle.
6. **§8 milestones moved to progress.md**, so status lives in exactly one file.
7. **§3 distinguishes `src/typst/cv.typ` from `sample/cv.typ`** — app template vs
   reference fixture.

### Revision 2 (kept for context)

Corrected revision 1 on: `entry` needing a `variant`; SVG requiring the renderer
package; fonts being swappable after init; `disableDefaultFontAssets()`; the WASM
being 28 MB; `mapShadow` vs `addSource`; dropping the form library for a reducer;
the missing template LICENSE and separate OFL obligation; the export zip needing
no fonts; and the already-broken workbox config.
