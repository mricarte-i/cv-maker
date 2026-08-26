import type { DiagnosticsData } from "@myriaddreamin/typst.ts/compiler";

export type Diagnostic = DiagnosticsData["full"];

export type PdfResult =
  | { ok: true; pdf: Uint8Array<ArrayBuffer>; diagnostics: Diagnostic[] }
  | { ok: false; diagnostics: Diagnostic[]; error?: string };

export const compilePdf = (json: string) => call<PdfResult>("pdf", json);

export type CompileResult =
  | {
      ok: true;
      svg: string;
      diagnostics: Diagnostic[];
      compileMs: number;
      renderMs: number;
    }
  | { ok: false; diagnostics: Diagnostic[]; error?: string };

const worker = new Worker(new URL("./worker.ts", import.meta.url), {
  type: "module",
});

type Resolver = (r: never) => void;
let nextId = 0;
const pending = new Map<number, Resolver>();

worker.onmessage = (e: MessageEvent) => {
  const { id, ...rest } = e.data;
  pending.get(id)?.(rest as never);
  pending.delete(id);
};

// a worker crash must not leave callers hanging forever
worker.onerror = (e) => {
  for (const resolve of pending.values()) {
    resolve({ ok: false, diagnostics: [], error: e.message } as never);
  }
  pending.clear();
};

function call<T>(type: string, payload?: unknown): Promise<T> {
  const id = nextId++;
  return new Promise<T>((resolve) => {
    pending.set(id, resolve as Resolver);
    worker.postMessage({ id, type, payload });
  });
}

export const initCompiler = () => call<{ ok: boolean; initMs: number }>("init");
export const compileCv = (json: string) => call<CompileResult>("compile", json);
