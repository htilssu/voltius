import { useEffect, useRef, type MouseEvent, type TouchEvent } from "react";
import { haptic } from "@/lib/haptics";
import { TOUCH_SLOP_PX } from "@/lib/ripple";

/**
 * Fallback delay. The Android WebView fires `contextmenu` on its own long-press
 * (~500 ms) and plays the system LONG_PRESS haptic with it, so that event is the main
 * trigger (TalkBack's double-tap-and-hold sends it too). The timer only covers
 * runtimes that never send one; it plays haptic("press") itself.
 */
export const LONG_PRESS_FALLBACK_MS = 650;

/**
 * Tap + long-press handlers for a touch row (host, folder and SFTP rows). Spread the
 * result on the row's button: a long-press runs `onLong` and swallows the click that
 * may follow the release; a plain tap runs `onTap`.
 */
export function useLongPress(onLong: () => void, onTap?: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const clear = () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  };
  useEffect(() => clear, []);
  const fire = (systemHaptic: boolean) => {
    clear();
    if (fired.current) return;
    fired.current = true;
    // No haptic() with the contextmenu: the WebView already played one (it would double).
    if (!systemHaptic) haptic("press");
    onLong();
  };
  return {
    onClick: (e: MouseEvent) => {
      if (fired.current) { fired.current = false; e.preventDefault(); return; }
      onTap?.();
    },
    onContextMenu: (e: MouseEvent) => { e.preventDefault(); fire(true); },
    onTouchStart: (e: TouchEvent) => {
      fired.current = false;
      clear();
      const t = e.touches[0];
      start.current = t ? { x: t.clientX, y: t.clientY } : null;
      timer.current = setTimeout(() => fire(false), LONG_PRESS_FALLBACK_MS);
    },
    onTouchMove: (e: TouchEvent) => {
      const t = e.touches[0], s = start.current;
      if (!t || !s || Math.hypot(t.clientX - s.x, t.clientY - s.y) > TOUCH_SLOP_PX) clear();
    },
    onTouchEnd: clear,
    onTouchCancel: clear,
  };
}
