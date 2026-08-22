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
} from "@dnd-kit/sortable";
import type { ListRef } from "@/state/navigate";
import { useDispatch } from "./dispatch";
import { cn } from "@/lib/utils";
import { createContext, useContext } from "react";
import { Button } from "@/components/ui/button";
import { GripVertical, X } from "lucide-react";

type Sortable = ReturnType<typeof useSortable>;

const RowCtx = createContext<Sortable | null>(null);

export function SortableList<T extends { id: string }>({
  list,
  items,
  className,
  children,
}: {
  list: ListRef;
  items: readonly T[];
  className?: string;
  children: (item: T, index: number) => React.ReactNode;
}) {
  const dispatch = useDispatch();
  const ids = items.map((i) => i.id);

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
    if (over && active.id === over.id) {
      return;
    }
    const from = ids.indexOf(active.id as string);
    const to = ids.indexOf(over?.id as string);
    if (from !== -1 && to !== -1) {
      // list/move's splice pair is already arrayMove semantics
      dispatch({ type: "list/move", list, from, to });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className={className}>
          {items.map((x, i) => (
            <SortableRow key={x.id} id={x.id}>
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
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const s = useSortable({ id });

  return (
    <RowCtx value={s}>
      <div
        ref={s.setNodeRef}
        style={{
          // x is always 0 under restrictToVerticalAxis, so no CSS.Transform needed
          transform: s.transform
            ? `translate3D(0, ${s.transform.y}px, 0)`
            : undefined,
          transition: s.transition,
        }}
        className={cn(s.isDragging && "relative z-10 opacity-80")}
      >
        {children}
      </div>
    </RowCtx>
  );
}

export function DragHandle() {
  const s = useContext(RowCtx);
  if (!s) {
    throw new Error("DragHandle must be used inside a SortableList");
  }

  return (
    <Button
      ref={s.setActivatorNodeRef}
      variant="ghost"
      size="icon-xs"
      // touch-none is required
      className="touch-none cursor-grab active:cursor-grabbing"
      {...s.attributes}
      {...s.listeners}
      aria-label="reorder"
    >
      <GripVertical />
    </Button>
  );
}

export function RowControls({ list, index }: { list: ListRef; index: number }) {
  const dispatch = useDispatch();

  return (
    <div className="flex shrink-0 items-start gap-0.5">
      <DragHandle />
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="remove"
        onClick={() => dispatch({ type: "list/remove", list, index })}
      >
        <X />
      </Button>
    </div>
  );
}
