# [CV-Maker](https://mricarte-i.github.io/cv-maker/)

Running the Typst compiler in your browser via WASM to get you your CV.

Template: [silver-dev-cv](https://typst.app/universe/package/silver-dev-cv).

## WIP 

### Notes
- iOS home-screen PWA can't download PDFs due to Safari limitations. Use a desktop browser or the iOS Files app.

      typst_ts_web_compiler_bg.wasm   28,325 kB │ gzip: 10,947 kB
      typst_ts_renderer_bg.wasm          972 kB │ gzip:    360 kB
      index.js                           562 kB │ gzip:    177 kB
      precache: 12 entries (1,927 KiB)


### To Do
- [ ] Download artifacts (TYP, JSON, PDF) as a single ZIP file.
- [ ] Fix iOS PWA download issue (Safari limitation).
- [ ] Bundle size reduction: remove unused code, optimize WASM, etc.
- [ ] Add support for multiple CVs to be managed in the same instance (e.g., via tabs or a list, allowing to have multiple CVs open at once).
- [ ] i18n: add support for multiple languages (e.g., English, Spanish, etc.) and allow switching between them.


## Development

    pnpm install
    pnpm dev        # dev server
    pnpm build      # tsc -b && vite build
    pnpm lint       # oxlint
    pnpm preview    # serve the production build
    pnpm test       # run tests

## Credits and licensing

- **Template:** silver-dev-cv 1.0.2 by Gabriel Benmergui and Santiago Barraza,
  MIT. Vendored unmodified in `public/typst/`; see `public/typst/LICENSE`.
  Itself derived from [jxpeng98/Typst-CV-Resume](https://github.com/jxpeng98/Typst-CV-Resume), also MIT.
- **Fonts:** Libertinus Serif, © 2012–2024 The Libertinus Project Authors, under
  the SIL Open Font License 1.1. See `public/fonts/LICENSE`.
- **Compiler:** [typst.ts](https://github.com/Myriad-Dreamin/typst.ts) by
  Myriad-Dreamin, wrapping [Typst](https://typst.app).

CVs you generate are yours. OFL clause 5 exempts documents created with the
font, and the template's MIT terms don't reach the output.