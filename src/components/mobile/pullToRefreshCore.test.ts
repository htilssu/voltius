import { describe, test, expect } from "vitest";
import { PULL_MOTION } from "@/lib/motion";
import { claimDrag } from "./sheets/sheetDrag";
import { pullOffset, pullProgress, pullRelease, spinDone } from "./pullToRefreshCore";

const { thresholdPx, maxPx, minSpinMs } = PULL_MOTION;

describe("pull to refresh", () => {
  test("offset is resisted, monotonic and capped at maxPx", () => {
    expect(pullOffset(-20)).toBe(0);
    expect(pullOffset(0)).toBe(0);
    expect(pullOffset(50)).toBeLessThan(50);
    expect(pullOffset(100)).toBeGreaterThan(pullOffset(50));
    expect(pullOffset(10_000)).toBeLessThanOrEqual(maxPx);
    expect(pullOffset(10_000)).toBeGreaterThan(maxPx - 1);
  });

  test("progress reaches 1 at the threshold and stays there", () => {
    expect(pullProgress(0)).toBe(0);
    expect(pullProgress(thresholdPx / 2)).toBeCloseTo(0.5);
    expect(pullProgress(thresholdPx)).toBe(1);
    expect(pullProgress(maxPx)).toBe(1);
  });

  test("release refreshes only past the threshold", () => {
    expect(pullRelease(thresholdPx - 1)).toBe("cancel");
    expect(pullRelease(thresholdPx)).toBe("refresh");
    // A short drag never reaches it; a long one does (the threshold sits below maxPx).
    expect(pullRelease(pullOffset(40))).toBe("cancel");
    expect(pullRelease(pullOffset(400))).toBe("refresh");
    expect(thresholdPx).toBeLessThan(maxPx);
  });

  test("only a downward vertical move at the top of the list claims the pull", () => {
    expect(claimDrag(0, 4, { anyDirection: false, scrollTop: 0 })).toBe("wait");
    expect(claimDrag(0, 20, { anyDirection: false, scrollTop: 0 })).toBe("drag");
    expect(claimDrag(0, 20, { anyDirection: false, scrollTop: 30 })).toBe("pass");
    expect(claimDrag(0, -20, { anyDirection: false, scrollTop: 0 })).toBe("pass");
    expect(claimDrag(30, 20, { anyDirection: false, scrollTop: 0 })).toBe("pass");
  });

  test("the spinner leaves once the reload is over and minSpinMs has passed", () => {
    expect(spinDone(true, 0, minSpinMs * 2)).toBe(false);
    expect(spinDone(false, 0, minSpinMs - 1)).toBe(false);
    expect(spinDone(false, 0, minSpinMs)).toBe(true);
  });
});
