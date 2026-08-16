import { describe, expect, it } from "vitest";
import { createDailySession } from "../domain/daily-session";
import { defaultState } from "./AppStateContext";
import { validateAppState } from "./app-state-validation";

describe("app state validation", () => {
  it("accepts the complete current state shape", () => {
    expect(validateAppState(structuredClone(defaultState))).toMatchObject({
      valid: true,
    });
  });

  it("accepts an active learning case before it has a completion timestamp", () => {
    const state = structuredClone(defaultState);
    state.learningCases = [
      {
        id: "learning-case-active",
        lessonId: "core-risk-boundary",
        lessonTitle: "Bound the thesis before the first buy",
        source: "core",
        status: "active",
        startedAt: "2026-08-15T12:00:00.000Z",
        updatedAt: "2026-08-15T12:00:00.000Z",
        evidenceLinks: [],
      },
    ];

    expect(validateAppState(state)).toMatchObject({ valid: true });
  });

  it("validates the standalone workspace preference", () => {
    const damaged = structuredClone(defaultState) as unknown as {
      profile: Record<string, unknown>;
    };
    damaged.profile.standaloneTools = "yes";
    expect(validateAppState(damaged)).toMatchObject({ valid: false });
  });

  it("accepts a bounded daily Session Guard and rejects unsafe limits", () => {
    const guarded = structuredClone(defaultState);
    guarded.dailySessions = [
      createDailySession(guarded.profile, { id: "daily-guard-test" }),
    ];
    expect(validateAppState(guarded)).toMatchObject({ valid: true });

    guarded.dailySessions[0].maxPaperTrades = 21;
    const result = validateAppState(guarded);
    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.errors.join(" ")).toContain(
        "dailySessions.0.maxPaperTrades",
      );
  });

  it("accepts bounded setup playbooks and rejects oversized evidence collections", () => {
    const state = structuredClone(defaultState);
    state.setupPlaybooks = [
      {
        id: "playbook-test",
        title: "Historical pullback study",
        market: "US equities",
        timeframe: "1 minute",
        contextRequirements: ["Known session"],
        confirmationRequirements: ["Observable confirmation"],
        trigger: "Written before reveal",
        invalidation: "Named structural boundary",
        liquidityRule: "Contemporaneous spread is known",
        disqualifiers: ["Missing data"],
        managementRule: "Use the locked exit architecture",
        reviewQuestions: ["Was the rule followed?"],
        reviewedExamples: 6,
        status: "practice_only",
        createdAt: "2026-08-13T12:00:00.000Z",
        updatedAt: "2026-08-13T12:00:00.000Z",
      },
    ];
    expect(validateAppState(state)).toMatchObject({ valid: true });

    state.setupPlaybooks[0].contextRequirements = Array.from(
      { length: 21 },
      (_, index) => `Rule ${index + 1}`,
    );
    const result = validateAppState(state);
    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.errors.join(" ")).toContain(
        "setupPlaybooks.0.contextRequirements",
      );
  });

  it("rejects structurally incomplete trade data before it can replace local records", () => {
    const invalid = structuredClone(defaultState) as unknown as {
      trades: unknown[];
    };
    invalid.trades = [{ id: "incomplete" }];
    const result = validateAppState(invalid);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.join(" ")).toContain("trades.0");
  });

  it("accepts legacy provider watchlists so migration can preserve them", () => {
    const legacy = structuredClone(defaultState) as unknown as {
      chartAcquisition: Record<string, unknown>;
    };
    delete legacy.chartAcquisition.subscriptions;
    delete legacy.chartAcquisition.provider;
    legacy.chartAcquisition.symbols = ["SPY"];
    expect(validateAppState(legacy)).toMatchObject({ valid: true });
  });

  it("rejects damaged spaced-recall records before restore", () => {
    const damaged = structuredClone(defaultState) as unknown as {
      progress: Record<string, unknown>;
    };
    damaged.progress.conceptRecall = {
      invalidation: {
        strength: 9,
        attempts: -1,
        lastReviewedAt: "not-a-date",
        nextReviewAt: "not-a-date",
        lastRating: "perfect",
      },
    };
    expect(validateAppState(damaged)).toMatchObject({ valid: false });
  });

  it("rejects credential-shaped fields even inside future state extensions", () => {
    const unsafe = structuredClone(defaultState) as unknown as Record<
      string,
      unknown
    >;
    unsafe.futureProvider = { accessToken: "must-stay-local" };
    const result = validateAppState(unsafe);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.join(" ")).toMatch(/credentials/i);
  });
});
