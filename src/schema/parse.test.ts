import { expect, test } from "vitest";
import v1 from "../../sample/content-en.json";
import { SCHEMA_VERSION } from "./cv";
import { migrate } from "./migrate";
import { parseDocument } from "./parse";

test("the committed v1 sample migrates all the way and parses", () => {
  const r = parseDocument(v1);
  expect(r.ok).toBe(true);
  if (!r.ok) {
    throw new Error(r.error); // surfaces the zod message on failure
  }
  expect(r.doc.schemaVersion).toBe(SCHEMA_VERSION);
});

test("v1 bullet strings became { id, text }", () => {
  const r = parseDocument(v1);
  if (!r.ok) {
    throw new Error(r.error);
  }
  const bullets = r.doc.sections
    .flatMap((s) => s.items)
    .flatMap((it) => ("body" in it ? it.body : []))
    .filter((b) => b.kind === "bullets")
    .flatMap((b) => b.items);

  expect(bullets.length).toBeGreaterThan(0); // otherwise the assert below is vacuous
  for (const b of bullets) {
    expect(typeof b.text).toBe("string");
  }
});

test("migration is idempotent at the current version", () => {
  const once = migrate(v1);
  expect(migrate(once)).toEqual(once);
});

test("garbage reaches zod instead of throwing", () => {
  const r = parseDocument({ schemaVersion: 1, sections: "not an array" });
  expect(r.ok).toBe(false); // mapArray's pass-through, not an exception
});
