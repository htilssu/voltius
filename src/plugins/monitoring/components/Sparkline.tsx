import { useEffect, useRef } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";

interface SparklineProps {
  data: number[];
  color: string;
  height?: number;
}

export function Sparkline({ data, color, height = 38 }: SparklineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const uRef = useRef<uPlot | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  // Init / reinit when structural params change
  useEffect(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth || 268;

    uRef.current?.destroy();
    // Clear leftover DOM from previous uPlot instance
    containerRef.current.innerHTML = "";

    // uPlot paints on a canvas, which can't read CSS variables: resolve a `var(--t-…)`
    // token to its computed rgb() once per init, and derive the area fill from it.
    const stroke = resolveColor(color, containerRef.current);

    const d = dataRef.current;
    const xs = Array.from({ length: Math.max(d.length, 1) }, (_, i) => i);
    const ys = d.length ? d : [0];

    const opts: uPlot.Options = {
      width,
      height,
      cursor: { show: false },
      legend: { show: false },
      padding: [4, 0, 2, 0],
      axes: [{ show: false }, { show: false }],
      scales: {
        x: { time: false },
        y: {
          range: (_u, min, max) => {
            const pad = Math.max((max - min) * 0.1, 1);
            return [Math.max(0, min - pad), max + pad];
          },
        },
      },
      series: [
        {},
        {
          stroke,
          fill: withAlpha(stroke, 0.16),
          width: 1.5,
          spanGaps: true,
        },
      ],
    };

    uRef.current = new uPlot(opts, [xs, ys], containerRef.current);
    return () => {
      uRef.current?.destroy();
      uRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, color]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth > 0) uRef.current?.setSize({ width: el.clientWidth, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [height]);

  // Update data without recreating
  useEffect(() => {
    if (!uRef.current || !data.length) return;
    const xs = Array.from({ length: data.length }, (_, i) => i);
    uRef.current.setData([xs, data]);
  }, [data]);

  return <div ref={containerRef} style={{ width: "100%" }} />;
}

function resolveColor(color: string, host: HTMLElement): string {
  if (!color.startsWith("var(")) return color;
  const probe = document.createElement("span");
  probe.style.color = color;
  host.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved || color;
}

function withAlpha(color: string, alpha: number): string {
  const m = color.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const [r, g, b] = m[1].split(/[\s,/]+/);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (/^#[0-9a-f]{6}$/i.test(color)) return color + Math.round(alpha * 255).toString(16).padStart(2, "0");
  return color;
}
