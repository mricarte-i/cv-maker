import { Fragment } from "react";
import { cn } from "@/lib/utils";
import type { Block, EntryVariant, Item } from "../schema/cv";
import type { ListRef } from "../state/navigate";
import type { EntryPatch } from "../state/reducer";
import { useDispatch } from "./dispatch";
import { BlockEditor } from "./BlockEditor";
import { Input } from "@/components/ui/input";
import { DragHandle, RowMenu, SortableList } from "./Sortable";
import { TagsInput } from "./TagsInput";
import { Chip, FIELD, LABEL, META, Mark, Rail, Row, TEXT, SLOTS } from "./Row";
import { AddMenu } from "./Menu";

type Field = "title" | "subtitle" | "date" | "location";

type Layout = {
  topLeft: Field[];
  topRight: Field | null;
  bottomLeft: Field | null;
  bottomRight: Field | null;
};

/** plan.md §3 — the same four fields land in different slots per variant.
    education merges its location into the title line, comma and all. */
const LAYOUT: Record<EntryVariant, Layout> = {
  job: {
    topLeft: ["title"],
    topRight: "location",
    bottomLeft: "subtitle",
    bottomRight: "date",
  },
  education: {
    topLeft: ["title", "location"],
    topRight: "date",
    bottomLeft: "subtitle",
    bottomRight: null,
  },
  project: {
    topLeft: ["title"],
    topRight: "date",
    bottomLeft: null,
    bottomRight: null,
  },
};

/** a field looks the same wherever it lands, mirroring how it prints */
const STYLE: Record<Field, string> = {
  title: "font-serif font-bold",
  subtitle: "font-serif italic",
  date: "text-pencil",
  location: "text-pencil",
};

/** placeholders - the schema's field names are deliberately generic (plan.md §2)
 * — the placeholder is where each variant's actual meaning gets said out loud */
const NAMES: Record<EntryVariant, Record<Field, string>> = {
  job: {
    title: "position",
    subtitle: "company",
    date: "2021 – present",
    location: "city, country",
  },
  education: {
    title: "institution",
    subtitle: "major",
    date: "2017 – 2024",
    location: "city, country",
  },
  project: { title: "project", subtitle: "", date: "2025", location: "" },
};

const NEXT: Record<EntryVariant, EntryVariant> = {
  job: "education",
  education: "project",
  project: "job",
};

/** the copy-mark per item kind — also what a collapsed section summarises with */
export const MARK: Record<Item["kind"], string> = {
  entry: "▪",
  oneline: "–",
  tags: "#",
  prose: "¶",
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

      <div className="pl-6">
        <AddMenu
          options={
            [
              { value: "paragraph", label: "Paragraph", mark: "¶" },
              { value: "bullets", label: "Bullet list", mark: "•" },
            ] as const
          }
          onPick={(kind) => dispatch({ type: "block/add", itemId, kind })}
        />
      </div>
    </Rail>
  );
}

type Entry = Extract<Item, { kind: "entry" }>;

function EntryField({
  item,
  field,
  onChange,
  className,
}: {
  item: Entry;
  field: Field;
  onChange: (field: Field, value: string) => void;
  className?: string;
}) {
  return (
    <Input
      placeholder={NAMES[item.variant][field]}
      className={cn("h-7", TEXT, FIELD, STYLE[field], className)}
      value={item[field]}
      onChange={(e) => onChange(field, e.target.value)}
    />
  );
}

/** every item kind gets the same frame: a copy-mark in the gutter, fields right */
function Shell({
  parent,
  index,
  kind,
  children,
}: {
  parent: ListRef;
  index: number;
  kind: Item["kind"];
  children: React.ReactNode;
}) {
  const dispatch = useDispatch();
  const sectionId = parent.kind === "items" ? parent.sectionId : null;

  return (
    <Row
      marker={<DragHandle marker={<Mark>{MARK[kind]}</Mark>} />}
      end={
        <RowMenu
          duplicate={
            sectionId
              ? () => dispatch({ type: "item/duplicate", sectionId, index })
              : undefined
          }
        />
      }
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
        <Shell {...frame} kind={item.kind}>
          <BodyEditor itemId={item.id} body={item.body} />
        </Shell>
      );
    case "tags":
      return (
        <Shell {...frame} kind={item.kind}>
          <div className={cn(SLOTS, "@xs:items-start")}>
            <Input
              className={cn("h-7 font-medium", LABEL, TEXT, FIELD)}
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
        <Shell {...frame} kind={item.kind}>
          <div className={SLOTS}>
            <Input
              className={cn("h-7 font-medium", LABEL, TEXT, FIELD)}
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

      // exhaustive rather than a computed key: `{ [field]: v }` widens to a
      // string index signature, which EntryPatch will not take without a cast
      const setField = (field: Field, value: string) => {
        switch (field) {
          case "title":
            return set({ title: value });
          case "subtitle":
            return set({ subtitle: value });
          case "date":
            return set({ date: value });
          case "location":
            return set({ location: value });
        }
      };

      const s = LAYOUT[item.variant];
      const field = (f: Field, className: string) => (
        <EntryField
          item={item}
          field={f}
          onChange={setField}
          className={className}
        />
      );

      return (
        <Shell {...frame} kind={item.kind}>
          {/* the two-line, four-slot geometry the template prints — until the
              row is narrower than a printed line, and the slots stack */}
          <div className="flex items-baseline gap-2">
            <Chip onClick={() => set({ variant: NEXT[item.variant] })}>
              {CHIP[item.variant]}
            </Chip>
            <div className={cn(SLOTS, "flex-1")}>
              {/* one more slot than the other lines carry: the pair stays
                  stacked to @sm, so the date can sit beside it sooner */}
              <div
                className={cn(
                  SLOTS,
                  "flex-1 @xs:flex-col @xs:gap-0 @sm:flex-row @sm:gap-1",
                )}
              >
                {s.topLeft.map((f, i) => (
                  <Fragment key={f}>
                    {i > 0 && (
                      <span className="text-pencil hidden @sm:inline">,</span>
                    )}
                    {field(
                      f,
                      i === 0 ? "min-w-0 flex-1" : "w-full @sm:w-28 @sm:shrink",
                    )}
                  </Fragment>
                ))}
              </div>

              {s.topRight && field(s.topRight, META)}
            </div>
          </div>

          {(s.bottomLeft || s.bottomRight) && (
            <div className={SLOTS}>
              {s.bottomLeft ? (
                field(s.bottomLeft, "min-w-0 flex-1")
              ) : (
                <div className="flex-1" />
              )}
              {s.bottomRight && field(s.bottomRight, META)}
            </div>
          )}

          <BodyEditor itemId={item.id} body={item.body} />
        </Shell>
      );
    }
  }
}
