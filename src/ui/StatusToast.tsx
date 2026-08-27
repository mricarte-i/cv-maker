import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const LINGER_MS = 1000;

export function StatusToast({
  label,
  settled,
}: {
  label: string;
  settled: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    if (!settled) {
      return;
    }

    const timer = setTimeout(() => setVisible(false), LINGER_MS);
    return () => clearTimeout(timer);
  }, [label, settled]);

  return (
    <div
      aria-live="polite"
      className={cn(
        "pointer-events-none absolute left-4 bottom-4 rounded-full border",
        "bg-background/80 text-muted-foreground px-3 py-1 text-xs shadow-sm",
        "backdrop-blur-sm transition-opacity duration-700",
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      {label}
    </div>
  );
}
