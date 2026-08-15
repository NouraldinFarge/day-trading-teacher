import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Brain,
  BrainCircuit,
  ChartCandlestick,
  Calculator,
  HeartPulse,
  ClipboardCheck,
  LibraryBig,
  Sigma,
  Sparkles,
} from "lucide-react";
import { LessonWorkspaceBanner } from "../../components/LessonWorkspaceBanner";
import { PageHeader } from "../../components/PageHeader";
import { findDailySessionForDate } from "../../domain/daily-session";
import { conceptCards, dueConceptCards } from "../../domain/learning-tools";
import { readLessonWorkspaceContext } from "../../domain/lesson-session";
import { useAppState } from "../../state/AppStateContext";
import { DecisionDrill } from "./tools/DecisionDrill";
import { ContextReadingLab } from "./tools/ContextReadingLab";
import { ExpectancyLab } from "./tools/ExpectancyLab";
import { PlanQualityCoach } from "./tools/PlanQualityCoach";
import { RecallDeck } from "./tools/RecallDeck";
import { ResetDrill } from "./tools/ResetDrill";
import { RiskLab } from "./tools/RiskLab";
import { SetupPlaybookLab } from "./tools/SetupPlaybookLab";

type ToolId =
  | "risk"
  | "expectancy"
  | "decisions"
  | "context"
  | "playbook"
  | "reset"
  | "plan"
  | "recall";

const tools = [
  {
    id: "risk" as const,
    label: "Risk sandbox",
    note: "Position size and R",
    icon: Calculator,
  },
  {
    id: "expectancy" as const,
    label: "Expectancy",
    note: "Frequency versus payoff",
    icon: Sigma,
  },
  {
    id: "decisions" as const,
    label: "Decision drills",
    note: "Attempt before reasoning",
    icon: BrainCircuit,
  },
  {
    id: "context" as const,
    label: "Context reading",
    note: "Hidden-outcome chart cases",
    icon: ChartCandlestick,
  },
  {
    id: "playbook" as const,
    label: "Setup playbooks",
    note: "Practice hypotheses",
    icon: LibraryBig,
  },
  {
    id: "reset" as const,
    label: "Reset drill",
    note: "Pause or review-only",
    icon: HeartPulse,
  },
  {
    id: "plan" as const,
    label: "Plan coach",
    note: "Find evidence gaps",
    icon: ClipboardCheck,
  },
  {
    id: "recall" as const,
    label: "Recall deck",
    note: "Spaced concept practice",
    icon: Brain,
  },
];

export function LearningToolsPage() {
  const {
    state,
    recordLearningToolPractice,
    recordConceptRecall,
    upsertDailySession,
    upsertSetupPlaybook,
    removeSetupPlaybook,
  } = useAppState();
  const [lessonContext] = useState(() => readLessonWorkspaceContext("lab"));
  const [activeTool, setActiveTool] = useState<ToolId>(
    lessonContext?.labTool ?? "decisions",
  );
  const dueCount = dueConceptCards(state.progress.conceptRecall).length;
  const active = tools.find((tool) => tool.id === activeTool) ?? tools[0];
  const activeDailySession = findDailySessionForDate(state.dailySessions);

  const moveSessionToReview = () => {
    if (!activeDailySession || activeDailySession.status !== "active") return;
    const timestamp = new Date().toISOString();
    upsertDailySession({
      ...activeDailySession,
      status: "review_only",
      stopReason: "manual_stop",
      stopNote:
        "The learner used the reset drill and intentionally moved this practice session to review-only.",
      endedAt: timestamp,
      updatedAt: timestamp,
    });
  };

  return (
    <div className="learning-tools-page">
      <LessonWorkspaceBanner workspace="lab" />
      <PageHeader
        eyebrow="Learning Lab"
        title="Practice the decision—not the outcome"
        description="Use calculators, outcome-hidden chart cases, practice-only playbooks, reset drills, plan audits, and spaced recall to make hidden reasoning visible. Lab activity records study effort only and never rewards placing trades."
        actions={
          <Link to="/learn" className="button secondary">
            <ArrowLeft size={16} />
            Back to learning path
          </Link>
        }
      />

      <section className="learning-lab-status" aria-label="Learning Lab status">
        <div>
          <span>
            <Sparkles size={18} />
          </span>
          <div>
            <small>Lab practices</small>
            <strong>{state.progress.toolPracticeAttempts ?? 0}</strong>
          </div>
        </div>
        <div>
          <span>
            <Brain size={18} />
          </span>
          <div>
            <small>Concepts due</small>
            <strong>{dueCount}</strong>
          </div>
        </div>
        <p>
          {Object.keys(state.progress.conceptRecall ?? {}).length} of{" "}
          {conceptCards.length} concepts seen. Rest days and early stopping are
          valid choices.
        </p>
      </section>

      <nav className="learning-tool-picker" aria-label="Learning tools">
        {tools.map(({ id, label, note, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={activeTool === id}
            className={activeTool === id ? "active" : ""}
            onClick={() => setActiveTool(id)}
          >
            <span>
              <Icon size={18} />
            </span>
            <span>
              <strong>{label}</strong>
              <small>{note}</small>
            </span>
          </button>
        ))}
      </nav>

      <p className="sr-only" aria-live="polite">
        {active.label} opened
      </p>

      {activeTool === "risk" ? (
        <RiskLab onPractice={() => recordLearningToolPractice("risk-lab")} />
      ) : null}
      {activeTool === "expectancy" ? (
        <ExpectancyLab
          onPractice={() => recordLearningToolPractice("expectancy-lab")}
        />
      ) : null}
      {activeTool === "decisions" ? (
        <DecisionDrill
          onPractice={() => recordLearningToolPractice("decision-drill")}
        />
      ) : null}
      {activeTool === "context" ? (
        <ContextReadingLab
          onPractice={() => recordLearningToolPractice("context-reading")}
        />
      ) : null}
      {activeTool === "playbook" ? (
        <SetupPlaybookLab
          playbooks={state.setupPlaybooks ?? []}
          onSave={upsertSetupPlaybook}
          onRemove={removeSetupPlaybook}
          onPractice={() => recordLearningToolPractice("setup-playbook")}
        />
      ) : null}
      {activeTool === "reset" ? (
        <ResetDrill
          canMoveSessionToReview={activeDailySession?.status === "active"}
          onMoveSessionToReview={moveSessionToReview}
          onPractice={() => recordLearningToolPractice("reset-drill")}
        />
      ) : null}
      {activeTool === "plan" ? (
        <PlanQualityCoach
          onPractice={() => recordLearningToolPractice("plan-quality")}
        />
      ) : null}
      {activeTool === "recall" ? (
        <RecallDeck
          records={state.progress.conceptRecall}
          onRate={recordConceptRecall}
        />
      ) : null}

      <section className="learning-transfer-links">
        <div>
          <span className="eyebrow accent">Transfer the practice</span>
          <h2>Move from explanation to evidence</h2>
          <p>
            The lab helps you reason. Use the existing workspaces when you need
            to test that reasoning against a full lesson or historical record.
          </p>
        </div>
        <Link to="/learn" className="transfer-link">
          <BookOpen size={19} />
          <span>
            <strong>Open a full lesson</strong>
            <small>Retrieval, practice, transfer, and reflection</small>
          </span>
        </Link>
        <Link to="/chart" className="transfer-link">
          <BarChart3 size={19} />
          <span>
            <strong>Replay historical bars</strong>
            <small>Test a rule without placing a trade</small>
          </span>
        </Link>
      </section>
    </div>
  );
}
