import { useLayoutEffect, useRef } from "react";

export const rowKey = (parentId: string, index: number) =>
  `${parentId}:${index}`;

/** a one-shot request to focus a row that does not exist yet */
let pending: string | null = null;

export const focusAfterRender = (key: string) => {
  pending = key;
};

/** hands the caret to whichever row asked for it, exactly once */
export function useFocusClaim(key: string) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // deliberately no dep array: the claim has to be tested on the very render
  // that brought this row into existence
  useLayoutEffect(() => {
    if (pending !== key) {
      return;
    }
    pending = null;
    const el = ref.current;
    el?.focus();
    // caret to the end, so typing continues instead of overwriting
    el?.setSelectionRange(el.value.length, el.value.length);
  });

  return ref;
}
