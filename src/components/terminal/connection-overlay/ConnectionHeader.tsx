import { Icon } from "@iconify/react";

export function ConnectionHeader({
  icon,
  name,
  subtitle,
  isConnecting,
  showSpecialPanel,
}: {
  icon: string;
  name: string;
  subtitle?: string;
  isConnecting: boolean;
  showSpecialPanel: boolean;
}) {
  return (
    <>
      <div className="relative">
        <div className="w-10 h-10 rounded-lg bg-(--t-accent)/10 border border-(--t-accent)/20 flex items-center justify-center">
          <Icon icon={icon} width={18} className="text-(--t-accent)" />
        </div>
        {isConnecting && !showSpecialPanel && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none text-(--t-accent)"
            viewBox="0 0 40 40"
          >
            {/* pathLength pins the dash pattern to the border-trace keyframe offset (-193). */}
            <rect
              x="0.5"
              y="0.5"
              width="39"
              height="39"
              rx="7.5"
              ry="7.5"
              pathLength={193}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="48 145"
              strokeLinecap="round"
              style={{ animation: "border-trace 0.8s linear infinite" }}
            />
          </svg>
        )}
      </div>

      <div>
        <p className="text-(--t-text-primary) font-medium text-base leading-tight">{name}</p>
        {subtitle && <p className="text-(--t-text-muted) text-xs mt-1">{subtitle}</p>}
      </div>
    </>
  );
}
