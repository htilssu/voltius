import { appToast } from "@/services/appToast";

export function toastSecretFailure(message: string, severity: "warning" | "error" = "error"): void {
  appToast(severity, message, { duration: 10000 });
}
