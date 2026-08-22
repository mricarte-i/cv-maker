import type { Block, EntryVariant, Item } from "../schema/cv";
import type { ListRef } from "../state/navigate";
import type { EntryPatch } from "../state/reducer";
import { useDispatch } from "./dispatch";
import { ListControls } from "./ListControls";
import { BlockEditor } from "./BlockEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** which fields each variant actually renders — see plan.md §3 */
const USES: Record<EntryVariant, ("subtitle" | "location")[]> = {
  job: ["subtitle", "location"],
  education: ["subtitle", "location"],
  project: [],
};

function BodyEditor({ itemId, body }: { itemId: string; body: Block[] }) {
  const dispatch = useDispatch();
  const parent: ListRef = { kind: "blocks", itemId };

  return (
    <div className="space-y-2">
      {body.map((b, i) => (
        <BlockEditor
          key={b.id}
          block={b}
          parent={parent}
          index={i}
          length={body.length}
        />
      ))}
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="xs"
          onClick={() =>
            dispatch({ type: "block/add", itemId, kind: "paragraph" })
          }
        >
          + paragraph
        </Button>
        <Button
          variant="ghost"
          size="xs"
          onClick={() =>
            dispatch({ type: "block/add", itemId, kind: "bullets" })
          }
        >
          + bullets
        </Button>
      </div>
    </div>
  );
}

/** every item kind gets the same frame: controls on the left, fields on the right */
function Shell({
  parent,
  index,
  length,
  children,
}: {
  parent: ListRef;
  index: number;
  length: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2 rounded-md border p-2">
      <ListControls list={parent} index={index} length={length} />
      <div className="min-w-0 flex-1 space-y-2">{children}</div>
    </div>
  );
}

export function ItemEditor({
  item,
  parent,
  index,
  length,
}: {
  item: Item;
  parent: ListRef;
  index: number;
  length: number;
}) {
  const dispatch = useDispatch();
  const frame = { parent, index, length };

  switch (item.kind) {
    case "prose":
      return (
        <Shell {...frame}>
          <BodyEditor itemId={item.id} body={item.body} />
        </Shell>
      );

    case "oneline":
      return (
        <Shell {...frame}>
          <div className="flex gap-2">
            <Input
              className="w-40"
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
              className="flex-1"
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
      const uses = USES[item.variant];

      return (
        <Shell {...frame}>
          <Select
            value={item.variant}
            onValueChange={(v) => set({ variant: v as EntryVariant })}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["job", "education", "project"] as const).map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid grid-cols-2 gap-2">
            <Input
              className="col-span-2"
              placeholder="title"
              value={item.title}
              onChange={(e) => set({ title: e.target.value })}
            />
            {uses.includes("subtitle") && (
              <Input
                placeholder="subtitle"
                value={item.subtitle}
                onChange={(e) => set({ subtitle: e.target.value })}
              />
            )}
            <Input
              placeholder="date"
              value={item.date}
              onChange={(e) => set({ date: e.target.value })}
            />
            {uses.includes("location") && (
              <Input
                placeholder="location"
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
