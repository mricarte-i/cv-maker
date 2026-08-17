import { useEffect, useRef, useState } from "react";
import "./App.css";
import { SAMPLE } from "./spike/fixtures";
import { compileCv, initCompiler } from "./spike/client";

function App() {
  const [svg, setSvg] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const seq = useRef(0);
  const say = (s: string) => setLog((prev) => [...prev, s]);

  useEffect(() => {
    initCompiler().then((r) => say(`init ${r.initMs?.toFixed(0)}ms`));
  }, []);

  async function run(label: string) {
    const id = ++seq.current;
    const doc = { ...SAMPLE, name: `${SAMPLE.name} ${label}` };
    const r = await compileCv(JSON.stringify(doc));
    if (id !== seq.current) {
      return;
    }
    if (r.ok) {
      setSvg(r.svg);
      say(
        `compile ${r.compileMs.toFixed(0)} + render ${r.renderMs.toFixed(0)}ms`,
      );
      if (r.diagnostics?.length) {
        say(` warn: ${JSON.stringify(r.diagnostics)}`);
      }
    } else {
      say(`ERROR ${JSON.stringify(r.diagnostics ?? r.error)}`);
    }
  }

  async function perfTest() {
    // if we can compile 50 times very quickly, maybe we can
    // hot compile CVs??
    const t0 = performance.now();
    for (let i = 0; i < 50; i++) {
      await run(`#${i}`);
    }
    say(`50x in ${((performance.now() - t0) / 1000).toFixed(1)}s`);
  }

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "monospace" }}>
      <div
        style={{
          width: 340,
          overflow: "auto",
          padding: 12,
          borderRight: "1px solid #ccc",
        }}
      >
        <button onClick={() => run("once")}>compile</button>
        <button onClick={perfTest}>50x</button>
        <pre style={{ fontSize: 11, whiteSpace: "pre-wrap" }}>
          {log.join("\n")}
        </pre>
      </div>
      <div
        style={{ flex: 1, overflow: "auto", background: "#eee" }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}

export default App;
