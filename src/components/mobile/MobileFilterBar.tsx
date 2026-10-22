import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";

/**
 * Search / filter field for mobile lists. `pill` is the M3 search bar (48 dp, fully
 * rounded, tonal fill) used under a large top app bar; `attr` names the data hooks
 * (`data-<attr>` on the input, `data-<attr>-clear` on the clear button).
 */
export default function MobileFilterBar({
  value, onChange, placeholder, pill = false, attr = "mobile-filter", clearLabel, className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  pill?: boolean;
  attr?: string;
  clearLabel?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const effectivePlaceholder = placeholder ?? t("mobile.filterBar.placeholder");
  return (
    <div className={`${pill ? "px-4 py-2" : "px-3 py-2"} shrink-0 ${className}`}>
      <div
        className={pill ? "flex items-center gap-3 px-4 h-12 rounded-full" : "flex items-center gap-2 px-3 h-12 rounded-xl"}
        style={pill ? { background: "var(--t-bg-card)" } : { background: "var(--t-bg-card)", border: "1px solid var(--t-border)" }}
      >
        <Icon icon="lucide:search" width={pill ? 20 : 16} className="text-(--t-text-dim) shrink-0" />
        <input
          {...{ [`data-${attr}`]: "" }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={effectivePlaceholder}
          aria-label={effectivePlaceholder}
          className={`flex-1 min-w-0 self-stretch bg-transparent outline-none ${pill ? "text-base" : "text-sm"} text-(--t-text-primary) placeholder:text-(--t-text-dim)`}
        />
        {value && (
          <button
            {...{ [`data-${attr}-clear`]: "" }}
            onClick={() => onChange("")}
            aria-label={clearLabel}
            className="vt-icon-btn -mr-3 text-(--t-text-dim) active:text-(--t-text-primary)"
          >
            <Icon icon="lucide:x" width={pill ? 20 : 16} />
          </button>
        )}
      </div>
    </div>
  );
}
