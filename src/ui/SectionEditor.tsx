import type { Section } from "../schema/cv";
import type { ListRef } from "../state/navigate";
import { useDispatch } from "./dispatch";
import { ListControls } from "./ListControls";
import { ItemEditor } from "./ItemEditor";

export function SectionEditor({
  section,
  index,
  length,
}: {
  section: Section;
  index: number;
  length: number;
}) {
  const dispatch = useDispatch();
  const items: ListRef = { kind: "items", sectionId: section.id };

  return (
    <fieldset style={{ marginBottom: 12 }}>
      <legend style={{ display: "flex", gap: 4 }}>
        <input
          placeholder="section label"
          value={section.label}
          onChange={(e) =>
            dispatch({
              type: "section/update",
              id: section.id,
              label: e.target.value,
            })
          }
        />
        <ListControls
          list={{ kind: "sections" }}
          index={index}
          length={length}
        />
      </legend>

      {section.items.map((it, i) => (
        <ItemEditor
          key={it.id}
          item={it}
          parent={items}
          index={i}
          length={section.items.length}
        />
      ))}

      {(["entry", "oneline", "prose"] as const).map((kind) => (
        <button
          key={kind}
          onClick={() =>
            dispatch({ type: "item/add", sectionId: section.id, kind })
          }
        >
          + {kind}
        </button>
      ))}
    </fieldset>
  );
}
