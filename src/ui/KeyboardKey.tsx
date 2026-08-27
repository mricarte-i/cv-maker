import type * as React from "react";
import { cn } from "@/lib/utils";

/** an inline key cap — sits on the text baseline instead of breaking the line */
export function KeyboardKey({
  className,
  ...props
}: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "bg-muted text-foreground inline-flex h-4 min-w-4 items-center",
        "justify-center rounded border px-1 align-middle font-mono",
        "text-[10px] leading-none shadow-[0_1px_0_var(--border)]",
        className,
      )}
      {...props}
    />
  );
}
