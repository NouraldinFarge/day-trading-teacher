import { describe, expect, it } from "vitest";
import type { MarketBar } from "./types";
import {
  cancelPaperOrder,
  createPaperTradingSession,
  finishPaperSession,
  paperSessionMetrics,
  processPaperBar,
  requestPaperClose,
  submitPaperEntry,
} from "./paper-trading";

const bars: MarketBar[] = [
  {
    timestamp: "2026-01-02T15:30:00.000Z",
    open: 100,
    high: 101,
    low: 99,
    close: 100,
    volume: 1_000,
  },
  {
    timestamp: "2026-01-02T15:31:00.000Z",
    open: 100,
    high: 100.8,
    low: 99.5,
    close: 100.5,
    volume: 1_100,
  },
  {
    timestamp: "2026-01-02T15:32:00.000Z",
    open: 100.2,
    high: 102,
    low: 98.5,
    close: 101,
    volume: 1_200,
  },
  {
    timestamp: "2026-01-02T15:33:00.000Z",
    open: 101,
    high: 102,
    low: 100.5,
    close: 101.5,
    volume: 1_300,
  },
];

function session() {
  return createPaperTradingSession({
    dataSetId: "spy-1m",
    symbol: "SPY",
    timeframe: "1m",
    replayIndex: 0,
    defaults: {
      startingBalance: 10_000,
      maxRiskPerTrade: 100,
      dailyLossLimit: 300,
      slippagePerShare: 0.01,
      commissionPerOrder: 0,
    },
    at: bars[0].timestamp,
  });
}

describe("paper trading", () => {
  it("fills a market entry only when the next bar is revealed", () => {
    const queued = submitPaperEntry(
      session(),
      {
        side: "long",
        orderType: "market",
        quantity: 10,
        stopPrice: 98,
        targetPrice: 103,
      },
      bars[0],
      0,
      bars[0].timestamp,
    );
    expect(queued.position).toBeNull();
    expect(queued.pendingOrder?.action).toBe("open_long");

    const filled = processPaperBar(queued, bars[1], 1, bars[1].timestamp);
    expect(filled.pendingOrder).toBeNull();
    expect(filled.position).toMatchObject({
      side: "long",
      quantity: 10,
      entryPrice: 100.01,
      entryBarIndex: 1,
    });
    expect(paperSessionMetrics(filled, 100.5).unrealizedPnl).toBeCloseTo(4.9);
  });

  it("keeps a limit order pending until its price trades", () => {
    const queued = submitPaperEntry(
      session(),
      {
        side: "long",
        orderType: "limit",
        quantity: 10,
        limitPrice: 99,
        stopPrice: 97,
        targetPrice: 103,
      },
      bars[0],
      0,
    );
    const stillPending = processPaperBar(queued, bars[1], 1);
    expect(stillPending.pendingOrder).not.toBeNull();
    expect(stillPending.position).toBeNull();

    const filled = processPaperBar(stillPending, bars[2], 2);
    expect(filled.pendingOrder).toBeNull();
    expect(filled.position?.entryPrice).toBe(99);
  });

  it("uses the protective stop first when stop and target share a bar", () => {
    const queued = submitPaperEntry(
      session(),
      {
        side: "long",
        orderType: "market",
        quantity: 10,
        stopPrice: 99,
        targetPrice: 101,
      },
      bars[0],
      0,
    );
    const closed = processPaperBar(queued, bars[2], 2);
    expect(closed.position).toBeNull();
    expect(closed.trades[0].exitReason).toBe("ambiguous_stop_first");
    expect(closed.trades[0].netPnl).toBeLessThan(0);
  });

  it("blocks entries above the risk limit or buying power", () => {
    expect(() =>
      submitPaperEntry(
        session(),
        {
          side: "long",
          orderType: "market",
          quantity: 100,
          stopPrice: 98,
          targetPrice: 104,
        },
        bars[0],
        0,
      ),
    ).toThrow("above the $100.00 session limit");

    expect(() =>
      submitPaperEntry(
        session(),
        {
          side: "long",
          orderType: "market",
          quantity: 101,
          stopPrice: 99.5,
          targetPrice: 102,
        },
        bars[0],
        0,
      ),
    ).toThrow("simulated buying power");
  });

  it("queues manual exits for the next bar and supports cancellation", () => {
    const queued = submitPaperEntry(
      session(),
      {
        side: "short",
        orderType: "market",
        quantity: 10,
        stopPrice: 102,
        targetPrice: 97,
      },
      bars[0],
      0,
    );
    const filled = processPaperBar(queued, bars[1], 1);
    const closeQueued = requestPaperClose(filled, 1);
    expect(cancelPaperOrder(closeQueued).pendingOrder).toBeNull();

    const closed = processPaperBar(closeQueued, bars[2], 2);
    expect(closed.trades[0]).toMatchObject({
      side: "short",
      exitReason: "manual",
      exitBarIndex: 2,
    });
  });

  it("finishes a session without leaving positions or orders open", () => {
    const queued = submitPaperEntry(
      session(),
      {
        side: "long",
        orderType: "market",
        quantity: 10,
        stopPrice: 98,
        targetPrice: null,
      },
      bars[0],
      0,
    );
    const filled = processPaperBar(queued, bars[1], 1);
    const completed = finishPaperSession(filled, bars[1], 1);
    expect(completed.status).toBe("completed");
    expect(completed.position).toBeNull();
    expect(completed.pendingOrder).toBeNull();
    expect(completed.trades[0].exitReason).toBe("session_end");
  });
});
