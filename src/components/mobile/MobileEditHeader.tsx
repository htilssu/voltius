import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { APPBAR_TONAL } from "./MobileHeader";

export interface EditPrimaryAction {
  label: string;
  /** Data attribute suffix of the button, e.g. `mobile-snippet-save`. */
  attr: string;
  disabled?: boolean;
  onClick: () => void;
}

/**
 * M3 small top app bar of a mobile edit screen: back arrow, title, then either nothing
 * (the form autosaves), a single text primary action (a form that saves explicitly), and
 * an optional overflow menu. Turns tonal once the body scrolls (`group/appbar` +
 * `data-scrolled`, see useCollapsingHeader).
 */
export default function MobileEditHeader({
  title, onBack, primary, onOverflow,
}: {
  title: string;
  onBack: () => void;
  primary?: EditPrimaryAction;
  onOverflow?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <header data-mobile-appbar data-mobile-edit-appbar className={`shrink-0 h-16 flex items-center gap-1 pl-1 pr-1 bg-(--t-bg-base) ${APPBAR_TONAL}`}>
      <button
        data-mobile-back
        onClick={onBack}
        aria-label={t("mobile.sheets.shared.back")}
        className="w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-(--t-text-primary)"
      >
        <Icon icon="lucide:arrow-left" width={24} />
      </button>
      <span className="flex-1 min-w-0 truncate text-xl font-medium text-(--t-text-primary)">{title}</span>
      {primary && (
        <button
          {...{ [`data-${primary.attr}`]: true }}
          onClick={primary.onClick}
          disabled={primary.disabled}
          className="h-10 px-3 mr-1 rounded-full text-sm font-medium text-(--t-accent) disabled:opacity-40"
        >
          {primary.label}
        </button>
      )}
      {onOverflow && (
        <button
          data-mobile-edit-overflow
          onClick={onOverflow}
          aria-label={t("common.action.moreOptions")}
          className="w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-(--t-text-primary)"
        >
          <Icon icon="lucide:ellipsis-vertical" width={22} />
        </button>
      )}
    </header>
  );
}
