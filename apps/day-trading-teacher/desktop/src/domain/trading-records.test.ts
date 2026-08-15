import { describe, expect, it } from "vitest";
import {
  analyzeTradingRecordsScan,
  marketDataSetForTradingRecord,
  type TradingRecordsScanInput,
} from "./trading-records";

const orders = `"Orders
All Accounts"

Symbol,Action,Amount,Order Type,Status,Filled,Order Time,Account
VEEE,Buy,10,Market,Filled at $5,10 / 10,9:30:10 AM ET Jul-16-2026,Individual *0000
VEEE,Sell,2,Market,Filled at $5.25,2 / 2,9:32:10 AM ET Jul-16-2026,Individual *0000
Disclosure`;

const chart = `"Date","Open","High","Low","Close","Volume","VWAP"
"2026-07-16T13:30:00.000Z","5","5.10","4.95","5.05","1000","5.02"
"2026-07-16T13:31:00.000Z","5.05","5.30","5.01","5.25","2000","5.12"
"2026-07-16T13:32:00.000Z","5.25","5.35","5.20","5.30","1500","5.19"
"2026-07-16T13:33:00.000Z","5.30","5.32","5.18","5.20","1200","5.20"`;

export function tradingRecordsFixture(): TradingRecordsScanInput {
  return {
    files: [
      {
        name: "Orders_All_Accounts.csv",
        relativePath: "2026-07-16\\Orders_All_Accounts.csv",
        modifiedAt: 1,
        sizeBytes: orders.length,
        kind: "orders",
        folderDate: "2026-07-16",
        content: orders,
      },
      {
        name: "VEEE (export).csv",
        relativePath: "2026-07-16\\VEEE (export).csv",
        modifiedAt: 2,
        sizeBytes: chart.length,
        kind: "chart",
        folderDate: "2026-07-16",
        content: chart,
      },
    ],
    discoveredCsvCount: 3,
    unsupportedCsvCount: 1,
    oversizedCsvCount: 0,
    unreadableCsvCount: 0,
    truncatedCsvCount: 0,
    totalBytes: orders.length + chart.length,
    warnings: [],
  };
}

describe("Trading Records evidence analysis", () => {
  it("reads Orders and chart exports across the dated folder and pairs them", () => {
    const analysis = analyzeTradingRecordsScan(
      tradingRecordsFixture(),
      "2026-08-15T12:00:00.000Z",
    );

    expect(analysis).toMatchObject({
      orderFileCount: 1,
      chartFileCount: 1,
      unsupportedCsvCount: 1,
    });
    expect(analysis.days).toHaveLength(1);
    expect(analysis.days[0]).toMatchObject({
      date: "2026-07-16",
      orderCount: 2,
      reconstructedTradeCount: 1,
      chartMatchedTradeCount: 1,
      observedBuyDollars: 10,
      calculatedSellProceeds: 10.5,
      calculatedNetCashFlow: 0.5,
    });
    const trade = analysis.trades[0];
    expect(trade.quantityBasis).toBe("dollar_filled");
    expect(analysis.chartContextByTrade[trade.sourceId]).toMatchObject({
      available: true,
      dayHigh: 5.35,
      dayLow: 4.95,
    });
    expect(JSON.stringify(analysis)).not.toContain("Individual *0000");
  });

  it("creates an on-demand one-day chart dataset without storing the root path", () => {
    const analysis = analyzeTradingRecordsScan(tradingRecordsFixture());
    const dataSet = marketDataSetForTradingRecord(
      analysis.chartSessions[0],
      1,
      "2026-08-15T12:00:00.000Z",
    );

    expect(dataSet).toMatchObject({
      id: "fidelity-record:2026-07-16:VEEE",
      symbol: "VEEE",
      timeframe: "1m",
      sourceFile: "2026-07-16\\VEEE (export).csv",
    });
    expect(dataSet.bars).toHaveLength(4);
  });
});
