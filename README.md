# cv-maker

Running the Typst compiler in your browser via WASM to get you your CV.

Template: [silver-dev-cv](https://typst.app/universe/package/silver-dev-cv).

## Development

    pnpm install
    pnpm dev        # dev server
    pnpm build      # tsc -b && vite build
    pnpm lint       # oxlint
    pnpm preview    # serve the production build

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