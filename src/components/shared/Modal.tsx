import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface Props {
  onClose: () => void;
  onEnter?: () => void;
  children: React.ReactNode;
  /** @deprecated No-op: the scrim is always flat (no backdrop blur). Kept for existing callers. */
  blur?: boolean;
}

export function Modal({ onClose, onEnter, children }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previous = document.activeElement;
    if (dialog && !dialog.contains(previous)) dialog.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && onEnter) { e.stopPropagation(); onEnter(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, onEnter]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-(--t-scrim)"
      onClick={onClose}
    >
      <div role="dialog" ref={dialogRef} tabIndex={-1} className="outline-hidden" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Shared dialog shell. Both variants are opaque with the same ring and
 * modal-level elevation; only the fill differs by surface role:
 *  - default: card fill, for lightweight transient dialogs (confirm, prompts).
 *  - `solid`: base fill, for dense content/reading surfaces (changelog,
 *    settings).
 * Use instead of hand-rolling `bg-(--t-bg-card) border ... boxShadow`.
 */
export function ModalCard({
  children,
  className = "",
  style,
  solid = false,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  solid?: boolean;
}) {
  return (
    <div
      className={`${solid ? "surface-modal-solid" : "surface-glass-modal"} rounded-[var(--r-lg)] mx-4 ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

/** Width clamp for small confirm-style dialogs: 21–27rem, never wider than the viewport. */
export const DIALOG_WIDTH = "min-w-[min(21rem,calc(100vw-2rem))] max-w-[min(27rem,calc(100vw-2rem))]";
