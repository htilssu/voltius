import { useEffect, useState } from "react";
import { useT, useSessionById, MobileScreenHeader, MobileEmptyState } from "@voltius/ui";
import type { FC } from "react";
import type { PluginAPI, MobileScreenProps } from "@/plugins/api";
import type { HostMetricsHub } from "../hostMetricsHub";
import { useHostMetrics } from "../useHostMetrics";
import { MetricCard } from "./MetricCard";
import { DiskSection } from "./DiskSection";
import { SystemInfoSection } from "./SystemInfoSection";
import { metricRows, metricsUnavailableKey } from "./metricRows";

export function createMobileMetricsScreen(api: PluginAPI, hub: HostMetricsHub): FC<MobileScreenProps> {
  return function MobileMetricsScreen({ sessionId, onBack }) {
    const t = useT(api);
    const session = useSessionById(api, sessionId);

    // Pause the metrics stream while the app is backgrounded to save the SSH channel.
    const [paused, setPaused] = useState(() => document.visibilityState === "hidden");
    useEffect(() => {
      const onVis = () => setPaused(document.visibilityState === "hidden");
      document.addEventListener("visibilitychange", onVis);
      return () => document.removeEventListener("visibilitychange", onVis);
    }, []);

    const metrics = useHostMetrics(hub, session ?? undefined, { paused });
    const { disks, disksLoading } = metrics;
    const unavailable = metricsUnavailableKey(session, { requireSsh: true });

    return (
      <div className="flex flex-col h-full" style={{ background: "var(--t-bg-base)" }}>
        <MobileScreenHeader title={t("title")} subtitle={session?.connectionName} onBack={onBack} />

        {unavailable || !session ? (
          <MobileEmptyState icon="lucide:activity" title={t(unavailable ?? "noActiveSession")} />
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="px-3 py-3 space-y-3">
              {metricRows(t, metrics).map((r) => (
                <MetricCard key={r.key} card label={r.label} value={r.value} color={r.color} history={r.history} />
              ))}
            </div>

            {(disksLoading || disks.length > 0) && (
              <DiskSection disks={disks} loading={disksLoading} t={t} />
            )}
            <SystemInfoSection hub={hub} session={session} defaultExpanded t={t} />
          </div>
        )}
      </div>
    );
  };
}
