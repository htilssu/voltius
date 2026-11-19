import { useState } from "react";
import { Icon } from "@iconify/react";
import { ConfirmModal } from "@voltius/ui";
import { getProxmoxApi, useProxmoxT } from "../runtime";
import type { LxcSnapshot } from "../types";

interface Props {
  vmid: number;
  vmName: string;
  snapshots: LxcSnapshot[];
  snapshotInput: string;
  snapshotInputDesc: string;
  onSnapshotInputChange: (v: string) => void;
  onSnapshotDescChange: (v: string) => void;
  onCreate: (vmid: number, name: string, desc: string) => Promise<void>;
  onRollback: (vmid: number, name: string) => Promise<void>;
  onDelete: (vmid: number, name: string) => Promise<void>;
  onBack: () => void;
}

export function SnapshotList({
  vmid,
  vmName,
  snapshots,
  snapshotInput,
  snapshotInputDesc,
  onSnapshotInputChange,
  onSnapshotDescChange,
  onCreate,
  onRollback,
  onDelete,
  onBack,
}: Props) {
  const t = useProxmoxT();
  const [creating, setCreating] = useState(false);
  const [busySnap, setBusySnap] = useState<string | null>(null);
  const [confirmSnap, setConfirmSnap] = useState<{ name: string; mode: "rollback" | "delete" } | null>(null);

  const create = async () => {
    const name = snapshotInput.trim();
    if (!name) return;
    setCreating(true);
    try {
      await onCreate(vmid, name, snapshotInputDesc.trim());
      onSnapshotInputChange("");
      onSnapshotDescChange("");
    } catch (e) {
      getProxmoxApi()?.notifications.toast(t("snapshotFailed", { error: String(e) }), { severity: "error" });
    } finally {
      setCreating(false);
    }
  };

  const rollback = async (snapname: string) => {
    setBusySnap(snapname);
    try {
      await onRollback(vmid, snapname);
    } catch (e) {
      getProxmoxApi()?.notifications.toast(t("rollbackFailed", { error: String(e) }), { severity: "error" });
    } finally {
      setBusySnap(null);
    }
  };

  const del = async (snapname: string) => {
    setBusySnap(snapname);
    try {
      await onDelete(vmid, snapname);
    } catch (e) {
      getProxmoxApi()?.notifications.toast(t("deleteFailed", { error: String(e) }), { severity: "error" });
    } finally {
      setBusySnap(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-(--t-border) shrink-0">
        <button
          onClick={onBack}
          className="p-1 text-(--t-text-muted) hover:text-(--t-text-primary) rounded-sm hover:bg-(--t-bg-card-hover)"
        >
          <Icon icon="lucide:arrow-left" width={12} />
        </button>
        <span className="text-2xs font-medium text-(--t-text-primary) truncate">
          {t("sheetTitleWithId", { name: vmName, vmid })}
        </span>
      </div>

      {/* Create form */}
      <div className="flex flex-col gap-1 px-3 py-2 border-b border-(--t-border) shrink-0">
        <input
          type="text"
          value={snapshotInput}
          onChange={(e) => onSnapshotInputChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder={t("newSnapshotPlaceholder")}
          className="form-input w-full min-w-0 bg-(--t-bg-input) border border-(--t-border) rounded-md px-2 py-1 text-xs text-(--t-text-primary) placeholder:text-(--t-text-muted) outline-hidden focus:border-(--t-accent)"
        />
        <input
          type="text"
          value={snapshotInputDesc}
          onChange={(e) => onSnapshotDescChange(e.target.value)}
          placeholder={t("descriptionPlaceholder")}
          className="form-input w-full min-w-0 bg-(--t-bg-input) border border-(--t-border) rounded-md px-2 py-1 text-xs text-(--t-text-primary) placeholder:text-(--t-text-muted) outline-hidden focus:border-(--t-accent)"
        />
        <button
          onClick={create}
          disabled={creating || !snapshotInput.trim()}
          aria-busy={creating}
          className="btn btn-secondary self-start inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium"
        >
          <Icon icon={creating ? "lucide:loader-circle" : "lucide:plus"} width={12} className={creating ? "animate-spin" : undefined} />
          {t("createSnapshot")}
        </button>
      </div>

      {/* Snapshot list */}
      <div className="flex-1 overflow-y-auto">
        {snapshots.length === 0 ? (
          <div className="flex items-center justify-center h-16">
            <p className="text-2xs text-(--t-text-dim)">{t("noSnapshots")}</p>
          </div>
        ) : (
          snapshots.map((snap) => (
            <div
              key={snap.name}
              className="flex items-center gap-2 px-3 py-1.5 border-b border-(--t-border) last:border-0"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-2xs truncate ${snap.is_current ? "font-semibold text-(--t-text-primary)" : "text-(--t-text-primary)"}`}
                  >
                    {snap.name}
                  </span>
                  {snap.is_current && (
                    <span className="text-2xs px-1 rounded-sm bg-(--t-accent) text-(--t-on-accent) shrink-0">{t("hereBadge")}</span>
                  )}
                </div>
                {snap.timestamp && (
                  <p className="text-2xs text-(--t-text-muted) truncate">{snap.timestamp}</p>
                )}
                {snap.description && (
                  <p className="text-2xs text-(--t-text-muted) truncate">{snap.description}</p>
                )}
              </div>
              {!snap.is_current && (
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => setConfirmSnap({ name: snap.name, mode: "rollback" })}
                    disabled={busySnap !== null}
                    title={t("rollbackToSnapshot")}
                    className="p-1 rounded-sm hover:bg-(--t-bg-card-hover) text-(--t-text-muted) hover:text-(--t-text-primary) disabled:opacity-(--disabled-opacity)"
                  >
                    <Icon icon="lucide:history" width={11} />
                  </button>
                  <button
                    onClick={() => setConfirmSnap({ name: snap.name, mode: "delete" })}
                    disabled={busySnap !== null}
                    title={t("deleteSnapshot")}
                    className="p-1 rounded-sm hover:bg-(--t-bg-card-hover) text-(--t-status-error) opacity-60 hover:opacity-100 disabled:opacity-(--disabled-opacity)"
                  >
                    <Icon icon="lucide:trash-2" width={11} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {confirmSnap && (
        <ConfirmModal
          title={confirmSnap.mode === "rollback" ? t("rollbackConfirmTitle") : t("deleteSnapshotConfirmTitle")}
          message={confirmSnap.mode === "rollback"
            ? t("rollbackConfirmBody", { name: vmName, snap: confirmSnap.name })
            : t("deleteSnapshotConfirmBody", { snap: confirmSnap.name })}
          confirmLabel={confirmSnap.mode === "rollback" ? t("rollbackButton") : t("delete")}
          onCancel={() => setConfirmSnap(null)}
          onConfirm={() => {
            const { name, mode } = confirmSnap;
            setConfirmSnap(null);
            void (mode === "rollback" ? rollback(name) : del(name));
          }}
        />
      )}
    </div>
  );
}
