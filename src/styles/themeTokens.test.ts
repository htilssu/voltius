import { describe, expect, it } from "vitest";


/**
 * Guards against referencing a `--t-*` theme variable that nothing defines.
 * An undefined var silently falls back (to its inline fallback, or to
 * inherit/initial), so the color stops following the theme without any error —
 * this exact bug shipped as `--t-text`, `--t-error`, `--t-danger`,
 * `--t-accent-rgb`, … Defined = set via `setProperty("--t-…")` in TS, or
 * declared as `--t-…:` in a stylesheet.
 */
// Vitest strips CSS imports (even ?raw) and the project has no Node types: read the file via a loose import.
const { readFileSync } = (await import(/* @vite-ignore */ "node:" + "fs")) as {
  readFileSync: (file: URL, encoding: "utf8") => string;
};
const globalsCss = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

const sources = import.meta.glob(
  ["/src/**/*.{ts,tsx}", "!/src/**/*.test.{ts,tsx}", "!/src/**/*.d.ts"],
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

describe("theme tokens", () => {
  it("every referenced --t-* variable is defined", () => {
    const defined = new Set<string>();
    const used = new Map<string, string>();
    for (const [file, text] of Object.entries({ ...sources, "/src/styles/globals.css": globalsCss })) {
      for (const m of text.matchAll(/setProperty\(\s*["'`](--t-[a-z0-9-]+)/g)) defined.add(m[1]);
      if (file.endsWith(".css")) for (const m of text.matchAll(/(--t-[a-z0-9-]+)\s*:/g)) defined.add(m[1]);
      for (const m of text.matchAll(/var\(\s*(--t-[a-z0-9-]+)(?![a-z0-9-]|\$)/g)) if (!used.has(m[1])) used.set(m[1], file);
      // Tailwind v4 shorthand: text-(--t-x), bg-(--t-x), …
      for (const m of text.matchAll(/-\((--t-[a-z0-9-]+)\)/g)) if (!used.has(m[1])) used.set(m[1], file);
    }
    const missing = [...used].filter(([name]) => !defined.has(name)).map(([n, f]) => `${n} (first in ${f})`);
    expect(missing).toEqual([]);
  });
});
