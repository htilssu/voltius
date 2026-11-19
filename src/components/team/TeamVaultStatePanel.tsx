/**
 * The panel a shell shows in place of a team vault's pages when the vault
 * cannot show its contents (issue #70). Shared by MainPanel and MobileShell so
 * the copy, the statuses and the recovery actions exist once.
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import { useTeamStore } from "@/stores/teamStore";
import { useUIStore } from "@/stores/uiStore";
import { fetchTeamData } from "@/services/teamVaultSync";
import { ownerLabel } from "@/services/teamVaultFirstAccess";
import { checkForUpdate } from "@/services/updater";
import { isPrimaryOwner } from "@/services/permissions";
import { useMyUserId } from "@/hooks/useMyUserId";
import { appToast } from "@/services/appToast";
import { userFacingReason } from "@/services/errorReason";
import { StateTile } from "./StateTile";

export default function TeamVaultStatePanel({
  status,
  teamId,
}: {
  status: string;
  teamId: string;
}) {
  const { t } = useTranslation();
  const team = useTeamStore((s) => s.teams.find((t) => t.id === teamId));
  const members = useTeamStore((s) => s.membersByTeam[teamId]);
  const loadMembers = useTeamStore((s) => s.loadMembers);
  const myUserId = useMyUserId();
  const isOwner = isPrimaryOwner(team, myUserId);
  const [retrying, setRetrying] = useState(false);
  const retry = async () => {
    setRetrying(true);
    try {
      await fetchTeamData(teamId);
    } catch (e) {
      appToast("error", userFacingReason(e));
    } finally {
      setRetrying(false);
    }
  };

  // The waiting copy names the owner the user is waiting on, so the roster has
  // to be there — this panel replaces the pages that would otherwise load it.
  useEffect(() => {
    if (status === "awaiting_key" && !members) loadMembers(teamId).catch(() => {});
  }, [status, members, teamId, loadMembers]);

  // Generic until the handle resolves: a name flashing in from blank reads worse
  // than the sentence that never had one.
  const owner = ownerLabel(team, members);

  const configs: Record<string, { icon: string; title: string; body: string }> = {
    offline: {
      icon: "lucide:cloud-off",
      title: t("layout.mainPanel.teamVault.offlineTitle"),
      body: t("layout.mainPanel.teamVault.offlineBody"),
    },
    forbidden: {
      icon: "lucide:shield-off",
      title: t("layout.mainPanel.teamVault.forbiddenTitle"),
      body: t("layout.mainPanel.teamVault.forbiddenBody"),
    },
    plan_lapsed: {
      icon: "lucide:lock",
      title: t("layout.mainPanel.teamVault.planLapsedTitle"),
      body: t("layout.mainPanel.teamVault.planLapsedBody"),
    },
    // Member has joined the team but no vault owner has distributed a key yet
    // (issue #41). Distinct from a hard error — a key-holder self-heals this on
    // their next sync, so present it as a benign waiting state, not a failure.
    awaiting_key: {
      icon: "lucide:clock",
      title: t("layout.mainPanel.teamVault.waitingForAccessTitle"),
      body: owner
        ? t("layout.mainPanel.teamVault.waitingForAccessBodyNamed", { owner: `@${owner}` })
        : t("layout.mainPanel.teamVault.waitingForAccessBody"),
    },
    payment_required: {
      icon: "lucide:credit-card",
      title: t("layout.mainPanel.teamVault.paymentRequiredTitle"),
      body: isOwner
        ? t("layout.mainPanel.teamVault.paymentRequiredBodyOwner")
        : t("layout.mainPanel.teamVault.paymentRequiredBodyMember"),
    },
    // No Try again: it repeats the same failing unwrap. Only a password sign-in
    // recovers the secrets (#228).
    key_mismatch: {
      icon: "lucide:key-round",
      title: t("layout.mainPanel.teamVault.keyMismatchTitle"),
      body: t("layout.mainPanel.teamVault.keyMismatchBody"),
    },
    error: {
      icon: "lucide:triangle-alert",
      title: t("layout.mainPanel.teamVault.errorTitle"),
      body: t("layout.mainPanel.teamVault.errorBody"),
    },
    update_required: {
      icon: "lucide:circle-arrow-up",
      title: t("layout.mainPanel.teamVault.updateRequiredTitle"),
      body: t("layout.mainPanel.teamVault.updateRequiredBody"),
    },
  };

  const cfg = configs[status] ?? configs.error;

  const openBilling = () => {
    useUIStore.getState().openSettings("account");
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-(--t-bg-base)">
      <StateTile icon={cfg.icon} />
      <div className="flex flex-col items-center gap-1.5 text-center max-w-xs">
        <span className="text-base font-semibold text-(--t-text-primary)">{cfg.title}</span>
        <span className="text-sm text-(--t-text-secondary)">{cfg.body}</span>
        {status === "payment_required" && isOwner && (
          <button
            onClick={openBilling}
            className="btn btn-primary mt-2 text-sm px-3 py-1.5 rounded-lg"
          >
            {t("layout.mainPanel.manageSubscription")}
          </button>
        )}
        {status === "update_required" && (
          <button
            onClick={() => void checkForUpdate()}
            className="btn btn-primary mt-2 text-sm px-3 py-1.5 rounded-lg"
          >
            {t("layout.mainPanel.checkForUpdates")}
          </button>
        )}
        {(!status || status === "error" || status === "awaiting_key") && (
          <button
            onClick={() => void retry()}
            disabled={retrying}
            aria-busy={retrying}
            className="btn btn-secondary mt-2 inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg"
          >
            {retrying && <Icon icon="lucide:loader-circle" width={13} className="animate-spin" />}
            {t("layout.mainPanel.tryAgain")}
          </button>
        )}
      </div>
    </div>
  );
}
