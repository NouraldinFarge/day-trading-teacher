import {
  BrainCircuit,
  ChevronRight,
  ClipboardCheck,
  Compass,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import { MetricCard } from "../../components/MetricCard";
import { ActivityCalendar } from "../../components/LearningActivity";
import { PageHeader } from "../../components/PageHeader";
import { builtInLessons } from "../../domain/builtin-lessons";
import { useAppState } from "../../state/AppStateContext";
import { evaluateAchievements } from "../../domain/achievements";
import { nextResponsibleAction } from "../../domain/workflow";

function percentage(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

export function ProgressPage() {
  const { state } = useAppState();
  const achievements = evaluateAchievements(state);
  const unlockedAchievements = achievements.filter(
    (achievement) => achievement.unlocked,
  );
  const nextAchievement = achievements
    .filter(
      (achievement) =>
        !achievement.unlocked &&
        !achievement.hidden &&
        achievement.category !== "Profitability",
    )
    .sort((a, b) => b.progress - a.progress)[0];
  const scored = state.trades.filter(
    (trade) => trade.review.processScore !== null,
  );
  const averageProcess = scored.length
    ? Math.round(
        scored.reduce(
          (sum, trade) => sum + (trade.review.processScore ?? 0),
          0,
        ) / scored.length,
      )
    : 0;
  const planCoverage = percentage(
    state.trades.filter((trade) => trade.planId).length,
    state.trades.length,
  );
  const riskEvidence = state.trades.filter(
    (trade) => trade.planId || trade.journal?.postTradeChecklist,
  );
  const riskDiscipline = percentage(
    riskEvidence.filter((trade) => trade.respectedStop).length,
    riskEvidence.length,
  );
  const currentLessonIds = new Set(
    [
      ...builtInLessons,
      ...state.customLessonPlans.flatMap((plan) => plan.lessons),
    ].map((lesson) => lesson.lesson_id),
  );
  const currentLessonsCompleted = state.progress.completedLessonIds.filter(
    (lessonId) => currentLessonIds.has(lessonId),
  ).length;
  const lessonProgress = percentage(
    currentLessonsCompleted,
    currentLessonIds.size,
  );
  const dimensions = [
    {
      label: "Planning evidence",
      value: state.trades.length ? planCoverage : null,
      note: "Completed trades linked to a pre-trade plan",
    },
    {
      label: "Risk discipline",
      value: riskEvidence.length ? riskDiscipline : null,
      note: "Trades with recorded stop or invalidation evidence",
    },
    {
      label: "Process quality",
      value: scored.length ? averageProcess : null,
      note: "Average across scorable reviews",
    },
    {
      label: "Lesson practice",
      value: lessonProgress,
      note: "Lessons with a completed practice check",
    },
  ];
  const nextAction = nextResponsibleAction(state, builtInLessons);

  return (
    <div>
      <PageHeader
        eyebrow="Evidence over streaks"
        title="Progress without trading pressure"
        description="The dashboard leads with planning, risk, and learning evidence. P&L does not determine whether a decision process was strong."
        actions={
          <Link to="/achievements" className="button secondary">
            View achievement vault
          </Link>
        }
      />
      <Link to={nextAction.to} className="progress-next-step">
        <span className="progress-next-icon">
          <Sparkles size={21} />
        </span>
        <span>
          <small>Recommended next step</small>
          <strong>{nextAction.title}</strong>
          <em>{nextAction.description}</em>
        </span>
        <span className="progress-next-cta">
          {nextAction.cta}
          <ChevronRight size={17} />
        </span>
      </Link>
      <section className="metrics-grid">
        <MetricCard
          label="Plan coverage"
          value={state.trades.length ? `${planCoverage}%` : "—"}
          note={
            state.trades.length
              ? `${state.trades.filter((trade) => trade.planId).length} linked trades`
              : "Add a completed trade"
          }
          icon={<ClipboardCheck size={19} />}
        />
        <MetricCard
          label="Risk discipline"
          value={riskEvidence.length ? `${riskDiscipline}%` : "—"}
          note={
            riskEvidence.length
              ? `${riskEvidence.length} trade${riskEvidence.length === 1 ? "" : "s"} with risk evidence`
              : "Not enough evidence"
          }
          icon={<ShieldCheck size={19} />}
          tone="warning"
        />
        <MetricCard
          label="Process score"
          value={scored.length ? `${averageProcess}` : "—"}
          note={`${scored.length} scorable reviews`}
          icon={<Compass size={19} />}
          tone="positive"
        />
        <MetricCard
          label="Study practices"
          value={`${state.progress.practiceAttempts + (state.progress.toolPracticeAttempts ?? 0)}`}
          note={`${state.progress.practiceAttempts} lesson · ${state.progress.toolPracticeAttempts ?? 0} lab`}
          icon={<BrainCircuit size={19} />}
        />
      </section>

      <section className="two-column">
        <article className="card">
          <div className="card-header">
            <div>
              <h2>Process dimensions</h2>
              <p>A transparent view of the current evidence</p>
            </div>
          </div>
          <div className="card-body progress-list">
            {dimensions.map((dimension) => (
              <div className="progress-row" key={dimension.label}>
                <header>
                  <div>
                    <strong>{dimension.label}</strong>
                    <span> · {dimension.note}</span>
                  </div>
                  <strong>
                    {dimension.value === null
                      ? "No data"
                      : `${dimension.value}%`}
                  </strong>
                </header>
                <div
                  className={`progress-bar ${dimension.value === null ? "empty" : ""}`}
                  role="progressbar"
                  aria-label={dimension.label}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={dimension.value ?? 0}
                  aria-valuetext={
                    dimension.value === null
                      ? "Not enough data"
                      : `${dimension.value}%`
                  }
                >
                  <span style={{ width: `${dimension.value ?? 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>
        <aside className="stack">
          <article className="card">
            <div className="card-header">
              <div>
                <h2>Evidence status</h2>
                <p>What these numbers can support</p>
              </div>
            </div>
            <div className="card-body">
              <div className="risk-rule">
                <span>Completed trades</span>
                <strong>{state.trades.length}</strong>
              </div>
              <div className="risk-rule">
                <span>Timestamped plans</span>
                <strong>{state.plans.length}</strong>
              </div>
              <div className="risk-rule">
                <span>Custom plans</span>
                <strong>{state.customLessonPlans.length}</strong>
              </div>
              <div className="risk-rule">
                <span>Sample status</span>
                <strong>
                  {state.trades.length < 20
                    ? "Early sample"
                    : "Developing sample"}
                </strong>
              </div>
            </div>
          </article>
          <div className="callout">
            <BrainCircuit size={18} />
            <p>
              Durable learning takes successful recall across separated
              sessions. Practice checks show completed effort; they do not claim
              mastery after one attempt.
            </p>
          </div>
        </aside>
      </section>
      <section className="learning-evidence-grid section-gap">
        <ActivityCalendar progress={state.progress} />
        <section className="card">
          <div className="card-header">
            <div>
              <h2>Achievement vault</h2>
              <p>
                Tiered milestones for learning, discipline, risk, journaling,
                and emotional control
              </p>
            </div>
            <span className="badge badge-strong">
              {unlockedAchievements.length}/{achievements.length} earned
            </span>
          </div>
          <div className="card-body">
            {nextAchievement ? (
              <div className="next-achievement">
                <span>
                  <BrainCircuit size={20} />
                </span>
                <div>
                  <small>
                    Closest {nextAchievement.achievementType.toLowerCase()} ·{" "}
                    {nextAchievement.current % 1
                      ? nextAchievement.current.toFixed(1)
                      : nextAchievement.current}{" "}
                    of {nextAchievement.target}
                  </small>
                  <strong>{nextAchievement.title}</strong>
                  <p>{nextAchievement.description}</p>
                </div>
                <div
                  className="achievement-ring"
                  style={
                    {
                      "--achievement-progress": `${nextAchievement.progress}%`,
                    } as CSSProperties
                  }
                >
                  <strong>{nextAchievement.progress.toFixed(0)}%</strong>
                </div>
              </div>
            ) : null}
            <Link to="/achievements" className="button secondary section-gap">
              Open complete achievement vault
            </Link>
          </div>
        </section>
      </section>
    </div>
  );
}
