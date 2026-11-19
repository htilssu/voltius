import { useTranslation } from "react-i18next";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Icon } from "@iconify/react";
import { useUIStore } from "@/stores/uiStore";
import { useActiveTunnelCards } from "@/hooks/useActiveTunnelCards";
import { formatActiveTunnelLabel, getLocalTunnelHttpUrl } from "@/utils/tunnelFormat";
import { getConnectionIcon, getConnectionIconColor } from "@/utils/icons";
import { sessionLabel } from "@/utils/sessionLabel";
import { sessionUserAtHost } from "@/components/terminal/sessionOverlay";
import { AvatarTile } from "@/components/shared/AvatarTile";
import { cardGridProps } from "@/components/shared/cardGrid";
import { SectionHeader, StatusPill } from "@/components/shared/SectionHeader";
import { StatusDot } from "@/components/shared/StatusDot";
import { TunnelStatusDot } from "@/components/shared/TunnelStatusDot";
import { TunnelOriginBadge, TunnelTypeBadge } from "./TunnelBadges";

export { TunnelTypeBadge, TunnelOriginBadge } from "./TunnelBadges";

const ROW = "flex items-center gap-2 rounded-lg border border-transparent bg-(--t-bg-elevated) px-2.5 py-2 transition-colors hover:border-(--t-border-hover)";

type RowTone = "warning" | "error" | "accent" | "connected";
const ROW_ACTION_TONE: Record<RowTone, string> = {
  warning: "hover:text-(--t-status-warning)",
  error: "hover:text-(--t-status-error)",
  accent: "hover:text-(--t-accent)",
  connected: "hover:text-(--t-status-connected)",
};

function RowAction({ icon, title, tone, busy = false, onClick }: {
  icon: string; title: string; tone: RowTone; busy?: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      disabled={busy}
      title={title}
      aria-label={title}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-(--t-text-muted) transition-colors hover:bg-(--t-bg-card-hover) ${ROW_ACTION_TONE[tone]} disabled:opacity-(--disabled-opacity)`}
    >
      <Icon icon={busy ? "lucide:loader-circle" : icon} width={13} className={busy ? "animate-spin" : undefined} />
    </button>
  );
}

export function ActiveTunnelsSection() {
  const { t } = useTranslation();
  const { sessionCards, totalTunnelCount, totalErrorCount, isKeyBusy, pause, resume, deleteActive, deletePaused } = useActiveTunnelCards();
  const layoutMode = useUIStore((s) => s.portForwardingLayoutMode);
  const collapsed = useUIStore((s) => s.activeTunnelsCollapsed);
  const toggleCollapsed = useUIStore((s) => s.toggleActiveTunnelsCollapsed);

  if (totalTunnelCount === 0) return null;

  return (
    <div className="mb-4">
      <SectionHeader
        label={t("portForwarding.activeTunnels.sectionTitle")}
        count={sessionCards.length}
        aside={<>
          {totalErrorCount > 0 && <StatusPill tone="error">{t("portForwarding.activeTunnels.errorCount", { count: totalErrorCount })}</StatusPill>}
          <StatusPill tone="connected">{t("portForwarding.activeTunnels.tunnelCount", { count: totalTunnelCount })}</StatusPill>
        </>}
        collapsed={collapsed}
        onToggle={toggleCollapsed}
      />

      {!collapsed && <div {...cardGridProps(layoutMode, "wide")}>
        {sessionCards.map(({ session, connection, tunnels, suppressedPorts, errorCount }) => {
          const displayIcon = connection ? (connection.icon || connection.distro) : null;
          const distroIcon = displayIcon ? getConnectionIcon(displayIcon) : null;
          const distroColor = displayIcon ? getConnectionIconColor(displayIcon) : "var(--t-bg-card-avatar)";
          const activeCount = tunnels.length - errorCount;
          const totalForwards = tunnels.length + suppressedPorts.length;

          return (
            <div
              key={session.id}
              className="group overflow-hidden rounded-[var(--r-lg)] border border-(--t-border) bg-(--t-bg-card) transition-colors duration-150 hover:border-(--t-border-hover)"
              data-card="true"
            >
              <div className="flex items-center gap-3 px-3 py-3">
                <AvatarTile base={distroColor} icon={distroIcon ?? "lucide:server"} iconSize={18} className="h-8 w-8 rounded-lg text-white" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="truncate text-sm font-semibold text-(--t-text-bright)">{sessionLabel(session)}</p>
                    <StatusDot tone="connected" label={t("portForwarding.activeTunnels.connected")} />
                  </div>
                  <p className="truncate text-xs text-(--t-text-dim)">
                    {connection ? `${sessionUserAtHost(session, connection)}:${connection.port}` : session.id}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="rounded-sm border border-(--t-border) bg-(--t-bg-input) px-1.5 py-0.5 text-2xs font-medium text-(--t-text-dim)">
                    {t("portForwarding.activeTunnels.forwardCount", { count: totalForwards })}
                  </span>
                  {errorCount > 0 ? (
                    <span className="text-2xs font-medium text-(--t-status-error)">{t("portForwarding.activeTunnels.errorCount", { count: errorCount })}</span>
                  ) : (
                    <span className="text-2xs font-medium text-(--t-status-connected)">{t("portForwarding.activeTunnels.activeCountLabel", { count: activeCount })}</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5 px-3 pb-3">
                {tunnels.map((tunnel) => {
                  const key = `${session.id}-${tunnel.id}`;
                  const deleteKey = `del-${session.id}-${tunnel.id}`;
                  const isAuto = tunnel.origin.type === "auto";
                  const isError = typeof tunnel.state === "object" && "error" in tunnel.state;
                  const errorMsg = isError ? (tunnel.state as { error: string }).error : null;
                  const portLabel = formatActiveTunnelLabel(tunnel);
                  const webUrl = !isError ? getLocalTunnelHttpUrl(tunnel.tunnel_type ?? "local", tunnel.remote_port, tunnel.local_port, tunnel.bind_host) : null;

                  return (
                    <div key={key} className={ROW}>
                      <TunnelStatusDot
                        status={isError ? "error" : "active"}
                        remoteListening={tunnel.remote_listening}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="truncate text-sm font-semibold text-(--t-text-bright)">
                            {tunnel.tunnel_type === "dynamic"
                              ? t("portForwarding.activeTunnels.socksPortLabel", { port: tunnel.local_port })
                              : t("portForwarding.activeTunnels.portLabel", { port: tunnel.remote_port })}
                          </p>
                          <TunnelOriginBadge auto={isAuto} />
                          <TunnelTypeBadge tunnelType={tunnel.tunnel_type} />
                        </div>
                        <p className={`truncate text-xs font-mono ${isError ? "text-(--t-status-error)" : "text-(--t-text-secondary)"}`}>
                          {isError ? errorMsg : portLabel}
                        </p>
                      </div>
                      <RowAction icon="lucide:pause" tone="warning" busy={isKeyBusy(key)} title={t("portForwarding.activeTunnels.pauseForwarding")} onClick={() => void pause(session.id, tunnel.id)} />
                      <RowAction icon="lucide:trash-2" tone="error" busy={isKeyBusy(deleteKey)} title={t("common.action.delete")} onClick={() => void deleteActive(session.id, tunnel)} />
                      {webUrl && (
                        <RowAction icon="lucide:globe" tone="accent" title={t("portForwarding.activeTunnels.openUrl", { url: webUrl })} onClick={() => void openUrl(webUrl)} />
                      )}
                    </div>
                  );
                })}
                {suppressedPorts.map((port) => (
                  <div key={`suppressed-${session.id}-${port}`} className={ROW}>
                    <TunnelStatusDot status="idle" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="truncate text-sm font-semibold text-(--t-text-bright)">{t("portForwarding.activeTunnels.portLabel", { port })}</p>
                        <TunnelOriginBadge auto />
                      </div>
                      <p className="truncate text-xs font-mono text-(--t-text-secondary)">{port} → 127.0.0.1:{port}</p>
                    </div>
                    <RowAction icon="lucide:play" tone="connected" busy={isKeyBusy(`${session.id}-${port}`)} title={t("portForwarding.activeTunnels.resumeForwarding")} onClick={() => void resume(session.id, port)} />
                    <RowAction icon="lucide:trash-2" tone="error" title={t("common.action.delete")} onClick={() => deletePaused(session.id, port)} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>}
    </div>
  );
}
