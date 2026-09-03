import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

declare const __BUILD__: string;

const LINK = "underline underline-offset-2 hover:text-primary";

const CREDITS = [
  {
    what: "Template",
    who: "silver-dev-cv 1.0.2 — Gabriel Benmergui and Santiago Barraza, MIT",
    href: "https://typst.app/universe/package/silver-dev-cv",
  },
  {
    what: "Fonts",
    who: "Libertinus Serif — SIL Open Font License 1.1",
    href: "https://github.com/alerque/libertinus",
  },
  {
    what: "Compiler",
    who: "typst.ts by Myriad-Dreamin, wrapping Typst",
    href: "https://github.com/Myriad-Dreamin/typst.ts",
  },
];

export function AboutDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>CV Maker</DialogTitle>
          <DialogDescription>
            Write a CV in your browser. typst.ts compiles it to PDF on your
            machine + you can install it as a PWA!
          </DialogDescription>
        </DialogHeader>

        <dl className="space-y-2 text-sm">
          {CREDITS.map((c) => (
            <div key={c.what} className="flex flex-col sm:flex-row sm:gap-2">
              <dt className="text-pencil shrink-0 sm:w-20">{c.what}</dt>
              <dd className="min-w-0">
                <a
                  className={LINK}
                  href={c.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {c.who}
                </a>
              </dd>
            </div>
          ))}
        </dl>

        <p className="text-pencil text-xs">
          CVs you generate are yours. The OFL clause 5 exempts documents made
          with the font, and the template's MIT terms don't reach the output.
        </p>

        <div className="flex items-baseline justify-between text-xs">
          <a
            className={LINK}
            href="https://github.com/mricarte-i/cv-maker"
            target="_blank"
            rel="noreferrer"
          >
            Source
          </a>
          <span className="text-pencil tabular-nums">{__BUILD__}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
