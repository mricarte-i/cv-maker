import { Button } from "@/components/ui/button";
import type { Block } from "../schema/cv";
import type { ListRef } from "../state/navigate";
import { useDispatch } from "./dispatch";
import { ListControls } from "./ListControls";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function BlockEditor({
  block,
  parent,
  index,
  length,
}: {
  block: Block;
  parent: ListRef;
  index: number;
  length: number;
}) {
  const dispatch = useDispatch();

  return (
    <div style={{ margin: "6px 0" }}>
      <ListControls list={parent} index={index} length={length} />

      {block.kind === "paragraph" ? (
        <Textarea
          rows={3}
          style={{ width: "100%" }}
          value={block.text}
          onChange={(e) =>
            dispatch({
              type: "paragraph/update",
              id: block.id,
              text: e.target.value,
            })
          }
        />
      ) : (
        <>
          {block.items.map((text, i) => (
            <div key={i} style={{ display: "flex", gap: 4 }}>
              <Input
                style={{ flex: 1 }}
                value={text}
                onChange={(e) =>
                  dispatch({
                    type: "bullet/update",
                    blockId: block.id,
                    index: i,
                    text: e.target.value,
                  })
                }
              />
              <ListControls
                list={{ kind: "bullets", blockId: block.id }}
                index={i}
                length={block.items.length}
              />
            </div>
          ))}
          <Button
            onClick={() => dispatch({ type: "bullet/add", blockId: block.id })}
          >
            + bullet
          </Button>
        </>
      )}
    </div>
  );
}
