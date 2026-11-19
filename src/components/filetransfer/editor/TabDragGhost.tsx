import { createPortal } from "react-dom";
import { useTabDragSemantic, useTabMove } from "./tabDrag";

export function TabDragGhost() {
  const sem = useTabDragSemantic();
  const { x, y } = useTabMove();
  if (!sem) return null;
  return createPortal(
    <div
      className="pointer-events-none fixed z-[200] px-2 py-1 rounded text-xs truncate"
      style={{
        left: x + 12,
        top: y + 12,
        maxWidth: "220px",
        background: "var(--t-bg-card)",
        border: "1px solid var(--t-border)",
        color: "var(--t-text-primary)",
        boxShadow: "var(--t-elev-2)",
      }}
    >
      {sem.label}
    </div>,
    document.body,
  );
}
