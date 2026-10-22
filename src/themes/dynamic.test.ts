import { describe, expect, it } from "vitest";
import type { SystemPalettes } from "@/services/androidSystemColors";
import { contrastRatio, luminanceFromHex } from "@/utils/appearance";
import { BUILT_IN_THEMES } from "./presets";
import {
  ANSI_CHROMATIC,
  DYNAMIC_CONTRAST,
  DYNAMIC_THEME_ID,
  buildDynamicTheme,
  dynamicThemeFor,
  ensureContrast,
  harmonize,
  hueDistance,
  hueOf,
} from "./dynamic";

const TONES = [100, 99, 95, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0];

function hsl(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(v * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** A rough tonal palette: HSL lightness = tone. Good enough to exercise the mapping. */
const tonal = (h: number, s: number) => TONES.map((t) => hsl(h, s, t / 100));

function synthetic(hue: number, chroma = 0.6): SystemPalettes {
  return {
    a1: tonal(hue, chroma),
    a2: tonal(hue, chroma * 0.4),
    a3: tonal((hue + 60) % 360, chroma * 0.6),
    n1: tonal(hue, 0.06),
    n2: tonal(hue, 0.12),
  };
}

// Captured from the Android 16 emulator (system_palette B3261E and 1E6CB3, TONAL_SPOT).
const REAL: Record<string, SystemPalettes> = {
  "emulator B3261E": { a1: ["#ffffff", "#fffbff", "#ffedea", "#ffdad5", "#ffb4aa", "#ea9589", "#cc7b70", "#ad6258", "#904a42", "#73342c", "#561e18", "#3b0906", "#000000"], a2: ["#ffffff", "#fffbff", "#ffedea", "#ffdad5", "#e7bdb7", "#caa29c", "#ae8883", "#926f6a", "#775652", "#5d3f3b", "#442926", "#2c1512", "#000000"], a3: ["#ffffff", "#fffbff", "#ffefd4", "#fcdfa6", "#dfc38c", "#c2a873", "#a68e5b", "#8b7444", "#705c2e", "#574419", "#3e2e04", "#261a00", "#000000"], n1: ["#ffffff", "#fffbff", "#ffedea", "#f1dedc", "#d4c3c0", "#b8a8a5", "#9c8d8b", "#827472", "#685b5a", "#504442", "#392e2c", "#231918", "#000000"], n2: ["#ffffff", "#fffbff", "#ffedea", "#f5ddda", "#d8c2be", "#bba7a4", "#a08c89", "#857370", "#6b5a58", "#534341", "#3b2d2b", "#251917", "#000000"] },
  "emulator 1E6CB3": { a1: ["#ffffff", "#fdfcff", "#eaf1ff", "#d2e4ff", "#a2c9fe", "#87aee1", "#6c93c4", "#5279a9", "#38608f", "#1c4875", "#00325a", "#001c37", "#000000"], a2: ["#ffffff", "#fdfcff", "#eaf1ff", "#d7e3f8", "#bbc7db", "#a0acbf", "#8692a4", "#6c788a", "#535f70", "#3c4858", "#263141", "#101c2b", "#000000"], a3: ["#ffffff", "#fffbff", "#fcecff", "#f4d9ff", "#d8bde4", "#bba2c7", "#a088ac", "#856f91", "#6c5677", "#533f5f", "#3c2947", "#261431", "#000000"], n1: ["#ffffff", "#fdfcff", "#eff0f7", "#e1e2e8", "#c5c6cc", "#a9abb1", "#8e9196", "#75777d", "#5c5e64", "#44474c", "#2e3035", "#191c20", "#000000"], n2: ["#ffffff", "#fdfcff", "#edf1fa", "#dfe2eb", "#c3c6cf", "#a7abb4", "#8d9199", "#73777f", "#5a5f66", "#43474e", "#2c3137", "#181c22", "#000000"] },
};

const PALETTES: [string, SystemPalettes][] = [
  ...[0, 30, 55, 90, 140, 200, 230, 270, 320].map((h) => [`hue ${h}`, synthetic(h)] as [string, SystemPalettes]),
  ["vivid yellow", synthetic(58, 1)],
  ["grey", synthetic(0, 0)],
  ...Object.entries(REAL),
];

const base = BUILT_IN_THEMES[0];
const cr = (a: string, b: string) => contrastRatio(a.slice(0, 7), b.slice(0, 7)) ?? 0;
const HEX = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i;

describe.each(PALETTES)("Material You from %s", (_name, palette) => {
  describe.each(["dark", "light"] as const)("%s", (phase) => {
    const theme = buildDynamicTheme(palette, phase, base);
    const { ui, terminal } = theme;

    it("is the dynamic built-in theme with every colour a hex", () => {
      expect(theme.id).toBe(DYNAMIC_THEME_ID);
      expect(theme.builtIn).toBe(true);
      expect(theme.uiFontFamily).toBe(base.uiFontFamily);
      for (const v of [...Object.values(ui), ...Object.values(terminal)]) expect(v).toMatch(HEX);
    });

    it("reads as the requested appearance", () => {
      const lum = luminanceFromHex(ui.bgBase)!;
      if (phase === "dark") expect(lum).toBeLessThan(0.03);
      else expect(lum).toBeGreaterThan(0.8);
    });

    it("keeps text readable on the base and on cards / inputs", () => {
      for (const bg of [ui.bgBase, ui.bgCard, ui.bgInput, ui.bgModal]) {
        expect(cr(ui.textPrimary, bg)).toBeGreaterThanOrEqual(DYNAMIC_CONTRAST.textPrimary);
        expect(cr(ui.textSecondary, bg)).toBeGreaterThanOrEqual(DYNAMIC_CONTRAST.textSecondary);
        expect(cr(ui.textDim, bg)).toBeGreaterThanOrEqual(DYNAMIC_CONTRAST.textDim);
        expect(cr(ui.textMuted, bg)).toBeGreaterThanOrEqual(DYNAMIC_CONTRAST.textMuted);
      }
      expect(cr(ui.accent, ui.bgBase)).toBeGreaterThanOrEqual(DYNAMIC_CONTRAST.accent);
      expect(cr(ui.textNotice, ui.bgBase)).toBeGreaterThanOrEqual(DYNAMIC_CONTRAST.textSecondary);
    });

    it("surfaces step away from the base in the theme's direction", () => {
      const l = (c: string) => luminanceFromHex(c)!;
      if (phase === "dark") {
        expect(l(ui.bgCard)).toBeGreaterThan(l(ui.bgBase));
        expect(l(ui.bgElevated)).toBeGreaterThan(l(ui.bgCard));
      } else {
        expect(l(ui.bgCard)).toBeLessThan(l(ui.bgBase));
        expect(l(ui.bgElevated)).toBeLessThan(l(ui.bgCard));
      }
    });

    it("gives a readable terminal palette", () => {
      const bg = terminal.background;
      expect(bg).toBe(ui.bgTerminal);
      expect(cr(terminal.foreground, bg)).toBeGreaterThanOrEqual(DYNAMIC_CONTRAST.textPrimary);
      for (const n of ANSI_CHROMATIC) {
        const bright = `bright${n[0].toUpperCase()}${n.slice(1)}` as keyof typeof terminal;
        expect(cr(terminal[n], bg), n).toBeGreaterThanOrEqual(DYNAMIC_CONTRAST.ansi);
        expect(cr(terminal[bright]!, bg), bright).toBeGreaterThanOrEqual(DYNAMIC_CONTRAST.ansi);
      }
      expect(cr(terminal.brightBlack, bg)).toBeGreaterThanOrEqual(DYNAMIC_CONTRAST.brightBlack);
      // No ANSI colour vanishes into the background.
      for (const c of [terminal.black, terminal.white, terminal.brightWhite]) expect(cr(c, bg)).toBeGreaterThanOrEqual(DYNAMIC_CONTRAST.ansiFaint);
      // The "text" end of the greys contrasts most: white in dark, black in light.
      if (phase === "dark") expect(cr(terminal.brightWhite, bg)).toBeGreaterThan(12);
      else expect(cr(terminal.black, bg)).toBeGreaterThan(12);
    });

    it("keeps the six ANSI hues distinct", () => {
      const normals = ANSI_CHROMATIC.map((n) => terminal[n]);
      expect(new Set(normals).size).toBe(6);
      for (let i = 0; i < normals.length; i++)
        for (let j = i + 1; j < normals.length; j++)
          expect(hueDistance(hueOf(normals[i]), hueOf(normals[j])), `${ANSI_CHROMATIC[i]}/${ANSI_CHROMATIC[j]}`).toBeGreaterThanOrEqual(20);
    });
  });
});

describe("dynamic theme helpers", () => {
  it("harmonize pulls toward the source by at most 6°, never past it", () => {
    expect(harmonize(0, 90)).toBeCloseTo(6);
    expect(harmonize(0, 270)).toBeCloseTo(354);
    expect(harmonize(100, 104)).toBeCloseTo(102);
    expect(harmonize(50, 50)).toBeCloseTo(50);
  });

  it("ensureContrast leaves passing colours alone and fixes failing ones", () => {
    expect(ensureContrast("#ffffff", "#000000", 7)).toBe("#ffffff");
    const fixed = ensureContrast("#333344", "#101010", 4.5);
    expect(contrastRatio(fixed, "#101010")!).toBeGreaterThanOrEqual(4.5);
    const fixedLight = ensureContrast("#ccccdd", "#fafafa", 4.5);
    expect(contrastRatio(fixedLight, "#fafafa")!).toBeGreaterThanOrEqual(4.5);
  });

  it("dynamicThemeFor memoises on its inputs", () => {
    const p = synthetic(200);
    const a = dynamicThemeFor(p, "dark", base);
    expect(dynamicThemeFor(p, "dark", base)).toBe(a);
    expect(dynamicThemeFor(p, "light", base)).not.toBe(a);
  });

  it("differs between two wallpapers", () => {
    const a = buildDynamicTheme(synthetic(0), "dark", base);
    const b = buildDynamicTheme(synthetic(220), "dark", base);
    expect(a.ui.accent).not.toBe(b.ui.accent);
    expect(a.ui.bgBase).not.toBe(b.ui.bgBase);
  });
});
