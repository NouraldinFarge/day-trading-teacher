import { describe, expect, it } from "vitest";
import type { CustomLessonPlan } from "./types";
import {
  importedLessonPlanQualityWarnings,
  isNewerLessonPlanVersion,
  summarizeImportedLessonPlan,
} from "./imported-lesson-plan";

const plan = {
  lessons: [
    {
      lesson_id: "custom-rm-lesson",
      version: "1.0.0",
      title: "Risk boundary",
      skill_ids: ["RM-001"],
      objective: "Write and verify a complete risk boundary before practice.",
      estimated_minutes: 12,
      sections: [
        {
          type: "retrieval" as const,
          title: "Retrieve",
          body: "Retrieve the rule.",
        },
        {
          type: "practice" as const,
          title: "Apply",
          body: "Apply the rule.",
          prompt: "Which boundary holds?",
          check: {
            kind: "single_choice" as const,
            options: ["The preset boundary", "The hoped-for outcome"],
            correctOption: 0,
            success: "The boundary is set before outcome information.",
            correction: "Outcome cannot expand a preset risk boundary.",
          },
        },
      ],
      mastery_criteria: ["States the boundary"],
    },
  ],
  target_skill_ids: ["RM-001"],
  sources: [{ title: "Local policy" }],
} satisfies Pick<CustomLessonPlan, "lessons" | "target_skill_ids" | "sources">;

describe("imported lesson plan summaries", () => {
  it("summarizes progress, practice volume, and feasible workspaces", () => {
    const summary = summarizeImportedLessonPlan(plan, ["custom-rm-lesson"]);

    expect(summary).toMatchObject({
      lessonCount: 1,
      completedLessons: 1,
      completionPercent: 100,
      totalMinutes: 12,
      activityCount: 2,
      objectiveCheckCount: 1,
      skillCount: 1,
    });
    expect(summary.workspaceIds).toEqual(
      expect.arrayContaining(["plan", "lab"]),
    );
  });

  it("reports compact quality warnings without rejecting safe content", () => {
    expect(importedLessonPlanQualityWarnings(plan)).toEqual([
      "1 lesson has only one objective check. Two or more checks give a more reliable practice signal.",
      "1 lesson has no quantitative mastery standard. Completion will remain guided practice rather than measurable independent evidence.",
    ]);
  });

  it("offers only forward semantic-version updates", () => {
    expect(isNewerLessonPlanVersion("2.0.0", "1.9.9")).toBe(true);
    expect(isNewerLessonPlanVersion("2.0.0", "2.0.0")).toBe(false);
    expect(isNewerLessonPlanVersion("2.0.0", "3.0.0")).toBe(false);
    expect(isNewerLessonPlanVersion("draft", "1.0.0")).toBe(false);
  });
});
