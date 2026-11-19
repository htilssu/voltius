import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { invoke } from "@/lib/invoke";
import { getDistroColor, getDistroIcon } from "@/utils/icons";
import { latencyColor } from "@/utils/statusTone";

/**
 * Shared pieces for the hover cards on session chrome (status bar, pane
 * header, SFTP side pane): latency sparkline and the system-info card.
 */

/** Non-interactive floating card. Positioning and z-index stay with the caller. */
export const HOVER_CARD_CLASS =
  "pointer-events-none rounded-lg bg-(--t-bg-card) px-3 py-2 shadow-[var(--t-ring),var(--t-elev-2)]";

export const SPARKLINE_MAX = 20;

/** Push a latency sample into a bounded history buffer (mutates). */
export function pushLatencySample(buf: number[], ms: number): void {
  buf.push(ms);
  if (buf.length > SPARKLINE_MAX) buf.shift();
}

function sparklinePoints(values: number[], width: number, height: number): string {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

export function LatencySparkline({
  values,
  formatMin,
  formatAvg,
  formatMax,
}: {
  values: number[];
  formatMin: (ms: number) => string;
  formatAvg: (ms: number) => string;
  formatMax: (ms: number) => string;
}) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  return (
    <>
      <svg width={80} height={20} className="block">
        <polyline
          points={sparklinePoints(values, 80, 20)}
          fill="none"
          stroke={latencyColor(avg)}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div className="mt-1 flex gap-2 whitespace-nowrap text-2xs tabular-nums text-(--t-text-dim)">
        <span>{formatMin(min)}</span>
        <span>{formatAvg(avg)}</span>
        <span>{formatMax(max)}</span>
      </div>
    </>
  );
}

export interface ConnectedSystemInfo {
  os_name: string;
  os_version: string;
  kernel_version: string;
  host_name: string;
  arch: string;
}

/** Icon + brand color for the local machine's OS. */
export function localSystemVisual(osName: string): { icon: string; color: string } {
  const os = osName.toLowerCase();
  if (os.includes("darwin") || os.includes("mac")) return { icon: "lucide:apple", color: "var(--t-text-secondary)" };
  const distro = os.includes("windows") ? "windows" : osName || "linux";
  return { icon: getDistroIcon(distro), color: getDistroColor(distro) };
}

export function localSystemLabel(info: ConnectedSystemInfo | null, fallback: string): string {
  if (!info) return fallback;
  const version = info.os_version ? ` ${info.os_version}` : "";
  return `${info.os_name || fallback}${version}`;
}

/** "<label> · <kernel> <arch>" — what the system-info chip copies to the clipboard. */
export function systemInfoCopyText(label: string, kernel?: string, arch?: string): string {
  return kernel ? `${label} · ${kernel} ${arch ?? ""}`.trimEnd() : label;
}

/** Best-effort OS details for a connected local session (silent on failure). */
export function useLocalSystemInfo(
  sessionId: string,
  sessionType: string,
  connected: boolean,
  sessionName: string,
): ConnectedSystemInfo | null {
  const [info, setInfo] = useState<ConnectedSystemInfo | null>(null);
  // Keep the last known details across a reconnect; drop them only when the
  // session itself changes.
  useEffect(() => setInfo(null), [sessionId, sessionType]);
  useEffect(() => {
    if (sessionType !== "local" || !connected) return;
    let cancelled = false;
    invoke<ConnectedSystemInfo>("get_connected_system_info", { sessionId, sessionType, sessionName })
      .then((next) => { if (!cancelled) setInfo(next); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [sessionId, sessionType, connected, sessionName]);
  return info;
}

export function SystemInfoCard({
  icon,
  color,
  copiedLabel,
  title,
  details,
  loadingLabel,
}: {
  icon: string;
  color: string;
  /** When set, replaces the body (just-copied feedback). */
  copiedLabel?: string;
  title: string;
  details: (string | false | null | undefined)[];
  /** Shown under the title while details are still loading. */
  loadingLabel?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 whitespace-nowrap">
      <Icon icon={icon} width={22} className="shrink-0" style={{ color }} />
      {copiedLabel ? (
        <span className="text-2xs text-(--t-text-primary)">{copiedLabel}</span>
      ) : (
        <div className="flex flex-col gap-0.5">
          <span className="text-2xs text-(--t-text-primary)">{title}</span>
          {details.filter(Boolean).map((d) => (
            <span key={d as string} className="text-2xs text-(--t-text-dim)">{d}</span>
          ))}
          {loadingLabel && <span className="text-2xs text-(--t-text-dim)">{loadingLabel}</span>}
        </div>
      )}
    </div>
  );
}
