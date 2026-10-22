// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const send = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@/services/sessionInput", () => ({ sendSessionInput: send, sendSessionResize: vi.fn() }));
import { __setTerminalCacheForTest, insertSessionPassword } from "./useTerminal";
import { useAppLockStore } from "@/stores/appLockStore";
import { useCommandHistoryStore } from "@/stores/commandHistoryStore";

type Entries = Parameters<typeof __setTerminalCacheForTest>[0];
type Entry = Entries extends Map<string, infer V> ? V : never;
const focus = vi.fn();
let gate: boolean;
beforeEach(() => {
  vi.clearAllMocks();
  gate = true;
  useAppLockStore.setState({ kind: null });
  __setTerminalCacheForTest(new Map([["session", {
    sessionType: "ssh", encoding: "utf-8", connectedRef: { current: true },
    inputGateRef: { current: () => gate }, terminal: { focus },
  } as unknown as Entry]]));
});
afterEach(() => { __setTerminalCacheForTest(new Map()); vi.restoreAllMocks(); });
describe("password insertion transport", () => {
  it("submits the password with exactly one Enter to one session without history", async () => {
    const history = vi.spyOn(useCommandHistoryStore.getState(), "addInput");
    await insertSessionPassword("session", "stored-password");
    expect(send).toHaveBeenCalledExactlyOnceWith("session", "ssh", new TextEncoder().encode("stored-password\r"));
    expect(history).not.toHaveBeenCalled();
    expect(focus).toHaveBeenCalledOnce();
  });
  it("rejects locked, gated, missing sessions and control characters", async () => {
    await expect(insertSessionPassword("missing", "secret")).rejects.toThrow();
    gate = false;
    await expect(insertSessionPassword("session", "secret")).rejects.toThrow();
    gate = true;
    useAppLockStore.setState({ kind: "screen" });
    await expect(insertSessionPassword("session", "secret")).rejects.toThrow();
    useAppLockStore.setState({ kind: null });
    await expect(insertSessionPassword("session", "secret\ncommand")).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
  });
});
