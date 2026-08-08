import { describe, expect, it } from "vitest";
import { defaultState } from "./AppStateContext";
import { validateAppState } from "./app-state-validation";

describe("app state validation", () => {
  it("accepts the complete current state shape", () => {
    expect(validateAppState(structuredClone(defaultState))).toMatchObject({
      valid: true,
    });
  });

  it("validates the standalone workspace preference", () => {
    const damaged = structuredClone(defaultState) as unknown as {
      profile: Record<string, unknown>;
    };
    damaged.profile.standaloneTools = "yes";
    expect(validateAppState(damaged)).toMatchObject({ valid: false });
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
