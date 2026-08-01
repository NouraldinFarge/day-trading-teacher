import type { CustomLessonPlan, Lesson } from "./types";
import {
  lessonWorkspacesFor,
  type LessonWorkspaceId,
} from "./lesson-workspaces";

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

export function importedLessonPlanQualityWarnings(
  plan: Pick<CustomLessonPlan, "lessons" | "target_skill_ids" | "sources">,
): string[] {
  const warnings: string[] = [];
  const lessonsWithoutChecks = plan.lessons.filter(
    (lesson) => !lesson.sections.some((section) => section.check),
  );
  const lessonsWithOneCheck = plan.lessons.filter(
    (lesson) => lesson.sections.filter((section) => section.check).length === 1,
  );
  const lessonsMissingRetrieval = plan.lessons.filter(
    (lesson) =>
      !lesson.sections.some((section) => section.type === "retrieval"),
  );
  const lessonsMissingApplication = plan.lessons.filter(
    (lesson) =>
      !lesson.sections.some(
        (section) => section.type === "practice" || section.type === "transfer",
      ),
  );
  const usedSkills = new Set(
    plan.lessons.flatMap((lesson) => lesson.skill_ids),
  );
  const uncoveredSkills = plan.target_skill_ids.filter(
    (skillId) => !usedSkills.has(skillId),
  );
  const lessonsWithoutStandards = plan.lessons.filter(
    (lesson) => !lesson.mastery_standard,
  );
  const unlinkedExtensions = plan.lessons.filter(
    (lesson) => lesson.curriculum_role === "extension" && !lesson.extension_of,
  );
  const checks = plan.lessons.flatMap((lesson) =>
    lesson.sections.flatMap((section) =>
      section.check ? [section.check] : [],
    ),
  );

  if (lessonsWithoutChecks.length) {
    warnings.push(
      `${lessonsWithoutChecks.length} lesson${lessonsWithoutChecks.length === 1 ? " has" : "s have"} no objective checks. Guided written comparisons still work, but recall strength will be harder to measure.`,
    );
  } else if (lessonsWithOneCheck.length) {
    warnings.push(
      `${lessonsWithOneCheck.length} lesson${lessonsWithOneCheck.length === 1 ? " has" : "s have"} only one objective check. Two or more checks give a more reliable practice signal.`,
    );
  }
  if (lessonsMissingRetrieval.length) {
    warnings.push(
      `${lessonsMissingRetrieval.length} lesson${lessonsMissingRetrieval.length === 1 ? " does" : "s do"} not begin with retrieval practice.`,
    );
  }
  if (lessonsMissingApplication.length) {
    warnings.push(
      `${lessonsMissingApplication.length} lesson${lessonsMissingApplication.length === 1 ? " is" : "s are"} missing a practice or transfer activity.`,
    );
  }
  if (uncoveredSkills.length) {
    warnings.push(
      `The plan targets skills that no lesson practices: ${uncoveredSkills.join(", ")}.`,
    );
  }
  if (!plan.sources.length) {
    warnings.push(
      "No sources were supplied. Current broker or market-rule claims should be treated as unverified.",
    );
  }
  if (lessonsWithoutStandards.length) {
    warnings.push(
      `${lessonsWithoutStandards.length} lesson${lessonsWithoutStandards.length === 1 ? " has" : "s have"} no quantitative mastery standard. Completion will remain guided practice rather than measurable independent evidence.`,
    );
  }
  if (unlinkedExtensions.length) {
    warnings.push(
      `${unlinkedExtensions.length} extension lesson${unlinkedExtensions.length === 1 ? " is" : "s are"} not linked to a core lesson, so repeated coverage may be difficult to distinguish from deliberate transfer practice.`,
    );
  }
  if (checks.length >= 6) {
    const positionCounts = checks.reduce<Record<number, number>>(
      (counts, check) => {
        counts[check.correctOption] = (counts[check.correctOption] ?? 0) + 1;
        return counts;
      },
      {},
    );
    const usedCounts = Array.from(
      { length: Math.max(...checks.map((check) => check.options.length)) },
      (_, index) => positionCounts[index] ?? 0,
    );
    if (Math.max(...usedCounts) - Math.min(...usedCounts) > 1) {
      warnings.push(
        "Correct-answer positions are unbalanced across the plan. Reorder authored choices so no answer slot becomes a shortcut; displayed choices are also reshuffled at runtime.",
      );
    }
  }

  return warnings;
}
