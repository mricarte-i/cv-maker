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
import { Monitor, Moon, Plus, Sun } from "lucide-react";
import { StatusToast } from "./ui/StatusToast";
import { CompileErrorDialog } from "./ui/CompileErrorDialog";
import { cn } from "./lib/utils";
import { useTheme } from "./ui/theme";

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

const Rule = () => <div className="mx-1 h-4 w-px bg-border" />;

/** the secondary actions: same button, none of the shouting */
function Quiet({
  onClick,
  className,
  children,
}: {
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="xs"
      onClick={onClick}
      className={cn(
        "font-normal tracking-normal text-pencil normal-case",
        className,
      )}
    >
      {children}
    </Button>
  );
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

  const { theme, cycle } = useTheme();
  const ThemeIcon =
    theme === "system" ? Monitor : theme === "dark" ? Moon : Sun;

  return (
    <header className="flex h-11 shrink-0 items-center justify-between border-b px-4">
      <h1 className="font-serif text-base font-bold tracking-[0.14em] uppercase">
        cv-maker
      </h1>

      <div className="flex items-center gap-0.5">
        <Button size="xs" disabled={pdfBusy} onClick={onPdf}>
          {pdfBusy ? "compiling…" : "download pdf"}
        </Button>

        <Rule />

        <Quiet onClick={() => fileInput.current?.click()}>import</Quiet>
        <Quiet onClick={() => exportDocument(doc)}>export</Quiet>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={onPick}
        />

        <Rule />

        <Quiet
          onClick={() =>
            replace(sampleDocument, "Replace this CV with the sample?")
          }
        >
          sample
        </Quiet>
        <Quiet
          onClick={() =>
            replace(
              emptyDocument,
              "Discard this CV and start over? This cannot be undone.",
            )
          }
          className="hover:bg-destructive/10 hover:text-destructive"
        >
          reset
        </Quiet>

        <Rule />

        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Theme: ${theme}. Click to change.`}
          title={`theme: ${theme}`}
          onClick={cycle}
          className="text-pencil hover:text-foreground"
        >
          <ThemeIcon />
        </Button>
      </div>
    </header>
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
              <aside className="h-full space-y-4 overflow-y-auto py-4 pr-4 pl-8">
                <div className="grid gap-2">
                  {FIELDS.map((field) => (
                    <div key={field} className="grid gap-1 border p-2">
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

                <div className="space-y-2 border p-2">
                  <Label>Contacts</Label>
                  <ContactsEditor contacts={doc.contacts} />
                </div>

                <hr />

                <SortableList list={{ kind: "sections" }} items={doc.sections}>
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
