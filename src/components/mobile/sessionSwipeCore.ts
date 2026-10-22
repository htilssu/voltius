/** Pure decisions for swiping between terminal sessions (no DOM). MobileTerminalGestures feeds
 *  it raw touch travel; MobileSessionLayer uses the step to pick the transition direction. */

/** Finger travel before a one-finger drag picks an axis (same slop as the scroll gesture). */
export const SWIPE_SLOP_PX = 10;
/** A sideways drag must be this much more horizontal than vertical to become a session swipe. */
export const SWIPE_AXIS_RATIO = 1.5;
/** Touches starting this close to the left/right screen edge belong to the system back gesture. */
export const SWIPE_EDGE_PX = 32;
/** Release past this share of the width, or a fling past the velocity with enough travel, switches. */
export const SWIPE_COMMIT_FRACTION = 0.25;
export const SWIPE_FLING_PX_PER_MS = 0.5;
export const SWIPE_FLING_MIN_PX = 40;
/** How far the terminal follows the finger while dragging (a hint, not a pager). */
export const SWIPE_FOLLOW = 0.35;

export type SwipeAxis = "x" | "y" | null;

/** Which way a one-finger drag goes once past the slop: null while undecided. Mostly-vertical
 *  (or diagonal) drags stay the scrollback scroll. */
export function claimSwipeAxis(dx: number, dy: number): SwipeAxis {
  if (Math.hypot(dx, dy) <= SWIPE_SLOP_PX) return null;
  return Math.abs(dx) > Math.abs(dy) * SWIPE_AXIS_RATIO ? "x" : "y";
}

/** True when a touch starts inside the system back-gesture edge strips. */
export function inEdgeZone(x: number, width: number): boolean {
  return x < SWIPE_EDGE_PX || x > width - SWIPE_EDGE_PX;
}

/**
 * Session step for a released horizontal drag: +1 = next session (finger moved left, like a
 * pager), -1 = previous, 0 = snap back. `vx` is the release velocity in px/ms (negative = left).
 */
export function sessionSwipeStep(dx: number, vx: number, width: number): -1 | 0 | 1 {
  const far = Math.abs(dx) >= width * SWIPE_COMMIT_FRACTION;
  const fling = Math.abs(vx) >= SWIPE_FLING_PX_PER_MS && Math.abs(dx) >= SWIPE_FLING_MIN_PX && Math.sign(vx) === Math.sign(dx);
  if (!far && !fling) return 0;
  return dx < 0 ? 1 : -1;
}

/** The session `step` away from `activeId`, or null at either end (no wrap-around). */
export function adjacentSessionId(ids: readonly string[], activeId: string | null, step: -1 | 0 | 1): string | null {
  if (step === 0 || !activeId) return null;
  const i = ids.indexOf(activeId);
  if (i < 0) return null;
  return ids[i + step] ?? null;
}

/** Direction of a session switch for the shared-axis transition: +1 = the new one sits to the
 *  right (enters from the right), -1 = to the left, 0 = unknown / not a sibling move. */
export function switchDirection(ids: readonly string[], fromId: string | null, toId: string | null): -1 | 0 | 1 {
  const a = fromId ? ids.indexOf(fromId) : -1;
  const b = toId ? ids.indexOf(toId) : -1;
  if (a < 0 || b < 0 || a === b) return 0;
  return b > a ? 1 : -1;
}
