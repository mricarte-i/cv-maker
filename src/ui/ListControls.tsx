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
    <span style={{ whiteSpace: "nowrap" }}>
      <Button
        disabled={index === 0}
        onClick={() =>
          dispatch({ type: "list/move", list, from: index, to: index - 1 })
        }
      >
        ↑
      </Button>
      <Button
        disabled={index === length - 1}
        onClick={() =>
          dispatch({ type: "list/move", list, from: index, to: index + 1 })
        }
      >
        ↓
      </Button>
      <Button onClick={() => dispatch({ type: "list/remove", list, index })}>
        ×
      </Button>
    </span>
  );
}
