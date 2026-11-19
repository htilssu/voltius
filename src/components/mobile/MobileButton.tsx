import type { ButtonHTMLAttributes } from "react";

export type MobileButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "danger-ghost";

/**
 * The one full-size mobile call-to-action: 48px tall (a full tap target, no
 * `vt-hit` needed), `rounded-lg`, styled by the shared `.btn-*` variants so the
 * fill, on-color text and disabled opacity match the desktop buttons.
 * `block` stretches it to the container width (sheet/screen footers).
 * Exported on `@voltius/ui` so plugin mobile screens use the same button.
 */
export function MobileButton({
  variant = "primary", block = false, className = "", ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: MobileButtonVariant; block?: boolean }) {
  return (
    <button
      {...rest}
      className={`btn btn-${variant} h-12 px-5 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2${block ? " w-full" : ""}${className ? ` ${className}` : ""}`}
    />
  );
}
