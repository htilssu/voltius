import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { ToolbarViewControls } from "@/components/shared/ToolbarViewControls";
import type { LayoutMode, SortMode } from "@/components/shared/ToolbarViewControls";
import type { MembersPanel } from "@/stores/uiStore";
import { GREYED_CLASS, useGreyedUnless, type Greyed } from "@/hooks/useGreyedUnless";
import { CountBadge } from "@/components/notifications/CountBadge";

export interface MembersToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  layoutMode: LayoutMode;
  onLayoutModeChange: (v: LayoutMode) => void;
  sortMode: SortMode;
  onSortModeChange: (v: SortMode) => void;
  canInvite: boolean;
  activePanel: MembersPanel | "detail" | null;
  onTogglePanel: (panel: MembersPanel) => void;
  pendingCount?: number;
  canManageRoles?: boolean;
  canManageVault?: boolean;
  selectedCount: number;
  vaultTabs?: { id: string; name: string }[];
  primaryVaultId: string | null;
  onSelectVault: (id: string) => void;
}

export function MembersToolbar({
  search, onSearchChange,
  layoutMode, onLayoutModeChange,
  sortMode, onSortModeChange,
  canInvite, activePanel, onTogglePanel,
  pendingCount,
  canManageRoles, canManageVault,
  selectedCount,
  vaultTabs, primaryVaultId, onSelectVault,
}: MembersToolbarProps) {
  const { t } = useTranslation();
  const greyedUnless = useGreyedUnless();
  return (
    <div
      className="flex flex-wrap items-center gap-2 px-5 py-2.5 shrink-0"
      style={{ borderBottom: "1px solid var(--t-border)", background: "var(--t-bg-toolbar)" }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {vaultTabs && vaultTabs.length > 1 && (
          <div className="flex items-center gap-1 shrink-0">
            {vaultTabs.map(({ id, name }) => (
              <button
                key={id}
                onClick={() => onSelectVault(id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${id === primaryVaultId ? "bg-(--t-accent) text-(--t-on-accent)" : "bg-(--t-bg-elevated) text-(--t-text-dim) hover:text-(--t-text-primary)"}`}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        <ToolbarViewControls
          search={search}
          onSearchChange={onSearchChange}
          filterPlaceholder={t("members.toolbar.filterPlaceholder")}
          filterShortcutId="filter"
          layoutMode={layoutMode}
          onLayoutModeChange={onLayoutModeChange}
          sortMode={sortMode}
          onSortModeChange={onSortModeChange}
          extraSortOptions={[{ value: "role-asc", label: t("members.toolbar.sortByRole"), icon: "lucide:shield" }]}
          filterWidth={176}
        />
      </div>

      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        {selectedCount > 1 && (
          <span className="text-xs text-(--t-text-dim) shrink-0">
            {t("members.toolbar.selectedCount", { count: selectedCount })}
          </span>
        )}

        {canManageVault !== undefined && (
          <PanelButton active={activePanel === "security"} icon="lucide:shield-check" label={t("members.security.button")} onClick={() => onTogglePanel("security")} {...greyedUnless(canManageVault)} />
        )}
        {canManageRoles !== undefined && (
          <PanelButton active={activePanel === "roles"} icon="lucide:shield" label={t("members.roles")} onClick={() => onTogglePanel("roles")} {...greyedUnless(canManageRoles)} />
        )}

        <div className="w-px h-5 self-center bg-(--t-border-hover)" />
        <button
          onClick={() => onTogglePanel("invite")}
          {...greyedUnless(canInvite)}
          aria-pressed={activePanel === "invite"}
          className="btn btn-primary relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0"
          style={activePanel === "invite" ? { background: "var(--t-accent-hover)" } : undefined}
        >
          <Icon icon="lucide:user-plus" width={13} />
          {t("members.toolbar.inviteBtn")}
          <CountBadge count={pendingCount ?? 0} tone="inverse" className="absolute -top-1.5 -right-1.5" />
        </button>
      </div>
    </div>
  );
}

function PanelButton({ active, icon, label, onClick, disabled, title }: { active: boolean; icon: string; label: string; onClick: () => void } & Partial<Greyed>) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${GREYED_CLASS}`}
      style={{
        background: active ? "color-mix(in srgb, var(--t-accent) 15%, transparent)" : "var(--t-bg-elevated)",
        color: active ? "var(--t-accent)" : "var(--t-text-primary)",
        border: `1px solid ${active ? "var(--t-accent)" : "var(--t-border)"}`,
      }}
    >
      <Icon icon={icon} width={13} />
      {label}
    </button>
  );
}
