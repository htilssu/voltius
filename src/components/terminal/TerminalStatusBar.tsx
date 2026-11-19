import { writeClipboard } from "../../utils/clipboard";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import type { TFunction } from "i18next";
import { Icon } from "@iconify/react";
import { useHostPingStore } from "@/stores/hostPingStore";
import { usePluginStore, findRightPanelSectionWithFlag } from "@/stores/pluginStore";
import { useUIStore } from "@/stores/uiStore";
import { useStatusBarStore } from "@/stores/statusBarStore";
import { useDismissBlockedReason } from "@/hooks/useSessionLocked";
import { closeSessionTabs } from "@/services/closeSession";
import { useSessionStore } from "@/stores/sessionStore";
import { useConnectedSince } from "@/services/sessionUptime";
import { serialAutoReconnectEnabled } from "@/stores/serialAutoReconnect";
import { useConnection } from "@/hooks/useAllConnections";
import { sessionUserAtHost } from "@/components/terminal/sessionOverlay";
import { useStatusBarContributions } from "@/hooks/useStatusBarContributions";
import { useCopiedFlash } from "@/hooks/useCopiedFlash";
import { usePfState } from "@/hooks/usePfStates";
import { sshGetSystemInfo, type SystemInfo } from "@/services/ssh";
import { metricsStart, metricsStop, onMetricsSnapshot, type MetricsSnapshot } from "@/services/metrics";
import { getDistroIcon, getDistroColor, getDistroLabel } from "@/utils/icons";
import { ContextMenu, useContextMenu, type ContextMenuItem } from "@/components/shared/ContextMenu";
import { StatusDot } from "@/components/shared/StatusDot";
import { latencyColor, latencyTone, pingStatusTone } from "@/utils/statusTone";
import type { SerialConnectParams, SerialLine, SerialLines } from "@/types";
import { serialSendBreak } from "@/services/serial";
import type { TerminalStatusBarContributionContext } from "@/plugins/api";
import { PORT_FORWARDING_ICON } from "@/lib/conceptIcons";
import { pluginPanelId } from "./terminalPanels";
import { HOVER_CARD_CLASS, LatencySparkline, SystemInfoCard, localSystemLabel, localSystemVisual, pushLatencySample, systemInfoCopyText, useLocalSystemInfo } from "./hoverInfo";
import { toastActionError } from "@/components/shared/actionError";


interface Props {
  sessionId: string;
  sessionType: "ssh" | "local" | "serial";
  connectionId: string;
  connectionName?: string;
  serialConfig?: SerialConnectParams;
  sessionStatus: "connecting" | "connected" | "disconnected" | "error";
  dimensions?: { cols: number; rows: number };
  visible?: boolean;
}

function sessionBadge(sessionType: Props["sessionType"], t: TFunction): string {
  if (sessionType === "ssh") return t("terminal.statusBar.badge.ssh");
  if (sessionType === "serial") return t("terminal.statusBar.badge.serial");
  return t("terminal.statusBar.badge.local");
}

function cpuColor(pct: number): string {
  if (pct > 80) return "var(--t-status-error)";
  if (pct > 60) return "var(--t-status-warning)";
  return "var(--t-text-dim)";
}

function fmtMem(kb: number): string {
  if (kb < 1024 * 1024) return `${(kb / 1024).toFixed(0)}M`;
  return `${(kb / 1024 / 1024).toFixed(1)}G`;
}

function fmtNet(bps: number): string {
  if (bps < 1024) return `${bps.toFixed(0)}B`;
  if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(0)}K`;
  return `${(bps / 1024 / 1024).toFixed(1)}M`;
}

function fmtUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return `${d}d ${String(rh).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Hover card anchored above a status-bar item. */
const statusBarPopoverClass = `absolute bottom-[calc(100%+6px)] left-0 z-50 ${HOVER_CARD_CLASS}`;
const statusBarItemClass = "h-full rounded-none transition-colors hover:bg-(--t-bg-card-hover)";
const statusBarIdentityGroupClass = "flex items-center h-full";

function StatusBarButton({
  icon,
  label,
  title,
  color,
  dimmed,
  disabled,
  onClick,
}: {
  title: string;
  color: string;
  dimmed?: boolean;
  disabled?: boolean;
  onClick: () => void;
} & ({ icon: string; label?: never } | { label: string; icon?: never })) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      title={title}
      aria-disabled={disabled}
      className={`flex items-center px-1 ${statusBarItemClass} aria-disabled:cursor-default aria-disabled:hover:bg-transparent${label ? " font-mono text-2xs tracking-wider" : ""}`}
      style={{
        color,
        opacity: disabled ? 0.25 : dimmed ? 0.45 : 1,
      }}
    >
      {icon ? <Icon icon={icon} width={11} /> : label}
    </button>
  );
}

const SERIAL_LINES: SerialLine[] = ["dtr", "rts"];

function SerialLineControls({
  sessionId,
  lines,
  rtsFlowControlled,
  disabled,
}: {
  sessionId: string;
  lines: SerialLines | undefined;
  rtsFlowControlled: boolean;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const setSerialLine = useSessionStore((s) => s.setSerialLine);
  const [breaking, setBreaking] = useState(false);

  const sendBreak = () => {
    setBreaking(true);
    serialSendBreak(sessionId)
      .catch((e: unknown) => toastActionError(e, t))
      .finally(() => setBreaking(false));
  };

  return (
    <>
      {SERIAL_LINES.map((line) => {
        const on = lines?.[line] ?? false;
        const label = line.toUpperCase();
        const flowControlled = line === "rts" && rtsFlowControlled;
        return (
          <StatusBarButton
            key={line}
            label={label}
            title={
              flowControlled
                ? t("terminal.statusBar.serialRtsFlowControlled")
                : t(on ? "terminal.statusBar.serialLineOn" : "terminal.statusBar.serialLineOff", { line: label })
            }
            color={on ? "var(--t-accent)" : "var(--t-text-dim)"}
            disabled={disabled || flowControlled}
            onClick={() => void setSerialLine(sessionId, line, !on).catch((e: unknown) => toastActionError(e, t))}
          />
        );
      })}
      <StatusBarButton
        label="BRK"
        title={t("terminal.statusBar.serialBreak")}
        color={breaking ? "var(--t-accent)" : "var(--t-text-dim)"}
        disabled={disabled || breaking}
        onClick={sendBreak}
      />
    </>
  );
}

export function TerminalStatusBar({ sessionId, sessionType, connectionId, connectionName, serialConfig, sessionStatus, dimensions, visible = true }: Props) {
  const { t } = useTranslation();
  const connection = useConnection(connectionId);
  const pingStatus = useHostPingStore((s) => s.statuses[connectionId]);
  const latencyMs = useHostPingStore((s) => s.latencies[connectionId]);
  const toggleRightPanel = useUIStore((s) => s.toggleRightPanel);
  const rightPanelSection = useUIStore((s) => s.rightPanelSection);
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);
  // Not keyed by a literal section id — any registered section can opt in via
  // providesHostMetrics, so a squatted id can't inherit this integration.
  // First-registered flagged section wins if more than one sets the flag.
  const metricsSectionId = usePluginStore(
    (s) => findRightPanelSectionWithFlag(s.rightPanelSections, "providesHostMetrics")?.id ?? null,
  );
  const monitoringActive = metricsSectionId !== null;
  const reconnect = useSessionStore((s) => s.reconnect);
  const disconnectBlockedReason = useDismissBlockedReason(sessionId);
  const closeSerialPort = useSessionStore((s) => s.closeSerialPort);
  const setSerialAutoReconnect = useSessionStore((s) => s.setSerialAutoReconnect);
  const session = useSessionStore((s) => s.sessions.find((x) => x.id === sessionId));
  const serialAutoReconnect = session ? serialAutoReconnectEnabled(session, connection) : true;
  const userAtHost = connection ? sessionUserAtHost(session, connection) : "";

  const tunnels = usePfState(sessionType === "ssh" ? sessionId : null)?.tunnels ?? [];
  const [pulse, setPulse] = useState(false);
  const prevCountRef = useRef(0);

  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null);
  const streamIdRef = useRef<string | null>(null);
  const unlistenRef = useRef<(() => void) | null>(null);

  const { copied, flash: flashCopied } = useCopiedFlash(1200);

  const [uptime, setUptime] = useState<string | null>(null);

  const [showDimensions, setShowDimensions] = useState(false);
  const dimensionsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // System info popover
  const [showDistroInfo, setShowDistroInfo] = useState(false);
  const { copied: copiedDistro, flash: flashCopiedDistro } = useCopiedFlash(1200);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const localSystemInfo = useLocalSystemInfo(sessionId, sessionType, sessionStatus === "connected", connectionName ?? "Local");
  const systemInfoFetchedRef = useRef(false);

  // SSH details are fetched lazily because they require a remote command.
  const handleDistroMouseEnter = useCallback(() => {
    setShowDistroInfo(true);
    if (systemInfoFetchedRef.current || sessionStatus !== "connected") return;
    systemInfoFetchedRef.current = true;
    if (sessionType === "ssh") {
      sshGetSystemInfo(sessionId).then(setSystemInfo).catch(() => {});
    }
  }, [sessionId, sessionType, sessionStatus]);

  const slot = useStatusBarStore((s) => s.slot);

  useEffect(() => {
    systemInfoFetchedRef.current = false;
    setSystemInfo(null);
  }, [sessionId, sessionType]);

  // Latency sparkline
  const latencyHistoryRef = useRef<number[]>([]);
  const [showSparkline, setShowSparkline] = useState(false);
  const [sparklineSnapshot, setSparklineSnapshot] = useState<number[]>([]);

  // CPU alert
  const [highCpu, setHighCpu] = useState(false);

  // Context menu
  const { pos: ctxPos, open: openCtx, close: closeCtx } = useContextMenu();

  // ── Latency history buffer ────────────────────────────────────────────────

  useEffect(() => {
    if (pingStatus === "up" && latencyMs !== undefined) {
      pushLatencySample(latencyHistoryRef.current, latencyMs);
    }
  }, [latencyMs, pingStatus]);

  // Snapshot the buffer when the popover opens so it stays stable during hover
  useEffect(() => {
    if (showSparkline) setSparklineSnapshot([...latencyHistoryRef.current]);
  }, [showSparkline]);

  // ── CPU alert hysteresis ──────────────────────────────────────────────────

  useEffect(() => {
    if (!metrics) { setHighCpu(false); return; }
    setHighCpu((prev) => {
      if (metrics.cpu_percent > 90) return true;
      if (metrics.cpu_percent < 85) return false;
      return prev;
    });
  }, [metrics]);

  // ── Dimensions flash ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!dimensions) return;
    setShowDimensions(true);
    if (dimensionsTimeoutRef.current) clearTimeout(dimensionsTimeoutRef.current);
    dimensionsTimeoutRef.current = setTimeout(() => setShowDimensions(false), 2000);
  }, [dimensions?.cols, dimensions?.rows]);

  // ── Session uptime ────────────────────────────────────────────────────────

  const connectedAt = useConnectedSince(sessionStatus === "connected" ? sessionId : null);

  useEffect(() => {
    if (connectedAt === null) { setUptime(null); return; }
    if (!visible) return;
    const tick = () => setUptime(fmtUptime(Math.floor((Date.now() - connectedAt) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [connectedAt, visible]);

  useEffect(() => {
    const count = tunnels.length;
    if (count !== prevCountRef.current && prevCountRef.current !== 0) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 500);
      prevCountRef.current = count;
      return () => clearTimeout(t);
    }
    prevCountRef.current = count;
  }, [tunnels.length]);

  // ── Metrics stream ────────────────────────────────────────────────────────

  const stopStream = useCallback(async () => {
    unlistenRef.current?.();
    unlistenRef.current = null;
    if (streamIdRef.current) {
      await metricsStop(streamIdRef.current).catch(() => {});
      streamIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!monitoringActive || sessionType !== "ssh" || sessionStatus !== "connected") {
      stopStream();
      setMetrics(null);
      return;
    }
    if (!visible) return;

    let cancelled = false;
    (async () => {
      await stopStream();
      if (cancelled) return;
      try {
        const sid = await metricsStart(sessionId, true);
        if (cancelled) { metricsStop(sid).catch(() => {}); return; }
        streamIdRef.current = sid;
        const unlisten = await onMetricsSnapshot(sid, (s) => setMetrics(s));
        if (cancelled) { unlisten(); metricsStop(sid).catch(() => {}); return; }
        unlistenRef.current = unlisten;
      } catch { /* monitoring unavailable */ }
    })();

    return () => {
      cancelled = true;
      stopStream();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, sessionType, sessionStatus, monitoringActive, visible]);

  // ── Context menu items ────────────────────────────────────────────────────

  const copyHostText = sessionType === "ssh" && connection
    ? userAtHost
    : (serialConfig?.port ?? "");

  const serialLabel = serialConfig
    ? t("panes.terminal.serialSubtitle", { port: serialConfig.port, baud: serialConfig.baud })
    : t("terminal.statusBar.serialFallback");

  const ctxItems = useMemo<ContextMenuItem[]>(() => {
    const disconnectItem: ContextMenuItem = {
      label: t("common.action.disconnect"),
      icon: "lucide:plug",
      danger: true,
      divider: true,
      disabledReason: disconnectBlockedReason,
      onClick: () => closeSessionTabs([sessionId]),
    };
    if (sessionType === "ssh" && connection) {
      return [
        {
          label: t("terminal.statusBar.copyLabel", { text: userAtHost }),
          icon: "lucide:copy",
          onClick: () => writeClipboard(userAtHost).catch(() => {}),
        },
        {
          label: t("terminal.statusBar.copyLabel", { text: connection.host }),
          icon: "lucide:server",
          onClick: () => writeClipboard(connection.host).catch(() => {}),
        },
        {
          label: t("terminal.statusBar.openPortsPanel"),
          icon: PORT_FORWARDING_ICON,
          onClick: () => toggleRightPanel("ports"),
        },
        disconnectItem,
      ];
    }
    if (sessionType === "serial" && serialConfig) {
      return [
        {
          label: t("terminal.statusBar.copyLabel", { text: serialConfig.port }),
          icon: "lucide:copy",
          onClick: () => writeClipboard(serialConfig.port).catch(() => {}),
        },
        disconnectItem,
      ];
    }
    if (sessionType === "local") {
      return [
        disconnectItem,
      ];
    }
    return [];
  }, [sessionType, connection, userAtHost, serialConfig, connectionName, sessionId, toggleRightPanel, disconnectBlockedReason, t]);

  const statusBarContributionContext = useMemo<TerminalStatusBarContributionContext>(() => ({
    sessionId,
    sessionType,
    connectionId,
    sessionStatus,
    connection,
    connectionName,
    serialConfig,
    dimensions,
  }), [sessionId, sessionType, connectionId, sessionStatus, connection, connectionName, serialConfig, dimensions]);

  const statusBarContributions = useStatusBarContributions(
    "terminal.statusBar.right",
    statusBarContributionContext,
  );

  const activeTunnelCount = tunnels.filter((t) => t.state === "active").length;
  const portsIsActive = rightPanelOpen && rightPanelSection === "ports";
  const metricsIsActive = rightPanelOpen && metricsSectionId !== null && rightPanelSection === pluginPanelId(metricsSectionId);
  const isConnected = sessionStatus === "connected";
  const isDisconnectedOrError = sessionStatus === "disconnected" || sessionStatus === "error";

  const dotTone = pingStatus === "up" ? latencyTone(latencyMs ?? 999) : pingStatusTone(pingStatus);

  const dotTitle = pingStatus === "up" && latencyMs !== undefined
    ? t("terminal.statusBar.pingUp", { ms: latencyMs })
    : pingStatus === "down"
    ? t("terminal.statusBar.pingDown")
    : t("terminal.statusBar.pingUnknown");

  const distroIcon = connection?.distro ? getDistroIcon(connection.distro) : null;
  const localVisual = localSystemVisual(localSystemInfo?.os_name ?? "linux");
  const localLabel = localSystemLabel(localSystemInfo, t("terminal.statusBar.localSystemFallback"));
  const systemIcon = sessionType === "ssh" ? distroIcon : sessionType === "local" ? localVisual.icon : null;
  const showDistroPopover = (sessionType === "ssh" && !!connection?.distro) || sessionType === "local";
  const systemInfoCopy = sessionType === "ssh" && connection?.distro
    ? systemInfoCopyText(systemInfo?.pretty_name || getDistroLabel(connection.distro), systemInfo?.kernel, systemInfo?.arch)
    : sessionType === "local"
    ? systemInfoCopyText(localLabel, localSystemInfo?.kernel_version, localSystemInfo?.arch)
    : "";

  const handleCopyHost = () => {
    if (!copyHostText) return;
    writeClipboard(copyHostText).then(() => flashCopied()).catch(() => {});
  };

  const handleCopySystemInfo = () => {
    if (!systemInfoCopy) return;
    writeClipboard(systemInfoCopy).catch(() => {});
    flashCopiedDistro();
  };

  const borderTopColor = sessionStatus === "error"
    ? "color-mix(in srgb, var(--t-status-error) 60%, transparent)"
    : sessionStatus === "disconnected"
    ? "color-mix(in srgb, var(--t-status-error) 40%, transparent)"
    : "var(--t-border)";

  // Jump host breadcrumb
  const jumpHosts = connection?.jump_hosts;
  const jumpLabel = jumpHosts?.length
    ? jumpHosts[0].host + (jumpHosts.length > 1 ? ` +${jumpHosts.length - 1}` : "")
    : null;

  // Distro / local OS chip with its hover card (ssh + local share one shape).
  const systemInfoChip = systemIcon && showDistroPopover && (
    <div
      className={`relative flex items-center px-1 ${statusBarItemClass}`}
      onMouseEnter={handleDistroMouseEnter}
      onMouseLeave={() => setShowDistroInfo(false)}
    >
      <Icon
        icon={systemIcon}
        width={12}
        className="shrink-0 cursor-pointer"
        style={{ color: sessionType === "local" ? localVisual.color : "var(--t-text-dim)" }}
        onClick={handleCopySystemInfo}
      />
      {showDistroInfo && (
        <div className={statusBarPopoverClass}>
          {sessionType === "local" ? (
            <SystemInfoCard
              icon={systemIcon}
              color={localVisual.color}
              copiedLabel={copiedDistro ? t("terminal.statusBar.copiedBang") : undefined}
              title={localLabel}
              details={[localSystemInfo?.kernel_version && `${localSystemInfo.kernel_version} · ${localSystemInfo.arch}`, localSystemInfo?.host_name]}
              loadingLabel={localSystemInfo ? undefined : t("terminal.statusBar.loadingEllipsis")}
            />
          ) : (
            <SystemInfoCard
              icon={systemIcon}
              color={getDistroColor(connection?.distro ?? "linux")}
              copiedLabel={copiedDistro ? t("terminal.statusBar.copiedBang") : undefined}
              title={systemInfo?.pretty_name || getDistroLabel(connection?.distro ?? "linux")}
              details={[systemInfo?.kernel && `${systemInfo.kernel} · ${systemInfo.arch}`]}
              loadingLabel={systemInfo ? undefined : t("terminal.statusBar.loadingEllipsis")}
            />
          )}
        </div>
      )}
    </div>
  );

  const content = (
    <>
      <div
        className="flex items-center justify-between px-3 shrink-0 text-2xs"
        style={{
          height: 24,
          background: "var(--t-bg-status-bar)",
          borderTop: `1px solid ${borderTopColor}`,
        }}
        onContextMenu={ctxItems.length ? openCtx : undefined}
      >
        {/* Left: connection info */}
        <div className={`flex items-center gap-2 h-full${sessionStatus === "connecting" ? " statusbar-connecting-pulse" : ""}`}>
          <span className="px-1.5 text-2xs font-semibold text-(--t-text-dim)">
            {sessionBadge(sessionType, t)}
          </span>
          {sessionType === "ssh" && connection && (
            <>
              {/* Dot + latency: hover area for sparkline */}
              <div
                style={{ position: "relative", display: "flex", alignItems: "center", gap: 4 }}
                onMouseEnter={() => setShowSparkline(true)}
                onMouseLeave={() => setShowSparkline(false)}
              >
                <StatusDot tone={dotTone} size="sm" label={dotTitle} />
                {pingStatus === "up" && latencyMs !== undefined && (
                  <span style={{ color: latencyColor(latencyMs), fontVariantNumeric: "tabular-nums" }}>
                    {latencyMs}ms
                  </span>
                )}
                {/* Sparkline popover */}
                {showSparkline && sparklineSnapshot.length >= 2 && (
                  <div className={statusBarPopoverClass}>
                    <LatencySparkline
                      values={sparklineSnapshot}
                      formatMin={(value) => t("terminal.statusBar.sparklineMin", { value })}
                      formatAvg={(value) => t("terminal.statusBar.sparklineAvg", { value })}
                      formatMax={(value) => t("terminal.statusBar.sparklineMax", { value })}
                    />
                  </div>
                )}
              </div>

              {/* Jump host breadcrumb */}
              {jumpLabel && (
                <>
                  <span
                    style={{
                      color: "var(--t-text-dim)",
                      maxWidth: 80,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {jumpLabel}
                  </span>
                  <Icon icon="lucide:arrow-right" width={9} className="text-(--t-text-dim)" style={{ flexShrink: 0 }} />
                </>
              )}

              <div className={statusBarIdentityGroupClass}>
                {systemInfoChip}
                <span
                  title={userAtHost}
                  onClick={handleCopyHost}
                  className={`flex items-center px-1 text-(--t-text-dim) ${statusBarItemClass}`}
                  style={{
                    maxWidth: 160,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                  }}
                >
                  {copied ? t("terminal.statusBar.copiedBang") : userAtHost}
                </span>
              </div>
              {isDisconnectedOrError && (
                <StatusBarButton
                  icon="lucide:rotate-ccw"
                  title={t("terminal.statusBar.reconnectTitle")}
                  color="var(--t-status-error)"
                  onClick={() => void reconnect(sessionId)}
                />
              )}
            </>
          )}
          {sessionType === "local" && systemInfoChip}
          {sessionType === "serial" && (
            <>
              <Icon icon="lucide:ethernet-port" width={11} className="text-(--t-text-dim)" />
              <span
                title={serialLabel}
                onClick={handleCopyHost}
                className={`flex items-center px-1 text-(--t-text-dim) ${statusBarItemClass}`}
                style={{
                  maxWidth: 160,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                }}
              >
                {copied ? t("terminal.statusBar.copiedBang") : serialLabel}
              </span>
              <StatusBarButton
                icon={isDisconnectedOrError ? "lucide:plug" : "lucide:unplug"}
                title={isDisconnectedOrError ? t("terminal.statusBar.serialReopen") : t("terminal.statusBar.serialClose")}
                color={isDisconnectedOrError ? "var(--t-status-error)" : "var(--t-text-dim)"}
                onClick={() =>
                  void (isDisconnectedOrError ? reconnect(sessionId) : closeSerialPort(sessionId))
                }
              />
              <StatusBarButton
                icon={serialAutoReconnect ? "lucide:refresh-cw" : "lucide:refresh-cw-off"}
                title={serialAutoReconnect ? t("terminal.statusBar.serialAutoReconnectOn") : t("terminal.statusBar.serialAutoReconnectOff")}
                color="var(--t-text-dim)"
                dimmed={!serialAutoReconnect}
                onClick={() => void setSerialAutoReconnect(sessionId, !serialAutoReconnect)}
              />
              <SerialLineControls
                sessionId={sessionId}
                lines={session?.serialLines}
                rtsFlowControlled={serialConfig?.flowControl === "rts-cts"}
                disabled={sessionStatus !== "connected"}
              />
            </>
          )}
        </div>

        {/* Right: uptime + dimensions + plugin widgets + metrics + ports chips */}
        <div
          className="flex items-center h-full"
          style={!isConnected ? { opacity: 0.35, pointerEvents: "none" } : undefined}
        >
          {statusBarContributions.map(({ key, node }) => (
            <Fragment key={key}>{node}</Fragment>
          ))}
          {uptime && (
            <span className="px-1.5 text-(--t-text-dim)" style={{ fontVariantNumeric: "tabular-nums" }}>
              {uptime}
            </span>
          )}
          {showDimensions && dimensions && (
            <span className="px-1.5 text-(--t-text-dim)" style={{ fontVariantNumeric: "tabular-nums" }}>
              {dimensions.cols}×{dimensions.rows}
            </span>
          )}
          {metrics && (
            <button
              onClick={() => metricsSectionId && toggleRightPanel(pluginPanelId(metricsSectionId))}
              className={`flex items-center gap-1.5 px-1.5 ${statusBarItemClass}`}
              style={{
                color: "var(--t-text-dim)",
                background: metricsIsActive ? "var(--t-bg-elevated)" : undefined,
              }}
              title={t("terminal.statusBar.systemMetricsTitle")}
            >
              <span
                className={highCpu && visible ? "cpu-alert-pulse" : undefined}
                style={{ color: cpuColor(metrics.cpu_percent), fontVariantNumeric: "tabular-nums" }}
              >
                {t("terminal.statusBar.cpu", { pct: metrics.cpu_percent.toFixed(0) })}
              </span>
              <span className="text-(--t-text-dim)">·</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {fmtMem(metrics.mem_used_kb)}/{fmtMem(metrics.mem_total_kb)}
              </span>
              {(metrics.net_rx_bytes_per_sec > 0 || metrics.net_tx_bytes_per_sec > 0) && (
                <>
                  <span className="text-(--t-text-dim)">·</span>
                  <span className="flex items-center gap-0.5" style={{ fontVariantNumeric: "tabular-nums" }}>
                    <Icon icon="lucide:arrow-down" width={9} />
                    {fmtNet(metrics.net_rx_bytes_per_sec)}
                  </span>
                  <span className="flex items-center gap-0.5" style={{ fontVariantNumeric: "tabular-nums" }}>
                    <Icon icon="lucide:arrow-up" width={9} />
                    {fmtNet(metrics.net_tx_bytes_per_sec)}
                  </span>
                </>
              )}
            </button>
          )}
          {sessionType === "ssh" && (
            <button
              onClick={() => toggleRightPanel("ports")}
              className={`flex items-center gap-1 px-1.5 ${statusBarItemClass}`}
              style={{
                color: "var(--t-text-dim)",
                background: portsIsActive
                  ? "var(--t-bg-elevated)"
                  : pulse
                  ? "var(--t-bg-card)"
                  : undefined,
              }}
              title={t("terminal.statusBar.activeTunnels", { count: activeTunnelCount })}
            >
              <Icon icon={PORT_FORWARDING_ICON} width={11} />
              {activeTunnelCount > 0 && <span>{activeTunnelCount}</span>}
            </button>
          )}
        </div>
      </div>

      {ctxPos && <ContextMenu items={ctxItems} pos={ctxPos} onClose={closeCtx} direction="up" />}
    </>
  );

  // The desktop shell's slot spans beneath the side panels, so opening one
  // does not squeeze the bar. Hidden sessions keep no bar there.
  if (slot) return visible ? createPortal(content, slot) : null;
  return content;
}
