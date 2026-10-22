import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import MobileEditScreen, { useAutosaveExit } from "../MobileEditScreen";
import KeychainItemActionsSheet from "../sheets/KeychainItemActionsSheet";
import { IdentityForm } from "@/components/keychain/IdentityForm";
import { useAllIdentities } from "@/hooks/useAllIdentities";
import { useVaultScope } from "@/hooks/useVaultScope";
import { useMobileNavStore } from "@/stores/mobileNavStore";
import { useEditedItem } from "@/hooks/useEditedItem";
import { saveIdentityFromForm } from "@/services/keychainForm";

/** New / edit identity. Autosaves like the host screen: no Save button, ⋮ once it exists. */
export default function MobileIdentityEditScreen({ identityId }: { identityId?: string }) {
  const { t } = useTranslation();
  const pop = useMobileNavStore((s) => s.pop);
  const { createVaultId } = useVaultScope();
  const { editing, gone, onCreated } = useEditedItem(useAllIdentities(), identityId, pop);
  const flushRef = useRef<(() => void) | null>(null);
  const inlineKeyIdRef = useRef<string | null>(null);
  const [actions, setActions] = useState(false);
  const exit = useAutosaveExit();

  return (
    <MobileEditScreen
      form="identity"
      title={editing ? t("keychain.identityForm.titleEdit") : t("keychain.toolbar.newIdentity")}
      onLeave={() => { flushRef.current?.(); pop(); }}
      onDiscard={pop}
      onOverflow={editing ? () => setActions(true) : undefined}
      overlay={actions && editing && <KeychainItemActionsSheet kind="identity" item={editing} fromEditor onClose={() => setActions(false)} />}
      {...exit.screenProps}
    >
      <IdentityForm
        hideChrome
        {...exit.formProps}
        initial={editing ?? undefined}
        flushRef={flushRef}
        onSubmit={(data, password, inlineKeyMaterial) => (gone
          ? undefined
          : saveIdentityFromForm(editing, data, password, inlineKeyMaterial, inlineKeyIdRef, createVaultId, onCreated))}
        onClose={pop}
      />
    </MobileEditScreen>
  );
}
