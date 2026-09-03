import { describe, expect, test } from "vitest";
import type { CVDocument } from "../schema/cv";
import { coalesceKey, historyReducer } from "./history";
import type { Action } from "./reducer";

const doc = (name: string): CVDocument => ({
  schemaVersion: 3,
  name,
  address: "",
  date: "2026-01-31",
  contacts: [],
  sections: [],
});

/** the cheapest real edit: one field, no lookup, no factory */
const set = (value: string): Action => ({
  type: "doc/set",
  field: "name",
  value,
});

/** `State` is module-private, and does not need exporting just to be named */
type State = ReturnType<typeof historyReducer>;
const start = (name = ""): State => ({ past: [], doc: doc(name), future: [] });
const editWith = (action: Action, merge = false) =>
  ({ type: "history/edit", action, merge }) as const;

// --- coalesceKey: what counts as one undo -------------------------------
describe("coalesceKey", () => {
  test("typing into one field coalesces, a different field does not", () => {
    expect(coalesceKey(set("Mat"))).toBe(coalesceKey(set("Mati")));

    expect(coalesceKey(set("Mat"))).not.toBe(
      coalesceKey({ type: "doc/set", field: "address", value: "Buenos Aires" }),
    );
  });

  test("the variant chip is a step, not typing", () => {
    expect(
      coalesceKey({ type: "entry/update", id: "e1", patch: { title: "Dev" } }),
    ).toBe("entry:e1:title");

    expect(
      coalesceKey({
        type: "entry/update",
        id: "e1",
        patch: { variant: "project" },
      }),
    ).toBeNull();
  });

  test("a tags title coalesces, its pills do not", () => {
    expect(
      coalesceKey({
        type: "tags/update",
        id: "t1",
        patch: { title: "Skills" },
      }),
    ).toBe("tags:t1");

    expect(
      coalesceKey({ type: "tags/update", id: "t1", patch: { items: [] } }),
    ).toBeNull();
  });

  test("the patch key does not depend on field order", () => {
    expect(
      coalesceKey({
        type: "contact/update",
        id: "c1",
        patch: { text: "github", link: "https://…" },
      }),
    ).toBe(
      coalesceKey({
        type: "contact/update",
        id: "c1",
        patch: { link: "https://…", text: "github" },
      }),
    );
  });

  test("structural actions always start a fresh entry", () => {
    const structural: Action[] = [
      { type: "section/add" },
      { type: "list/move", list: { kind: "sections" }, from: 0, to: 1 },
      { type: "list/remove", list: { kind: "sections" }, index: 0 },
      { type: "section/duplicate", index: 0 },
      { type: "bullet/add", blockId: "b1" },
      { type: "doc/replace", doc: doc("someone else") },
    ];

    for (const a of structural) {
      expect(coalesceKey(a), a.type).toBeNull();
    }
  });
});

// --- historyReducer: the stack ------------------------------------------
describe("historyReducer", () => {
  test("an unmerged edit pushes an entry, a merged one lands in place", () => {
    const s1 = historyReducer(start(), editWith(set("M")));
    const s2 = historyReducer(s1, editWith(set("Ma"), true));

    expect(s1.past).toHaveLength(1);
    expect(s2.past).toHaveLength(1);
    expect(s2.past[0].name).toBe(""); // still the document from before typing
    expect(s2.doc.name).toBe("Ma");
  });

  test("writing an identical value never reaches the history", () => {
    const s0 = start("Matias");
    // immer hands back the base object, so historyReducer bails before pushing
    expect(historyReducer(s0, editWith(set("Matias")))).toBe(s0);
  });

  test("the past is capped at 100 entries, oldest first off", () => {
    let s = start();
    for (let i = 0; i < 150; i++) {
      s = historyReducer(s, editWith(set(`n${i}`)));
    }

    expect(s.past).toHaveLength(100);
    expect(s.past[0].name).toBe("n49");
  });

  test("undo restores the exact previous object, redo the exact next one", () => {
    const s0 = start();
    const s1 = historyReducer(s0, editWith(set("a")));
    const s2 = historyReducer(s1, { type: "history/undo" });
    const s3 = historyReducer(s2, { type: "history/redo" });

    expect(s2.doc).toBe(s0.doc);
    expect(s3.doc).toBe(s1.doc);
  });

  test("a new edit drops the redo stack", () => {
    let s = historyReducer(start(), editWith(set("a")));
    s = historyReducer(s, { type: "history/undo" });
    expect(s.future).toHaveLength(1);

    s = historyReducer(s, editWith(set("b")));
    expect(s.future).toHaveLength(0);
  });

  test("undo and redo at either end are no-ops", () => {
    const s = start();
    expect(historyReducer(s, { type: "history/undo" })).toBe(s);
    expect(historyReducer(s, { type: "history/redo" })).toBe(s);
  });
});
