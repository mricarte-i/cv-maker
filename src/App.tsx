import {
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
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
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "./components/ui/resizable";
import { ContactsEditor } from "./ui/ContactsEditor";
import { Preview } from "./ui/Preview";
import { SortableList } from "./ui/Sortable";
import { Monitor, MoreHorizontal, Moon, Plus, Sun } from "lucide-react";
import { StatusToast } from "./ui/StatusToast";
import { CompileErrorDialog } from "./ui/CompileErrorDialog";
import { cn } from "./lib/utils";
import { useTheme } from "./ui/theme";
import { Rail } from "./ui/Row";
import { useDispatch } from "./ui/dispatch";
import {
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuSeparator,
  MenuTrigger,
} from "./ui/Menu";

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

function TabSwitch({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div className="border-border flex overflow-hidden rounded-sm border md:hidden">
      {(["write", "preview"] as const).map((t) => (
        <button
          key={t}
          type="button"
          aria-pressed={tab === t}
          onClick={() => setTab(t)}
          className={cn(
            "px-3 py-1 text-xs tracking-wide capitalize transition-colors",
            tab === t
              ? "bg-primary text-primary-foreground"
              : "text-pencil hover:bg-muted",
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function EditorTopbar({
  doc,
  dispatch,
  tab,
  setTab,
}: {
  doc: CVDocument;
  dispatch: React.ActionDispatch<[a: Action]>;
  tab: Tab;
  setTab: (t: Tab) => void;
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
    <header className="flex h-11 shrink-0 items-center gap-2 border-b px-3 md:px-4">
      <h1 className="hidden font-serif text-base font-bold tracking-[0.14em] uppercase sm:block">
        cv-maker
      </h1>

      <TabSwitch tab={tab} setTab={setTab} />

      <div className="ml-auto flex items-center gap-1">
        <Button size="xs" disabled={pdfBusy} onClick={onPdf}>
          {pdfBusy ? "compiling…" : "download pdf"}
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
            <MenuItem
              onClick={() =>
                replace(sampleDocument, "Replace this CV with the sample?")
              }
            >
              Load the sample CV
            </MenuItem>
            <MenuItem
              className="text-destructive data-highlighted:bg-destructive data-highlighted:text-primary-foreground"
              onClick={() =>
                replace(
                  emptyDocument,
                  "Discard this CV and start over? This cannot be undone.",
                )
              }
            >
              Start over
            </MenuItem>
          </MenuContent>
        </MenuRoot>

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
        <div>
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
          <div className="flex items-baseline gap-2">
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
function Editor({ initial }: { initial: CVDocument }) {
  const [tab, setTab] = useState<Tab>("write");
  const wide = useMediaQuery("(min-width: 768px)");
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
        <EditorTopbar doc={doc} dispatch={dispatch} tab={tab} setTab={setTab} />
        <div className="relative min-h-0 flex-1">
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
        </div>
      </div>
    </DispatchCtx>
  );
}

export default App;
