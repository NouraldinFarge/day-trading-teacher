import { Link } from "@tanstack/react-router";
import { Check, ChevronRight } from "lucide-react";
import type { AppState } from "../domain/types";
import type { ResponsibleAction } from "../domain/workflow";
import { workflowSteps } from "../domain/workflow";

export function WorkflowRail({
  state,
  currentAction,
}: {
  state: AppState;
  currentAction: ResponsibleAction;
}) {
  return (
    <section
      className="workflow-rail"
      aria-label="Your responsible trading-learning loop"
    >
      <header>
        <div>
          <span className="eyebrow accent">Your process loop</span>
          <h2>One responsible action at a time</h2>
        </div>
        <p>Trading is never required to move forward.</p>
      </header>
      <div className="workflow-rail-steps">
        {workflowSteps(state).map((step, index) => {
          const current = step.id === currentAction.id;
          return (
            <Link
              key={step.id}
              to={step.to}
              className={`workflow-rail-step ${current ? "current" : ""} ${step.hasEvidence ? "has-evidence" : ""}`}
            >
              <span className="workflow-step-marker">
                {step.hasEvidence ? <Check size={15} /> : index + 1}
              </span>
              <span>
                <strong>{step.label}</strong>
                <small>{step.description}</small>
              </span>
              <em>
                {current
                  ? "Next"
                  : step.hasEvidence
                    ? "Evidence saved"
                    : "Available"}
              </em>
              <ChevronRight size={16} />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
