import type { Step, StepStatus } from "./types";
import { getStepTextClass } from "./utils";

export function ConnectionSteps({ steps }: { steps: Step[] }) {
  return (
    <div className="w-full space-y-2.5 text-left">
      {steps.map((step) => (
        <div
          key={step.id}
          className={`flex items-center gap-3 transition-opacity duration-200 ${
            step.status === "pending" ? "opacity-25" : "opacity-100"
          }`}
        >
          <StepIcon status={step.status} />
          <div className="min-w-0">
            <span className={`text-sm ${getStepTextClass(step.status)}`}>{step.label}</span>
            {step.detail && step.status !== "pending" && (
              <p className="text-(--t-text-muted) text-xs truncate">{step.detail}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "done") {
    return (
      <div className="w-5 h-5 rounded-full bg-(--t-status-connected)/15 text-(--t-status-connected) flex items-center justify-center shrink-0">
        <svg width="9" height="9" viewBox="0 0 10 8" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="1,4 4,7 9,1" />
        </svg>
      </div>
    );
  }
  if (status === "active") {
    return <div className="w-5 h-5 rounded-full border-2 border-(--t-accent)/30 border-t-(--t-accent) shrink-0 animate-spin" />;
  }
  if (status === "error") {
    return (
      <div className="w-5 h-5 rounded-full bg-(--t-status-error)/15 text-(--t-status-error) flex items-center justify-center shrink-0">
        <svg width="9" height="9" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="2">
          <line x1="2" y1="2" x2="8" y2="8" />
          <line x1="8" y1="2" x2="2" y2="8" />
        </svg>
      </div>
    );
  }
  return <div className="w-5 h-5 rounded-full border border-(--t-border)/50 shrink-0" />;
}
