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

/**
 * every string in a document (that is content), one entry per field, never joined
 */
export const strings = (v: unknown): string[] =>
  typeof v === "string"
    ? [v]
    : Array.isArray(v)
      ? v.flatMap(strings)
      : typeof v === "object" && v !== null
        ? Object.entries(v).flatMap(([k, x]) =>
            k === "id" || k === "kind" || k === "variant" ? [] : strings(x),
          )
        : [];

export const tokenize = (query: string): string[] =>
  query.toLowerCase().split(/\s+/).filter(Boolean);

export const matches = (fields: string[], tokens: string[]): boolean =>
  tokens.every((t) => fields.some((f) => f.toLowerCase().includes(t)));

export const hit = (fields: string[], token: string): string | null =>
  fields.find((f) => f.toLowerCase().includes(token)) ?? null;

export function cut(text: string, token: string, pad = 30) {
  const i = text.toLowerCase().indexOf(token);
  const start = Math.max(0, i - pad);
  const end = Math.min(text.length, i + token.length + pad);

  return {
    before: (start > 0 ? "…" : "") + text.slice(start, i),
    match: text.slice(i, i + token.length),
    after: text.slice(i + token.length, end) + (end < text.length ? "…" : ""),
  };
}
