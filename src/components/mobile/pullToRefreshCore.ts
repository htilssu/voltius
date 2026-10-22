import { PULL_MOTION } from "@/lib/motion";

/**
 * Pure pieces of the pull-to-refresh gesture (usePullToRefresh wires them to touch events).
 * Whether a touch becomes a pull is sheetDrag.claimDrag (a downward move at scrollTop 0).
 * Offsets are px the indicator sits below the top of the list.
 */

/** Indicator offset for `dy` px of finger travel: resisted, approaching maxPx, never negative. */
export function pullOffset(dy: number): number {
  if (dy <= 0) return 0;
  const { maxPx, resistance } = PULL_MOTION;
  return maxPx * (1 - Math.exp((-dy * resistance) / maxPx));
}

/** 0..1 towards the refresh threshold (drives the arc length and the indicator opacity). */
export function pullProgress(offset: number): number {
  return Math.min(1, Math.max(0, offset / PULL_MOTION.thresholdPx));
}

/** Released at `offset`: refresh past the threshold, else spring back. */
export function pullRelease(offset: number): "refresh" | "cancel" {
  return offset >= PULL_MOTION.thresholdPx ? "refresh" : "cancel";
}

/** The spinner may leave once the reload is over and it has spun for minSpinMs. */
export function spinDone(busy: boolean, startedAt: number, now: number, minMs: number = PULL_MOTION.minSpinMs): boolean {
  return !busy && now - startedAt >= minMs;
}
