import { describe, expect, it } from "vitest";
import type { AppState } from "../domain/types";
import { normalizeAppState } from "./state-migration";

const fallback: AppState = {
  schemaVersion: 1,
  onboardingComplete: false,
  profile: {
    displayName: "Learner",
    experience: "beginner",
    broker: "Fidelity",
    accountType: "paper",
    maxRiskPerTrade: "25",
    dailyLossLimit: "75",
    studyMinutes: 20,
    plainLanguage: true,
    reducedMotion: false,
    theme: "system",
    startingBalance: "10000",
  },
  plans: [],
  trades: [],
  customLessonPlans: [],
  progress: { completedLessonIds: [], practiceAttempts: 0 },
  fidelityImport: {
    folderPath: "",
    autoScan: false,
    lastScanAt: null,
    lastFileKey: null,
  },
  chartAcquisition: {
    provider: "massive",
    subscriptions: [],
    autoRefresh: true,
    refreshIntervalHours: 24,
    intradayRefreshMinutes: 30,
    lastRefreshAt: null,
    lastDailyRefreshAt: null,
    lastOneMinuteRefreshAt: null,
    lastRefreshMessage: "",
  },
  journalGoals: [],
  journalDashboard: {
    defaultRange: "month",
    calendarMetric: "pnl",
    compactCards: false,
    visibleWidgets: ["performance"],
  },
  achievementUnlocks: {},
  marketDataSets: [],
};

describe("state migration", () => {
  it("opens legacy state without chart datasets and adds safe defaults", () => {
    const legacy = {
      ...fallback,
      marketDataSets: undefined,
      journalGoals: undefined,
      achievementUnlocks: undefined,
      chartAcquisition: {
        provider: "alpha_vantage" as const,
        symbols: ["SPY"],
        autoRefresh: true,
        refreshIntervalHours: 24,
        lastRefreshAt: "2026-07-18T12:00:00.000Z",
        lastRefreshMessage: "Daily chart refreshed.",
      },
    } as unknown as AppState;
    const migrated = normalizeAppState(legacy, fallback);
    const acquisition = migrated.chartAcquisition!;
    expect(migrated.marketDataSets).toEqual([]);
    expect(acquisition.subscriptions).toEqual([
      { provider: "alpha_vantage", symbol: "SPY", interval: "daily" },
    ]);
    expect(acquisition.lastDailyRefreshAt).toBe("2026-07-18T12:00:00.000Z");
    expect(acquisition.lastOneMinuteRefreshAt).toBeNull();
    expect(migrated.journalGoals).toEqual([]);
    expect(migrated.achievementUnlocks).toEqual({});
    expect(migrated.progress.lessonLastPracticed).toEqual({});
    expect(migrated.progress.toolPracticeAttempts).toBe(0);
    expect(migrated.progress.toolActivityByDate).toEqual({});
    expect(migrated.progress.conceptRecall).toEqual({});
    expect(migrated.profile.standaloneTools).toBe(false);
    expect(migrated.chartWorkspace).toMatchObject({
      templateId: "price_action",
      style: "candles",
      scaleMode: "linear",
      crosshair: true,
    });
  });

  it("preserves an explicitly enabled standalone workspace", () => {
    const stored = {
      ...fallback,
      profile: { ...fallback.profile, standaloneTools: true },
    };
    expect(normalizeAppState(stored, fallback).profile.standaloneTools).toBe(
      true,
    );
  });

  it("derives durable lesson evidence from a legacy mastery record", () => {
    const practicedAt = "2026-07-18T12:00:00.000Z";
    const legacy = {
      ...fallback,
      progress: {
        completedLessonIds: ["builtin-tr-002"],
        practiceAttempts: 1,
        lessonMastery: {
          "builtin-tr-002": {
            lessonVersion: "3.0.0",
            attempts: 1,
            lastPracticedAt: practicedAt,
            objectiveChecks: 2,
            firstTryCorrect: 1,
            correctionsCompleted: 1,
            bestFirstTryPercent: 50,
          },
        },
      },
    } as AppState;
    const migrated = normalizeAppState(legacy, fallback);
    expect(migrated.progress.lessonMastery?.["builtin-tr-002"]).toMatchObject({
      practiceDays: ["2026-07-18"],
      totalCorrectionsCompleted: 1,
    });
  });
});
