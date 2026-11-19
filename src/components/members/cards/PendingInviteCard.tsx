import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { PendingInvitation, TeamRole } from "@/services/teamService";
import { MiniAvatar } from "@/components/shared/AvatarStack";
import { BaseCard } from "@/components/shared/BaseCard";
import { RolePill } from "@/components/members/roleChips";
import { RoleChip } from "@/components/members/roleBadges";
import { useTeamStore } from "@/stores/teamStore";
import { GREYED_CLASS } from "@/hooks/useGreyedUnless";
import { inviteLabel, inviterLabel } from "@/services/memberLabel";
import { formatDate, MONTH_DAY } from "@/utils/localeFormat";
import { usePendingInviteActions } from "./usePendingInviteActions";

const DAY_MS = 86_400_000;

export function inviteExpiry(t: TFunction, inv: PendingInvitation): { isExpired: boolean; label: string } {
  // An older server filtered expired invitations out rather than labelling
  // them, so a missing status means everything it returned was still live.
  const isExpired = inv.status === "expired";
  const daysLeft = Math.ceil((new Date(inv.expires_at).getTime() - Date.now()) / DAY_MS);
  // The badge already says "Expired", so this line carries the date instead of repeating the word.
  const label = isExpired
    ? t("members.invite.expiredOn", { date: formatDate(inv.expires_at, MONTH_DAY) })
    : daysLeft <= 0
      ? t("members.invite.expiresToday")
      : t("members.invite.expiresIn", { count: daysLeft });
  return { isExpired, label };
}

const HOVER_TONE = {
  accent: "enabled:hover:text-(--t-accent) focus-visible:text-(--t-accent)",
  danger: "enabled:hover:text-(--t-status-error) focus-visible:text-(--t-status-error)",
} as const;

function InviteActionButton({ title, icon, tone, busy, disabledReason, onClick }: {
  title: string;
  icon: string;
  tone: keyof typeof HOVER_TONE;
  busy: boolean;
  disabledReason: string | undefined;
  onClick: () => void;
}) {
  const disabled = busy || !!disabledReason;
  return (
    <button
      title={disabledReason ?? title}
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`p-1.5 flex rounded-lg transition-colors text-(--t-text-dim) ${HOVER_TONE[tone]} ${GREYED_CLASS}`}
    >
      <Icon icon={busy ? "lucide:loader-circle" : icon} width={16} className={busy ? "animate-spin" : undefined} />
    </button>
  );
}

export function PendingInviteCard({
  inv, teamId, roles, canInvite, onRevoked, onResent,
}: {
  inv: PendingInvitation;
  teamId: string;
  roles: TeamRole[];
  canInvite: boolean;
  onRevoked: (id: string) => void;
  onResent?: () => void;
}) {
  const { t } = useTranslation();
  const roster = useTeamStore((s) => s.membersByTeam[teamId]);
  const { revoke, resend, revoking, resending, disabledReason } = usePendingInviteActions({ teamId, inv, canInvite, onRevoked, onResent });
  const { isExpired, label: expiryLabel } = inviteExpiry(t, inv);

  const invitedRoles = (inv.role_ids?.length ? inv.role_ids : [])
    .map((id) => roles.find((r) => r.id === id))
    .filter((r): r is TeamRole => !!r)
    .sort((a, b) => a.position - b.position);

  return (
    <BaseCard isList>
      <MiniAvatar name={inviteLabel(inv)} size={28} />
      <p className="text-sm font-medium-bold truncate basis-52 shrink min-w-0 text-(--t-text-bright)">{inviteLabel(inv)}</p>
      <p className="text-xs truncate flex-1 min-w-0 text-(--t-text-secondary)">
        {inv.member_name && <><span>{inv.display_name}</span> · </>}
        <span style={{ color: isExpired ? "var(--t-status-error)" : undefined }}>{expiryLabel}</span>
        {inv.invited_by_display_name && <> · {t("members.invitedBy")} {inviterLabel(inv.invited_by_display_name, roster)}</>}
      </p>

      <span
        className="text-2xs px-2 py-0.5 rounded-full shrink-0"
        style={{
          color: isExpired ? "var(--t-status-error)" : "var(--t-text-dim)",
          background: isExpired ? "color-mix(in srgb, var(--t-status-error) 10%, transparent)" : "var(--t-bg-elevated)",
        }}
      >
        {isExpired ? t("members.invite.expired") : t("members.pendingBadge")}
      </span>
      {invitedRoles.length > 0
        ? <div className="flex flex-wrap justify-end gap-1">{invitedRoles.map((r) => <RoleChip key={r.id} role={r} />)}</div>
        : <RolePill name={inv.role} color={roles.find((r) => r.name === inv.role)?.color} fallbackColor="var(--t-text-secondary)" />}

      <InviteActionButton title={t("members.invite.resendTitle")} icon="lucide:send" tone="accent"
        busy={resending} disabledReason={disabledReason} onClick={resend} />
      <InviteActionButton title={t("members.revokeInvitationTitle")} icon="lucide:x" tone="danger"
        busy={revoking} disabledReason={disabledReason} onClick={revoke} />
    </BaseCard>
  );
}
