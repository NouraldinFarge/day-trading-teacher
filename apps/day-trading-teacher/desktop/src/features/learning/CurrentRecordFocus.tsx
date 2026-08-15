import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Layers3,
  LogOut,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import type { Lesson, TradeLearningSystem } from "../../domain/types";

type CurrentRecordFocusProps = {
  lesson: Lesson;
  complete: boolean;
  onOpen(lesson: Lesson): void;
  learningSystem?: TradeLearningSystem;
  onOpenTradeLessons?(): void;
};

const focusSteps = [
  {
    icon: CircleDollarSign,
    title: "Correct the units",
    description: "Buy dollars become fractional shares; they are not shares.",
  },
  {
    icon: Layers3,
    title: "Bound the whole thesis",
    description: "Every planned entry shares one exposure and loss boundary.",
  },
  {
    icon: LogOut,
    title: "Exit the invalidation",
    description:
      "A lower price cannot become a reason to rewrite failed evidence.",
  },
  {
    icon: RotateCcw,
    title: "Lock out the rescue",
    description:
      "After a rescue exit, review may continue; new exposure stops.",
  },
];

export function CurrentRecordFocus({
  lesson,
  complete,
  onOpen,
  learningSystem,
  onOpenTradeLessons,
}: CurrentRecordFocusProps) {
  const newest = learningSystem?.tradeAudits[0];
  const hasAudit = Boolean(newest && onOpenTradeLessons);
  const title = hasAudit
    ? "Govern every add before the first fill"
    : "Break the rescue cycle";
  const summary = newest
    ? `${newest.tradingDate} · ${newest.symbol}: ${newest.revisedLesson.decisionErrorOrStrength}`
    : "The newest record makes one lesson more urgent than another chart pattern: keep a small dollar-funded idea from expanding into an open-ended recovery project. This is a process correction, not a prediction and not a claim about your emotions.";
  const steps = newest
    ? [
        {
          icon: CircleDollarSign,
          title: "Write the position budget",
          description:
            "Translate every buy dollar into shares and cap the combined thesis risk.",
        },
        {
          icon: Layers3,
          title: "Lock every tranche",
          description:
            "Define add prices, evidence, size, and shared invalidation before entry.",
        },
        {
          icon: LogOut,
          title: "Obey invalidation",
          description: newest.inTradeCheckpoint,
        },
        {
          icon: RotateCcw,
          title: "Prove it outcome-hidden",
          description: newest.revisedLesson.verification,
        },
      ]
    : focusSteps;

  return (
    <section
      className={`current-record-focus ${complete ? "complete" : ""}`}
      aria-labelledby="current-record-focus-title"
    >
      <div className="current-record-focus-copy">
        <span className="eyebrow">
          {complete ? <CheckCircle2 size={14} /> : <ShieldAlert size={14} />}
          {complete
            ? "Current priority practiced"
            : "Current priority · Latest record review"}
        </span>
        <h2 id="current-record-focus-title">{title}</h2>
        <p>{summary}</p>
        <div className="current-record-focus-meta">
          <span>
            <Clock3 size={15} /> {lesson.estimated_minutes} focused minutes
          </span>
          <span>
            {newest
              ? `${newest.priority} · evidence: ${newest.evidenceAndConfidence.confidence}`
              : "Private record pattern · raw account details not bundled"}
          </span>
        </div>
        <button
          className="button primary"
          onClick={() => (hasAudit ? onOpenTradeLessons?.() : onOpen(lesson))}
        >
          {hasAudit
            ? "Review latest trade lesson"
            : complete
              ? "Practice the boundary again"
              : "Start priority lesson"}
          <ArrowRight size={16} />
        </button>
        {hasAudit ? (
          <button className="button secondary" onClick={() => onOpen(lesson)}>
            {complete
              ? "Practice the boundary again"
              : "Practice the core rule"}
          </button>
        ) : null}
      </div>

      <ol className="current-record-focus-steps" aria-label="Priority sequence">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.title}>
              <span className="current-record-step-number">{index + 1}</span>
              <Icon size={18} />
              <div>
                <strong>{step.title}</strong>
                <small>{step.description}</small>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
