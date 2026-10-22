/**
 * Row actions for assistive tech. Sighted touch users long-press the row (M3), so the
 * old trailing ⋮ is gone; this button stays in the accessibility tree only (sr-only):
 * TalkBack swipes onto it right after the row and a double-tap opens the same sheet.
 * TalkBack's double-tap-and-hold on the row itself also sends the long-press.
 */
export default function RowActionsButton({
  attr, value, label, name, onTap,
}: { attr: `data-${string}`; value: string; label: string; name: string; onTap: () => void }) {
  return (
    <button {...{ [attr]: value }} className="sr-only" aria-label={`${label}: ${name}`} aria-haspopup="menu" onClick={onTap} />
  );
}
