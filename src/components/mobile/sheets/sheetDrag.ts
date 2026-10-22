import { SHEET_MOTION } from "@/lib/motion";

/**
 * Pure pieces of the bottom-sheet drag gesture (BottomSheet.tsx wires them to touch events):
 * which way a touch goes, rubber-banding, release velocity, and the dismiss / settle verdict.
 * Offsets are px below the sheet rest position (down = positive), velocities px/ms.
 */

/**
 * Release velocity from (time, y) samples: the movement over the last `windowMs` before
 * the finger lifted at `releaseT`. A finger that stopped before lifting has no velocity.
 */
export class VelocityTracker {
  private samples: { t: number; y: number }[] = [];
  constructor(private windowMs: number = SHEET_MOTION.velocityWindowMs) {}

  reset() {
    this.samples = [];
  }

  add(t: number, y: number) {
    this.samples.push({ t, y });
    const cut = t - this.windowMs;
    while (this.samples.length > 2 && this.samples[0].t < cut) this.samples.shift();
  }

  velocity(releaseT = this.samples[this.samples.length - 1]?.t ?? 0): number {
    const s = this.samples.filter((p) => p.t >= releaseT - this.windowMs);
    if (s.length < 2) return 0;
    const first = s[0];
    const last = s[s.length - 1];
    const dt = Math.max(releaseT, last.t) - first.t;
    return dt > 0 ? (last.y - first.y) / dt : 0;
  }
}

/** Downward drags follow the finger 1:1; upward ones resist and approach `limit` px. */
export function rubberBand(dy: number, limit: number = SHEET_MOTION.rubberBandPx): number {
  if (dy >= 0) return dy;
  return -limit * (1 - Math.exp(dy / limit));
}

/**
 * Should a touch that has moved (dx, dy) since it started become a sheet drag?
 * "wait" until it passes the slop, "drag" for a downward (or, with anyDirection: handle or nothing to scroll, any)
 * vertical move when the content is scrolled to the top, else "pass" (scroll / let go).
 */
export function claimDrag(
  dx: number,
  dy: number,
  opts: { anyDirection: boolean; scrollTop: number },
  slop: number = SHEET_MOTION.slopPx,
): "wait" | "drag" | "pass" {
  if (Math.hypot(dx, dy) < slop) return "wait";
  if (Math.abs(dx) > Math.abs(dy)) return "pass";
  if (opts.anyDirection) return "drag";
  return dy > 0 && opts.scrollTop <= 0 ? "drag" : "pass";
}

/**
 * Release verdict: dismiss when dragged past `dismissFraction` of the height or flung
 * down faster than `flingVelocity`; an upward fling always keeps the sheet.
 */
export function releaseAction(offset: number, velocity: number, height: number): "dismiss" | "settle" {
  const { flingVelocity, dismissFraction } = SHEET_MOTION;
  if (velocity <= -flingVelocity) return "settle";
  if (velocity >= flingVelocity) return "dismiss";
  return height > 0 && offset > height * dismissFraction ? "dismiss" : "settle";
}

/**
 * A dismiss that keeps the release speed: ease-out timing whose start slope matches
 * `velocity` over the `remaining` px. Slow releases fall back to the exit token (null).
 */
export function flingExit(remaining: number, velocity: number): { duration: number; easing: string } | null {
  const { flingVelocity, flingMinMs, flingMaxMs } = SHEET_MOTION;
  if (velocity < flingVelocity || remaining <= 0) return null;
  // Quadratic ease-out (start slope 2) covers `remaining` in 2·remaining/v at speed v.
  const duration = Math.round(Math.min(flingMaxMs, Math.max(flingMinMs, (2 * remaining) / velocity)));
  // Normalised start slope for that duration; cubic-bezier(1/3, s/3, 2/3, 1) starts at slope s.
  const slope = Math.min(3, (velocity * duration) / remaining);
  const y1 = +(slope / 3).toFixed(3);
  return { duration, easing: `cubic-bezier(0.333, ${y1}, 0.667, 1)` };
}

/** Scrim opacity (0..1) while the sheet sits `offset` px below rest. */
export function scrimOpacity(offset: number, height: number): number {
  if (height <= 0) return 1;
  return Math.min(1, Math.max(0, 1 - offset / height));
}
