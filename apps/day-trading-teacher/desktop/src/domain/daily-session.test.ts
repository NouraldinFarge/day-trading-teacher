import { describe, expect, it } from "vitest";
import {
  createDailySession,
  dailySessionStats,
  enforceDailySessionGuards,
  evaluateDailySessionGuard,
  localDateKey,
  paperEntryAccess,
  readinessComplete,
} from "./daily-session";
import type { PaperTradingSession, PaperTradingTrade, Profile } from "./types";

const profile: Profile = {
  displayName: "Learner",
  experience: "beginner",
  broker: "Fidelity",
  accountType: "paper",
  maxRiskPerTrade: "25",
  dailyLossLimit: "60",
  studyMinutes: 20,
  plainLanguage: true,
  reducedMotion: false,
  theme: "system",
};

function paperTrade(
  id: string,
  netPnl: number,
  exitAt: string,
): PaperTradingTrade {
  return {
    id,
    side: "long",
    quantity: 1,
    entryPrice: 100,
    exitPrice: 100 + netPnl,
    entryAt: "2026-08-13T14:00:00.000Z",
    exitAt,
    entryBarIndex: 1,
    exitBarIndex: 2,
    grossPnl: netPnl,
    netPnl,
    rMultiple: netPnl / 10,
    exitReason: "manual",
  };
}

function paperSession(
  dailySessionId: string,
  trades: PaperTradingTrade[],
): PaperTradingSession {
  return {
    id: "paper-1",
    dailySessionId,
    dataSetId: "data-1",
    symbol: "SPY",
    timeframe: "1min",
    status: "active",
    createdAt: "2026-08-13T13:30:00.000Z",
    updatedAt: "2026-08-13T15:00:00.000Z",
    endedAt: null,
    startingBalance: 10_000,
    realizedPnl: trades.reduce((sum, trade) => sum + trade.netPnl, 0),
    feesPaid: 0,
    peakEquity: 10_000,
    maxDrawdown: 0,
    maxRiskPerTrade: 25,
    dailyLossLimit: 60,
    slippagePerShare: 0,
    commissionPerOrder: 0,
    replayIndex: 10,
    lastProcessedBarIndex: 10,
    pendingOrder: null,
    position: null,
    trades,
    events: [],
  };
}

describe("daily session guard", () => {
  it("creates a local-date plan from the profile boundary", () => {
    const at = new Date(2026, 7, 13, 8, 30);
    const session = createDailySession(profile, { at, id: "daily-1" });
    expect(session).toMatchObject({
      id: "daily-1",
      sessionDate: localDateKey(at),
      status: "planned",
      dailyLossLimit: 60,
      maxPaperTrades: 3,
      maxConsecutiveLosses: 2,
    });
    expect(readinessComplete(session.readiness)).toBe(false);
  });

  it("counts linked paper evidence and trailing losses in time order", () => {
    const session = createDailySession(profile, { id: "daily-1" });
    const trades = [
      paperTrade("later", -10, "2026-08-13T16:00:00.000Z"),
      paperTrade("win", 15, "2026-08-13T14:30:00.000Z"),
      paperTrade("middle", -5, "2026-08-13T15:00:00.000Z"),
    ];
    expect(
      dailySessionStats(session, [paperSession(session.id, trades)]),
    ).toMatchObject({
      closedTrades: 3,
      realizedPnl: 0,
      consecutiveLosses: 2,
    });
  });

  it("moves active practice to review-only at a preset stop boundary", () => {
    const session = {
      ...createDailySession(profile, { id: "daily-1" }),
      status: "active" as const,
      maxConsecutiveLosses: 2,
    };
    const trades = [
      paperTrade("one", -10, "2026-08-13T15:00:00.000Z"),
      paperTrade("two", -10, "2026-08-13T15:30:00.000Z"),
    ];
    const evaluated = evaluateDailySessionGuard(
      session,
      [paperSession(session.id, trades)],
      new Date("2026-08-13T15:31:00.000Z"),
    );
    expect(evaluated).toMatchObject({
      status: "review_only",
      stopReason: "consecutive_losses",
      endedAt: "2026-08-13T15:31:00.000Z",
    });
  });

  it("does not reopen a completed or no-trade day during evaluation", () => {
    const session = {
      ...createDailySession(profile, { id: "daily-1" }),
      status: "no_trade" as const,
      stopReason: "no_eligible_setup" as const,
    };
    expect(evaluateDailySessionGuard(session, [])).toBe(session);
  });

  it("cancels a queued opening entry when a guard boundary is reached", () => {
    const daily = {
      ...createDailySession(profile, { id: "daily-1" }),
      status: "active" as const,
      maxPaperTrades: 1,
    };
    const linked = paperSession(daily.id, [
      paperTrade("one", 5, "2026-08-13T15:00:00.000Z"),
    ]);
    linked.pendingOrder = {
      id: "queued-entry",
      action: "open_long",
      type: "market",
      quantity: 1,
      limitPrice: null,
      stopPrice: 99,
      targetPrice: 102,
      submittedAt: "2026-08-13T15:01:00.000Z",
      submittedBarIndex: 10,
    };
    const guarded = enforceDailySessionGuards(
      [daily],
      [linked],
      new Date("2026-08-13T15:02:00.000Z"),
    );
    expect(guarded.dailySessions[0]).toMatchObject({
      status: "review_only",
      stopReason: "max_paper_trades",
    });
    expect(guarded.paperSessions[0].pendingOrder).toBeNull();
    expect(guarded.paperSessions[0].events[0].message).toContain("cancelled");
  });

  it("requires an active guard in lesson-guided mode but not standalone mode", () => {
    expect(paperEntryAccess(null, true).allowed).toBe(false);
    expect(paperEntryAccess(null, false).allowed).toBe(true);
    const planned = createDailySession(profile, { id: "daily-1" });
    expect(paperEntryAccess(planned, false).allowed).toBe(false);
    expect(
      paperEntryAccess({ ...planned, status: "active" }, true).allowed,
    ).toBe(true);
  });
});
