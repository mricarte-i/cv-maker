import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Block, Bullet } from "../schema/cv";
import type { ListRef } from "../state/navigate";
import { useDispatch } from "./dispatch";
import { DragHandle, RowDelete, SortableList } from "./Sortable";
import { AddButton, FIELD, Mark, Row, TEXT } from "./Row";
import { focusAfterRender, rowKey, useFocusClaim } from "./focus";

type Bullets = Extract<Block, { kind: "bullets" }>;

function BulletRow({
  block,
  bullet,
  index,
  removeBulletsBlock,
}: {
  block: Bullets;
  bullet: Bullet;
  index: number;
  removeBulletsBlock: () => void;
}) {
  const dispatch = useDispatch();
  const list: ListRef = { kind: "bullets", blockId: block.id };
  const ref = useFocusClaim(rowKey(block.id, index));

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // enter without shift > add new bullet, otherwise its a newline
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      dispatch({ type: "bullet/add", blockId: block.id, at: index + 1 });
      focusAfterRender(rowKey(block.id, index + 1));
      return;
    }
    // backspace on empty bullet > delete bullet
    if (e.key === "Backspace" && bullet.text === "") {
      e.preventDefault();
      //if it was the last bullet, remove bullets block entirely
      if (block.items.length === 1) {
        removeBulletsBlock();
      } else {
        dispatch({ type: "list/remove", list, index });
        focusAfterRender(rowKey(block.id, Math.max(0, index - 1)));
      }
    }
  };

  return (
    <Row
      marker={<DragHandle marker={<Mark>•</Mark>} />}
      end={<RowDelete list={list} index={index} />}
    >
      <Textarea
        ref={ref}
        rows={1}
        placeholder="bullet"
        className={cn(TEXT, FIELD)}
        value={bullet.text}
        onKeyDown={onKeyDown}
        onChange={(e) =>
          dispatch({
            type: "bullet/update",
            blockId: block.id,
            index,
            text: e.target.value,
          })
        }
      />
    </Row>
  );
}

function ParagraphRow({
  block,
  itemId,
  index,
}: {
  block: Extract<Block, { kind: "paragraph" }>;
  itemId: string | null;
  index: number;
}) {
  const dispatch = useDispatch();
  const ref = useFocusClaim(rowKey(itemId ?? block.id, index));

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey || !itemId) {
      return;
    }
    e.preventDefault();
    dispatch({ type: "block/add", itemId, kind: "paragraph", at: index + 1 });
    focusAfterRender(rowKey(itemId, index + 1));
  };

  return (
    <Textarea
      ref={ref}
      rows={1}
      placeholder="paragraph"
      className={cn(TEXT, FIELD)}
      value={block.text}
      onKeyDown={onKeyDown}
      onChange={(e) =>
        dispatch({
          type: "paragraph/update",
          id: block.id,
          text: e.target.value,
        })
      }
    />
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
  const itemId = parent.kind === "blocks" ? parent.itemId : null;

  if (block.kind === "paragraph") {
    return (
      <Row
        marker={<DragHandle marker={<Mark>¶</Mark>} />}
        end={<RowDelete list={parent} index={index} />}
      >
        <ParagraphRow block={block} itemId={itemId} index={index} />
      </Row>
    );
  }

  // bullets block
  // only bullets get rows, so a bullet sits at the same depth as a paragraph
  // the block's own grip and delete exist on the trailing line, which
  // is the one gutter the bullets don't own
  return (
    <div>
      <SortableList
        list={{ kind: "bullets", blockId: block.id }}
        items={block.items}
      >
        {(bullet, i) => (
          <BulletRow
            block={block}
            bullet={bullet}
            index={i}
            removeBulletsBlock={() =>
              dispatch({ type: "list/remove", list: parent, index })
            }
          />
        )}
      </SortableList>

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
