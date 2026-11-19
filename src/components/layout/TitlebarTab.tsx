import type { ReactNode } from "react";
import { Icon } from "@iconify/react";
import type { TFunction } from "i18next";
import type { Connection, TerminalSession } from "@/types";
import { getConnectionIcon, getConnectionIconColor } from "@/utils/icons";
import { InlineNameEditor } from "@/components/shared/InlineNameEditor";
import { StatusDot } from "@/components/shared/StatusDot";
import { STATUS_TONE_COLOR, type StatusTone } from "@/utils/statusTone";
import type { ContextMenuItem } from "@/components/shared/ContextMenu";
import { useDragStore } from "@/stores/dragStore";
import { sessionLabel } from "@/utils/sessionLabel";
import { TabCloseControl } from "@/components/shared/TabCloseControl";

export function sessionTabIcon(
  session: TerminalSession,
  connection: Connection | undefined,
  active: boolean,
  tone: StatusTone,
): ReactNode {
  const isLocal = session.type === "local";
  const connectionIcon = !isLocal && connection ? (connection.icon || connection.distro) : null;
  const distroIcon = connectionIcon ? getConnectionIcon(connectionIcon) : null;
  const distroBg = connectionIcon ? getConnectionIconColor(connectionIcon) : null;

  if (distroIcon) {
    return (
      <span
        className="flex items-center justify-center size-6 rounded-md shrink-0"
        // White glyph on the distro's brand color (brand palette, not a theme surface).
        style={{ background: distroBg ?? "transparent", color: "#fff" }}
      >
        <Icon icon={distroIcon} width={16} />
      </span>
    );
  }
  if (isLocal) {
    return (
      <span
        className="flex items-center justify-center size-6 rounded-md shrink-0"
        style={{ color: active ? "var(--t-tab-active-text)" : STATUS_TONE_COLOR[tone] }}
      >
        <Icon icon="lucide:terminal" width={14} />
      </span>
    );
  }
  return <StatusDot tone={tone} />;
}

/** Pressed/selected surface for titlebar tabs and toggles. Pair with `border`. */
export const TAB_ACTIVE_CLASS = "bg-(--t-tab-active-bg) text-(--t-tab-active-text) border-(--t-tab-active-border)";

/** Tab surface classes; `interactive` adds the hover lift for clickable, inactive tabs. */
export function tabSurfaceClass(active: boolean, interactive = false): string {
  if (active) return `border ${TAB_ACTIVE_CLASS}`;
  return `border border-transparent bg-(--t-tab-bg) text-(--t-text-secondary)${
    interactive ? " hover:bg-(--t-bg-toolbar) hover:text-(--t-text-primary)" : ""
  }`;
}

interface SessionTabHandlerDeps {
  t: TFunction;
  isRenaming: (id: string) => boolean;
  activate: (id: string) => void;
  close: (e: React.MouseEvent, id: string) => void;
  startRenameFromLabel: (e: React.MouseEvent, isActive: boolean, id: string) => void;
  startRename: (id: string) => void;
  openMenu: (e: React.MouseEvent, id: string, extras: ContextMenuItem[]) => void;
  commitRename: (id: string, name: string) => void;
  cancelRename: (id: string) => void;
}

export function buildSessionTabHandlers(deps: SessionTabHandlerDeps) {
  return (session: TerminalSession, itemKey: string, isActive: boolean, extras: ContextMenuItem[] = []) => ({
    onClick: () => deps.activate(session.id),
    onLabelClick: (e: React.MouseEvent) => deps.startRenameFromLabel(e, isActive, session.id),
    onClose: (e: React.MouseEvent) => deps.close(e, session.id),
    onContextMenu: (e: React.MouseEvent) => deps.openMenu(e, session.id, extras),
    onDoubleClick: () => deps.startRename(session.id),
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button === 0) useDragStore.getState().beginTabDrag(session.id, e.clientX, e.clientY, itemKey);
      if (e.button === 1) { e.preventDefault(); deps.close(e, session.id); }
    },
    renaming: deps.isRenaming(session.id),
    renameValue: sessionLabel(session),
    renameAriaLabel: deps.t("layout.titleBar.renameTab"),
    onRenameCommit: (name: string) => deps.commitRename(session.id, name),
    onRenameCancel: () => deps.cancelRename(session.id),
    sessionIds: [session.id],
    closeTitle: deps.t("layout.titleBar.closeTab"),
  });
}

export function TitlebarTab({
  itemKey,
  active,
  icon,
  label,
  title,
  mcpBar,
  trailing,
  renaming,
  renameValue,
  renameAriaLabel,
  onRenameCommit,
  onRenameCancel,
  onClick,
  onLabelClick,
  onClose,
  onContextMenu,
  onDoubleClick,
  onPointerDown,
  onMouseEnter,
  onMouseLeave,
  buttonRef,
  sessionIds = [],
  closeTitle = "",
  compact = false,
}: {
  itemKey: string;
  active: boolean;
  icon: ReactNode;
  label: ReactNode;
  title?: string;
  mcpBar?: ReactNode;
  trailing?: ReactNode;
  renaming: boolean;
  renameValue: string;
  renameAriaLabel: string;
  onRenameCommit: (name: string) => void;
  onRenameCancel: () => void;
  onClick: () => void;
  onLabelClick: (e: React.MouseEvent) => void;
  onClose?: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onPointerDown: (e: React.PointerEvent) => void;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
  sessionIds?: string[];
  closeTitle?: string;
  compact?: boolean;
}) {
  if (renaming) {
    return (
      <div
        data-titlebar-key={itemKey}
        className={`relative flex items-center gap-2 h-9 px-2 rounded-lg text-base font-medium-bold shrink-0 overflow-hidden ${tabSurfaceClass(active)}`}
      >
        {icon}
        <InlineNameEditor
          value={renameValue}
          ariaLabel={renameAriaLabel}
          onCommit={onRenameCommit}
          onCancel={onRenameCancel}
        />
      </div>
    );
  }

  return (
    <button
      ref={buttonRef}
      data-titlebar-key={itemKey}
      data-strip-active={active}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
      onPointerDown={onPointerDown}
      className={`group relative flex items-center h-9 rounded-lg text-base font-medium-bold shrink-0 transition-all ${tabSurfaceClass(active, true)} ${compact ? "w-10 justify-center" : "gap-2 px-2 overflow-hidden"}`}
      title={compact ? [renameValue, title].filter(Boolean).join("\n") : title}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {mcpBar}
      {compact ? (
        <span className="relative inline-flex">
          {icon}
          <TabCloseControl variant="badge" sessionIds={sessionIds} active={active} closeTitle={closeTitle} onClose={() => {}} />
        </span>
      ) : icon}
      {!compact && <span className="max-w-[140px] truncate" onClick={onLabelClick}>
        {label}
      </span>}
      {!compact && trailing}
      {!compact && onClose && (
        <TabCloseControl
          variant="tab"
          sessionIds={sessionIds}
          active={active}
          closeTitle={closeTitle}
          onClose={onClose}
        />
      )}
    </button>
  );
}
