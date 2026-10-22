import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import MobileEditScreen, { useAutosaveExit } from "../MobileEditScreen";
import KeychainItemActionsSheet from "../sheets/KeychainItemActionsSheet";
import { KeyForm } from "@/components/keychain/KeyForm";
import { useAllKeys } from "@/hooks/useAllKeys";
import { useVaultScope } from "@/hooks/useVaultScope";
import { useMobileNavStore } from "@/stores/mobileNavStore";
import { useEditedItem } from "@/hooks/useEditedItem";
import { saveKeyFromForm } from "@/services/keychainForm";

/** New / edit SSH key. Autosaves like the host screen: no Save button, ⋮ once it exists. */
export default function MobileKeyEditScreen({ keyId, mode }: { keyId?: string; mode?: "import" | "generate" }) {
  const { t } = useTranslation();
  const pop = useMobileNavStore((s) => s.pop);
  const { createVaultId } = useVaultScope();
  const { editing, gone, onCreated } = useEditedItem(useAllKeys(), keyId, pop);
  const flushRef = useRef<(() => void) | null>(null);
  const [actions, setActions] = useState(false);
  const exit = useAutosaveExit();

  return (
    <MobileEditScreen
      form="key"
      title={editing ? t("keychain.keyForm.titleEdit") : t("keychain.toolbar.newKey")}
      onLeave={() => { flushRef.current?.(); pop(); }}
      onDiscard={pop}
      onOverflow={editing ? () => setActions(true) : undefined}
      overlay={actions && editing && <KeychainItemActionsSheet kind="key" item={editing} fromEditor onClose={() => setActions(false)} />}
      {...exit.screenProps}
    >
      <KeyForm
        hideChrome
        {...exit.formProps}
        initial={editing ?? undefined}
        initialMode={mode}
        flushRef={flushRef}
        onSubmit={(data, privateKey, publicKey, passphrase) => (gone
          ? undefined
          : saveKeyFromForm(editing, data, privateKey, publicKey, passphrase, createVaultId, onCreated))}
        onClose={pop}
      />
    </MobileEditScreen>
  );
}
