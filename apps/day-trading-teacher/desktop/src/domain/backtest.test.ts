import { describe, expect, it } from "vitest";
import { runMovingAverageBacktest, type BacktestSettings } from "./backtest";
import type { MarketBar } from "./types";

const settings: BacktestSettings = {
  fastPeriod: 2,
  slowPeriod: 3,
  direction: "long",
  initialCapital: 10_000,
  riskPerTrade: 100,
  stopPercent: 20,
  rewardMultiple: 3,
  slippagePerShare: 0,
  feePerTrade: 0,
};
const bar = (
  day: number,
  open: number,
  high: number,
  low: number,
  close: number,
): MarketBar => ({
  timestamp: new Date(Date.UTC(2026, 0, day)).toISOString(),
  open,
  high,
  low,
  close,
  volume: 1000,
});

describe("moving-average backtest", () => {
  it("executes a confirmed signal at the next bar open rather than looking ahead", () => {
    const bars = [
      bar(1, 3, 3.5, 2.5, 3),
      bar(2, 2, 2.5, 1.5, 2),
      bar(3, 1, 1.5, 0.5, 1),
      bar(4, 4, 4.5, 3.5, 4),
      bar(5, 10, 11.5, 9.5, 11),
      bar(6, 11, 12, 10.5, 11.5),
    ];
    const result = runMovingAverageBacktest(bars, settings);
    expect(result.trades).toHaveLength(1);
    expect(result.trades[0].entryAt).toBe(bars[4].timestamp);
    expect(result.trades[0].entryPrice).toBe(10);
  });

  it("uses a conservative stop-first assumption when a bar touches stop and target", () => {
    const bars = [
      bar(1, 3, 3.5, 2.5, 3),
      bar(2, 2, 2.5, 1.5, 2),
      bar(3, 1, 1.5, 0.5, 1),
      bar(4, 4, 4.5, 3.5, 4),
      bar(5, 10, 13, 8, 11),
      bar(6, 11, 12, 10, 11),
    ];
    const result = runMovingAverageBacktest(bars, {
      ...settings,
      stopPercent: 10,
      rewardMultiple: 2,
    });
    expect(result.trades[0].exitReason).toBe("ambiguous_stop_first");
    expect(result.trades[0].exitPrice).toBe(9);
    expect(result.trades[0].netPnl).toBeLessThan(0);
  });
});
