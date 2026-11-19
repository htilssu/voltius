import { useTranslation } from "react-i18next";
import { SLOW_RETRY_MS, type ReconnectWait } from "@/stores/reconnectBackoffCore";
import { statusSurface } from "@/components/shared/statusSurface";
import { useDismissBlocked } from "./dismissBlocked";

function PanelActions({
  retryLabel,
  onRetry,
  onDismiss,
}: {
  retryLabel: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  const { t } = useTranslation();
  const dismissBlocked = useDismissBlocked();
  return (
    <div className="mt-2 flex items-center gap-3 justify-center">
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-(--t-accent) hover:text-(--t-accent)/80 transition-colors underline"
        >
          {retryLabel}
        </button>
      )}
      <button
        onClick={onDismiss}
        disabled={!!dismissBlocked}
        title={dismissBlocked}
        className="text-xs text-(--t-text-muted) hover:text-(--t-text-primary) transition-colors underline disabled:opacity-(--disabled-opacity) disabled:cursor-not-allowed"
      >
        {t("terminal.overlay.connectionError.dismiss")}
      </button>
    </div>
  );
}

export function ReconnectWaitPanel({
  wait,
  onRetryNow,
  onDismiss,
}: {
  wait: ReconnectWait;
  onRetryNow?: () => void;
  onDismiss?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="w-full p-3 rounded-lg text-center" style={statusSurface("warning")}>
      <p className="text-sm font-medium">{t(`terminal.overlay.reconnectWait.${wait}.title`)}</p>
      <p className="text-(--t-text-muted) text-xs mt-1">
        {t(`terminal.overlay.reconnectWait.${wait}.subtitle`, { seconds: SLOW_RETRY_MS / 1000 })}
      </p>
      <PanelActions
        retryLabel={t("terminal.overlay.reconnectWait.retryNow")}
        onRetry={wait === "slow" ? onRetryNow : undefined}
        onDismiss={onDismiss}
      />
    </div>
  );
}

export function ConnectionErrorPanel({
  errorMessage,
  retryLabel,
  onRetry,
  onDismiss,
}: {
  errorMessage?: string;
  retryLabel?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="w-full p-3 rounded-lg" style={statusSurface("error")}>
      <p className="text-sm font-medium">{t("terminal.overlay.connectionError.title")}</p>
      {errorMessage && (
        <p className="opacity-80 text-xs mt-1 wrap-break-word">{errorMessage}</p>
      )}
      <PanelActions
        retryLabel={retryLabel ?? t("terminal.overlay.connectionError.retry")}
        onRetry={onRetry}
        onDismiss={onDismiss}
      />
    </div>
  );
}
