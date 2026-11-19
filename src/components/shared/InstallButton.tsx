import { Icon } from "@iconify/react";

export function InstallButton({ label, busy, onClick, disabledReason = null, compact = false }: {
  label: string;
  busy: boolean;
  onClick: () => void;
  disabledReason?: string | null;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={disabledReason ?? undefined}
      disabled={busy || disabledReason !== null}
      onClick={onClick}
      className={compact
        ? "btn btn-secondary flex items-center gap-1 px-2 py-0.5 rounded-sm text-2xs font-medium shrink-0"
        : "btn btn-primary flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0"}
    >
      <Icon icon={busy ? "lucide:loader" : "lucide:download"} width={compact ? 10 : 12} className={busy ? "animate-spin" : undefined} />
      {label}
    </button>
  );
}
