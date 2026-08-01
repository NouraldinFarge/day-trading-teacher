import type { Lesson, LessonMasteryStandard } from "./types";

export const rubricDimensions = [
  "Evidence accuracy",
  "Decision accuracy",
  "Transfer",
  "Explanation",
] as const;

export type RubricDimension = (typeof rubricDimensions)[number];
export type RubricScores = Record<RubricDimension, 0 | 1 | 2 | 3>;

export const emptyRubricScores = (): RubricScores => ({
  "Evidence accuracy": 0,
  "Decision accuracy": 0,
  Transfer: 0,
  Explanation: 0,
});

export const rubricLevelLabels = [
  "Not demonstrated",
  "Guided",
  "Independent",
  "Transfer-ready",
] as const;

export function masteryStandardFor(lesson: Lesson): LessonMasteryStandard {
  const checks = lesson.sections.filter((section) => section.check).length;
  return (
    lesson.mastery_standard ?? {
      minimum_first_try_correct: Math.max(1, Math.ceil(checks * 0.67)),
      unseen_cases_required: 5,
      minimum_successful_cases: 4,
      minimum_rubric_level: 2,
      retention_practice_dates: 2,
      remediation:
        "Review the weakest rubric dimension, complete its linked practice workspace, and retry with a new outcome-hidden case.",
    }
  );
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function buildOptionOrder(
  lessonId: string,
  lessonVersion: string,
  sectionIndex: number,
  attemptSeed: number,
  optionCount: number,
) {
  const order = Array.from({ length: optionCount }, (_, index) => index);
  let state = stableHash(
    `${lessonId}:${lessonVersion}:${sectionIndex}:${attemptSeed}`,
  );
  for (let index = order.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
  }
  return order;
}

export function createAssessmentSeed(random = Math.random) {
  return Math.floor(random() * 0xffffffff) >>> 0;
}

export function evaluateMasteryStandard(
  standard: LessonMasteryStandard,
  firstTryCorrect: number,
  independentCases: number,
  successfulCases: number,
  rubricScores: RubricScores,
) {
  const rubricValues = rubricDimensions.map(
    (dimension) => rubricScores[dimension],
  );
  const rubricAverage = Number(
    (
      rubricValues.reduce<number>((total, score) => total + score, 0) /
      rubricValues.length
    ).toFixed(2),
  );
  const checksMet = firstTryCorrect >= standard.minimum_first_try_correct;
  const casesMet =
    independentCases >= standard.unseen_cases_required &&
    successfulCases >= standard.minimum_successful_cases &&
    successfulCases <= independentCases;
  const rubricMet = rubricValues.every(
    (score) => score >= standard.minimum_rubric_level,
  );
  return {
    met: checksMet && casesMet && rubricMet,
    checksMet,
    casesMet,
    rubricMet,
    rubricAverage,
  };
}
