import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import type { ListRef } from "@/state/navigate";
import { useDispatch } from "./dispatch";
import { cn } from "@/lib/utils";
import { createContext, useContext } from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  GripVertical,
  MoreHorizontal,
  Trash,
} from "lucide-react";
import {
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuSeparator,
  MenuTrigger,
} from "./Menu";

type RowInfo = ReturnType<typeof useSortable> & {
  list?: ListRef;
  index: number;
  count: number;
};

const RowCtx = createContext<RowInfo | null>(null);

type Move =
  | { list: ListRef; onMove?: never }
  | { list?: never; onMove: (from: number, to: number) => void };

export function SortableList<T extends { id: string }>({
  list,
  onMove,
  items,
  className,
  orientation = "vertical",
  children,
}: Move & {
  items: readonly T[];
  className?: string;
  /** "wrap" is for pills — free 2D movement inside a flex-wrap row */
  orientation?: "vertical" | "wrap";
  children: (item: T, index: number) => React.ReactNode;
}) {
  const dispatch = useDispatch();
  const ids = items.map((i) => i.id);
  const wrap = orientation === "wrap";

  const sensors = useSensors(
    //a plain click on the grip must not start a drag
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return;
    }
    const from = ids.indexOf(active.id as string);
    const to = ids.indexOf(over.id as string);
    if (from === -1 || to === -1) {
      return;
    }
    if (onMove) {
      onMove(from, to);
    } else if (list) {
      // list/move's splice pair is already arrayMove semantics
      dispatch({ type: "list/move", list, from, to });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      // a wrap list has no parent box to clamp against — see TagsInput
      modifiers={wrap ? [] : [restrictToVerticalAxis, restrictToParentElement]}
    >
      <SortableContext
        items={ids}
        strategy={wrap ? rectSortingStrategy : verticalListSortingStrategy}
      >
        <div className={className}>
          {items.map((x, i) => (
            <SortableRow
              key={x.id}
              id={x.id}
              list={list}
              index={i}
              count={items.length}
              wrap={wrap}
            >
              {children(x, i)}
            </SortableRow>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  id,
  list,
  index,
  count,
  wrap,
  children,
}: {
  id: string;
  list?: ListRef;
  index: number;
  count: number;
  wrap?: boolean;
  children: React.ReactNode;
}) {
  const s = useSortable({ id });

  return (
    <RowCtx value={{ ...s, list, index, count }}>
      <div
        ref={s.setNodeRef}
        style={{
          // x stays 0 under restrictToVerticalAxis; a wrap list needs both
          transform: s.transform
            ? `translate3d(${wrap ? s.transform.x : 0}px, ${s.transform.y}px, 0)`
            : undefined,
          transition: s.transition,
        }}
        className={cn(
          wrap && "inline-flex",
          s.isDragging && "relative z-10 opacity-80",
        )}
      >
        {children}
      </div>
    </RowCtx>
  );
}

/** the row's sortable — for a row that is its own drag handle, e.g. a tag pill */
export function useRow() {
  const s = useContext(RowCtx);
  if (!s) {
    throw new Error("useRow must be used inside a SortableList");
  }
  return s;
}

export function DragHandle({ marker }: { marker?: React.ReactNode }) {
  const s = useRow();

  return (
    <button
      type="button"
      ref={s.setActivatorNodeRef}
      className={cn(
        // touch-none is required
        "flex size-5 shrink-0 touch-none items-center justify-center rounded-sm",
        "cursor-grab text-pencil transition-colors active:cursor-grabbing",
        "hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:outline-none",
      )}
      {...s.attributes}
      {...s.listeners}
      aria-label="reorder"
    >
      {marker == null ? (
        <GripVertical className="size-3.5" />
      ) : (
        <>
          <span className="group-hover/row:hidden group-focus-within/row:hidden">
            {marker}
          </span>
          <GripVertical className="size-3.5 hidden group-hover/row:block group-focus-within/row:block" />
        </>
      )}
    </button>
  );
}

/** row actions. reordering by keyboard without a drag, and the only home a
    transparent bullets block has for its own delete. */
export function RowMenu({ duplicate }: { duplicate?: () => void }) {
  const dispatch = useDispatch();
  const { list, index, count } = useRow();
  if (!list) {
    return null;
  }
  const move = (to: number) =>
    dispatch({ type: "list/move", list, from: index, to });

  return (
    <MenuRoot>
      <MenuTrigger
        aria-label="row actions"
        className={cn(
          "text-pencil hover:bg-muted hover:text-foreground data-popup-open:bg-muted",
          "flex size-5 shrink-0 items-center justify-center rounded-sm transition-colors",
        )}
      >
        <MoreHorizontal className="size-3.5" />
      </MenuTrigger>
      <MenuContent align="end">
        <MenuItem disabled={index === 0} onClick={() => move(index - 1)}>
          <ArrowUp className="size-3.5" /> Move up
        </MenuItem>
        <MenuItem disabled={index >= count - 1} onClick={() => move(index + 1)}>
          <ArrowDown className="size-3.5" /> Move down
        </MenuItem>
        {duplicate && (
          <MenuItem onClick={duplicate}>
            <Copy className="size-3.5" /> Duplicate
          </MenuItem>
        )}
        <MenuSeparator />
        <MenuItem
          className="text-destructive data-highlighted:bg-destructive data-highlighted:text-primary-foreground"
          onClick={() => dispatch({ type: "list/remove", list, index })}
        >
          <Trash className="size-3.5" /> Delete
        </MenuItem>
      </MenuContent>
    </MenuRoot>
  );
}
