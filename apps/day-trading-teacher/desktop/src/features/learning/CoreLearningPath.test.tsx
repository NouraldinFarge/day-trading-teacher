import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { builtInLessons } from "../../domain/builtin-lessons";
import { corePathStages } from "../../domain/core-path";
import { evaluateAchievements } from "../../domain/achievements";
import { defaultState } from "../../state/AppStateContext";
import { CoreLearningPath } from "./CoreLearningPath";

afterEach(cleanup);

describe("CoreLearningPath", () => {
  it("shows the complete phased route and begins with evidence literacy", () => {
    const onOpen = vi.fn();
    render(
      <CoreLearningPath
        lessons={builtInLessons}
        completedLessonIds={[]}
        onOpen={onOpen}
      />,
    );

    expect(screen.getByText("Evidence before story")).toBeInTheDocument();
    expect(screen.getByText("No trade is success")).toBeInTheDocument();
    for (const stage of corePathStages)
      expect(
        screen.getByRole("heading", { name: stage.title }),
      ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 4,
        name: "Reconstruct before you judge",
      }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Begin next lesson" }));
    expect(onOpen).toHaveBeenCalledWith(builtInLessons[0]);
  });

  it("advances its recommendation after a practiced lesson", () => {
    render(
      <CoreLearningPath
        lessons={builtInLessons}
        completedLessonIds={[builtInLessons[0].lesson_id]}
        onOpen={vi.fn()}
      />,
    );

    expect(screen.getByText("Next · Phase 2 of 6")).toBeInTheDocument();
    expect(screen.getAllByText("Practiced").length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Know the account before the setup",
      }),
    ).toBeInTheDocument();
  });

  it("makes each lesson artifact and exact spaced-practice progress visible", () => {
    const state = structuredClone(defaultState);
    state.progress.lessonMastery = {
      "builtin-tr-002": {
        lessonVersion: "3.0.0",
        attempts: 1,
        lastPracticedAt: "2026-07-21T12:00:00.000Z",
        objectiveChecks: 2,
        firstTryCorrect: 1,
        correctionsCompleted: 1,
        bestFirstTryPercent: 50,
        practiceDays: ["2026-07-21"],
        totalCorrectionsCompleted: 1,
      },
    };
    const lessonAchievements = Object.fromEntries(
      evaluateAchievements(state)
        .filter((achievement) => achievement.lessonId)
        .map((achievement) => [achievement.lessonId!, achievement]),
    );
    render(
      <CoreLearningPath
        lessons={builtInLessons}
        completedLessonIds={["builtin-tr-002"]}
        lessonMastery={state.progress.lessonMastery}
        lessonAchievements={lessonAchievements}
        onOpen={vi.fn()}
      />,
    );

    expect(screen.getByText("Evidence Cartographer")).toBeInTheDocument();
    expect(screen.getByText(/1\/2 practice dates/)).toBeInTheDocument();
    expect(screen.getByText("Replay Integrator")).toBeInTheDocument();
    expect(screen.getByText(/0\/4 practice dates/)).toBeInTheDocument();
  });
});
