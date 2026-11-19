import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";

interface Props {
  pinned: boolean;
  onToggle: () => void;
  size?: number;
}

export function PinButton({ pinned, onToggle, size = 15 }: Props) {
  const { t } = useTranslation();
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      title={pinned ? t("common.action.unpin") : t("common.action.pin")}
      className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${pinned ? "text-(--t-accent)" : "text-(--t-text-dim) hover:text-(--t-text-primary)"}`}
    >
      <Icon icon={pinned ? "lucide:pin" : "lucide:pin-off"} width={size} />
    </button>
  );
}
