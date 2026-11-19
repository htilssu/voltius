import { Icon } from "@iconify/react";

/** 20px session/connection icon tile used by the pane header and its drag ghost. */
export function SessionIconTile({
  icon,
  bg,
  className = "",
  ref,
  ...rest
}: {
  icon: string;
  /** Brand fill (distro/app color). Without one the tile is neutral. */
  bg?: string;
  ref?: React.Ref<HTMLSpanElement>;
} & Omit<React.HTMLAttributes<HTMLSpanElement>, "style">) {
  return (
    <span
      ref={ref}
      className={`size-5 rounded-md flex items-center justify-center shrink-0 ${className}`}
      // Icon on a brand-color fill: fixed white, same as on a solid status fill.
      style={{ background: bg ?? "var(--t-bg-elevated)", color: bg ? "var(--t-on-status)" : "var(--t-text-secondary)" }}
      {...rest}
    >
      <Icon icon={icon} width={13} />
    </span>
  );
}
