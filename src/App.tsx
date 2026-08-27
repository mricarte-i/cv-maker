import { useReducer, useRef, useState } from "react";
import { useDefaultLayout } from "react-resizable-panels";
import contentEn from "../sample/content-en.json?raw";
import { parseDocument } from "./schema/parse";
import { emptyDocument } from "./schema/factory";
import type { CVDocument } from "./schema/cv";
import { useAutosave, useStoredDocument } from "./state/persist";
import { reducer, type Action } from "./state/reducer";
import { downloadPdf, exportDocument, importDocument } from "./state/transfer";
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
import { Plus } from "lucide-react";
import { StatusToast } from "./ui/StatusToast";
import { CompileErrorDialog } from "./ui/CompileErrorDialog";

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

function EditorTopbar({
  doc,
  dispatch,
}: {
  doc: CVDocument;
  dispatch: React.ActionDispatch<[a: Action]>;
}) {
  const replace = (make: () => CVDocument, prompt: string) => {
    if (window.confirm(prompt)) {
      dispatch({ type: "doc/replace", doc: make() });
    }
  };

  const fileInput = useRef<HTMLInputElement>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
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
  const onPdf = async () => {
    setPdfBusy(true);
    const err = await downloadPdf(doc);
    setPdfBusy(false);
    if (err) {
      window.alert(`Could not download PDF.\n\n${err}`);
    }
  };

  return (
    <div className="flex shrink-0 items-center justify-between p-4">
      <h1 className="text-sm font-medium">cv-maker</h1>
      <div className="flex gap-1">
        <Button variant="outline" size="xs" disabled={pdfBusy} onClick={onPdf}>
          {pdfBusy ? "…" : "pdf"}
        </Button>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => fileInput.current?.click()}
        >
          import
        </Button>
        <Button variant="ghost" size="xs" onClick={() => exportDocument(doc)}>
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
  );
}

/** mounts once the stored document has been read, so `initial` never changes */
function Editor({ initial }: { initial: CVDocument }) {
  const [doc, dispatch] = useReducer(reducer, initial);
  const save = useAutosave(doc);
  const { svg, error, pending, ready } = useCompiledCV(doc);
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "cv-maker-panels",
    storage: window.localStorage,
  });
  const status = !ready
    ? { label: "Starting compiler…", settled: false }
    : pending
      ? { label: "Compiling…", settled: false }
      : save === "failed"
        ? { label: "Could not save", settled: false }
        : save === "saving"
          ? { label: "Saving…", settled: false }
          : { label: "Saved", settled: true };

  return (
    <DispatchCtx value={dispatch}>
      <div className="flex h-full flex-col">
        <EditorTopbar doc={doc} dispatch={dispatch} />
        <ResizablePanelGroup
          orientation="horizontal"
          defaultLayout={defaultLayout}
          onLayoutChanged={onLayoutChanged}
          className="min-h-0 flex-1"
        >
          <ResizablePanel id="editor" defaultSize="50" minSize="25">
            <div className="relative h-full">
              <aside className="h-full space-y-4 overflow-y-auto p-4">
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
              </aside>

              <Button
                size="icon"
                aria-label="add section"
                onClick={() => dispatch({ type: "section/add" })}
                className="absolute bottom-4 right-4 rounded-full shadow-lg"
              >
                <Plus />
              </Button>

              <StatusToast {...status} />
              <CompileErrorDialog error={error} />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel id="preview" defaultSize="50" minSize="16">
            <Preview svg={svg} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </DispatchCtx>
  );
}

export default App;
