import { Icon } from "@iconify/react";

const SIZES = {
  page: { wrap: "h-full min-h-[320px] gap-5", tile: "w-10 h-10 rounded-lg", icon: 20, button: "px-4 py-2 text-sm", plus: 14 },
  section: { wrap: "py-12 gap-3", tile: "w-9 h-9 rounded-lg", icon: 18, button: "px-3 py-1.5 text-xs", plus: 12 },
};

export interface EmptyStateAction { label: string; onClick: () => void; icon?: string }

export function EmptyState({ icon, title, body, action, primary, links, size = "page" }: {
  icon: string;
  title: string;
  body?: string;
  action?: EmptyStateAction | EmptyStateAction[];
  primary?: boolean;
  links?: { label: string; onClick: () => void; hint?: string }[];
  size?: keyof typeof SIZES;
}) {
  const s = SIZES[size];
  const actions = action ? [action].flat() : [];
  return (
    <div className={`col-span-full flex flex-col items-center justify-center text-center ${s.wrap}`}>
      <div className={`flex items-center justify-center bg-(--t-bg-toolbar) border border-(--t-border) ${s.tile}`}>
        <Icon icon={icon} width={s.icon} className="text-(--t-text-dim)" />
      </div>
      <div>
        <p className="text-sm font-medium text-(--t-text-primary)">{title}</p>
        {body && <p className="text-xs mt-1 max-w-88 text-(--t-text-dim)">{body}</p>}
      </div>
      {actions.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={a.onClick}
              className={`flex items-center gap-2 rounded-lg font-medium ${primary ? "btn btn-primary" : "btn btn-secondary"} ${s.button}`}
            >
              <Icon icon={a.icon ?? "lucide:plus"} width={s.plus} />
              {a.label}
            </button>
          ))}
        </div>
      )}
      {links && links.length > 0 && (
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          {links.map((l) => (
            <button key={l.label} type="button" onClick={l.onClick} className="flex items-center gap-1.5 text-xs text-(--t-text-secondary) hover:text-(--t-accent) transition-colors">
              {l.label}
              {l.hint && <kbd className="text-2xs px-1 rounded-sm border border-(--t-border) text-(--t-text-dim)">{l.hint}</kbd>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
