import type { ListRef } from "@/state/navigate";
import type { Contact } from "../schema/cv";
import { cn } from "@/lib/utils";
import { useDispatch } from "./dispatch";
import { Input } from "@/components/ui/input";
import { DragHandle, RowDelete, SortableList } from "./Sortable";
import { AddButton, FIELD, Mark, Row, TEXT } from "./Row";

const CONTACTS: ListRef = { kind: "contacts" };

export function ContactsEditor({ contacts }: { contacts: Contact[] }) {
  const dispatch = useDispatch();

  return (
    <div>
      <SortableList list={CONTACTS} items={contacts}>
        {(c, i) => (
          <Row
            marker={<DragHandle marker={<Mark>@</Mark>} />}
            end={<RowDelete list={CONTACTS} index={i} />}
          >
            <div className="flex min-w-0 items-baseline gap-2">
              <Input
                className={cn("h-7 w-28 shrink-0 font-medium", TEXT, FIELD)}
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
                className={cn("h-7 min-w-0 flex-1", TEXT, FIELD)}
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
            </div>
          </Row>
        )}
      </SortableList>

      <div className="pl-6">
        <AddButton onClick={() => dispatch({ type: "contact/add" })}>
          + contact
        </AddButton>
      </div>
    </div>
  );
}
