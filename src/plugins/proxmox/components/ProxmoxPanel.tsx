import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { getProxmoxApi, useProxmoxT } from "../runtime";
import { createProxmoxService } from "../services";
import { useActiveSession } from "@voltius/ui";
import { useIsProxmoxHost } from "../useIsProxmoxHost";
import { useProxmox } from "../useProxmox";
import { LxcList } from "./LxcList";
import { SnapshotList } from "./SnapshotList";

export function ProxmoxPanel() {
  const api = getProxmoxApi();
  const t = useProxmoxT();
  const activeSession = useActiveSession(api);
  const service = useMemo(() => createProxmoxService(api!.proxmox), [api]);
  const isProxmoxHost = useIsProxmoxHost(api, activeSession);

  const px = useProxmox(service, activeSession ?? undefined, isProxmoxHost === true);
  const { state } = px;

  if (!px.ready) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-(--t-text-dim)">{t("noActiveSession")}</p>
      </div>
    );
  }

  // Still resolving api.connections.get for this session — a real IPC round
  // trip, not a microtask. Rendering the "not detected" placeholder here would
  // flash it on every mount/session-change before flipping to the real panel.
  if (isProxmoxHost === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <Icon icon="lucide:loader-circle" width={16} className="animate-spin text-(--t-text-dim)" />
      </div>
    );
  }

  if (!isProxmoxHost) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center">
        <div className="flex flex-col items-center gap-3 max-w-[220px]">
          <div className="flex items-center justify-center rounded-lg w-10 h-10 bg-(--t-bg-card) border border-(--t-border)">
            <Icon icon="devicon:proxmox-plain" width={20} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-(--t-text-primary)">{t("notDetectedTitle")}</span>
            <span className="text-xs leading-relaxed text-(--t-text-secondary)">
              {t("notDetectedSub")}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const openSnapshots = (vmid: number, vmName: string) => {
    px.openSnapshots(vmid, vmName);
  };

  const onShell = async (vmid: number, vmName: string) => {
    try {
      await px.openShell(vmid, vmName);
      api?.ui.setActiveNav("terminal");
    } catch (e) {
      console.error("[proxmox] open shell failed:", e);
      api?.notifications.toast(t("shellFailed", { error: String(e) }), { severity: "error" });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header bar — only in containers view */}
      {state.view === "containers" && (
        <div className="flex items-center justify-end px-2 py-1 border-b border-(--t-border) shrink-0">
          <button
            onClick={() => px.fetchContainers()}
            disabled={state.loading}
            title={t("refresh")}
            className="p-1 text-(--t-text-muted) hover:text-(--t-text-primary) disabled:opacity-(--disabled-opacity)"
          >
            <Icon icon="lucide:refresh-cw" width={11} className={state.loading ? "animate-spin" : ""} />
          </button>
        </div>
      )}

      {/* Error state */}
      {state.error && state.view === "containers" && (
        <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
          <Icon icon="lucide:triangle-alert" width={18} className="text-(--t-status-error)" />
          <p className="text-sm font-medium text-(--t-text-primary)">{t("loadFailed")}</p>
          <p className="text-xs text-(--t-text-secondary) break-words max-w-[260px]">{state.error}</p>
          <button
            onClick={() => px.fetchContainers()}
            disabled={state.loading}
            className="btn btn-secondary inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs"
          >
            <Icon icon="lucide:refresh-cw" width={12} className={state.loading ? "animate-spin" : ""} />
            {t("refresh")}
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {state.view === "containers" && !state.error && (
          <LxcList
            containers={state.containers}
            onAction={px.lxcAction}
            onSnapshots={openSnapshots}
            onShell={onShell}
          />
        )}
        {state.view === "snapshots" && state.selectedVmid !== null && (
          <SnapshotList
            vmid={state.selectedVmid}
            vmName={state.selectedVmName}
            snapshots={state.snapshots}
            snapshotInput={state.snapshotInput}
            snapshotInputDesc={state.snapshotInputDesc}
            onSnapshotInputChange={(v) => px.setSnapshotInput(v)}
            onSnapshotDescChange={(v) => px.setSnapshotDesc(v)}
            onCreate={px.createSnapshot}
            onRollback={px.rollbackSnapshot}
            onDelete={px.deleteSnapshot}
            onBack={() => px.closeSnapshots()}
          />
        )}
      </div>
    </div>
  );
}
