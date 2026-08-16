import type { CustomLessonPlan, Lesson } from "./types";
import {
  lessonWorkspacesFor,
  type LessonWorkspaceId,
} from "./lesson-workspaces";
export { importedLessonPlanQualityWarnings } from "./lesson-plan-quality";

export type ImportedLessonPlanSummary = {
  lessonCount: number;
  completedLessons: number;
  completionPercent: number;
  totalMinutes: number;
  activityCount: number;
  objectiveCheckCount: number;
  skillCount: number;
  workspaceIds: LessonWorkspaceId[];
  nextLesson: Lesson | null;
};

export function isNewerLessonPlanVersion(candidate: string, current: string) {
  const parse = (value: string) => {
    const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(value.trim());
    return match ? match.slice(1, 4).map(Number) : null;
  };
  const candidateParts = parse(candidate);
  const currentParts = parse(current);
  if (!candidateParts || !currentParts) return false;
  for (let index = 0; index < 3; index += 1) {
    if (candidateParts[index] === currentParts[index]) continue;
    return candidateParts[index] > currentParts[index];
  }
  return false;
}

export function summarizeImportedLessonPlan(
  plan: Pick<CustomLessonPlan, "lessons" | "target_skill_ids">,
  completedLessonIds: string[] = [],
): ImportedLessonPlanSummary {
  const completed = new Set(completedLessonIds);
  const completedLessons = plan.lessons.filter((lesson) =>
    completed.has(lesson.lesson_id),
  ).length;
  const workspaceIds = new Set<LessonWorkspaceId>();

  for (const lesson of plan.lessons) {
    for (const workspace of lessonWorkspacesFor(lesson)) {
      workspaceIds.add(workspace.id);
    }
  }

  return {
    lessonCount: plan.lessons.length,
    completedLessons,
    completionPercent: plan.lessons.length
      ? Math.round((completedLessons / plan.lessons.length) * 100)
      : 0,
    totalMinutes: plan.lessons.reduce(
      (total, lesson) => total + lesson.estimated_minutes,
      0,
    ),
    activityCount: plan.lessons.reduce(
      (total, lesson) => total + lesson.sections.length,
      0,
    ),
    objectiveCheckCount: plan.lessons.reduce(
      (total, lesson) =>
        total + lesson.sections.filter((section) => section.check).length,
      0,
    ),
    skillCount: new Set(plan.target_skill_ids).size,
    workspaceIds: [...workspaceIds],
    nextLesson:
      plan.lessons.find((lesson) => !completed.has(lesson.lesson_id)) ??
      plan.lessons[0] ??
      null,
  };
}
