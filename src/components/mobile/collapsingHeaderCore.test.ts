import { describe, expect, it } from "vitest";
import { FAB_SCROLL_THRESHOLD, fabExtended, foldProgress } from "./collapsingHeaderCore";

describe("foldProgress", () => {
  it("maps scrollTop over the large title height to 0–1", () => {
    expect(foldProgress(0, 80)).toBe(0);
    expect(foldProgress(40, 80)).toBe(0.5);
    expect(foldProgress(200, 80)).toBe(1);
    expect(foldProgress(-10, 80)).toBe(0);
  });
  it("an unmeasured title folds as soon as anything scrolled", () => {
    expect(foldProgress(0, 0)).toBe(0);
    expect(foldProgress(3, 0)).toBe(1);
  });
});

describe("fabExtended", () => {
  it("shrinks on a scroll down, grows on a scroll up, ignores jitter", () => {
    expect(fabExtended(true, 300, FAB_SCROLL_THRESHOLD + 1)).toBe(false);
    expect(fabExtended(false, 300, -(FAB_SCROLL_THRESHOLD + 1))).toBe(true);
    expect(fabExtended(false, 300, 3)).toBe(false);
    expect(fabExtended(true, 300, -3)).toBe(true);
  });
  it("is always extended at the top", () => {
    expect(fabExtended(false, 0, 50)).toBe(true);
  });
});
