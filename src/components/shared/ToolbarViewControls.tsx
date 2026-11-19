import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { ToolbarDropdown } from "./ToolbarDropdown";
import { Pills } from "./Pills";
import { matchShortcut } from "@/stores/shortcutStore";
import { getTagColorStyle } from "@/utils/tagColors";
import { chevronRotateStyle } from "@/utils/icons";
import { searchMatcher } from "@/utils/search";
import { usePopoverFade } from "@/hooks/useDelayedUnmount";
import { toastActionError } from "@/components/shared/actionError";
import { ConfirmModal } from "./ConfirmModal";

/** Focus a search/filter input when the user presses the `filter` shortcut (Ctrl+F). */
export function useFilterShortcut(ref: RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (matchShortcut("filter", e)) {
        e.preventDefault();
        ref.current?.focus();
        ref.current?.select();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [ref]);
}

export type LayoutMode = "grid" | "list";
export type SortMode = "name-asc" | "name-desc" | "newest" | "oldest" | "role-asc";

export const SORT_MODE_ICONS: Record<SortMode, string> = {
  "name-asc":  "lucide:arrow-up-a-z",
  "name-desc": "lucide:arrow-down-a-z",
  newest:      "lucide:arrow-down-0-1",
  oldest:      "lucide:arrow-up-0-1",
  "role-asc":  "lucide:shield",
};

export const LAYOUT_MODE_ICONS: Record<LayoutMode, string> = {
  grid: "lucide:layout-grid",
  list: "lucide:layout-list",
};

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  filterPlaceholder?: string;
  filterShortcutId?: string;
  layoutMode: LayoutMode;
  onLayoutModeChange: (v: LayoutMode) => void;
  sortMode: SortMode;
  onSortModeChange: (v: SortMode) => void;
  extraSortOptions?: { value: SortMode; label: string; icon: string }[];
  filterWidth?: number;
  availableTags?: string[];
  tagCounts?: Record<string, number>;
  tagFilter?: string[];
  onTagFilterChange?: (tags: string[]) => void;
  onRenameTag?: (oldName: string, newName: string) => Promise<void>;
  onDeleteTag?: (name: string) => Promise<void>;
}

export function FilterInput({
  value,
  onChange,
  placeholder,
  width = 144,
  shortcutId,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  width?: number;
  shortcutId?: string;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  useFilterShortcut(shortcutId ? inputRef : { current: null });

  return (
    <div className="relative">
      <Icon
        icon="lucide:filter"
        width={13}
        className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none text-(--t-text-dim)"
      />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? t("common.placeholder.filter")}
        className="form-input pl-7 pr-3 h-8 rounded-lg text-xs outline-hidden bg-(--t-bg-input) border border-(--t-border-hover) text-(--t-text-primary)"
        style={{
          width: `${(width / 15).toFixed(3)}rem`,
          minWidth: "4rem",
        }}
      />
    </div>
  );
}

export function ToolbarViewControls({
  search,
  onSearchChange,
  filterPlaceholder,
  filterShortcutId,
  layoutMode,
  onLayoutModeChange,
  sortMode,
  onSortModeChange,
  extraSortOptions,
  filterWidth = 144,
  availableTags,
  tagCounts,
  tagFilter,
  onTagFilterChange,
  onRenameTag,
  onDeleteTag,
}: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1.5">
      <FilterInput value={search} onChange={onSearchChange} placeholder={filterPlaceholder ?? t("common.placeholder.filter")} width={filterWidth} shortcutId={filterShortcutId} />

      <div className="flex items-center gap-1">
        <Pills
          options={[
            { value: "grid", label: t("common.viewMode.grid"), icon: "lucide:layout-grid" },
            { value: "list", label: t("common.viewMode.list"), icon: "lucide:layout-list" },
          ]}
          value={layoutMode}
          onChange={onLayoutModeChange}
        />
        {availableTags !== undefined && onTagFilterChange && (
          <TagFilterButton
            availableTags={availableTags}
            tagCounts={tagCounts}
            tagFilter={tagFilter ?? []}
            onTagFilterChange={onTagFilterChange}
            onRenameTag={onRenameTag}
            onDeleteTag={onDeleteTag}
          />
        )}
        <ToolbarDropdown
          icon={SORT_MODE_ICONS[sortMode] ?? "lucide:arrow-up-down"}
          value={sortMode}
          menuWidth={200}
          className="-ml-1"
          options={[
            ...(extraSortOptions ?? []),
            { value: "name-asc",  label: t("shared.sort.nameAsc"), icon: "lucide:arrow-up-a-z" },
            { value: "name-desc", label: t("shared.sort.nameDesc"), icon: "lucide:arrow-down-a-z" },
            { value: "newest",    label: t("shared.sort.newest"), icon: "lucide:arrow-down-0-1" },
            { value: "oldest",    label: t("shared.sort.oldest"), icon: "lucide:arrow-up-0-1" },
          ]}
          onChange={onSortModeChange}
        />
      </div>
    </div>
  );
}

// ─── Tag filter button ────────────────────────────────────────────────────────

function TagFilterButton({
  availableTags,
  tagCounts,
  tagFilter,
  onTagFilterChange,
  onRenameTag,
  onDeleteTag,
}: {
  availableTags: string[];
  tagCounts?: Record<string, number>;
  tagFilter: string[];
  onTagFilterChange: (tags: string[]) => void;
  onRenameTag?: (oldName: string, newName: string) => Promise<void>;
  onDeleteTag?: (name: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const fade = usePopoverFade(open);
  const [tagSearch, setTagSearch] = useState("");
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deletingTag, setDeletingTag] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // The delete confirm is portaled out of `ref`; don't treat clicks in it as outside clicks.
    if (!open || deletingTag) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setEditingTag(null);
        setTagSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, deletingTag]);

  useEffect(() => {
    if (editingTag !== null) editInputRef.current?.focus();
  }, [editingTag]);

  useEffect(() => {
    if (open) setTimeout(() => searchInputRef.current?.focus(), 0);
  }, [open]);

  const isActive = tagFilter.length > 0;

  const matchesTag = searchMatcher(tagSearch);
  const filteredTags = availableTags.filter((tag) => matchesTag(tag));

  const toggleTag = (tag: string) => {
    onTagFilterChange(
      tagFilter.includes(tag)
        ? tagFilter.filter((tagName) => tagName !== tag)
        : [...tagFilter, tag],
    );
  };

  const commitEdit = async () => {
    const trimmed = editValue.trim();
    const from = editingTag;
    setEditingTag(null);
    if (!trimmed || trimmed === from || !onRenameTag || !from) return;
    // Follow the rename in the active filter; restore it if the rename fails.
    const prevFilter = tagFilter;
    if (tagFilter.includes(from)) {
      onTagFilterChange(tagFilter.map((tag) => (tag === from ? trimmed : tag)));
    }
    try {
      await onRenameTag(from, trimmed);
    } catch (e) {
      onTagFilterChange(prevFilter);
      toastActionError(e, t);
    }
  };

  const confirmDelete = async () => {
    if (!deletingTag || !onDeleteTag) return;
    setDeleteBusy(true);
    try {
      await onDeleteTag(deletingTag);
      if (tagFilter.includes(deletingTag)) {
        onTagFilterChange(tagFilter.filter((tag) => tag !== deletingTag));
      }
      setDeletingTag(null);
      setOpen(false);
    } catch (e) {
      toastActionError(e, t);
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => { setOpen((o) => !o); if (open) { setEditingTag(null); setTagSearch(""); } }}
        title={t("shared.tagFilter.filterByTag")}
        className={`flex items-center gap-1 px-2 h-8 rounded-lg transition-colors hover:text-(--t-tab-active-text) ${isActive ? "text-(--t-accent)" : "text-(--t-text-primary)"}`}
      >
        <Icon icon="lucide:tag" width={20} />
        {tagFilter.length > 1 && (
          <span
            className="text-xs font-bold px-1 rounded-sm bg-(--t-accent) text-(--t-on-accent)"
            style={{ lineHeight: "16px" }}
          >
            {tagFilter.length}
          </span>
        )}
        <span className="[&_path]:stroke-3">
          <Icon
            icon="lucide:chevron-down"
            width={20}
            style={chevronRotateStyle(open)}
          />
        </span>
      </button>

      {/* Dropdown */}
      {fade.mounted && (
        <div
          className={`surface-float absolute right-0 top-full mt-1 z-50 flex flex-col overflow-hidden w-[min(16rem,calc(100vw-2rem))] ${fade.className}`}
          style={fade.style}
        >
          {availableTags.length === 0 ? (
            /* ── Empty state ── */
            <div className="flex flex-col items-center gap-3 px-6 py-6 text-center">
              <div className="flex items-center justify-center rounded-lg w-10 h-10 text-(--t-text-dim) bg-(--t-bg-toolbar) border border-(--t-border)">
                <Icon icon="lucide:tag" width={20} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-(--t-text-primary)">{t("shared.tagFilter.emptyTitle")}</span>
                <span className="text-xs leading-relaxed text-(--t-text-dim) max-w-48">
                  {t("shared.tagFilter.emptyDescription")}
                </span>
              </div>
            </div>
          ) : (
            <>
              {/* ── Search bar ── */}
              <div
                className="flex items-center gap-2 px-3 py-2 border-b border-b-(--t-border)"
              >
                <Icon icon="lucide:search" width={14} className="text-(--t-text-dim) shrink-0" />
                <input
                  ref={searchInputRef}
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  placeholder={t("shared.tagFilter.searchPlaceholder")}
                  className="flex-1 bg-transparent text-xs outline-hidden text-(--t-text-primary)"
                  onKeyDown={(e) => e.key === "Escape" && (setTagSearch(""), setOpen(false))}
                />
                {tagSearch && (
                  <button onClick={() => setTagSearch("")} className="text-(--t-text-dim)">
                    <Icon icon="lucide:x" width={12} />
                  </button>
                )}
              </div>

              {/* ── Clear selection ── */}
              {isActive && (
                <div className="border-b border-b-(--t-border)">
                  <button
                    onClick={() => onTagFilterChange([])}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors text-left text-(--t-text-muted) hover:bg-(--t-bg-elevated)"
                  >
                    <Icon icon="lucide:x" width={14} />
                    {t("shared.tagFilter.clearSelection", { count: tagFilter.length })}
                  </button>
                </div>
              )}

              {/* ── Tag list ── */}
              <div className="p-1.5 flex flex-col max-h-[240px] overflow-y-auto">
                {filteredTags.length === 0 ? (
                  <p className="px-3 py-3 text-xs text-center text-(--t-text-dim)">
                    {t("shared.tagFilter.noTagsMatch", { search: tagSearch })}
                  </p>
                ) : (
                  filteredTags.map((tag) => (
                    <TagRow
                      key={tag}
                      tag={tag}
                      count={tagCounts?.[tag]}
                      isSelected={tagFilter.includes(tag)}
                      isEditing={editingTag === tag}
                      editValue={editValue}
                      editInputRef={editingTag === tag ? editInputRef : undefined}
                      onSelect={() => toggleTag(tag)}
                      onStartEdit={() => { setEditingTag(tag); setEditValue(tag); }}
                      onEditChange={setEditValue}
                      onEditCommit={commitEdit}
                      onEditCancel={() => setEditingTag(null)}
                      onDelete={() => setDeletingTag(tag)}
                      canManage={!!(onRenameTag && onDeleteTag)}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}

      {deletingTag && (
        <ConfirmModal
          title={t("shared.tagFilter.deleteTagTitle", { tag: deletingTag })}
          message={t("shared.tagFilter.deleteTagBody", { count: tagCounts?.[deletingTag] ?? 0 })}
          confirmLabel={t("common.action.delete")}
          busy={deleteBusy}
          onConfirm={() => void confirmDelete()}
          onCancel={() => { if (!deleteBusy) setDeletingTag(null); }}
        />
      )}
    </div>
  );
}

// ─── Tag row ──────────────────────────────────────────────────────────────────

function TagRow({
  tag,
  count,
  isSelected,
  isEditing,
  editValue,
  editInputRef,
  onSelect,
  onStartEdit,
  onEditChange,
  onEditCommit,
  onEditCancel,
  onDelete,
  canManage,
}: {
  tag: string;
  count?: number;
  isSelected: boolean;
  isEditing: boolean;
  editValue: string;
  editInputRef?: React.RefObject<HTMLInputElement | null>;
  onSelect: () => void;
  onStartEdit: () => void;
  onEditChange: (v: string) => void;
  onEditCommit: () => void;
  onEditCancel: () => void;
  onDelete: () => void;
  canManage: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div
      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg group/row transition-colors ${isEditing ? "" : "hover:bg-(--t-bg-elevated)"}`}
    >
      {isEditing ? (
        /* ── Inline edit mode ── */
        <>
          <Icon icon="lucide:tag" width={14} className="text-(--t-accent) shrink-0" />
          <input
            ref={editInputRef as React.RefObject<HTMLInputElement>}
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); onEditCommit(); }
              if (e.key === "Escape") { e.preventDefault(); onEditCancel(); }
            }}
            onBlur={onEditCommit}
            className="flex-1 text-xs bg-transparent outline-hidden border-b min-w-0 text-(--t-text-primary) border-b-(--t-accent)"
          />
          <button
            onMouseDown={(e) => { e.preventDefault(); onEditCommit(); }}
            title={t("common.action.save")}
            className="shrink-0 p-1 rounded-sm transition-colors text-(--t-accent)"
          >
            <Icon icon="lucide:check" width={13} />
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); onEditCancel(); }}
            title={t("common.action.cancel")}
            className="shrink-0 p-1 rounded-sm transition-colors text-(--t-text-dim)"
          >
            <Icon icon="lucide:x" width={13} />
          </button>
        </>
      ) : (
        /* ── Normal mode ── */
        <>
          <button
            onClick={onSelect}
            className="flex items-center gap-2 flex-1 min-w-0 text-left"
          >
            <span
              className="w-3.5 h-3.5 rounded-sm shrink-0 border"
              style={getTagColorStyle(tag)}
            />
            <span
              className="text-xs truncate"
              style={{ color: isSelected ? "var(--t-accent)" : "var(--t-text-primary)" }}
            >
              {tag}
            </span>
            {count !== undefined && (
              <span className="text-xs ml-auto pl-2 shrink-0 text-(--t-text-dim)">
                {count}
              </span>
            )}
          </button>
          {isSelected && (
            <Icon
              icon="lucide:check"
              width={13}
              className={`text-(--t-accent) shrink-0 ${canManage ? "group-hover/row:hidden group-focus-within/row:hidden [@media(hover:none)]:hidden" : ""}`}
            />
          )}
          {canManage && (
            <div className="hidden group-hover/row:flex group-focus-within/row:flex [@media(hover:none)]:flex items-center gap-0.5 shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); onStartEdit(); }}
                title={t("shared.tagFilter.renameTagTitle")}
                className="p-1 rounded-sm transition-colors text-(--t-text-dim) hover:bg-(--t-bg-card) hover:text-(--t-text-primary)"
              >
                <Icon icon="lucide:pencil" width={13} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                title={t("shared.tagFilter.deleteTagButtonTitle")}
                className="p-1 rounded-sm transition-colors text-(--t-text-dim) hover:text-(--t-status-error) hover:bg-[color-mix(in_srgb,var(--t-status-error)_12%,transparent)]"
              >
                <Icon icon="lucide:trash-2" width={13} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
