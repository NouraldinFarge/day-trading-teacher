import { describe, expect, it } from "vitest";
import {
  createGuidedSampleData,
  inferMarketDataSymbol,
  parseMarketDataCsv,
} from "./market-data";

describe("historical market data", () => {
  it("parses chronological OHLCV data and reports invalid rows", () => {
    const result = parseMarketDataCsv(`Date,Open,High,Low,Close,Volume
2026-01-02,100,104,99,103,1000
2026-01-03,103,102,100,101,900
2026-01-05,103,105,102,104,1100
2026-01-06,104,106,103,105,1200`);
    expect(result.bars).toHaveLength(3);
    expect(result.skippedRows).toBe(1);
    expect(result.timeframe).toBe("1d");
    expect(result.bars[0].close).toBe(103);
  });

  it("creates a clearly labeled deterministic practice dataset", () => {
    const sample = createGuidedSampleData();
    expect(sample.sourceType).toBe("sample");
    expect(sample.symbol).toBe("DEMO");
    expect(sample.bars).toHaveLength(220);
    expect(
      sample.bars.every(
        (bar) =>
          bar.high >= Math.max(bar.open, bar.close) &&
          bar.low <= Math.min(bar.open, bar.close),
      ),
    ).toBe(true);
  });

  it("detects a symbol from Fidelity-style filenames and reports source studies", () => {
    const raw = `Date,Open,High,Low,Close,Volume,"MACD macd (12,26,9)",VWAP VWAP
2026-07-27T12:10:00.000Z,7.06,7.14,6.95,6.99,77997,-0.0804,7.03
2026-07-27T12:11:00.000Z,6.98,7.00,6.91,6.93,23877,-0.0844,7.03
2026-07-27T12:12:00.000Z,6.96,6.97,6.91,6.92,9947,-0.0877,7.03`;
    const parsed = parseMarketDataCsv(raw);

    expect(
      inferMarketDataSymbol(
        "DFNS (20260727101100000 _ 20260727071000000).csv",
        raw,
      ),
    ).toBe("DFNS");
    expect(parsed.timeframe).toBe("1m");
    expect(parsed.indicatorColumns).toEqual([
      "MACD macd (12,26,9)",
      "VWAP VWAP",
    ]);
    expect(parsed.discontinuityCount).toBe(0);
  });
});
