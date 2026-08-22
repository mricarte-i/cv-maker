import { SCHEMA_VERSION } from "./cv";
import { newId } from "./factory";

type Migration = (doc: Record<string, unknown>) => Record<string, unknown>;

/** map over v if it is an array; otherwise pass it through for zod to reject */
const mapArray = (v: unknown, f: (x: unknown) => unknown): unknown =>
  Array.isArray(v) ? v.map(f) : v;

/** rewrite one key of v if v is an object that has it; otherwise pass through */
const mapKey = (
  v: unknown,
  key: string,
  f: (x: unknown) => unknown,
): unknown =>
  typeof v === "object" && v !== null && key in v
    ? { ...v, [key]: f((v as Record<string, unknown>)[key]) }
    : v;

/** v1 → v2: bullet strings become { id, text } so they can be dragged */
const bulletBlock = (b: unknown): unknown =>
  typeof b === "object" &&
  b !== null &&
  (b as { kind?: unknown }).kind === "bullets"
    ? mapKey(b, "items", (items) =>
        mapArray(items, (t) =>
          typeof t === "string" ? { id: newId(), text: t } : t,
        ),
      )
    : b;

const MIGRATIONS: Record<number, Migration> = {
  1: (doc) => ({
    ...(mapKey(doc, "sections", (ss) =>
      mapArray(ss, (s) =>
        mapKey(s, "items", (items) =>
          mapArray(items, (it) =>
            mapKey(it, "body", (body) => mapArray(body, bulletBlock)),
          ),
        ),
      ),
    ) as Record<string, unknown>),
    schemaVersion: 2,
  }),
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
