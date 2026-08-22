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
      <button
        disabled={index === 0}
        onClick={() =>
          dispatch({ type: "list/move", list, from: index, to: index - 1 })
        }
      >
        ↑
      </button>
      <button
        disabled={index === length - 1}
        onClick={() =>
          dispatch({ type: "list/move", list, from: index, to: index + 1 })
        }
      >
        ↓
      </button>
      <button onClick={() => dispatch({ type: "list/remove", list, index })}>
        ×
      </button>
    </span>
  );
}
