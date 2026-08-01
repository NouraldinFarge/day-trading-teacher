import { describe, expect, it } from "vitest";
import {
  achievementDefinitions,
  achievementXp,
  evaluateAchievements,
} from "./achievements";
import type { AppState, Trade } from "./types";

function stateWith(trades: Trade[]): AppState {
  return { trades, achievementUnlocks: {} } as AppState;
}

function reviewedTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: "trade-1",
    symbol: "SPY",
    side: "long",
    entry: "100",
    exit: "99",
    quantity: "1",
    fees: "0",
    planId: "plan-1",
    followedPlan: true,
    respectedStop: true,
    notes: "",
    occurredAt: "2026-07-15T15:00:00.000Z",
    grossPnl: "-1",
    netPnl: "-1",
    rMultiple: "-0.5",
    review: {
      processClassification: "strong",
      outcome: "losing",
      processScore: 90,
      dataQuality: "complete",
      strength: "Waited",
      primaryCorrection: "",
      evidence: [],
      assignedLessonId: "risk",
    },
    journal: {
      status: "reviewed",
      setup: "Opening pullback",
      marketContext: "Balanced",
      entryReason: "Planned test",
      exitReason: "Invalidated",
      whatWentWell: "Respected risk",
      whatToImprove: "Keep the same observable exit process.",
      emotionBefore: "calm",
      emotionAfter: "calm",
      focusRating: 5,
      tags: [],
      reviewedAt: "2026-07-15T16:00:00.000Z",
    },
    ...overrides,
  };
}

describe("achievement system", () => {
  it("covers every tier and category with stable unique identifiers", () => {
    expect(new Set(achievementDefinitions.map((item) => item.id)).size).toBe(
      achievementDefinitions.length,
    );
    expect(new Set(achievementDefinitions.map((item) => item.tier))).toEqual(
      new Set(["Bronze", "Silver", "Gold", "Platinum", "Diamond"]),
    );
    expect(
      new Set(achievementDefinitions.map((item) => item.category)).size,
    ).toBe(9);
    expect(
      achievementDefinitions.every(
        (item) =>
          item.purpose &&
          item.achievementType &&
          item.criteriaVersion &&
          item.actionPath,
      ),
    ).toBe(true);
  });

  it("recognizes separated lesson evidence without rewarding same-day repetition", () => {
    const state = stateWith([]);
    state.progress = {
      completedLessonIds: ["builtin-tr-002"],
      practiceAttempts: 3,
      lessonMastery: {
        "builtin-tr-002": {
          lessonVersion: "3.0.0",
          attempts: 3,
          lastPracticedAt: "2026-07-21T12:00:00.000Z",
          objectiveChecks: 2,
          firstTryCorrect: 2,
          correctionsCompleted: 0,
          bestFirstTryPercent: 100,
          practiceDays: ["2026-07-20", "2026-07-20", "2026-07-21"],
          totalCorrectionsCompleted: 1,
        },
      },
    };
    const result = evaluateAchievements(state);
    expect(result.find((item) => item.id === "learn-first-pass")).toMatchObject(
      { current: 1, unlocked: true },
    );
    expect(
      result.find((item) => item.id === "learn-evidence-cartographer"),
    ).toMatchObject({ current: 2, target: 2, unlocked: true });
    expect(
      result.find((item) => item.id === "learn-correction-courage"),
    ).toMatchObject({ current: 1, unlocked: true });
    expect(
      result.find((item) => item.id === "learn-spaced-evidence"),
    ).toMatchObject({ current: 1, unlocked: false });
    expect(
      result.find((item) => item.id === "learn-retained-reasoning"),
    ).toMatchObject({ current: 1, unlocked: false });
  });

  it("requires four separated capstone dates for its lesson artifact", () => {
    const state = stateWith([]);
    state.progress = {
      completedLessonIds: ["builtin-capstone-001"],
      practiceAttempts: 3,
      lessonMastery: {
        "builtin-capstone-001": {
          lessonVersion: "3.0.0",
          attempts: 6,
          lastPracticedAt: "2026-07-21T12:00:00.000Z",
          objectiveChecks: 2,
          firstTryCorrect: 2,
          correctionsCompleted: 0,
          bestFirstTryPercent: 100,
          practiceDays: ["2026-07-19", "2026-07-20", "2026-07-21"],
        },
      },
    };
    expect(
      evaluateAchievements(state).find(
        (item) => item.id === "learn-replay-integrator",
      ),
    ).toMatchObject({ current: 3, target: 4, unlocked: false });
  });

  it("does not advance current artifacts from guided completions below the lesson standard", () => {
    const state = stateWith([]);
    state.progress = {
      completedLessonIds: ["builtin-tr-002"],
      practiceAttempts: 2,
      lessonMastery: {
        "builtin-tr-002": {
          lessonVersion: "4.0.0",
          attempts: 2,
          lastPracticedAt: "2026-07-22T12:00:00.000Z",
          objectiveChecks: 3,
          firstTryCorrect: 1,
          correctionsCompleted: 2,
          bestFirstTryPercent: 33,
          practiceDays: ["2026-07-21", "2026-07-22"],
          standardPracticeDays: [],
        },
      },
    };
    expect(
      evaluateAchievements(state).find(
        (item) => item.id === "learn-evidence-cartographer",
      ),
    ).toMatchObject({ current: 0, target: 2, unlocked: false });
  });

  it("does not treat an unjournaled import as a completed reflection", () => {
    const unreviewed = reviewedTrade({ journal: undefined });
    expect(
      evaluateAchievements(stateWith([unreviewed])).find(
        (item) => item.id === "journal-1",
      )?.unlocked,
    ).toBe(false);
  });

  it("keeps an earned achievement unlocked when later edits reduce its current metric", () => {
    const state = stateWith([]);
    state.achievementUnlocks = { "journal-1": "2026-07-15T16:00:00.000Z" };
    const achievement = evaluateAchievements(state).find(
      (item) => item.id === "journal-1",
    );
    expect(achievement).toMatchObject({
      unlocked: true,
      progress: 100,
      current: 0,
    });
  });

  it("unlocks process-positive surprises while keeping profitability XP neutral", () => {
    const state = stateWith([reviewedTrade()]);
    expect(
      evaluateAchievements(state).find((item) => item.id === "hidden-good-loss")
        ?.unlocked,
    ).toBe(true);
    const positive = Array.from({ length: 5 }, (_, index) =>
      reviewedTrade({ id: `winner-${index}`, netPnl: "10", grossPnl: "10" }),
    );
    const result = evaluateAchievements(stateWith(positive));
    expect(result.find((item) => item.id === "expectancy-5")?.unlocked).toBe(
      true,
    );
    expect(result.find((item) => item.id === "expectancy-5")?.rewardXp).toBe(0);
    expect(achievementXp(stateWith(positive))).toBe(
      result
        .filter((item) => item.unlocked)
        .reduce((sum, item) => sum + item.rewardXp, 0),
    );
  });
});
