import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Block } from "../schema/cv";
import type { ListRef } from "../state/navigate";
import { useDispatch } from "./dispatch";
import { DragHandle, RowDelete, SortableList } from "./Sortable";
import { AddButton, FIELD, Mark, Row, TEXT } from "./Row";

function BulletsList({
  block,
}: {
  block: Extract<Block, { kind: "bullets" }>;
}) {
  const dispatch = useDispatch();
  const list: ListRef = { kind: "bullets", blockId: block.id };

  return (
    <SortableList list={list} items={block.items}>
      {(bullet, i) => (
        <Row
          marker={<DragHandle marker={<Mark>•</Mark>} />}
          end={<RowDelete list={list} index={i} />}
        >
          <Textarea
            rows={1}
            placeholder="bullet"
            className={cn(TEXT, FIELD)}
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
        </Row>
      )}
    </SortableList>
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

  if (block.kind === "paragraph") {
    return (
      <Row
        marker={<DragHandle marker={<Mark>¶</Mark>} />}
        end={<RowDelete list={parent} index={index} />}
      >
        <Textarea
          rows={1}
          placeholder="paragraph"
          className={cn(TEXT, FIELD)}
          value={block.text}
          onChange={(e) =>
            dispatch({
              type: "paragraph/update",
              id: block.id,
              text: e.target.value,
            })
          }
        />
      </Row>
    );
  }

  // bullets block
  // only bullets get rows, so a bullet sits at the same depth as a paragraph
  // the block's own grip and delte live on the trailing line, which
  // is the one gutter the bullets don't own
  return (
    <div>
      <BulletsList block={block} />
      <Row
        end={
          // only meaningful once the list is empty, where it can't be mistaken
          // for deleting a bullet
          block.items.length === 0 ? (
            <RowDelete list={parent} index={index} />
          ) : undefined
        }
      >
        <AddButton
          onClick={() => dispatch({ type: "bullet/add", blockId: block.id })}
        >
          + bullet
        </AddButton>
      </Row>
    </div>
  );
}
