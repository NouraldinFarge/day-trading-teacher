import { describe, expect, it } from "vitest";
import {
  chartTemplate,
  isIntradayTimeframe,
  isRegularMarketTimestamp,
  normalizedComparisonSeries,
} from "./chart-workspace";

describe("chart workspace", () => {
  it("applies deliberate learning templates", () => {
    expect(chartTemplate("momentum")).toMatchObject({
      windowSize: 50,
      preferences: {
        templateId: "momentum",
        lowerStudy: "rsi",
        overlays: { ema: true, vwap: true, bollinger: true },
      },
    });
  });

  it("identifies the regular New York market session across DST", () => {
    expect(isRegularMarketTimestamp("2026-07-21T13:30:00.000Z")).toBe(true);
    expect(isRegularMarketTimestamp("2026-07-21T19:59:00.000Z")).toBe(true);
    expect(isRegularMarketTimestamp("2026-07-21T20:00:00.000Z")).toBe(false);
    expect(isRegularMarketTimestamp("2026-01-21T14:29:00.000Z")).toBe(false);
    expect(isRegularMarketTimestamp("2026-01-21T14:30:00.000Z")).toBe(true);
  });

  it("recognizes compact and descriptive intraday timeframes", () => {
    expect(isIntradayTimeframe("1m")).toBe(true);
    expect(isIntradayTimeframe("5 min")).toBe(true);
    expect(isIntradayTimeframe("1 hour")).toBe(true);
    expect(isIntradayTimeframe("intraday custom")).toBe(true);
    expect(isIntradayTimeframe("1d")).toBe(false);
    expect(isIntradayTimeframe("weekly")).toBe(false);
  });

  it("normalizes comparison performance only at shared timestamps", () => {
    const primary = [
      { timestamp: "a", open: 1, high: 1, low: 1, close: 1, volume: 1 },
      { timestamp: "b", open: 1, high: 1, low: 1, close: 1, volume: 1 },
      { timestamp: "c", open: 1, high: 1, low: 1, close: 1, volume: 1 },
    ];
    const comparison = [
      { timestamp: "a", open: 10, high: 10, low: 10, close: 10, volume: 1 },
      { timestamp: "c", open: 12, high: 12, low: 12, close: 12, volume: 1 },
    ];
    expect(normalizedComparisonSeries(primary, comparison)).toEqual([
      0,
      null,
      20,
    ]);
  });
});
