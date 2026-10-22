import { useTranslation } from "react-i18next";
import HostPickerSheet from "./HostPickerSheet";

/** SFTP's host picker: SSH-capable hosts only. */
export default function SftpHostPickerSheet({
  excludeId, onPick, onClose,
}: { excludeId?: string; onPick: (id: string) => void; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <HostPickerSheet title={t("mobile.sftp.chooseHost")} attr="sftp-host" emptyLabel={t("mobile.sheets.sftpHostPicker.noSshHosts")}
      sshOnly excludeId={excludeId} onPick={onPick} onClose={onClose} />
  );
}
