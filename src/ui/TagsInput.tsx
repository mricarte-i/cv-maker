import { useState } from "react";
import { Command, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { KeyboardKey } from "./KeyboardKey";

export function TagsInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const tags = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const commit = (next: string[]) => onChange(next.join(", "));

  const edit = (i: number) => {
    const rest = tags.filter((_, j) => j !== i);
    commit(draft.trim() ? [...rest, draft.trim()] : rest);
    setDraft(tags[i] ?? "");
  };

  const onDraftChange = (raw: string) => {
    if (!raw.includes(",")) {
      setDraft(raw);
      return;
    }

    const parts = raw.split(",");
    const tail = parts.pop() ?? "";
    const added = parts.map((p) => p.trim()).filter(Boolean);
    if (added.length) {
      commit([...tags, ...added]);
    }
    setDraft(tail);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && draft === "" && tags.length) {
      e.preventDefault();
      edit(tags.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (draft.trim()) {
        commit([...tags, draft.trim()]);
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
        {tags.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className={cn(
              "bg-muted flex items-center gap-1 rounded-full",
              "py-0.5 pr-1 pl-2 text-xs",
            )}
          >
            <button type="button" onClick={() => edit(i)}>
              {tag}
            </button>
            <button
              type="button"
              aria-label={`remove ${tag}`}
              className="opacity-50 hover:opacity-100"
              onClick={() => commit(tags.filter((_, j) => j !== i))}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          className="min-w-24 flex-1 bg-transparent text-sm outline-none"
          value={draft}
          placeholder={tags.length ? "" : placeholder}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (draft.trim()) {
              commit([...tags, draft.trim()]);
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
