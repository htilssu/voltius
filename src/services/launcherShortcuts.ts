import { create } from "zustand";
import type { Connection } from "@/types";
import { recentlyUsed } from "@/utils/recentHosts";

/** Launcher shortcuts (Android): the most recently used hosts, as long-press entries on the
 *  app icon. Native side: LauncherShortcuts.kt (`window.VoltiusShortcuts`). */
export const LAUNCHER_SHORTCUTS_CAP = 4;

/** What a shortcut carries: the host id and its visible name. Never a credential. */
export interface ShortcutHost {
  id: string;
  label: string;
}

interface NativeShortcuts {
  setRecent(json: string): void;
  removeHosts(json: string): void;
}

function bridge(): NativeShortcuts | null {
  const w = window as unknown as { VoltiusShortcuts?: NativeShortcuts };
  return w.VoltiusShortcuts ?? null;
}

/** The hosts to offer, most recent first. Labels fall back to the address. */
export function shortcutHosts(connections: Connection[], cap = LAUNCHER_SHORTCUTS_CAP): ShortcutHost[] {
  return recentlyUsed(connections, cap).map((c) => ({ id: c.id, label: (c.name || c.host || c.id).trim() }));
}

/** Stable identity of a shortcut list, to skip redundant native calls. */
export function shortcutsKey(hosts: ShortcutHost[]): string {
  return JSON.stringify(hosts.map((h) => [h.id, h.label]));
}

/** Ids present before and gone now: deleted hosts whose pinned shortcuts must be disabled. */
export function removedIds(before: ReadonlySet<string>, now: ReadonlySet<string>): string[] {
  return [...before].filter((id) => !now.has(id));
}

export function publishShortcuts(hosts: ShortcutHost[]): void {
  try {
    bridge()?.setRecent(JSON.stringify(hosts));
  } catch {
    // The bridge is best-effort: a launcher without shortcut support must not break the page.
  }
}

export function retireShortcuts(ids: string[]): void {
  if (ids.length === 0) return;
  try {
    bridge()?.removeHosts(JSON.stringify(ids));
  } catch {
    // Best-effort, as above.
  }
}

interface PendingConnectStore {
  /** Host a launcher shortcut asked to open; consumed by the mobile shell once it can. */
  hostId: string | null;
  request(hostId: string): void;
  clear(): void;
}

export const usePendingConnectStore = create<PendingConnectStore>((set) => ({
  hostId: null,
  request: (hostId) => set({ hostId }),
  clear: () => set({ hostId: null }),
}));

/** Deep-link entry point (`voltius://connect?host=<id>`). */
export function requestHostConnect(hostId: string): void {
  usePendingConnectStore.getState().request(hostId);
}
