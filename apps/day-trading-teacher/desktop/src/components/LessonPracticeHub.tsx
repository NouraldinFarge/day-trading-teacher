import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  CandlestickChart,
  Layers3,
  NotebookPen,
  Settings2,
} from "lucide-react";
import {
  lessonPracticeWorkspaces,
  lessonWorkspacesFor,
  type LessonWorkspaceId,
  type LessonWorkspaceMission,
} from "../domain/lesson-workspaces";
import type { Lesson } from "../domain/types";
import { useAppState } from "../state/AppStateContext";

const workspaceIcons = {
  plan: NotebookPen,
  chart: CandlestickChart,
  journal: BarChart3,
  lab: BrainCircuit,
} satisfies Record<LessonWorkspaceId, typeof NotebookPen>;

export function LessonPracticeHub() {
  const { state } = useAppState();
  const standalone = Boolean(state.profile.standaloneTools);

  return (
    <section
      className="lesson-practice-hub"
      aria-labelledby="lesson-practice-title"
    >
      <div className="lesson-practice-heading">
        <span className="lesson-practice-heading-icon">
          <Layers3 size={22} />
        </span>
        <div>
          <span className="eyebrow accent">One connected learning system</span>
          <h2 id="lesson-practice-title">
            Practice workspaces inside your lessons
          </h2>
          <p>
            Lessons teach the decision. These workspaces let you apply it with
            your own local plans, charts, executions, and reflections—without
            turning practice into a trade quota.
          </p>
        </div>
        <Link to="/settings" className="button ghost compact">
          <Settings2 size={15} />
          {standalone ? "Standalone tools on" : "Lesson-guided mode"}
        </Link>
      </div>
      <div className="lesson-practice-grid">
        {lessonPracticeWorkspaces.map((workspace, index) => {
          const Icon = workspaceIcons[workspace.id];
          return (
            <Link
              key={workspace.id}
              to={workspace.route}
              className={`lesson-practice-card ${index === 0 ? "featured" : ""}`}
            >
              <span className="lesson-practice-card-icon">
                <Icon size={20} />
              </span>
              <span>
                <small>
                  {index === 0 ? "Core lesson workspace" : "Connected practice"}
                </small>
                <strong>{workspace.title}</strong>
                <p>{workspace.purpose}</p>
              </span>
              <ArrowRight size={17} />
            </Link>
          );
        })}
      </div>
      <p className="lesson-practice-mode-note">
        {standalone
          ? "Standalone navigation is enabled, so these workspaces also appear as separate destinations."
          : "Plan, Journal, and Chart stay out of the main navigation until a lesson calls for them. You can enable separate access in Settings at any time."}
      </p>
    </section>
  );
}

export function LessonWorkspaceLinks({
  lesson,
  compact = false,
  onNavigate,
}: {
  lesson: Lesson;
  compact?: boolean;
  onNavigate?(workspace: LessonWorkspaceMission): void;
}) {
  const workspaces = lessonWorkspacesFor(lesson);
  if (!workspaces.length) return null;

  const phaseLabel = {
    prepare: "Prepare",
    apply: "Apply",
    reflect: "Reflect",
  } as const;

  return (
    <section
      className={`lesson-connected-practice ${compact ? "compact" : ""}`}
      aria-label="Use this lesson with app practice workspaces"
    >
      <div className="lesson-connected-heading">
        <Layers3 size={18} />
        <span>
          <strong>
            {compact
              ? "Continue with real evidence"
              : "Your cross-app practice mission"}
          </strong>
          <small>
            {compact
              ? "Choose the next evidence step; another trade is never required."
              : "Each handoff preserves this lesson for your return and names the evidence to produce."}
          </small>
        </span>
      </div>
      <div className="lesson-connected-grid">
        {workspaces.map((workspace, index) => {
          const Icon = workspaceIcons[workspace.id];
          return (
            <Link
              key={workspace.id}
              to={workspace.route}
              className="lesson-connected-link"
              onClick={() => onNavigate?.(workspace)}
            >
              <span>
                <Icon size={18} />
              </span>
              <span>
                <em>
                  {index + 1} · {phaseLabel[workspace.phase]}
                </em>
                <strong>{workspace.action}</strong>
                <small>{workspace.purpose}</small>
                <small className="lesson-connected-artifact">
                  <CheckCircle2 size={12} />
                  Leave with: {workspace.artifact}
                </small>
              </span>
              <ArrowRight size={15} />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function LessonActivityWorkspacePrompt({
  lesson,
  sectionIndex,
  onNavigate,
}: {
  lesson: Lesson;
  sectionIndex: number;
  onNavigate(workspace: LessonWorkspaceMission): void;
}) {
  const missions = lessonWorkspacesFor(lesson).filter(
    (workspace) =>
      Math.min(workspace.checkpointAfter, lesson.sections.length - 1) ===
      sectionIndex,
  );
  if (!missions.length) return null;

  return (
    <aside className="lesson-activity-handoff">
      <div className="lesson-activity-handoff-heading">
        <Layers3 size={17} />
        <span>
          <strong>Optional hands-on checkpoint</strong>
          <small>
            Your activity, attempts, and corrections will resume when you
            return.
          </small>
        </span>
      </div>
      <div className="lesson-activity-handoff-actions">
        {missions.map((workspace) => {
          const Icon = workspaceIcons[workspace.id];
          return (
            <Link
              key={workspace.id}
              to={workspace.route}
              className="lesson-activity-handoff-link"
              onClick={() => onNavigate(workspace)}
            >
              <Icon size={17} />
              <span>
                <strong>{workspace.action}</strong>
                <small>{workspace.purpose}</small>
              </span>
              <ArrowRight size={15} />
            </Link>
          );
        })}
      </div>
      <p>
        A tool handoff is practice, not a requirement. Continue the lesson here
        if the tool would interrupt your reasoning.
      </p>
    </aside>
  );
}
