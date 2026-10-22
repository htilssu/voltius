/** Pure scroll logic for the Android large-title top bar and the extended FAB. */

/** Scroll distance (px) the FAB needs in one direction before it shrinks / grows. */
export const FAB_SCROLL_THRESHOLD = 8;

/** 0 = large title fully shown, 1 = scrolled under the top bar (small title takes over). */
export function foldProgress(scrollTop: number, foldDistance: number): number {
  if (foldDistance <= 0) return scrollTop > 0 ? 1 : 0;
  return Math.min(1, Math.max(0, scrollTop / foldDistance));
}

/**
 * M3 extended FAB: shrink to the icon while scrolling down, extend again on the way
 * up and always at the top. `dy` = scrollTop moved since the last decision.
 */
export function fabExtended(extended: boolean, scrollTop: number, dy: number): boolean {
  if (scrollTop <= 0) return true;
  if (dy > FAB_SCROLL_THRESHOLD) return false;
  if (dy < -FAB_SCROLL_THRESHOLD) return true;
  return extended;
}
