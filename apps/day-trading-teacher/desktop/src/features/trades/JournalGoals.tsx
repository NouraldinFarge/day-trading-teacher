import { useMemo, useState, type FormEvent } from "react";
import {
  Archive,
  CheckCircle2,
  Flag,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import {
  performanceMetrics,
  tradesInRange,
} from "../../domain/journal-analytics";
import type { JournalGoal, JournalGoalMetric, Trade } from "../../domain/types";

const goalOptions: Array<{
  metric: JournalGoalMetric;
  label: string;
  unit: string;
  suggested: number;
  description: string;
}> = [
  {
    metric: "reflection_rate",
    label: "Journal completion",
    unit: "%",
    suggested: 90,
    description: "Complete reflections for recorded trades.",
  },
  {
    metric: "plan_coverage",
    label: "Pre-trade plan coverage",
    unit: "%",
    suggested: 80,
    description: "Link executions to decisions written before entry.",
  },
  {
    metric: "rule_adherence",
    label: "Risk-rule adherence",
    unit: "%",
    suggested: 90,
    description: "Respect recorded invalidation and risk limits.",
  },
  {
    metric: "weekly_reflections",
    label: "Weekly reflections",
    unit: " reviews",
    suggested: 3,
    description: "Finish a small number of thoughtful reviews.",
  },
  {
    metric: "maximum_daily_loss",
    label: "Maximum daily loss",
    unit: " dollars",
    suggested: 75,
    description: "Keep recorded daily losses below a personal boundary.",
  },
  {
    metric: "focused_execution",
    label: "Focused execution",
    unit: "%",
    suggested: 80,
    description: "Record focus ratings of 4 or 5 before entry.",
  },
];

function goalValue(goal: JournalGoal, trades: Trade[]) {
  const periodTrades = tradesInRange(
    trades,
    goal.period === "weekly" ? "week" : "month",
  );
  const metrics = performanceMetrics(periodTrades);
  if (goal.metric === "reflection_rate") return metrics.reflectionRate;
  if (goal.metric === "plan_coverage") return metrics.planCoverage;
  if (goal.metric === "rule_adherence") return metrics.ruleAdherence;
  if (goal.metric === "weekly_reflections")
    return periodTrades.filter((trade) => trade.journal?.status === "reviewed")
      .length;
  if (goal.metric === "focused_execution") {
    const rated = periodTrades.filter((trade) => trade.journal?.focusRating);
    return rated.length
      ? (rated.filter((trade) => (trade.journal?.focusRating ?? 0) >= 4)
          .length /
          rated.length) *
          100
      : 0;
  }
  const dayLosses = new Map<string, number>();
  periodTrades.forEach((trade) => {
    const key = new Date(trade.occurredAt).toISOString().slice(0, 10);
    dayLosses.set(key, (dayLosses.get(key) ?? 0) + Number(trade.netPnl));
  });
  return Math.abs(Math.min(0, ...dayLosses.values()));
}

function hasGoalData(goal: JournalGoal, trades: Trade[]) {
  return (
    goal.metric !== "maximum_daily_loss" ||
    tradesInRange(trades, goal.period === "weekly" ? "week" : "month").length >
      0
  );
}

export function JournalGoals({
  trades,
  goals,
  onAdd,
  onUpdate,
}: {
  trades: Trade[];
  goals: JournalGoal[];
  onAdd(goal: JournalGoal): void;
  onUpdate(goal: JournalGoal): void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [metric, setMetric] = useState<JournalGoalMetric>("reflection_rate");
  const option = goalOptions.find((item) => item.metric === metric)!;
  const [target, setTarget] = useState(String(option.suggested));
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [formError, setFormError] = useState("");
  const active = goals.filter((goal) => !goal.archivedAt);
  const completed = useMemo(
    () =>
      active.filter((goal) => {
        const value = goalValue(goal, trades);
        return (
          hasGoalData(goal, trades) &&
          (goal.metric === "maximum_daily_loss"
            ? value <= goal.target
            : value >= goal.target)
        );
      }).length,
    [active, trades],
  );
  const chooseMetric = (value: JournalGoalMetric) => {
    setMetric(value);
    setTarget(
      String(goalOptions.find((item) => item.metric === value)!.suggested),
    );
    setFormError("");
  };
  const percentageMetric = [
    "reflection_rate",
    "plan_coverage",
    "rule_adherence",
    "focused_execution",
  ].includes(metric);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    const targetValue = Number(target);
    if (!Number.isFinite(targetValue) || targetValue <= 0)
      return setFormError("Enter a target greater than zero.");
    if (percentageMetric && targetValue > 100)
      return setFormError("Percentage targets cannot be greater than 100%.");
    if (active.some((goal) => goal.metric === metric && goal.period === period))
      return setFormError(
        `An active ${period} goal already tracks this behavior.`,
      );
    onAdd({
      id: crypto.randomUUID(),
      title: option.label,
      metric,
      target: targetValue,
      period,
      createdAt: new Date().toISOString(),
      archivedAt: null,
    });
    setShowForm(false);
  };

  return (
    <div className="journal-goals-page">
      <section className="goal-hero">
        <div>
          <span className="eyebrow accent">Process goals</span>
          <h2>Build behaviors you can control</h2>
          <p>
            Goals reward reflection, planning, and risk discipline. Trade count
            and profit are never quotas.
          </p>
        </div>
        <div className="goal-hero-progress">
          <span>
            <Target size={22} />
          </span>
          <div>
            <strong>
              {completed}/{active.length || 0}
            </strong>
            <small>current goals on track</small>
          </div>
        </div>
        <button
          className="button primary"
          type="button"
          onClick={() => {
            setFormError("");
            setShowForm((value) => !value);
          }}
        >
          <Plus size={16} />
          New process goal
        </button>
      </section>
      {showForm ? (
        <form className="card section-gap" onSubmit={submit} noValidate>
          <div className="card-header">
            <div>
              <h2>Create a process goal</h2>
              <p>
                Choose one behavior and a review period. You can archive it at
                any time.
              </p>
            </div>
            <Flag size={19} />
          </div>
          <div className="card-body">
            <div className="form-grid three">
              <div className="field">
                <label htmlFor="goal-metric">Behavior</label>
                <select
                  id="goal-metric"
                  value={metric}
                  onChange={(event) =>
                    chooseMetric(event.target.value as JournalGoalMetric)
                  }
                >
                  {goalOptions.map((item) => (
                    <option value={item.metric} key={item.metric}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <small className="field-hint">{option.description}</small>
              </div>
              <div className="field">
                <label htmlFor="goal-target">Target</label>
                <input
                  id="goal-target"
                  type="number"
                  min="0.01"
                  max={percentageMetric ? 100 : undefined}
                  step={metric === "weekly_reflections" ? 1 : 0.01}
                  value={target}
                  aria-describedby="goal-target-hint"
                  aria-invalid={Boolean(formError)}
                  onChange={(event) => {
                    setTarget(event.target.value);
                    setFormError("");
                  }}
                />
                <small id="goal-target-hint" className="field-hint">
                  {option.unit.trim()}
                </small>
              </div>
              <div className="field">
                <label htmlFor="goal-period">Review period</label>
                <select
                  id="goal-period"
                  value={period}
                  onChange={(event) => {
                    setPeriod(event.target.value as typeof period);
                    setFormError("");
                  }}
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
            {formError ? (
              <div className="error-message" role="alert">
                {formError}
              </div>
            ) : null}
            <div className="form-actions">
              <button
                className="button secondary"
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormError("");
                }}
              >
                Cancel
              </button>
              <button className="button primary" type="submit">
                <Flag size={16} />
                Create goal
              </button>
            </div>
          </div>
        </form>
      ) : null}
      {active.length ? (
        <div className="goal-grid section-gap">
          {active.map((goal) => {
            const value = goalValue(goal, trades);
            const hasData = hasGoalData(goal, trades);
            const lowerIsBetter = goal.metric === "maximum_daily_loss";
            const progress = hasData
              ? lowerIsBetter
                ? value <= goal.target
                  ? 100
                  : Math.max(0, (goal.target / value) * 100)
                : Math.min(100, (value / goal.target) * 100)
              : 0;
            const definition = goalOptions.find(
              (item) => item.metric === goal.metric,
            )!;
            return (
              <article
                className={`goal-card ${progress >= 100 ? "complete" : ""}`}
                key={goal.id}
              >
                <div className="goal-card-top">
                  <span>
                    {progress >= 100 ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <ShieldCheck size={18} />
                    )}
                  </span>
                  <div>
                    <small>{goal.period} goal</small>
                    <strong>{goal.title}</strong>
                  </div>
                  <button
                    className="icon-button"
                    aria-label={`Archive ${goal.title}`}
                    onClick={() =>
                      onUpdate({
                        ...goal,
                        archivedAt: new Date().toISOString(),
                      })
                    }
                  >
                    <Archive size={15} />
                  </button>
                </div>
                <p>{definition.description}</p>
                <div className="goal-values">
                  <strong>
                    {goal.metric.includes("rate") ||
                    goal.metric === "plan_coverage" ||
                    goal.metric === "rule_adherence" ||
                    goal.metric === "focused_execution"
                      ? `${value.toFixed(0)}%`
                      : goal.metric === "maximum_daily_loss"
                        ? `$${value.toFixed(2)}`
                        : value.toFixed(0)}
                  </strong>
                  <span>
                    of{" "}
                    {goal.metric.includes("rate") ||
                    goal.metric === "plan_coverage" ||
                    goal.metric === "rule_adherence" ||
                    goal.metric === "focused_execution"
                      ? `${goal.target}%`
                      : goal.metric === "maximum_daily_loss"
                        ? `$${goal.target}`
                        : goal.target}
                  </span>
                </div>
                <div className="progress-bar">
                  <span style={{ width: `${progress}%` }} />
                </div>
                <small>
                  {!hasData
                    ? "No trades recorded in this review period yet."
                    : progress >= 100
                      ? "On track—protect the process, do not increase activity."
                      : `${Math.round(progress)}% of the current process target`}
                </small>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card section-gap compact-empty large">
          <Sparkles size={28} />
          <strong>No active process goals</strong>
          <p>
            Start with journal completion or plan coverage. Avoid outcome and
            trade-count targets.
          </p>
          <button className="button primary" onClick={() => setShowForm(true)}>
            Create a goal
          </button>
        </div>
      )}
    </div>
  );
}
