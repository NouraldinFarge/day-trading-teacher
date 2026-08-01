import { describe, expect, it } from "vitest";
import lessonPlan from "../../../../../content/lesson-plans/trading-records-deliberate-execution-v2.dtlesson.json";
import { validateImportedLessonPlan } from "./lesson-plan-schema";

describe("personalized trading-records lesson plan", () => {
  it("passes the same validation used by the app import screen", async () => {
    const report = validateImportedLessonPlan(JSON.stringify(lessonPlan));
    expect(report.errors).toEqual([]);
    expect(report.valid).toBe(true);
    expect(report.plan?.version).toBe("3.0.0");
    expect(report.plan?.lessons).toHaveLength(8);
    expect(
      report.plan?.lessons.reduce(
        (total, lesson) => total + lesson.estimated_minutes,
        0,
      ),
    ).toBe(270);
    expect(
      report.plan?.lessons.every(
        (lesson) =>
          lesson.sections.length === 8 &&
          lesson.sections.filter((section) => section.check).length === 3,
      ),
    ).toBe(true);
    expect(report.warnings).toEqual([
      "Externally generated content must be reviewed before installation.",
    ]);
  });
});
