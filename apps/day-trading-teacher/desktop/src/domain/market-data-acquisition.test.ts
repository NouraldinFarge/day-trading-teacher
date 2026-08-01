import { describe, expect, it } from "vitest";
import {
  addAcquisitionSubscription,
  createProviderMarketDataSet,
  normalizeMarketSymbol,
  providerRefreshMinutes,
} from "./market-data-acquisition";

const csv = `timestamp,open,high,low,close,volume
2026-07-16,98,101,97,100,1400000
2026-07-17,100,104,99,103,1500000
2026-07-18,103,105,102,104,1700000`;

describe("market data acquisition", () => {
  it("creates a stable replaceable provider dataset", () => {
    const first = createProviderMarketDataSet(
      "massive",
      " spy ",
      csv,
      "daily",
      "2026-07-18T12:00:00.000Z",
    );
    const second = createProviderMarketDataSet(
      "massive",
      "SPY",
      csv,
      "daily",
      "2026-07-18T13:00:00.000Z",
    );
    expect(first.id).toBe(second.id);
    expect(first.symbol).toBe("SPY");
    expect(first.sourceType).toBe("provider");
    expect(first.bars).toHaveLength(3);
    const minute = createProviderMarketDataSet(
      "massive",
      "SPY",
      csv
        .replaceAll("2026-07-16", "2026-07-18 09:30:00")
        .replaceAll("2026-07-17", "2026-07-18 09:31:00")
        .replaceAll("2026-07-18,", "2026-07-18 09:32:00,"),
      "1min",
    );
    expect(minute.id).toBe("provider-massive-spy-1min");
    expect(minute.timeframe).toBe("1m");
    expect(minute.bars[0].timestamp).toBe("2026-07-18T13:30:00.000Z");
    expect(minute.id).not.toBe(first.id);
  });

  it("validates and de-duplicates a bounded watchlist", () => {
    expect(normalizeMarketSymbol("brk.b")).toBe("BRK.B");
    expect(() => normalizeMarketSymbol("SPY/USD")).toThrow(/valid symbol/);
    const watched = addAcquisitionSubscription([], "massive", "SPY", "1min");
    expect(watched).toEqual([
      { provider: "massive", symbol: "SPY", interval: "1min" },
    ]);
    expect(
      addAcquisitionSubscription(watched, "alpaca", "SPY", "1min"),
    ).toHaveLength(2);
    expect(
      addAcquisitionSubscription(watched, "massive", "spy", "1min"),
    ).toEqual(watched);
    expect(() =>
      addAcquisitionSubscription(
        [
          { provider: "massive", symbol: "A", interval: "1min" },
          { provider: "massive", symbol: "B", interval: "1min" },
          { provider: "alpaca", symbol: "C", interval: "daily" },
          { provider: "tradier", symbol: "D", interval: "1min" },
          { provider: "alpha_vantage", symbol: "E", interval: "daily" },
        ],
        "massive",
        "F",
        "1min",
      ),
    ).toThrow(/limited to 5/);
    expect(providerRefreshMinutes("massive", "1min")).toBe(1440);
    expect(providerRefreshMinutes("tradier", "1min")).toBe(15);
  });
});
