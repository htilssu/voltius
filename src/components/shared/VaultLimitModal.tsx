import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { Modal, ModalCard } from "@/components/shared/Modal";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useVaultStore } from "@/stores/vaultStore";
import { useUIStore } from "@/stores/uiStore";
import { startTrialOrCheckout } from "@/services/promos";
import { usePlanDisplay } from "@/services/planDisplay";
import { AvailableWithPlan } from "@/components/shared/AvailableWithPlan";

/** Free accounts keep the one vault they start with; more vaults are a Pro feature. */
export function useVaultLimitReached(): boolean {
  const isPro = useSubscriptionStore((s) => s.isPro);
  const vaultCount = useVaultStore((s) => s.vaults.length);
  return !isPro && vaultCount >= 1;
}

export function VaultLimitModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const isCloudAccount = useSubscriptionStore((s) => s.accountMode === "server");
  const openCloudAuth = useUIStore((s) => s.openCloudAuth);
  const { showUpgrade } = usePlanDisplay();

  const upgrade = async () => {
    if (await startTrialOrCheckout("pro", "vault_limit", "vaults")) onClose();
  };
  const signIn = () => {
    onClose();
    openCloudAuth("signin");
  };

  return (
    <Modal onClose={onClose}>
      <ModalCard solid className="flex flex-col gap-4 p-6 w-[min(25rem,calc(100vw-2rem))]">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "color-mix(in srgb, var(--t-accent) 12%, transparent)" }}
          >
            <Icon icon="lucide:vault" width={20} style={{ color: "var(--t-accent)" }} />
          </div>
          <div>
            <p className="text-base font-semibold text-(--t-text-primary) mb-1">
              {t("layout.vaultSidebar.multipleVaultsTitle")}
            </p>
            <p className="text-sm text-(--t-text-muted) leading-relaxed">
              {t("layout.vaultSidebar.multipleVaultsBody")}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {isCloudAccount && !showUpgrade ? <AvailableWithPlan plan="Pro" className="py-2" /> : (
          <button
            onClick={isCloudAccount ? () => void upgrade() : signIn}
            className="btn btn-primary w-full py-2.5 rounded-lg text-sm font-semibold"
          >
            {isCloudAccount ? t("layout.vaultSidebar.upgradeToPro") : t("layout.vaultSidebar.signInOrCreate")}
          </button>
          )}
          <button
            onClick={onClose}
            className="btn btn-ghost w-full py-2.5 rounded-lg text-sm"
          >
            {t("layout.vaultSidebar.maybeLater")}
          </button>
        </div>
      </ModalCard>
    </Modal>
  );
}
