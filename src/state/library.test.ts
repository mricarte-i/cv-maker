import { expect, test } from "vitest";
import { emptyDocument } from "../schema/factory";
import {
  bootPlan,
  byRecent,
  copyLabel,
  cut,
  hit,
  matches,
  strings,
  tokenize,
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

const doc = () => ({
  ...emptyDocument(),
  name: "Matias Ricarte",
  sections: [
    {
      id: "s1",
      label: "Experience",
      items: [
        {
          kind: "entry" as const,
          id: "e1",
          variant: "project" as const,
          title: "Ticker engine",
          subtitle: "Flowics",
          date: "2021",
          location: "Argentina",
          body: [
            {
              kind: "bullets" as const,
              id: "b1",
              items: [{ id: "x", text: "Rewrote the hooks in React" }],
            },
          ],
        },
      ],
    },
  ],
});

test("strings harvests human text, one entry per field", () => {
  const out = strings(doc());

  expect(out).toContain("Matias Ricarte");
  expect(out).toContain("Ticker engine");
  expect(out).toContain("Rewrote the hooks in React");
});

test("strings skips ids, kinds and variants", () => {
  const out = strings(doc());

  // without these skips, searching "project" or "entry" matches every CV
  expect(out).not.toContain("project");
  expect(out).not.toContain("entry");
  expect(out).not.toContain("e1");
  expect(out).not.toContain("s1");
});

test("tokenize splits on whitespace and drops empties", () => {
  expect(tokenize("  react   hooks ")).toEqual(["react", "hooks"]);
  expect(tokenize("   ")).toEqual([]);
});

test("every token must appear, order does not matter", () => {
  const fields = strings(doc());

  expect(matches(fields, tokenize("react hooks"))).toBe(true);
  expect(matches(fields, tokenize("hooks react"))).toBe(true);
  expect(matches(fields, tokenize("react kotlin"))).toBe(false);
});

test("tokens may live in different fields", () => {
  const fields = strings(doc());

  expect(matches(fields, tokenize("react flowics"))).toBe(true);
});

test("an empty query matches everything", () => {
  expect(matches(strings(doc()), tokenize(""))).toBe(true);
});

test("matching is case-insensitive", () => {
  expect(matches(strings(doc()), tokenize("REACT"))).toBe(true);
});

test("hit returns the first field holding the token", () => {
  expect(hit(strings(doc()), "hooks")).toBe("Rewrote the hooks in React");
  expect(hit(strings(doc()), "kotlin")).toBeNull();
});

test("cut windows around the match and splits it into three", () => {
  const c = cut("Rewrote the hooks in React", "hooks", 4);

  expect(c.before).toBe("…the ");
  expect(c.match).toBe("hooks");
  expect(c.after).toBe(" in …");
});

test("cut keeps the real casing of the match, not the query's", () => {
  expect(cut("Rewrote in React", "react").match).toBe("React");
});

test("cut does not put an ellipsis on an edge it did not trim", () => {
  const c = cut("React", "react", 30);

  expect(c.before).toBe("");
  expect(c.after).toBe("");
});
