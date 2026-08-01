import {
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  Check,
  ChevronRight,
  Clock3,
  FileCheck2,
  Layers3,
  NotebookPen,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  importedLessonPlanQualityWarnings,
  isNewerLessonPlanVersion,
  summarizeImportedLessonPlan,
} from "../../domain/imported-lesson-plan";
import type { ReviewableLessonPlan } from "../../domain/bundled-lesson-plans";
import {
  lessonWorkspacesFor,
  type LessonWorkspaceId,
} from "../../domain/lesson-workspaces";
import { getSkillTitle } from "../../domain/skills";
import type { CustomLessonPlan, Lesson, Progress } from "../../domain/types";

const workspaceDetails = {
  plan: { label: "Decision Card", icon: NotebookPen },
  chart: { label: "Chart Replay", icon: BarChart3 },
  journal: { label: "Evidence Journal", icon: BookOpenCheck },
  lab: { label: "Learning Lab", icon: BrainCircuit },
} satisfies Record<LessonWorkspaceId, { label: string; icon: typeof Clock3 }>;

function readableDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

export function ImportedLessonLibrary({
  plans,
  progress,
  availableUpdates = [],
  onOpenLesson,
  onRemovePlan,
  onReviewUpdate,
}: {
  plans: CustomLessonPlan[];
  progress: Progress;
  availableUpdates?: ReviewableLessonPlan[];
  onOpenLesson(lesson: Lesson): void;
  onRemovePlan(planId: string): void;
  onReviewUpdate?(plan: ReviewableLessonPlan): void;
}) {
  const totalLessons = plans.reduce(
    (total, plan) => total + plan.lessons.length,
    0,
  );
  const totalMinutes = plans.reduce(
    (total, plan) =>
      total +
      plan.lessons.reduce(
        (lessonTotal, lesson) => lessonTotal + lesson.estimated_minutes,
        0,
      ),
    0,
  );
  const completedLessonIds = progress.completedLessonIds;
  const completedImportedLessons = plans.reduce(
    (total, plan) =>
      total +
      plan.lessons.filter((lesson) =>
        completedLessonIds.includes(lesson.lesson_id),
      ).length,
    0,
  );

  return (
    <section
      className="imported-library section-gap"
      aria-labelledby="imported-library-title"
    >
      <div className="imported-library-heading">
        <div>
          <span className="eyebrow accent">
            Your reviewed external curriculum
          </span>
          <h2 id="imported-library-title">Imported lesson plans</h2>
          <p>
            Each plan keeps its own sequence, sources, progress, and feasible
            app practice. Imported content never replaces the verified core
            path.
          </p>
        </div>
        <div
          className="imported-library-totals"
          aria-label="Imported curriculum totals"
        >
          <span>
            <strong>{plans.length}</strong>
            <small>{plans.length === 1 ? "plan" : "plans"}</small>
          </span>
          <span>
            <strong>
              {completedImportedLessons}/{totalLessons}
            </strong>
            <small>lessons practiced</small>
          </span>
          <span>
            <strong>{totalMinutes}</strong>
            <small>focused minutes</small>
          </span>
        </div>
      </div>

      <div className="imported-plan-list">
        {plans.map((plan) => {
          const summary = summarizeImportedLessonPlan(plan, completedLessonIds);
          const qualityWarnings = importedLessonPlanQualityWarnings(plan);
          const availableUpdate = availableUpdates.find(
            (candidate) =>
              candidate.plan_id === plan.plan_id &&
              isNewerLessonPlanVersion(candidate.version, plan.version),
          );
          const origin = [plan.origin.provider, plan.origin.model]
            .filter(Boolean)
            .join(" · ");

          return (
            <article className="imported-plan-card" key={plan.plan_id}>
              <header className="imported-plan-header">
                <span className="imported-plan-icon" aria-hidden="true">
                  <Sparkles size={23} />
                </span>
                <div>
                  <span className="eyebrow">
                    Imported plan · v{plan.version}
                  </span>
                  <h3>{plan.title}</h3>
                  <p>
                    Reviewed locally from {origin || "an external author"} ·
                    installed {readableDate(plan.importedAt)}
                  </p>
                </div>
                <div className="imported-plan-actions">
                  {availableUpdate && onReviewUpdate ? (
                    <button
                      className="button secondary compact"
                      onClick={() => onReviewUpdate(availableUpdate)}
                    >
                      Review v{availableUpdate.version} update
                    </button>
                  ) : null}
                  {summary.nextLesson ? (
                    <button
                      className="button primary compact"
                      onClick={() => onOpenLesson(summary.nextLesson!)}
                    >
                      {summary.completedLessons
                        ? "Continue plan"
                        : "Start plan"}
                      <ChevronRight size={15} />
                    </button>
                  ) : null}
                  <button
                    className="icon-button"
                    aria-label={`Remove ${plan.title}`}
                    onClick={() => onRemovePlan(plan.plan_id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </header>

              <div className="imported-plan-progress-row">
                <div>
                  <strong>{summary.completionPercent}% practiced</strong>
                  <small>
                    {summary.completedLessons} of {summary.lessonCount} lessons
                    · repeat passes remain available
                  </small>
                </div>
                <div
                  className="progress-bar"
                  aria-label={`${plan.title}: ${summary.completedLessons} of ${summary.lessonCount} lessons practiced`}
                >
                  <span style={{ width: `${summary.completionPercent}%` }} />
                </div>
              </div>

              <div className="imported-plan-stats" aria-label="Plan structure">
                <span>
                  <Clock3 size={17} />
                  <strong>{summary.totalMinutes} min</strong>
                  <small>suggested pace</small>
                </span>
                <span>
                  <Layers3 size={17} />
                  <strong>{summary.activityCount}</strong>
                  <small>activities</small>
                </span>
                <span>
                  <FileCheck2 size={17} />
                  <strong>{summary.objectiveCheckCount}</strong>
                  <small>objective checks</small>
                </span>
                <span>
                  <ShieldCheck size={17} />
                  <strong>{summary.skillCount}</strong>
                  <small>target skills</small>
                </span>
              </div>

              {plan.assessment_security ? (
                <div className="imported-plan-security" role="note">
                  <ShieldCheck size={19} />
                  <div>
                    <span className="eyebrow">
                      Outcome-hidden learner distribution
                    </span>
                    <strong>
                      Secure assessments stay outside the application
                    </strong>
                    <p>{plan.assessment_security.learner_distribution}</p>
                    <small>
                      {plan.assessment_security.certification_boundary}
                    </small>
                  </div>
                </div>
              ) : null}

              {qualityWarnings.length ? (
                <div className="imported-plan-quality" role="note">
                  <BrainCircuit size={18} />
                  <div>
                    <strong>Practice-quality notes</strong>
                    <ul>
                      {qualityWarnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="imported-plan-quality ready" role="status">
                  <Check size={18} />
                  <div>
                    <strong>Deliberate-practice structure present</strong>
                    <small>
                      Retrieval, application, objective feedback, and connected
                      app practice are represented across this plan.
                    </small>
                  </div>
                </div>
              )}

              <div className="imported-plan-route">
                <div className="imported-plan-route-heading">
                  <div>
                    <span className="eyebrow">Recommended sequence</span>
                    <strong>Work one decision at a time</strong>
                  </div>
                  <small>
                    Tool missions create evidence; they never require another
                    trade.
                  </small>
                </div>
                <ol>
                  {plan.lessons.map((lesson, index) => {
                    const completed = completedLessonIds.includes(
                      lesson.lesson_id,
                    );
                    const mastery = progress.lessonMastery?.[lesson.lesson_id];
                    const missions = lessonWorkspacesFor(lesson);
                    const checkCount = lesson.sections.filter(
                      (section) => section.check,
                    ).length;
                    return (
                      <li
                        className={`imported-lesson-row ${completed ? "completed" : ""}`}
                        key={lesson.lesson_id}
                      >
                        <span className="imported-lesson-number">
                          {completed ? <Check size={16} /> : index + 1}
                        </span>
                        <div className="imported-lesson-copy">
                          <div className="imported-lesson-title-row">
                            <div>
                              <small>
                                Lesson {index + 1} of {plan.lessons.length}
                              </small>
                              <strong>{lesson.title}</strong>
                            </div>
                            <span
                              className={`badge ${completed ? "badge-strong" : "badge-partial"}`}
                            >
                              {completed ? "Practiced" : "Ready"}
                            </span>
                          </div>
                          <p>{lesson.objective}</p>
                          <div className="imported-lesson-meta">
                            <span>{lesson.estimated_minutes} min</span>
                            <span>{lesson.sections.length} activities</span>
                            <span>{checkCount} checks</span>
                            {mastery ? (
                              <span>
                                {mastery.bestFirstTryPercent}% best first try
                              </span>
                            ) : null}
                          </div>
                          <div
                            className="imported-lesson-workspaces"
                            aria-label={`Connected practice for ${lesson.title}`}
                          >
                            {missions.map((mission) => {
                              const detail = workspaceDetails[mission.id];
                              const Icon = detail.icon;
                              return (
                                <span key={mission.id} title={mission.purpose}>
                                  <Icon size={13} />
                                  {mission.phase} · {detail.label}
                                </span>
                              );
                            })}
                          </div>
                          <div className="skill-chips">
                            {lesson.skill_ids.map((skillId) => (
                              <span
                                className="skill-chip"
                                key={skillId}
                                title={getSkillTitle(skillId)}
                              >
                                {skillId}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          className="button secondary compact imported-lesson-open"
                          onClick={() => onOpenLesson(lesson)}
                        >
                          {completed ? "Practice again" : "Open lesson"}
                          <ChevronRight size={15} />
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>

              <details className="imported-plan-provenance">
                <summary>Sources, prerequisites, and import details</summary>
                <div className="imported-plan-provenance-grid">
                  <div>
                    <strong>Prerequisite skills</strong>
                    {plan.prerequisites.length ? (
                      <ul>
                        {plan.prerequisites.map((skillId) => (
                          <li key={skillId}>
                            {skillId} · {getSkillTitle(skillId)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No prerequisites declared.</p>
                    )}
                  </div>
                  <div>
                    <strong>Declared sources</strong>
                    {plan.sources.length ? (
                      <ul>
                        {plan.sources.map((source) => (
                          <li
                            key={`${source.title}-${source.last_verified ?? ""}`}
                          >
                            {source.url ? (
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {source.title}
                              </a>
                            ) : (
                              source.title
                            )}
                            {source.last_verified
                              ? ` · checked ${source.last_verified}`
                              : " · verification date not supplied"}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No sources declared.</p>
                    )}
                  </div>
                  {plan.scope_boundary ? (
                    <div>
                      <strong>Curriculum boundary</strong>
                      <p>{plan.scope_boundary.certification_boundary}</p>
                      <small>
                        Included: {plan.scope_boundary.included.join(" · ")}
                      </small>
                      <small>
                        Excluded: {plan.scope_boundary.excluded.join(" · ")}
                      </small>
                    </div>
                  ) : null}
                </div>
                <small>
                  Plan ID: {plan.plan_id} · File fingerprint:{" "}
                  {plan.fileHash.slice(0, 12)}…
                </small>
              </details>
            </article>
          );
        })}
      </div>
    </section>
  );
}
