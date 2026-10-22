import { describe, expect, test } from "vitest";
import {
  adjacentSessionId, claimSwipeAxis, inEdgeZone, sessionSwipeStep, switchDirection,
  SWIPE_EDGE_PX, SWIPE_FLING_PX_PER_MS,
} from "./sessionSwipeCore";

const W = 412;

describe("claimSwipeAxis", () => {
  test("undecided inside the slop", () => {
    expect(claimSwipeAxis(5, 5)).toBeNull();
  });
  test("clearly sideways is a session swipe", () => {
    expect(claimSwipeAxis(-30, 4)).toBe("x");
    expect(claimSwipeAxis(20, -10)).toBe("x");
  });
  test("vertical or diagonal stays the scrollback scroll", () => {
    expect(claimSwipeAxis(2, 30)).toBe("y");
    expect(claimSwipeAxis(20, 18)).toBe("y");
  });
});

describe("inEdgeZone", () => {
  test("the system back-gesture strips are excluded", () => {
    expect(inEdgeZone(SWIPE_EDGE_PX - 1, W)).toBe(true);
    expect(inEdgeZone(W - SWIPE_EDGE_PX + 1, W)).toBe(true);
    expect(inEdgeZone(W / 2, W)).toBe(false);
  });
});

describe("sessionSwipeStep", () => {
  test("a long drag left goes to the next session, right to the previous", () => {
    expect(sessionSwipeStep(-W * 0.3, 0, W)).toBe(1);
    expect(sessionSwipeStep(W * 0.3, 0, W)).toBe(-1);
  });
  test("a short slow drag snaps back", () => {
    expect(sessionSwipeStep(-60, -0.1, W)).toBe(0);
  });
  test("a short fast fling switches", () => {
    expect(sessionSwipeStep(-50, -SWIPE_FLING_PX_PER_MS, W)).toBe(1);
    expect(sessionSwipeStep(50, SWIPE_FLING_PX_PER_MS * 2, W)).toBe(-1);
  });
  test("a fling against the drag, or a tiny flick, does not", () => {
    expect(sessionSwipeStep(-50, 1, W)).toBe(0);
    expect(sessionSwipeStep(-20, -2, W)).toBe(0);
  });
});

describe("adjacentSessionId / switchDirection", () => {
  const ids = ["a", "b", "c"];
  test("steps without wrapping", () => {
    expect(adjacentSessionId(ids, "b", 1)).toBe("c");
    expect(adjacentSessionId(ids, "b", -1)).toBe("a");
    expect(adjacentSessionId(ids, "c", 1)).toBeNull();
    expect(adjacentSessionId(ids, "a", -1)).toBeNull();
    expect(adjacentSessionId(ids, "a", 0)).toBeNull();
    expect(adjacentSessionId(ids, "zz", 1)).toBeNull();
  });
  test("direction follows the chip order", () => {
    expect(switchDirection(ids, "a", "c")).toBe(1);
    expect(switchDirection(ids, "c", "b")).toBe(-1);
    expect(switchDirection(ids, "a", "a")).toBe(0);
    expect(switchDirection(ids, null, "a")).toBe(0);
    expect(switchDirection(ids, "gone", "a")).toBe(0);
  });
});
