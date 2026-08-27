import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CompileErrorDialog({ error }: { error: string | null }) {
  const [seen, setSeen] = useState(false);

  // a successful compile re-arms it, so the next fresh failure speaks up.
  useEffect(() => {
    if (!error) {
      setSeen(false);
    }
  }, [error]);

  return (
    <Dialog
      open={Boolean(error) && !seen}
      onOpenChange={(open) => !open && setSeen(true)}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>The document did not compile</DialogTitle>
          <DialogDescription>
            The preview is still showing the last version that worked.
          </DialogDescription>
        </DialogHeader>
        <pre className="bg-muted max-h-80 overflow-auto rounded-md p-3 text-xs whitespace-pre-wrap">
          {error}
        </pre>
      </DialogContent>
    </Dialog>
  );
}
