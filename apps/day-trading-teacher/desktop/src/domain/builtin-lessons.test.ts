import { describe, expect, it } from "vitest";
import { builtInLessons } from "./builtin-lessons";
import { corePathStages } from "./core-path";
import { allowedSkillIds } from "./skills";

describe("built-in curriculum", () => {
  it("follows the deep-lesson briefing and practice contract", () => {
    expect(builtInLessons).toHaveLength(9);
    for (const lesson of builtInLessons) {
      const sectionTypes = new Set(
        lesson.sections.map((section) => section.type),
      );
      expect(lesson.version).toBe("4.0.0");
      expect(lesson.objective.length).toBeGreaterThan(35);
      expect(lesson.sections).toHaveLength(8);
      expect(lesson.mastery_criteria.length).toBeGreaterThanOrEqual(3);
      expect(lesson.estimated_minutes).toBeGreaterThanOrEqual(6);
      expect(lesson.estimated_minutes).toBeLessThanOrEqual(50);
      expect(sectionTypes.has("retrieval")).toBe(true);
      expect(sectionTypes.has("explanation")).toBe(true);
      expect(sectionTypes.has("worked_example")).toBe(true);
      expect(sectionTypes.has("practice")).toBe(true);
      expect(lesson.sections.filter((section) => section.check)).toHaveLength(
        3,
      );
      expect(lesson.mastery_standard).toBeTruthy();
      expect(
        lesson.mastery_standard!.minimum_first_try_correct,
      ).toBeLessThanOrEqual(3);
      expect(
        lesson.mastery_standard!.minimum_successful_cases,
      ).toBeLessThanOrEqual(lesson.mastery_standard!.unseen_cases_required);
      expect(sectionTypes.has("transfer")).toBe(true);
      expect(sectionTypes.has("commitment")).toBe(true);
      for (const section of lesson.sections) {
        if (section.answer) expect(section.prompt).toBeTruthy();
        if (section.check) {
          expect(section.prompt).toBeTruthy();
          expect(section.check.options.length).toBeGreaterThanOrEqual(2);
          expect(section.check.correctOption).toBeGreaterThanOrEqual(0);
          expect(section.check.correctOption).toBeLessThan(
            section.check.options.length,
          );
        }
      }
    }
  });

  it("balances authored answer positions before runtime reshuffling", () => {
    const positions = builtInLessons.flatMap((lesson) =>
      lesson.sections.flatMap((section) =>
        section.check ? [section.check.correctOption] : [],
      ),
    );
    const counts = [0, 1, 2, 3].map(
      (position) => positions.filter((value) => value === position).length,
    );
    expect(positions).toHaveLength(27);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  it("uses unique IDs and covers every registered core skill", () => {
    const registeredSkills = new Set<string>(allowedSkillIds);
    const coveredSkills = new Set(
      builtInLessons.flatMap((lesson) => lesson.skill_ids),
    );
    expect(new Set(builtInLessons.map((lesson) => lesson.lesson_id)).size).toBe(
      builtInLessons.length,
    );
    expect([...coveredSkills].sort()).toEqual([...registeredSkills].sort());
    for (const lesson of builtInLessons) {
      expect(
        lesson.skill_ids.every((skillId) => registeredSkills.has(skillId)),
      ).toBe(true);
    }
  });

  it("maps every lesson exactly once in the intended six-phase sequence", () => {
    const pathLessonIds = corePathStages.flatMap((stage) => stage.lessonIds);
    expect(corePathStages).toHaveLength(6);
    expect(pathLessonIds).toEqual(
      builtInLessons.map((lesson) => lesson.lesson_id),
    );
    expect(new Set(pathLessonIds).size).toBe(pathLessonIds.length);
    expect(corePathStages[0].title).toBe("Evidence literacy");
    expect(corePathStages.at(-1)?.title).toBe("Review and transfer");
  });

  it("makes disciplined waiting and process review part of mastery", () => {
    const curriculum = JSON.stringify(builtInLessons).toLowerCase();
    expect(curriculum).toContain("no trade");
    expect(curriculum).toContain("unknown");
    expect(curriculum).toContain("process");
    expect(curriculum).toContain("historical");
    expect(curriculum).toContain("evidence journal");
    expect(curriculum).toContain("chart replay");
    expect(curriculum).toContain("decision card");
    expect(curriculum).toContain("learning lab");
    expect(curriculum).toContain("t+1");
    expect(curriculum).toContain("intraday margin");
    expect(curriculum).toContain("fractional-share");
    expect(curriculum).not.toContain("live trade signal");
    expect(builtInLessons.at(-1)?.title).toBe(
      "Run the complete no-click replay",
    );
  });

  it("separates capstone instruction, independent performance, and review", () => {
    const capstone = builtInLessons.find(
      (lesson) => lesson.lesson_id === "builtin-capstone-001",
    )!;
    expect(capstone.session_blocks?.map((block) => block.title)).toEqual([
      "Instruction calibration",
      "Independent performance",
      "Review and remediation",
    ]);
    expect(
      capstone.session_blocks?.reduce(
        (minutes, block) => minutes + block.minutes,
        0,
      ),
    ).toBe(capstone.estimated_minutes);
    expect(
      new Set(capstone.sections.map((section) => section.assessment_phase)),
    ).toEqual(new Set(["instruction", "independent_performance", "review"]));
  });
});
