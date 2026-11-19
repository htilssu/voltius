import { Icon } from "@iconify/react";

/**
 * The small neutral icon tile that heads a full-pane state (no vault, vault
 * unavailable, sign in / upgrade prompts). One size and look for all of them
 * instead of each pane growing its own oversized gradient tile.
 */
export function StateTile({ icon, accent = false }: { icon: string; accent?: boolean }) {
  return (
    <div
      className={`flex items-center justify-center w-10 h-10 rounded-lg border border-(--t-border) bg-(--t-bg-toolbar) shrink-0 ${accent ? "text-(--t-accent)" : "text-(--t-text-dim)"}`}
    >
      <Icon icon={icon} width={20} />
    </div>
  );
}
