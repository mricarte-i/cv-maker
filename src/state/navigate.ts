import type { Draft } from "immer";
import type { CVDocument } from "../schema/cv";

export type ListRef =
  | { kind: "contacts" }
  | { kind: "sections" }
  | { kind: "items"; sectionId: string }
  | { kind: "blocks"; itemId: string }
  | { kind: "bullets"; blockId: string };

export const section = (doc: Draft<CVDocument>, id: string) =>
  doc.sections.find((s) => s.id === id);

export const item = (doc: Draft<CVDocument>, id: string) => {
  for (const s of doc.sections) {
    const it = s.items.find((i) => i.id === id);
    if (it) return it;
  }
};

export const block = (doc: Draft<CVDocument>, id: string) => {
  for (const s of doc.sections) {
    for (const it of s.items) {
      if (it.kind === "oneline") continue;
      const b = it.body.find((x) => x.id === id);
      if (b) return b;
    }
  }
};

/** element type is deliberately erased: move/remove don't care what's in the list */
export const list = (
  doc: Draft<CVDocument>,
  ref: ListRef,
): unknown[] | undefined => {
  switch (ref.kind) {
    case "contacts":
      return doc.contacts;
    case "sections":
      return doc.sections;
    case "items":
      return section(doc, ref.sectionId)?.items;
    case "blocks": {
      const it = item(doc, ref.itemId);
      return it && it.kind !== "oneline" ? it.body : undefined;
    }
    case "bullets": {
      const b = block(doc, ref.blockId);
      return b?.kind === "bullets" ? b.items : undefined;
    }
  }
};
