/// <reference lib="webworker" />
import {
  createTypstCompiler,
  createTypstRenderer,
  loadFonts,
} from "@myriaddreamin/typst.ts";
import { CompileFormatEnum } from "@myriaddreamin/typst.ts/compiler";

import compilerWasm from "@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url";
import rendererWasm from "@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm?url";
import cvTyp from "./cv.typ?raw";

const FONTS = [
  "/fonts/LibertinusSerif-Regular.otf",
  "/fonts/LibertinusSerif-Bold.otf",
  "/fonts/LibertinusSerif-BoldItalic.otf",
  "/fonts/LibertinusSerif-Italic.otf",
];

const enc = new TextEncoder();
let compiler: ReturnType<typeof createTypstCompiler>;
let renderer: ReturnType<typeof createTypstRenderer>;

async function init() {
  const t0 = performance.now();
  const template = await fetch("/typst/silver-dev-cv.typ").then((r) =>
    r.text(),
  );

  compiler = await createTypstCompiler();
  renderer = await createTypstRenderer();

  await Promise.all([
    compiler.init({
      getModule: () => compilerWasm,
      beforeBuild: [loadFonts(FONTS, { assets: false })],
    }),
    renderer.init({ getModule: () => rendererWasm }),
  ]);

  compiler.addSource("/silver-dev-cv.typ", template);
  compiler.addSource("/cv.typ", cvTyp);

  return performance.now() - t0;
}

async function compile(json: string) {
  compiler.mapShadow("/content.json", enc.encode(json));

  const t0 = performance.now();
  const { result, diagnostics } = await compiler.compile({
    mainFilePath: "/cv.typ",
    format: CompileFormatEnum.vector,
    diagnostics: "full",
  });
  const compileMs = performance.now() - t0;
  if (!result) {
    return {
      ok: false as const,
      diagnostics: diagnostics ?? [],
      compileMs,
      renderMs: 0,
    };
  }

  const t1 = performance.now();
  const svg = await renderer.renderSvg({
    format: "vector",
    artifactContent: result,
  });

  return {
    ok: true as const,
    diagnostics: diagnostics ?? [],
    compileMs,
    renderMs: performance.now() - t1,
    svg,
  };
}

let ready: Promise<number> | null = null;
self.onmessage = async (e: MessageEvent) => {
  const { id, type, payload } = e.data;
  try {
    if (type === "init") {
      self.postMessage({ id, ok: true, initMs: await (ready ??= init()) });
    } else if (type === "compile") {
      await (ready ??= init());
      self.postMessage({ id, ...(await compile(payload)) });
    }
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err) });
  }
};
