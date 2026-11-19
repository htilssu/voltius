import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import BottomSheet from "./BottomSheet";
import { MobileButton } from "../MobileButton";
import { FolderAppearanceFields, type FolderAppearance } from "@/components/folders/folderAppearance";

export type FolderEdit = { name: string } & FolderAppearance;

export default function FolderFormSheet({
  title, initialName = "", initialAppearance = {}, submitLabel, onSubmit, onClose, children,
}: {
  title: string;
  initialName?: string;
  initialAppearance?: FolderAppearance;
  submitLabel?: string;
  onSubmit: (edit: FolderEdit) => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [appearance, setAppearance] = useState<FolderAppearance>(initialAppearance);
  const trimmed = name.trim();
  return (
    <BottomSheet title={title} onClose={onClose}>
      <div className="px-3 pt-1 pb-3 flex flex-col gap-3">
        <input
          data-folder-name-input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("mobile.sftp.folderNamePlaceholder")}
          className="w-full h-11 px-3 rounded-lg bg-(--t-bg-card) outline-none text-sm text-(--t-text-primary)"
          style={{ border: "1px solid var(--t-border)" }}
        />
        <FolderAppearanceFields value={appearance} onChange={setAppearance} />
        <MobileButton
          data-folder-name-save
          disabled={!trimmed}
          onClick={() => { onSubmit({ name: trimmed, ...appearance }); onClose(); }}
        >
          {submitLabel ?? t("common.action.save")}
        </MobileButton>
        {children}
      </div>
    </BottomSheet>
  );
}
