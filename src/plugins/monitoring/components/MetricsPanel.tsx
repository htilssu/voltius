import type { FC } from "react";
import type { PluginAPI } from "@/plugins/api";
import { StatusDot, useActiveSession, useT } from "@voltius/ui";
import type { HostMetricsHub } from "../hostMetricsHub";
import { useHostMetrics } from "../useHostMetrics";
import { MetricCard } from "./MetricCard";
import { DiskSection } from "./DiskSection";
import { SystemInfoSection } from "./SystemInfoSection";
import { metricRows, metricsUnavailableKey } from "./metricRows";

/** Android can't read host metrics (/proc is restricted) — only remote (SSH). No
 *  host platform primitive is exposed to plugins, so this checks the WebView UA
 *  directly; it is UX gating only, same as the host's own useIsAndroid. */
function isAndroidPlatform(): boolean {
  return typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
}

export function createMetricsPanel(api: PluginAPI, hub: HostMetricsHub): FC {
  return function MetricsPanel() {
    const t = useT(api);
    const activeSession = useActiveSession(api);
    const isAndroid = isAndroidPlatform();
    const localUnsupported = isAndroid && !!activeSession && activeSession.type !== "ssh";

    const metrics = useHostMetrics(
      hub,
      activeSession ?? undefined,
      { localUnsupported },
    );

    const { disks, disksLoading } = metrics;
    const unavailable = metricsUnavailableKey(activeSession, { localUnsupported });
    if (unavailable || !activeSession) {
      return (
        <div className="flex h-full items-center justify-center px-6 text-center">
          <p className="max-w-[240px] text-xs text-(--t-text-dim)">{t(unavailable ?? "noActiveSession")}</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full overflow-y-auto">
        {/* Host badge */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-(--t-border) shrink-0">
          <StatusDot tone="connected" size="sm" />
          <span className="text-2xs text-(--t-text-muted) truncate">
            {activeSession.connectionName}
          </span>
        </div>

        {activeSession.type === "serial" ? (
          <div className="px-4 py-3 border-b border-(--t-border) text-2xs text-(--t-text-dim)">
            {t("serialUnavailable")}
          </div>
        ) : (
          <>
            {metricRows(t, metrics).map((r) => (
              <MetricCard key={r.key} label={r.label} value={r.value} color={r.color} history={r.history} />
            ))}

            {(disksLoading || disks.length > 0) && (
              <DiskSection disks={disks} loading={disksLoading} t={t} />
            )}
          </>
        )}
        <SystemInfoSection hub={hub} session={activeSession} t={t} />
      </div>
    );
  };
}
