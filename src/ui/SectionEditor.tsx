import type { Section } from "../schema/cv";
import type { ListRef } from "../state/navigate";
import { useDispatch } from "./dispatch";
import { ListControls } from "./ListControls";
import { ItemEditor } from "./ItemEditor";
import { Button } from "../components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

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
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center gap-2">
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
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {section.items.map((it, i) => (
          <ItemEditor
            key={it.id}
            item={it}
            parent={items}
            index={i}
            length={section.items.length}
          />
        ))}
        <div className="flex flex-wrap gap-2">
          {(["entry", "oneline", "prose"] as const).map((kind) => (
            <Button
              key={kind}
              variant="outline"
              size="xs"
              onClick={() =>
                dispatch({ type: "item/add", sectionId: section.id, kind })
              }
            >
              + {kind}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
