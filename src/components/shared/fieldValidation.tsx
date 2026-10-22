import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Inline "required" validation for a form field, M3 style: the error shows once the user
 * left the field empty (blur) or tried to leave the form (`reveal`), never while they are
 * still on their first pass. Off (`enabled: false`) it returns nothing, so desktop forms,
 * which don't opt in, render exactly as before.
 */
export function useRequiredField(value: string, { enabled, reveal = false }: { enabled: boolean; reveal?: boolean }) {
  const [blurred, setBlurred] = useState(false);
  const invalid = enabled && !value.trim() && (blurred || reveal);
  return {
    invalid,
    fieldProps: enabled
      ? { onBlur: () => setBlurred(true), "aria-invalid": invalid || undefined, required: true }
      : {},
  };
}

/** M3 supporting text in the error colour, under a field. */
export function FieldError({ show, children }: { show: boolean; children?: React.ReactNode }) {
  const { t } = useTranslation();
  if (!show) return null;
  return (
    <p data-field-error role="alert" className="mt-1 px-1 text-xs text-(--t-status-error)">
      {children ?? t("mobile.editForm.required")}
    </p>
  );
}

/** What a mobile edit screen passes to the autosaving form it embeds. */
export interface MobileEditFormProps {
  /** Show the inline "required" errors now: the user tried to leave. */
  revealErrors?: boolean;
  /** An edit autosave cannot persist yet (useAutosave `blocked`) appeared or cleared. */
  onBlockedChange?: (blocked: boolean) => void;
}

/** Forward useAutosave's `blocked` to the screen. */
export function useReportBlocked(blocked: boolean, onBlockedChange?: (blocked: boolean) => void) {
  useEffect(() => { onBlockedChange?.(blocked); }, [blocked, onBlockedChange]);
}
