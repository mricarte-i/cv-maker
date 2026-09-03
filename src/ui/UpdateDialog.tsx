import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { applyUpdate, useUpdateReady } from "@/pwa";

export function UpdateDialog() {
  const ready = useUpdateReady();
  const [later, setLater] = useState(false);

  return (
    <Dialog
      open={ready && !later}
      onOpenChange={(open) => !open && setLater(true)}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>A new version is ready!</DialogTitle>
          <DialogDescription>
            Reloading takes a second. Your CV is saved either way.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="xs" onClick={() => setLater(true)}>
            Later
          </Button>
          <Button size="xs" onClick={applyUpdate}>
            Reload
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
