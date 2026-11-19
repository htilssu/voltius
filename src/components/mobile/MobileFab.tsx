import { Icon } from "@iconify/react";
import { greyedTapProps } from "./tapOrExplain";

export default function MobileFab({
  attr, icon, label, extended, onTap, disabledReason,
}: { attr: string; icon: string; label: string; extended: boolean; onTap: () => void; disabledReason?: string | null }) {
  return (
    <button
      {...{ [`data-${attr}`]: "" }}
      data-mobile-fab={extended ? "extended" : "collapsed"}
      data-snackbar-avoid
      aria-label={label}
      {...greyedTapProps(disabledReason, onTap)}
      className="absolute right-4 bottom-4 z-10 h-14 flex items-center pl-4 rounded-lg text-sm font-medium transition-[padding] duration-(--vt-dur-medium2) ease-(--vt-ease-emphasized) aria-disabled:opacity-(--disabled-opacity)"
      style={{ background: "var(--t-accent)", color: "var(--t-on-accent)", boxShadow: "var(--t-elev-2)", paddingRight: extended ? 20 : 16 }}
    >
      <Icon icon={icon} width={24} className="shrink-0" />
      <span
        aria-hidden
        className="overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin-left] duration-(--vt-dur-medium2) ease-(--vt-ease-emphasized)"
        style={{ maxWidth: extended ? 200 : 0, opacity: extended ? 1 : 0, marginLeft: extended ? 12 : 0 }}
      >
        {label}
      </span>
    </button>
  );
}
