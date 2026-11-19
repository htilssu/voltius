import { useState } from "react";
import { Icon, BottomSheet, useT, useSessionById, MobileScreenHeader, MobileButton, MobileEmptyState, SheetActionRow, StatusDot } from "@voltius/ui";
import type { FC } from "react";
import type { PluginAPI, MobileScreenProps } from "@/plugins/api";
import { useIsProxmoxHost } from "../useIsProxmoxHost";
import { createProxmoxService } from "../services";
import { useProxmox } from "../useProxmox";
import { lxcStatusTone } from "../lxcStatusTone";
import type { LxcAction, LxcContainer, LxcSnapshot } from "../types";

interface ActionItem { action: LxcAction; label: string; icon: string }
function actionsFor(status: string, t: PluginAPI["i18n"]["t"]): ActionItem[] {
  return status === "running"
    ? [
        { action: "stop", label: t("hostStop"), icon: "lucide:square" },
        { action: "restart", label: t("hostRestart"), icon: "lucide:rotate-cw" },
      ]
    : [{ action: "start", label: t("hostStart"), icon: "lucide:play" }];
}

export function createMobileProxmoxScreen(api: PluginAPI): FC<MobileScreenProps> {
  const proxmoxService = createProxmoxService(api.proxmox);

  return function MobileProxmoxScreen({ sessionId, onBack }) {
    const t = useT(api);
    const session = useSessionById(api, sessionId);
    const isProxmoxHost = useIsProxmoxHost(api, session);
    const px = useProxmox(proxmoxService, session ?? undefined, !!isProxmoxHost);
    const { state } = px;

    const [sheetFor, setSheetFor] = useState<LxcContainer | null>(null);
    const [confirmSnap, setConfirmSnap] = useState<{ snap: LxcSnapshot; mode: "rollback" | "delete" } | null>(null);
    const [creatingSnap, setCreatingSnap] = useState(false);

    /** Run a user-initiated action; a failure surfaces as an error toast instead of only the console. */
    const attempt = async (run: () => Promise<unknown>, failKey: string) => {
      try { await run(); } catch (e) { api.notifications.toast(t(failKey, { error: String(e) }), { severity: "error" }); }
    };

    const runAction = (c: LxcContainer, action: LxcAction) => {
      setSheetFor(null);
      return attempt(() => px.lxcAction(c.vmid, action), "actionFailed");
    };

    const onShell = (c: LxcContainer) => {
      setSheetFor(null);
      return attempt(async () => { await px.openShell(c.vmid, c.name); api.ui.focusMobileTerminal(); }, "shellFailed");
    };

    if (state.view === "snapshots" && state.selectedVmid !== null) {
      const vmid = state.selectedVmid;
      const createSnap = async () => {
        const name = state.snapshotInput.trim();
        if (!name || creatingSnap) return;
        setCreatingSnap(true);
        await attempt(async () => {
          await px.createSnapshot(vmid, name, state.snapshotInputDesc.trim());
          px.setSnapshotInput(""); px.setSnapshotDesc("");
        }, "snapshotFailed");
        setCreatingSnap(false);
      };
      return (
        <div className="absolute inset-0 z-30 flex flex-col bg-(--t-bg-base)">
          <MobileScreenHeader title={t("snapshotsTitle", { name: state.selectedVmName })} subtitle={session?.connectionName} onBack={() => px.closeSnapshots()}>
            <button onClick={() => void px.fetchSnapshots(vmid)} disabled={state.loading} aria-label={t("refresh")} className="vt-icon-btn text-(--t-text-dim) disabled:opacity-(--disabled-opacity)">
              <Icon icon="lucide:refresh-cw" width={18} className={state.loading ? "animate-spin" : ""} />
            </button>
          </MobileScreenHeader>
          <div className="shrink-0 flex flex-col gap-2 px-4 py-3 border-b border-(--t-border)">
            <input
              data-mobile-proxmox-snap-name
              value={state.snapshotInput}
              onChange={(e) => px.setSnapshotInput(e.target.value)}
              placeholder={t("newSnapshotPlaceholder")}
              className="rounded-lg px-3 h-10 text-sm bg-(--t-bg-card) border border-(--t-border) outline-none text-(--t-text-primary)"
            />
            <input
              value={state.snapshotInputDesc}
              onChange={(e) => px.setSnapshotDesc(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              className="rounded-lg px-3 h-10 text-sm bg-(--t-bg-card) border border-(--t-border) outline-none text-(--t-text-primary)"
            />
            <MobileButton
              block
              data-mobile-proxmox-snap-create
              disabled={creatingSnap || !state.snapshotInput.trim()}
              aria-busy={creatingSnap}
              onClick={() => void createSnap()}
            >
              {creatingSnap && <Icon icon="lucide:loader-circle" width={16} className="animate-spin" />}
              {t("createSnapshot")}
            </MobileButton>
          </div>
          {state.error ? (
            <MobileEmptyState icon="lucide:triangle-alert" title={t("loadFailed")} sub={state.error}>
              <MobileButton variant="secondary" onClick={() => void px.fetchSnapshots(vmid)}>{t("refresh")}</MobileButton>
            </MobileEmptyState>
          ) : state.snapshots.length === 0 ? (
            <MobileEmptyState icon="devicon:proxmox-plain" title={t("noSnapshots")} />
          ) : (
            <div className="flex-1 overflow-y-auto">
              {state.snapshots.map((snap) => (
                <button
                  key={snap.name}
                  onClick={() => !snap.is_current && setConfirmSnap({ snap, mode: "rollback" })}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-(--t-bg-card) min-w-0"
                >
                  <Icon icon="lucide:camera" width={16} className="shrink-0 text-(--t-text-dim)" />
                  <span className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-medium text-(--t-text-primary) truncate">{snap.name}{snap.is_current ? ` ${t("current")}` : ""}</span>
                    {snap.description && <span className="text-xs text-(--t-text-dim) truncate">{snap.description}</span>}
                  </span>
                  {!snap.is_current && (
                    <span
                      role="button"
                      data-mobile-proxmox-snap-delete={snap.name}
                      onClick={(e) => { e.stopPropagation(); setConfirmSnap({ snap, mode: "delete" }); }}
                      aria-label={t("deleteSnapshot")}
                      className="vt-hit shrink-0 p-1 text-(--t-status-error)"
                    >
                      <Icon icon="lucide:trash-2" width={16} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {confirmSnap && (
            <BottomSheet title={confirmSnap.mode === "rollback" ? t("rollbackConfirmTitle") : t("deleteSnapshotConfirmTitle")} onClose={() => setConfirmSnap(null)}>
              <div className="flex flex-col gap-3 px-2 py-1">
                <p className="text-sm text-(--t-text-secondary)">
                  {confirmSnap.mode === "rollback"
                    ? t("rollbackConfirmBody", { name: state.selectedVmName, snap: confirmSnap.snap.name })
                    : t("deleteSnapshotConfirmBody", { snap: confirmSnap.snap.name })}
                </p>
                <MobileButton
                  block
                  variant="danger"
                  data-mobile-proxmox-snap-confirm
                  onClick={() => {
                    const { snap, mode } = confirmSnap;
                    setConfirmSnap(null);
                    void (mode === "rollback"
                      ? attempt(() => px.rollbackSnapshot(vmid, snap.name), "rollbackFailed")
                      : attempt(() => px.deleteSnapshot(vmid, snap.name), "deleteFailed"));
                  }}
                >
                  {confirmSnap.mode === "rollback" ? t("rollbackButton") : t("delete")}
                </MobileButton>
                <MobileButton block variant="secondary" onClick={() => setConfirmSnap(null)}>
                  {t("cancel")}
                </MobileButton>
              </div>
            </BottomSheet>
          )}
        </div>
      );
    }

    let body: React.ReactNode;
    if (!session || session.type !== "ssh") {
      body = <MobileEmptyState icon="devicon:proxmox-plain" title={t("needsSshTitle")} sub={t("needsSshSub")} />;
    } else if (session.status !== "connected") {
      body = <MobileEmptyState icon="devicon:proxmox-plain" title={t("sessionNotConnected")} sub={t("sessionNotConnectedSub")} />;
    } else if (!isProxmoxHost) {
      body = <MobileEmptyState icon="devicon:proxmox-plain" title={t("notDetectedTitle")} sub={t("notDetectedSub")} />;
    } else if (state.error) {
      body = (
        <MobileEmptyState icon="lucide:triangle-alert" title={t("loadFailed")} sub={state.error}>
          <MobileButton variant="secondary" onClick={() => void px.fetchContainers()}>{t("refresh")}</MobileButton>
        </MobileEmptyState>
      );
    } else if (state.containers.length === 0) {
      body = <MobileEmptyState icon="lucide:box" title={t("noContainers")} />;
    } else {
      body = (
        <div className="flex-1 overflow-y-auto">
          {state.containers.map((c) => (
            <button
              key={c.vmid}
              data-mobile-proxmox-lxc={c.vmid}
              onClick={() => setSheetFor(c)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-(--t-bg-card) min-w-0"
            >
              <StatusDot tone={lxcStatusTone(c.status)} />
              <span className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-medium text-(--t-text-primary) truncate">{c.name}</span>
                <span className="text-xs text-(--t-text-dim) truncate">{t("ctSummary", { vmid: c.vmid, status: c.status })}</span>
              </span>
            </button>
          ))}
        </div>
      );
    }

    return (
      <div className="absolute inset-0 z-30 flex flex-col bg-(--t-bg-base)">
        <MobileScreenHeader title={t("title")} subtitle={session?.connectionName} onBack={onBack}>
          <button onClick={() => void px.fetchContainers()} disabled={state.loading} aria-label={t("refresh")} className="vt-icon-btn text-(--t-text-dim) disabled:opacity-(--disabled-opacity)">
            <Icon icon="lucide:refresh-cw" width={18} className={state.loading ? "animate-spin" : ""} />
          </button>
        </MobileScreenHeader>

        {body}

        {sheetFor && (
          <BottomSheet title={t("sheetTitleWithId", { name: sheetFor.name, vmid: sheetFor.vmid })} onClose={() => setSheetFor(null)}>
            <div className="flex flex-col">
              {actionsFor(sheetFor.status, t).map((it) => (
                <SheetRow key={it.action} icon={it.icon} label={it.label} onClick={() => void runAction(sheetFor, it.action)} />
              ))}
              <SheetRow icon="lucide:camera" label={t("snapshotsAction")} onClick={() => { const c = sheetFor; setSheetFor(null); px.openSnapshots(c.vmid, c.name); }} />
              <SheetRow icon="lucide:terminal" label={t("openShell")} onClick={() => void onShell(sheetFor)} />
            </div>
          </BottomSheet>
        )}
      </div>
    );
  };
}

function SheetRow({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return <SheetActionRow attr="mobile-proxmox-action" it={{ icon, label, slug: label, onTap: onClick }} />;
}
