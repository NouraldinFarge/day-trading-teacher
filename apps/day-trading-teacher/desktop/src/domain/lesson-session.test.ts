import { beforeEach, describe, expect, it } from "vitest";
import {
  clearLessonWorkspaceContext,
  consumeLessonWorkspaceContext,
  markLessonWorkspaceEvidenceReady,
  readLessonWorkspaceContext,
  saveLessonWorkspaceContext,
  type LessonSessionSnapshot,
} from "./lesson-session";

const session: LessonSessionSnapshot = {
  stage: "activity",
  step: 2,
  revealed: [0, 1],
  responses: { 0: "Attempt" },
  responseReviews: { 0: "matched" },
  corrections: {},
  checkChoices: { 1: 0 },
  checkAttempts: { 1: 1 },
  passedChecks: [1],
  firstTryChecks: [1],
  confidence: null,
  lessonWasComplete: false,
  confidenceWasRecorded: false,
  lessonAchievementWasUnlocked: false,
};

describe("lesson workspace session", () => {
  beforeEach(() => clearLessonWorkspaceContext());

  it("keeps a lesson activity resumable across a workspace handoff", () => {
    saveLessonWorkspaceContext({
      lessonId: "builtin-rm-004",
      lessonTitle: "Set the loss boundary first",
      workspaceId: "lab",
      workspaceTitle: "Learning Lab",
      purpose: "Recheck the calculation.",
      artifact: "A checked position-size calculation",
      labTool: "risk",
      savedAt: new Date().toISOString(),
      session,
    });

    expect(readLessonWorkspaceContext("lab")?.labTool).toBe("risk");
    expect(readLessonWorkspaceContext("chart")).toBeNull();
    expect(consumeLessonWorkspaceContext()?.session.step).toBe(2);
    expect(readLessonWorkspaceContext()).toBeNull();
  });

  it("ignores malformed session data instead of breaking a lesson", () => {
    sessionStorage.setItem(
      "trading-teacher:lesson-workspace-session",
      JSON.stringify({ lessonId: "bad" }),
    );
    expect(readLessonWorkspaceContext()).toBeNull();
  });

  it("marks a workspace artifact ready without losing the resumable lesson", () => {
    saveLessonWorkspaceContext({
      lessonId: "builtin-rm-004",
      lessonTitle: "Set the loss boundary first",
      workspaceId: "chart",
      workspaceTitle: "Chart Replay",
      purpose: "Choose invalidation before size.",
      artifact: "A structural invalidation level",
      savedAt: new Date().toISOString(),
      session,
    });

    expect(markLessonWorkspaceEvidenceReady()?.evidenceReady).toBe(true);
    expect(readLessonWorkspaceContext("chart")?.artifact).toBe(
      "A structural invalidation level",
    );
    expect(readLessonWorkspaceContext("chart")?.session.step).toBe(2);
  });
});
