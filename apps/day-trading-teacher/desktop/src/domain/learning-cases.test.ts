import { describe, expect, it } from "vitest";
import {
  completeLearningCase,
  createLearningCase,
  linkLearningCaseEvidence,
  upsertLearningCase,
} from "./learning-cases";

const startedAt = "2026-08-15T12:00:00.000Z";

describe("learning cases", () => {
  it("keeps one canonical evidence chain from lesson through practice", () => {
    const learningCase = createLearningCase({
      id: "case-1",
      lessonId: "lesson-1",
      lessonTitle: "Risk before entry",
      source: "core",
      startedAt,
    });
    const linked = linkLearningCaseEvidence(
      upsertLearningCase([], learningCase),
      learningCase.id,
      {
        id: "evidence-1",
        kind: "decision_plan",
        referenceId: "plan-1",
        label: "Decision Card for TEST",
        workspace: "plan",
        linkedAt: "2026-08-15T12:05:00.000Z",
      },
    );
    const completed = completeLearningCase(
      linked,
      learningCase.id,
      {
        lessonVersion: "1.0",
        objectiveChecks: 2,
        firstTryCorrect: 2,
        correctionsCompleted: 0,
      },
      "2026-08-15T12:10:00.000Z",
    );

    expect(completed[0]).toMatchObject({
      status: "completed",
      currentWorkspace: "plan",
      evidenceLinks: [{ referenceId: "plan-1" }],
      practiceEvidence: { firstTryCorrect: 2 },
    });
  });

  it("deduplicates the same saved artifact", () => {
    const learningCase = createLearningCase({
      id: "case-1",
      lessonId: "lesson-1",
      lessonTitle: "Risk before entry",
      source: "core",
      startedAt,
    });
    const link = {
      id: "evidence-1",
      kind: "chart_dataset" as const,
      referenceId: "chart-1",
      label: "TEST one-minute replay",
      workspace: "chart" as const,
      linkedAt: startedAt,
    };
    const once = linkLearningCaseEvidence([learningCase], "case-1", link);
    const twice = linkLearningCaseEvidence(once, "case-1", {
      ...link,
      id: "evidence-2",
    });
    expect(twice[0].evidenceLinks).toHaveLength(1);
  });
});
