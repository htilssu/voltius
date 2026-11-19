import { useTranslation } from "react-i18next";

export function ReadOnlyBadge({ tip, className = "" }: { tip: string; className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      data-read-only-badge
      title={tip}
      className={`px-1.5 py-0.5 rounded-sm text-2xs shrink-0 text-(--t-text-muted) bg-(--t-bg-card-hover) ${className}`}
    >
      {t("fileTransfer.myDevices.readOnlyBadge")}
    </span>
  );
}
