import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { KeyboardKey } from "./KeyboardKey";
import type { Tag } from "@/schema/cv";
import { emptyTag } from "@/schema/factory";

const tag = (text: string): Tag => ({ ...emptyTag(), text });

export function TagsInput({
  items,
  onChange,
}: {
  items: Tag[];
  onChange: (next: Tag[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const edit = (i: number) => {
    const rest = items.filter((_, j) => j !== i);
    onChange(draft.trim() ? [...rest, tag(draft.trim())] : rest);
    setDraft(items[i].text);
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
      onChange([...items, ...added.map(tag)]);
    }
    setDraft(tail);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && draft === "" && items.length) {
      e.preventDefault();
      edit(items.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (draft.trim()) {
        onChange([...items, tag(draft.trim())]);
      }
      setDraft("");
    }
  };

  return (
    <div className="group relative flex-1">
      <div
        className={cn(
          "border-b-input flex min-h-9 flex-wrap",
          "items-center gap-1 border-b py-1",
        )}
      >
        {items.map((t, i) => (
          <span
            key={t.id}
            className={cn(
              "bg-muted flex items-center gap-1 rounded-full",
              "py-0.5 pr-1 pl-2 text-xs",
            )}
          >
            <button type="button" onClick={() => edit(i)}>
              {t.text}
            </button>
            <button
              type="button"
              aria-label={`remove ${t.text}`}
              className="opacity-50 hover:opacity-100"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          className="min-w-24 flex-1 bg-transparent text-sm outline-none"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (draft.trim()) {
              onChange([...items, tag(draft.trim())]);
            }
            setDraft("");
          }}
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
