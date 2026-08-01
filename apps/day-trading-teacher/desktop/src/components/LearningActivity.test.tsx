import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActivityCalendar } from "./LearningActivity";
import type { Progress } from "../domain/types";

const progress: Progress = {
  completedLessonIds: ["lesson-one", "lesson-two", "lesson-three"],
  practiceAttempts: 5,
  lessonConfidence: { "lesson-one": 3, "lesson-two": 2, "lesson-three": 2 },
  lessonActivityByDate: { "2026-07-14": 1, "2026-07-15": 2, "2026-07-16": 1 },
  toolActivityByDate: { "2026-07-16": 1 },
};

describe("learning activity", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders a one-year lesson calendar with rhythm feedback", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 16, 12));
    render(<ActivityCalendar progress={progress} />);
    expect(screen.getAllByRole("gridcell")).toHaveLength(364);
    expect(screen.getByText("3 day current rhythm")).toBeInTheDocument();
    expect(screen.getByText("3 of 3 days")).toBeInTheDocument();
    expect(
      screen.getByRole("gridcell", {
        name: "Jul 16, 2026: 2 learning practices",
      }),
    ).toBeInTheDocument();
  });
});
