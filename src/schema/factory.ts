import { SCHEMA_VERSION, type Block, type Item, type CVDocument } from "./cv";

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
