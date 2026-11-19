import { useTranslation } from "react-i18next";
import { FilterInput, SORT_MODE_ICONS, type SortMode, type LayoutMode } from "@/components/shared/ToolbarViewControls";
import { ToolbarDropdown } from "@/components/shared/ToolbarDropdown";
import { Pills } from "@/components/shared/Pills";
import { useToolbarResize } from "@/hooks/useToolbarResize";

interface Props {
  tab: "mine" | "community";
  onTabChange: (v: "mine" | "community") => void;
  search: string;
  onSearchChange: (v: string) => void;
  sortMode: SortMode;
  onSortModeChange: (v: SortMode) => void;
  layoutMode: LayoutMode;
  onLayoutModeChange: (v: LayoutMode) => void;
  onNewSnippet: () => void;
  onNewFolder: () => void;
  newFolderBlocked?: string;
}

export function SnippetsToolbar({
  tab,
  onTabChange,
  search,
  onSearchChange,
  sortMode,
  onSortModeChange,
  layoutMode,
  onLayoutModeChange,
  onNewSnippet,
  onNewFolder,
  newFolderBlocked,
}: Props) {
  const { t } = useTranslation();
  const { compact, rowRef, leftRef, rightRef } = useToolbarResize();

  return (
    <>
      <div
        ref={rowRef}
        className="flex items-center gap-2 px-5 py-2.5 chrome-toolbar"
      >
        <div ref={leftRef} className="flex items-center gap-1.5">
          <Pills
            options={[
              { value: "mine", label: t("snippets.community.tabMine") },
              { value: "community", label: t("snippets.community.tabCommunity") },
            ]}
            value={tab}
            onChange={onTabChange}
          />
          <FilterInput
            value={search}
            onChange={onSearchChange}
            placeholder={t(tab === "community" ? "snippets.community.searchPlaceholder" : "snippets.toolbar.filterPlaceholder")}
            width={176}
            shortcutId="filter"
          />
          <Pills
            options={[
              { value: "grid", label: t("snippets.toolbar.gridLabel"), icon: "lucide:layout-grid" },
              { value: "list", label: t("snippets.toolbar.listLabel"), icon: "lucide:layout-list" },
            ]}
            value={layoutMode}
            onChange={onLayoutModeChange}
          />
          {tab === "mine" && (
          <ToolbarDropdown
            icon={SORT_MODE_ICONS[sortMode]}
            value={sortMode}
            menuWidth={200}
            options={[
              { value: "name-asc",  label: t("snippets.toolbar.sortNameAsc"),  icon: "lucide:arrow-up-a-z" },
              { value: "name-desc", label: t("snippets.toolbar.sortNameDesc"), icon: "lucide:arrow-down-a-z" },
              { value: "newest",    label: t("snippets.toolbar.sortNewest"),   icon: "lucide:arrow-down-0-1" },
              { value: "oldest",    label: t("snippets.toolbar.sortOldest"),   icon: "lucide:arrow-up-0-1" },
            ]}
            onChange={onSortModeChange}
          />
          )}
        </div>

        <div ref={rightRef} className="ml-auto shrink-0">
        {tab === "mine" && (
        <ToolbarDropdown
          icon="lucide:braces"
          label={compact ? undefined : t("snippets.toolbar.newSnippet")}
          onAction={onNewSnippet}
          variant="accent"
          align="right"
          menuWidth={200}
          items={[{ label: t("snippets.toolbar.newFolder"), icon: "lucide:folder-plus", onClick: onNewFolder, disabledReason: newFolderBlocked }]}
        />
        )}
        </div>
      </div>
    </>
  );
}
