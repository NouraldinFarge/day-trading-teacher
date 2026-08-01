import { describe, expect, it } from "vitest";
import { builtInLessons } from "./builtin-lessons";
import {
  lessonPracticeWorkspaces,
  lessonWorkspacesFor,
} from "./lesson-workspaces";

describe("lesson practice workspaces", () => {
  it("connects every core lesson to at least three practical app workspaces", () => {
    for (const lesson of builtInLessons) {
      expect(lessonWorkspacesFor(lesson).length).toBeGreaterThanOrEqual(3);
    }
  });

  it("makes planning a lesson workspace instead of an isolated idea", () => {
    expect(
      lessonWorkspacesFor("builtin-tp-003").map((item) => item.id),
    ).toContain("plan");
    expect(lessonPracticeWorkspaces.map((item) => item.id)).toEqual([
      "plan",
      "chart",
      "journal",
      "lab",
    ]);
    expect(
      lessonWorkspacesFor("builtin-capstone-001").map((item) => item.id),
    ).toEqual(["lab", "chart", "plan", "journal"]);
  });

  it("infers feasible workspaces for imported lessons from their skills", () => {
    const inferred = lessonWorkspacesFor({
      lesson_id: "custom-risk-review",
      skill_ids: ["RM-001", "TF-009"],
    });
    expect(inferred.map((item) => item.id)).toEqual([
      "journal",
      "chart",
      "plan",
      "lab",
    ]);
    expect(inferred.every((item) => item.artifact.length > 20)).toBe(true);

    expect(
      lessonWorkspacesFor({
        lesson_id: "custom-reset",
        skill_ids: ["PB-006"],
      }).map((item) => item.id),
    ).toEqual(["journal", "chart", "plan", "lab"]);
  });

  it("gives every bundled imported lesson a tailored evidence route", () => {
    const importedLessonIds = [
      "records-20260717-evidence-clock",
      "records-20260717-execution-friction",
      "records-20260717-fast-mover-gate",
      "records-20260717-reentry-reset",
      "records-20260717-exit-sentence",
      "records-20260717-process-review",
      "records-20260717-session-guardrail",
      "records-20260717-replay-lab",
    ];

    for (const lessonId of importedLessonIds) {
      const missions = lessonWorkspacesFor(lessonId);
      expect(missions.length).toBeGreaterThanOrEqual(3);
      expect(new Set(missions.map((mission) => mission.id)).size).toBe(
        missions.length,
      );
      expect(missions.every((mission) => mission.artifact.length > 25)).toBe(
        true,
      );
    }

    expect(
      lessonWorkspacesFor("records-20260717-replay-lab").map(
        (mission) => mission.id,
      ),
    ).toEqual(["lab", "chart", "plan", "journal"]);
  });
});
