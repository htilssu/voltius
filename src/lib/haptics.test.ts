// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { HAPTIC_KINDS, haptic, toggleHaptic } from "./haptics";

type W = Window & { VoltiusHaptics?: { perform(kind: string): boolean }; __voltiusHaptics?: unknown };
const w = window as W;

afterEach(() => {
  delete w.VoltiusHaptics;
  delete w.__voltiusHaptics;
});

describe("haptic", () => {
  it("is a no-op without the native bridge (desktop / web)", () => {
    expect(haptic("key")).toBe(false);
    expect(w.__voltiusHaptics).toBeUndefined();
  });

  it("forwards the kind name to the bridge and counts the call", () => {
    const perform = vi.fn(() => true);
    w.VoltiusHaptics = { perform };
    expect(haptic("press")).toBe(true);
    expect(haptic("press")).toBe(true);
    expect(haptic("confirm")).toBe(true);
    expect(perform.mock.calls).toEqual([["press"], ["press"], ["confirm"]]);
    expect(w.__voltiusHaptics).toEqual({ count: 3, last: "confirm", byKind: { press: 2, confirm: 1 } });
  });

  it("reports a rejected or throwing bridge as false", () => {
    w.VoltiusHaptics = { perform: () => false };
    expect(haptic("tick")).toBe(false);
    w.VoltiusHaptics = { perform: () => { throw new Error("gone"); } };
    expect(haptic("tick")).toBe(false);
  });

  it("names only kinds the native side maps (Haptics.kt constantFor)", () => {
    expect([...HAPTIC_KINDS]).toEqual(["key", "tick", "press", "confirm", "reject", "gesture", "toggleOn", "toggleOff"]);
  });

  it("maps a switch's new value to toggleOn / toggleOff", () => {
    expect(toggleHaptic(true)).toBe("toggleOn");
    expect(toggleHaptic(false)).toBe("toggleOff");
  });
});
