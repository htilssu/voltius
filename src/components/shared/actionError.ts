import type { TFunction } from "i18next";
import { appToast } from "@/services/appToast";
import { describeError } from "@/services/backendErrors";
import { PreviewReadOnlyError } from "@/services/previewGuard";

/**
 * Surface a failed user-initiated action as an error toast. A preview-mode
 * refusal is skipped: the preview guard already toasts its own read-only notice.
 */
export function toastActionError(e: unknown, t: TFunction): void {
  if (e instanceof PreviewReadOnlyError) return;
  appToast("error", describeError(e, t));
}
