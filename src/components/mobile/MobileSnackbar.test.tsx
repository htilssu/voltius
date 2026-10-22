import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));
vi.mock("@iconify/react", () => ({ Icon: () => null }));

import MobileSnackbarHost from "./MobileSnackbar";
import { useNotificationStore } from "@/stores/notificationStore";
import { appToast } from "@/services/appToast";

type W = Window & { VoltiusHaptics?: { perform(kind: string): boolean } };

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  delete (window as W).VoltiusHaptics;
  useNotificationStore.setState({ toasts: [] });
});

test("shows one toast at a time, oldest first", () => {
  render(<MobileSnackbarHost />);
  act(() => { appToast("info", "first"); appToast("info", "second"); });
  expect(screen.getByText("first")).toBeTruthy();
  expect(screen.queryByText("second")).toBeNull();
  act(() => { vi.advanceTimersByTime(4000); });
  expect(screen.queryByText("first")).toBeNull();
  expect(screen.getByText("second")).toBeTruthy();
});

test("the action runs once and dismisses the snackbar", () => {
  const retry = vi.fn();
  render(<MobileSnackbarHost />);
  act(() => { appToast("error", "Permission denied", { action: { label: "Retry", onClick: retry } }); });
  fireEvent.click(screen.getByText("Retry"));
  expect(retry).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Permission denied")).toBeNull();
});

test("an error plays the reject haptic", () => {
  const perform = vi.fn(() => true);
  (window as W).VoltiusHaptics = { perform };
  render(<MobileSnackbarHost />);
  act(() => { appToast("error", "boom"); });
  expect(perform).toHaveBeenCalledWith("reject");
});

test("progress toasts are not snackbars", () => {
  render(<MobileSnackbarHost />);
  act(() => {
    useNotificationStore.getState().addToast({ source: { kind: "app" }, type: "progress", message: "uploading", severity: "info", duration: 0 });
  });
  expect(screen.queryByText("uploading")).toBeNull();
});
