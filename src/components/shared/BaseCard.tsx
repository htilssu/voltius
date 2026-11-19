import { memo } from "react";
import { ContextMenu, useContextMenu, type ContextMenuItem } from "@/components/shared/ContextMenu";
import { CardMenuContext } from "@/components/shared/CardActionButton";

interface BaseCardProps {
  isSelected?: boolean;
  isEditing?: boolean;
  isActive?: boolean;
  isFocused?: boolean;
  isList?: boolean;
  glass?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onDoubleClick?: () => void;
  contextMenuItems?: ContextMenuItem[];
  /** Shown instead of contextMenuItems when the card is selected and multiple items are selected */
  bulkContextMenuItems?: ContextMenuItem[];
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  "data-card"?: boolean | string;
  "data-host-card"?: string;
  "data-connection-id"?: string;
  "data-selectable-id"?: string;
}

/*
  Card surface — flat card fill + hairline ring, no gradient sheen or backdrop
  blur. The GLASS_* names are kept for existing importers (FolderCard, mobile
  session cards); they now resolve to the same flat recipe.
*/
export const GLASS_BG = "var(--t-bg-card)";
export const GLASS_BG_HOVER = "var(--t-bg-card-hover)";
export const GLASS_SHADOW = "var(--t-ring)";
export const GLASS_SHADOW_HOVER = "var(--t-ring-strong), var(--t-elev-1)";
export const GLASS_CARD_STYLE: React.CSSProperties = {
  background: GLASS_BG,
  boxShadow: GLASS_SHADOW,
  border: "2px solid transparent",
};

export const BaseCard = memo(function BaseCard({
  isSelected,
  isEditing,
  isActive,
  isFocused,
  isList,
  glass,
  onClick,
  onDoubleClick,
  contextMenuItems,
  bulkContextMenuItems,
  children,
  className = "",
  style,
  onPointerDown,
  onMouseEnter,
  onMouseLeave,
  "data-card": dataCard,
  "data-host-card": dataHostCard,
  "data-connection-id": dataConnectionId,
  "data-selectable-id": dataSelectableId,
}: BaseCardProps) {
  const { pos, open, openAt, close } = useContextMenu();
  const activeMenuItems = isSelected && bulkContextMenuItems?.length ? bulkContextMenuItems : contextMenuItems;
  const openMenuFrom = (e: React.MouseEvent<HTMLElement>) => {
    openAt(e.currentTarget.getBoundingClientRect());
    if (!isSelected) onClick?.(e as React.MouseEvent<HTMLDivElement>);
  };

  const activeBorderColor = isEditing || isSelected ? "var(--t-accent)" : "transparent";
  const focusBoxShadow = isFocused && !isSelected && !isEditing ? "inset 0 0 0 2px var(--t-accent)" : "none";
  const showOverlay = isEditing || isSelected || isFocused;
  const radius = isList ? "rounded-[var(--r-md)]" : "rounded-[var(--r-lg)]";
  // The hover lift only applies when no selection/focus state already owns the edge.
  const hoverRing = !isActive && !showOverlay
    ? "hover:shadow-[var(--t-ring-strong),var(--t-elev-1)]"
    : "";

  return (
    <>
      <div
        data-card={dataCard}
        data-host-card={dataHostCard}
        data-connection-id={dataConnectionId}
        data-selectable-id={dataSelectableId}
        className={`group relative flex items-center px-3 cursor-pointer transition-[background-color,box-shadow] duration-150 border-2 border-transparent bg-(--t-bg-card) hover:bg-(--t-bg-card-hover) ${glass ? "shadow-[var(--t-ring)]" : ""} ${hoverRing} ${isList ? "gap-2.5 py-2.5" : "gap-4 py-3"} ${radius} ${className}`}
        style={style}
        onPointerDown={onPointerDown}
        onClick={onClick ? (e) => { e.stopPropagation(); onClick(e); } : undefined}
        onDoubleClick={onDoubleClick}
        onContextMenu={activeMenuItems?.length ? (e) => { e.stopPropagation(); open(e); if (!isSelected) onClick?.(e); } : undefined}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <CardMenuContext.Provider value={activeMenuItems?.length ? openMenuFrom : null}>
          {children}
        </CardMenuContext.Provider>
        {showOverlay && (
          <div
            className={`absolute inset-[-2px] ${radius} border-2 pointer-events-none`}
            style={{ borderColor: activeBorderColor, boxShadow: focusBoxShadow }}
          />
        )}
      </div>

      {pos && !!activeMenuItems?.length && (
        <ContextMenu items={activeMenuItems} pos={pos} onClose={close} />
      )}
    </>
  );
});
