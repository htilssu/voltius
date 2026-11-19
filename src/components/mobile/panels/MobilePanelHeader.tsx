import { useMobileNavStore } from "@/stores/mobileNavStore";
import { MobileScreenHeader } from "../MobileScreenHeader";

/** Titled header for full-screen pushed panel pages: `MobileScreenHeader` whose back pops the nav stack by default. */
export default function MobilePanelHeader({ title, sessionName, right, onBack, hideBack }: {
  title: string;
  sessionName?: string;
  right?: React.ReactNode;
  onBack?: () => void;
  hideBack?: boolean;
}) {
  const pop = useMobileNavStore((s) => s.pop);
  return (
    <MobileScreenHeader title={title} subtitle={sessionName} onBack={hideBack ? undefined : (onBack ?? pop)}>
      {right && <span className="shrink-0">{right}</span>}
    </MobileScreenHeader>
  );
}
