import type { CSSProperties } from "react";
import {
  BrainCircuit,
  Check,
  Clock3,
  Layers3,
  Play,
  Route,
  ShieldCheck,
  Award,
} from "lucide-react";
import { corePathStages } from "../../domain/core-path";
import type { AchievementProgress } from "../../domain/achievements";
import type { Lesson, LessonMasteryRecord } from "../../domain/types";

type CoreLearningPathProps = {
  lessons: Lesson[];
  completedLessonIds: string[];
  lessonMastery?: Record<string, LessonMasteryRecord>;
  lessonAchievements?: Record<string, AchievementProgress>;
  onOpen(lesson: Lesson): void;
};

export function CoreLearningPath({
  lessons,
  completedLessonIds,
  lessonMastery = {},
  lessonAchievements = {},
  onOpen,
}: CoreLearningPathProps) {
  const completed = new Set(completedLessonIds);
  const completedCount = lessons.filter((lesson) =>
    completed.has(lesson.lesson_id),
  ).length;
  const pathComplete = completedCount === lessons.length;
  const nextLesson =
    lessons.find((lesson) => !completed.has(lesson.lesson_id)) ?? lessons[0];
  const nextStage =
    corePathStages.find((stage) =>
      stage.lessonIds.includes(nextLesson.lesson_id),
    ) ?? corePathStages[0];
  const pathProgress = Math.round((completedCount / lessons.length) * 100);
  const remainingMinutes = lessons
    .filter((lesson) => !completed.has(lesson.lesson_id))
    .reduce((sum, lesson) => sum + lesson.estimated_minutes, 0);

  return (
    <>
      <section className="learning-path-hero">
        <div className="path-hero-copy">
          <span className="eyebrow">
            {pathComplete
              ? "Core path practiced"
              : `Next · Phase ${nextStage.phase} of ${corePathStages.length}`}
          </span>
          <h2>
            {pathComplete
              ? "Return to evidence and test what remains"
              : nextLesson.title}
          </h2>
          <p>
            {pathComplete
              ? "Completion records a deliberate pass, not permanent mastery. Revisit the path later and retrieve the reasoning without hints."
              : nextLesson.objective}
          </p>
          <div className="path-hero-meta">
            <span>
              <Clock3 size={15} />
              {nextLesson.estimated_minutes} focused minutes
            </span>
            <span>
              <Layers3 size={15} />
              {pathComplete
                ? "Spaced retrieval pass"
                : `${remainingMinutes} minutes remain across the path`}
            </span>
          </div>
          <button className="button primary" onClick={() => onOpen(nextLesson)}>
            <Play size={17} />
            {pathComplete ? "Practice from the beginning" : "Begin next lesson"}
          </button>
        </div>
        <div
          className="path-progress-orb"
          style={
            { "--path-progress": `${pathProgress * 3.6}deg` } as CSSProperties
          }
        >
          <span>
            <strong>
              {completedCount}/{lessons.length}
            </strong>
            <small>core lessons</small>
          </span>
        </div>
      </section>

      <section
        className="core-path-principles"
        aria-label="Core learning principles"
      >
        <div>
          <Route size={18} />
          <span>
            <strong>Evidence before story</strong>
            <small>Label facts, calculations, reports, and unknowns.</small>
          </span>
        </div>
        <div>
          <ShieldCheck size={18} />
          <span>
            <strong>No trade is success</strong>
            <small>Discipline can finish the decision without a ticket.</small>
          </span>
        </div>
        <div>
          <Check size={18} />
          <span>
            <strong>Process before outcome</strong>
            <small>Profit and loss never determine mastery.</small>
          </span>
        </div>
      </section>

      <div className="learning-path-label">
        <div>
          <Route size={18} />
          <span>
            <strong>Your deliberate-practice path</strong>
            <small>
              The sequence is recommended; every lesson remains available.
            </small>
          </span>
        </div>
        <span>{pathProgress}% practiced</span>
      </div>

      <section className="core-path" aria-label="Core learning path">
        {corePathStages.map((stage) => {
          const stageLessons = stage.lessonIds
            .map((lessonId) =>
              lessons.find((lesson) => lesson.lesson_id === lessonId),
            )
            .filter((lesson): lesson is Lesson => Boolean(lesson));
          const stageCompleted = stageLessons.filter((lesson) =>
            completed.has(lesson.lesson_id),
          ).length;
          const isCurrent =
            !pathComplete && stage.lessonIds.includes(nextLesson.lesson_id);
          const isComplete =
            stageLessons.length > 0 && stageCompleted === stageLessons.length;
          return (
            <article
              className={`core-stage ${isCurrent ? "current" : ""} ${isComplete ? "complete" : ""}`}
              key={stage.id}
            >
              <header className="core-stage-header">
                <span className="core-stage-number">
                  {isComplete ? <Check size={17} /> : stage.phase}
                </span>
                <div className="core-stage-heading">
                  <span className="eyebrow">Phase {stage.phase}</span>
                  <h3>{stage.title}</h3>
                  <p>{stage.description}</p>
                </div>
                <span
                  className={`core-stage-status ${isComplete ? "complete" : isCurrent ? "current" : ""}`}
                >
                  {isComplete
                    ? "Practiced"
                    : isCurrent
                      ? "Current"
                      : `${stageCompleted}/${stageLessons.length}`}
                </span>
              </header>
              <div className="core-stage-milestone">
                <ShieldCheck size={16} />
                <span>
                  <strong>Phase milestone</strong>
                  {stage.milestone}
                </span>
              </div>
              <div className="core-stage-lessons">
                {stageLessons.map((lesson) => {
                  const lessonComplete = completed.has(lesson.lesson_id);
                  const recommended =
                    lesson.lesson_id === nextLesson.lesson_id && !pathComplete;
                  const lessonNumber =
                    lessons.findIndex(
                      (candidate) => candidate.lesson_id === lesson.lesson_id,
                    ) + 1;
                  const mastery = lessonMastery[lesson.lesson_id];
                  const achievement = lessonAchievements[lesson.lesson_id];
                  return (
                    <div
                      className={`core-lesson ${recommended ? "recommended" : ""}`}
                      key={lesson.lesson_id}
                    >
                      <div className="core-lesson-copy">
                        <div className="lesson-meta">
                          <span>
                            Lesson {lessonNumber} of {lessons.length} ·{" "}
                            {lesson.estimated_minutes} min
                          </span>
                          {lessonComplete ? (
                            <span className="badge badge-strong">
                              Practiced
                            </span>
                          ) : recommended ? (
                            <span className="badge badge-partial">Next</span>
                          ) : null}
                        </div>
                        <h4>{lesson.title}</h4>
                        <p>{lesson.objective}</p>
                        <div className="skill-chips">
                          {lesson.skill_ids.map((skill) => (
                            <span className="skill-chip" key={skill}>
                              {skill}
                            </span>
                          ))}
                        </div>
                        {mastery ? (
                          <div className="lesson-mastery-line">
                            <BrainCircuit size={14} />
                            <span>
                              {mastery.attempts} deliberate pass
                              {mastery.attempts === 1 ? "" : "es"} · best
                              first-try check {mastery.bestFirstTryPercent}%
                            </span>
                          </div>
                        ) : null}
                        {achievement ? (
                          <div
                            className={`lesson-artifact-line ${achievement.unlocked ? "earned" : ""}`}
                          >
                            <Award size={14} />
                            <span>
                              <strong>{achievement.title}</strong>
                              {achievement.unlocked
                                ? " · mastery artifact earned"
                                : ` · ${Math.min(achievement.current, achievement.target)}/${achievement.target} practice dates`}
                            </span>
                          </div>
                        ) : null}
                      </div>
                      <button
                        className={
                          recommended ? "button primary" : "button secondary"
                        }
                        onClick={() => onOpen(lesson)}
                      >
                        {lessonComplete
                          ? "Practice again"
                          : recommended
                            ? "Start lesson"
                            : "Open lesson"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}
