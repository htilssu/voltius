import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import { useVaultStore } from "@/stores/vaultStore";
import { useUIStore } from "@/stores/uiStore";
import { useShortcutHint } from "@/stores/shortcutStore";
import { useVaultContents } from "@/hooks/useVaultContents";
import { ContentCounts } from "@/components/shared/ContentCounts";
import { useTeamStore } from "@/stores/teamStore";
import type { TeamMember } from "@/services/teamService";
import { AvatarOverflow, MiniAvatar } from "@/components/shared/AvatarStack";
import { PickerSurface } from "@/components/shared/PickerSurface";
import { StatusDot } from "@/components/shared/StatusDot";
import { getSyncState, onSyncStateChange } from "@/services/sync";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { usePreviewStore } from "@/stores/previewStore";
import { whenWritable } from "@/services/previewGuard";
import { VaultShareSheet } from "@/components/vault-share/VaultShareSheet";
import { useVaultAdmin } from "@/components/vault-admin/useVaultAdmin";
import { VaultAdminSurface } from "@/components/vault-admin/VaultAdminSurface";
import { cloudVaultTarget, localVaultTarget, type VaultAdminTarget } from "@/components/vault-admin/vaultAdminTarget";
import { chevronRotateStyle } from "@/utils/icons";
import { formatRelative } from "@/utils/localeFormat";
import { memberAvatarLabel, memberLabel } from "@/services/memberLabel";

// ─── Members stack ─────────────────────────────────────────────────────────

const MAX_STACK = 3;

export function MembersStack({
  members,
  vaultId,
  vaultName,
  open: openProp,
  onOpenChange,
  hasTeam = true,
  status,
  onRetry,
}: {
  members: TeamMember[];
  vaultId: string;
  vaultName: string;
  /** Lets a caller (the vault menu's Share… action) drive the popover too. Uncontrolled when omitted. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** False for a private vault: the trigger reads "Share" (not "Invite") and opens
   *  the convert-to-team gate, not a members peek, so it must not open on a passing hover. */
  hasTeam?: boolean;
  /** Members list state while `members` is not yet known: a placeholder while loading, a retry on failure. */
  status?: "loading" | "error";
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  const openMembersPanel = useUIStore((s) => s.openMembersPanel);
  const previewing = usePreviewStore((s) => s.session !== null);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = openProp ?? uncontrolledOpen;
  const setOpen = (value: boolean | ((o: boolean) => boolean)) => {
    const next = typeof value === "function" ? value(open) : value;
    onOpenChange?.(next);
    setUncontrolledOpen(next);
  };
  const ref = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);
  const visible = members.slice(0, MAX_STACK);
  const overflow = members.length - MAX_STACK;

  // The popover is portalled out of the header, so moving the pointer into it
  // fires the stack's mouseleave. Defer the close so the popover's own
  // mouseenter can cancel it.
  const openPopover = () => {
    if (!hasTeam || previewing) return;
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
    setOpen(true);
  };
  const closePopover = () => {
    if (!hasTeam) return;
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 120);
  };
  useEffect(() => () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
  }, []);

  const toggleOpen = whenWritable(() => setOpen((o) => !o));
  const handleTriggerKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleOpen();
    }
  };

  return (
    <div
      ref={ref}
      className="relative flex items-center gap-2 shrink-0"
      onMouseLeave={closePopover}
    >
      {/* Stack */}
      {members.length > 0 && (
        <button
          type="button"
          onClick={toggleOpen}
          onKeyDown={handleTriggerKeyDown}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={t("layout.vaultHeader.members")}
          className="relative flex items-center rounded-full"
          style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
        >
          {visible.map((m, i) => (
            <div
              key={m.user_id}
              title={memberLabel(m)}
              style={{
                marginLeft: i === 0 ? 0 : -9,
                zIndex: MAX_STACK - i,
                borderRadius: "50%",
                border: m.is_online
                  ? "2px solid var(--t-status-connected)"
                  : "2px solid transparent",
                boxShadow: "0 0 0 1.5px var(--t-bg-chrome)",
                opacity: m.is_online ? 1 : 0.45,
                transition: "border-color 0.2s, opacity 0.2s",
              }}
            >
              <MiniAvatar name={memberAvatarLabel(m)} size={24} />
            </div>
          ))}
          <AvatarOverflow count={overflow} size={24} ringColor="var(--t-bg-chrome)" />
        </button>
      )}

      {members.length === 0 && status === "loading" && (
        <span
          role="status"
          aria-label={t("common.state.loading")}
          className="w-6 h-6 rounded-full bg-(--t-bg-elevated) animate-pulse"
        />
      )}
      {members.length === 0 && status === "error" && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          title={t("common.action.retry")}
          aria-label={t("common.action.retry")}
          className="btn btn-ghost w-6 h-6 rounded-full flex items-center justify-center text-(--t-status-warning)"
        >
          <Icon icon="lucide:refresh-cw" width={12} />
        </button>
      )}

      <button
        type="button"
        onClick={toggleOpen}
        onMouseEnter={openPopover}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={t("members.share.title", { vault: vaultName })}
        className={`focus-ring flex items-center gap-1 h-[26px] px-2.5 rounded-full transition-colors shrink-0 ${
          hasTeam
            ? "border border-transparent bg-(--t-bg-elevated) text-(--t-text-secondary) hover:bg-(--t-accent) hover:text-(--t-on-accent)"
            : "border-2 border-dashed border-(--t-border) text-(--t-text-dim) hover:border-(--t-accent) hover:bg-[color-mix(in_srgb,var(--t-accent)_10%,transparent)] hover:text-(--t-accent)"
        }`}
      >
        <Icon icon="lucide:plus" width={12} />
        <span className="text-xs font-semibold">
          {hasTeam ? t("members.share.tabInvite") : t("members.share.shareVerb")}
        </span>
      </button>

      {/* Popover — portalled: the page overlay in MainPanel outranks the
          header's stacking context, so an in-flow popover paints under it. */}
      <PickerSurface
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={ref}
        width={320}
        // 320 leaves the Links tab's Create button below the fold.
        maxHeight={480}
        align="right"
        gap={4}
        title={t("members.share.title", { vault: vaultName })}
        glass
      >
        <div onMouseEnter={openPopover} onMouseLeave={closePopover}>
          <VaultShareSheet vaultId={vaultId} variant="popover" onRequestFull={() => openMembersPanel("invite")} />
        </div>
      </PickerSurface>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export default function VaultHeader() {
  const { t } = useTranslation();
  const vaults = useVaultStore((s) => s.vaults);
  const selectedVaultIds = useVaultStore((s) => s.selectedVaultIds);
  const setOmniOpen = useUIStore((s) => s.setOmniOpen);
  const omniHint = useShortcutHint("omni");
  const { teams, membersByTeam, loadMembers } = useTeamStore();

  const [syncState, setSyncState] = useState(getSyncState);
  useEffect(() => onSyncStateChange(() => setSyncState(getSyncState())), []);

  const { accountMode } = useSubscriptionStore();

  // Use the first selected vault as the "active" vault.
  // For non-owner team members there is no local vault — the sidebar sets a
  // team ID directly, so fall back to looking up in `teams`.
  const activeVaultId = selectedVaultIds[0] ?? null;
  const vault = vaults.find((v) => v.id === activeVaultId) ?? null;
  const standaloneTeam = !vault && activeVaultId
    ? (teams.find((t) => t.id === activeVaultId) ?? null)
    : null;
  const team = vault?.teamId
    ? (teams.find((t) => t.id === vault.teamId) ?? null)
    : standaloneTeam;
  const members = team ? (membersByTeam[team.id] ?? null) : null;

  const contentVaultId = team?.id ?? activeVaultId ?? "personal";
  const counts = useVaultContents(contentVaultId);

  const [membersFailed, setMembersFailed] = useState(false);
  const fetchMembers = (teamId: string) => {
    setMembersFailed(false);
    loadMembers(teamId).catch(() => setMembersFailed(true));
  };
  useEffect(() => {
    if (team && !membersByTeam[team.id]) fetchMembers(team.id);
  }, [team?.id]);

  const target: VaultAdminTarget | null = vault
    ? localVaultTarget(vault)
    : standaloneTeam
      ? cloudVaultTarget(standaloneTeam)
      : null;
  const admin = useVaultAdmin(target);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const vaultSharePending = useUIStore((s) => s.vaultSharePending);
  const clearVaultSharePending = useUIStore((s) => s.clearVaultSharePending);
  useEffect(() => {
    // Mirrors the rail's Share… action: it switches to this vault and sets this
    // flag, since the rail hosts no share sheet of its own.
    if (vaultSharePending && target) {
      admin.setShareOpen(true);
      clearVaultSharePending();
    }
    // `!!target`, not `target`: target is a fresh object literal every render, so
    // depending on it directly would re-run this effect on every render instead
    // of only when the vault menu's Share… action actually just fired.
  }, [vaultSharePending, !!target, admin.setShareOpen, clearVaultSharePending]);

  if (!vault && !standaloneTeam) return null;

  const displayName = vault ? vault.name : (standaloneTeam!.name);
  const initial = displayName.trim().charAt(0).toUpperCase();
  const isE2EE = accountMode === "local";
  const lastSync = syncState.lastSync ? formatRelative(syncState.lastSync) : null;
  const showSync = syncState.cloudActive && lastSync;

  return (
    <div
      className="grid grid-cols-[1fr_auto_1fr] items-center shrink-0 px-5 gap-5"
      style={{
        height: "4.25rem",
        background: "transparent",
      }}
    >
      {/* Left zone: icon + vault info */}
      <div className="flex items-center gap-4 min-w-0">
        <div
          className="flex items-center justify-center shrink-0 w-10 h-10 rounded-lg text-base font-bold bg-(--t-accent) text-(--t-on-accent)"
          style={{ boxShadow: "var(--t-ring)" }}
        >
          {initial}
        </div>

        <div className="flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              ref={triggerRef}
              type="button"
              aria-haspopup="menu"
              aria-expanded={admin.pos !== null}
              aria-label={t("layout.vaultMenu.openMenu")}
              onClick={() => triggerRef.current && admin.openAtElement(triggerRef.current)}
              className="flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 -ml-1.5 transition-colors min-w-0"
              style={{ background: admin.pos !== null ? "var(--t-bg-elevated)" : "transparent", border: "none", cursor: "pointer" }}
            >
              <span className="text-base font-semibold truncate" style={{ color: "var(--t-text-primary)" }}>
                {displayName}
              </span>
              <Icon
                icon="lucide:chevron-down"
                width={12}
                className="shrink-0"
                style={{ color: "var(--t-text-dim)", ...chevronRotateStyle(admin.pos !== null) }}
              />
            </button>
          </div>
          <div className="flex items-center gap-3 text-xs mt-0.5 flex-nowrap overflow-hidden" style={{ color: "var(--t-text-dim)" }}>
            {isE2EE && (
              <span className="flex items-center gap-1 shrink-0">
                <StatusDot tone="connected" size="sm" />
                {t("layout.vaultHeader.e2ee")}
              </span>
            )}
            <ContentCounts counts={counts} />
            {showSync && (
              <span className="truncate">{t("layout.vaultHeader.lastSync", { time: lastSync })}</span>
            )}
          </div>
        </div>
      </div>

      {/* Center zone: command palette */}
      <button
        onClick={() => setOmniOpen(true)}
        className="focus-ring flex items-center gap-2 px-3.5 h-9 rounded-lg transition-colors justify-self-center w-[clamp(11rem,30vw,27.5rem)] border bg-(--t-bg-chrome-field) text-(--t-text-secondary) border-(--t-chrome-field-border) hover:bg-(--t-bg-chrome-field-hover) hover:border-(--t-accent) hover:text-(--t-text-bright) focus-visible:border-(--t-accent)"
        style={{ boxShadow: "var(--t-chrome-highlight)" }}
      >
        <Icon icon="lucide:search" width={14} className="shrink-0" />
        <span className="text-sm flex-1 text-left">{t("layout.vaultHeader.jumpTo")}</span>
        {omniHint && (
          <kbd
            className="flex items-center gap-0.5 text-2xs px-1.5 py-0.5 rounded-sm border border-(--t-border) bg-(--t-bg-base) text-(--t-text-secondary)"
          >
            {omniHint}
          </kbd>
        )}
      </button>

      {/* Right zone: online members */}
      <div className="flex items-center justify-end min-w-0">
        {/* Shown for a private vault too: the sheet's `!teamId` branch is the
            conversion consent gate. */}
        {activeVaultId && (accountMode === "server" || team) && (
          <MembersStack
            members={members ?? []}
            vaultId={activeVaultId}
            vaultName={vault?.name ?? team?.name ?? ""}
            open={admin.shareOpen}
            onOpenChange={admin.setShareOpen}
            hasTeam={!!team}
            status={team && !members ? (membersFailed ? "error" : "loading") : undefined}
            onRetry={team ? () => fetchMembers(team.id) : undefined}
          />
        )}
      </div>

      <VaultAdminSurface admin={admin} target={target} />
    </div>
  );
}
