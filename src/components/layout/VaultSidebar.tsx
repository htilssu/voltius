import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useVaultStore } from "@/stores/vaultStore";
import { useTeamStore } from "@/stores/teamStore";
import { useOrphanVaultIds } from "@/hooks/useAccessibleVaultIds";
import { unknownVaultLabel } from "@/hooks/accessibleVaults";
import { useTeamVaultStateStore } from "@/stores/teamVaultStateStore";
import { openVault } from "@/services/openVault";
import LogoBadge from "./LogoBadge";
import { useUIStore } from "@/stores/uiStore";
import { useRipple } from "@/hooks/useRipple";
import { SidebarAccountButton } from "./SidebarAccountButton";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { CreateVaultModal } from "@/components/shared/CreateVaultModal";
import { Modal, ModalCard } from "@/components/shared/Modal";
import { statusSurface } from "@/components/shared/statusSurface";
import { VaultLimitModal, useVaultLimitReached } from "@/components/shared/VaultLimitModal";
import { useUpdaterStatus } from "@/services/updater";
import { acceptInvitation, declineInvitation } from "@/services/invitationActions";
import type { MyPendingInvitation } from "@/stores/teamStore";
import { useVaultAdmin } from "@/components/vault-admin/useVaultAdmin";
import { VaultAdminSurface } from "@/components/vault-admin/VaultAdminSurface";
import { cloudVaultTarget, localVaultTarget, type VaultAdminTarget } from "@/components/vault-admin/vaultAdminTarget";
import { RoleBlurb, roleLabel } from "@/components/members/roleChips";

function getInitials(name: string) {
  return name.trim().charAt(0).toUpperCase();
}

export default function VaultSidebar() {
  const { t } = useTranslation();
  const vaults = useVaultStore((s) => s.vaults);
  const selectedVaultIds = useVaultStore((s) => s.selectedVaultIds);
  const selectVaultOnly = useVaultStore((s) => s.selectVaultOnly);
  const addVault = useVaultStore((s) => s.addVault);
  const homeView = useUIStore((s) => s.homeView);
  const setHomeView = useUIStore((s) => s.setHomeView);
  const openSettings = useUIStore((s) => s.openSettings);
  const openWhatsNew = useUIStore((s) => s.openWhatsNew);
  const openVaultSharePending = useUIStore((s) => s.openVaultSharePending);

  const orphanVaultIds = useOrphanVaultIds();

  const teams = useTeamStore((s) => s.teams);
  const pendingInvites = useTeamStore((s) => s.myPendingInvitations);
  const loadMyPendingInvitations = useTeamStore((s) => s.loadMyPendingInvitations);
  const linkedTeamIds = new Set(vaults.map((v) => v.teamId).filter(Boolean));
  const standaloneTeams = teams.filter((t) => !linkedTeamIds.has(t.id));

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showVaultLimitModal, setShowVaultLimitModal] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState<MyPendingInvitation | null>(null);
  const vaultLimitReached = useVaultLimitReached();
  const accountMode = useSubscriptionStore((s) => s.accountMode);
  const isCloudAccount = accountMode === "server";

  useEffect(() => {
    if (!isCloudAccount) return;
    loadMyPendingInvitations().catch(() => {});
  }, [isCloudAccount, loadMyPendingInvitations]);

  const switchToVault = (vault: { id: string; teamId?: string | null }) => {
    openVault(vault.id, vault.teamId);
    setHomeView(false);
  };

  // One menu for the whole rail: only one row can be right-clicked at a time, so
  // a menu per row would just multiply state for no benefit. The target is held
  // whole rather than as an id, because the rail's rows are not all local vaults
  // — a standalone team row has no vault row to look the rest up from.
  const [menuTarget, setMenuTarget] = useState<VaultAdminTarget | null>(null);
  const activateMenuTarget = () => {
    if (!menuTarget) return;
    switchToVault({ id: menuTarget.vaultId ?? menuTarget.teamId!, teamId: menuTarget.teamId });
    setMenuTarget(null);
  };
  const admin = useVaultAdmin(menuTarget, {
    // The rail has no share sheet of its own — switch to the vault so the
    // header's sheet (the app's one and only) can open for it instead.
    onShare: () => {
      activateMenuTarget();
      openVaultSharePending();
    },
    // Members/Roles nav is scoped to the ACTIVE vault, not the right-clicked
    // one — switch first so it opens for the vault the user actually chose.
    onActivate: activateMenuTarget,
  });

  /** Opens the vault menu for `target`. Rows with nothing to administer pass no handler. */
  const menuFor = (target: VaultAdminTarget) => (e: React.MouseEvent) => {
    setMenuTarget(target);
    admin.openAtPointer(e);
  };

  const handleAddVaultClick = () => {
    if (vaultLimitReached) {
      setShowVaultLimitModal(true);
      return;
    }
    setShowCreateModal(true);
  };

  const handleCreateVault = (name: string) => {
    const vault = addVault(name);
    selectVaultOnly(vault.id);
    setHomeView(false);
    setShowCreateModal(false);
  };

  return (
    <aside
      className="flex flex-col shrink-0 items-center gap-2.5 overflow-hidden bg-transparent"
      style={{ width: "4.75rem" }}
    >
      {/* App icon */}
      <AppIconButton isActive={homeView} onClick={() => setHomeView(true)} />

      <div className="w-7 h-px my-1 shrink-0" style={{ background: "var(--t-border)" }} />

      <div
        data-testid="vault-sidebar-scroll-area"
        className="flex flex-col items-center gap-2.5 min-h-0 overflow-y-auto overflow-x-hidden w-full scrollbar-none"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {/* Local vault buttons */}
        {vaults.map((vault) => {
          const isActive = selectedVaultIds.includes(vault.id) && !homeView;
          return (
            <VaultRailRow
              key={vault.id}
              testId={`vault-row-${vault.id}`}
              onContextMenu={menuFor(localVaultTarget(vault))}
            >
              <VaultButton
                testId={`vault-button-${vault.id}`}
                initial={getInitials(vault.name)}
                label={vault.teamId ? t("layout.vaultSidebar.cloudVaultLabel", { name: vault.name }) : vault.name}
                isActive={isActive}
                onClick={() => switchToVault(vault)}
              />
              {vault.teamId && <TeamVaultBadge teamId={vault.teamId} />}
            </VaultRailRow>
          );
        })}

        {/* Pending vault invitations */}
        {pendingInvites.map((inv) => (
          <VaultRailRow key={inv.id}>
            <PendingInviteButton invite={inv} onClick={() => setSelectedInvite(inv)} />
          </VaultRailRow>
        ))}

        {/* Standalone team vault buttons (invited members who have no linked local vault) */}
        {standaloneTeams.map((team) => {
          const isActive = selectedVaultIds.includes(team.id) && !homeView;
          return (
            // The members who most need Members and Roles are exactly the ones
            // with no local vault row, so this menu is not optional: the header
            // already builds the same cloud target for them.
            <VaultRailRow
              key={team.id}
              testId={`vault-row-${team.id}`}
              onContextMenu={menuFor(cloudVaultTarget(team))}
            >
              <VaultButton
                initial={getInitials(team.name)}
                label={t("layout.vaultSidebar.cloudVaultLabel", { name: team.name })}
                isActive={isActive}
                onClick={() => switchToVault({ id: team.id, teamId: team.id })}
              />
              <TeamVaultBadge teamId={team.id} />
            </VaultRailRow>
          );
        })}

        {/* Unnamed vaults, kept visible so their hosts stay reachable. No menu:
            an orphan id has no vault record behind it, so every item the menu
            offers — rename, share, delete, make private — would act on nothing. */}
        {orphanVaultIds.map((id) => {
          const isActive = selectedVaultIds.includes(id) && !homeView;
          return (
            <VaultRailRow key={id} testId={`vault-row-${id}`}>
              <VaultButton
                initial="?"
                label={unknownVaultLabel(id)}
                isActive={isActive}
                onClick={() => switchToVault({ id, teamId: null })}
              />
            </VaultRailRow>
          );
        })}

        {/* Add vault */}
        <AddVaultButton onClick={handleAddVaultClick} />
      </div>

      <VaultAdminSurface admin={admin} target={menuTarget} onClose={() => setMenuTarget(null)} />

      {showCreateModal && (
        <CreateVaultModal
          onConfirm={handleCreateVault}
          onCancel={() => setShowCreateModal(false)}
        />
      )}

      {selectedInvite && (
        <PendingInviteModal
          invite={selectedInvite}
          onAccept={async () => {
            await acceptInvitation(selectedInvite.id, selectedInvite.team_id);
            setSelectedInvite(null);
          }}
          onDecline={async () => {
            await declineInvitation(selectedInvite.id);
            setSelectedInvite(null);
          }}
          onClose={() => setSelectedInvite(null)}
        />
      )}

      {showVaultLimitModal && (
        <VaultLimitModal onClose={() => setShowVaultLimitModal(false)} />
      )}

      <div className="flex-1" />

      {/* Account */}
      <SidebarAccountButton />

      {/* What's new */}
      <WhatsNewButton onClick={() => openWhatsNew()} />

      {/* Settings */}
      <SettingsButton onClick={() => openSettings()} />
    </aside>
  );
}

function PendingInviteButton({ invite, onClick }: { invite: MyPendingInvitation; onClick: () => void }) {
  const { t } = useTranslation();
  const { createRipple, rippleEls } = useRipple();
  const initial = invite.team_name.trim().charAt(0).toUpperCase();
  return (
    <div className="group relative flex items-center justify-center w-full">
      <ActivePip active={false} />
      <button
        onClick={onClick}
        onPointerDown={createRipple}
        title={t("layout.vaultSidebar.vaultInviteTitle", { name: invite.team_name })}
        className={`flex items-center justify-center text-base font-bold relative overflow-hidden bg-(--t-bg-elevated) text-(--t-text-dim) group-hover:bg-[color-mix(in_srgb,var(--t-status-warning)_20%,transparent)] group-hover:text-(--t-text-primary) ${RAIL_TRANSITION}`}
        style={{
          width: 44,
          height: 44,
          borderRadius: "1.375rem",
          border: "2px dashed color-mix(in srgb, var(--t-status-warning) 50%, transparent)",
          opacity: 0.8,
        }}
      >
        {rippleEls}
        {initial}
      </button>
      <span
        className="absolute bottom-0.5 right-0.5 flex items-center justify-center rounded-full pointer-events-none"
        style={{ width: 14, height: 14, background: "var(--t-bg-terminal)" }}
      >
        <Icon icon="lucide:clock" width={9} className="text-(--t-status-warning)" />
      </span>
    </div>
  );
}

function PendingInviteModal({
  invite,
  onAccept,
  onDecline,
  onClose,
}: {
  invite: MyPendingInvitation;
  onAccept: () => Promise<void>;
  onDecline: () => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState("");

  const handle = async (action: "accept" | "decline") => {
    setLoading(action);
    setError("");
    try {
      if (action === "accept") await onAccept();
      else await onDecline();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.state.error"));
      setLoading(null);
    }
  };

  return (
    <Modal onClose={onClose} blur>
      <ModalCard solid className="flex flex-col gap-5 p-6 w-[min(22rem,calc(100vw-2rem))]">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "color-mix(in srgb, var(--t-status-warning) 12%, transparent)" }}
          >
            <Icon icon="lucide:vault" width={20} className="text-(--t-status-warning)" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold text-(--t-text-primary) mb-0.5">{t("layout.vaultSidebar.vaultInvitation")}</p>
            <p className="text-sm text-(--t-text-muted) leading-relaxed">
              <span className="text-(--t-text-primary) font-medium">{invite.inviter_display_name ?? t("layout.vaultSidebar.inviterFallback")}</span>
              {" "}{t("layout.vaultSidebar.invitedYouTo")}{" "}
              <span className="text-(--t-text-primary) font-medium">{invite.team_name}</span>
              {" "}{t("layout.vaultSidebar.asRole")} <span className="font-medium" style={{ color: "var(--t-accent)" }}>{roleLabel(t, invite.role)}</span>.
            </p>
            <RoleBlurb name={invite.role} />
          </div>
        </div>

        {error && (
          <p className="text-xs px-3 py-2 rounded-lg" style={statusSurface("error")}>
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => void handle("accept")}
            disabled={!!loading}
            className="btn btn-primary flex-1 py-2.5 rounded-lg text-sm font-semibold"
          >
            {loading === "accept" ? t("layout.vaultSidebar.accepting") : t("layout.vaultSidebar.accept")}
          </button>
          <button
            onClick={() => void handle("decline")}
            disabled={!!loading}
            className="btn btn-secondary flex-1 py-2.5 rounded-lg text-sm font-medium"
          >
            {loading === "decline" ? t("layout.vaultSidebar.declining") : t("layout.vaultSidebar.decline")}
          </button>
        </div>
      </ModalCard>
    </Modal>
  );
}

function TeamVaultBadge({ teamId }: { teamId: string }) {
  const status = useTeamVaultStateStore((s) => s.statusByTeamId[teamId] ?? "idle");

  let icon: string;
  let spin = false;
  let opacity = 1;

  const isError = status === "error" || status === "forbidden" || status === "payment_required" || status === "update_required";

  if (status === "loading") {
    icon = "lucide:loader";
    spin = true;
  } else if (status === "offline") {
    icon = "lucide:cloud-off";
    opacity = 0.5;
  } else if (status === "awaiting_key") {
    // Benign, self-healing wait (issue #41) — not an error, so no alert triangle.
    icon = "lucide:clock";
    opacity = 0.5;
  } else if (status === "plan_lapsed") {
    icon = "lucide:lock";
    opacity = 0.5;
  } else if (isError) {
    icon = "lucide:triangle-alert";
  } else {
    icon = "lucide:cloud";
  }

  return (
    <span
      className="absolute bottom-0.5 right-0.5 flex items-center justify-center rounded-full pointer-events-none"
      style={{
        width: 14,
        height: 14,
        background: "var(--t-bg-terminal)",
        opacity,
      }}
    >
      <Icon
        icon={icon}
        width={10}
        className={spin ? "animate-spin" : undefined}
        style={{ color: spin ? "var(--t-accent)" : isError ? "var(--t-status-warning)" : "var(--t-text-dim)" }}
      />
    </span>
  );
}

/**
 * Always mounted so its height animates both ways: 0 idle → 20px on hover of
 * the enclosing `group` → 40px when active.
 */
function ActivePip({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden
      className={`absolute left-0 w-1 rounded-r-full bg-(--t-text-primary) transition-[height] duration-200 ease-out ${
        active ? "h-10" : "h-0 group-hover:h-5"
      }`}
    />
  );
}

/**
 * One rail slot. Every row in the scroll area is this wrapper plus its button,
 * and binding `onContextMenu` here rather than per-row is what keeps the menu
 * from reaching only the row kind that happened to be written first.
 *
 * `AppIconButton` keeps a wrapper of its own: it looks the same but is not a
 * row — it sits outside the scroll area and drives a hover pip, so sharing this
 * one would mean widening it with props no actual row uses.
 */
function VaultRailRow({
  testId, onContextMenu, children,
}: {
  testId?: string;
  onContextMenu?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      data-testid={testId}
      className="relative flex items-center justify-center w-full shrink-0"
      onContextMenu={onContextMenu}
    >
      {children}
    </div>
  );
}

function AppIconButton({ isActive, onClick }: { isActive: boolean; onClick: () => void }) {
  const { t } = useTranslation();
  const { createRipple, rippleEls } = useRipple();
  const borderRadius = isActive ? "0.75rem" : "1.375rem";
  return (
    <div className="group relative flex items-center justify-center w-full shrink-0">
      <ActivePip active={isActive} />
      <button
        onClick={onClick}
        onPointerDown={createRipple}
        title={t("layout.vaultSidebar.home")}
        className="relative overflow-hidden"
        style={{ background: "none", border: "none", padding: 0 }}
      >
        {rippleEls}
        <LogoBadge size={11} active={isActive} borderRadius={borderRadius} />
      </button>
    </div>
  );
}

/** Shared transition for every rail control: one curve, every property that moves. */
const RAIL_TRANSITION = "transition-[background-color,color,box-shadow,border-radius] duration-200 ease-out";

function VaultButton({
  initial,
  label,
  isActive,
  onClick,
  testId,
}: {
  initial: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
  testId?: string;
}) {
  const { createRipple, rippleEls } = useRipple();
  // Hover is driven purely by CSS (`group-hover`) on the wrapper, so the pip and
  // the button react to the same hit area and React stays the only style owner.
  // Hover never changes shape or border — only a soft tint — so it can't be
  // mistaken for the active (solid accent) state.
  return (
    <div className="group relative flex items-center justify-center w-full">
      <ActivePip active={isActive} />
      <button
        data-testid={testId}
        onClick={onClick}
        onPointerDown={createRipple}
        title={label}
        className={`flex items-center justify-center text-base font-bold relative overflow-hidden ${RAIL_TRANSITION} ${
          isActive
            ? "bg-(--t-accent) text-(--t-on-accent)"
            : "bg-(--t-bg-elevated) text-(--t-text-secondary) group-hover:bg-[color-mix(in_srgb,var(--t-accent)_18%,var(--t-bg-elevated))] group-hover:text-(--t-text-primary)"
        }`}
        style={{
          width: 44,
          height: 44,
          borderRadius: isActive ? "0.75rem" : "1.375rem",
          boxShadow: "var(--t-ring)",
        }}
      >
        {rippleEls}
        {initial}
      </button>
    </div>
  );
}

/** Icon-only rail button (What's new, Settings, Add vault). Hover = tint only. */
function RailIconButton({
  title, onClick, className = "", children,
}: {
  title: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const { createRipple, rippleEls } = useRipple();
  return (
    <button
      onClick={onClick}
      onPointerDown={createRipple}
      title={title}
      className={`flex items-center justify-center relative overflow-hidden shrink-0 bg-transparent text-(--t-text-dim) hover:text-(--t-text-primary) ${RAIL_TRANSITION} ${className}`}
      style={{ width: 44, height: 44, borderRadius: "1.375rem" }}
    >
      {rippleEls}
      {children}
    </button>
  );
}

function WhatsNewButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  const updater = useUpdaterStatus();

  let icon = "lucide:megaphone";
  let title = t("layout.vaultSidebar.whatsNew");
  let iconClass = "";
  let iconStyle: React.CSSProperties | undefined;
  const ready = updater.status === "ready";
  const pending = ready || updater.status === "available" || updater.status === "externalUpdate";
  if (updater.status === "checking") {
    icon = "lucide:loader-circle";
    title = t("layout.vaultSidebar.checkingForUpdates");
    iconClass = "animate-spin";
  } else if (updater.status === "downloading") {
    icon = "lucide:download";
    title = t("layout.vaultSidebar.downloadingUpdate", { version: updater.version });
    iconClass = "animate-bounce";
  } else if (updater.status === "available" || updater.status === "externalUpdate") {
    icon = "lucide:download";
    title = t("layout.vaultSidebar.updateAvailable", { version: updater.version });
  } else if (ready) {
    icon = "lucide:download";
    title = t("layout.vaultSidebar.updateReady", { version: updater.version });
    iconStyle = { color: "var(--t-accent)" };
  }

  return (
    <RailIconButton title={title} onClick={onClick} className="mb-3 hover:bg-(--t-bg-elevated)">
      <Icon icon={icon} width={20} className={iconClass} style={iconStyle} />
      {pending && (
        <span
          className="absolute rounded-full"
          style={{ top: 8, right: 8, width: 8, height: 8, background: "var(--t-accent)" }}
        />
      )}
    </RailIconButton>
  );
}

function SettingsButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <RailIconButton title={t("layout.vaultSidebar.settings")} onClick={onClick} className="mb-3 hover:bg-(--t-bg-elevated)">
      <Icon icon="lucide:settings" width={20} />
    </RailIconButton>
  );
}

function AddVaultButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <RailIconButton
      title={t("layout.vaultSidebar.addVault")}
      onClick={onClick}
      className="border-2 border-dashed border-(--t-border) hover:bg-[color-mix(in_srgb,var(--t-accent)_12%,transparent)]"
    >
      <Icon icon="lucide:plus" width={20} />
    </RailIconButton>
  );
}
