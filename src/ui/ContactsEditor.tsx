import type { Contact } from "../schema/cv";
import { useDispatch } from "./dispatch";
import { ListControls } from "./ListControls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ContactsEditor({ contacts }: { contacts: Contact[] }) {
  const dispatch = useDispatch();

  return (
    <div className="space-y-2">
      {contacts.map((c, i) => (
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
          <ListControls
            list={{ kind: "contacts" }}
            index={i}
            length={contacts.length}
          />
        </div>
      ))}
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
