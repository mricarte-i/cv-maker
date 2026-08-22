import { useReducer } from "react";
import { useDefaultLayout } from "react-resizable-panels";

import contentEn from "../sample/content-en.json?raw";
import { parseDocument } from "./schema/parse";
import { emptyDocument } from "./schema/factory";
import type { CVDocument } from "./schema/cv";
import { loadDoc, useAutosave } from "./state/persist";
import { reducer } from "./state/reducer";
import { useCompiledCV } from "./typst/useCompiledCV";
import { DispatchCtx } from "./ui/dispatch";
import { SectionEditor } from "./ui/SectionEditor";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "./components/ui/resizable";
import { ContactsEditor } from "./ui/ContactsEditor";

function initialDoc(): CVDocument {
  const saved = loadDoc();
  if (saved) {
    return saved;
  }

  // fallback on no saved document
  const r = parseDocument(JSON.parse(contentEn));
  if (!r.ok) {
    console.warn(`sample document rejected:\n${r.error}`);
    return emptyDocument();
  }
  return r.doc;
}

const FIELDS = ["name", "address", "date"] as const;

function App() {
  const [doc, dispatch] = useReducer(reducer, undefined, initialDoc);
  useAutosave(doc);
  const { svg, error, pending, ready } = useCompiledCV(doc);
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "cv-maker-panels",
    storage: window.localStorage,
  });

  return (
    <DispatchCtx value={dispatch}>
      <ResizablePanelGroup
        orientation="horizontal"
        defaultLayout={defaultLayout}
        onLayoutChanged={onLayoutChanged}
        className="h-screen"
      >
        <ResizablePanel id="editor" defaultSize="50" minSize="25">
          <aside className="min-h-full space-y-4 p-4">
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
                      dispatch({
                        type: "doc/set",
                        field,
                        value: e.target.value,
                      })
                    }
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Contacts</Label>
              <ContactsEditor contacts={doc.contacts} />
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
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel id="preview" defaultSize="50" minSize="16">
          <main className="bg-muted min-h-full p-6">
            <div
              className="mx-auto w-fit bg-white shadow-lg"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </main>
        </ResizablePanel>
      </ResizablePanelGroup>
    </DispatchCtx>
  );
}

export default App;
