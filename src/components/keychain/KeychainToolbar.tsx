import { useTranslation } from "react-i18next";
import { ToolbarViewControls, type LayoutMode, type SortMode } from "@/components/shared/ToolbarViewControls";
import { useToolbarResize } from "@/hooks/useToolbarResize";
import { ToolbarDropdown } from "@/components/shared/ToolbarDropdown";

interface KeychainToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  layoutMode: LayoutMode;
  onLayoutModeChange: (v: LayoutMode) => void;
  sortMode: SortMode;
  onSortModeChange: (v: SortMode) => void;
  onImportKey?: () => void;
  onGenerateKey?: () => void;
  onNewIdentity?: () => void;
  onNewFolder: () => void;
  newFolderBlocked?: string;
  availableTags?: string[];
  tagFilter?: string[];
  onTagFilterChange?: (tags: string[]) => void;
}

export function KeychainToolbar({
  search,
  onSearchChange,
  layoutMode,
  onLayoutModeChange,
  sortMode,
  onSortModeChange,
  onImportKey,
  onGenerateKey,
  onNewIdentity,
  onNewFolder,
  newFolderBlocked,
  availableTags,
  tagFilter,
  onTagFilterChange,
}: KeychainToolbarProps) {
  const { t } = useTranslation();
  const { compact, rowRef, leftRef, rightRef } = useToolbarResize();

  return (
    <>
      <div ref={rowRef} className="flex items-center gap-2 px-5 py-2.5 shrink-0 chrome-toolbar">
        <div ref={leftRef} className="flex items-center">
          <ToolbarViewControls
            search={search}
            onSearchChange={onSearchChange}
            filterPlaceholder={t("keychain.toolbar.filterPlaceholder")}
            filterShortcutId="filter"
            filterWidth={176}
            layoutMode={layoutMode}
            onLayoutModeChange={onLayoutModeChange}
            sortMode={sortMode}
            onSortModeChange={onSortModeChange}
            availableTags={availableTags}
            tagFilter={tagFilter}
            onTagFilterChange={onTagFilterChange}
          />
        </div>

        <div ref={rightRef} className="ml-auto flex items-center shrink-0">
          <ToolbarDropdown
            icon="lucide:key-round"
            label={compact ? undefined : t("keychain.toolbar.newKey")}
            onAction={() => onImportKey?.()}
            disabled={!onImportKey}
            variant="accent"
            align="right"
            menuWidth={200}
            items={[
              ...(onGenerateKey ? [{ label: t("keychain.toolbar.generateKeyPair"), icon: "lucide:key-round", onClick: onGenerateKey }] : []),
              ...(onNewIdentity ? [{ label: t("keychain.toolbar.newIdentity"), icon: "lucide:user-plus", onClick: onNewIdentity }] : []),
              { label: t("keychain.toolbar.newFolder"), icon: "lucide:folder-plus", onClick: onNewFolder, disabledReason: newFolderBlocked },
            ]}
          />
        </div>
      </div>
    </>
  );
}
