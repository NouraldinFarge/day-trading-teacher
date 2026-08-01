import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpenCheck,
  Calculator,
  CandlestickChart,
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  Shield,
  Target,
} from "lucide-react";
import { MetricCard } from "../../components/MetricCard";
import { MissionBoard } from "../../components/EngagementPanel";
import { WorkflowRail } from "../../components/WorkflowRail";
import { builtInLessons } from "../../domain/builtin-lessons";
import { dollars } from "../../domain/calculations";
import {
  nextResponsibleAction,
  pendingReflections,
  reviewedTradeCount,
} from "../../domain/workflow";
import { useAppState } from "../../state/AppStateContext";

export function TodayPage() {
  const { state } = useAppState();
  const completed = builtInLessons.filter((lesson) =>
    state.progress.completedLessonIds.includes(lesson.lesson_id),
  ).length;
  const pendingReviews = pendingReflections(state);
  const reviewed = reviewedTradeCount(state);
  const nextReview = pendingReviews[0];
  const nextLesson =
    builtInLessons.find(
      (lesson) => !state.progress.completedLessonIds.includes(lesson.lesson_id),
    ) ?? builtInLessons[0];
  const responsibleAction = nextResponsibleAction(state, builtInLessons);
  const secondaryAction =
    responsibleAction.id === "learn"
      ? { to: "/plan" as const, label: "Write a plan" }
      : { to: "/learn" as const, label: "Continue learning" };

  return (
    <div>
      <section className="hero-card">
        <div className="hero-copy">
          <span className="eyebrow">{responsibleAction.eyebrow}</span>
          <h1>{responsibleAction.title}</h1>
          <p>{responsibleAction.description}</p>
          <div className="hero-actions">
            <Link to={responsibleAction.to} className="button primary">
              <BookOpenCheck size={17} />
              {responsibleAction.cta}
            </Link>
            <Link to={secondaryAction.to} className="button secondary">
              {secondaryAction.label}
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="risk-orbit">
            <span className="risk-core">
              <Target size={29} />
            </span>
            <span className="orbit-label one">Plan first</span>
            <span className="orbit-label two">Control risk</span>
            <span className="orbit-label three">Review facts</span>
          </div>
        </div>
      </section>

      <section className="metrics-grid" aria-label="Learning overview">
        <MetricCard
          label="Core lessons practiced"
          value={`${completed}/${builtInLessons.length}`}
          note="Completion is not retained mastery"
          icon={<CheckCircle2 size={19} />}
        />
        <MetricCard
          label="Plans written"
          value={`${state.plans.length}`}
          note="Timestamped before action"
          icon={<ClipboardCheck size={19} />}
        />
        <MetricCard
          label="Journal reflections"
          value={`${reviewed}/${state.trades.length}`}
          note={
            pendingReviews.length
              ? `${pendingReviews.length} still need context`
              : "Process separated from outcome"
          }
          icon={<Gauge size={19} />}
          tone="positive"
        />
        <MetricCard
          label="Risk per trade"
          value={dollars(state.profile.maxRiskPerTrade)}
          note="Your current maximum"
          icon={<Shield size={19} />}
          tone="warning"
        />
      </section>

      <WorkflowRail state={state} currentAction={responsibleAction} />

      <MissionBoard state={state} />

      <section className="two-column section-gap">
        <article className="card">
          <div className="card-header">
            <div>
              <h2>Your next steps</h2>
              <p>
                Choose one; there is no requirement to complete the whole list
                today.
              </p>
            </div>
            <span className="badge badge-adequate">
              {state.profile.studyMinutes} min study budget
            </span>
          </div>
          <div className="card-body task-list">
            <div className="task-row">
              <span className="task-icon">
                <BookOpenCheck size={18} />
              </span>
              <div className="task-copy">
                <strong>{nextLesson.title}</strong>
                <small>
                  {nextLesson.estimated_minutes} minutes · available when you
                  are ready
                </small>
              </div>
              <Link to="/learn" className="button ghost">
                Open
                <ArrowRight size={14} />
              </Link>
            </div>
            <div className="task-row">
              <span className="task-icon">
                <Calculator size={18} />
              </span>
              <div className="task-copy">
                <strong>Position-size retrieval</strong>
                <small>Entry $32.40 · stop $32.12 · risk $28</small>
              </div>
              <Link to="/learn" className="button ghost">
                Practice
                <ArrowRight size={14} />
              </Link>
            </div>
            <div className="task-row">
              <span className="task-icon">
                <ClipboardCheck size={18} />
              </span>
              <div className="task-copy">
                <strong>
                  {nextReview
                    ? `Reflect on ${nextReview.symbol}`
                    : state.trades.length
                      ? "Review a completed reflection"
                      : "Capture your first completed trade"}
                </strong>
                <small>
                  {nextReview
                    ? "Add the missing decision context before pattern analysis"
                    : state.trades.length
                      ? "Retrieve one lesson without hindsight"
                      : "Manual entry or a Fidelity export is enough to begin"}
                </small>
              </div>
              <Link to="/trades" className="button ghost">
                {nextReview
                  ? "Reflect"
                  : state.trades.length
                    ? "Open"
                    : "Record trade"}
                <ArrowRight size={14} />
              </Link>
            </div>
            <div className="task-row">
              <span className="task-icon">
                <CandlestickChart size={18} />
              </span>
              <div className="task-copy">
                <strong>
                  {state.marketDataSets?.length
                    ? "Replay decisions on the chart"
                    : "Open the chart lab"}
                </strong>
                <small>
                  {state.marketDataSets?.length
                    ? `${state.marketDataSets.length} local historical ${state.marketDataSets.length === 1 ? "dataset" : "datasets"} ready${state.chartAcquisition?.subscriptions.length ? ` · ${state.chartAcquisition.subscriptions.length} provider-bound refresh series` : ""}`
                    : "Connect free daily or one-minute charts, import OHLCV bars, or use the guided sample"}
                </small>
              </div>
              <Link to="/chart" className="button ghost">
                Explore
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </article>

        <aside className="stack">
          <article className="card">
            <div className="card-header">
              <div>
                <h2>Risk guardrails</h2>
                <p>Visible before the session</p>
              </div>
            </div>
            <div className="card-body">
              <div className="risk-rule">
                <span>Maximum risk per trade</span>
                <strong>{dollars(state.profile.maxRiskPerTrade)}</strong>
              </div>
              <div className="risk-rule">
                <span>Daily loss limit</span>
                <strong>{dollars(state.profile.dailyLossLimit)}</strong>
              </div>
              <div className="risk-rule">
                <span>Account mode</span>
                <strong style={{ textTransform: "capitalize" }}>
                  {state.profile.accountType}
                </strong>
              </div>
            </div>
          </article>
          <div className="callout">
            <Shield size={18} />
            <p>
              This app will never tell you what security to buy or sell. It
              helps you plan, calculate, review, and practice.
            </p>
          </div>
          {pendingReviews.length > 0 ? (
            <div className="callout warning">
              <Gauge size={18} />
              <p>
                {pendingReviews.length} completed{" "}
                {pendingReviews.length === 1 ? "trade needs" : "trades need"}{" "}
                reflection. This is context to preserve—not pressure to trade
                again.
              </p>
            </div>
          ) : null}
        </aside>
      </section>
    </div>
  );
}
