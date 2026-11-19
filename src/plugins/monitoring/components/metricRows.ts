import type { PluginAPI, PluginSession } from "@/plugins/api";
import type { useHostMetrics } from "../useHostMetrics";

type T = PluginAPI["i18n"]["t"];
type Metrics = ReturnType<typeof useHostMetrics>;

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n}B/s`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB/s`;
  return `${(n / 1024 / 1024).toFixed(1)}MB/s`;
}

export function fmtMem(kb: number): string {
  if (kb < 1024 * 1024) return `${(kb / 1024).toFixed(0)}MB`;
  return `${(kb / 1024 / 1024).toFixed(1)}GB`;
}

/** One series colour per metric, from theme tokens (Sparkline resolves them for its canvas). */
export const METRIC_COLORS = {
  cpu: "var(--t-accent)",
  memory: "var(--t-status-connected)",
  netRx: "var(--t-mcp)",
  netTx: "var(--t-status-warning)",
} as const;

export interface MetricRow { key: keyof typeof METRIC_COLORS; label: string; value: string; color: string; history: number[] }

/** The four sparkline rows both the desktop panel and the mobile screen render. */
export function metricRows(t: T, { snap, cpuH, memH, rxH, txH }: Metrics): MetricRow[] {
  return [
    { key: "cpu", label: t("cpu"), value: snap ? `${snap.cpu_percent.toFixed(1)}%` : "—", history: cpuH, color: METRIC_COLORS.cpu },
    {
      key: "memory",
      label: t("memory"),
      value: snap ? `${fmtMem(snap.mem_used_kb)} / ${fmtMem(snap.mem_total_kb)}` : "—",
      history: memH,
      color: METRIC_COLORS.memory,
    },
    { key: "netRx", label: t("netRx"), value: fmtBytes(snap?.net_rx_bytes_per_sec ?? 0), history: rxH, color: METRIC_COLORS.netRx },
    { key: "netTx", label: t("netTx"), value: fmtBytes(snap?.net_tx_bytes_per_sec ?? 0), history: txH, color: METRIC_COLORS.netTx },
  ];
}

/**
 * Why metrics can't be shown for `session`, as an i18n key, or null when they can.
 * Shared by the desktop panel and the mobile screen so a disconnected session shows
 * the same notice on both instead of an endless "—".
 */
export function metricsUnavailableKey(
  session: PluginSession | null | undefined,
  { requireSsh = false, localUnsupported = false }: { requireSsh?: boolean; localUnsupported?: boolean } = {},
): string | null {
  if (requireSsh && session?.type !== "ssh") return "sshOnly";
  if (!session || session.status !== "connected") return "noActiveSession";
  if (localUnsupported) return "androidUnavailable";
  return null;
}
