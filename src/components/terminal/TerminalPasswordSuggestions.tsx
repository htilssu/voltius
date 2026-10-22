import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { insertSessionPassword, sessionAcceptsInput, watchSessionPasswordPrompt } from "@/hooks/useTerminal";
import { useSessionStore } from "@/stores/sessionStore";
import { readTerminalPassword, terminalPasswordChoices, type TerminalPasswordChoice } from "@/services/terminalPasswords";
import type { PasswordPromptPosition } from "./passwordPrompt";
import { useAppLockStore } from "@/stores/appLockStore";
import { useUIStore } from "@/stores/uiStore";
import { Icon } from "@iconify/react";

export function TerminalPasswordSuggestions({ sessionId, enabled }: { sessionId: string; enabled: boolean }) {
  const { t } = useTranslation();
  const session = useSessionStore((s) => s.sessions.find((item) => item.id === sessionId));
  const locked = useAppLockStore((s) => s.kind !== null);
  const [prompt, setPrompt] = useState<PasswordPromptPosition | null>(null);
  const live = useRef<PasswordPromptPosition | null>(null);
  const observer = useRef<ReturnType<typeof watchSessionPasswordPrompt>>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState(0);
  const selectedRef = useRef(0);
  const pending = useRef(false);
  const popup = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const dismiss = () => observer.current?.dismiss();
  useLayoutEffect(() => {
    if (popup.current) setHeight(popup.current.getBoundingClientRect().height);
  });
  useEffect(() => {
    live.current = null;
    setPrompt(null);
    setError(false);
    if (!enabled || locked || session?.status !== "connected") return;
    const handle = watchSessionPasswordPrompt(sessionId, (next) => {
      if (next?.key !== live.current?.key) {
        selectedRef.current = 0;
        setSelected(0);
        setError(false);
      }
      live.current = next;
      setPrompt(next);
    });
    observer.current = handle;
    return () => { live.current = null; handle?.dispose(); observer.current = undefined; };
  }, [sessionId, enabled, locked, session?.status]);

  const choices = session ? terminalPasswordChoices(session.connectionId) : [];
  const open = enabled && !locked && !!prompt && session?.status === "connected" && sessionAcceptsInput(sessionId);
  const highlight = (index: number) => {
    selectedRef.current = index;
    setSelected(index);
  };
  const add = () => {
    if (pending.current) return;
    // Leave this prompt eligible when the user returns after saving an identity.
    observer.current?.dispose();
    observer.current = undefined;
    live.current = null;
    setPrompt(null);
    useUIStore.setState({ activeNav: "keychain", lastPageNav: "keychain", homeView: false,
      keychainPendingAction: { action: "create-identity" } });
  };
  const select = async (choice: TerminalPasswordChoice) => {
    if (pending.current || !prompt) return;
    pending.current = true;
    const key = prompt.key;
    const observation = observer.current;
    setBusy(true);
    setError(false);
    try {
      const password = await readTerminalPassword(choice);
      // Never insert after navigation, typing, prompt replacement or disconnect.
      if (observer.current !== observation || live.current?.key !== key || !sessionAcceptsInput(sessionId)) return;
      if (!password || /[\x00-\x1f\x7f]/.test(password)) { setError(true); return; }
      await insertSessionPassword(sessionId, password);
      dismiss();
    } catch { if (observer.current === observation) setError(true); }
    finally { pending.current = false; setBusy(false); }
  };

  // Capture before xterm sees Enter/arrows; never send the selection key to the shell.
  // Layout timing makes the first Enter work immediately after the popup mounts.
  useLayoutEffect(() => {
    if (!open) return;
    const keyboard = (event: KeyboardEvent) => {
      if (event.isComposing || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
      if (!["Enter", "ArrowUp", "ArrowDown", "Escape"].includes(event.key)) return;
      const field = event.target instanceof Element ? event.target.closest("input, textarea, [contenteditable=true]") : null;
      if (field && !field.classList.contains("xterm-helper-textarea")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.type !== "keydown") return;
      if (event.key === "Escape") dismiss();
      else if (pending.current || (event.key === "Enter" && event.repeat)) return;
      else if (event.key === "ArrowDown") highlight((selectedRef.current + 1) % (choices.length + 1));
      else if (event.key === "ArrowUp") highlight((selectedRef.current + choices.length) % (choices.length + 1));
      else if (selectedRef.current >= choices.length) add();
      else void select(choices[selectedRef.current]);
    };
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !popup.current?.contains(event.target)) dismiss();
    };
    const keyEvents = ["keydown", "keypress", "keyup"] as const;
    for (const type of keyEvents) document.addEventListener(type, keyboard, true);
    document.addEventListener("pointerdown", outside, true);
    return () => {
      for (const type of keyEvents) document.removeEventListener(type, keyboard, true);
      document.removeEventListener("pointerdown", outside, true);
    };
  });

  useLayoutEffect(() => {
    popup.current?.querySelector('[aria-selected="true"]')?.scrollIntoView?.({ block: "nearest" });
  }, [selected]);

  if (!open || !prompt) return null;
  const activeChoice = choices[selected];

  return createPortal(
    <div ref={popup} role="dialog" aria-label={t("terminal.passwordSuggestions.title")}
      className="fixed z-50 w-80 max-w-[calc(100vw-16px)] overflow-hidden rounded-lg border shadow-xl text-sm"
      style={{ left: Math.max(8, Math.min(prompt.x, window.innerWidth - 328)),
        top: Math.max(8, prompt.y + height + 12 > window.innerHeight ? prompt.y - height - 24 : prompt.y + 4),
        background: "var(--t-bg-card)", borderColor: "var(--t-border)", color: "var(--t-text-primary)" }}>
      <div className="border-b px-3 py-2 italic" style={{ borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }}>
        {activeChoice ? <>
          <div><span className="opacity-60">{t("terminal.passwordSuggestions.username")}: </span>{activeChoice.username}</div>
          <div><span className="opacity-60">{t("terminal.passwordSuggestions.password")}: </span>••••••••••••</div>
        </> : t("terminal.passwordSuggestions.addDescription")}
      </div>
      <div role="listbox" aria-label={t("terminal.passwordSuggestions.title")} className="max-h-44 overflow-auto">
        {choices.map((choice, index) => <button key={`${choice.kind}:${choice.id}`} type="button" role="option"
          aria-selected={selected === index} disabled={busy}
          className="flex w-full items-center gap-3 px-3 py-1.5 text-left disabled:opacity-50"
          style={{ background: selected === index ? "var(--t-bg-elevated)" : undefined }}
          onMouseEnter={() => highlight(index)} onFocus={() => highlight(index)} onClick={() => void select(choice)}>
          <Icon icon="lucide:key-round" className="shrink-0" />
          <span className="truncate flex-1">{choice.label}</span>
          {selected === index && <Icon icon="lucide:corner-down-left" className="shrink-0" />}
        </button>)}
        <button type="button" role="option" aria-selected={selected === choices.length} disabled={busy}
          className="flex w-full items-center gap-3 px-3 py-1.5 text-left disabled:opacity-50"
          style={{ background: selected === choices.length ? "var(--t-bg-elevated)" : undefined }}
          onMouseEnter={() => highlight(choices.length)} onFocus={() => highlight(choices.length)} onClick={add}>
          <Icon icon="lucide:circle-plus" className="shrink-0" />
          <span className="flex-1">{t("terminal.passwordSuggestions.add")}</span>
          {selected === choices.length && <Icon icon="lucide:corner-down-left" className="shrink-0" />}
        </button>
      </div>
      {error && <p role="alert" className="px-3 py-2">{t("terminal.passwordSuggestions.unavailable")}</p>}
    </div>, document.body,
  );
}
