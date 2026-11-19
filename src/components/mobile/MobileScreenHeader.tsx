import { Icon } from "@iconify/react";
import type { ReactNode } from "react";

/**
 * Title bar of a full-screen mobile screen: back arrow (omitted when `onBack` is
 * not given), title with an optional second line, and a right-hand slot for the
 * screen's own controls. Exported on `@voltius/ui` — every mobile plugin screen
 * carried a copy; the in-app pushed panels use it through `MobilePanelHeader`.
 */
export function MobileScreenHeader({ title, subtitle, onBack, children }: {
  title: string;
  subtitle?: string | null;
  onBack?: () => void;
  children?: ReactNode;
}) {
  return (
    <header
      className="shrink-0 flex items-center gap-2 px-2 h-12 border-b"
      style={{ background: "var(--t-bg-chrome)", borderColor: "var(--t-border)" }}
    >
      {onBack ? (
        <button data-mobile-back onClick={onBack} className="vt-icon-btn text-(--t-text-primary)">
          <Icon icon="lucide:arrow-left" width={22} />
        </button>
      ) : <span className="w-2" />}
      <span className="flex flex-col min-w-0 flex-1">
        <span className="text-base font-semibold text-(--t-text-primary) leading-tight truncate">{title}</span>
        {subtitle && (
          <span className="text-2xs text-(--t-text-dim) leading-tight truncate">{subtitle}</span>
        )}
      </span>
      {children}
    </header>
  );
}
