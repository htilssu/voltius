import { useEffect, useRef, useState, type RefObject } from "react";
import { animate, PULL_MOTION } from "@/lib/motion";
import { haptic } from "@/lib/haptics";
import { claimDrag } from "./sheets/sheetDrag";
import { pullOffset, pullProgress, pullRelease, spinDone } from "./pullToRefreshCore";

export type PullPhase = "idle" | "pulling" | "refreshing";

/** Indicator size (M3: 40 dp disc) and its arc circumference (r = 8.5 in a 24 box). */
const SIZE = 40;
const ARC = 2 * Math.PI * 8.5;

/**
 * M3 pull to refresh on a scroll container: a downward drag that starts at scrollTop 0
 * pulls the circular indicator down; released past the threshold it calls `onRefresh`
 * (haptic "gesture") and spins until `busy` goes false. Touch listeners are native and
 * non-passive so the pull can cancel the browser scroll. Render `<PullIndicator>` with the
 * returned ref in a positioned box over (not inside) the scroller.
 */
export function usePullToRefresh(
  scrollRef: RefObject<HTMLElement | null>,
  { enabled, busy, onRefresh }: { enabled: boolean; busy: boolean; onRefresh: () => void },
) {
  const indicatorRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<PullPhase>("idle");
  const phaseRef = useRef<PullPhase>("idle");
  phaseRef.current = phase;
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;
  const startedAt = useRef(0);
  const offsetRef = useRef(0);

  const pose = (offset: number) => {
    offsetRef.current = offset;
    const el = indicatorRef.current;
    if (!el) return;
    const p = pullProgress(offset);
    el.style.transform = poseTransform(offset, p);
    el.style.opacity = String(offset > 0 ? Math.min(1, p * 1.5) : 0);
    const arc = el.querySelector("circle");
    if (arc) arc.style.strokeDasharray = `${(0.1 + 0.7 * p) * ARC} ${ARC}`;
  };
  const glide = (to: number, m: { duration: "short4" | "medium1"; easing: "standardAccelerate" | "emphasizedDecelerate" }) => {
    const el = indicatorRef.current;
    const from = offsetRef.current;
    pose(to);
    if (el && from !== to) animate(el, [{ transform: poseTransform(from, pullProgress(from)) }, { transform: el.style.transform }], m.duration, m.easing);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !enabled) return;
    let start: { x: number; y: number } | null = null;
    let claim: "wait" | "drag" | "pass" = "pass";
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (phaseRef.current === "refreshing" || !t || e.touches.length > 1 || el.scrollTop > 0) { claim = "pass"; return; }
      start = { x: t.clientX, y: t.clientY };
      claim = "wait";
    };
    const onMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (claim === "pass" || !t || !start) return;
      const dx = t.clientX - start.x, dy = t.clientY - start.y;
      if (claim === "wait") {
        claim = claimDrag(dx, dy, { anyDirection: false, scrollTop: el.scrollTop });
        if (claim !== "drag") return;
        start = { x: t.clientX, y: t.clientY }; // measure the pull from where it was claimed
        setPhase("pulling");
      }
      e.preventDefault();
      pose(pullOffset(t.clientY - start.y));
    };
    const onEnd = () => {
      if (claim !== "drag") { claim = "pass"; return; }
      claim = "pass";
      if (pullRelease(offsetRef.current) === "refresh") {
        haptic("gesture");
        startedAt.current = performance.now();
        setPhase("refreshing");
        glide(PULL_MOTION.restPx, PULL_MOTION.settle);
        refreshRef.current();
      } else {
        glide(0, PULL_MOTION.cancel);
        setPhase("idle");
      }
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [scrollRef, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Spinning: leave (shrink away) once the reload is over and minSpinMs has passed.
  useEffect(() => {
    if (phase !== "refreshing") return;
    const finish = () => {
      const el = indicatorRef.current;
      const done = () => { pose(0); setPhase("idle"); };
      if (!el) return done();
      const a = animate(el, [{ transform: el.style.transform }, { transform: `${el.style.transform} scale(0)` }], PULL_MOTION.exit.duration, PULL_MOTION.exit.easing);
      a.onfinish = done;
    };
    const left = PULL_MOTION.minSpinMs - (performance.now() - startedAt.current);
    if (spinDone(busy, startedAt.current, performance.now())) { finish(); return; }
    if (busy) return;
    const id = setTimeout(finish, Math.max(0, left));
    return () => clearTimeout(id);
  }, [phase, busy]); // eslint-disable-line react-hooks/exhaustive-deps

  return { indicatorRef, phase };
}

function poseTransform(offset: number, progress: number): string {
  return `translate(-50%, ${offset - SIZE}px) rotate(${Math.round(progress * 270)}deg)`;
}

/** The M3 circular indicator (40 dp tonal disc, accent arc). Spins while `phase` is "refreshing". */
export function PullIndicator({ phase, indicatorRef }: { phase: PullPhase; indicatorRef: RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={indicatorRef} data-mobile-pull={phase} aria-hidden
      className="absolute left-1/2 top-0 z-10 flex items-center justify-center rounded-full pointer-events-none"
      style={{
        width: SIZE, height: SIZE, opacity: 0, transform: poseTransform(0, 0),
        background: "var(--t-bg-elevated)", boxShadow: "0 1px 3px rgba(0,0,0,.3), 0 4px 8px rgba(0,0,0,.15)",
      }}>
      <svg width={24} height={24} viewBox="0 0 24 24" className={phase === "refreshing" ? "motion-safe:animate-spin" : undefined}>
        <circle cx={12} cy={12} r={8.5} fill="none" stroke="var(--t-accent)" strokeWidth={2.5} strokeLinecap="round"
          style={{ strokeDasharray: `${0.75 * ARC} ${ARC}` }} />
      </svg>
    </div>
  );
}
