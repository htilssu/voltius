import { useRef, useState } from "react";
import { useCloseWhenGone } from "./useCloseWhenGone";

/**
 * The object a mobile edit screen is editing. A create screen starts with no id; its
 * first autosave creates the object and `onCreated` switches the screen to editing it, so
 * later passes update that object instead of minting duplicates (mirrors desktop
 * HostsPage.handleSubmit). The screen closes once the object leaves the list.
 *
 * `gone`: the object was shown and has since disappeared (deleted from ⋮, access
 * revoked). A save must then be dropped, or the unmount flush would re-create it. A
 * create still in flight (id set, not in the list yet) is not gone.
 */
export function useEditedItem<T extends { id: string }>(items: readonly T[], initialId: string | undefined, close: () => void) {
  const [editingId, setEditingId] = useState(initialId);
  const editing = editingId ? items.find((i) => i.id === editingId) ?? null : null;
  const seen = useRef<string | null>(null);
  if (editing) seen.current = editing.id;
  useCloseWhenGone(editingId, editing !== null, close);
  return {
    editing,
    gone: !!editingId && !editing && seen.current === editingId,
    onCreated: (created: { id: string }) => setEditingId(created.id),
  };
}
