import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Block } from "../schema/cv";
import type { ListRef } from "../state/navigate";
import { useDispatch } from "./dispatch";
import { ListControls } from "./ListControls";

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
    <div className="flex gap-2">
      <ListControls list={parent} index={index} length={length} />
      <div className="min-w-0 flex-1 space-y-1.5">
        {block.kind === "paragraph" ? (
          <Textarea
            rows={3}
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
              <div key={i} className="flex items-center gap-1">
                <span className="text-muted-foreground select-none">•</span>
                <Input
                  className="h-8 flex-1"
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
              variant="ghost"
              size="xs"
              onClick={() =>
                dispatch({ type: "bullet/add", blockId: block.id })
              }
            >
              + bullet
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
