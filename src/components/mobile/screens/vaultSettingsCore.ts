/** Pure model of the mobile vault settings page — node-testable, no React. */
import type { VaultMenuAction } from "@/components/vault-admin/vaultMenuItems";
import type { MembersPanel } from "@/stores/uiStore";
import type { VaultSettingsPage } from "@/stores/mobileNavCore";

export type VaultSettingsSectionId = "general" | "people" | "danger";

/** One row of the page: the vault name field, a sub-page, or a destructive dialog. */
export type VaultSettingsRow =
  | { id: "name"; editable: boolean }
  | { id: VaultSettingsPage }
  | { id: "makePrivate" | "delete" | "leave" };

export interface VaultSettingsSection {
  id: VaultSettingsSectionId;
  rows: VaultSettingsRow[];
}

const PEOPLE: VaultSettingsPage[] = ["share", "members", "roles", "security"];
const DANGER = ["makePrivate", "delete", "leave"] as const;

/**
 * The page's sections, from the same gated action list as the desktop vault menu
 * (`vaultMenuActions`), so the two can never disagree about what a viewer may do.
 * The name is always shown: read-only when the viewer may not rename the vault.
 * A section with nothing in it is left out.
 */
export function vaultSettingsSections(actions: VaultMenuAction[]): VaultSettingsSection[] {
  const has = (a: VaultMenuAction) => actions.includes(a);
  const sections: VaultSettingsSection[] = [
    { id: "general", rows: [{ id: "name", editable: has("rename") }] },
    { id: "people", rows: PEOPLE.filter(has).map((id) => ({ id })) },
    { id: "danger", rows: DANGER.filter(has).map((id) => ({ id })) },
  ];
  return sections.filter((s) => s.rows.length > 0);
}

/** The vault settings sub-page that stands in for a Members side panel on the phone. */
export function membersPanelPage(panel: MembersPanel): VaultSettingsPage {
  return panel === "invite" ? "share" : panel;
}
