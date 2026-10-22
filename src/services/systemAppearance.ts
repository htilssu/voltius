import { SYSTEM_COLORS_EVENT, useSystemColorsStore } from "@/services/androidSystemColors";

const QUERY = "(prefers-color-scheme: dark)";

export function getSystemPrefersDark(): boolean {
  // Android: the shell reports the phone's night mode (the WebView's media query does not
  // follow a uiMode change the activity handles itself).
  const native = useSystemColorsStore.getState().dark;
  if (native !== null) return native;
  if (typeof matchMedia !== "function") return false;
  return matchMedia(QUERY).matches;
}

export function subscribeSystemAppearance(cb: () => void): () => void {
  const hasWindow = typeof window !== "undefined";
  if (hasWindow) window.addEventListener(SYSTEM_COLORS_EVENT, cb);
  const offNative = () => { if (hasWindow) window.removeEventListener(SYSTEM_COLORS_EVENT, cb); };
  if (typeof matchMedia !== "function") return offNative;
  const mql = matchMedia(QUERY);
  mql.addEventListener("change", cb);
  return () => {
    mql.removeEventListener("change", cb);
    offNative();
  };
}
