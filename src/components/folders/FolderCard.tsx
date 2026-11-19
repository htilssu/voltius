import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import { AvatarTile } from "@/components/shared/AvatarTile";
import { withGhost } from "@/components/preview/GhostCard";
import { PreviewHint } from "@/components/preview/PreviewHint";
import { CardActionButton, CardMenuButton, CardMenuContext, CardPinButton } from "@/components/shared/CardActionButton";
import { ContextMenu, useContextMenu, type ContextMenuItem } from "@/components/shared/ContextMenu";
import { clipboardMenuItems } from "@/utils/clipboardMenuItems";
import { buildFolderMenuItems } from "@/utils/folderMenuItems";
import { isPlainClick } from "@/utils/cardInteraction";
import { useInlineRename } from "@/hooks/useInlineRename";
import { folderIcon } from "./folderAppearance";
import { folderAccessType, useFolderPin } from "./useFolderPin";
import { useFolderSync } from "./useFolderSync";
import type { Folder, VaultOption } from "@/types";

interface FolderCardProps {
  folder: Folder;
  itemCount: number;
  layout: "grid" | "list";
  isSelected?: boolean;
  isFocused?: boolean;
  isDragOver?: boolean;
  /** Faded while the folder sits on the clipboard as a pending cut. */
  dimmed?: boolean;
  onOpen: () => void;
  onRename: (folder: Folder, newName: string) => void;
  onDelete: (folder: Folder) => void;
  onSelect?: (id: string, e: React.MouseEvent<HTMLDivElement>) => void;
  onEdit?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  vaults?: VaultOption[];
  canEdit?: boolean;
  onMoveToVault?: (vaultId: string) => void;
  onCopyToVault?: (vaultId: string) => void;
  bulkContextMenuItems?: ContextMenuItem[];
  "data-drop-folder"?: string;
}

function FolderCardBody({
  folder,
  itemCount,
  layout,
  isSelected,
  isFocused,
  isDragOver,
  dimmed,
  onOpen,
  onRename,
  onDelete,
  onSelect,
  onEdit,
  onExport,
  onShare,
  onPointerDown,
  vaults,
  canEdit,
  onMoveToVault,
  onCopyToVault,
  bulkContextMenuItems,
  "data-drop-folder": dataDropFolder,
}: FolderCardProps) {
  const { t } = useTranslation();
  const isList = layout === "list";
  const avatarSize = isList ? 28 : 48;
  const iconSize = isList ? 14 : 22;
  const { pos: ctxPos, open: openCtx, openAt: openCtxAt, close: closeCtx } = useContextMenu();
  const sync = useFolderSync(folder);
  const { folderType, pinColor, pinAlwaysVisible, togglePin, pinItem, pinTeamItem } = useFolderPin(folder, canEdit);
  const activeMenuItems = isSelected && bulkContextMenuItems?.length ? bulkContextMenuItems : undefined;

  const rename = useInlineRename(folder.id, !!canEdit, folder.name, (name) => onRename(folder, name));
  const nameClass = isList
    ? "text-sm font-medium-bold truncate w-52 shrink-0 text-(--t-text-bright)"
    : "text-base font-medium-bold truncate leading-tight text-(--t-text-bright)";
  const name = (
    <p className={nameClass}>
      {rename.editor ?? folder.name}
    </p>
  );

  const dragBorder = isDragOver
    ? "2px dashed var(--t-accent)"
    : isSelected
    ? "2px solid var(--t-tab-active-text)"
    : "2px solid transparent";

  const focusBoxShadow = isFocused && !isSelected
    ? "inset 0 0 0 2px var(--t-accent)"
    : undefined;

  // Same flat surface recipe as BaseCard: hairline ring in grid, CSS hover lift
  // unless selection/focus/drag already owns the edge.
  const ownsEdge = isDragOver || isSelected || isFocused;
  const surfaceClass = isDragOver
    ? ""
    : `bg-(--t-bg-card) hover:bg-(--t-bg-card-hover) ${!isList ? "shadow-[var(--t-ring)]" : ""} ${ownsEdge ? "" : "hover:shadow-[var(--t-ring-strong),var(--t-elev-1)]"}`;

  return (
    <>
      <div
        data-folder-card="true"
        data-selectable-id={folder.id}
        data-drop-folder={dataDropFolder}
        className={`group flex items-center px-4 cursor-pointer transition-[background-color,box-shadow] duration-150 ${isList ? "gap-2.5 py-2.5 rounded-[var(--r-md)]" : "gap-4 py-4 rounded-[var(--r-lg)]"} ${surfaceClass} ${dimmed ? "opacity-50" : ""}`}
        style={{
          border: dragBorder,
          ...(isDragOver ? { background: "color-mix(in srgb, var(--t-accent) 8%, var(--t-bg-card))" } : {}),
          ...(focusBoxShadow ? { boxShadow: focusBoxShadow } : {}),
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (rename.editor) return;
          if (isPlainClick(e)) onOpen();
          else onSelect?.(folder.id, e);
        }}
        onContextMenu={(e) => { e.stopPropagation(); e.preventDefault(); if (!isSelected) onSelect?.(folder.id, e); openCtx(e); }}
        onPointerDown={onPointerDown}
      >
        {/* Folder avatar */}
        <AvatarTile
          icon={isDragOver ? "lucide:folder-open" : folderIcon(folder)}
          base={folder.color}
          iconSize={iconSize}
          className="rounded-lg text-white"
          style={{
            width: avatarSize,
            height: avatarSize,
            ...(isDragOver
              ? { background: "color-mix(in srgb, var(--t-accent) 20%, var(--t-bg-card-avatar))" }
              : {}),
          }}
        />

        {isList ? (
          <>
            {name}
            <p className="text-xs truncate flex-1 text-(--t-text-secondary)">
              {t("folders.card.itemCount", { count: itemCount })}
            </p>
          </>
        ) : (
          <div className="flex-1 min-w-0">
            {name}
            <p className="text-xs mt-0.5 truncate text-(--t-text-secondary)">
              {t("folders.card.itemCount", { count: itemCount })}
            </p>
          </div>
        )}

        <div className="flex items-center gap-1 shrink-0">
          <PreviewHint type={folderType} id={folder.id} layout={layout} />
          {pinAlwaysVisible && <CardPinButton color={pinColor} title={t("folders.card.unpin")} onClick={togglePin} width={16} />}
          {!sync.isSynced && (
            <span title={t("common.objectSync.notSynced")} className="text-(--t-text-dim) flex items-center">
              <Icon icon="lucide:cloud-off" width={18} />
            </span>
          )}
          {isList && canEdit && <CardActionButton icon="lucide:pencil" title={t("common.action.edit")} onClick={() => onEdit?.()} />}
          {isList && canEdit && <CardActionButton icon="lucide:trash-2" title={t("common.action.delete")} onClick={() => onDelete(folder)} danger />}
          <CardMenuContext.Provider value={(e) => { if (!isSelected) onSelect?.(folder.id, e as React.MouseEvent<HTMLDivElement>); openCtxAt(e.currentTarget.getBoundingClientRect()); }}>
            <CardMenuButton />
          </CardMenuContext.Provider>
        </div>
      </div>

      {ctxPos && (
        <ContextMenu
          pos={ctxPos}
          onClose={closeCtx}
          items={activeMenuItems ?? buildFolderMenuItems({
            t,
            onOpen,
            editItems: canEdit ? [
              ...rename.menuItems,
              { label: t("common.action.edit"), icon: "lucide:pencil", onClick: () => onEdit?.() },
            ] : [],
            pinItem,
            pinTeamItem,
            onExport,
            onShare,
            vaults,
            canEdit,
            onMoveToVault,
            onCopyToVault,
            clipboard: clipboardMenuItems(t),
            ...sync,
            onDelete: () => onDelete(folder),
          })}
        />
      )}
    </>
  );
}

export const FolderCard = withGhost(FolderCardBody, (p) => ({
  type: folderAccessType(p.folder), id: p.folder.id, icon: folderIcon(p.folder), name: p.folder.name, layout: p.layout,
}));
