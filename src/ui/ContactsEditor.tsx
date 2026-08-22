import type { ListRef } from "@/state/navigate";
import type { Contact } from "../schema/cv";
import { useDispatch } from "./dispatch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RowControls, SortableList } from "./Sortable";

const CONTACTS: ListRef = { kind: "contacts" };

export function ContactsEditor({ contacts }: { contacts: Contact[] }) {
  const dispatch = useDispatch();

  return (
    <div className="space-y-2">
      <SortableList list={CONTACTS} items={contacts} className="space-y-2">
        {(c, i) => (
          <div key={c.id} className="flex items-center gap-2">
            <Input
              className="w-28 shrink-0"
              placeholder="label"
              value={c.text}
              onChange={(e) =>
                dispatch({
                  type: "contact/update",
                  id: c.id,
                  patch: { text: e.target.value },
                })
              }
            />
            <Input
              className="min-w-0 flex-1"
              placeholder="link — optional"
              value={c.link}
              onChange={(e) =>
                dispatch({
                  type: "contact/update",
                  id: c.id,
                  patch: { link: e.target.value },
                })
              }
            />
            <RowControls list={CONTACTS} index={i} />
          </div>
        )}
      </SortableList>
      <Button
        variant="outline"
        size="xs"
        onClick={() => dispatch({ type: "contact/add" })}
      >
        + contact
      </Button>
    </div>
  );
}
