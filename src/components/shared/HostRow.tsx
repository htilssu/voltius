import type { ReactNode } from "react";
import { Icon } from "@iconify/react";
import { HOST_PICKER_DENSITY, type HostPickerDensity } from "./HostPickerTree";

export function HostRow({ avatar, name, sub, isSelected, onClick, disabled = false, trailing, density = "compact" }: {
  avatar: ReactNode;
  name: string;
  sub: string;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
  trailing?: ReactNode;
  density?: HostPickerDensity;
}) {
  const still = isSelected || disabled;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center ${HOST_PICKER_DENSITY[density].row} transition-colors text-left disabled:opacity-(--disabled-opacity) disabled:cursor-default ${isSelected ? "bg-(--t-bg-card-hover)" : still ? "" : "hover:bg-(--t-bg-elevated)"}`}
    >
      {avatar}
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate font-medium text-(--t-text-bright)">{name}</p>
        <p className="text-xs truncate text-(--t-text-secondary)">{sub}</p>
      </div>
      {trailing}
      {isSelected && <Icon icon="lucide:check" width={14} className="text-(--t-accent) shrink-0" />}
    </button>
  );
}

/** Square 28px avatar tile for picker rows; a selected tile fills with the accent and shows a check. */
export function PickTile({ icon, selected = false }: { icon: string; selected?: boolean }) {
  return (
    <div
      className={`rounded-lg flex items-center justify-center shrink-0 w-7 h-7 transition-colors ${selected ? "bg-(--t-accent) text-(--t-on-accent)" : "bg-(--t-bg-elevated) text-(--t-text-dim)"}`}
    >
      <Icon icon={selected ? "lucide:check" : icon} width={selected ? 13 : 14} />
    </div>
  );
}
