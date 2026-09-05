import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { newId } from "@/schema/factory";
import {
  copyLabel,
  cut,
  hit,
  matches,
  strings,
  tokenize,
  type CVRecord,
} from "@/state/library";
import {
  listRecords,
  newRecord,
  removeRecord,
  saveRecord,
} from "@/state/persist";
import { Copy, PenLine, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

/** the CVs and everything you can do to one. shared by the welcome screen and
    the My CVs dialog, which differ only in the shell around it */
export function CVList({
  currentId,
  onPick,
}: {
  currentId: string | null;
  onPick: (r: CVRecord | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<CVRecord[]>([]);

  // re-list on mount rather than mirroring autosave's writes: one source of
  // truth, and the dialog unmounts this every time it closes
  useEffect(() => {
    void listRecords().then(setRecords);
  }, []);

  const refresh = () => void listRecords().then(setRecords);

  const create = async () => {
    const r = newRecord();
    await saveRecord(r).catch(() => {}); // in memory if storage is blocked
    onPick(r);
  };

  const duplicate = async (r: CVRecord) => {
    await saveRecord({
      ...r,
      id: newId(),
      label: copyLabel(r.label),
      updatedAt: Date.now(),
    });
    refresh();
  };

  const rename = async (r: CVRecord, label: string) => {
    if (label.trim() && label !== r.label) {
      await saveRecord({ ...r, label: label.trim() });
      refresh();
    }
  };

  const destroy = async (r: CVRecord) => {
    if (!window.confirm(`Delete "${r.label}"? This cannot be undone.`)) {
      return;
    }

    await removeRecord(r);
    const left = await listRecords();
    setRecords(left);

    // deleting the CV you have open has to land somewhere. on the welcome
    // screen nothing is open, so this never fires
    if (r.id === currentId) {
      onPick(left[0] ?? null);
    }
  };

  const tokens = tokenize(query);

  const fields = useMemo(
    () => new Map(records.map((r) => [r.id, strings(r.doc)])),
    [records],
  );

  const shown = records.filter((r) =>
    matches([r.label, ...(fields.get(r.id) ?? [])], tokens),
  );

  return (
    <>
      {records.length > 1 && (
        <Input
          className="h-8 text-sm"
          placeholder="search your CVs"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      {records.length === 0 && (
        <p className="text-pencil px-2 text-sm">No CVs yet.</p>
      )}

      {records.length > 0 && shown.length === 0 && (
        <p className="text-pencil px-2 text-sm">Nothing matches “{query}”.</p>
      )}

      <ul className="max-h-96 space-y-1 overflow-y-auto">
        {shown.map((r) => (
          <li
            key={r.id}
            className="group/row hover:bg-muted flex flex-col rounded-sm px-2 py-1.5"
          >
            <div className="flex items-baseline gap-2">
              <span className="text-pencil w-3 shrink-0 text-xs">
                {r.id === currentId ? "▸" : ""}
              </span>
              <Input
                className="h-8 flex-1 border-b-transparent font-serif text-base md:text-base"
                defaultValue={r.label}
                aria-label="CV name"
                onBlur={(e) => void rename(r, e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              />
              <span className="text-pencil shrink-0 text-xs tabular-nums">
                {new Date(r.updatedAt).toLocaleDateString()}
              </span>
              <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100">
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label={`Open ${r.label}`}
                  title="Open"
                  onClick={() => onPick(r)}
                >
                  <PenLine />
                </Button>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label={`Duplicate ${r.label}`}
                  title="Duplicate"
                  onClick={() => void duplicate(r)}
                >
                  <Copy />
                </Button>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  className="text-destructive"
                  aria-label={`Delete ${r.label}`}
                  title="Delete"
                  onClick={() => void destroy(r)}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>

            {tokens.length > 0 &&
              !r.label.toLowerCase().includes(tokens[0]) && (
                <Snippet fields={fields.get(r.id) ?? []} tokens={tokens} />
              )}
          </li>
        ))}
      </ul>

      <div className="flex justify-end">
        <Button size="xs" onClick={() => void create()}>
          New CV
        </Button>
      </div>
    </>
  );
}

/** shows why a CV matched. a label hit needs no snippet — you can already see
    the label */
function Snippet({ fields, tokens }: { fields: string[]; tokens: string[] }) {
  const token = tokens[0];
  const field = token ? hit(fields, token) : null;
  if (!field) {
    return null;
  }

  const { before, match, after } = cut(field, token);
  return (
    <p className="text-pencil truncate pl-5 text-xs">
      {before}
      <mark className="bg-primary/20 rounded-[2px] text-inherit">{match}</mark>
      {after}
    </p>
  );
}
