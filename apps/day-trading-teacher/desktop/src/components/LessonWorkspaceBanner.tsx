import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BarChart3,
  BrainCircuit,
  CandlestickChart,
  CheckCircle2,
  NotebookPen,
  Settings2,
} from "lucide-react";
import {
  markLessonWorkspaceEvidenceReady,
  readLessonWorkspaceContext,
} from "../domain/lesson-session";
import { useAppState } from "../state/AppStateContext";

const content = {
  plan: {
    icon: NotebookPen,
    eyebrow: "Lesson workspace · Decision planning",
    title: "Apply the lesson before the outcome",
    note: "Use the Decision Card after risk and eligibility lessons. Saving preserves timestamped evidence; it never places an order.",
  },
  chart: {
    icon: CandlestickChart,
    eyebrow: "Lesson workspace · Historical replay",
    title: "Practice seeing before predicting",
    note: "Use charts, transparent backtests, and paper decisions to transfer lesson reasoning onto historical evidence.",
  },
  journal: {
    icon: BarChart3,
    eyebrow: "Lesson workspace · Evidence and reflection",
    title: "Turn executions into the next lesson",
    note: "Reconstruct facts, complete the reflection loop, and use patterns to choose what deserves practice next.",
  },
  lab: {
    icon: BrainCircuit,
    eyebrow: "Lesson workspace · Deliberate practice",
    title: "Strengthen the weakest link",
    note: "Use focused risk, expectancy, decision, plan-quality, and recall drills without requiring another trade.",
  },
} as const;

export function LessonWorkspaceBanner({
  workspace,
}: {
  workspace: keyof typeof content;
}) {
  const { state } = useAppState();
  const [lessonContext, setLessonContext] = useState(() =>
    readLessonWorkspaceContext(workspace),
  );
  if (state.profile.standaloneTools && !lessonContext) return null;
  const item = content[workspace];
  const Icon = item.icon;
  const eyebrow = lessonContext
    ? `Lesson mission · ${lessonContext.lessonTitle}`
    : item.eyebrow;
  const title = lessonContext
    ? `Continue in ${lessonContext.workspaceTitle}`
    : item.title;
  const note = lessonContext?.purpose ?? item.note;

  return (
    <section className="lesson-workspace-banner" aria-label={eyebrow}>
      <span className="lesson-workspace-banner-icon">
        <Icon size={21} />
      </span>
      <div>
        <span className="eyebrow accent">{eyebrow}</span>
        <strong>{title}</strong>
        <p>{note}</p>
        {lessonContext ? (
          <small className="lesson-workspace-artifact">
            <CheckCircle2 size={12} />
            Evidence target: {lessonContext.artifact}
          </small>
        ) : null}
      </div>
      <div className="lesson-workspace-banner-actions">
        {lessonContext && !lessonContext.evidenceReady ? (
          <button
            type="button"
            className="button primary compact"
            onClick={() => {
              const updated = markLessonWorkspaceEvidenceReady();
              if (updated?.workspaceId === workspace) setLessonContext(updated);
            }}
          >
            <CheckCircle2 size={15} />
            Evidence ready
          </button>
        ) : lessonContext?.evidenceReady ? (
          <span className="lesson-workspace-ready" role="status">
            <CheckCircle2 size={14} /> Evidence marked ready
          </span>
        ) : null}
        <Link to="/learn" className="button secondary compact">
          <ArrowLeft size={15} />
          {lessonContext ? "Resume lesson" : "Back to lessons"}
        </Link>
        <Link to="/settings" className="button ghost compact">
          <Settings2 size={15} />
          Use separately
        </Link>
      </div>
    </section>
  );
}
