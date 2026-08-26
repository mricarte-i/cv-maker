import * as ResizablePrimitive from "react-resizable-panels";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

function ResizablePanelGroup({
  className,
  ...props
}: ResizablePrimitive.GroupProps) {
  return (
    <ResizablePrimitive.Group
      data-slot="resizable-panel-group"
      className={cn(
        "flex h-full w-full aria-[orientation=vertical]:flex-col",
        className,
      )}
      {...props}
    />
  );
}

function ResizablePanel({ ...props }: ResizablePrimitive.PanelProps) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />;
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: ResizablePrimitive.SeparatorProps & {
  withHandle?: boolean;
}) {
  return (
    <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      className={cn(
        "group/handle relative flex w-3 items-center justify-center bg-border transition-colors",
        "data-[separator=hover]:bg-primary/60 data-[separator=active]:bg-primary",
        "focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden",
        "aria-[orientation=horizontal]:h-2 aria-[orientation=horizontal]:w-full",
        "[&[aria-orientation=horizontal]>div]:rotate-90",
        className,
      )}
      {...props}
    >
      {withHandle && (
        <div
          className={cn(
            "z-10 flex h-8 w-3 items-center justify-center rounded-sm border bg-border text-muted-foreground transition-colors",
            "group-data-[separator=hover]/handle:bg-primary/60",
            "group-data-[separator=active]/handle:bg-primary group-data-[separator=active]/handle:text-primary-foreground",
          )}
        >
          <GripVertical className="size-4" />
        </div>
      )}
    </ResizablePrimitive.Separator>
  );
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };
