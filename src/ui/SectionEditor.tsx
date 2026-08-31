import type { Item, Section } from "../schema/cv";
import type { ListRef } from "../state/navigate";
import { useDispatch } from "./dispatch";
import { ItemEditor, MARK } from "./ItemEditor";
import { Input } from "@/components/ui/input";
import { DragHandle, RowMenu, SortableList } from "./Sortable";
import { Rail } from "./Row";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { AddMenu } from "./Menu";

const SUMMARY_LIMIT = 8;

/** what got folded away, in the same marks the rows themselves carry */
function Summary({ items }: { items: Item[] }) {
  if (!items.length) {
    return <span className="text-pencil shrink-0 text-xs">empty</span>;
  }

  const shown = items.slice(0, SUMMARY_LIMIT);

  return (
    <span className="text-pencil flex shrink-0 items-baseline gap-1 pb-0.5 font-serif text-xs">
      {shown.map((it) => (
        <span key={it.id}>{MARK[it.kind]}</span>
      ))}
      {items.length > shown.length && (
        <span className="font-sans">+{items.length - shown.length}</span>
      )}
    </span>
  );
}

export function SectionEditor({
  section,
  index,
}: {
  section: Section;
  index: number;
}) {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(true);
  const items: ListRef = { kind: "items", sectionId: section.id };
  const bodyId = `section-body-${section.id}`;
  const name = section.label || `section ${index + 1}`;

  return (
    <div className="group/row group/section relative pt-4">
      {/* the section grip lives in the page margin, like a copy-editor's mark */}
      <div className="absolute top-5 -left-6 opacity-0 transition-opacity group-hover/section:opacity-100 group-focus-within/section:opacity-100">
        <DragHandle />
      </div>

      <div className="border-rule flex items-end gap-1 border-b pb-0.5">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          aria-label={open ? `Collapse ${name}` : `Expand ${name}`}
          onClick={() => setOpen(!open)}
          className="text-pencil hover:bg-muted hover:text-foreground flex size-5 shrink-0 items-center justify-center rounded-sm transition-colors"
        >
          {open ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </button>

        <Input
          placeholder="section"
          value={section.label}
          onChange={(e) =>
            dispatch({
              type: "section/update",
              id: section.id,
              label: e.target.value,
            })
          }
          className="h-6 border-b-transparent font-serif text-[15px] font-bold tracking-[0.06em] uppercase md:text-[15px]"
        />

        {!open && <Summary items={section.items} />}

        <RowMenu
          duplicate={() => dispatch({ type: "section/duplicate", index })}
        />
      </div>

      {open && (
        <Rail id={bodyId} className="mt-1">
          <SortableList list={items} items={section.items}>
            {(it, i) => <ItemEditor item={it} parent={items} index={i} />}
          </SortableList>

          <div className="pl-6">
            <AddMenu
              options={
                [
                  { value: "entry", label: "Entry", mark: MARK.entry },
                  { value: "oneline", label: "One line", mark: MARK.oneline },
                  { value: "tags", label: "Tags", mark: MARK.tags },
                  { value: "prose", label: "Prose", mark: MARK.prose },
                ] as const
              }
              onPick={(kind) =>
                dispatch({ type: "item/add", sectionId: section.id, kind })
              }
            />
          </div>
        </Rail>
      )}
    </div>
  );
}
