import { useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import MobileEditHeader, { type EditPrimaryAction } from "./MobileEditHeader";
import BottomSheet from "./sheets/BottomSheet";
import { SheetActionRow } from "./sheets/SheetActionRow";
import { useBackInterceptor } from "@/hooks/useBackInterceptor";
import { useCollapsingHeader } from "./useCollapsingHeader";
import { useFormKeyboard } from "./formKeyboard";
import { rowTapControl } from "@/components/settings/settingsMobileCore";

/** Leaving now would lose edits: what the confirm sheet says, and whether it can save. */
export interface LeaveGuard {
  title: string;
  body: string;
  /** Offered as the first choice when the edit can be saved as it is. */
  onSave?: () => void;
}

const NO_TITLE = { current: null };

/**
 * Exit wiring for a screen embedding an autosaving form (ConnectionForm, KeyForm, …):
 * spread `formProps` on the form and `screenProps` on MobileEditScreen. Back asks before
 * discarding only while the form holds an edit autosave cannot persist (a required field
 * is empty), and then reveals the inline errors.
 */
export function useAutosaveExit() {
  const { t } = useTranslation();
  const [blocked, setBlocked] = useState(false);
  const [revealErrors, setRevealErrors] = useState(false);
  return {
    formProps: { revealErrors, onBlockedChange: setBlocked },
    screenProps: {
      guard: blocked ? { title: t("mobile.editForm.incompleteTitle"), body: t("mobile.editForm.incompleteBody") } : null,
      onRevealErrors: () => setRevealErrors(true),
    },
  };
}

/**
 * Frame of every mobile create/edit screen: M3 top app bar, a scrolling body with the
 * keyboard flow (useFormKeyboard) and the Android form styling (`[data-mobile-edit-form]`
 * in globals.css), and one exit path for both the ← and the system Back.
 *
 * Without a `guard` the system Back pops the page as usual (forms flush on unmount);
 * with one, Back and ← open a "discard?" sheet first and `onRevealErrors` lets the form
 * show what is missing.
 */
export default function MobileEditScreen({
  form, title, onLeave, onDiscard, guard, onRevealErrors, primary, onOverflow, overlay, children,
}: {
  /** `data-mobile-edit-form` value: host, key, identity, snippet, rule. */
  form: string;
  title: string;
  /** The normal exit (flush, then pop). */
  onLeave: () => void;
  /** Leave without saving, chosen in the confirm sheet. Defaults to onLeave. */
  onDiscard?: () => void;
  guard?: LeaveGuard | null;
  onRevealErrors?: () => void;
  primary?: EditPrimaryAction;
  onOverflow?: () => void;
  /** Sheets and full-screen pickers rendered over the screen, outside the scroller. */
  overlay?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [asking, setAsking] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const { onScroll } = useCollapsingHeader(rootRef, NO_TITLE);
  useFormKeyboard(bodyRef);

  const requestLeave = () => {
    if (!guard) { onLeave(); return; }
    (document.activeElement as HTMLElement | null)?.blur?.();
    onRevealErrors?.();
    setRevealed(true);
    setAsking(true);
  };
  // Only while something would be lost, so an ordinary Back keeps the page's own
  // predictive-back preview and pop.
  useBackInterceptor(!!guard && !asking, requestLeave);

  const choose = (fn: () => void) => () => { setAsking(false); fn(); };

  return (
    <div ref={rootRef} data-mobile-edit-form={form} data-reveal-errors={revealed ? "" : undefined} className="group/appbar absolute inset-0 z-30 flex flex-col bg-(--t-bg-base)">
      <MobileEditHeader title={title} onBack={requestLeave} primary={primary} onOverflow={onOverflow} />
      <div
        ref={bodyRef}
        data-mobile-edit-body
        onScroll={onScroll}
        // Settings-style rows (SettingRow on Android): a tap on the label forwards to the control.
        onClick={(e) => { if (!e.defaultPrevented) rowTapControl(e.target as Element)?.click(); }}
        className="flex-1 overflow-y-auto overscroll-contain relative"
      >
        {children}
      </div>
      {overlay}
      {asking && guard && (
        <BottomSheet title={guard.title} onClose={() => setAsking(false)}>
          <div data-mobile-edit-discard className="px-3 pt-1 pb-2 text-sm text-(--t-text-dim)">{guard.body}</div>
          {guard.onSave && (
            <SheetActionRow attr="edit-leave" it={{ icon: "lucide:check", label: t("common.action.save"), slug: "save", onTap: choose(guard.onSave) }} />
          )}
          <SheetActionRow attr="edit-leave" it={{ icon: "lucide:pencil", label: t("mobile.editForm.keepEditing"), slug: "keep", onTap: () => setAsking(false) }} />
          <SheetActionRow attr="edit-leave" it={{ icon: "lucide:trash-2", label: t("mobile.editForm.discard"), danger: true, slug: "discard-confirm", onTap: choose(onDiscard ?? onLeave) }} />
        </BottomSheet>
      )}
    </div>
  );
}
