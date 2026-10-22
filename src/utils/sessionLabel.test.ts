import { test, expect } from "vitest";
import type { TerminalSession } from "@/types";
import { normalizeTabTitle, sessionLabel, sessionMatchesQuery, splitTabLabel, TAB_TITLE_MAX } from "./sessionLabel";
import type { SplitTab } from "@/stores/layoutStore";

const session: TerminalSession = { id: "s1", connectionId: "c1", connectionName: "srv", status: "connected", type: "ssh" };

const tab: SplitTab = {
  id: "t1",
  root: { type: "leaf", id: "p1", sessionId: "s1" },
  activePaneId: "p1",
  maximizedPaneId: null,
  broadcastActive: false,
};

test("a session falls back to its connection name until it is given a title", () => {
  expect(sessionLabel(session)).toBe("srv");
  expect(sessionLabel({ ...session, title: "deploy" })).toBe("deploy");
});

test("split tabs default to Workspace and retain explicit names", () => {
  expect(splitTabLabel(tab)).toBe("Workspace");
  expect(splitTabLabel({ ...tab, name: "prod" })).toBe("prod");
});

test("a typed title is trimmed, capped, and cleared when it holds no text", () => {
  expect(normalizeTabTitle("  deploy  ")).toBe("deploy");
  expect(normalizeTabTitle("")).toBeUndefined();
  expect(normalizeTabTitle("   ")).toBeUndefined();
  expect(normalizeTabTitle(null)).toBeUndefined();
  expect(normalizeTabTitle("x".repeat(80))).toBe("x".repeat(TAB_TITLE_MAX));
});

test("a renamed session matches a search by tab name or by connection name", () => {
  const renamed = { ...session, title: "Deploy" };
  expect(sessionMatchesQuery(renamed, "depl")).toBe(true);
  expect(sessionMatchesQuery(renamed, "SRV")).toBe(true);
  expect(sessionMatchesQuery(renamed, "db")).toBe(false);
  expect(sessionMatchesQuery(session, "srv")).toBe(true);
});
