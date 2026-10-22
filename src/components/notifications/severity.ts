/** Icon + colour per notification severity, shared by the desktop popover and the mobile sheet. */
export const SEVERITY_ICONS: Record<string, string> = {
  info: "lucide:info",
  success: "lucide:circle-check-big",
  warning: "lucide:triangle-alert",
  error: "lucide:circle-x",
};

export const SEVERITY_COLORS: Record<string, string> = {
  info: "var(--t-accent)",
  success: "var(--t-status-connected)",
  warning: "var(--t-status-warning)",
  error: "var(--t-status-error)",
};

export const severityIcon = (s: string) => SEVERITY_ICONS[s] ?? SEVERITY_ICONS.info;
export const severityColor = (s: string) => SEVERITY_COLORS[s] ?? SEVERITY_COLORS.info;

/** Badge text: 1–9, then "9+". */
export const badgeLabel = (count: number) => (count > 9 ? "9+" : String(count));
