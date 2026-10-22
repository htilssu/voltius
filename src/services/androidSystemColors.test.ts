// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseSystemColors, SYSTEM_COLORS_EVENT, useSystemColorsStore } from "./androidSystemColors";
import { getSystemPrefersDark, subscribeSystemAppearance } from "./systemAppearance";
import { useThemeStore } from "@/stores/themeStore";
import { DYNAMIC_THEME_ID } from "@/themes/dynamic";

/** 13 tones from white to black, `tint` added to blue. */
const tones = (tint: number) =>
  Array.from({ length: 13 }, (_, i) => {
    const v = Math.round(255 - (i * 255) / 12);
    const h = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
    return `#${h(v)}${h(v)}${h(v + tint)}`;
  });
const palette = { a1: tones(60), a2: tones(30), a3: tones(10), n1: tones(4), n2: tones(8) };

const push = (detail: unknown) => window.dispatchEvent(new CustomEvent(SYSTEM_COLORS_EVENT, { detail }));

describe("androidSystemColors", () => {
  beforeEach(() => {
    useSystemColorsStore.setState({ dark: null, palette: null });
    vi.unstubAllGlobals();
  });

  it("parses a valid push and rejects malformed palettes", () => {
    expect(parseSystemColors({ dark: true, palette })).toEqual({ dark: true, palette });
    expect(parseSystemColors({ dark: false, palette: null })).toEqual({ dark: false, palette: null });
    expect(parseSystemColors({ dark: "yes", palette: { ...palette, n2: palette.n2.map(() => "red") } })).toEqual({ dark: null, palette: null });
    expect(parseSystemColors({ palette: { ...palette, a1: palette.a1.slice(1) } }).palette).toBeNull();
    expect(parseSystemColors(undefined)).toEqual({ dark: null, palette: null });
  });

  it("the store follows the native event", () => {
    push({ dark: true, palette });
    expect(useSystemColorsStore.getState()).toMatchObject({ dark: true, palette });
    push({ dark: false, palette: null });
    expect(useSystemColorsStore.getState()).toMatchObject({ dark: false, palette: null });
  });

  it("system appearance prefers the native night mode and fires on its change", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }));
    expect(getSystemPrefersDark()).toBe(false);
    const cb = vi.fn();
    const off = subscribeSystemAppearance(cb);
    push({ dark: true, palette: null });
    expect(cb).toHaveBeenCalledTimes(1);
    expect(getSystemPrefersDark()).toBe(true);
    off();
    push({ dark: false, palette: null });
    expect(cb).toHaveBeenCalledTimes(1);
  });
});

describe("themeStore with Material You", () => {
  beforeEach(() => {
    useSystemColorsStore.setState({ dark: null, palette: null });
    useThemeStore.setState({ activeThemeId: DYNAMIC_THEME_ID, mode: "manual", resolvedPhase: "dark" });
  });

  it("falls back to the default theme of the phase where there is no palette (desktop)", () => {
    useSystemColorsStore.setState({ dark: true });
    expect(useThemeStore.getState().getActiveTheme().id).toBe("voltius");
    useSystemColorsStore.setState({ dark: false });
    expect(useThemeStore.getState().getActiveTheme().id).toBe("voltius-light");
    expect(useThemeStore.getState().getDynamicTheme()).toBeNull();
  });

  it("builds from the palette; manual mode follows the phone, automation follows the phase", () => {
    useSystemColorsStore.setState({ dark: false, palette });
    const light = useThemeStore.getState().getActiveTheme();
    expect(light.id).toBe(DYNAMIC_THEME_ID);
    useSystemColorsStore.setState({ dark: true, palette });
    const dark = useThemeStore.getState().getActiveTheme();
    expect(dark.ui.bgBase).not.toBe(light.ui.bgBase);

    useThemeStore.setState({ mode: "schedule", darkThemeId: DYNAMIC_THEME_ID, resolvedPhase: "dark" });
    useSystemColorsStore.setState({ dark: false, palette });
    expect(useThemeStore.getState().getActiveTheme().ui.bgBase).toBe(dark.ui.bgBase);
  });
});
