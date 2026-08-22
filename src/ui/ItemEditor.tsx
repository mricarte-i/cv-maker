import type { Block, EntryVariant, Item } from "../schema/cv";
import type { ListRef } from "../state/navigate";
import { useDispatch } from "./dispatch";
import { ListControls } from "./ListControls";
import { BlockEditor } from "./BlockEditor";

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
    <>
      {body.map((b, i) => (
        <BlockEditor
          key={b.id}
          block={b}
          parent={parent}
          index={i}
          length={body.length}
        />
      ))}
      <button
        onClick={() =>
          dispatch({ type: "block/add", itemId, kind: "paragraph" })
        }
      >
        + paragraph
      </button>
      <button
        onClick={() => dispatch({ type: "block/add", itemId, kind: "bullets" })}
      >
        + bullets
      </button>
    </>
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
  const controls = <ListControls list={parent} index={index} length={length} />;

  switch (item.kind) {
    case "prose":
      return (
        <div style={{ marginBottom: 10 }}>
          {controls}
          <BodyEditor itemId={item.id} body={item.body} />
        </div>
      );

    case "oneline":
      return (
        <div style={{ marginBottom: 10, display: "flex", gap: 4 }}>
          {controls}
          <input
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
          <input
            style={{ flex: 1 }}
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
      );

    case "entry": {
      const set = (
        patch: Parameters<typeof dispatch>[0] extends never
          ? never
          : Partial<
              Omit<Extract<Item, { kind: "entry" }>, "kind" | "id" | "body">
            >,
      ) => dispatch({ type: "entry/update", id: item.id, patch });
      const uses = USES[item.variant];

      return (
        <div style={{ marginBottom: 10 }}>
          {controls}
          <select
            value={item.variant}
            onChange={(e) => set({ variant: e.target.value as EntryVariant })}
          >
            <option value="job">job</option>
            <option value="education">education</option>
            <option value="project">project</option>
          </select>
          <input
            placeholder="title"
            value={item.title}
            onChange={(e) => set({ title: e.target.value })}
          />
          <input
            placeholder="date"
            value={item.date}
            onChange={(e) => set({ date: e.target.value })}
          />
          {uses.includes("subtitle") && (
            <input
              placeholder="subtitle"
              value={item.subtitle}
              onChange={(e) => set({ subtitle: e.target.value })}
            />
          )}
          {uses.includes("location") && (
            <input
              placeholder="location"
              value={item.location}
              onChange={(e) => set({ location: e.target.value })}
            />
          )}
          <BodyEditor itemId={item.id} body={item.body} />
        </div>
      );
    }
  }
}
