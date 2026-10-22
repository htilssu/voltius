import { describe, expect, it } from "vitest";
import { SHEET_MOTION, springSamples } from "@/lib/motion";
import { VelocityTracker, claimDrag, flingExit, releaseAction, rubberBand, scrimOpacity } from "./sheetDrag";

/** Feed a constant-speed drag (adb `input swipe` style) of `dist` px over `ms`, 16 ms apart. */
function drag(dist: number, ms: number, t0 = 1000) {
  const tr = new VelocityTracker();
  for (let t = 0; t <= ms; t += 16) tr.add(t0 + t, (dist * t) / ms);
  tr.add(t0 + ms, dist);
  return { tr, end: t0 + ms };
}

describe("VelocityTracker", () => {
  it("measures the speed over the last window", () => {
    const { tr, end } = drag(300, 600);
    expect(tr.velocity(end)).toBeCloseTo(0.5, 2);
  });

  it("ignores movement older than the window", () => {
    const tr = new VelocityTracker(100);
    tr.add(0, 0);
    tr.add(50, 400); // fast start
    for (let t = 60; t <= 400; t += 20) tr.add(t, 400 + (t - 50) * 0.1); // then slow
    expect(tr.velocity(400)).toBeCloseTo(0.1, 2);
  });

  it("reads zero when the finger stopped before lifting", () => {
    const { tr, end } = drag(300, 200);
    expect(tr.velocity(end + 300)).toBe(0);
  });

  it("is negative for an upward fling and zero with one sample", () => {
    const { tr, end } = drag(-200, 100);
    expect(tr.velocity(end)).toBeLessThan(-1.5);
    const one = new VelocityTracker();
    one.add(0, 10);
    expect(one.velocity(0)).toBe(0);
    one.reset();
    expect(one.velocity()).toBe(0);
  });
});

describe("rubberBand", () => {
  it("follows downward drags 1:1", () => {
    expect(rubberBand(0)).toBe(0);
    expect(rubberBand(123)).toBe(123);
  });

  it("resists upward drags and never passes the limit", () => {
    expect(rubberBand(-10, 48)).toBeLessThan(0);
    expect(rubberBand(-10, 48)).toBeGreaterThan(-10);
    expect(rubberBand(-1000, 48)).toBeGreaterThan(-48);
    expect(rubberBand(-100, 48)).toBeLessThan(rubberBand(-50, 48));
  });
});

describe("claimDrag", () => {
  const top = { anyDirection: false, scrollTop: 0 };
  it("waits inside the slop", () => {
    expect(claimDrag(3, 4, top)).toBe("wait");
  });

  it("drags downward when the content is at its top", () => {
    expect(claimDrag(0, 20, top)).toBe("drag");
  });

  it("lets the content scroll first", () => {
    expect(claimDrag(0, 20, { anyDirection: false, scrollTop: 40 })).toBe("pass");
    expect(claimDrag(0, -20, top)).toBe("pass");
  });

  it("drags either way from the handle or a body with nothing to scroll", () => {
    expect(claimDrag(0, -20, { anyDirection: true, scrollTop: 0 })).toBe("drag");
  });

  it("leaves horizontal moves alone", () => {
    expect(claimDrag(30, 10, { anyDirection: true, scrollTop: 0 })).toBe("pass");
  });
});

describe("releaseAction", () => {
  const h = 500;
  it("springs back from a slow short drag", () => {
    const { tr, end } = drag(100, 1000);
    expect(releaseAction(100, tr.velocity(end), h)).toBe("settle");
  });

  it("dismisses a slow drag past the dismiss fraction", () => {
    const dist = h * SHEET_MOTION.dismissFraction + 20;
    const { tr, end } = drag(dist, 2000);
    expect(releaseAction(dist, tr.velocity(end), h)).toBe("dismiss");
  });

  it("dismisses a fast short flick", () => {
    const { tr, end } = drag(60, 60);
    expect(releaseAction(60, tr.velocity(end), h)).toBe("dismiss");
  });

  it("keeps the sheet on an upward fling even past the fraction", () => {
    expect(releaseAction(h * 0.6, -1, h)).toBe("settle");
  });

  it("settles a long drag held still before lifting", () => {
    const { tr, end } = drag(100, 300);
    expect(releaseAction(100, tr.velocity(end + 500), h)).toBe("settle");
  });
});

describe("flingExit", () => {
  it("uses the exit token for slow releases", () => {
    expect(flingExit(300, 0.1)).toBeNull();
    expect(flingExit(0, 2)).toBeNull();
  });

  it("is faster for faster flings and stays within bounds", () => {
    const slow = flingExit(400, 0.6)!;
    const fast = flingExit(400, 4)!;
    expect(fast.duration).toBeLessThan(slow.duration);
    expect(slow.duration).toBeLessThanOrEqual(SHEET_MOTION.flingMaxMs);
    expect(fast.duration).toBeGreaterThanOrEqual(SHEET_MOTION.flingMinMs);
  });

  it("starts at the release speed", () => {
    const remaining = 400;
    const v = 2;
    const { duration, easing } = flingExit(remaining, v)!;
    const [x1, y1] = easing.match(/[\d.]+/g)!.map(Number);
    // Start slope of the curve, in px/ms.
    expect(((y1 / x1) * remaining) / duration).toBeCloseTo(v, 1);
  });
});

describe("scrimOpacity", () => {
  it("fades with the drag", () => {
    expect(scrimOpacity(0, 400)).toBe(1);
    expect(scrimOpacity(200, 400)).toBe(0.5);
    expect(scrimOpacity(800, 400)).toBe(0);
    expect(scrimOpacity(10, 0)).toBe(1);
  });
});

describe("springSamples (settle)", () => {
  it("ends at rest without overshoot", () => {
    const { duration, values } = springSamples(200, 0, 0, SHEET_MOTION.settleOmega);
    expect(duration).toBeGreaterThan(100);
    expect(duration).toBeLessThan(600);
    expect(values[0]).toBe(200);
    expect(values[values.length - 1]).toBe(0);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeLessThanOrEqual(values[i - 1]);
      expect(values[i]).toBeGreaterThanOrEqual(0);
    }
  });

  it("carries the release velocity", () => {
    // Still moving down at release: the sheet keeps going a little before coming back.
    const { values } = springSamples(100, 0, 1, SHEET_MOTION.settleOmega);
    expect(Math.max(...values)).toBeGreaterThan(100);
  });

  it("is a no-op at rest", () => {
    expect(springSamples(0, 0, 0, 0.03)).toEqual({ duration: 0, values: [0] });
  });
});
