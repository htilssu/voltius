import { Icon } from "@iconify/react";
import type { ReactNode } from "react";

/**
 * Centered empty / unavailable state of a full-screen mobile list: dim icon, title,
 * optional explanation and an optional action (a `MobileButton`). Exported on
 * `@voltius/ui` — the docker and proxmox mobile screens each carried a copy.
 */
export function MobileEmptyState({ icon, title, sub, children }: {
  icon: string;
  title: string;
  sub?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-2 text-(--t-text-dim)">
      <Icon icon={icon} width={32} />
      <span className="text-sm text-(--t-text-primary)">{title}</span>
      {sub && <span className="text-xs text-(--t-text-secondary)">{sub}</span>}
      {children && <div className="mt-2 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
