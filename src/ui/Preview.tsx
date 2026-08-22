import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

/** 1 = fit to the pane's width, not the page's true size */
const STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
const FIT = STEPS.indexOf(1);

export function Preview({ svg }: { svg: string }) {
  const [step, setStep] = useState(FIT);
  const zoom = STEPS[step];

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b px-2 py-1">
        <Button
          variant="ghost"
          size="icon-xs"
          disabled={step === 0}
          onClick={() => setStep(step - 1)}
        >
          <Minus />
        </Button>
        <Button
          variant="ghost"
          size="xs"
          className="w-16 tabular-nums"
          onClick={() => setStep(FIT)}
        >
          {Math.round(zoom * 100)}%
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          disabled={step === STEPS.length - 1}
          onClick={() => setStep(step + 1)}
        >
          <Plus />
        </Button>
      </div>

      {svg && (
        <div className="bg-muted min-h-0 flex-1 overflow-auto p-6">
          <div
            className="mx-auto bg-white shadow-lg [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
            style={{ width: `${zoom * 100}%` }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      )}
    </div>
  );
}
