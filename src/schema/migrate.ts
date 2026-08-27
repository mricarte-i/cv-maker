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
/** v2 → v3: a oneline whose content is a comma list was always a tag list */
const tagItem = (it: unknown): unknown => {
  if (
    typeof it !== "object" ||
    it === null ||
    (it as { kind?: unknown }).kind !== "oneline"
  ) {
    return it;
  }

  const { content, ...rest } = it as { content?: unknown };
  if (typeof content !== "string" || !content.includes(",")) {
    return it; // "Spanish / Native" stays a oneline
  }

  return {
    ...rest,
    kind: "tags",
    items: content
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((text) => ({ id: newId(), text })),
  };
};

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
  2: (doc) => ({
    ...(mapKey(doc, "sections", (ss) =>
      mapArray(ss, (s) =>
        mapKey(s, "items", (items) => mapArray(items, tagItem)),
      ),
    ) as Record<string, unknown>),
    schemaVersion: 3,
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
