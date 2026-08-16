import { describe, expect, it } from "vitest";
import { performanceMetrics } from "./journal-analytics";
import { guidedJournalSample } from "./guided-journal-sample";

describe("guided journal sample", () => {
  it("provides a bounded, mixed, explicitly synthetic practice history", () => {
    const trades = guidedJournalSample();
    const metrics = performanceMetrics(trades, 10_000);

    expect(trades).toHaveLength(12);
    expect(
      new Set(trades.map((trade) => trade.occurredAt.slice(0, 10))).size,
    ).toBe(12);
    expect(trades.every((trade) => trade.notes.includes("Synthetic"))).toBe(
      true,
    );
    expect(
      trades.filter((trade) => Number(trade.netPnl) < 0).length,
    ).toBeGreaterThan(0);
    expect(
      trades.filter((trade) => trade.journal?.status === "needs_review"),
    ).toHaveLength(2);
    expect(metrics.tradeCount).toBe(12);
    expect(metrics.maximumDrawdown).toBeGreaterThan(0);
  });
});
