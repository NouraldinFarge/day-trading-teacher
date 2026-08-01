import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import lessonPlan from "../../../../../../content/lesson-plans/trading-records-deliberate-execution-v2.dtlesson.json";
import type { CustomLessonPlan, Progress } from "../../domain/types";
import type { ReviewableLessonPlan } from "../../domain/bundled-lesson-plans";
import { ImportedLessonLibrary } from "./ImportedLessonLibrary";

const installedPlan = {
  ...lessonPlan,
  importedAt: "2026-07-21T12:00:00.000Z",
  fileHash: "a".repeat(64),
} as CustomLessonPlan;

const progress: Progress = {
  completedLessonIds: ["records-20260717-evidence-clock"],
  practiceAttempts: 1,
  lessonMastery: {
    "records-20260717-evidence-clock": {
      lessonVersion: "2.0.0",
      attempts: 1,
      lastPracticedAt: "2026-07-21T12:00:00.000Z",
      objectiveChecks: 3,
      firstTryCorrect: 2,
      correctionsCompleted: 1,
      bestFirstTryPercent: 67,
    },
  },
};

describe("ImportedLessonLibrary", () => {
  it("keeps an imported plan grouped with progress, quality, and app missions", () => {
    render(
      <ImportedLessonLibrary
        plans={[installedPlan]}
        progress={progress}
        onOpenLesson={vi.fn()}
        onRemovePlan={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: installedPlan.title }),
    ).toBeInTheDocument();
    expect(screen.getByText("1/8")).toBeInTheDocument();
    expect(screen.getByText("270")).toBeInTheDocument();
    expect(screen.getByText("24", { selector: "strong" })).toBeInTheDocument();
    expect(
      screen.getByText("Deliberate-practice structure present"),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Chart Replay/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Decision Card/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Evidence Journal/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Learning Lab/).length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button", { name: `Remove ${installedPlan.title}` }),
    ).toHaveLength(1);
  });

  it("offers an explicit review when a newer included plan is available", () => {
    const reviewUpdate = vi.fn();
    render(
      <ImportedLessonLibrary
        plans={[{ ...installedPlan, version: "1.0.0" }]}
        progress={{ completedLessonIds: [], practiceAttempts: 0 }}
        availableUpdates={[lessonPlan as ReviewableLessonPlan]}
        onOpenLesson={vi.fn()}
        onRemovePlan={vi.fn()}
        onReviewUpdate={reviewUpdate}
      />,
    );

    screen.getByRole("button", { name: "Review v3.0.0 update" }).click();
    expect(reviewUpdate).toHaveBeenCalledWith(lessonPlan);
  });
});
