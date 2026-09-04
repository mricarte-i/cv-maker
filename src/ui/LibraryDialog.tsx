import type { CVRecord } from "@/state/library";

export function LibraryDialog(_: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentId: string;
  onSwitch: (r: CVRecord) => void;
}) {
  return null;
}
