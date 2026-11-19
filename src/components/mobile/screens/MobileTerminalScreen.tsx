import { useTranslation } from "react-i18next";
import { useSessionStore } from "@/stores/sessionStore";
import { useMobileNavStore } from "@/stores/mobileNavStore";
import MobileTerminalTopBar from "../MobileTerminalTopBar";
import { MobileButton } from "../MobileButton";
import { MobileEmptyState } from "../MobileEmptyState";

/** Chrome around the (separately mounted) session layer: persistent top bar or empty state. */
export default function MobileTerminalScreen() {
  const { t } = useTranslation();
  const hasSessions = useSessionStore((s) => s.sessions.some((x) => x.type !== "multiplayer"));
  const setTab = useMobileNavStore((s) => s.setTab);

  if (!hasSessions) {
    return (
      <MobileEmptyState icon="lucide:square-terminal" title={t("mobile.terminalScreen.noActiveSessions")}>
        <MobileButton data-mobile-pick-host onClick={() => setTab("hosts")}>
          {t("mobile.terminalScreen.pickHost")}
        </MobileButton>
      </MobileEmptyState>
    );
  }

  return <MobileTerminalTopBar />;
}
