import type { Terminal } from "@xterm/xterm";

/** Deliberately excludes new-password prompts and ordinary shell commands. */
export function isPasswordPrompt(line: string): boolean {
  const text = line.trim();
  if (/\b(?:new|retype|repeat|confirm)\b/i.test(text)) return false;
  return /^(?:\[sudo\]\s*)?password(?:\s+for\s+[^:]+)?\s*:\s*$/i.test(text)
    || /^[^\s:]+(?:@[^\s:]+)?'s password\s*:\s*$/i.test(text)
    || /^enter (?:your |current |old )?password(?:\s+for\s+[^:]+)?\s*:\s*$/i.test(text);
}

export interface PasswordPromptPosition { key: string; x: number; y: number }
// Keep a partially typed/dismissed prompt closed when its pane is reattached.
const dismissedPrompts = new WeakMap<Terminal, string>();

/** Reads parsed cells, so ANSI sequences and prompts split across writes work. */
export function observePasswordPrompt(term: Terminal, changed: (prompt: PasswordPromptPosition | null) => void) {
  let current: PasswordPromptPosition | null = null;
  const update = () => {
    const b = term.buffer.active;
    const row = b.baseY + b.cursorY;
    const line = b.getLine(row)?.translateToString(true) ?? "";
    const screen = term.element?.querySelector<HTMLElement>(".xterm-screen");
    const key = `${row}:${line}`;
    if (b.type !== "normal" || !isPasswordPrompt(line)) {
      dismissedPrompts.delete(term);
      current = null;
    } else if (!screen || row < b.viewportY || row >= b.viewportY + term.rows || key === dismissedPrompts.get(term)) {
      current = null;
    } else {
      const r = screen.getBoundingClientRect();
      current = { key, x: r.left + Math.min(b.cursorX, term.cols - 1) * r.width / term.cols,
        y: r.top + (row - b.viewportY + 1) * r.height / term.rows };
    }
    changed(current);
  };
  const dismiss = () => {
    if (current) dismissedPrompts.set(term, current.key);
    current = null;
    changed(null);
  };
  const subscriptions = [term.onWriteParsed(update), term.onCursorMove(update), term.onScroll(update),
    term.onResize(update), term.onData(dismiss)];
  window.addEventListener("resize", update);
  window.addEventListener("scroll", update, true);
  update();
  return { dismiss, dispose() {
    subscriptions.forEach((s) => s.dispose());
    window.removeEventListener("resize", update);
    window.removeEventListener("scroll", update, true);
  } };
}
