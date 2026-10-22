// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import type { Connection } from "@/types";
import {
  LAUNCHER_SHORTCUTS_CAP,
  publishShortcuts,
  removedIds,
  requestHostConnect,
  retireShortcuts,
  shortcutHosts,
  shortcutsKey,
  usePendingConnectStore,
} from "./launcherShortcuts";

const conn = (id: string, last: string | null, name = id, host = `${id}.lan`) =>
  ({ id, name, host, last_used_at: last }) as unknown as Connection;

afterEach(() => {
  delete (window as unknown as { VoltiusShortcuts?: unknown }).VoltiusShortcuts;
  usePendingConnectStore.getState().clear();
});

test("offers the most recently used hosts first, capped, never unused ones", () => {
  const hosts = shortcutHosts([
    conn("a", "2026-10-01"),
    conn("b", null),
    conn("c", "2026-10-03"),
    conn("d", "2026-10-02"),
    conn("e", "2026-09-01"),
    conn("f", "2026-08-01"),
  ]);
  expect(hosts.map((h) => h.id)).toEqual(["c", "d", "a", "e"]);
  expect(hosts).toHaveLength(LAUNCHER_SHORTCUTS_CAP);
});

test("labels fall back to the address when a host has no name", () => {
  expect(shortcutHosts([conn("a", "x", "", "10.0.2.2")])).toEqual([{ id: "a", label: "10.0.2.2" }]);
});

test("a shortcut carries the id and the label only", () => {
  const withSecrets = { ...conn("a", "x"), password: "hunter2", username: "root" } as unknown as Connection;
  expect(Object.keys(shortcutHosts([withSecrets])[0]).sort()).toEqual(["id", "label"]);
});

test("the key changes with order and labels", () => {
  const a = { id: "a", label: "A" };
  const b = { id: "b", label: "B" };
  expect(shortcutsKey([a, b])).not.toBe(shortcutsKey([b, a]));
  expect(shortcutsKey([a])).not.toBe(shortcutsKey([{ id: "a", label: "A2" }]));
});

test("removedIds lists only the ids that disappeared", () => {
  expect(removedIds(new Set(["a", "b", "c"]), new Set(["a", "c", "d"]))).toEqual(["b"]);
});

test("publish / retire talk to the native bridge and survive its absence", () => {
  expect(() => publishShortcuts([{ id: "a", label: "A" }])).not.toThrow();
  const bridge = { setRecent: vi.fn(), removeHosts: vi.fn() };
  (window as unknown as { VoltiusShortcuts: typeof bridge }).VoltiusShortcuts = bridge;
  publishShortcuts([{ id: "a", label: "A" }]);
  expect(JSON.parse(bridge.setRecent.mock.calls[0][0])).toEqual([{ id: "a", label: "A" }]);
  retireShortcuts([]);
  expect(bridge.removeHosts).not.toHaveBeenCalled();
  retireShortcuts(["b"]);
  expect(JSON.parse(bridge.removeHosts.mock.calls[0][0])).toEqual(["b"]);
});

test("a connect request waits in the store for the shell", () => {
  requestHostConnect("h1");
  expect(usePendingConnectStore.getState().hostId).toBe("h1");
});
