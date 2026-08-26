import { useReducer, useRef } from "react";
import { useDefaultLayout } from "react-resizable-panels";

import contentEn from "../sample/content-en.json?raw";
import { parseDocument } from "./schema/parse";
import { emptyDocument } from "./schema/factory";
import type { CVDocument } from "./schema/cv";
import { useAutosave, useStoredDocument } from "./state/persist";
import { reducer } from "./state/reducer";
import { exportDocument, importDocument } from "./state/transfer";
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
import { Preview } from "./ui/Preview";
import { SortableList } from "./ui/Sortable";

const FIELDS = ["name", "address", "date"] as const;

/** the seed fixture is no longer the boot default — it is reachable on demand */
function sampleDocument(): CVDocument {
  const r = parseDocument(JSON.parse(contentEn));
  if (!r.ok) {
    console.warn(`sample document rejected:\n${r.error}`);
    return emptyDocument();
  }
  return r.doc;
}

function App() {
  const initial = useStoredDocument();

  if (!initial) {
    return (
      <div className="grid h-screen place-items-center text-sm text-muted-foreground">
        loading…
      </div>
    );
  }
  return <Editor initial={initial} />;
}

/** mounts once the stored document has been read, so `initial` never changes */
function Editor({ initial }: { initial: CVDocument }) {
  const [doc, dispatch] = useReducer(reducer, initial);
  useAutosave(doc);
  const { svg, error, pending, ready } = useCompiledCV(doc);
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "cv-maker-panels",
    storage: window.localStorage,
  });

  const replace = (make: () => CVDocument, prompt: string) => {
    if (window.confirm(prompt)) {
      dispatch({ type: "doc/replace", doc: make() });
    }
  };

  const fileInput = useRef<HTMLInputElement>(null);
  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // so re-picking the same file fires change again
    if (!file) {
      return;
    }

    const r = await importDocument(file);
    if (!r.ok) {
      window.alert(`Could not import that file.\n\n${r.error}`);
      return;
    }
    if (window.confirm("Replace this CV with the imported one?")) {
      dispatch({ type: "doc/replace", doc: r.doc });
    }
  };

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
            <div className="flex items-center justify-between">
              <h1 className="text-sm font-medium">cv-maker</h1>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => fileInput.current?.click()}
                >
                  import
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => exportDocument(doc)}
                >
                  export
                </Button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={onPick}
                />
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() =>
                    replace(sampleDocument, "Replace this CV with the sample?")
                  }
                >
                  sample
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() =>
                    replace(
                      emptyDocument,
                      "Discard this CV and start over? This cannot be undone.",
                    )
                  }
                >
                  reset
                </Button>
              </div>
            </div>

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

            <SortableList
              list={{ kind: "sections" }}
              items={doc.sections}
              className="space-y-4"
            >
              {(s, i) => <SectionEditor section={s} index={i} />}
            </SortableList>

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
          <Preview svg={svg} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </DispatchCtx>
  );
}

export default App;
