import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { TunnelType } from "@/types";

const BADGE = "text-2xs px-1.5 py-0.5 rounded-sm font-medium shrink-0 leading-none whitespace-nowrap";
const NEUTRAL = "bg-(--t-bg-elevated) text-(--t-text-muted)";

/** Token tint for a badge; inline because the colour var is chosen at runtime. */
function tint(color: string): CSSProperties {
  return { background: `color-mix(in srgb, ${color} 14%, transparent)`, color };
}

function Badge({ className = NEUTRAL, style, title, children }: { className?: string; style?: CSSProperties; title?: string; children: ReactNode }) {
  return <span className={`${BADGE} ${style ? "" : className}`} style={style} title={title}>{children}</span>;
}

/** Local / Remote / SOCKS5 marker — shared by rule cards and active-tunnel rows. */
export function TunnelTypeBadge({ tunnelType }: { tunnelType: TunnelType | null | undefined }) {
  const { t } = useTranslation();
  const type = tunnelType ?? "local";
  if (type === "remote") return <Badge style={tint("var(--t-status-warning)")}>{t("portForwarding.activeTunnels.remote")}</Badge>;
  if (type === "dynamic") return <Badge className="border border-(--t-border) bg-(--t-bg-input) text-(--t-text-secondary)">{t("portForwarding.activeTunnels.socks5")}</Badge>;
  return <Badge style={tint("var(--t-accent)")}>{t("portForwarding.activeTunnels.local")}</Badge>;
}

/** Auto-detected vs ad-hoc forward. Neutral on purpose: provenance, not status. */
export function TunnelOriginBadge({ auto }: { auto: boolean }) {
  const { t } = useTranslation();
  return <Badge>{auto ? t("portForwarding.activeTunnels.auto") : t("portForwarding.activeTunnels.adHoc")}</Badge>;
}

/** Count of connections a rule is scoped to. */
export function ScopedCountBadge({ title, children }: { title: string; children: ReactNode }) {
  return <Badge title={title}>{children}</Badge>;
}
