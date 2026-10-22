import { useTranslation } from "react-i18next";
import HostPickerSheet from "./HostPickerSheet";
import { useOpenHost } from "../useOpenHost";

/** The terminal top bar's "+": pick a host and connect it in a new session, staying in the terminal. */
export default function NewSessionSheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const openHost = useOpenHost();
  return (
    <HostPickerSheet title={t("mobile.terminalTopBar.newSessionAriaLabel")} attr="new-session-host"
      emptyLabel={t("mobile.sheets.newSession.noHosts")} autoFocusSearch={false}
      onPick={(id) => { onClose(); openHost(id); }} onClose={onClose} />
  );
}
