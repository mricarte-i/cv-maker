import type { Section } from "../schema/cv";
import type { ListRef } from "../state/navigate";
import { useDispatch } from "./dispatch";
import { ListControls } from "./ListControls";
import { ItemEditor } from "./ItemEditor";
import { Button } from "../components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader } from "@/components/ui/card";

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
    <Card style={{ marginBottom: 12 }}>
      <CardHeader style={{ display: "flex", gap: 4 }}>
        <Input
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
      </CardHeader>

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
        <Button
          key={kind}
          onClick={() =>
            dispatch({ type: "item/add", sectionId: section.id, kind })
          }
        >
          + {kind}
        </Button>
      ))}
    </Card>
  );
}
