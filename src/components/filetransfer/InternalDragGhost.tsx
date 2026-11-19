import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { useMoveDragState, useSemanticDragState } from "./internalDrag";

export function InternalDragGhost() {
  const { t } = useTranslation();
  const semantic = useSemanticDragState();
  const move = useMoveDragState();
  // OS-originated drags supply their own cursor visualization, so we suppress
  // ours to avoid double ghosts.
  if (!semantic || semantic.side === "external") return null;

  const count = semantic.files.length;
  const hasDir = semantic.files.some((f) => f.isDir);
  const single = count === 1 ? semantic.files[0] : null;
  const label = single ? single.name : t("fileTransfer.common.itemsCount", { count });
  const iconName = single
    ? (single.isDir ? "lucide:folder" : "lucide:file")
    : (hasDir ? "lucide:folder" : "lucide:file");
  const iconColor = (single?.isDir ?? hasDir) ? "text-(--t-file-folder)" : "text-(--t-text-dim)";

  return createPortal(
    <div
      className="fixed pointer-events-none z-[9999] flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap bg-(--t-bg-card) border border-(--t-accent) text-(--t-text-primary)"
      style={{ left: move.x + 12, top: move.y + 12, boxShadow: "var(--t-elev-2)" }}
    >
      <Icon icon={iconName} width={14} className={iconColor} />
      <span>{label}</span>
      {count > 1 && (
        <span className="rounded-full px-1.5 text-2xs font-semibold leading-[18px] bg-(--t-accent) text-(--t-on-accent)">
          {count}
        </span>
      )}
    </div>,
    document.body,
  );
}
