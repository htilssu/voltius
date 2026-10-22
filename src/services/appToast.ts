import type { ToastSeverity } from "@/plugins/api";
import { APP_SOURCE, useNotificationStore, type ToastEntry } from "@/stores/notificationStore";

/**
 * An app-sourced toast (desktop: corner toast; Android: snackbar). Errors stay 8 s,
 * the rest 4 s, unless `duration` says otherwise.
 */
export function appToast(
  severity: ToastSeverity,
  message: string,
  opts: { duration?: number; action?: ToastEntry["action"] } = {},
): string {
  return useNotificationStore.getState().addToast({
    source: APP_SOURCE,
    type: "toast",
    message,
    severity,
    duration: opts.duration ?? (severity === "error" ? 8000 : 4000),
    ...(opts.action && { action: opts.action }),
  });
}
