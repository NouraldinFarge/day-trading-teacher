import { describe, expect, it } from "vitest";
import { builtInLessons } from "./builtin-lessons";
import {
  hasAuthoredLessonRationale,
  lessonRationaleFor,
} from "./lesson-rationale";

const bundledImportedLessonIds = [
  "records-20260717-evidence-clock",
  "records-20260717-execution-friction",
  "records-20260717-fast-mover-gate",
  "records-20260717-reentry-reset",
  "records-20260717-exit-sentence",
  "records-20260717-process-review",
  "records-20260717-session-guardrail",
  "records-20260717-replay-lab",
  "v7-scope-entry-diagnostic",
  "v7-evidence-timeline",
  "v7-cash-settlement",
  "v7-margin-suitability",
  "v7-broker-ticket-rules",
  "v7-market-data-readiness",
  "v7-risk-boundary",
  "v7-setup-eligibility",
  "v7-strategy-evidence",
  "v7-decision-card",
  "v7-order-failure-modes",
  "v7-short-sale-gate",
  "v7-reset-session-stop",
  "v7-process-review",
  "v7-guided-replay",
  "v7-independent-capstone",
];

describe("lesson rationales", () => {
  it("gives every bundled core and imported lesson an authored reason to care", () => {
    const lessonIds = [
      ...builtInLessons.map((lesson) => lesson.lesson_id),
      ...bundledImportedLessonIds,
    ];
    expect(lessonIds).toHaveLength(33);
    for (const lessonId of lessonIds) {
      expect(hasAuthoredLessonRationale(lessonId)).toBe(true);
    }
  });

  it("keeps a useful fallback for newly imported plans", () => {
    expect(
      lessonRationaleFor({
        lesson_id: "external-lesson",
        objective: "Distinguish an observation from an interpretation.",
      }),
    ).toContain("observable practice");
  });
});
