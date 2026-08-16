import type {
  LearningCase,
  LearningCaseEvidenceLink,
  LessonPracticeEvidence,
} from "./types";

export function createLearningCase(input: {
  id: string;
  lessonId: string;
  lessonTitle: string;
  source: LearningCase["source"];
  startedAt: string;
}): LearningCase {
  return {
    id: input.id,
    lessonId: input.lessonId,
    lessonTitle: input.lessonTitle,
    source: input.source,
    status: "active",
    startedAt: input.startedAt,
    updatedAt: input.startedAt,
    evidenceLinks: [],
  };
}

export function upsertLearningCase(
  cases: LearningCase[],
  learningCase: LearningCase,
) {
  return [
    learningCase,
    ...cases.filter((candidate) => candidate.id !== learningCase.id),
  ].slice(0, 1_000);
}

export function linkLearningCaseEvidence(
  cases: LearningCase[],
  learningCaseId: string,
  link: LearningCaseEvidenceLink,
) {
  return cases.map((learningCase) => {
    if (learningCase.id !== learningCaseId) return learningCase;
    const evidenceLinks = [
      link,
      ...learningCase.evidenceLinks.filter(
        (candidate) =>
          candidate.id !== link.id &&
          !(
            candidate.kind === link.kind &&
            candidate.referenceId === link.referenceId
          ),
      ),
    ].slice(0, 100);
    return {
      ...learningCase,
      status: "evidence_ready" as const,
      currentWorkspace: link.workspace,
      evidenceLinks,
      updatedAt: link.linkedAt,
    };
  });
}

export function completeLearningCase(
  cases: LearningCase[],
  learningCaseId: string,
  evidence: LessonPracticeEvidence | undefined,
  completedAt: string,
) {
  return cases.map((learningCase) =>
    learningCase.id === learningCaseId
      ? {
          ...learningCase,
          status: "completed" as const,
          completedAt,
          updatedAt: completedAt,
          practiceEvidence: evidence,
        }
      : learningCase,
  );
}
