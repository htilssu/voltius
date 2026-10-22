import { useTranslation } from "react-i18next";
import MobileEditScreen, { useAutosaveExit } from "../MobileEditScreen";
import { RuleForm } from "@/components/port_forwarding/RuleForm";
import { useAllPortForwardingRules } from "@/hooks/useAllPortForwardingRules";
import { useBackInterceptor } from "@/hooks/useBackInterceptor";
import { useEditedItem } from "@/hooks/useEditedItem";
import { usePortForwardingStore } from "@/stores/portForwardingStore";
import type { PortForwardingRule, TunnelType } from "@/types";

/**
 * New / edit port-forwarding rule, over the Port forwarding page. Autosaves like the host
 * screen; a new rule's first valid pass creates it and the screen keeps editing that rule
 * (it used to close mid-typing on that first save). It is an overlay of the page, not a
 * stack page, so it takes the system Back itself.
 */
export default function MobileRuleEditScreen({ rule, tunnelType, onClose }: {
  rule: PortForwardingRule | null;
  tunnelType?: TunnelType;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const createRule = usePortForwardingStore((s) => s.createRule);
  const updateRule = usePortForwardingStore((s) => s.updateRule);
  const { editing, gone, onCreated } = useEditedItem(useAllPortForwardingRules(), rule?.id, onClose);
  const exit = useAutosaveExit();
  // Registered before the guard's own interceptor, so an incomplete rule still asks first.
  useBackInterceptor(true, onClose);

  return (
    <MobileEditScreen
      form="rule"
      title={editing ? t("portForwarding.ruleForm.editRule") : t("portForwarding.ruleForm.newRule")}
      onLeave={onClose}
      {...exit.screenProps}
    >
      <RuleForm
        hideChrome
        {...exit.formProps}
        // The rule it opened with, not the created one: RuleForm reloads its fields when the
        // rule id changes, which would drop what was typed while the create was in flight.
        rule={rule}
        initialTunnelType={tunnelType}
        onClose={onClose}
        onSave={async (data) => {
          if (gone) return;
          if (editing) await updateRule(editing.id, data);
          else onCreated(await createRule(data));
        }}
      />
    </MobileEditScreen>
  );
}
