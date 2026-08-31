import { cn } from "@/lib/utils";
import type { Block, EntryVariant, Item } from "../schema/cv";
import type { ListRef } from "../state/navigate";
import type { EntryPatch } from "../state/reducer";
import { useDispatch } from "./dispatch";
import { BlockEditor } from "./BlockEditor";
import { Input } from "@/components/ui/input";
import { DragHandle, RowDelete, SortableList } from "./Sortable";
import { TagsInput } from "./TagsInput";
import { AddButton, Chip, FIELD, Mark, Rail, Row, TEXT } from "./Row";

type Slot = "title" | "subtitle" | "date" | "location" | null;

/** plan.md §3 — the same four fields land in different slots per variant */
const SLOTS: Record<EntryVariant, [Slot, Slot, Slot, Slot]> = {
  //             top-left   top-right   bottom-left  bottom-right
  job: ["title", "location", "subtitle", "date"],
  education: ["title", "date", "subtitle", null],
  project: ["title", "date", null, null],
};

const NEXT: Record<EntryVariant, EntryVariant> = {
  job: "education",
  education: "project",
  project: "job",
};

const CHIP: Record<EntryVariant, string> = {
  job: "job",
  education: "edu",
  project: "prj",
};

function BodyEditor({ itemId, body }: { itemId: string; body: Block[] }) {
  const dispatch = useDispatch();
  const parent: ListRef = { kind: "blocks", itemId };

  return (
    <Rail>
      <SortableList list={parent} items={body}>
        {(b, i) => <BlockEditor block={b} parent={parent} index={i} />}
      </SortableList>

      <div className="flex gap-1 pl-6">
        {(["paragraph", "bullets"] as const).map((kind) => (
          <AddButton
            key={kind}
            onClick={() => dispatch({ type: "block/add", itemId, kind })}
          >
            + {kind}
          </AddButton>
        ))}
      </div>
    </Rail>
  );
}

/** every item kind gets the same frame: a copy-mark in the gutter, fields right */
function Shell({
  parent,
  index,
  mark,
  children,
}: {
  parent: ListRef;
  index: number;
  mark: string;
  children: React.ReactNode;
}) {
  return (
    <Row
      marker={<DragHandle marker={<Mark>{mark}</Mark>} />}
      end={<RowDelete list={parent} index={index} />}
    >
      {children}
    </Row>
  );
}

export function ItemEditor({
  item,
  parent,
  index,
}: {
  item: Item;
  parent: ListRef;
  index: number;
}) {
  const dispatch = useDispatch();
  const frame = { parent, index };

  switch (item.kind) {
    case "prose":
      return (
        <Shell {...frame} mark="¶">
          <BodyEditor itemId={item.id} body={item.body} />
        </Shell>
      );
    case "tags":
      return (
        <Shell {...frame} mark="#">
          <div className="flex min-w-0 items-start gap-2">
            <Input
              className={cn("h-7 w-28 shrink-0 font-medium", TEXT, FIELD)}
              placeholder="title"
              value={item.title}
              onChange={(e) =>
                dispatch({
                  type: "tags/update",
                  id: item.id,
                  patch: { title: e.target.value },
                })
              }
            />
            <TagsInput
              items={item.items}
              onChange={(items) =>
                dispatch({ type: "tags/update", id: item.id, patch: { items } })
              }
            />
          </div>
        </Shell>
      );

    case "oneline":
      return (
        <Shell {...frame} mark="–">
          <div className="flex gap-2">
            <Input
              className={cn("h-7 w-28 shrink-0 font-medium", TEXT, FIELD)}
              placeholder="title"
              value={item.title}
              onChange={(e) =>
                dispatch({
                  type: "oneline/update",
                  id: item.id,
                  patch: { title: e.target.value },
                })
              }
            />
            <Input
              className={cn("h-7", TEXT, FIELD)}
              placeholder="content"
              value={item.content}
              onChange={(e) =>
                dispatch({
                  type: "oneline/update",
                  id: item.id,
                  patch: { content: e.target.value },
                })
              }
            />
          </div>
        </Shell>
      );
    case "entry": {
      const set = (patch: EntryPatch) =>
        dispatch({ type: "entry/update", id: item.id, patch });
      const slots = SLOTS[item.variant];

      return (
        <Shell {...frame} mark="▪">
          <div className="flex items-baseline gap-1">
            <Chip onClick={() => set({ variant: NEXT[item.variant] })}>
              {CHIP[item.variant]}
            </Chip>
            <Input
              placeholder="title"
              className={cn("h-7 font-serif font-bold", TEXT, FIELD)}
              value={item.title}
              onChange={(e) => set({ title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-x-3 pl-1">
            {slots.includes("subtitle") && (
              <Input
                className={cn("h-7 font-serif italic", TEXT, FIELD)}
                placeholder="subtitle"
                value={item.subtitle}
                onChange={(e) => set({ subtitle: e.target.value })}
              />
            )}
            <Input
              placeholder="date"
              className={cn("h-7", TEXT, FIELD)}
              value={item.date}
              onChange={(e) => set({ date: e.target.value })}
            />
            {slots.includes("location") && (
              <Input
                placeholder="location"
                className={cn("h-7", TEXT, FIELD)}
                value={item.location}
                onChange={(e) => set({ location: e.target.value })}
              />
            )}
          </div>

          <BodyEditor itemId={item.id} body={item.body} />
        </Shell>
      );
    }
  }
}
