import { Sparkline } from "./Sparkline";

interface MetricCardProps {
  label: string;
  value: string;
  color: string;
  history: number[];
  /** Mobile: a bordered card with a taller chart, instead of a divided panel row. */
  card?: boolean;
}

export function MetricCard({ label, value, color, history, card = false }: MetricCardProps) {
  return (
    <div className={card ? "rounded-lg border border-(--t-border) bg-(--t-bg-elevated) px-4 pt-3 pb-2" : "px-4 pt-3 pb-1 border-b border-(--t-border)"}>
      <div className={`flex items-baseline justify-between ${card ? "mb-1.5" : "mb-1"}`}>
        <span className="text-2xs font-semibold uppercase tracking-wider text-(--t-text-dim)">
          {label}
        </span>
        <span className={`${card ? "text-sm" : "text-xs"} font-mono font-semibold text-(--t-text-bright)`}>{value}</span>
      </div>
      <Sparkline data={history} color={color} height={card ? 48 : 36} />
    </div>
  );
}
