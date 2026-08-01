import type { Lesson, Progress } from "./types";

export type LessonPracticeRecommendation =
  | {
      kind: "review" | "new";
      lesson: Lesson;
      reason: string;
      nextDueAt: null;
    }
  | {
      kind: "spaced";
      lesson: null;
      reason: string;
      nextDueAt: string | null;
    };

const intervalByConfidence = { 1: 1, 2: 3, 3: 7 } as const;

function dueAt(lastPracticedAt: string, confidence: 1 | 2 | 3) {
  const due = new Date(lastPracticedAt);
  due.setDate(due.getDate() + intervalByConfidence[confidence]);
  return due;
}

export function recommendLessonPractice(
  progress: Progress,
  lessons: Lesson[],
  now = new Date(),
): LessonPracticeRecommendation {
  const completed = new Set(progress.completedLessonIds);
  const reviews = lessons
    .filter((lesson) => completed.has(lesson.lesson_id))
    .map((lesson) => {
      const last = progress.lessonLastPracticed?.[lesson.lesson_id];
      const confidence = progress.lessonConfidence?.[lesson.lesson_id] ?? 2;
      return {
        lesson,
        due: last ? dueAt(last, confidence) : new Date(0),
        confidence,
      };
    })
    .sort((left, right) => left.due.getTime() - right.due.getTime());
  const dueReview = reviews.find((review) => review.due <= now);
  if (dueReview) {
    return {
      kind: "review",
      lesson: dueReview.lesson,
      reason:
        dueReview.confidence === 1
          ? "You marked this lesson uncertain. Retrieve it again after spacing before adding more complexity."
          : "This lesson is due for separated retrieval. Attempt it from memory before reopening the explanation.",
      nextDueAt: null,
    };
  }

  const nextNew = lessons.find((lesson) => !completed.has(lesson.lesson_id));
  if (nextNew) {
    return {
      kind: "new",
      lesson: nextNew,
      reason:
        "This is the next unpracticed lesson in the core sequence. Attempt the prompts before revealing guidance.",
      nextDueAt: null,
    };
  }

  const nextDue = reviews[0]?.due ?? null;
  return {
    kind: "spaced",
    lesson: null,
    reason:
      "No lesson is due. Spacing protects retrieval effort; use a short lab or stop for today.",
    nextDueAt: nextDue?.toISOString() ?? null,
  };
}
