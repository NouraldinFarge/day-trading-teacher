import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BookOpenCheck,
  Check,
  ChevronDown,
  CirclePause,
  Eye,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  createDailySession,
  dailySessionStats,
  findDailySessionForDate,
  readinessAnswerCount,
  readinessComplete,
  readinessHasConcern,
  stopReasonMessage,
} from "../domain/daily-session";
import type {
  DailySession,
  DailySessionReadiness,
  DailySessionStatus,
  DailySessionStopReason,
} from "../domain/types";
import { useAppState } from "../state/AppStateContext";

const readinessItems: Array<{
  key: keyof DailySessionReadiness;
  title: string;
  detail: string;
}> = [
  {
    key: "rested",
    title: "Rested enough to make deliberate decisions",
    detail: "If not, study and review still count as useful work.",
  },
  {
    key: "emotionallySteady",
    title: "Emotionally steady",
    detail: "No urge to chase, recover a loss, or prove an outcome.",
  },
  {
    key: "focused",
    title: "Focused for the planned practice window",
    detail: "Distractions and time pressure are under control.",
  },
  {
    key: "platformReady",
    title: "Chart data and replay workspace checked",
    detail: "The simulator is ready; this never checks or controls Fidelity.",
  },
  {
    key: "willingToTakeNoTrade",
    title: "Willing to finish with no trade",
    detail: "Selection quality matters more than activity.",
  },
];

const statusLabels: Record<DailySessionStatus, string> = {
  planned: "Planning",
  active: "Guard active",
  review_only: "Review only",
  no_trade: "No-trade decision",
  closed: "Complete",
};

function dollars(value: number) {
  return `${value < 0 ? "−" : ""}$${Math.abs(value).toFixed(2)}`;
}

function clampInteger(value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) return minimum;
  return Math.max(minimum, Math.min(maximum, Math.round(value)));
}

export function DailySessionGuard() {
  const { state, upsertDailySession } = useAppState();
  const session = findDailySessionForDate(state.dailySessions);
  const [expanded, setExpanded] = useState(session?.status === "planned");
  const stats = useMemo(
    () =>
      session
        ? dailySessionStats(session, state.paperTradingSessions ?? [])
        : null,
    [session, state.paperTradingSessions],
  );

  const save = (current: DailySession, changes: Partial<DailySession>) => {
    upsertDailySession({
      ...current,
      ...changes,
      updatedAt: new Date().toISOString(),
    });
  };

  const createPlan = () => {
    const created = createDailySession(state.profile);
    upsertDailySession(created);
    setExpanded(true);
  };

  const finish = (
    status: Exclude<DailySessionStatus, "planned" | "active">,
    reason: DailySessionStopReason,
    note?: string,
  ) => {
    if (!session) return;
    const timestamp = new Date().toISOString();
    save(session, {
      status,
      stopReason: reason,
      stopNote: note ?? stopReasonMessage(reason),
      endedAt: timestamp,
    });
    setExpanded(false);
  };

  if (!session) {
    return (
      <section
        className="daily-guard daily-guard-empty"
        aria-labelledby="daily-guard-title"
      >
        <div className="daily-guard-symbol" aria-hidden="true">
          <ShieldCheck size={24} />
        </div>
        <div>
          <span className="eyebrow accent">Before chart practice</span>
          <h2 id="daily-guard-title">Set today’s Session Guard</h2>
          <p>
            Check readiness, name the setup gate, and decide the stopping rules
            before an outcome can influence them. A no-trade day is a valid
            completed decision.
          </p>
        </div>
        <button className="button primary" type="button" onClick={createPlan}>
          Set today’s guard
        </button>
      </section>
    );
  }

  const answered = readinessAnswerCount(session.readiness);
  const readyComplete = readinessComplete(session.readiness);
  const hasConcern = readinessHasConcern(session.readiness);
  const canBegin =
    readyComplete &&
    !hasConcern &&
    session.marketContext !== "not_assessed" &&
    session.setupQuality === "a_quality";
  const incompleteReason = !readyComplete
    ? `Answer all ${readinessItems.length} readiness checks.`
    : hasConcern
      ? "A readiness concern points to study-only work today."
      : session.marketContext === "not_assessed"
        ? "Assess the market context before beginning."
        : session.setupQuality !== "a_quality"
          ? "Only an eligible A-quality setup opens guarded practice."
          : "";
  const hasOpenPaperRisk =
    (stats?.openPositions ?? 0) > 0 || (stats?.pendingOpeningOrders ?? 0) > 0;

  if (session.status !== "planned") {
    const positiveRestraint =
      session.status === "no_trade" || session.status === "review_only";
    return (
      <section
        className={`daily-guard daily-guard-summary ${session.status}`}
        aria-labelledby="daily-guard-title"
      >
        <div className="daily-guard-summary-heading">
          <span className="daily-guard-symbol" aria-hidden="true">
            {positiveRestraint ? (
              <CirclePause size={23} />
            ) : (
              <ShieldCheck size={23} />
            )}
          </span>
          <div>
            <span className="eyebrow accent">Today’s Session Guard</span>
            <h2 id="daily-guard-title">{statusLabels[session.status]}</h2>
            <p>
              {session.stopNote ||
                (session.status === "active"
                  ? "Your preset boundaries are monitoring local paper practice."
                  : "The planned practice loop is complete.")}
            </p>
          </div>
          <span className={`daily-guard-status ${session.status}`}>
            {session.status === "active" ? (
              <ShieldCheck size={13} />
            ) : (
              <Check size={13} />
            )}
            {statusLabels[session.status]}
          </span>
        </div>

        <div
          className="daily-guard-metrics"
          aria-label="Session Guard progress"
        >
          <span>
            <small>Paper decisions</small>
            <strong>
              {stats?.closedTrades ?? 0} / {session.maxPaperTrades}
            </strong>
          </span>
          <span>
            <small>Consecutive losses</small>
            <strong>
              {stats?.consecutiveLosses ?? 0} / {session.maxConsecutiveLosses}
            </strong>
          </span>
          <span>
            <small>Practice P&amp;L</small>
            <strong>{dollars(stats?.realizedPnl ?? 0)}</strong>
          </span>
          <span>
            <small>Loss boundary</small>
            <strong>{dollars(session.dailyLossLimit)}</strong>
          </span>
        </div>

        <div className="daily-guard-summary-actions">
          <Link to="/chart" className="button secondary">
            {session.status === "active" ? (
              <Sparkles size={16} />
            ) : (
              <Eye size={16} />
            )}
            {session.status === "active"
              ? "Open guarded chart practice"
              : "Open chart for review"}
          </Link>
          {session.status === "active" ? (
            <>
              {(stats?.closedTrades ?? 0) === 0 && !hasOpenPaperRisk ? (
                <button
                  className="button ghost"
                  type="button"
                  onClick={() =>
                    finish(
                      "no_trade",
                      "no_eligible_setup",
                      "Practice ended with no trade. Selection discipline is complete work.",
                    )
                  }
                >
                  Record no-trade finish
                </button>
              ) : null}
              <button
                className="button ghost"
                type="button"
                disabled={hasOpenPaperRisk}
                title={
                  hasOpenPaperRisk
                    ? "Close the open paper position or stop new entries first."
                    : ""
                }
                onClick={() => finish("closed", "session_complete")}
              >
                Finish planned session
              </button>
              <button
                className="button danger"
                type="button"
                onClick={() => finish("review_only", "manual_stop")}
              >
                Stop new entries
              </button>
            </>
          ) : (
            <Link to="/learn" className="button ghost">
              <BookOpenCheck size={16} />
              Continue learning
            </Link>
          )}
        </div>
        <small className="daily-guard-safety-note">
          This boundary applies only to the app’s local paper simulator. It
          never sends instructions to Fidelity or another broker.
        </small>
      </section>
    );
  }

  return (
    <section
      className="daily-guard daily-guard-planning"
      aria-labelledby="daily-guard-title"
    >
      <button
        className="daily-guard-toggle"
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
      >
        <span className="daily-guard-symbol" aria-hidden="true">
          <ShieldCheck size={23} />
        </span>
        <span>
          <small>Today’s Session Guard</small>
          <strong id="daily-guard-title">Prepare before practice</strong>
          <em>
            {answered} of {readinessItems.length} readiness checks answered
          </em>
        </span>
        <ChevronDown size={18} className={expanded ? "open" : ""} />
      </button>

      {expanded ? (
        <div className="daily-guard-editor">
          <div className="daily-guard-intro">
            <div>
              <span className="eyebrow accent">Step 1 · Readiness</span>
              <h3>Can I practice deliberately today?</h3>
              <p>
                An honest concern does not fail the day. It changes the next
                action from execution practice to learning and review.
              </p>
            </div>
            <span>
              {answered}/{readinessItems.length}
            </span>
          </div>

          <div className="daily-readiness-list">
            {readinessItems.map((item) => (
              <div className="daily-readiness-row" key={item.key}>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </div>
                <div className="daily-readiness-choice" aria-label={item.title}>
                  <button
                    type="button"
                    className={
                      session.readiness[item.key] === true
                        ? "yes active"
                        : "yes"
                    }
                    aria-pressed={session.readiness[item.key] === true}
                    onClick={() =>
                      save(session, {
                        readiness: { ...session.readiness, [item.key]: true },
                      })
                    }
                  >
                    Ready
                  </button>
                  <button
                    type="button"
                    className={
                      session.readiness[item.key] === false
                        ? "concern active"
                        : "concern"
                    }
                    aria-pressed={session.readiness[item.key] === false}
                    onClick={() =>
                      save(session, {
                        readiness: { ...session.readiness, [item.key]: false },
                      })
                    }
                  >
                    Concern
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="daily-guard-plan-grid">
            <div className="daily-guard-plan-block">
              <span className="eyebrow accent">Step 2 · Eligibility</span>
              <h3>Name what the evidence supports</h3>
              <label>
                <span>Market context</span>
                <select
                  value={session.marketContext}
                  onChange={(event) =>
                    save(session, {
                      marketContext: event.target
                        .value as DailySession["marketContext"],
                    })
                  }
                >
                  <option value="not_assessed">Not assessed yet</option>
                  <option value="favorable">
                    Favorable for my practiced setup
                  </option>
                  <option value="mixed">Mixed / selective</option>
                  <option value="unclear">Unclear · wait or review</option>
                </select>
              </label>
              <fieldset>
                <legend>Best visible setup</legend>
                <div className="daily-guard-choice-grid">
                  {(
                    [
                      ["a_quality", "A-quality"],
                      ["not_present", "Not present"],
                      ["unclear", "Unclear"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={session.setupQuality === value ? "active" : ""}
                      aria-pressed={session.setupQuality === value}
                      onClick={() => save(session, { setupQuality: value })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label>
                <span>
                  Brief context note <small>optional</small>
                </span>
                <textarea
                  rows={3}
                  maxLength={800}
                  value={session.contextNote}
                  placeholder="What evidence makes this eligible, mixed, or a no-trade?"
                  onChange={(event) =>
                    save(session, { contextNote: event.target.value })
                  }
                />
              </label>
            </div>

            <div className="daily-guard-plan-block">
              <span className="eyebrow accent">Step 3 · Stop rules</span>
              <h3>Set limits before the first result</h3>
              <div className="daily-limit-grid">
                <label>
                  <span>Maximum paper trades</span>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={session.maxPaperTrades}
                    onChange={(event) =>
                      save(session, {
                        maxPaperTrades: clampInteger(
                          Number(event.target.value),
                          1,
                          20,
                        ),
                      })
                    }
                  />
                  <small>Review-only after this many closed decisions.</small>
                </label>
                <label>
                  <span>Consecutive-loss stop</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={session.maxConsecutiveLosses}
                    onChange={(event) =>
                      save(session, {
                        maxConsecutiveLosses: clampInteger(
                          Number(event.target.value),
                          1,
                          10,
                        ),
                      })
                    }
                  />
                  <small>Switch to review instead of trying to recover.</small>
                </label>
                <label>
                  <span>Practice-loss boundary</span>
                  <div className="daily-money-input">
                    <span>$</span>
                    <input
                      aria-label="Daily simulated loss boundary"
                      type="number"
                      min="1"
                      max="1000000"
                      step="1"
                      value={session.dailyLossLimit}
                      onChange={(event) =>
                        save(session, {
                          dailyLossLimit: Math.max(
                            1,
                            Number(event.target.value) || 1,
                          ),
                        })
                      }
                    />
                  </div>
                  <small>Local simulation only; it cannot lock a broker.</small>
                </label>
              </div>
            </div>
          </div>

          <div className="daily-guard-start-bar" aria-live="polite">
            <div>
              <strong>
                {canBegin ? "Guard ready" : "One more decision before practice"}
              </strong>
              <span>
                {canBegin
                  ? "Limits will be enforced across today’s linked paper sessions."
                  : incompleteReason}
              </span>
            </div>
            <div>
              <button
                className="button ghost"
                type="button"
                onClick={() =>
                  finish(
                    "no_trade",
                    "no_eligible_setup",
                    "No eligible setup was present. The no-trade decision completed today’s process.",
                  )
                }
              >
                Record no-trade day
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={!readyComplete}
                onClick={() =>
                  finish(
                    "review_only",
                    hasConcern ? "readiness_concern" : "no_eligible_setup",
                  )
                }
              >
                Choose study only
              </button>
              <button
                className="button primary"
                type="button"
                disabled={!canBegin}
                title={canBegin ? "" : incompleteReason}
                onClick={() => {
                  const timestamp = new Date().toISOString();
                  save(session, {
                    status: "active",
                    stopReason: null,
                    stopNote: "",
                    startedAt: timestamp,
                    endedAt: null,
                  });
                  setExpanded(false);
                }}
              >
                <ShieldCheck size={16} />
                Begin guarded practice
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
