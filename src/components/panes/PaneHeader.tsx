import { writeClipboard } from "../../utils/clipboard";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { ContextMenu, useContextMenu, type ContextMenuItem } from "@/components/shared/ContextMenu";
import { useDragStore, shouldSuppressDragClick } from "@/stores/dragStore";
import { useHostPingStore } from "@/stores/hostPingStore";
import { useMcpOwnershipStore } from "@/stores/mcpOwnershipStore";
import { McpMark, mcpOwnerTitle, mcpTint } from "@/components/shared/McpMark";
import { useToggle } from "@/stores/toggleSettingsStore";
import { findLeaf, findSessionPane, useLayoutStore, type SplitPosition } from "@/stores/layoutStore";
import { APP_SOURCE, useNotificationStore } from "@/stores/notificationStore";
import { useSessionStore } from "@/stores/sessionStore";
import { useTeamSessionStore } from "@/stores/teamSessionStore";
import { useConnection } from "@/hooks/useAllConnections";
import { getConnectionIcon, getConnectionIconColor, getDistroColor, getDistroLabel } from "@/utils/icons";
import { sshGetSystemInfo, type SystemInfo } from "@/services/ssh";
import { closeSessionTabs } from "@/services/closeSession";
import { TabCloseControl } from "@/components/shared/TabCloseControl";
import { sessionMenuItems } from "@/utils/sessionMenuItems";
import { sessionLabel } from "@/utils/sessionLabel";
import { sessionUserAtHost } from "@/components/terminal/sessionOverlay";
import { focusSession } from "@/hooks/useTerminal";
import { InlineNameEditor } from "@/components/shared/InlineNameEditor";
import { StatusDot } from "@/components/shared/StatusDot";
import { SessionTypeBadge } from "@/components/panes/SessionTypeBadge";
import { SessionIconTile } from "@/components/panes/SessionIconTile";
import { latencyColor, sessionStatusTone } from "@/utils/statusTone";
import type { TerminalSession } from "@/types";
import { useCopiedFlash } from "@/hooks/useCopiedFlash";
import { HOVER_CARD_CLASS, LatencySparkline, SystemInfoCard, localSystemLabel, localSystemVisual, pushLatencySample, systemInfoCopyText, useLocalSystemInfo } from "@/components/terminal/hoverInfo";

const tooltipClass = `fixed z-[100] ${HOVER_CARD_CLASS}`;

export function PaneHeader({ paneId, session, active }: { paneId: string; session: TerminalSession; active: boolean }) {
  const { t } = useTranslation();
  const connection = useConnection(session.connectionId);
  const latencyMs = useHostPingStore((s) => s.latencies[session.connectionId]);
  const pingStatus = useHostPingStore((s) => s.statuses[session.connectionId]);
  const [pingEnabled] = useToggle("reachability");
  const splitPane = useLayoutStore((s) => s.splitPane);
  const detachPane = useLayoutStore((s) => s.detachPane);
  const maximizedPaneId = useLayoutStore((s) => s.maximizedPaneId);
  const setMaximized = useLayoutStore((s) => s.setMaximized);
  const broadcastActive = useLayoutStore((s) => s.broadcastActive);
  const toggleBroadcast = useLayoutStore((s) => s.toggleBroadcast);
  const sessions = useSessionStore((s) => s.sessions);
  const mpState = useTeamSessionStore((s) => s.connections[session.id]);
  const mcpOwner = useMcpOwnershipStore((s) => s.owners[session.id]);
  const { pos, open, close } = useContextMenu();

  // Copy user@host
  const { copied, flash: flashCopied } = useCopiedFlash(1200);
  const [renaming, setRenaming] = useState(false);
  // Closing the editor hands the keyboard back to this pane's terminal.
  const endRename = () => {
    setRenaming(false);
    focusSession(session.id);
  };

  // Distro popover
  const [showDistroInfo, setShowDistroInfo] = useState(false);
  const { copied: copiedDistro, flash: flashCopiedDistro } = useCopiedFlash(1200);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const localSystemInfo = useLocalSystemInfo(session.id, session.type, session.status === "connected", session.connectionName);
  const systemInfoFetchedRef = useRef(false);
  const distroTriggerRef = useRef<HTMLSpanElement>(null);
  const [distroRect, setDistroRect] = useState<DOMRect | null>(null);

  // Latency sparkline
  const latencyHistoryRef = useRef<number[]>([]);
  const [showSparkline, setShowSparkline] = useState(false);
  const [sparklineSnapshot, setSparklineSnapshot] = useState<number[]>([]);
  const latencyTriggerRef = useRef<HTMLDivElement>(null);
  const [latencyRect, setLatencyRect] = useState<DOMRect | null>(null);

  const isMaximized = maximizedPaneId === paneId;
  const excludedFromBroadcast = broadcastActive && (session.type === "multiplayer" || (!!mpState && mpState.controlHolder !== "" && mpState.controlHolder !== mpState.myUserId));
  const connectionIcon = session.type === "ssh" && connection ? (connection.icon || connection.distro) : null;
  const displayConnectionIcon = connectionIcon ? getConnectionIcon(connectionIcon) : null;
  const localVisual = localSystemVisual(localSystemInfo?.os_name ?? "linux");
  const localLabel = localSystemLabel(localSystemInfo, t("panes.header.localSystem"));
  const showDistroPopover = !!connection?.distro || session.type === "local";
  const icon = displayConnectionIcon ?? (session.type === "local" ? localVisual.icon : session.type === "serial" ? "lucide:ethernet-port" : "lucide:radio-tower");
  const iconBg = connectionIcon ? getConnectionIconColor(connectionIcon) : session.type === "local" ? localVisual.color : undefined;
  const subtitle = session.type === "serial" && session.serialConfig
    ? `${session.serialConfig.port} · ${session.serialConfig.baud}`
    : session.type === "ssh" && connection
      ? sessionUserAtHost(session, connection)
      : null;

  // ── Latency history buffer ────────────────────────────────────────────────

  useEffect(() => {
    if (pingStatus === "up" && latencyMs !== undefined) {
      pushLatencySample(latencyHistoryRef.current, latencyMs);
    }
  }, [latencyMs, pingStatus]);

  useEffect(() => {
    if (showSparkline) setSparklineSnapshot([...latencyHistoryRef.current]);
  }, [showSparkline]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleDistroMouseEnter = useCallback(() => {
    if (distroTriggerRef.current) setDistroRect(distroTriggerRef.current.getBoundingClientRect());
    setShowDistroInfo(true);
    if (!systemInfoFetchedRef.current && session.type === "ssh" && session.status === "connected") {
      systemInfoFetchedRef.current = true;
      sshGetSystemInfo(session.id).then(setSystemInfo).catch(() => {});
    }
  }, [session.id, session.type, session.status]);

  const handleDistroClick = () => {
    const text = session.type === "local"
      ? systemInfoCopyText(localLabel, localSystemInfo?.kernel_version, localSystemInfo?.arch)
      : connection?.distro
      ? systemInfoCopyText(systemInfo?.pretty_name || getDistroLabel(connection.distro), systemInfo?.kernel, systemInfo?.arch)
      : "";
    if (!text) return;
    writeClipboard(text).catch(() => {});
    flashCopiedDistro();
  };

  const handleLatencyMouseEnter = () => {
    if (latencyTriggerRef.current) setLatencyRect(latencyTriggerRef.current.getBoundingClientRect());
    setShowSparkline(true);
  };

  const handleLatencyClick = () => {
    if (latencyMs === undefined) return;
    writeClipboard(`${latencyMs}ms`).catch(() => {});
  };

  const handleCopySubtitle = () => {
    if (!subtitle) return;
    writeClipboard(subtitle).then(() => flashCopied()).catch(() => {});
  };

  const handleClosePane = () => {
    if (closeSessionTabs([session.id]).closed.length === 0) return;
    const layout = useLayoutStore.getState();
    const nextLeaf = findLeaf(layout.root, layout.activePaneId);
    if (nextLeaf) useSessionStore.getState().setActive(nextLeaf.sessionId);
  };

  const handleDetachPane = () => {
    const detachedSessionId = detachPane(paneId);
    if (detachedSessionId) useSessionStore.getState().setActive(detachedSessionId);
  };

  const handleContextSplit = (position: SplitPosition) => {
    const { splitTabs } = useLayoutStore.getState();
    const candidate = sessions.find((s) => !findSessionPane(splitTabs, s.id));
    if (!candidate) {
      useNotificationStore.getState().addToast({
        source: APP_SOURCE,
        type: "toast",
        message: t("panes.header.noSessionToSplit"),
        severity: "info",
        duration: 3000,
      });
      return;
    }
    splitPane(paneId, candidate.id, position);
    useSessionStore.getState().setActive(candidate.id);
  };

  const menuItems: ContextMenuItem[] = sessionMenuItems({
    session,
    t,
    closeLabel: t("panes.header.closePane"),
    onClose: handleClosePane,
    scope: "pane",
    onRename: () => setRenaming(true),
    extras: [
      {
        label: t("panes.header.split"),
        icon: "lucide:columns-3",
        children: [
          { label: t("panes.header.splitLeft"), icon: "lucide:arrow-left-to-line", onClick: () => handleContextSplit("left") },
          { label: t("panes.header.splitRight"), icon: "lucide:arrow-right-to-line", onClick: () => handleContextSplit("right") },
          { label: t("panes.header.splitTop"), icon: "lucide:arrow-up-to-line", onClick: () => handleContextSplit("top") },
          { label: t("panes.header.splitBottom"), icon: "lucide:arrow-down-to-line", onClick: () => handleContextSplit("bottom") },
        ],
      },
      { label: t("panes.header.detachPane"), icon: "lucide:square-arrow-out-up-right", onClick: handleDetachPane },
    ],
  });

  const beginDrag = (e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      handleClosePane();
      return;
    }
    if (e.button !== 0) return;
    useDragStore.getState().beginPaneDrag(paneId, session.id, e.clientX, e.clientY);
  };

  return (
    <div
      onContextMenu={open}
      className="h-7 shrink-0 flex items-stretch gap-2 px-2 text-xs border-b"
      style={{
        background: mcpOwner
          ? mcpTint("var(--t-bg-card)")
          : broadcastActive
            ? "color-mix(in srgb, var(--t-accent) 12%, var(--t-bg-card))"
            : active
              ? "var(--t-bg-card)"
              : "color-mix(in srgb, var(--t-bg-card) 70%, var(--t-bg-terminal))",
        borderColor: "var(--t-border)",
        color: active ? "var(--t-text-primary)" : "var(--t-text-secondary)",
      }}
    >
      <div onMouseDown={beginDrag} className="min-w-0 flex-1 flex items-center gap-2 cursor-grab active:cursor-grabbing self-stretch">
        <SessionIconTile
          ref={distroTriggerRef}
          icon={icon}
          bg={iconBg}
          className={`transition-opacity${showDistroPopover ? " hover:opacity-75 cursor-pointer" : ""}`}
          onMouseEnter={showDistroPopover ? handleDistroMouseEnter : undefined}
          onMouseLeave={showDistroPopover ? () => setShowDistroInfo(false) : undefined}
          onMouseDown={showDistroPopover ? (e) => e.stopPropagation() : undefined}
          onClick={showDistroPopover ? handleDistroClick : undefined}
        />
        {renaming ? (
          <InlineNameEditor
            value={sessionLabel(session)}
            ariaLabel={t("panes.header.rename")}
            className="min-w-0 max-w-44 bg-transparent outline-none font-semibold"
            onCommit={(name) => { useSessionStore.getState().renameSession(session.id, name); endRename(); }}
            onCancel={endRename}
          />
        ) : (
          <span
            className="truncate font-semibold"
            onMouseDown={(e) => e.stopPropagation()}
            onDoubleClick={() => setRenaming(true)}
            onClick={() => {
              // Same rule as the tab labels: the first click brings you to the
              // pane, a click on the pane you are already in renames it. Never
              // on the click that ends a drag.
              if (shouldSuppressDragClick()) return;
              if (active) setRenaming(true);
              else useLayoutStore.getState().setActivePane(paneId);
            }}
          >
            {sessionLabel(session)}
          </span>
        )}
        {subtitle && (
          <span
            className="hidden md:flex items-center truncate max-w-44 text-(--t-text-dim) px-1 -mx-1 hover:bg-(--t-bg-card-hover) transition-colors cursor-pointer self-stretch"
            title={subtitle}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleCopySubtitle}
          >
            {copied ? t("panes.header.copied") : subtitle}
          </span>
        )}
      </div>

      <div className="hidden sm:flex items-center gap-1.5 shrink-0 self-stretch">
        <SessionTypeBadge type={session.type} />
        {mcpOwner && (
          <McpMark
            variant="chip"
            disconnected={mcpOwner.clientId === null}
            title={mcpOwnerTitle(mcpOwner, t, {
              known: "panes.header.mcpTooltip",
              unknown: "panes.header.mcpTooltipUnknown",
              disconnected: "panes.header.mcpTooltipDisconnected",
            })}
            label={t("panes.header.mcpBadge")}
          />
        )}
        <StatusDot tone={sessionStatusTone(session.status)} size="sm" />
        {pingEnabled && session.type === "ssh" && pingStatus === "up" && latencyMs !== undefined && (
          <div
            ref={latencyTriggerRef}
            className="flex items-center self-stretch px-1 hover:bg-(--t-bg-card-hover) transition-colors cursor-pointer"
            onMouseEnter={handleLatencyMouseEnter}
            onMouseLeave={() => setShowSparkline(false)}
            onClick={handleLatencyClick}
            title={t("panes.header.latencyTooltip", { ms: latencyMs })}
          >
            <span style={{ color: latencyColor(latencyMs) }}>{latencyMs}ms</span>
          </div>
        )}
        {excludedFromBroadcast && <span title={t("panes.header.excludedFromBroadcast")}><Icon icon="lucide:lock" width={13} /></span>}
      </div>

      <div className="flex items-stretch shrink-0">
        <button
          className="h-full px-1.5 flex items-center justify-center hover:bg-(--t-bg-card-hover) transition-colors"
          title={broadcastActive ? t("panes.header.disableBroadcast") : t("panes.header.broadcastInput")}
          onClick={() => toggleBroadcast()}
          style={{ color: broadcastActive ? "var(--t-accent)" : "var(--t-text-dim)" }}
        >
          <Icon icon="lucide:radio-tower" width={13} />
        </button>
        <button
          className="h-full px-1.5 flex items-center justify-center hover:bg-(--t-bg-card-hover) transition-colors text-(--t-text-dim)"
          title={t("panes.header.detachPane")}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleDetachPane}
        >
          <Icon icon="lucide:square-arrow-out-up-right" width={13} />
        </button>
        <button
          className="h-full px-1.5 flex items-center justify-center hover:bg-(--t-bg-card-hover) transition-colors text-(--t-text-dim)"
          title={isMaximized ? t("panes.header.restorePane") : t("panes.header.maximizePane")}
          onClick={() => setMaximized(isMaximized ? null : paneId)}
        >
          <Icon icon={isMaximized ? "lucide:minimize-2" : "lucide:maximize-2"} width={13} />
        </button>
        <TabCloseControl
          variant="pane"
          sessionIds={[session.id]}
          closeTitle={t("panes.header.closePane")}
          onClose={handleClosePane}
        />
      </div>
      {pos && <ContextMenu items={menuItems} pos={pos} onClose={close} />}

      {/* System info popover — portal to escape overflow-hidden pane */}
      {showDistroInfo && distroRect && showDistroPopover && createPortal(
        <div className={tooltipClass} style={{ top: distroRect.bottom + 6, left: distroRect.left }}>
          {session.type === "local" ? (
            <SystemInfoCard
              icon={icon}
              color={localVisual.color}
              copiedLabel={copiedDistro ? t("panes.header.copied") : undefined}
              title={localLabel}
              details={[localSystemInfo?.kernel_version && `${localSystemInfo.kernel_version} · ${localSystemInfo.arch}`, localSystemInfo?.host_name]}
              loadingLabel={localSystemInfo ? undefined : t("panes.header.loading")}
            />
          ) : (
            <SystemInfoCard
              icon={icon}
              color={getDistroColor(connection?.distro ?? "linux")}
              copiedLabel={copiedDistro ? t("panes.header.copied") : undefined}
              title={systemInfo?.pretty_name || getDistroLabel(connection!.distro!)}
              details={[systemInfo?.kernel && `${systemInfo.kernel} · ${systemInfo.arch}`]}
              loadingLabel={systemInfo ? undefined : t("panes.header.loading")}
            />
          )}
        </div>,
        document.body,
      )}

      {/* Latency sparkline popover — portal to escape overflow-hidden pane */}
      {showSparkline && latencyRect && sparklineSnapshot.length >= 2 && createPortal(
        <div className={tooltipClass} style={{ top: latencyRect.bottom + 6, left: latencyRect.left }}>
          <LatencySparkline
            values={sparklineSnapshot}
            formatMin={(ms) => t("panes.header.sparkline.min", { ms })}
            formatAvg={(ms) => t("panes.header.sparkline.avg", { ms })}
            formatMax={(ms) => t("panes.header.sparkline.max", { ms })}
          />
        </div>,
        document.body,
      )}
    </div>
  );
}
