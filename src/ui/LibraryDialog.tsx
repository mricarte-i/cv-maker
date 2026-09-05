import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CVRecord } from "@/state/library";
import { CVList } from "./CVList";

export function LibraryDialog({
  open,
  onOpenChange,
  currentId,
  onSwitch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentId: string;
  onSwitch: (r: CVRecord | null) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Your CVs</DialogTitle>
        </DialogHeader>

        <CVList
          currentId={currentId}
          onPick={(r) => {
            onSwitch(r);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
