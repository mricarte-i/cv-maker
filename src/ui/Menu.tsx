import { Menu as M } from "@base-ui/react/menu";
import { cn } from "@/lib/utils";

export const MenuRoot = M.Root;
export const MenuTrigger = M.Trigger;

export function MenuContent({
  align = "start",
  className,
  children,
}: {
  align?: M.Positioner.Props["align"];
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <M.Portal>
      <M.Positioner side="bottom" align={align} sideOffset={4} className="z-50">
        <M.Popup
          className={cn(
            "bg-popover text-popover-foreground ring-foreground/10 min-w-40 rounded-none py-1 shadow-md ring-1",
            "origin-(--transform-origin) duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
            className,
          )}
        >
          {children}
        </M.Popup>
      </M.Positioner>
    </M.Portal>
  );
}

export function MenuItem({ className, ...props }: M.Item.Props) {
  return (
    <M.Item
      className={cn(
        "flex cursor-default items-center gap-2 px-3 py-1.5 text-sm outline-hidden select-none",
        "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
        "data-disabled:pointer-events-none data-disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}

export function MenuSeparator() {
  return <M.Separator className="bg-border my-1 h-px" />;
}

export function AddMenu<T extends string>({
  options,
  onPick,
}: {
  options: readonly { value: T; label: string; mark: string }[];
  onPick: (value: T) => void;
}) {
  return (
    <MenuRoot>
      <MenuTrigger className="text-pencil hover:bg-muted hover:text-foreground rounded-sm px-1 text-sm leading-6 transition-colors">
        + add
      </MenuTrigger>
      <MenuContent>
        {options.map((o) => (
          <MenuItem key={o.value} onClick={() => onPick(o.value)}>
            <span className="text-pencil w-3 textext-center font-serif">
              {o.mark}
            </span>
            {o.label}
          </MenuItem>
        ))}
      </MenuContent>
    </MenuRoot>
  );
}
