import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import BottomSheet from "./BottomSheet";
import { useNotificationStore } from "@/stores/notificationStore";
import type { BannerEntry, HistoryEntry, InboxEntry, NotificationSource } from "@/stores/notificationStore";
import { useUIStore } from "@/stores/uiStore";
import { formatRelative } from "@/utils/localeFormat";
import { severityColor, severityIcon } from "@/components/notifications/severity";

const slugOf = (label: string) => label.toLowerCase().replace(/[^a-z]+/g, "-");

/** Leading 40 dp tonal avatar of an M3 list row. */
function Leading({ icon, color }: { icon: string; color: string }) {
  return (
    <span
      className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
      style={{ color, background: `color-mix(in srgb, ${color} 16%, transparent)` }}
    >
      <Icon icon={icon} width={20} />
    </span>
  );
}

function sourceLabel(source: NotificationSource): string | null {
  return source.kind === "plugin" ? source.name.slice(0, 20) : null;
}

/** M3 list row: leading avatar, headline + supporting text, optional trailing icon button, actions below. */
function Row({ attr, leading, headline, supporting, trailing, actions, dim }: {
  attr: Record<string, string>;
  leading: ReactNode;
  headline: string;
  supporting?: string | null;
  trailing?: ReactNode;
  actions?: ReactNode;
  dim?: boolean;
}) {
  return (
    <div {...attr} className="flex gap-4 pl-4 pr-1 py-3 min-h-[72px]" style={{ opacity: dim ? 0.6 : 1 }}>
      <div className="pt-0.5">{leading}</div>
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
        <p className="text-base leading-snug text-(--t-text-primary) break-words select-text">{headline}</p>
        {supporting && <p className="text-sm text-(--t-text-dim) break-words">{supporting}</p>}
        {actions && <div className="flex flex-wrap items-center gap-2 pt-2">{actions}</div>}
      </div>
      {trailing ?? <span className="w-3 shrink-0" />}
    </div>
  );
}

/** M3 buttons: the first action is tonal-filled, the others are text buttons. */
function ActionButton({ label, primary, disabled, onClick }: {
  label: string; primary: boolean; disabled?: boolean; onClick: () => void;
}) {
  return (
    <button
      data-notification-action={slugOf(label)}
      disabled={disabled}
      onClick={onClick}
      className="vt-hit h-10 px-4 rounded-full text-sm font-medium disabled:opacity-50"
      style={primary
        ? { background: "color-mix(in srgb, var(--t-accent) 20%, transparent)", color: "var(--t-accent)" }
        : { color: "var(--t-accent)" }}
    >
      {label}
    </button>
  );
}

function InboxItem({ entry, onAction }: { entry: InboxEntry; onAction: (i: number) => void }) {
  const resolved = entry.state === "resolved";
  return (
    <Row
      attr={{ "data-inbox-id": entry.id, "data-notification-row": "inbox" }}
      leading={<Leading icon={resolved ? "lucide:check" : "lucide:mail"} color={resolved ? "var(--t-text-dim)" : "var(--t-accent)"} />}
      headline={entry.message}
      supporting={resolved ? entry.resolution : formatRelative(entry.createdAt)}
      dim={resolved}
      actions={!resolved && entry.actions.length > 0 ? entry.actions.map((a, i) => (
        <ActionButton key={a.label} label={a.label} primary={i === 0}
          disabled={entry.state === "acting"} onClick={() => onAction(i)} />
      )) : undefined}
    />
  );
}

function BannerItem({ banner, onDismiss }: { banner: BannerEntry; onDismiss: () => void }) {
  const { t } = useTranslation();
  return (
    <Row
      attr={{ "data-notification-row": "banner", "data-banner-id": banner.id }}
      leading={<Leading icon={severityIcon(banner.severity)} color={severityColor(banner.severity)} />}
      headline={banner.message}
      supporting={[sourceLabel(banner.source), formatRelative(banner.createdAt)].filter(Boolean).join(" · ")}
      trailing={banner.dismissable ? (
        <button
          data-notification-dismiss
          aria-label={t("common.action.dismiss")}
          onClick={onDismiss}
          className="shrink-0 w-[48px] h-[48px] -my-1 flex items-center justify-center rounded-full text-(--t-text-dim)"
        >
          <Icon icon="lucide:x" width={20} />
        </button>
      ) : undefined}
      actions={banner.actions.length > 0 ? banner.actions.map((a, i) => (
        <ActionButton key={i} label={a.label} primary={i === 0} onClick={() => { a.onClick(); onDismiss(); }} />
      )) : undefined}
    />
  );
}

function HistoryItem({ entry }: { entry: HistoryEntry }) {
  return (
    <Row
      attr={{ "data-notification-row": "history" }}
      leading={<Leading icon={severityIcon(entry.severity)} color={severityColor(entry.severity)} />}
      headline={entry.message}
      supporting={[sourceLabel(entry.source), formatRelative(entry.dismissedAt)].filter(Boolean).join(" · ")}
      dim
    />
  );
}

function Subheader({ children, trailing }: { children: ReactNode; trailing?: ReactNode }) {
  return (
    <div className="flex items-center justify-between pl-4 pr-1 h-[48px]">
      <h3 className="text-sm font-medium text-(--t-accent)">{children}</h3>
      {trailing}
    </div>
  );
}

/**
 * Android notification center: the same inbox / banners / history the desktop
 * popover lists, as M3 list rows in a B4 bottom sheet (drag, fling, scrim, Back).
 * Rendered once by MobileShell while `notificationCenterOpen` is set.
 */
export default function NotificationsSheet() {
  const { t } = useTranslation();
  const banners = useNotificationStore((s) => s.banners);
  const history = useNotificationStore((s) => s.history);
  const inbox = useNotificationStore((s) => s.inbox);
  const dismissBanner = useNotificationStore((s) => s.dismissBanner);
  const runInboxAction = useNotificationStore((s) => s.runInboxAction);
  const clearHistory = useNotificationStore((s) => s.clearHistory);
  const setOpen = useUIStore((s) => s.setNotificationCenterOpen);
  const focusId = useUIStore((s) => s.notificationFocusId);
  const clearFocus = useUIStore((s) => s.clearNotificationFocus);
  const listRef = useRef<HTMLDivElement>(null);

  // A deep link names an inbox entry: scroll it into view (a stale id just leaves the list open).
  useEffect(() => {
    if (!focusId || !listRef.current) return;
    for (const row of listRef.current.querySelectorAll("[data-inbox-id]")) {
      if (row.getAttribute("data-inbox-id") === focusId) {
        row.scrollIntoView({ block: "nearest" });
        break;
      }
    }
    clearFocus();
  }, [focusId, inbox, clearFocus]);

  const active = inbox.length + banners.length;
  const empty = active === 0 && history.length === 0;

  return (
    <BottomSheet title={t("notifications.bell.title")} onClose={() => setOpen(false)}>
      <div ref={listRef} data-mobile-notifications={empty ? "empty" : "list"} className="-mx-2">
        {empty ? (
          <div data-mobile-notifications-empty className="flex flex-col items-center text-center gap-3 px-6 pt-8 pb-10">
            <span className="w-16 h-16 rounded-full flex items-center justify-center text-(--t-text-dim)"
              style={{ background: "var(--t-bg-card)" }}>
              <Icon icon="lucide:bell-off" width={28} />
            </span>
            <p className="text-base font-medium text-(--t-text-primary)">{t("notifications.bell.noNotifications")}</p>
            <p className="text-sm text-(--t-text-dim)">{t("notifications.bell.emptyHint")}</p>
          </div>
        ) : (
          <>
            {active > 0 && <Subheader>{t("notifications.bell.newSection")}</Subheader>}
            {inbox.map((e) => <InboxItem key={e.id} entry={e} onAction={(i) => void runInboxAction(e.id, i)} />)}
            {banners.map((b) => <BannerItem key={b.id} banner={b} onDismiss={() => dismissBanner(b.id)} />)}
            {history.length > 0 && (
              <>
                {active > 0 && <div className="mx-4 my-1 h-px" style={{ background: "var(--t-border)" }} />}
                <Subheader trailing={(
                  <button data-notifications-clear onClick={clearHistory}
                    className="h-[48px] px-3 rounded-full text-sm font-medium text-(--t-accent)">
                    {t("notifications.bell.clearHistory")}
                  </button>
                )}>
                  {t("notifications.bell.earlierSection")}
                </Subheader>
                {history.map((h) => <HistoryItem key={h.id} entry={h} />)}
              </>
            )}
          </>
        )}
      </div>
    </BottomSheet>
  );
}
