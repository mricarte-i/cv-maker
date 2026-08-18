import type { Block, CVDocument, Contact, Item } from "../schema/cv";
import {
  emptyBullets,
  emptyContact,
  emptyItem,
  emptyParagraph,
  emptySection,
} from "../schema/factory";

export type Action =
  | { type: "doc/replace"; doc: CVDocument }
  | { type: "doc/set"; field: "name" | "address" | "date"; value: string }
  | { type: "contact/add" }
  | { type: "contact/update"; id: string; patch: Partial<Omit<Contact, "id">> }
  | { type: "contact/remove"; id: string }
  | { type: "contact/move"; from: number; to: number }
  | { type: "section/add" }
  | { type: "section/label"; id: string; label: string }
  | { type: "section/remove"; id: string }
  | { type: "section/move"; from: number; to: number }
  | { type: "item/add"; sectionId: string; kind: Item["kind"] }
  | { type: "item/remove"; sectionId: string; id: string }
  | { type: "item/move"; sectionId: string; from: number; to: number }
  | {
      type: "entry/update";
      id: string;
      patch: Partial<
        Omit<Extract<Item, { kind: "entry" }>, "kind" | "id" | "body">
      >;
    }
  | {
      type: "oneline/update";
      id: string;
      patch: Partial<Omit<Extract<Item, { kind: "oneline" }>, "kind" | "id">>;
    }
  | { type: "block/add"; itemId: string; kind: Block["kind"] }
  | { type: "block/remove"; itemId: string; id: string }
  | { type: "block/move"; itemId: string; from: number; to: number }
  | { type: "paragraph/update"; id: string; text: string }
  | { type: "bullet/add"; blockId: string }
  | { type: "bullet/update"; blockId: string; index: number; text: string }
  | { type: "bullet/remove"; blockId: string; index: number }
  | { type: "bullet/move"; blockId: string; from: number; to: number };

const move = <T>(arr: T[], from: number, to: number): T[] => {
  if (from === to) return arr;
  if (from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const next = arr.slice();
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
};

const byId = <T extends { id: string }>(
  arr: T[],
  id: string,
  fn: (x: T) => T,
): T[] => arr.map((x) => (x.id === id ? fn(x) : x));

/** items of one section */
const mapItems = (
  doc: CVDocument,
  sectionId: string,
  fn: (items: Item[]) => Item[],
): CVDocument => ({
  ...doc,
  sections: byId(doc.sections, sectionId, (s) => ({
    ...s,
    items: fn(s.items),
  })),
});

/** any item, anywhere */
const mapItem = (
  doc: CVDocument,
  id: string,
  fn: (it: Item) => Item,
): CVDocument => ({
  ...doc,
  sections: doc.sections.map((s) => ({ ...s, items: byId(s.items, id, fn) })),
});

/** body of any item that has one (entry | prose) */
const mapBody = (
  doc: CVDocument,
  itemId: string,
  fn: (bs: Block[]) => Block[],
): CVDocument =>
  mapItem(doc, itemId, (it) =>
    it.kind === "oneline" ? it : { ...it, body: fn(it.body) },
  );

/** any block, anywhere */
const mapBlock = (
  doc: CVDocument,
  id: string,
  fn: (b: Block) => Block,
): CVDocument => ({
  ...doc,
  sections: doc.sections.map((s) => ({
    ...s,
    items: s.items.map((it) =>
      it.kind === "oneline" ? it : { ...it, body: byId(it.body, id, fn) },
    ),
  })),
});

export function reducer(doc: CVDocument, a: Action): CVDocument {
  switch (a.type) {
    case "doc/replace":
      return a.doc;
    case "doc/set":
      return { ...doc, [a.field]: a.value };

    case "contact/add":
      return { ...doc, contacts: [...doc.contacts, emptyContact()] };
    case "contact/update":
      return {
        ...doc,
        contacts: byId(doc.contacts, a.id, (c) => ({ ...c, ...a.patch })),
      };
    case "contact/remove":
      return { ...doc, contacts: doc.contacts.filter((c) => c.id !== a.id) };
    case "contact/move":
      return { ...doc, contacts: move(doc.contacts, a.from, a.to) };

    case "section/add":
      return { ...doc, sections: [...doc.sections, emptySection()] };
    case "section/label":
      return {
        ...doc,
        sections: byId(doc.sections, a.id, (s) => ({ ...s, label: a.label })),
      };
    case "section/remove":
      return { ...doc, sections: doc.sections.filter((s) => s.id !== a.id) };
    case "section/move":
      return { ...doc, sections: move(doc.sections, a.from, a.to) };

    case "item/add":
      return mapItems(doc, a.sectionId, (items) => [
        ...items,
        emptyItem(a.kind),
      ]);
    case "item/remove":
      return mapItems(doc, a.sectionId, (items) =>
        items.filter((it) => it.id !== a.id),
      );
    case "item/move":
      return mapItems(doc, a.sectionId, (items) => move(items, a.from, a.to));
    case "entry/update":
      return mapItem(doc, a.id, (it) =>
        it.kind === "entry" ? { ...it, ...a.patch } : it,
      );
    case "oneline/update":
      return mapItem(doc, a.id, (it) =>
        it.kind === "oneline" ? { ...it, ...a.patch } : it,
      );

    case "block/add":
      return mapBody(doc, a.itemId, (bs) => [
        ...bs,
        a.kind === "bullets" ? emptyBullets() : emptyParagraph(),
      ]);
    case "block/remove":
      return mapBody(doc, a.itemId, (bs) => bs.filter((b) => b.id !== a.id));
    case "block/move":
      return mapBody(doc, a.itemId, (bs) => move(bs, a.from, a.to));
    case "paragraph/update":
      return mapBlock(doc, a.id, (b) =>
        b.kind === "paragraph" ? { ...b, text: a.text } : b,
      );

    case "bullet/add":
      return mapBlock(doc, a.blockId, (b) =>
        b.kind === "bullets" ? { ...b, items: [...b.items, ""] } : b,
      );
    case "bullet/update":
      return mapBlock(doc, a.blockId, (b) =>
        b.kind === "bullets"
          ? { ...b, items: b.items.map((t, i) => (i === a.index ? a.text : t)) }
          : b,
      );
    case "bullet/remove":
      return mapBlock(doc, a.blockId, (b) =>
        b.kind === "bullets"
          ? { ...b, items: b.items.filter((_, i) => i !== a.index) }
          : b,
      );
    case "bullet/move":
      return mapBlock(doc, a.blockId, (b) =>
        b.kind === "bullets" ? { ...b, items: move(b.items, a.from, a.to) } : b,
      );
  }
}
