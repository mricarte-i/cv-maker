import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { KeyboardKey } from "./KeyboardKey";
import { SortableList, useRow } from "./Sortable";
import type { Tag } from "@/schema/cv";
import { emptyTag } from "@/schema/factory";

const tag = (text: string): Tag => ({ ...emptyTag(), text });

/** same splice pair as the reducer's list/move, on a list it doesn't own */
const move = (list: Tag[], from: number, to: number) => {
  const next = [...list];
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
};

function Pill({
  text,
  onEdit,
  onRemove,
}: {
  text: string;
  onEdit: () => void;
  onRemove: () => void;
}) {
  // the pill is its own drag handle — PointerSensor's 5px activation distance
  // is what keeps a plain click on it an edit rather than a drag
  const s = useRow();

  return (
    <span
      ref={s.setActivatorNodeRef}
      className={cn(
        "bg-muted flex touch-none items-center gap-1 rounded-full",
        "cursor-grab py-0.5 pr-1 pl-2 text-xs active:cursor-grabbing",
      )}
      {...s.attributes}
      {...s.listeners}
    >
      <button
        type="button"
        onClick={onEdit}
        // the span above listens for Space/Enter to lift; this button wants
        // them for itself
        onKeyDown={(e) => e.stopPropagation()}
      >
        {text}
      </button>
      <button
        type="button"
        aria-label={`remove ${text}`}
        className="opacity-50 hover:opacity-100"
        onKeyDown={(e) => e.stopPropagation()}
        onClick={onRemove}
      >
        <X className="size-3" />
      </button>
    </span>
  );
}

export function TagsInput({
  items,
  onChange,
}: {
  items: Tag[];
  onChange: (next: Tag[]) => void;
}) {
  const [draft, setDraft] = useState("");
  // where a committed draft goes back. null means "append"
  const [home, setHome] = useState<number | null>(null);

  /** put the draft back where it came from */
  const flush = (list: Tag[]) => {
    const text = draft.trim();
    if (!text) {
      return list;
    }
    const at = home ?? list.length;
    return [...list.slice(0, at), tag(text), ...list.slice(at)];
  };

  const commit = () => {
    onChange(flush(items));
    setDraft("");
    setHome(null);
  };

  /** pull a pill into the draft, and remember the hole it left behind */
  const edit = (i: number) => {
    const at = home ?? items.length;
    // flushing the current draft shifts everything from its home rightwards
    const j = draft.trim() && at <= i ? i + 1 : i;
    onChange(flush(items).filter((_, k) => k !== j));
    setDraft(items[i].text);
    setHome(j);
  };

  const onDraftChange = (raw: string) => {
    if (!raw.includes(",")) {
      setDraft(raw);
      return;
    }
    // a comma ends a tag — and pasting a whole list ends several at once
    const parts = raw.split(",");
    const tail = parts.pop() ?? "";
    const added = parts.map((p) => p.trim()).filter(Boolean);
    if (added.length) {
      const at = home ?? items.length;
      onChange([...items.slice(0, at), ...added.map(tag), ...items.slice(at)]);
      setHome(at + added.length);
    }
    setDraft(tail);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && draft === "" && items.length) {
      e.preventDefault();
      edit(items.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      commit();
    }
  };

  return (
    <div className="group relative min-w-0 flex-1">
      <div
        className={cn(
          "border-b-input flex min-h-9 flex-wrap",
          "items-center gap-1 border-b py-1",
        )}
      >
        <SortableList
          items={items}
          onMove={(from, to) => onChange(move(items, from, to))}
          orientation="wrap"
          // display:contents so the pills stay direct children of the flex-wrap
          className="contents"
        >
          {(t, i) => (
            <Pill
              text={t.text}
              onEdit={() => edit(i)}
              onRemove={() => onChange(items.filter((_, j) => j !== i))}
            />
          )}
        </SortableList>

        <input
          aria-label="add tag"
          className="min-w-24 flex-1 bg-transparent text-sm outline-none"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commit}
        />
      </div>
      <span
        className={cn(
          "text-muted-foreground pointer-events-none absolute bottom-1.5",
          "right-0 mt-0.5 text-[11px] opacity-0 transition-opacity",
          "group-hover:opacity-100 group-focus-within:opacity-100",
        )}
      >
        Use <KeyboardKey>,</KeyboardKey> to close a new tag
      </span>
    </div>
  );
}
