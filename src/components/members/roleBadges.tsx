import { Icon } from "@iconify/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TeamMember, TeamRole } from "@/stores/teamStore";
import { avatarColor } from "@/components/shared/AvatarStack";
import { ROLE_META, RolePermissionTooltip, RolePill } from "@/components/members/roleChips";

const INLINE_WRAPPER_CLASS = "inline-flex items-center gap-1";

export function roleColor(role: Pick<TeamRole, "name" | "color">): string {
  return role.color ?? ROLE_META[role.name]?.color ?? avatarColor(role.name);
}

export function RoleChip({ role }: { role: TeamRole }) {
  const [showTip, setShowTip] = useState(false);
  const color = roleColor(role);

  return (
    <span
      className="relative inline-flex items-center cursor-default"
      style={{ verticalAlign: "middle" }}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      <RolePill
        name={role.name}
        color={role.color}
        fallbackColor={avatarColor(role.name)}
        icon={<Icon icon={role.is_builtin ? "lucide:lock" : "lucide:sparkles"} width={8} className="opacity-70" />}
      />
      {showTip && <RolePermissionTooltip role={role} color={color} />}
    </span>
  );
}

export function sortedMemberRoles(member: TeamMember, roles: TeamRole[]): TeamRole[] {
  return member.role_ids
    .map((rid) => roles.find((r) => r.id === rid))
    .filter((r): r is TeamRole => !!r)
    .sort((a, b) => a.position - b.position);
}

export function OverrideMarker({ member }: { member: TeamMember }) {
  const { t } = useTranslation();
  if (((member.permission_allow ?? 0) | (member.permission_deny ?? 0)) === 0) return null;
  return (
    <span
      data-testid="override-marker"
      title={t("members.permissions.overrideMarker")}
      className="inline-flex items-center"
      style={{ color: "var(--t-text-dim)" }}
    >
      <Icon icon="lucide:sliders-horizontal" width={10} />
    </span>
  );
}

export function RoleBadges({
  member, roles, canManage, onAddRole,
}: {
  member: TeamMember;
  roles: TeamRole[];
  canManage?: boolean;
  onAddRole?: () => void;
}) {
  const { t } = useTranslation();
  const memberRoles = sortedMemberRoles(member, roles);
  const marker = <OverrideMarker member={member} />;
  if (memberRoles.length === 0) {
    if (canManage && onAddRole) {
      return (
        <span className={INLINE_WRAPPER_CLASS}>
          <button
            onClick={(e) => { e.stopPropagation(); onAddRole(); }}
            className="text-2xs transition-colors text-(--t-text-dim) hover:text-(--t-accent) focus-visible:text-(--t-accent)"
          >
            {t("members.noRoleAddPrompt")}
          </button>
          {marker}
        </span>
      );
    }
    return (
      <span className={INLINE_WRAPPER_CLASS}>
        <span className="text-2xs text-(--t-text-dim)">{t("members.noRole")}</span>
        {marker}
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {memberRoles.map((r) => <RoleChip key={r.id} role={r} />)}
      {marker}
    </div>
  );
}
