import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import { useTeamSessionStore } from "@/stores/teamSessionStore";
import { holdsControl } from "@/utils/multiplayerControl";
import { AvatarOverflow } from "@/components/shared/AvatarStack";
import { PresenceAvatar } from "@/components/shared/PresenceAvatar";
import { StatusDot } from "@/components/shared/StatusDot";
import { avatarLabel, usePeerResolver } from "@/services/peerName";
import { closeSessionTabs } from "@/services/closeSession";
import { useDismissBlockedReason } from "@/hooks/useSessionLocked";

const MAX_VISIBLE_PARTICIPANTS = 5;

interface MultiplayerBarProps {
  localSessionId: string;
}

export function MultiplayerBar({ localSessionId }: MultiplayerBarProps) {
  const peer = usePeerResolver();
  const { t } = useTranslation();
  const mpState = useTeamSessionStore((s) => s.connections[localSessionId]);
  const requestControl = useTeamSessionStore((s) => s.requestControl);
  const grantControl = useTeamSessionStore((s) => s.grantControl);
  const revokeControl = useTeamSessionStore((s) => s.revokeControl);
  const stopSharing = useTeamSessionStore((s) => s.stopSharing);
  const leaveBlockedReason = useDismissBlockedReason(localSessionId);

  if (!mpState) return null;

  const isHost = mpState.role === "host";
  const myUserId = mpState.myUserId;
  const iControlHolder = holdsControl(mpState);
  const hasPendingRequest = mpState.controlRequester !== null && mpState.controlRequester !== myUserId;

  const handleStopOrLeave = async () => {
    if (isHost) {
      await stopSharing(localSessionId);
      // keep the terminal tab — only sharing state is cleared
    } else {
      closeSessionTabs([localSessionId]);
    }
  };

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 shrink-0"
      style={{
        background: "var(--t-bg-terminal)",
        borderTop: "1px solid var(--t-border)",
      }}
    >
      {/* Live indicator */}
      <div className="flex items-center gap-1.5 mr-1">
        {mpState.ended ? (
          <>
            <StatusDot tone="error" />
            <span className="text-xs font-semibold" style={{ color: "var(--t-status-error)" }}>
              {mpState.keyWait === "failed" ? t("terminal.multiplayerBar.keyFailed") : t("terminal.multiplayerBar.ended")}
            </span>
          </>
        ) : (
          <>
            <StatusDot tone="accent" motion="pulse" />
            <span className="text-xs font-semibold" style={{ color: "var(--t-accent)" }}>
              {isHost
                ? t("terminal.multiplayerBar.sharing")
                : mpState.keyWait === "waiting"
                  ? t("terminal.multiplayerBar.waitingForKey")
                  : iControlHolder
                    ? t("terminal.multiplayerBar.youHaveControl")
                    : t("terminal.multiplayerBar.watching")}
            </span>
          </>
        )}
      </div>

      {/* Participants */}
      <div className="flex items-center gap-1.5 flex-1">
        {mpState.participants.slice(0, MAX_VISIBLE_PARTICIPANTS).map((p) => {
          const who = peer(p.user_id, { fallbackHandle: p.handle });
          return (
            <PresenceAvatar
              key={p.user_id}
              handle={avatarLabel(who)}
              size={24}
              hasControl={p.user_id === mpState.controlHolder}
            />
          );
        })}
        <AvatarOverflow
          count={mpState.participants.length - MAX_VISIBLE_PARTICIPANTS}
          size={24}
          ringColor="var(--t-bg-terminal)"
          overlap={false}
        />
      </div>

      {/* Control actions — hidden when session has ended */}
      {!mpState.ended && !isHost && !iControlHolder && mpState.controlRequester !== myUserId && (
        <button
          className="btn btn-secondary flex items-center gap-1.5 px-2 py-1 text-xs"
          onClick={() => requestControl(localSessionId)}
        >
          <Icon icon="lucide:mouse-pointer-click" width={12} />
          {t("terminal.multiplayerBar.requestControl")}
        </button>
      )}

      {!mpState.ended && !isHost && !iControlHolder && mpState.controlRequester === myUserId && (
        <span
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs"
          style={{ background: "var(--t-bg-elevated)", color: "var(--t-text-dim)" }}
        >
          <Icon icon="lucide:hourglass" width={12} />
          {t("terminal.multiplayerBar.requestPending")}
        </span>
      )}

      {/* Host: pending control request */}
      {!mpState.ended && isHost && hasPendingRequest && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: "var(--t-text-secondary)" }}>
            {t("terminal.multiplayerBar.controlRequested")}
          </span>
          <button
            className="btn btn-primary px-2 py-0.5 text-xs font-medium"
            onClick={() => grantControl(localSessionId, mpState.controlRequester!)}
          >
            {t("terminal.multiplayerBar.grant")}
          </button>
          <button
            className="btn btn-secondary px-2 py-0.5 text-xs font-medium"
            onClick={() => revokeControl(localSessionId)}
          >
            {t("terminal.multiplayerBar.deny")}
          </button>
        </div>
      )}

      {/* Host: revoke control if someone else has it */}
      {!mpState.ended && isHost && !iControlHolder && mpState.controlHolder !== "" && (
        <button
          className="btn btn-secondary flex items-center gap-1.5 px-2 py-1 text-xs hover:text-(--t-status-error)"
          onClick={() => revokeControl(localSessionId)}
        >
          <Icon icon="lucide:x" width={11} />
          {t("terminal.multiplayerBar.revoke")}
        </button>
      )}

      {/* Stop / Leave */}
      <button
        className="btn btn-danger-ghost flex items-center gap-1.5 px-2 py-1 text-xs ml-1 text-(--t-text-dim) hover:text-(--t-status-error) disabled:pointer-events-none"
        onClick={() => void handleStopOrLeave()}
        disabled={!isHost && !!leaveBlockedReason}
        title={isHost ? t("terminal.multiplayerBar.stopSharingTitle") : leaveBlockedReason ?? t("terminal.multiplayerBar.leaveSessionTitle")}
      >
        <Icon icon={isHost ? "lucide:circle-stop" : "lucide:log-out"} width={13} />
        {isHost ? t("terminal.multiplayerBar.stop") : t("terminal.multiplayerBar.leave")}
      </button>
    </div>
  );
}
