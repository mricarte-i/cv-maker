import { current, produce, type Draft } from "immer";
import type { Block, Contact, CVDocument, Item } from "../schema/cv";
import {
  copyItem,
  copySection,
  emptyBullet,
  emptyBullets,
  emptyContact,
  emptyItem,
  emptyParagraph,
  emptySection,
} from "../schema/factory";
import { block, item, list, section, type ListRef } from "./navigate";

export type EntryPatch = Partial<
  Omit<Extract<Item, { kind: "entry" }>, "kind" | "id" | "body">
>;

export type Action =
  | { type: "doc/replace"; doc: CVDocument }
  | { type: "doc/set"; field: "name" | "address" | "date"; value: string }

  // uniform — any list, any depth
  | { type: "list/remove"; list: ListRef; index: number }
  | { type: "list/move"; list: ListRef; from: number; to: number }

  // adds: each needs a different factory
  | { type: "contact/add"; at?: number }
  | { type: "section/add" }
  | { type: "item/add"; sectionId: string; kind: Item["kind"] }
  | { type: "block/add"; itemId: string; kind: Block["kind"]; at?: number }
  | { type: "bullet/add"; blockId: string; at?: number }

  // duplicates resolve their list directly, same reason the adds do
  | { type: "section/duplicate"; index: number }
  | { type: "item/duplicate"; sectionId: string; index: number }

  // patches: each carries a different shape
  | { type: "contact/update"; id: string; patch: Partial<Omit<Contact, "id">> }
  | { type: "section/update"; id: string; label: string }
  | { type: "entry/update"; id: string; patch: EntryPatch }
  | {
      type: "oneline/update";
      id: string;
      patch: Partial<Omit<Extract<Item, { kind: "oneline" }>, "kind" | "id">>;
    }
  | {
      type: "tags/update";
      id: string;
      patch: Partial<Omit<Extract<Item, { kind: "tags" }>, "kind" | "id">>;
    }
  | { type: "paragraph/update"; id: string; text: string }
  | { type: "bullet/update"; blockId: string; index: number; text: string };

const edit = produce(
  (doc: Draft<CVDocument>, a: Exclude<Action, { type: "doc/replace" }>) => {
    switch (a.type) {
      case "doc/set":
        doc[a.field] = a.value;
        break;
      case "list/remove":
        list(doc, a.list)?.splice(a.index, 1);
        break;
      case "list/move": {
        const l = list(doc, a.list);
        if (!l || a.from === a.to) {
          break;
        }
        if (a.from < 0 || a.to < 0 || a.from >= l.length || a.to >= l.length) {
          break;
        }
        l.splice(a.to, 0, ...l.splice(a.from, 1));
        break;
      }
      // adds resolve their list directly — pushing through `unknown[]` would let
      // an emptyContact() land in doc.sections without a complaint
      case "contact/add":
        doc.contacts.splice(a.at ?? doc.contacts.length, 0, emptyContact());
        break;
      case "section/add":
        doc.sections.push(emptySection());
        break;
      case "item/add":
        section(doc, a.sectionId)?.items.push(emptyItem(a.kind));
        break;
      case "block/add": {
        const it = item(doc, a.itemId);
        if (it && "body" in it) {
          const b = a.kind === "bullets" ? emptyBullets() : emptyParagraph();
          it.body.splice(a.at ?? it.body.length, 0, b);
        }
        break;
      }
      case "bullet/add": {
        const b = block(doc, a.blockId);
        if (b?.kind === "bullets") {
          b.items.splice(a.at ?? b.items.length, 0, emptyBullet());
        }
        break;
      }

      case "section/duplicate": {
        const s = doc.sections[a.index];
        if (s) {
          doc.sections.splice(a.index + 1, 0, copySection(current(s)));
        }
        break;
      }
      case "item/duplicate": {
        const items = section(doc, a.sectionId)?.items;
        const it = items?.[a.index];
        if (items && it) {
          items.splice(a.index + 1, 0, copyItem(current(it)));
        }
        break;
      }

      case "contact/update": {
        const c = doc.contacts.find((c) => c.id === a.id);
        if (c) {
          Object.assign(c, a.patch);
        }
        break;
      }
      case "section/update": {
        const s = section(doc, a.id);
        if (s) {
          s.label = a.label;
        }
        break;
      }
      case "entry/update": {
        const it = item(doc, a.id);
        if (it?.kind === "entry") {
          Object.assign(it, a.patch);
        }
        break;
      }
      case "oneline/update": {
        const it = item(doc, a.id);
        if (it?.kind === "oneline") {
          Object.assign(it, a.patch);
        }
        break;
      }
      case "paragraph/update": {
        const b = block(doc, a.id);
        if (b?.kind === "paragraph") {
          b.text = a.text;
        }
        break;
      }
      case "bullet/update": {
        const b = block(doc, a.blockId);
        if (b?.kind === "bullets") {
          const bullet = b.items[a.index];
          if (bullet) {
            bullet.text = a.text;
          }
        }
        break;
      }
      case "tags/update": {
        const it = item(doc, a.id);
        if (it?.kind === "tags") {
          Object.assign(it, a.patch);
        }
        break;
      }

      default:
        a satisfies never;
    }
  },
);

export const reducer = (doc: CVDocument, a: Action): CVDocument =>
  a.type === "doc/replace" ? a.doc : edit(doc, a);
