const TONES = {
  /** Default: an accent dot on a neutral control. */
  accent: "bg-(--t-accent) text-(--t-on-accent)",
  /** For a badge sitting on an accent-filled control, where an accent dot would disappear. */
  inverse: "bg-(--t-bg-base) text-(--t-accent) border border-(--t-accent)",
} as const;

/**
 * The small corner count on a toolbar control (unread notifications, pending
 * invites). Neutral information, so never the error colour. Position it with
 * `className` (e.g. `absolute -top-1.5 -right-1.5`).
 */
export function CountBadge({ count, max = 99, tone = "accent", className = "" }: {
  count: number;
  max?: number;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  if (count <= 0) return null;
  return (
    <span
      className={`flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-2xs font-semibold leading-none tabular-nums ${TONES[tone]} ${className}`}
    >
      {count > max ? `${max}+` : count}
    </span>
  );
}
