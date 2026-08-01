import { describe, expect, it } from "vitest";
import type { Lesson, Progress } from "./types";
import { recommendLessonPractice } from "./learning-schedule";

const lessons: Lesson[] = [
  {
    lesson_id: "one",
    version: "1",
    title: "One",
    skill_ids: ["RM-004"],
    objective: "Practice one",
    estimated_minutes: 10,
    sections: [],
    mastery_criteria: ["Attempt"],
  },
  {
    lesson_id: "two",
    version: "1",
    title: "Two",
    skill_ids: ["RM-004"],
    objective: "Practice two",
    estimated_minutes: 10,
    sections: [],
    mastery_criteria: ["Attempt"],
  },
];

function progress(overrides: Partial<Progress> = {}): Progress {
  return {
    completedLessonIds: [],
    practiceAttempts: 0,
    lessonConfidence: {},
    lessonActivityByDate: {},
    ...overrides,
  };
}

describe("lesson practice scheduling", () => {
  it("starts with the next unpracticed lesson", () => {
    expect(recommendLessonPractice(progress(), lessons).lesson?.lesson_id).toBe(
      "one",
    );
  });

  it("prioritizes a due low-confidence review", () => {
    const result = recommendLessonPractice(
      progress({
        completedLessonIds: ["one"],
        lessonConfidence: { one: 1 },
        lessonLastPracticed: { one: "2026-07-16T12:00:00.000Z" },
      }),
      lessons,
      new Date("2026-07-18T12:00:00.000Z"),
    );
    expect(result.kind).toBe("review");
    expect(result.lesson?.lesson_id).toBe("one");
  });

  it("does not force immediate repetition when every lesson is spaced", () => {
    const result = recommendLessonPractice(
      progress({
        completedLessonIds: ["one", "two"],
        lessonConfidence: { one: 3, two: 3 },
        lessonLastPracticed: {
          one: "2026-07-18T12:00:00.000Z",
          two: "2026-07-18T12:00:00.000Z",
        },
      }),
      lessons,
      new Date("2026-07-18T13:00:00.000Z"),
    );
    expect(result.kind).toBe("spaced");
    expect(result.lesson).toBeNull();
  });
});
