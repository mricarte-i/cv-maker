import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { newId } from "@/schema/factory";
import { copyLabel, type CVRecord } from "@/state/library";
import {
  listRecords,
  newRecord,
  removeRecord,
  saveRecord,
} from "@/state/persist";
import { useEffect, useState } from "react";

export function LibraryDialog({
  open,
  onOpenChange,
  currentId,
  onSwitch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentId: string;
  onSwitch: (r: CVRecord) => void;
}) {
  const [records, setRecords] = useState<CVRecord[]>([]);

  useEffect(() => {
    if (open) {
      void listRecords().then(setRecords);
    }
  }, [open]);

  const refresh = () => void listRecords().then(setRecords);

  const pick = (r: CVRecord) => {
    onSwitch(r);
    onOpenChange(false);
  };

  const create = async () => {
    const r = newRecord();
    await saveRecord(r);
    pick(r);
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
      await saveRecord({ ...r, label, updatedAt: Date.now() });
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

    // deleting the CV you are in has to land somewhere
    if (r.id === currentId) {
      const next = left[0] ?? newRecord();
      if (!left[0]) {
        await saveRecord(next);
      }
      pick(next);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Your CVs</DialogTitle>
        </DialogHeader>

        <ul className="max-h-96 space-y-1 overflow-y-auto">
          {records.map((r) => (
            <li
              key={r.id}
              className="group/row hover:bg-muted flex items-baseline gap-2 rounded-sm px-2 py-1"
            >
              <span className="text-pencil w-3 shrink-0 text-xs">
                {r.id === currentId ? "▸" : ""}
              </span>
              <Input
                className="h-7 flex-1 border-b-transparent text-sm"
                defaultValue={r.label}
                aria-label="CV name"
                onBlur={(e) => void rename(r, e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              />
              <span className="text-pencil shrink-0 text-xs tabular-nums">
                {new Date(r.updatedAt).toLocaleDateString()}
              </span>
              <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover/row:opacity-100 pointer-coarse:opacity-100">
                <Button size="xs" variant="ghost" onClick={() => pick(r)}>
                  open
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => void duplicate(r)}
                >
                  duplicate
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => void destroy(r)}
                >
                  delete
                </Button>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex justify-end">
          <Button size="xs" onClick={() => void create()}>
            New CV
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
