import { test, expect, afterEach, beforeEach, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useNotificationStore } from "@/stores/notificationStore";
import { useUIStore } from "@/stores/uiStore";

vi.mock("@/i18n", () => ({ default: { t: (key: string) => key } }));
vi.mock("@/utils/platform", async (orig) => ({
  ...(await orig<typeof import("@/utils/platform")>()),
  isMobileShell: () => true,
}));

const { NotificationBell } = await import("@/components/notifications/NotificationBell");
const { default: NotificationsSheet } = await import("./NotificationsSheet");

afterEach(cleanup);

beforeEach(() => {
  useUIStore.setState({ notificationCenterOpen: false, notificationFocusId: null });
  useNotificationStore.setState({ inbox: [], banners: [], history: [] });
});

/** What MobileShell does: one sheet, driven by the store. */
function Shell() {
  const open = useUIStore((s) => s.notificationCenterOpen);
  return (
    <>
      <NotificationBell />
      {open && <NotificationsSheet />}
    </>
  );
}

const bell = () => document.querySelector<HTMLButtonElement>("[data-mobile-notifications-bell]")!;

test("on Android the bell is a 48 dp button that opens the sheet, not the popover", () => {
  render(<Shell />);
  expect(bell().className).toContain("w-[48px] h-[48px]");
  fireEvent.click(bell());
  expect(useUIStore.getState().notificationCenterOpen).toBe(true);
  expect(document.querySelector("[data-mobile-sheet]")).toBeTruthy();
  expect(document.querySelector("[data-mobile-notifications-empty]")).toBeTruthy();
  expect(document.querySelector(".surface-float")).toBeNull();
});

test("the badge counts banners and unresolved inbox entries", () => {
  useNotificationStore.setState({
    banners: [{ id: "b1", source: { kind: "app" }, message: "m", severity: "warning", actions: [], dismissable: true, createdAt: 0 }],
    inbox: [
      { id: "i1", kind: "invite", source: { kind: "app" }, message: "x", actions: [], state: "pending", createdAt: 0 },
      { id: "i2", kind: "invite", source: { kind: "app" }, message: "y", actions: [], state: "resolved", createdAt: 0 },
    ],
  });
  render(<Shell />);
  expect(document.querySelector("[data-mobile-notifications-badge]")?.textContent).toBe("2");
});

test("rows keep their actions: inbox action, banner action + dismiss, clear history", async () => {
  const run = vi.fn(async () => {});
  const onClick = vi.fn();
  useNotificationStore.setState({
    inbox: [{ id: "invite:1", kind: "invite", source: { kind: "app" }, message: "join?", actions: [{ label: "Accept", run }], state: "pending", createdAt: 0 }],
    banners: [{ id: "b1", source: { kind: "plugin", id: "p", name: "Docker" }, message: "down", severity: "error", actions: [{ label: "Retry", onClick }], dismissable: true, createdAt: 0 }],
    history: [{ id: "h1", source: { kind: "app" }, message: "old", severity: "info", dismissedAt: 0 }],
  });
  render(<Shell />);
  act(() => useUIStore.getState().openNotificationCenter(null));
  expect(screen.getByText("notifications.bell.newSection")).toBeTruthy();
  expect(screen.getByText("notifications.bell.earlierSection")).toBeTruthy();

  await act(async () => fireEvent.click(document.querySelector("[data-notification-action=accept]")!));
  expect(run).toHaveBeenCalled();

  fireEvent.click(document.querySelector("[data-notification-action=retry]")!);
  expect(onClick).toHaveBeenCalled();
  expect(useNotificationStore.getState().banners).toHaveLength(0);

  fireEvent.click(document.querySelector("[data-notifications-clear]")!);
  expect(useNotificationStore.getState().history).toHaveLength(0);
});

test("a deep link scrolls to the named inbox entry and clears the focus", () => {
  const scrollIntoView = vi.fn();
  Element.prototype.scrollIntoView = scrollIntoView;
  useNotificationStore.setState({
    inbox: [{ id: "invite:42", kind: "invite", source: { kind: "app" }, message: "an invitation", actions: [], state: "pending", createdAt: 0 }],
  });
  render(<Shell />);
  act(() => useUIStore.getState().openNotificationCenter("invite:42"));
  expect(scrollIntoView).toHaveBeenCalled();
  expect(useUIStore.getState().notificationFocusId).toBeNull();
});
