import type { Section } from "../schema/cv";
import type { ListRef } from "../state/navigate";
import { useDispatch } from "./dispatch";
import { ItemEditor } from "./ItemEditor";
import { Button } from "../components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RowControls, SortableList } from "./Sortable";

import { cn } from "@/lib/utils";

export function SectionEditor({
  section,
  index,
}: {
  section: Section;
  index: number;
}) {
  const dispatch = useDispatch();
  const items: ListRef = { kind: "items", sectionId: section.id };

  return (
    <Card className="border [--card-spacing:--spacing(3)]">
      <CardHeader>
        <div className="flex items-start gap-2">
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
            className="h-10 text-lg font-bold md:text-lg"
          />
          <RowControls list={{ kind: "sections" }} index={index} />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <SortableList list={items} items={section.items} className="space-y-3">
          {(it, i) => <ItemEditor item={it} parent={items} index={i} />}
        </SortableList>

        <div className="flex flex-wrap gap-2 border p-1 bg-muted/40">
          {(["entry", "oneline", "tags", "prose"] as const).map((kind) => (
            <Button
              key={kind}
              variant="outline"
              size="xs"
              onClick={() =>
                dispatch({ type: "item/add", sectionId: section.id, kind })
              }
              className={
                kind === "entry"
                  ? cn(
                      "bg-black/40 text-primary-foreground",
                      "hover:bg-chart-2 hover:text-primary-foreground",
                    )
                  : ""
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
