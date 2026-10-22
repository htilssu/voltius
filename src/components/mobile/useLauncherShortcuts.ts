import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAllConnections } from "@/hooks/useAllConnections";
import { useAppLockStore } from "@/stores/appLockStore";
import { useConnectionStore } from "@/stores/connectionStore";
import { appToast } from "@/services/appToast";
import {
  publishShortcuts,
  removedIds,
  retireShortcuts,
  shortcutHosts,
  shortcutsKey,
  usePendingConnectStore,
} from "@/services/launcherShortcuts";
import { useOpenHost } from "./useOpenHost";

/** How long a shortcut waits for its host to show up (vaults still loading) before giving up. */
const MISSING_HOST_GRACE_MS = 4000;

/** Launcher shortcuts for the mobile shell: keeps the recent-host shortcuts in sync with the
 *  hosts list (a connect bumps `last_used_at`, so the list follows every new session), retires
 *  the shortcuts of deleted hosts, and opens the host a shortcut asked for once the app is
 *  unlocked. */
export function useLauncherShortcuts(): void {
  const { t } = useTranslation();
  const connections = useAllConnections();
  const loading = useConnectionStore((s) => s.loading);
  const locked = useAppLockStore((s) => s.kind !== null);
  const pending = usePendingConnectStore((s) => s.hostId);
  const openHost = useOpenHost();
  // Fresh closures every render; read through refs so the pending effect (and its grace
  // timer) only re-runs when the request, the lock or the hosts change.
  const openRef = useRef(openHost);
  openRef.current = openHost;
  const tRef = useRef(t);
  tRef.current = t;

  // Recent hosts → native dynamic shortcuts. Skipped until the hosts list was seen once, so a
  // cold start doesn't wipe the shortcuts before the vault has loaded.
  const hosts = useMemo(() => shortcutHosts(connections), [connections]);
  const key = shortcutsKey(hosts);
  const seen = useRef(false);
  const published = useRef<string | null>(null);
  useEffect(() => {
    if (connections.length > 0) seen.current = true;
    if (!seen.current || published.current === key) return;
    published.current = key;
    publishShortcuts(hosts);
  }, [connections.length, hosts, key]);

  // A host that disappears from the list (deleted) loses its shortcut, pinned ones included.
  const ids = useMemo(() => new Set(connections.map((c) => c.id)), [connections]);
  const prevIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    const before = prevIds.current;
    prevIds.current = ids;
    if (before && !loading) retireShortcuts(removedIds(before, ids));
  }, [ids, loading]);

  // A shortcut tap: connect once unlocked and the host is known.
  useEffect(() => {
    if (!pending || locked) return;
    if (ids.has(pending)) {
      usePendingConnectStore.getState().clear();
      openRef.current(pending);
      return;
    }
    const timer = setTimeout(() => {
      if (usePendingConnectStore.getState().hostId !== pending) return;
      usePendingConnectStore.getState().clear();
      retireShortcuts([pending]);
      appToast("error", tRef.current("mobile.shortcuts.hostGone"));
    }, MISSING_HOST_GRACE_MS);
    return () => clearTimeout(timer);
  }, [pending, locked, ids]);
}
