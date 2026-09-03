import { cn } from "@/lib/utils";

/** the borderless field look: a bottom rule only on hover / focus */
export const FIELD =
  "border-b-transparent hover:border-b-input focus-visible:border-b-ring";

/** compact single-line-ish text field */
export const TEXT = "min-h-0 py-0.5 text-sm leading-6";

/** the print geometry needs a printed line's width. below 20rem of row the
    slots stack, one field per line. @container, not a breakpoint — a desktop
    split dragged narrow is the same problem as a phone
    stacked lines butt up like set copy — no gap by design. 
    needs an @container ancestor. */
export const SLOTS =
  "flex min-w-0 flex-col @xs:flex-row @xs:items-baseline @xs:gap-2";

/** the label column — full width stacked, fixed once it sits beside its field */
export const LABEL = "w-full @xs:w-28 @xs:shrink-0";

/** the right-hand meta slot: date, location. right-aligned only in print order */
export const META = "w-full @xs:w-32 @xs:shrink-0 @xs:text-right";

export function Rail({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className={cn("rail relative min-w-0 pl-1.5", className)}>
      {children}
    </div>
  );
}

export function Row({
  marker,
  end,
  className,
  children,
}: {
  marker?: React.ReactNode;
  end?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("group/row flex items-start gap-0.5 py-px", className)}>
      <div className="flex w-6 shrink-0 justify-center pt-1 select-none">
        {marker}
      </div>
      <div className="@container min-w-0 flex-1">{children}</div>
      <div
        className={cn(
          "flex w-6 shrink-0 justify-center pt-0.5 opacity-0 transition-opacity",
          "group-hover/row:opacity-100 group-focus-within/row:opacity-100",
          // there is no hover on touch, and RowMenu is the only path to
          // reorder or delete a row you cannot focus without a side effect
          "pointer-coarse:opacity-100",
        )}
      >
        {end}
      </div>
    </div>
  );
}

export function Mark({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cn("font-serif text-sm leading-4 text-pencil", className)}>
      {children}
    </span>
  );
}

export function Chip({
  onClick,
  children,
}: {
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-sm px-1 py-px text-[10px] font-medium tracking-[0.08em]",
        "text-pencil uppercase transition-colors hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function AddButton({
  onClick,
  children,
}: {
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-sm px-1 text-sm leading-6 text-pencil transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}
