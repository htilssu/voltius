import { useTranslation } from "react-i18next";
import { usePermissions } from "@/hooks/usePermission";
import type { AuditContext } from "@/services/auditContext";
import { EmptyState } from "@/components/shared/EmptyState";

interface Props {
  context: AuditContext | null;
  children: React.ReactNode;
}

export function AuditGate({ context, children }: Props) {
  const can = usePermissions();
  const { t } = useTranslation();

  if (!context) {
    return (
      <div className="flex-1 flex flex-col bg-(--t-bg-base)">
        <EmptyState
          icon="lucide:scroll-text"
          title={t("logs.gate.noVaultSelected.title")}
          body={t("logs.gate.noVaultSelected.description")}
        />
      </div>
    );
  }

  if (context.kind === "local") return <>{children}</>;

  if (!can("VIEW_AUDIT_LOG", context.teamId)) {
    return (
      <div className="flex-1 flex flex-col bg-(--t-bg-base)">
        <EmptyState
          icon="lucide:lock"
          title={t("logs.gate.restricted.title")}
          body={t("logs.gate.restricted.description")}
        />
      </div>
    );
  }

  return <>{children}</>;
}
