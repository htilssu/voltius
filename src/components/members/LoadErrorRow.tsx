import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { statusSurface } from "@/components/shared/statusSurface";

/** A failed list load with nothing cached to show: the reason and a Retry that refetches. */
export function LoadErrorRow({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs" style={statusSurface("error")}>
      <Icon icon="lucide:circle-alert" width={14} className="shrink-0" />
      <span className="flex-1">{message}</span>
      <button type="button" onClick={onRetry} className="btn btn-ghost px-2 py-1 rounded-md text-xs">{t("common.action.retry")}</button>
    </div>
  );
}
