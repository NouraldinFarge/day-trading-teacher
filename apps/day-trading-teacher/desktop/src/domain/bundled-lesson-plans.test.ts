import { describe, expect, it } from "vitest";
import { loadBundledLessonPlans } from "./bundled-lesson-plans";

describe("bundled imported curriculum", () => {
  it("keeps every included lesson on the same deliberate-practice quality floor", async () => {
    const plans = await loadBundledLessonPlans();
    expect(plans).toHaveLength(2);
    expect(plans[0].version).toBe("3.0.0");
    expect(plans[0].title).toContain("Advanced");
    expect(plans[0].lessons).toHaveLength(8);

    for (const lesson of plans[0].lessons) {
      const types = new Set(lesson.sections.map((section) => section.type));
      expect(lesson.sections).toHaveLength(8);
      expect(lesson.mastery_criteria.length).toBeGreaterThanOrEqual(3);
      expect(lesson.sections.filter((section) => section.check)).toHaveLength(
        3,
      );
      expect(lesson.curriculum_role).toBe("extension");
      expect(lesson.extension_of).toMatch(/^builtin-/);
      expect(lesson.extension_focus?.length).toBeGreaterThan(50);
      expect(lesson.mastery_standard).toMatchObject({
        minimum_first_try_correct: 2,
        unseen_cases_required: 6,
        minimum_successful_cases: 5,
        minimum_rubric_level: 2,
        retention_practice_dates: 2,
      });
      for (const required of [
        "retrieval",
        "explanation",
        "worked_example",
        "practice",
        "transfer",
        "commitment",
      ] as const) {
        expect(types.has(required)).toBe(true);
      }
      expect(
        new Set(lesson.sections.map((section) => section.title)).size,
      ).toBe(lesson.sections.length);
    }

    const positions = plans[0].lessons.flatMap((lesson) =>
      lesson.sections.flatMap((section) =>
        section.check ? [section.check.correctOption] : [],
      ),
    );
    expect(
      [0, 1, 2, 3].map(
        (position) => positions.filter((value) => value === position).length,
      ),
    ).toEqual([6, 6, 6, 6]);

    const capstone = plans[0].lessons.at(-1)!;
    expect(
      capstone.session_blocks?.reduce(
        (minutes, block) => minutes + block.minutes,
        0,
      ),
    ).toBe(capstone.estimated_minutes);
  });

  it("ships the learner-safe v7 evidence curriculum without facilitator outcomes", async () => {
    const plans = await loadBundledLessonPlans();
    const plan = plans.find(
      (candidate) =>
        candidate.plan_id === "evidence-to-execution-us-equity-sim-20260724-v7",
    );

    expect(plan).toMatchObject({
      version: "7.1.1",
      required_program_minutes: 1245,
      assessment_security: {
        certification_boundary: expect.stringMatching(/facilitator/i),
      },
    });
    expect(plan?.lessons).toHaveLength(16);
    expect(
      plan?.lessons.reduce(
        (minutes, lesson) => minutes + lesson.estimated_minutes,
        0,
      ),
    ).toBe(1245);
    expect(
      plan?.lessons
        .flatMap((lesson) => lesson.sections)
        .filter((section) => section.check),
    ).toHaveLength(48);
    expect(plan?.lessons.some((lesson) => lesson.estimated_minutes > 90)).toBe(
      true,
    );
    expect(JSON.stringify(plan)).not.toMatch(
      /capstone_blueprint|required_outcome|accepted_decision/i,
    );
  });
});
