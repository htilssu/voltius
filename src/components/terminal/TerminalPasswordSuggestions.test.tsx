import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PasswordPromptPosition } from "./passwordPrompt";
const mocks = vi.hoisted(() => ({
  changed: undefined as undefined | ((prompt: PasswordPromptPosition | null) => void),
  read: vi.fn(), insert: vi.fn(async () => {}), accepts: vi.fn(() => true),
  dispose: vi.fn(), dismiss: vi.fn(),
}));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: () => {} } }));
vi.mock("@iconify/react", () => ({ Icon: () => null }));
vi.mock("@/hooks/useTerminal", () => ({
  sessionAcceptsInput: mocks.accepts, insertSessionPassword: mocks.insert,
  watchSessionPasswordPrompt: (_id: string, changed: typeof mocks.changed) => {
    mocks.changed = changed;
    return { dispose: mocks.dispose, dismiss: mocks.dismiss };
  },
}));
vi.mock("@/services/terminalPasswords", () => ({
  terminalPasswordChoices: () => [{ id: "credential", label: "Production", username: "alice", kind: "connection" }],
  readTerminalPassword: mocks.read,
}));
import { useSessionStore } from "@/stores/sessionStore";
import { TerminalPasswordSuggestions } from "./TerminalPasswordSuggestions";
import { useUIStore } from "@/stores/uiStore";
const prompt = { key: "12:Password:", x: 100, y: 80 };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.accepts.mockReturnValue(true);
  useSessionStore.setState({ sessions: [{ id: "session", connectionId: "host", connectionName: "Production", type: "ssh", status: "connected" }] });
});
afterEach(cleanup);
function show() {
  const view = render(<TerminalPasswordSuggestions sessionId="session" enabled />);
  act(() => mocks.changed?.(prompt));
  return view;
}
describe("terminal password suggestions", () => {
  it("highlights the first option and consumes the first Enter before terminal handlers", async () => {
    mocks.read.mockResolvedValue("hidden-password");
    show();
    expect(screen.getAllByRole("option")[0].getAttribute("aria-selected")).toBe("true");
    expect(screen.queryByText("terminal.passwordSuggestions.hint")).toBeNull();
    const terminal = vi.fn();
    document.addEventListener("keydown", terminal);
    try {
      await act(async () => fireEvent.keyDown(document.body, { key: "Enter" }));
      expect(mocks.insert).toHaveBeenCalledExactlyOnceWith("session", "hidden-password");
      expect(terminal).not.toHaveBeenCalled();
    } finally { document.removeEventListener("keydown", terminal); }
  });
  it("moves selection to Add and changes preview, then opens identity creation on Enter", () => {
    show();
    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[1].getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("terminal.passwordSuggestions.addDescription")).toBeTruthy();
    expect(screen.queryByText("alice")).toBeNull();
    fireEvent.keyDown(document.body, { key: "Enter" });
    expect(useUIStore.getState()).toMatchObject({ activeNav: "keychain", homeView: false, keychainPendingAction: { action: "create-identity" } });
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it("tracks consecutive arrows before React renders, wraps, and updates on hover", () => {
    show();
    act(() => {
      fireEvent.keyDown(document.body, { key: "ArrowDown" });
      fireEvent.keyDown(document.body, { key: "ArrowDown" });
    });
    expect(screen.getAllByRole("option")[0].getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(document.body, { key: "ArrowUp" });
    expect(screen.getAllByRole("option")[1].getAttribute("aria-selected")).toBe("true");
    fireEvent.mouseEnter(screen.getAllByRole("option")[0]);
    expect(screen.getAllByRole("option")[0].getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("alice")).toBeTruthy();
  });
  it("does not read a password twice when Enter repeats while the vault is loading", async () => {
    let resolve!: (value: string) => void;
    mocks.read.mockReturnValue(new Promise<string>((r) => { resolve = r; }));
    show();
    act(() => {
      fireEvent.keyDown(document.body, { key: "Enter" });
      fireEvent.keyDown(document.body, { key: "Enter", repeat: true });
      fireEvent.keyDown(document.body, { key: "Enter" });
    });
    expect(mocks.read).toHaveBeenCalledOnce();
    await act(async () => resolve("hidden-password"));
    expect(mocks.insert).toHaveBeenCalledOnce();
  });
  it("submits only after selection without displaying the secret", async () => {
    mocks.read.mockResolvedValue("hidden-password");
    show();
    expect(mocks.read).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(screen.getByText("Production")));
    expect(mocks.insert).toHaveBeenCalledExactlyOnceWith("session", "hidden-password");
    expect(document.body.textContent).not.toContain("hidden-password");
    expect(mocks.dismiss).toHaveBeenCalled();
  });
  it("drops pending secret if user types while vault is being read", async () => {
    let resolve!: (value: string) => void;
    mocks.read.mockReturnValue(new Promise<string>((r) => { resolve = r; }));
    show();
    fireEvent.click(screen.getByText("Production"));
    act(() => mocks.changed?.(null));
    await act(async () => resolve("hidden-password"));
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("drops pending secret when terminal becomes hidden", async () => {
    let resolve!: (value: string) => void;
    mocks.read.mockReturnValue(new Promise<string>((r) => { resolve = r; }));
    const view = show();
    fireEvent.click(screen.getByText("Production"));
    view.rerender(<TerminalPasswordSuggestions sessionId="session" enabled={false} />);
    await act(async () => resolve("hidden-password"));
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.dispose).toHaveBeenCalled();
  });
  it("does not send an old credential to a session after switching to an identical prompt", async () => {
    let resolve!: (value: string) => void;
    mocks.read.mockReturnValue(new Promise<string>((r) => { resolve = r; }));
    const view = show();
    fireEvent.click(screen.getByText("Production"));
    act(() => useSessionStore.setState({ sessions: [{ id: "other", connectionId: "other-host", connectionName: "Other", type: "ssh", status: "connected" }] }));
    view.rerender(<TerminalPasswordSuggestions sessionId="other" enabled />);
    act(() => mocks.changed?.(prompt));
    await act(async () => resolve("hidden-password"));
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("shows vault failure without leaking error contents", async () => {
    mocks.read.mockRejectedValue(new Error("secret-sensitive-error"));
    show();
    await act(async () => fireEvent.click(screen.getByText("Production")));
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(document.body.textContent).not.toContain("secret-sensitive-error");
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("does not insert control characters or passwords after losing input control", async () => {
    mocks.read.mockResolvedValue("password\ncommand");
    show();
    await act(async () => fireEvent.click(screen.getByText("Production")));
    expect(mocks.insert).not.toHaveBeenCalled();
    mocks.read.mockImplementation(async () => { mocks.accepts.mockReturnValue(false); return "password"; });
    await act(async () => fireEvent.click(screen.getByText("Production")));
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
