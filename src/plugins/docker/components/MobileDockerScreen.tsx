import { useMemo, useState } from "react";
import { Icon, BottomSheet, useT, useSessionById, MobileScreenHeader, MobileButton, MobileEmptyState, SheetActionRow, StatusDot } from "@voltius/ui";
import type { FC } from "react";
import type { PluginAPI, MobileScreenProps } from "@/plugins/api";
import { createMobileDockerListService } from "../services";
import { useDockerList } from "../useDockerList";
import type { ContainerAction, DockerContainer } from "../types";
import { containerStateTone } from "../containerStateTone";
import { PortChips } from "./PortChips";

function containerName(c: DockerContainer): string {
  return c.names[0] ?? c.id.slice(0, 12);
}

interface ActionItem {
  action: ContainerAction;
  label: string;
  icon: string;
  danger?: boolean;
}

function actionsFor(state: string, t: PluginAPI["i18n"]["t"]): ActionItem[] {
  if (state === "running") {
    return [
      { action: "stop", label: t("hostStop"), icon: "lucide:square" },
      { action: "restart", label: t("hostRestart"), icon: "lucide:rotate-cw" },
      { action: "pause", label: t("hostPause"), icon: "lucide:pause" },
    ];
  }
  if (state === "paused") {
    return [
      { action: "unpause", label: t("hostResume"), icon: "lucide:play" },
      { action: "stop", label: t("hostStop"), icon: "lucide:square" },
    ];
  }
  return [{ action: "start", label: t("hostStart"), icon: "lucide:play" }];
}

export function createMobileDockerScreen(api: PluginAPI): FC<MobileScreenProps> {
  const dockerListService = createMobileDockerListService();

  return function MobileDockerScreen({ sessionId, onBack }) {
    const t = useT(api);
    const session = useSessionById(api, sessionId);

    const { containers, loading, error, dockerUnreachable, refresh, act, openExecTerminal } = useDockerList(
      dockerListService,
      session ?? undefined,
    );

    const [showAll, setShowAll] = useState(false);
    const [sheetFor, setSheetFor] = useState<DockerContainer | null>(null);
    const [confirmRemove, setConfirmRemove] = useState<DockerContainer | null>(null);

    const ready = session?.type === "ssh" && session.status === "connected";

    const visible = useMemo(
      () => (showAll ? containers : containers.filter((c) => c.state === "running" || c.state === "paused")),
      [containers, showAll],
    );

    const runAction = async (c: DockerContainer, action: ContainerAction) => {
      setSheetFor(null);
      try {
        await act(c.id, action);
      } catch (e) {
        api.notifications.toast(t("actionFailed", { error: String(e) }), { severity: "error" });
      }
    };

    let body: React.ReactNode;
    if (!session || session.type !== "ssh") {
      body = <MobileEmptyState icon="custom:docker" title={t("needsSshTitle")} sub={t("needsSshSub")} />;
    } else if (session.status !== "connected") {
      body = <MobileEmptyState icon="custom:docker" title={t("sessionNotConnected")} sub={t("sessionNotConnectedSub")} />;
    } else if (dockerUnreachable) {
      body = (
        <MobileEmptyState icon="custom:docker" title={t("unreachableTitle")} sub={t("unreachableSub")}>
          <MobileButton variant="secondary" onClick={() => void refresh()}>{t("refresh")}</MobileButton>
        </MobileEmptyState>
      );
    } else if (error) {
      body = (
        <MobileEmptyState icon="lucide:triangle-alert" title={t("loadFailed")} sub={error}>
          <MobileButton variant="secondary" onClick={() => void refresh()}>{t("refresh")}</MobileButton>
        </MobileEmptyState>
      );
    } else if (visible.length === 0) {
      body = (
        <MobileEmptyState
          icon="lucide:box"
          title={containers.length === 0 ? t("noContainers") : t("noRunningContainers")}
          sub={containers.length === 0 ? undefined : t("tapRunningToShowAll")}
        />
      );
    } else {
      body = (
        <div className="flex-1 overflow-y-auto">
          {visible.map((c) => {
            const onOpen = () => ready && setSheetFor(c);
            return (
              <div
                key={c.id}
                data-mobile-docker-container={c.id}
                role="button"
                tabIndex={0}
                onClick={onOpen}
                onKeyDown={(e) => {
                  // A keydown on the port-chip button inside this row bubbles up
                  // here; without this guard, preventDefault() on Enter/Space kills
                  // the chip's own activation and reopens the action sheet instead.
                  if (e.target !== e.currentTarget) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpen();
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-(--t-bg-card) min-w-0"
              >
                <StatusDot tone={containerStateTone(c.state)} />
                <span className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-medium text-(--t-text-primary) truncate">{containerName(c)}</span>
                  <span className="text-xs text-(--t-text-dim) truncate">{c.image}</span>
                  <PortChips ports={c.ports} sessionId={sessionId} isRemote size="md" />
                </span>
                <span className="shrink-0 text-2xs text-(--t-text-dim) truncate max-w-[40%]">{c.status}</span>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="absolute inset-0 z-30 flex flex-col bg-(--t-bg-base)">
        <MobileScreenHeader title={t("title")} subtitle={session?.connectionName} onBack={onBack}>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowAll((v) => !v)}
              className="text-xs px-2 py-1 rounded-lg"
              style={{
                background: showAll ? "var(--t-bg-card)" : "transparent",
                color: showAll ? "var(--t-text-primary)" : "var(--t-text-dim)",
              }}
            >
              {showAll ? t("filterAll") : t("filterRunning")}
            </button>
            <button onClick={() => void refresh()} disabled={loading} aria-label={t("refresh")} className="vt-icon-btn text-(--t-text-dim) disabled:opacity-(--disabled-opacity)">
              <Icon icon="lucide:refresh-cw" width={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </MobileScreenHeader>

        {body}

        {sheetFor && (
          <BottomSheet title={containerName(sheetFor)} onClose={() => setSheetFor(null)}>
            <div className="flex flex-col">
              {actionsFor(sheetFor.state, t).map((it) => (
                <SheetRow key={it.action} icon={it.icon} label={it.label} onClick={() => void runAction(sheetFor, it.action)} />
              ))}
              <SheetRow
                icon="lucide:scroll-text"
                label={t("logs")}
                onClick={() => {
                  const c = sheetFor;
                  setSheetFor(null);
                  api.ui.pushMobileScreen({ kind: "docker-logs", sessionId, containerId: c.id, containerName: containerName(c) });
                }}
              />
              <SheetRow
                icon="lucide:terminal"
                label={t("execShell")}
                onClick={() => {
                  const c = sheetFor;
                  setSheetFor(null);
                  void openExecTerminal(c.id, containerName(c));
                }}
              />
              <SheetRow
                icon="lucide:trash-2"
                label={t("remove")}
                danger
                onClick={() => {
                  setConfirmRemove(sheetFor);
                  setSheetFor(null);
                }}
              />
            </div>
          </BottomSheet>
        )}

        {confirmRemove && (
          <BottomSheet title={t("removeConfirmTitle")} onClose={() => setConfirmRemove(null)}>
            <div className="flex flex-col gap-3 px-2 py-1">
              <p className="text-sm text-(--t-text-secondary)">
                {t("removeConfirmBody", { name: containerName(confirmRemove) })}
              </p>
              <MobileButton
                block
                variant="danger"
                data-mobile-docker-remove-confirm
                onClick={() => {
                  const c = confirmRemove;
                  setConfirmRemove(null);
                  void runAction(c, "remove");
                }}
              >
                {t("remove")}
              </MobileButton>
              <MobileButton block variant="secondary" onClick={() => setConfirmRemove(null)}>
                {t("cancel")}
              </MobileButton>
            </div>
          </BottomSheet>
        )}
      </div>
    );
  };
}

function SheetRow({ icon, label, onClick, danger }: { icon: string; label: string; onClick: () => void; danger?: boolean }) {
  return <SheetActionRow attr="mobile-docker-action" it={{ icon, label, slug: label, danger, onTap: onClick }} />;
}
