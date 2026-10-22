import { useEffect, type RefObject } from "react";

/**
 * Keyboard flow of a mobile edit form (Android): the IME's action key moves to the next
 * field ("next", "done" on the last one), and the focused field is kept clear of the
 * keyboard with some breathing room. Per A1 the WebView is already shrunk above the
 * keyboard, so this only scrolls the form; it never pads by --vt-ime.
 */

const FIELD_SELECTOR = [
  "input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]):not([disabled]):not([readonly])",
  "textarea:not([disabled]):not([readonly])",
].join(",");

/** Space kept between the focused field and the scroller's edges (px). */
export const REVEAL_MARGIN_PX = 24;

type Field = HTMLInputElement | HTMLTextAreaElement;

export function isFormField(el: EventTarget | null): el is Field {
  return el instanceof HTMLElement && el.matches(FIELD_SELECTOR);
}

/** Fields of `root` the user can reach, in document order: rendered, and not inside a
 *  collapsed block (`[data-collapsed]`, which clips its fields without hiding them). */
export function formFields(root: HTMLElement): Field[] {
  return [...root.querySelectorAll<Field>(FIELD_SELECTOR)]
    .filter((el) => el.getClientRects().length > 0 && !el.closest("[data-collapsed], [inert]"));
}

/** The field after `current`, or null when it is the last one. */
export function nextField<T>(fields: readonly T[], current: T): T | null {
  const i = fields.indexOf(current);
  return i >= 0 && i + 1 < fields.length ? fields[i + 1] : null;
}

/**
 * How far to scroll (scrollTop delta) so the field sits inside the visible part of its
 * scroller with `margin` around it. 0 when it already does. A field taller than the view
 * is aligned on its top edge, where the caret starts.
 */
export function revealDelta(
  field: { top: number; bottom: number },
  view: { top: number; bottom: number },
  margin = REVEAL_MARGIN_PX,
): number {
  const room = view.bottom - view.top - 2 * margin;
  if (field.top < view.top + margin || field.bottom - field.top > room) return field.top - (view.top + margin);
  if (field.bottom > view.bottom - margin) return field.bottom - (view.bottom - margin);
  return 0;
}

/** Wire the keyboard flow onto the scroller `ref` of an edit form. */
export function useFormKeyboard(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    let frame = 0;

    const reveal = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = document.activeElement;
        if (!isFormField(el) || !root.contains(el)) return;
        const r = el.getBoundingClientRect();
        const v = root.getBoundingClientRect();
        const dy = revealDelta(r, { top: v.top, bottom: Math.min(v.bottom, window.innerHeight) });
        if (dy) root.scrollBy({ top: dy });
      });
    };

    const onFocusIn = (e: FocusEvent) => {
      const el = e.target;
      if (!isFormField(el)) return;
      // Authors may pick their own hint; an automatic one is refreshed on every focus,
      // since fields come and go as sections expand.
      if (el instanceof HTMLInputElement && (!el.hasAttribute("enterkeyhint") || el.dataset.autoEnterHint)) {
        el.enterKeyHint = nextField(formFields(root), el) ? "next" : "done";
        el.dataset.autoEnterHint = "1";
      }
      reveal();
    };

    // Document bubble phase: runs after React's own handlers, so a field that already
    // uses Enter (a chip input adding a tag) has called preventDefault and is left alone.
    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target;
      if (e.key !== "Enter" || e.defaultPrevented || e.isComposing || !(el instanceof HTMLInputElement)) return;
      if (!isFormField(el) || !root.contains(el)) return;
      e.preventDefault();
      const next = nextField(formFields(root), el);
      if (next) next.focus();
      else el.blur();
    };

    root.addEventListener("focusin", onFocusIn);
    document.addEventListener("keydown", onKeyDown);
    // The WebView shrinks when the keyboard finishes opening (A1): re-check then.
    window.addEventListener("resize", reveal);
    return () => {
      cancelAnimationFrame(frame);
      root.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", reveal);
    };
  }, [ref]);
}
