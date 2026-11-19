import { useTranslation } from "react-i18next";
import { StateTile } from "@/components/team/StateTile";

export function MembersEmptyState({ kind }: { kind: "noVault" | "vaultNotFound" }) {
  const { t } = useTranslation();
  if (kind === "vaultNotFound") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center bg-(--t-bg-base)">
        <StateTile icon="lucide:vault" />
        <p className="text-sm text-(--t-text-dim)">{t("members.empty.vaultNotFound")}</p>
      </div>
    );
  }
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-(--t-bg-base)">
      <StateTile icon="lucide:users-round" />
      <div className="flex flex-col items-center gap-1.5 text-center">
        <span className="text-base font-semibold text-(--t-text-primary)">{t("members.empty.noVaultTitle")}</span>
        <span className="text-sm text-(--t-text-dim) max-w-72">{t("members.empty.noVaultDesc")}</span>
      </div>
    </div>
  );
}
