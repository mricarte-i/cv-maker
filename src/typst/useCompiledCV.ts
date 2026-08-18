import { useEffect, useMemo, useRef, useState } from "react";
import type { CVDocument } from "../schema/cv";
import { compileCv, initCompiler, type Diagnostic } from "./client";

const DEBOUNCE_MS = 200;

export type CompileState = {
  svg: string; // last good render; "" until the first success
  diagnostics: Diagnostic[];
  error: string | null; // set when the *latest* compile failed
  pending: boolean;
  ready: boolean; // compiler initialised
};

export function useCompiledCV(doc: CVDocument): CompileState {
  const [state, setState] = useState<CompileState>({
    svg: "",
    diagnostics: [],
    error: null,
    pending: true,
    ready: false,
  });
  const seq = useRef(0);

  useEffect(() => {
    initCompiler().then(() => setState((s) => ({ ...s, ready: true })));
  }, []);

  const json = useMemo(() => JSON.stringify(doc), [doc]);

  useEffect(() => {
    setState((s) => ({ ...s, pending: true }));

    const timer = setTimeout(async () => {
      const id = ++seq.current;
      const r = await compileCv(json);
      if (id !== seq.current) {
        return; // superseded by a newer keystroke
      }

      setState((s) => ({
        ready: true,
        pending: false,
        diagnostics: r.diagnostics,
        svg: r.ok ? r.svg : s.svg, // keep last good
        error: r.ok ? null : (r.error ?? "compile failed"),
      }));
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [json]);

  return state;
}
