import { SCHEMA_VERSION } from "./cv";

type Migration = (doc: Record<string, unknown>) => Record<string, unknown>;

const MIGRATIONS: Record<number, Migration> = {
  // 1: (doc) => ({ ...doc, schemaVersion: 2, theme: 'default' }),
};

export function migrate(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;

  let doc = raw as Record<string, unknown>;
  while (
    typeof doc.schemaVersion === "number" &&
    doc.schemaVersion < SCHEMA_VERSION
  ) {
    const from = doc.schemaVersion;
    const step = MIGRATIONS[from];
    if (!step) break; // no path — let parse reject it
    doc = step(doc);
    if (doc.schemaVersion === from) {
      throw new Error(`migration from v${from} did not bump schemaVersion`);
    }
  }
  return doc;
}
