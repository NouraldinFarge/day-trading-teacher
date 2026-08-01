import { useMemo, useState, type CSSProperties } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";

const checks = [
  {
    id: "setup",
    label: "The setup is named and belongs to the written playbook.",
    required: true,
  },
  {
    id: "eligibility",
    label: "Eligibility conditions can be observed before entry.",
    required: true,
  },
  {
    id: "trigger",
    label: "The entry trigger is specific enough for another person to verify.",
    required: true,
  },
  {
    id: "invalidation",
    label: "Invalidation comes from the thesis, not the preferred quantity.",
    required: true,
  },
  {
    id: "risk",
    label: "Quantity rounds down inside both per-trade and daily limits.",
    required: true,
  },
  {
    id: "no-trade",
    label: "At least one observable condition explicitly cancels the plan.",
    required: true,
  },
  {
    id: "review",
    label: "The plan states what evidence will be captured afterward.",
    required: false,
  },
] as const;

export function PlanQualityCoach({ onPractice }: { onPractice(): void }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [reviewed, setReviewed] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const completed = checks.filter((item) => checked[item.id]).length;
  const missingRequired = useMemo(
    () => checks.filter((item) => item.required && !checked[item.id]),
    [checked],
  );
  const coverage = Math.round((completed / checks.length) * 100);

  const review = () => {
    setReviewed(true);
    if (!recorded) {
      onPractice();
      setRecorded(true);
    }
  };

  const reset = () => {
    setChecked({});
    setReviewed(false);
    setRecorded(false);
  };

  return (
    <section aria-labelledby="plan-coach-title" className="learning-tool-panel">
      <header className="tool-panel-header">
        <span className="tool-panel-icon">
          <ClipboardCheck size={21} />
        </span>
        <div>
          <span className="eyebrow accent">Plan quality coach</span>
          <h2 id="plan-coach-title">Find the gap before the outcome</h2>
          <p>
            Audit a draft plan by evidence coverage. Checking every box does not
            predict success; it only shows whether the decision was defined.
          </p>
        </div>
      </header>

      <div className="plan-coach-grid">
        <div className="quality-checklist">
          {checks.map((item) => (
            <label key={item.id}>
              <input
                type="checkbox"
                checked={Boolean(checked[item.id])}
                onChange={(event) => {
                  setChecked((current) => ({
                    ...current,
                    [item.id]: event.target.checked,
                  }));
                  setReviewed(false);
                  setRecorded(false);
                }}
              />
              <span>
                {item.label}
                {item.required ? (
                  <small>Core evidence</small>
                ) : (
                  <small>Review support</small>
                )}
              </span>
            </label>
          ))}
        </div>
        <aside className="quality-meter" aria-live="polite">
          <div
            className="quality-ring"
            style={{ "--quality-progress": `${coverage}%` } as CSSProperties}
          >
            <strong>{coverage}%</strong>
          </div>
          <div>
            <span className="eyebrow">Worksheet coverage</span>
            <h3>
              {completed} of {checks.length} areas defined
            </h3>
            <p>
              Review the gaps without changing criteria to justify an action
              already desired.
            </p>
          </div>
          <button
            className="button primary"
            type="button"
            disabled={completed === 0}
            onClick={review}
          >
            <ClipboardCheck size={16} />
            Review this draft
          </button>
          <button className="text-button" type="button" onClick={reset}>
            <RotateCcw size={15} />
            Reset worksheet
          </button>
        </aside>
      </div>

      {reviewed ? (
        <div
          className={`scenario-feedback ${missingRequired.length ? "reconsider" : "aligned"}`}
          role="status"
        >
          <span>
            {missingRequired.length ? (
              <ShieldAlert size={19} />
            ) : (
              <CheckCircle2 size={19} />
            )}
          </span>
          <div>
            <strong>
              {missingRequired.length
                ? `${missingRequired.length} core ${missingRequired.length === 1 ? "gap remains" : "gaps remain"}`
                : "The core decision evidence is defined"}
            </strong>
            <p>
              {missingRequired.length
                ? missingRequired.map((item) => item.label).join(" ")
                : "Move to the formal Plan page only if the example is eligible. Complete coverage is not a reason to trade."}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
