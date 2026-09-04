import { expect, test } from "vitest";
import { emptyDocument } from "../schema/factory";
import {
  ADOPTED_LABEL,
  bootPlan,
  byRecent,
  copyLabel,
  type CVRecord,
} from "./library.ts";

const rec = (id: string, label: string, updatedAt: number): CVRecord => ({
  id,
  label,
  updatedAt,
  doc: emptyDocument(),
});

test("byRecent puts the most recently edited first", () => {
  const out = byRecent([
    rec("a", "A", 10),
    rec("c", "C", 30),
    rec("b", "B", 20),
  ]);

  expect(out.map((r) => r.id)).toEqual(["c", "b", "a"]);
});

test("byRecent does not mutate its input", () => {
  const input = [rec("a", "A", 10), rec("b", "B", 20)];

  byRecent(input);
  expect(input.map((r) => r.id)).toEqual(["a", "b"]);
});

test("a copy is named after its original", () => {
  expect(copyLabel("Frontend")).toBe("Frontend copy");
  expect(copyLabel("Frontend copy")).toBe("Frontend copy copy");
});

test("a stored pointer means load that record", () => {
  expect(bootPlan("abc", null)).toEqual({ kind: "load", id: "abc" });
});

test("no pointer but a legacy document means adopt it", () => {
  const doc = emptyDocument();

  expect(bootPlan(null, doc)).toEqual({ kind: "adopt", doc });
});

test("the pointer wins even when a legacy document is still lying around", () => {
  // the delete after adopting could have failed; the pointer is the truth
  expect(bootPlan("abc", emptyDocument())).toEqual({ kind: "load", id: "abc" });
});

test("nothing stored means create", () => {
  expect(bootPlan(null, null)).toEqual({ kind: "create" });
});
