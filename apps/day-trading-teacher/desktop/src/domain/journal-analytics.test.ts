import { describe, expect, it } from "vitest";
import type { Trade } from "./types";
import {
  calendarDays,
  generatedInsights,
  performanceBreakdown,
  performanceMetrics,
  performanceSeries,
} from "./journal-analytics";

function trade(id: string, pnl: number, day: number, symbol = "SPY"): Trade {
  return {
    id,
    symbol,
    side: "long",
    entry: "10",
    exit: "11",
    quantity: "1",
    fees: "0",
    planId: day % 2 ? "plan" : null,
    followedPlan: day % 2 === 1,
    respectedStop: true,
    notes: "",
    occurredAt: `2026-07-${String(day).padStart(2, "0")}T15:00:00.000Z`,
    grossPnl: String(pnl),
    netPnl: String(pnl),
    rMultiple: null,
    review: {
      processClassification: "adequate",
      outcome: pnl > 0 ? "profitable" : "losing",
      processScore: 70,
      dataQuality: "complete",
      strength: "",
      primaryCorrection: "",
      evidence: [],
      assignedLessonId: "x",
    },
    journal: {
      status: "reviewed",
      setup: "Pullback",
      marketContext: "",
      entryReason: "",
      exitReason: "",
      whatWentWell: "",
      whatToImprove: "",
      emotionBefore: "calm",
      emotionAfter: "neutral",
      focusRating: 4,
      tags: day === 2 ? ["chase"] : [],
      reviewedAt: `2026-07-${String(day).padStart(2, "0")}T16:00:00.000Z`,
    },
  };
}

const trades = [
  trade("1", 100, 1),
  trade("2", -40, 2),
  trade("3", 20, 3, "QQQ"),
];

describe("journal analytics", () => {
  it("calculates outcome and process metrics without inventing missing risk data", () => {
    const metrics = performanceMetrics(trades, 10_000);
    expect(metrics.netPnl).toBe(80);
    expect(metrics.winRate).toBeCloseTo(66.67, 1);
    expect(metrics.expectancy).toBeCloseTo(26.67, 1);
    expect(metrics.maximumDrawdown).toBe(40);
    expect(metrics.reflectionRate).toBe(100);
  });

  it("builds cumulative series, calendar days, and breakdowns", () => {
    expect(performanceSeries(trades, "month", 10_000).at(-1)).toMatchObject({
      cumulativePnl: 80,
      equity: 10_080,
    });
    expect(calendarDays(trades).get("2026-07-02")).toMatchObject({
      notable: ["Chase tag recorded"],
      ruleEvidence: 0,
      ruleAdherent: 0,
    });
    expect(performanceBreakdown(trades, "symbol")[0]).toMatchObject({
      key: "SPY",
      trades: 2,
      pnl: 60,
    });
  });

  it("keeps generated insights descriptive rather than predictive", () => {
    expect(
      generatedInsights(trades, 10_000)
        .map((insight) => insight.body)
        .join(" "),
    ).not.toMatch(/will|guarantee|signal/i);
  });
});
