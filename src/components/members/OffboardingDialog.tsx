import { useState } from "react";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import type { TeamMember } from "@/services/teamService";
import { departConsequences, departMembers, type DepartMode } from "@/services/teamOffboarding";
import { memberLabel } from "@/services/memberLabel";
import { userFacingReason } from "@/services/errorReason";
import { Modal, ModalCard } from "@/components/shared/Modal";
import { statusSurface } from "@/components/shared/statusSurface";

interface OffboardingDialogProps {
  members: TeamMember[];
  teamId: string;
  mode: DepartMode;
  onClose: () => void;
  onDone?: () => void;
}

/**
 * The one confirmation for every departure — detail panel, context menu, bulk
 * selection and leave. Before this, the bulk path removed people with no
 * confirmation at all while the single path was two-step.
 */
export function OffboardingDialog({ members, teamId, mode, onClose, onDone }: OffboardingDialogProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const consequences = departConsequences(mode, members.map((m) => memberLabel(m)));

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await departMembers(teamId, members, { mode, onDone });
      onClose();
    } catch (e) {
      // runTeamAction's toast reports it too; the dialog stays so the user can retry or cancel.
      setError(userFacingReason(e));
    } finally {
      setBusy(false);
    }
  };
  const close = () => { if (!busy) onClose(); };

  return (
    <Modal onClose={close}>
      <ModalCard className="w-[min(24rem,calc(100vw-2rem))] p-6 space-y-5">
        <div className="flex items-start gap-3">
          <span
            className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
            style={statusSurface("error")}
          >
            <Icon icon={mode === "leave" ? "lucide:log-out" : "lucide:user-minus"} width={16} />
          </span>
          <h2 className="text-base font-semibold mt-1" style={{ color: "var(--t-text-primary)" }}>
            {consequences.title}
          </h2>
        </div>

        <ul className="space-y-2">
          {consequences.points.map((point) => (
            <li key={point} className="flex gap-2 text-xs" style={{ color: "var(--t-text-secondary)" }}>
              <Icon icon="lucide:minus" width={11} className="shrink-0 mt-0.5" />
              <span>{point}</span>
            </li>
          ))}
        </ul>

        {error && (
          <p role="alert" className="flex gap-2 px-3 py-2 rounded-lg text-xs" style={statusSurface("error")}>
            <Icon icon="lucide:circle-alert" width={13} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={close} disabled={busy} className="btn btn-secondary px-3 py-2 rounded-lg text-xs font-medium">
            {t("settings.shared.cancel")}
          </button>
          <button
            onClick={() => void confirm()}
            disabled={busy}
            className="btn btn-danger flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
          >
            {busy && <Icon icon="lucide:loader-circle" width={12} className="animate-spin" />}
            {consequences.confirmLabel}
          </button>
        </div>
      </ModalCard>
    </Modal>
  );
}
