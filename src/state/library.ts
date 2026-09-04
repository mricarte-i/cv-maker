import type { CVDocument } from "@/schema/cv";

export type CVRecord = {
  id: string;
  label: string;
  updatedAt: number;
  doc: CVDocument;
};

export const NEW_LABEL = "Untitled CV";
export const ADOPTED_LABEL = "My CV";

export type BootPlan =
  | { kind: "load"; id: string }
  | { kind: "adopt"; doc: CVDocument }
  | { kind: "create" };

export function bootPlan(
  pointer: string | null,
  legacy: CVDocument | null,
): BootPlan {
  if (pointer) {
    return { kind: "load", id: pointer };
  }

  return legacy ? { kind: "adopt", doc: legacy } : { kind: "create" };
}

export const byRecent = (records: CVRecord[]): CVRecord[] =>
  [...records].sort((a, b) => b.updatedAt - a.updatedAt);

export const copyLabel = (label: string): string => `${label} copy`;
