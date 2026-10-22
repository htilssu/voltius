import { describe, expect, it, vi } from "vitest";
import type { Terminal } from "@xterm/xterm";
import { isPasswordPrompt, observePasswordPrompt } from "./passwordPrompt";

describe("password prompt recognition", () => {
  it.each(["Password:", "[sudo] password for alice: ", "alice@server's password:", "Enter password:", "Enter current password:"])("recognizes %s", (line) => {
    expect(isPasswordPrompt(line)).toBe(true);
  });
  it.each(["$ echo Password:", "New password:", "Retype password:", "Confirm password:", "password: visible text", "password authentication failed", "Enter passphrase for key:"])("ignores %s", (line) => {
    expect(isPasswordPrompt(line)).toBe(false);
  });
});

describe("parsed password prompt observer", () => {
  it("tracks position, hides on input, and reopens only for a fresh prompt", () => {
    vi.stubGlobal("window", { addEventListener: vi.fn(), removeEventListener: vi.fn() });
    const events: Record<string, () => void> = {};
    const disposers = Array.from({ length: 5 }, () => vi.fn());
    const subscribe = (name: string, index: number) => (fn: () => void) => {
      events[name] = fn;
      return { dispose: disposers[index] };
    };
    let line = "Pass";
    const buffer = { type: "normal", baseY: 10, cursorY: 2, cursorX: 9, viewportY: 10,
      getLine: () => ({ translateToString: () => line }) };
    const term = { buffer: { active: buffer }, cols: 80, rows: 24,
      element: { querySelector: () => ({ getBoundingClientRect: () => ({ left: 20, top: 30, width: 800, height: 480 }) }) },
      onWriteParsed: subscribe("write", 0), onCursorMove: subscribe("cursor", 1),
      onScroll: subscribe("scroll", 2), onResize: subscribe("resize", 3), onData: subscribe("data", 4) };
    const changed = vi.fn();
    const observer = observePasswordPrompt(term as unknown as Terminal, changed);
    expect(changed).toHaveBeenLastCalledWith(null);
    line = "Password: ";
    events.write();
    expect(changed).toHaveBeenLastCalledWith({ key: "12:Password: ", x: 110, y: 90 });
    events.data();
    events.write();
    expect(changed).toHaveBeenLastCalledWith(null);
    observer.dispose();
    const reattached = observePasswordPrompt(term as unknown as Terminal, changed);
    expect(changed).toHaveBeenLastCalledWith(null);
    buffer.cursorY++;
    events.write();
    expect(changed.mock.lastCall?.[0]).toMatchObject({ key: "13:Password: " });
    buffer.type = "alternate";
    events.write();
    expect(changed).toHaveBeenLastCalledWith(null);
    reattached.dispose();
    disposers.forEach((dispose) => expect(dispose).toHaveBeenCalledTimes(2));
    vi.unstubAllGlobals();
  });
});
