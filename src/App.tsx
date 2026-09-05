import {
  Download,
  FileText,
  LoaderCircle,
  Monitor,
  Moon,
  MoreHorizontal,
  PenLine,
  Plus,
  Redo2,
  Sun,
  Undo2,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useDefaultLayout } from "react-resizable-panels";
import contentEn from "../sample/content-en.json?raw";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "./components/ui/resizable";
import { cn } from "./lib/utils";
import type { CVDocument } from "./schema/cv";
import { emptyDocument } from "./schema/factory";
import { parseDocument } from "./schema/parse";
import { useHistory } from "./state/history";
import type { CVRecord } from "./state/library";
import {
  newRecord,
  saveRecord,
  setCurrentId,
  useAutosave,
  useBoot,
} from "./state/persist";
import { type Action } from "./state/reducer";
import { downloadPdf, exportDocument, importDocument } from "./state/transfer";
import { useCompiledCV } from "./typst/useCompiledCV";
import { AboutDialog } from "./ui/AboutDialog";
import { CompileErrorDialog } from "./ui/CompileErrorDialog";
import { ContactsEditor } from "./ui/ContactsEditor";
import { CVList } from "./ui/CVList";
import { DispatchCtx, useDispatch } from "./ui/dispatch";
import {
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuSeparator,
  MenuTrigger,
} from "./ui/Menu";
import { Preview } from "./ui/Preview";
import { Rail, SLOTS } from "./ui/Row";
import { SectionEditor } from "./ui/SectionEditor";
import { SortableList } from "./ui/Sortable";
import { StatusToast } from "./ui/StatusToast";
import { useTheme } from "./ui/theme";

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
  const { record, setRecord, loading } = useBoot();

  const switchTo = (r: CVRecord | null) => {
    if (r) {
      void setCurrentId(r.id).catch(() => {});
    }
    setRecord(r);
  };

  if (loading) {
    return (
      <div className="grid h-screen place-items-center text-sm text-muted-foreground">
        loading…
      </div>
    );
  }

  if (!record) {
    return <Welcome onPick={switchTo} />;
  }

  return <Editor key={record.id} record={record} onSwitch={switchTo} />;
}

/** no CV open — the way VS Code sits on a window with no folder */
/** no CV open. the way VS Code sits on a window with no folder: what this is,
    and everything you can open, on one screen */
function Welcome({ onPick }: { onPick: (r: CVRecord | null) => void }) {
  const startSample = () => {
    const r = { ...newRecord("Sample CV"), doc: sampleDocument() };
    void saveRecord(r).catch(() => {}); // in memory if storage is blocked
    onPick(r);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto grid max-w-4xl gap-10 px-6 py-16 md:grid-cols-2 md:items-start md:gap-16">
        <section className="order-2 space-y-5 md:order-1">
          {/* set in the face the PDF prints in — the wordmark is the sample */}
          <h1 className="font-serif text-5xl leading-none tracking-tight sm:text-6xl">
            CV Maker
          </h1>
          <p className="text-pencil max-w-[38ch] font-serif text-lg leading-relaxed">
            Write a CV in your browser. typst.ts compiles it to PDF on your
            machine + you can install it as a PWA!
          </p>
          <p className="text-pencil max-w-[38ch] font-serif text-lg leading-relaxed">
            CVs you generate are yours. CV compilation and PDF generation is all
            done on your machine, so no data leaves your device.
          </p>
          <Button size="xs" variant="ghost" onClick={startSample}>
            Start from the sample
          </Button>
        </section>

        <section className="order-1 space-y-3 md:order-2">
          <h2 className="border-rule/40 border-b pb-2 text-sm tracking-widest uppercase">
            Your CVs
          </h2>
          <CVList currentId={null} onPick={onPick} />
        </section>
      </div>
    </div>
  );
}

type Tab = "write" | "preview";

/** one pane at a time below md — two 195px columns is not an editor */
function useMediaQuery(query: string) {
  const media = useMemo(() => window.matchMedia(query), [query]);
  return useSyncExternalStore(
    (onChange) => {
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => media.matches,
  );
}

const TABS = { write: PenLine, preview: FileText } as const;

function TabSwitch({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div className="border-border flex shrink-0 overflow-hidden rounded-sm border md:hidden">
      {(["write", "preview"] as const).map((t) => {
        const Icon = TABS[t];
        return (
          <button
            key={t}
            type="button"
            aria-pressed={tab === t}
            aria-label={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 text-xs tracking-wide capitalize transition-colors",
              tab === t
                ? "bg-primary text-primary-foreground"
                : "text-pencil hover:bg-muted",
            )}
          >
            <Icon className="size-3.5" />
            {/* the tab you are on says its name; the other is just its mark */}
            {tab === t && t}
          </button>
        );
      })}
    </div>
  );
}

function EditorTopbar({
  doc,
  dispatch,
  tab,
  setTab,
  undo,
  redo,
  canUndo,
  canRedo,
  onCloseCV,
}: {
  doc: CVDocument;
  dispatch: React.ActionDispatch<[a: Action]>;
  tab: Tab;
  setTab: (t: Tab) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onCloseCV: () => void;
}) {
  const [about, setAbout] = useState(false);
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
    <header className="flex h-11 shrink-0 items-center gap-2 border-b px-3 md:px-4">
      <h1 className="hidden font-serif text-base font-bold tracking-[0.14em] uppercase sm:block">
        cv-maker
      </h1>

      <TabSwitch tab={tab} setTab={setTab} />

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Undo"
          aria-keyshortcuts="Control+Z Meta+Z"
          disabled={!canUndo}
          onClick={undo}
          className="text-pencil hover:text-foreground"
        >
          <Undo2 />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Redo"
          aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z"
          disabled={!canRedo}
          onClick={redo}
          className="text-pencil hover:text-foreground"
        >
          <Redo2 />
        </Button>

        <Button
          size="xs"
          disabled={pdfBusy}
          onClick={onPdf}
          aria-label={pdfBusy ? "Compiling PDF" : "Download PDF"}
          className="max-md:size-7 max-md:px-0"
        >
          {pdfBusy ? (
            <LoaderCircle className="animate-spin md:hidden" />
          ) : (
            <Download className="md:hidden" />
          )}
          <span className="max-md:hidden">
            {pdfBusy ? "compiling…" : "download pdf"}
          </span>
        </Button>

        <MenuRoot>
          <MenuTrigger
            aria-label="more actions"
            className="text-pencil hover:bg-muted hover:text-foreground data-popup-open:bg-muted flex size-7 shrink-0 items-center justify-center rounded-sm transition-colors"
          >
            <MoreHorizontal className="size-3.5" />
          </MenuTrigger>
          <MenuContent align="end">
            <MenuItem onClick={() => fileInput.current?.click()}>
              Import content.json
            </MenuItem>
            <MenuItem onClick={() => exportDocument(doc)}>
              Export content.json
            </MenuItem>

            <MenuSeparator />
            <MenuItem onClick={onCloseCV}>My CVs</MenuItem>
            <MenuSeparator />
            <MenuItem onClick={() => setAbout(true)}>About</MenuItem>
          </MenuContent>
        </MenuRoot>

        <AboutDialog open={about} onOpenChange={setAbout} />

        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={onPick}
        />

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

function EditorPane({ doc }: { doc: CVDocument }) {
  const dispatch = useDispatch();

  return (
    <div className="relative h-full">
      <aside className="h-full space-y-4 overflow-y-auto py-4 pr-4 pl-8">
        <div className="@container">
          <Input
            placeholder="your name"
            className="h-8 border-b-transparent font-serif text-xl font-bold md:text-xl"
            value={doc.name}
            onChange={(e) =>
              dispatch({
                type: "doc/set",
                field: "name",
                value: e.target.value,
              })
            }
          />
          <div className={SLOTS}>
            <Input
              placeholder="city, country"
              className="h-7 border-b-transparent text-sm"
              value={doc.address}
              onChange={(e) =>
                dispatch({
                  type: "doc/set",
                  field: "address",
                  value: e.target.value,
                })
              }
            />
            <div className="flex shrink-0 items-baseline gap-2">
              <span className="text-pencil shrink-0 text-xs">last updated</span>
              <Input
                placeholder="2026-01-31"
                className="text-pencil h-7 w-28 shrink-0 border-b-transparent text-right text-sm"
                value={doc.date}
                onChange={(e) =>
                  dispatch({
                    type: "doc/set",
                    field: "date",
                    value: e.target.value,
                  })
                }
              />
            </div>
          </div>
        </div>

        <div>
          <div className="border-rule border-b pb-0.5 pl-5">
            <span className="font-serif text-[15px] font-bold tracking-[0.06em] uppercase">
              Contacts
            </span>
          </div>
          <Rail className="mt-1">
            <ContactsEditor contacts={doc.contacts} />
          </Rail>
        </div>

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
    </div>
  );
}

/** mounts once the stored document has been read, so `initial` never changes */
function Editor({
  record,
  onSwitch,
}: {
  record: CVRecord;
  onSwitch: (r: CVRecord | null) => void;
}) {
  const [tab, setTab] = useState<Tab>("write");
  const wide = useMediaQuery("(min-width: 768px)");
  const { doc, dispatch, undo, redo, canUndo, canRedo } = useHistory(
    record.doc,
  );
  // a fresh object every render re-arms the debounce forever — autosave keys
  // off identity, so give it one that only changes when the document does
  const saved = useMemo(() => ({ ...record, doc }), [record, doc]);
  const save = useAutosave(saved);
  // above md both panes are visible, so the preview is always active
  // below it, compiling when it isn't on screen doesn't make sense
  // and wastes the phone's battery
  const { svg, error, pending, ready, ms } = useCompiledCV(
    doc,
    wide || tab === "preview",
  );
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
          : { label: `Saved · ${Math.round(ms)} ms`, settled: true };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) {
        return;
      }
      const k = e.key.toLowerCase();
      if (k === "z") {
        // every field is controlled, so the browser's own undo stack is
        // already out of step with the document — take the key rather than
        // let the two fight
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (k === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  return (
    <DispatchCtx value={dispatch}>
      <div className="flex h-full flex-col">
        <EditorTopbar
          doc={doc}
          dispatch={dispatch}
          tab={tab}
          setTab={setTab}
          undo={undo}
          redo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          onCloseCV={() => onSwitch(null)}
        />
        <main className="relative min-h-0 flex-1">
          {wide ? (
            <ResizablePanelGroup
              orientation="horizontal"
              defaultLayout={defaultLayout}
              onLayoutChanged={onLayoutChanged}
              className="h-full"
            >
              <ResizablePanel id="editor" defaultSize="50" minSize="25">
                <EditorPane doc={doc} />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel id="preview" defaultSize="50" minSize="16">
                <Preview svg={svg} />
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : tab === "write" ? (
            <EditorPane doc={doc} />
          ) : (
            <Preview svg={svg} />
          )}

          <StatusToast {...status} />
          <CompileErrorDialog error={error} />
        </main>
      </div>
    </DispatchCtx>
  );
}

export default App;
