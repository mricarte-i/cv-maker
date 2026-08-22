import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Block } from "../schema/cv";
import type { ListRef } from "../state/navigate";
import { useDispatch } from "./dispatch";
import { DragHandle, RowControls, SortableList } from "./Sortable";
import { Trash, X } from "lucide-react";

function BulletsEditor({
  block,
}: {
  block: Extract<Block, { kind: "bullets" }>;
}) {
  const dispatch = useDispatch();
  const list: ListRef = { kind: "bullets", blockId: block.id };

  return (
    <>
      <SortableList list={list} items={block.items} className="space-y-1.5">
        {(bullet, i) => (
          <div className="flex items-center gap-1">
            {/* the grip is the bullet marker */}
            <DragHandle />
            <Textarea
              rows={1}
              className="h-8 flex-1"
              value={bullet.text}
              onChange={(e) =>
                dispatch({
                  type: "bullet/update",
                  blockId: block.id,
                  index: i,
                  text: e.target.value,
                })
              }
            />
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="remove"
              onClick={() => dispatch({ type: "list/remove", list, index: i })}
            >
              <Trash />
            </Button>
          </div>
        )}
      </SortableList>
      <Button
        variant="ghost"
        size="xs"
        onClick={() => dispatch({ type: "bullet/add", blockId: block.id })}
      >
        + bullet
      </Button>
    </>
  );
}

export function BlockEditor({
  block,
  parent,
  index,
}: {
  block: Block;
  parent: ListRef;
  index: number;
}) {
  const dispatch = useDispatch();

  return (
    <div className="flex gap-2">
      <RowControls list={parent} index={index} />
      <div className="min-w-0 flex-1 space-y-1.5">
        {block.kind === "paragraph" ? (
          <Textarea
            rows={1}
            className="min-h-9 resize-none"
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
          <BulletsEditor block={block} />
        )}
      </div>
    </div>
  );
}
