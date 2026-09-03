import { describe, expect, test } from "vitest";
import type { CVDocument } from "../schema/cv";
import { reducer, type Action } from "./reducer";

/** ids are hand-written so a test can name one; the app mints uuids */
const doc = (): CVDocument => ({
  schemaVersion: 3,
  name: "Matias",
  address: "",
  date: "2026-01-31",
  contacts: ["a", "b", "c", "d"].map((text) => ({ id: text, text, link: "" })),
  sections: [
    {
      id: "s1",
      label: "Experience",
      items: [
        {
          kind: "entry",
          id: "e1",
          variant: "job",
          title: "Dev",
          subtitle: "ACME",
          date: "",
          location: "",
          body: [
            {
              kind: "bullets",
              id: "blk1",
              items: [
                { id: "x", text: "one" },
                { id: "y", text: "two" },
              ],
            },
          ],
        },
      ],
    },
  ],
});

const contacts = (d: CVDocument) => d.contacts.map((c) => c.text).join("");

const bullets = (d: CVDocument) => {
  const it = d.sections[0].items[0];
  const b = "body" in it ? it.body[0] : undefined;
  return b?.kind === "bullets" ? b.items.map((x) => x.text) : [];
};

/** every `id` anywhere below v, however deep */
const ids = (v: unknown): string[] =>
  typeof v !== "object" || v === null
    ? []
    : Array.isArray(v)
      ? v.flatMap(ids)
      : Object.entries(v).flatMap(([k, x]) =>
          k === "id" && typeof x === "string" ? [x] : ids(x),
        );

const move = (from: number, to: number): Action => ({
  type: "list/move",
  list: { kind: "contacts" },
  from,
  to,
});

// --- list/move: `to` means "index after the removal" ---------------------
describe("list/move", () => {
  test("moving down lands where the index reads once the item is gone", () => {
    expect(contacts(reducer(doc(), move(0, 2)))).toBe("bcad");
  });

  test("moving up lands above the target", () => {
    expect(contacts(reducer(doc(), move(2, 0)))).toBe("cabd");
  });

  test("a drag ending where it started changes nothing, by identity", () => {
    const d0 = doc();
    expect(reducer(d0, move(1, 1))).toBe(d0);
  });

  test("out-of-range indices are ignored", () => {
    const d0 = doc();

    const outOfRange: [number, number][] = [
      [-1, 0],
      [0, 9],
      [9, 0],
    ];

    for (const [from, to] of outOfRange) {
      expect(reducer(d0, move(from, to)), `${from}→${to}`).toBe(d0);
    }
  });
});

// --- the list ref resolves any depth ------------------------------------
describe("list ref", () => {
  test("removing takes the named index", () => {
    const d = reducer(doc(), {
      type: "list/remove",
      list: { kind: "contacts" },
      index: 1,
    });

    expect(contacts(d)).toBe("acd");
  });

  test("a nested ref reaches the bullets inside an entry", () => {
    const d = reducer(doc(), {
      type: "list/remove",
      list: { kind: "bullets", blockId: "blk1" },
      index: 0,
    });

    expect(bullets(d)).toEqual(["two"]);
  });

  test("bullet/add honours `at`, and appends without it", () => {
    expect(
      bullets(reducer(doc(), { type: "bullet/add", blockId: "blk1", at: 1 })),
    ).toEqual(["one", "", "two"]);

    expect(
      bullets(reducer(doc(), { type: "bullet/add", blockId: "blk1" })),
    ).toEqual(["one", "two", ""]);
  });
});

// --- duplicates ---------------------------------------------------------
describe("duplicate", () => {
  test("a duplicate lands directly below its original", () => {
    const d = reducer(doc(), { type: "section/duplicate", index: 0 });

    expect(d.sections).toHaveLength(2);
    expect(d.sections[1].label).toBe("Experience");
  });

  test("a duplicate shares no id with its original, at any depth", () => {
    const d = reducer(doc(), {
      type: "item/duplicate",
      sectionId: "s1",
      index: 0,
    });
    const [original, copy] = d.sections[0].items;

    // factory.ts:78 — one shared id and editing the copy edits the original
    expect(ids(copy)).toHaveLength(ids(original).length);
    expect(ids(copy).filter((x) => ids(original).includes(x))).toEqual([]);
  });
});
// --- patches ------------------------------------------------------------

describe("patches", () => {
  test("a patch writes only its own fields", () => {
    const d = reducer(doc(), {
      type: "entry/update",
      id: "e1",
      patch: { title: "Senior Dev" },
    });
    const it = d.sections[0].items[0];

    expect(it.kind === "entry" && it.title).toBe("Senior Dev");
    expect(it.kind === "entry" && it.subtitle).toBe("ACME");
  });

  test("an action naming nothing real is a no-op, by identity", () => {
    const d0 = doc();
    const misses: Action[] = [
      { type: "item/add", sectionId: "nope", kind: "oneline" },
      { type: "bullet/add", blockId: "nope" },
      { type: "paragraph/update", id: "nope", text: "x" },
      {
        type: "list/remove",
        list: { kind: "items", sectionId: "nope" },
        index: 0,
      },
      { type: "bullet/update", blockId: "blk1", index: 9, text: "x" },
      { type: "oneline/update", id: "e1", patch: { content: "x" } }, // e1 is an entry
    ];

    for (const a of misses) {
      expect(reducer(d0, a), a.type).toBe(d0);
    }
  });
});
