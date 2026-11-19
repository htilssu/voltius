/** Pulsing row placeholders shown while a list's first load is in flight. */
export function SkeletonList({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-1.5 animate-pulse" aria-busy="true">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-[var(--r-lg)] bg-(--t-bg-card)">
          <div className="w-8 h-8 rounded-lg shrink-0 bg-(--t-bg-card-avatar)" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="h-3 rounded-md bg-(--t-bg-elevated)" style={{ width: `${45 + (i * 17) % 40}%` }} />
            <div className="h-2.5 rounded-md bg-(--t-bg-elevated)" style={{ width: `${55 + (i * 13) % 30}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
