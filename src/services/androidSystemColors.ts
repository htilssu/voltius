/**
 * The phone's light/dark mode and Material You (wallpaper) palettes, pushed by the Android shell
 * (`SystemColors.kt`) as `window.__voltiusSystemColors` + the `voltius:system-colors` event (D1).
 * Device-local and never persisted or synced: desktop (and Android < 12 for the palette) simply
 * has nothing here, and every consumer falls back.
 */
import { create } from "zustand";

/** 13 hex tones per palette, shades 0, 10, 50, 100 .. 1000 (tones 100, 99, 95, 90 .. 0). */
export type TonalPalette = string[];

export interface SystemPalettes {
  a1: TonalPalette;
  a2: TonalPalette;
  a3: TonalPalette;
  n1: TonalPalette;
  n2: TonalPalette;
}

export interface SystemColors {
  /** Phone night mode, null when no native shell reported it. */
  dark: boolean | null;
  /** Material You palettes, null when unavailable. */
  palette: SystemPalettes | null;
}

export const SYSTEM_COLORS_EVENT = "voltius:system-colors";
const KEYS = ["a1", "a2", "a3", "n1", "n2"] as const;
const HEX = /^#[0-9a-f]{6}$/i;

/** Validate whatever the shell pushed; anything malformed reads as "not available". */
export function parseSystemColors(raw: unknown): SystemColors {
  const r = (raw ?? {}) as { dark?: unknown; palette?: unknown };
  const dark = typeof r.dark === "boolean" ? r.dark : null;
  const p = r.palette as Record<string, unknown> | null | undefined;
  const ok =
    !!p && KEYS.every((k) => Array.isArray(p[k]) && (p[k] as unknown[]).length === 13 && (p[k] as unknown[]).every((c) => typeof c === "string" && HEX.test(c)));
  return { dark, palette: ok ? (p as unknown as SystemPalettes) : null };
}

type W = Window & { __voltiusSystemColors?: unknown };

export const useSystemColorsStore = create<SystemColors>(() =>
  typeof window === "undefined" ? { dark: null, palette: null } : parseSystemColors((window as W).__voltiusSystemColors),
);

if (typeof window !== "undefined") {
  window.addEventListener(SYSTEM_COLORS_EVENT, (e) => {
    useSystemColorsStore.setState(parseSystemColors((e as CustomEvent).detail));
  });
}
