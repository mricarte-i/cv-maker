import type { Section } from "../schema/cv";
import type { ListRef } from "../state/navigate";
import { useDispatch } from "./dispatch";
import { ItemEditor } from "./ItemEditor";
import { Input } from "@/components/ui/input";
import { DragHandle, RowDelete, SortableList } from "./Sortable";
import { AddButton, Rail } from "./Row";

import { cn } from "@/lib/utils";

export function SectionEditor({
  section,
  index,
}: {
  section: Section;
  index: number;
}) {
  const dispatch = useDispatch();
  const items: ListRef = { kind: "items", sectionId: section.id };

  return (
    <div className="group/row group/section relative pt-4">
      {/* the section grip lives in the page margin, like a copy-editor's mark */}
      <div
        className={cn(
          "absolute top-5 -left-6 opacity-0 transition-opacity",
          "group-hover/section:opacity-100 group-focus-within/section:opacity-100",
        )}
      >
        <DragHandle />
      </div>

      <div className="flex items-end gap-1 border-b border-foreground/70 pb-0.5">
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
          className={cn(
            "h-6 border-b-transparent",
            "font-serif text-[15px] font-bold tracking-[0.06em] uppercase md:text-[15px]",
          )}
        />
        <RowDelete
          list={{ kind: "sections" }}
          index={index}
          className={cn(
            "shrink-0 opacity-0 transition-opacity",
            "group-hover/section:opacity-100 group-focus-within/section:opacity-100",
          )}
        />
      </div>

      <Rail className="mt-1">
        <SortableList list={items} items={section.items}>
          {(it, i) => <ItemEditor item={it} parent={items} index={i} />}
        </SortableList>

        <div className="flex gap-1 pl-6">
          {(["entry", "oneline", "tags", "prose"] as const).map((kind) => (
            <AddButton
              key={kind}
              onClick={() =>
                dispatch({ type: "item/add", sectionId: section.id, kind })
              }
            >
              + {kind}
            </AddButton>
          ))}
        </div>
      </Rail>
    </div>
  );
}
