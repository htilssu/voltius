import { haptic, toggleHaptic } from "@/lib/haptics";

interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
}

export function Toggle({ checked, onChange, disabled, "aria-label": ariaLabel }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      data-row-control
      onClick={() => { haptic(toggleHaptic(!checked)); onChange(!checked); }}
      className={`relative shrink-0 w-9 h-5 rounded-full transition-colors duration-200 shadow-(--t-ring) disabled:opacity-(--disabled-opacity) disabled:cursor-not-allowed ${checked ? "bg-(--t-accent)" : "bg-(--t-bg-input)"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 size-4 rounded-full transition-[transform,background-color] duration-200 ${checked ? "translate-x-4 bg-(--t-on-accent)" : "translate-x-0 bg-(--t-text-muted)"}`}
      />
    </button>
  );
}
