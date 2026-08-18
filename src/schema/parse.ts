import { z } from "zod";
import { CVDocumentSchema, type CVDocument } from "./cv";
import { migrate } from "./migrate";

export type ParseResult =
  | { ok: true; doc: CVDocument }
  | { ok: false; error: string };

export function parseDocument(raw: unknown): ParseResult {
  let migrated: unknown;
  try {
    migrated = migrate(raw);
  } catch (e) {
    return { ok: false, error: `migration failed: ${String(e)}` };
  }

  const result = CVDocumentSchema.safeParse(migrated);
  return result.success
    ? { ok: true, doc: result.data }
    : { ok: false, error: z.prettifyError(result.error) };
}
