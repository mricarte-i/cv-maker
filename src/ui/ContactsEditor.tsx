import type { ListRef } from "@/state/navigate";
import type { Contact } from "../schema/cv";
import { cn } from "@/lib/utils";
import { useDispatch } from "./dispatch";
import { Input } from "@/components/ui/input";
import { DragHandle, RowMenu, SortableList } from "./Sortable";
import { AddButton, FIELD, LABEL, Mark, Row, SLOTS, TEXT } from "./Row";
import { focusAfterRender, rowKey, useFocusClaim } from "./focus";

const CONTACTS: ListRef = { kind: "contacts" };

// contacts have no parent id — a literal namespace can't collide with a uuid
const KEY = "contacts";

function ContactRow({
  contact,
  index,
  count,
}: {
  contact: Contact;
  index: number;
  count: number;
}) {
  const dispatch = useDispatch();
  const ref = useFocusClaim<HTMLInputElement>(rowKey(KEY, index));

  const set = (patch: Partial<Omit<Contact, "id">>) =>
    dispatch({ type: "contact/update", id: contact.id, patch });

  //TODO: very similar to onKeyDown in BlockEditor...
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      dispatch({ type: "contact/add", at: index + 1 });
      focusAfterRender(rowKey(KEY, index + 1));
      return;
    }
    // backspace on empty contact content + empty label > delete contact
    if (e.key === "Backspace" && contact.text === "" && contact.link === "") {
      e.preventDefault();
      dispatch({ type: "list/remove", list: CONTACTS, index });
      // nothing to hand the caret to if that was the last one
      if (count > 1) {
        focusAfterRender(rowKey(KEY, Math.max(0, index - 1)));
      }
    }
  };

  return (
    <Row marker={<DragHandle marker={<Mark>@</Mark>} />} end={<RowMenu />}>
      <div className={SLOTS}>
        <Input
          ref={ref}
          className={cn("h-7 font-medium", LABEL, TEXT, FIELD)}
          placeholder="label"
          value={contact.text}
          onKeyDown={onKeyDown}
          onChange={(e) => set({ text: e.target.value })}
        />
        <Input
          className={cn("h-7 min-w-0 flex-1", TEXT, FIELD)}
          placeholder="link — optional"
          value={contact.link}
          onKeyDown={onKeyDown}
          onChange={(e) => set({ link: e.target.value })}
        />
      </div>
    </Row>
  );
}

export function ContactsEditor({ contacts }: { contacts: Contact[] }) {
  const dispatch = useDispatch();

  return (
    <div>
      <SortableList list={CONTACTS} items={contacts}>
        {(c, i) => <ContactRow contact={c} index={i} count={contacts.length} />}
      </SortableList>

      <div className="pl-6">
        <AddButton onClick={() => dispatch({ type: "contact/add" })}>
          + contact
        </AddButton>
      </div>
    </div>
  );
}
