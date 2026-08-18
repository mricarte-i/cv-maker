import { useReducer } from "react";
import "./App.css";
import contentEn from "../sample/content-en.json?raw";
import { parseDocument } from "./schema/parse";
import { emptyDocument } from "./schema/factory";
import type { CVDocument } from "./schema/cv";
import { reducer } from "./state/reducer";
import { useCompiledCV } from "./typst/useCompiledCV";

// temporary: seed from the parity fixture so there is something to look at
// before the editors exist. Swap for emptyDocument() once M7 loads from storage.
function initialDoc(): CVDocument {
  const r = parseDocument(JSON.parse(contentEn));
  if (!r.ok) {
    console.error(r.error);
    return emptyDocument();
  }
  return r.doc;
}

function App() {
  const [doc, dispatch] = useReducer(reducer, undefined, initialDoc);
  const { svg, error, pending, ready } = useCompiledCV(doc);

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif" }}>
      <div
        style={{
          width: 340,
          padding: 12,
          borderRight: "1px solid #ccc",
          overflow: "auto",
        }}
      >
        <label>
          Name{" "}
          <input
            value={doc.name}
            onChange={(e) =>
              dispatch({
                type: "doc/set",
                field: "name",
                value: e.target.value,
              })
            }
          />
        </label>

        <p style={{ fontSize: 11, color: "#666" }}>
          {!ready
            ? "starting compiler…"
            : pending
              ? "compiling…"
              : "up to date"}
        </p>

        {error && (
          <pre style={{ fontSize: 11, color: "#b00", whiteSpace: "pre-wrap" }}>
            {error}
          </pre>
        )}
      </div>

      <div
        style={{ flex: 1, overflow: "auto", background: "#eee" }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}

export default App;
