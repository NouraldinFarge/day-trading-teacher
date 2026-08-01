import { describe, expect, it } from "vitest";
import { calculateXp, dailyMissions, engagementLevel } from "./engagement";
import { defaultProfile } from "../state/AppStateContext";
import type { AppState, Trade } from "./types";

const state: AppState = {
  schemaVersion: 1,
  onboardingComplete: true,
  profile: defaultProfile,
  plans: [
    {
      id: "p",
      symbol: "SPY",
      side: "long",
      setup: "Test",
      thesis: "",
      entry: "1",
      stop: ".9",
      target: "",
      maximumRisk: "10",
      slippagePerUnit: "0",
      plannedQuantity: 100,
      plannedRisk: "10",
      noTradeConditions: "",
      createdAt: "2026-07-16T12:00:00",
      lockedAt: null,
    },
  ],
  trades: [],
  customLessonPlans: [],
  progress: {
    completedLessonIds: ["one"],
    practiceAttempts: 2,
    lessonConfidence: { one: 2 },
    lessonActivityByDate: { "2026-07-16": 1 },
  },
};

describe("engagement", () => {
  it("awards transparent process XP", () => {
    expect(calculateXp(state)).toBe(250);
    expect(engagementLevel(250).name).toBe("Intentional Planner");
  });

  it("does not award reflection XP before a journal review is complete", () => {
    const pendingTrade = { journal: { status: "needs_review" } } as Trade;
    expect(calculateXp({ ...state, trades: [pendingTrade] })).toBe(250);
  });

  it("builds predictable daily missions", () => {
    const missions = dailyMissions(state, new Date("2026-07-16T18:00:00"));
    expect(missions.map((mission) => mission.complete)).toEqual([
      true,
      true,
      false,
    ]);
  });
});
