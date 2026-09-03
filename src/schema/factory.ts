import {
  SCHEMA_VERSION,
  type Block,
  type Item,
  type CVDocument,
  type Section,
  type Contact,
  type Bullet,
  type Tag,
} from "./cv";

// ASSUMES HTTPS OR localhost
export const newId = () => crypto.randomUUID();

export const emptyParagraph = (): Block => ({
  kind: "paragraph",
  id: newId(),
  text: "",
});

export const emptyItem = (kind: Item["kind"]): Item => {
  switch (kind) {
    case "entry":
      return {
        kind,
        id: newId(),
        variant: "job",
        title: "",
        subtitle: "",
        date: "",
        location: "",
        body: [emptyParagraph()],
      };
    case "oneline":
      return { kind, id: newId(), title: "", content: "" };
    case "prose":
      return { kind, id: newId(), body: [emptyParagraph()] };
    case "tags":
      return { kind, id: newId(), title: "", items: [] };
  }
};

export const emptyDocument = (): CVDocument => ({
  schemaVersion: SCHEMA_VERSION,
  name: "",
  address: "",
  date: new Date().toISOString().slice(0, 10),
  contacts: [],
  sections: [{ id: newId(), label: "About", items: [emptyItem("prose")] }],
});

export const emptyTag = (): Tag => ({ id: newId(), text: "" });

export const emptyBullet = (): Bullet => ({ id: newId(), text: "" });

export const emptyBullets = (): Block => ({
  kind: "bullets",
  id: newId(),
  items: [emptyBullet()],
});

export const emptyContact = (): Contact => ({
  id: newId(),
  text: "",
  link: "",
});

export const emptySection = (): Section => ({
  id: newId(),
  label: "",
  items: [],
});

const copyBlock = (b: Block): Block =>
  b.kind === "paragraph"
    ? { ...b, id: newId() }
    : { ...b, id: newId(), items: b.items.map((x) => ({ ...x, id: newId() })) };

/** a copy has to remint every id: React keys and navigate() both look rows up
    by id, so a duplicate sharing them would silently edit the original */
export const copyItem = (it: Item): Item => {
  const base = { ...it, id: newId() };
  if ("body" in base) {
    return { ...base, body: base.body.map(copyBlock) };
  }
  if (base.kind === "tags") {
    return { ...base, items: base.items.map((t) => ({ ...t, id: newId() })) };
  }
  return base;
};

export const copySection = (s: Section): Section => ({
  ...s,
  id: newId(),
  items: s.items.map(copyItem),
});
