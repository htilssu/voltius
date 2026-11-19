export default function MobileSectionHeading({ label, danger }: { label: string; danger?: boolean }) {
  return (
    <h2 className="px-4 pt-4 pb-2 text-sm font-medium" style={{ color: danger ? "var(--t-status-error)" : "var(--t-accent)" }}>
      {label}
    </h2>
  );
}
