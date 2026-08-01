import { useMemo, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  Calculator,
  Check,
  CheckCircle2,
  ClipboardCopy,
  FileLock2,
  MonitorUp,
  NotebookPen,
  Plus,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { EmptyState } from "../../components/EmptyState";
import { LessonWorkspaceBanner } from "../../components/LessonWorkspaceBanner";
import { PageHeader } from "../../components/PageHeader";
import { dollars } from "../../domain/calculations";
import { readLessonWorkspaceContext } from "../../domain/lesson-session";
import {
  calculatePosition,
  launchFidelityTraderPlus,
} from "../../platform/bridge";
import { useAppState } from "../../state/AppStateContext";
import type {
  PositionSizeResult,
  TradePlan,
  TradeSide,
} from "../../domain/types";

const emptyForm = {
  symbol: "",
  side: "long" as TradeSide,
  setup: "",
  thesis: "",
  trigger: "",
  entry: "",
  stop: "",
  target: "",
  executionPlan: "",
  exitPlan: "",
  timeStop: "",
  maximumRisk: "",
  slippagePerUnit: "0.02",
  noTradeConditions: "",
};

export function PlanPage() {
  const { state, addPlan } = useAppState();
  const guidedByLesson = !state.profile.standaloneTools;
  const [lessonContext] = useState(() => readLessonWorkspaceContext("plan"));
  const [form, setForm] = useState({
    ...emptyForm,
    maximumRisk: state.profile.maxRiskPerTrade,
  });
  const [calculation, setCalculation] = useState<PositionSizeResult | null>(
    null,
  );
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(true);
  const [savedSymbol, setSavedSymbol] = useState("");
  const [copiedPlanId, setCopiedPlanId] = useState("");
  const [handoffMessage, setHandoffMessage] = useState("");
  const readiness = useMemo(() => {
    const checks = [
      Boolean(form.symbol.trim() && form.setup.trim()),
      Boolean(form.thesis.trim()),
      Boolean(form.trigger.trim()),
      Boolean(form.entry && form.stop && form.maximumRisk && calculation),
      Boolean(form.executionPlan.trim() && form.exitPlan.trim()),
      Boolean(form.noTradeConditions.trim()),
    ];
    const complete = checks.filter(Boolean).length;
    return {
      checks,
      complete,
      percent: Math.round((complete / checks.length) * 100),
    };
  }, [form, calculation]);

  const ticketChecklist = (plan: TradePlan) =>
    [
      "FIDELITY TRADER+ MANUAL TICKET CHECKLIST",
      `Symbol: ${plan.symbol}`,
      `Action: ${plan.side === "long" ? "Buy" : "Sell short"}`,
      `Quantity: ${plan.plannedQuantity} shares maximum`,
      `Planned entry: ${plan.entry}`,
      `Initial stop / invalidation: ${plan.stop}`,
      `Target: ${plan.target || "Not specified"}`,
      `Maximum planned risk: ${dollars(plan.plannedRisk)}`,
      `Setup: ${plan.setup}`,
      `Trigger: ${plan.trigger || "Not recorded"}`,
      `Execution behavior: ${plan.executionPlan || "Not recorded"}`,
      `Exit architecture: ${plan.exitPlan || "Not recorded"}`,
      `Time-based failure: ${plan.timeStop || "Not recorded"}`,
      `No-trade conditions: ${plan.noTradeConditions || "None recorded"}`,
      plan.sourceLessonTitle
        ? `Lesson source: ${plan.sourceLessonTitle}`
        : "Lesson source: Not linked",
      "",
      "Before submission: verify buying power, liquidity, order type, duration, symbol, side, and quantity in Fidelity. Keep preview and confirmation enabled. This checklist does not place an order.",
    ].join("\n");

  const copyHandoff = async (plan: TradePlan) => {
    setHandoffMessage("");
    try {
      await navigator.clipboard.writeText(ticketChecklist(plan));
      setCopiedPlanId(plan.id);
      window.setTimeout(() => setCopiedPlanId(""), 2200);
    } catch {
      setHandoffMessage(
        "The checklist could not be copied. Your saved plan is unchanged.",
      );
    }
  };

  const openFidelity = async () => {
    setHandoffMessage("");
    try {
      setHandoffMessage(await launchFidelityTraderPlus());
    } catch (reason) {
      setHandoffMessage(
        reason instanceof Error ? reason.message : String(reason),
      );
    }
  };

  const update = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSavedSymbol("");
    if (
      ["entry", "stop", "maximumRisk", "slippagePerUnit", "side"].includes(
        field,
      )
    )
      setCalculation(null);
  };

  const runCalculation = async () => {
    setError("");
    try {
      const result = await calculatePosition({
        entry: form.entry,
        stop: form.stop,
        maximum_risk: form.maximumRisk,
        slippage_per_unit: form.slippagePerUnit,
        side: form.side,
      });
      setCalculation(result);
      return result;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      setCalculation(null);
      return null;
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = calculation ?? (await runCalculation());
    if (!result) return;
    if (!form.symbol.trim() || !form.setup.trim()) {
      setError("Symbol and setup are required before saving a plan.");
      return;
    }
    const now = new Date().toISOString();
    const plan: TradePlan = {
      id: crypto.randomUUID(),
      symbol: form.symbol.trim().toUpperCase(),
      side: form.side,
      setup: form.setup.trim(),
      thesis: form.thesis.trim(),
      trigger: form.trigger.trim(),
      entry: form.entry,
      stop: form.stop,
      target: form.target,
      executionPlan: form.executionPlan.trim(),
      exitPlan: form.exitPlan.trim(),
      timeStop: form.timeStop.trim(),
      maximumRisk: form.maximumRisk,
      slippagePerUnit: form.slippagePerUnit,
      plannedQuantity: result.quantity,
      plannedRisk: result.planned_risk,
      noTradeConditions: form.noTradeConditions.trim(),
      sourceLessonId: lessonContext?.lessonId,
      sourceLessonTitle: lessonContext?.lessonTitle,
      createdAt: now,
      lockedAt: locked ? now : null,
    };
    addPlan(plan);
    setSavedSymbol(plan.symbol);
    setForm({ ...emptyForm, maximumRisk: state.profile.maxRiskPerTrade });
    setCalculation(null);
    setError("");
  };

  return (
    <div>
      <LessonWorkspaceBanner workspace="plan" />
      <PageHeader
        eyebrow={
          guidedByLesson
            ? "Lesson practice · Decision Card"
            : "Standalone pre-trade process"
        }
        title={
          guidedByLesson
            ? "Build an auditable decision card"
            : "Write the decision before the outcome"
        }
        description={
          guidedByLesson
            ? "Apply the eligibility, risk, and decision-planning lessons with observable evidence. Saving a locked card proves what was known before the outcome."
            : "Define the setup, invalidation, and maximum risk while the future is still unknown. Saving a locked plan preserves that evidence."
        }
      />
      <section className="two-column">
        <form className="card" onSubmit={(event) => void submit(event)}>
          <div className="card-header">
            <div>
              <h2>New trade plan</h2>
              <p>This is a planning exercise, not a trade recommendation.</p>
            </div>
            <NotebookPen size={20} className="muted" />
          </div>
          <div className="card-body">
            {savedSymbol ? (
              <div className="success-message reward-message" role="status">
                <span>
                  <CheckCircle2 size={16} /> {savedSymbol} plan saved and
                  timestamped.
                </span>
                <strong>
                  <Zap size={14} />
                  +30 process XP
                </strong>
                <Link to="/trades" className="button ghost">
                  Record completed trade
                </Link>
              </div>
            ) : null}
            <div
              className="plan-readiness-inline"
              aria-label={`Plan readiness: ${readiness.complete} of 6 decision areas complete`}
            >
              <div>
                <strong>{readiness.complete}/6 decision areas ready</strong>
                <span>{readiness.percent}%</span>
              </div>
              <div className="progress-bar">
                <span style={{ width: `${readiness.percent}%` }} />
              </div>
              <small>
                Complete setup, eligibility, trigger, risk, execution and exits,
                and no-trade conditions before saving.
              </small>
            </div>
            <div className="form-section-title">
              <span>1</span>
              <h3>Describe the setup</h3>
            </div>
            <div className="form-grid three">
              <div className="field">
                <label htmlFor="symbol">
                  Symbol <span className="muted">(required)</span>
                </label>
                <input
                  id="symbol"
                  required
                  autoComplete="off"
                  value={form.symbol}
                  onChange={(event) =>
                    update("symbol", event.target.value.toUpperCase())
                  }
                  placeholder="e.g. SPY"
                  maxLength={12}
                />
              </div>
              <div className="field">
                <label htmlFor="side">Side</label>
                <select
                  id="side"
                  value={form.side}
                  onChange={(event) => update("side", event.target.value)}
                >
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="setup">
                  Setup <span className="muted">(required)</span>
                </label>
                <input
                  id="setup"
                  required
                  value={form.setup}
                  onChange={(event) => update("setup", event.target.value)}
                  placeholder="Defined setup name"
                />
              </div>
              <div className="field full">
                <label htmlFor="thesis">
                  Eligibility evidence <span className="muted">(required)</span>
                </label>
                <textarea
                  id="thesis"
                  required
                  value={form.thesis}
                  onChange={(event) => update("thesis", event.target.value)}
                  placeholder="What observable trigger, structure, spread, and liquidity evidence makes this setup eligible?"
                />
                <small className="field-hint">
                  Describe what you can observe—not what you hope price will do.
                </small>
              </div>
              <div className="field full">
                <label htmlFor="trigger">
                  Objective trigger <span className="muted">(required)</span>
                </label>
                <textarea
                  id="trigger"
                  required
                  value={form.trigger}
                  onChange={(event) => update("trigger", event.target.value)}
                  placeholder="What exact, observable event permits the decision—and what evidence must still be present at that moment?"
                />
                <small className="field-hint">
                  A trigger is necessary, but every eligibility constraint must
                  still hold together.
                </small>
              </div>
            </div>

            <div className="form-section-title">
              <span>2</span>
              <h3>Set risk and invalidation</h3>
            </div>
            <div className="plan-calculator">
              <div className="record-topline">
                <div>
                  <span className="eyebrow">Deterministic sizing</span>
                  <h3>Risk calculator</h3>
                </div>
                <Calculator size={20} />
              </div>
              <div className="form-grid three section-gap">
                <div className="field">
                  <label htmlFor="entry">
                    Planned entry <span className="muted">(required)</span>
                  </label>
                  <input
                    id="entry"
                    required
                    inputMode="decimal"
                    value={form.entry}
                    onChange={(event) => update("entry", event.target.value)}
                    placeholder="32.40"
                  />
                </div>
                <div className="field">
                  <label htmlFor="stop">
                    Initial stop <span className="muted">(required)</span>
                  </label>
                  <input
                    id="stop"
                    required
                    inputMode="decimal"
                    value={form.stop}
                    onChange={(event) => update("stop", event.target.value)}
                    placeholder="32.12"
                  />
                </div>
                <div className="field">
                  <label htmlFor="target">Target</label>
                  <input
                    id="target"
                    inputMode="decimal"
                    value={form.target}
                    onChange={(event) => update("target", event.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="field">
                  <label htmlFor="max-risk">
                    Maximum risk <span className="muted">(required)</span>
                  </label>
                  <input
                    id="max-risk"
                    required
                    inputMode="decimal"
                    value={form.maximumRisk}
                    onChange={(event) =>
                      update("maximumRisk", event.target.value)
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="slippage">Slippage / share</label>
                  <input
                    id="slippage"
                    inputMode="decimal"
                    value={form.slippagePerUnit}
                    onChange={(event) =>
                      update("slippagePerUnit", event.target.value)
                    }
                  />
                  <small className="field-hint">
                    A conservative estimate, included in risk per share.
                  </small>
                </div>
                <div className="field" style={{ alignSelf: "end" }}>
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => void runCalculation()}
                  >
                    <Calculator size={15} />
                    Calculate size
                  </button>
                </div>
              </div>
              {calculation ? (
                <div className="calculation-result">
                  <div>
                    <span>Risk / share</span>
                    <strong>{dollars(calculation.risk_per_unit)}</strong>
                  </div>
                  <div>
                    <span>Maximum size</span>
                    <strong>{calculation.quantity} shares</strong>
                  </div>
                  <div>
                    <span>Planned risk</span>
                    <strong>{dollars(calculation.planned_risk)}</strong>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="form-section-title">
              <span>3</span>
              <h3>Plan execution and exits</h3>
            </div>
            <div className="form-grid two">
              <div className="field full">
                <label htmlFor="execution-plan">
                  Execution behavior <span className="muted">(required)</span>
                </label>
                <textarea
                  id="execution-plan"
                  required
                  value={form.executionPlan}
                  onChange={(event) =>
                    update("executionPlan", event.target.value)
                  }
                  placeholder="Order type, maximum acceptable price or spread, partial-fill response, and what happens if the order does not fill"
                />
              </div>
              <div className="field full">
                <label htmlFor="exit-plan">
                  Exit architecture <span className="muted">(required)</span>
                </label>
                <textarea
                  id="exit-plan"
                  required
                  value={form.exitPlan}
                  onChange={(event) => update("exitPlan", event.target.value)}
                  placeholder="How will you respond to strength, invalidation, stagnation, and partial exits?"
                />
              </div>
              <div className="field full">
                <label htmlFor="time-stop">Time-based failure</label>
                <input
                  id="time-stop"
                  value={form.timeStop}
                  onChange={(event) => update("timeStop", event.target.value)}
                  placeholder="Example: Exit or reassess if the trigger has not followed through within 5 bars"
                />
              </div>
            </div>

            <div className="form-section-title">
              <span>4</span>
              <h3>Commit before the outcome</h3>
            </div>
            <div className="field full">
              <label htmlFor="no-trade">
                No-trade and cancellation conditions{" "}
                <span className="muted">(required)</span>
              </label>
              <textarea
                id="no-trade"
                required
                value={form.noTradeConditions}
                onChange={(event) =>
                  update("noTradeConditions", event.target.value)
                }
                placeholder="When will you wait, skip the setup, or cancel the idea?"
              />
              <small className="field-hint">
                A no-trade result is a complete and successful planning
                decision.
              </small>
            </div>
            <div className="checkbox-row section-gap">
              <input
                id="lock-plan"
                type="checkbox"
                checked={locked}
                onChange={(event) => setLocked(event.target.checked)}
              />
              <label htmlFor="lock-plan">
                <strong>Lock this version when saved.</strong>
                <br />A later edit should create a new version instead of
                changing the pre-trade record.
              </label>
            </div>
            {error ? (
              <div className="error-message" role="alert">
                {error}
              </div>
            ) : null}
            <div className="form-actions">
              <button className="button primary" type="submit">
                <FileLock2 size={16} />
                Save {locked ? "locked " : ""}plan
              </button>
            </div>
          </div>
        </form>

        <aside className="stack">
          <article className="card plan-readiness-card">
            <div className="card-body">
              <span className="eyebrow accent">Before saving</span>
              <h2>Can another person audit the decision?</h2>
              <ul>
                <li className={readiness.checks[0] ? "ready" : ""}>
                  <Check size={15} />
                  Setup and symbol are named
                </li>
                <li className={readiness.checks[1] ? "ready" : ""}>
                  <Check size={15} />
                  Eligibility is observable
                </li>
                <li className={readiness.checks[2] ? "ready" : ""}>
                  <Check size={15} />
                  Trigger is objective and observable
                </li>
                <li className={readiness.checks[3] ? "ready" : ""}>
                  <Check size={15} />
                  Risk is calculated and rounded down
                </li>
                <li className={readiness.checks[4] ? "ready" : ""}>
                  <Check size={15} />
                  Execution and exit failure modes are written
                </li>
                <li className={readiness.checks[5] ? "ready" : ""}>
                  <Check size={15} />
                  Wait and no-trade conditions are written
                </li>
              </ul>
            </div>
          </article>
          <div className="callout">
            <ShieldCheck size={18} />
            <p>
              Position size is rounded down. Buying power, liquidity, broker
              restrictions, and concentration limits may require a smaller
              quantity.
            </p>
          </div>
          <article className="card">
            <div className="card-header">
              <div>
                <h2>Saved plans</h2>
                <p>
                  {state.plans.length} timestamped{" "}
                  {state.plans.length === 1 ? "record" : "records"}
                </p>
              </div>
              <Plus size={19} className="muted" />
            </div>
            <div className="card-body">
              {state.plans.length === 0 ? (
                <EmptyState
                  icon={<NotebookPen size={22} />}
                  title="No plans yet"
                  body="Your first saved plan will appear here with its calculation and timestamp."
                />
              ) : (
                <div className="record-list">
                  {state.plans.slice(0, 6).map((plan) => (
                    <article className="record-card" key={plan.id}>
                      <div className="record-topline">
                        <div className="record-title">
                          <strong>{plan.symbol}</strong>
                          <span className="side-marker">{plan.side}</span>
                        </div>
                        {plan.lockedAt ? (
                          <span className="badge badge-strong">Locked</span>
                        ) : (
                          <span className="badge badge-partial">Draft</span>
                        )}
                      </div>
                      <p>
                        {plan.setup} · Entry {plan.entry} · Stop {plan.stop}
                      </p>
                      {plan.sourceLessonTitle ? (
                        <small className="plan-lesson-source">
                          Lesson evidence · {plan.sourceLessonTitle}
                        </small>
                      ) : null}
                      <div className="record-stats">
                        <div>
                          <span>Size</span>
                          <strong>{plan.plannedQuantity}</strong>
                        </div>
                        <div>
                          <span>Risk</span>
                          <strong>{dollars(plan.plannedRisk)}</strong>
                        </div>
                        <div>
                          <span>Created</span>
                          <strong>
                            {new Date(plan.createdAt).toLocaleDateString()}
                          </strong>
                        </div>
                        <div>
                          <span>Target</span>
                          <strong>{plan.target || "—"}</strong>
                        </div>
                      </div>
                      <div className="handoff-actions">
                        <button
                          className="button secondary compact"
                          type="button"
                          onClick={() => void copyHandoff(plan)}
                        >
                          {copiedPlanId === plan.id ? (
                            <Check size={15} />
                          ) : (
                            <ClipboardCopy size={15} />
                          )}
                          {copiedPlanId === plan.id
                            ? "Copied"
                            : "Copy Trader+ ticket"}
                        </button>
                        <button
                          className="button ghost compact"
                          type="button"
                          onClick={() => void openFidelity()}
                        >
                          <MonitorUp size={15} />
                          Open Trader+
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {handoffMessage ? (
                <div className="callout section-gap" role="status">
                  <ShieldCheck size={17} />
                  <p>{handoffMessage}</p>
                </div>
              ) : null}
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}
