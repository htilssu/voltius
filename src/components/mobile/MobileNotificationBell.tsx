import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { useNotificationStore } from "@/stores/notificationStore";
import { useUIStore } from "@/stores/uiStore";
import { badgeLabel } from "@/components/notifications/severity";

/**
 * Android bell: a 48 dp M3 icon button with a large badge for unread entries.
 * It only flips `notificationCenterOpen`; MobileShell renders the one
 * NotificationsSheet, so a bell mounted under an invisible tab can't paint a
 * second copy, and a `notification` deep link opens it with no bell involved.
 */
export function MobileNotificationBell() {
  const { t } = useTranslation();
  const unread = useNotificationStore((s) => s.unreadCount());
  const open = useUIStore((s) => s.notificationCenterOpen);
  const setOpen = useUIStore((s) => s.setNotificationCenterOpen);
  const title = t("notifications.bell.title");
  return (
    <button
      data-mobile-notifications-bell
      data-unread={unread}
      aria-label={unread > 0 ? `${title} (${unread})` : title}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      className="relative shrink-0 w-[48px] h-[48px] flex items-center justify-center rounded-full"
      style={{ color: open ? "var(--t-text-bright)" : "var(--t-text-secondary)" }}
    >
      <Icon icon="lucide:bell" width={22} />
      {unread > 0 && (
        <span
          data-mobile-notifications-badge
          aria-hidden
          className="absolute flex items-center justify-center rounded-full font-semibold text-white leading-none"
          style={{
            // M3 large badge: 16 dp tall, anchored on the icon's top-right corner.
            top: 8, left: 26, minWidth: 16, height: 16, padding: "0 4px",
            fontSize: 11, background: "var(--t-status-error)",
          }}
        >
          {badgeLabel(unread)}
        </span>
      )}
    </button>
  );
}
