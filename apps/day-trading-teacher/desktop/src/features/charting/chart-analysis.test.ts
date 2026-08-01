import { describe, expect, it } from "vitest";
import type { MarketBar } from "../../domain/types";
import {
  averageTrueRange,
  bollingerBands,
  compactVolume,
  exponentialMovingAverage,
  movingAverageConvergenceDivergence,
  relativeStrengthIndex,
  volumeWeightedAveragePrice,
} from "./chart-analysis";

const bars = (closes: number[]): MarketBar[] =>
  closes.map((close, index) => ({
    timestamp: new Date(Date.UTC(2026, 0, 1 + index)).toISOString(),
    open: close - 0.5,
    high: close + 1,
    low: close - 1,
    close,
    volume: 100 + index * 10,
  }));

describe("chart analysis", () => {
  it("builds seeded exponential averages and volatility bands", () => {
    const sample = bars([10, 11, 12, 13, 14]);
    expect(exponentialMovingAverage(sample, 3)).toEqual([
      null,
      null,
      11,
      12,
      13,
    ]);
    const bands = bollingerBands(sample, 3, 2);
    expect(bands.middle[2]).toBe(11);
    expect(bands.upper[2]).toBeCloseTo(12.633, 3);
    expect(bands.lower[2]).toBeCloseTo(9.367, 3);
  });

  it("calculates ATR, RSI, and volume-weighted price without future bars", () => {
    const sample = bars([10, 11, 12, 11, 13, 14]);
    expect(averageTrueRange(sample, 3)[2]).toBeCloseTo(2, 4);
    expect(relativeStrengthIndex(sample, 3)[3]).toBeCloseTo(66.667, 3);
    const vwap = volumeWeightedAveragePrice(sample, 3);
    expect(vwap[0]).toBeCloseTo(10, 3);
    expect(vwap[2]).not.toBeNull();
    expect(vwap[5]).toBeGreaterThan(vwap[2]!);
  });

  it("formats large volume without sacrificing small values", () => {
    expect(compactVolume(950)).toBe("950");
    expect(compactVolume(12_500)).toBe("12.5K");
    expect(compactVolume(2_500_000)).toBe("2.5M");
    expect(compactVolume(null)).toBe("—");
  });

  it("builds MACD, signal, and histogram without future values", () => {
    const sample = bars(Array.from({ length: 60 }, (_, index) => 100 + index));
    const result = movingAverageConvergenceDivergence(sample);
    expect(result.macd).toHaveLength(60);
    expect(result.signal).toHaveLength(60);
    expect(result.histogram).toHaveLength(60);
    expect(result.signal.slice(0, 33).every((value) => value === null)).toBe(
      true,
    );
    expect(result.macd.at(-1)).toBeGreaterThan(0);
    expect(result.signal.at(-1)).toBeGreaterThan(0);
  });
});
