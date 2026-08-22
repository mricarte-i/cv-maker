import { ArrowDown, ArrowUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ListRef } from "../state/navigate";
import { useDispatch } from "./dispatch";

export function ListControls({
  list,
  index,
  length,
}: {
  list: ListRef;
  index: number;
  length: number;
}) {
  const dispatch = useDispatch();
  return (
    <div className="flex shrink-0 gap-0.5">
      <Button
        variant="ghost"
        size="icon-xs"
        disabled={index === 0}
        onClick={() =>
          dispatch({ type: "list/move", list, from: index, to: index - 1 })
        }
      >
        <ArrowUp />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        disabled={index === length - 1}
        onClick={() =>
          dispatch({ type: "list/move", list, from: index, to: index + 1 })
        }
      >
        <ArrowDown />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => dispatch({ type: "list/remove", list, index })}
      >
        <X />
      </Button>
    </div>
  );
}
