import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import type { Folder } from "@/types";

/** Home / A / B breadcrumb. onNavigate(-1) = root; onNavigate(i) = that path index. */
export default function MobileFolderBreadcrumb({
  path, onNavigate,
}: { path: Folder[]; onNavigate: (index: number) => void }) {
  const { t } = useTranslation();
  if (path.length === 0) return null;
  return (
    <div className="flex items-center gap-1 px-4 h-12 text-xs text-(--t-text-dim) overflow-x-auto scrollbar-none shrink-0" data-folder-breadcrumb>
      <button className="vt-hit shrink-0 self-stretch active:text-(--t-text-primary)" onClick={() => onNavigate(-1)}>{t("mobile.folders.home")}</button>
      {path.map((f, i) => (
        <span key={f.id} className="flex items-center gap-1 shrink-0">
          <Icon icon="lucide:chevron-right" width={12} />
          <button
            className={`vt-hit self-stretch ${i === path.length - 1 ? "text-(--t-text-primary) font-medium" : "active:text-(--t-text-primary)"}`}
            onClick={() => onNavigate(i)}
          >
            {f.name}
          </button>
        </span>
      ))}
    </div>
  );
}
