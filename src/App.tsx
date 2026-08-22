import { useReducer } from "react";
import contentEn from "../sample/content-en.json?raw";
import { parseDocument } from "./schema/parse";
import { emptyDocument } from "./schema/factory";
import type { CVDocument } from "./schema/cv";
import { reducer } from "./state/reducer";
import { useCompiledCV } from "./typst/useCompiledCV";
import { DispatchCtx } from "./ui/dispatch";
import { SectionEditor } from "./ui/SectionEditor";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";

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

const FIELDS = ["name", "address", "date"] as const;

function App() {
  const [doc, dispatch] = useReducer(reducer, undefined, initialDoc);
  const { svg, error, pending, ready } = useCompiledCV(doc);

  return (
    <DispatchCtx value={dispatch}>
      <div className="flex h-screen">
        <aside className="w-[28rem] shrink-0 space-y-4 overflow-auto border-r p-4">
          <div className="grid gap-2">
            {FIELDS.map((field) => (
              <div key={field} className="grid gap-1">
                <Label htmlFor={field} className="capitalize">
                  {field}
                </Label>
                <Input
                  id={field}
                  value={doc[field]}
                  onChange={(e) =>
                    dispatch({ type: "doc/set", field, value: e.target.value })
                  }
                />
              </div>
            ))}
          </div>

          <hr />

          {doc.sections.map((s, i) => (
            <SectionEditor
              key={s.id}
              section={s}
              index={i}
              length={doc.sections.length}
            />
          ))}

          <Button onClick={() => dispatch({ type: "section/add" })}>
            + section
          </Button>

          <p style={{ fontSize: 11, color: "#666" }}>
            {!ready
              ? "starting compiler…"
              : pending
                ? "compiling…"
                : "up to date"}
          </p>

          {error && (
            <pre
              style={{ fontSize: 11, color: "#b00", whiteSpace: "pre-wrap" }}
            >
              {error}
            </pre>
          )}
        </aside>
        <main className="bg-muted flex-1 overflow-auto p-6">
          <div
            style={{ flex: 1, overflow: "auto", background: "#eee" }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </main>
      </div>
    </DispatchCtx>
  );
}

export default App;
