import type {
  DailySession,
  DailySessionReadiness,
  DailySessionStopReason,
  PaperTradingSession,
  Profile,
} from "./types";
import { cancelPaperOrder } from "./paper-trading";

export type DailySessionStats = {
  paperSessions: number;
  activePaperSessions: number;
  closedTrades: number;
  openPositions: number;
  pendingOpeningOrders: number;
  realizedPnl: number;
  consecutiveLosses: number;
};

export type PaperEntryAccess = {
  allowed: boolean;
  reason: string;
};

const readinessKeys: Array<keyof DailySessionReadiness> = [
  "rested",
  "emotionallySteady",
  "focused",
  "platformReady",
  "willingToTakeNoTrade",
];

function positiveNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function recordId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `daily-session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  );
}

export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function createDailySession(
  profile: Profile,
  options: { at?: Date; id?: string } = {},
): DailySession {
  const at = options.at ?? new Date();
  const timestamp = at.toISOString();
  return {
    id: options.id ?? recordId(),
    sessionDate: localDateKey(at),
    status: "planned",
    readiness: {
      rested: null,
      emotionallySteady: null,
      focused: null,
      platformReady: null,
      willingToTakeNoTrade: null,
    },
    marketContext: "not_assessed",
    setupQuality: "unclear",
    contextNote: "",
    maxPaperTrades: 3,
    maxConsecutiveLosses: 2,
    dailyLossLimit: positiveNumber(profile.dailyLossLimit, 75),
    stopReason: null,
    stopNote: "",
    startedAt: null,
    endedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function readinessAnswerCount(readiness: DailySessionReadiness) {
  return readinessKeys.filter((key) => readiness[key] !== null).length;
}

export function readinessComplete(readiness: DailySessionReadiness) {
  return readinessAnswerCount(readiness) === readinessKeys.length;
}

export function readinessHasConcern(readiness: DailySessionReadiness) {
  return readinessKeys.some((key) => readiness[key] === false);
}

export function dailySessionStats(
  session: DailySession,
  paperSessions: PaperTradingSession[],
): DailySessionStats {
  const linked = paperSessions.filter(
    (paperSession) => paperSession.dailySessionId === session.id,
  );
  const trades = linked
    .flatMap((paperSession) => paperSession.trades)
    .sort(
      (left, right) =>
        new Date(left.exitAt).getTime() - new Date(right.exitAt).getTime(),
    );
  let consecutiveLosses = 0;
  for (let index = trades.length - 1; index >= 0; index -= 1) {
    if (trades[index].netPnl >= 0) break;
    consecutiveLosses += 1;
  }
  return {
    paperSessions: linked.length,
    activePaperSessions: linked.filter((item) => item.status === "active")
      .length,
    closedTrades: trades.length,
    openPositions: linked.filter((item) => item.position).length,
    pendingOpeningOrders: linked.filter(
      (item) =>
        item.pendingOrder && item.pendingOrder.action !== "close_position",
    ).length,
    realizedPnl: linked.reduce((sum, item) => sum + item.realizedPnl, 0),
    consecutiveLosses,
  };
}

export function stopReasonMessage(reason: DailySessionStopReason | null) {
  switch (reason) {
    case "daily_loss_limit":
      return "The preset practice-loss boundary was reached.";
    case "max_paper_trades":
      return "The preset paper-trade limit was reached.";
    case "consecutive_losses":
      return "The preset consecutive-loss boundary was reached.";
    case "readiness_concern":
      return "A readiness concern made study-only work the better choice.";
    case "no_eligible_setup":
      return "No eligible setup was present, so no trade was the plan.";
    case "manual_stop":
      return "Practice was intentionally stopped for review.";
    case "session_complete":
      return "The planned practice session was completed.";
    default:
      return "";
  }
}

export function evaluateDailySessionGuard(
  session: DailySession,
  paperSessions: PaperTradingSession[],
  at = new Date(),
): DailySession {
  if (session.status !== "active") return session;
  const stats = dailySessionStats(session, paperSessions);
  let stopReason: DailySessionStopReason | null = null;
  if (stats.realizedPnl <= -session.dailyLossLimit)
    stopReason = "daily_loss_limit";
  else if (stats.consecutiveLosses >= session.maxConsecutiveLosses)
    stopReason = "consecutive_losses";
  else if (stats.closedTrades >= session.maxPaperTrades)
    stopReason = "max_paper_trades";
  if (!stopReason) return session;
  const timestamp = at.toISOString();
  return {
    ...session,
    status: "review_only",
    stopReason,
    stopNote: stopReasonMessage(stopReason),
    endedAt: timestamp,
    updatedAt: timestamp,
  };
}

export function enforceDailySessionGuards(
  dailySessions: DailySession[],
  paperSessions: PaperTradingSession[],
  at = new Date(),
) {
  const evaluatedDailySessions = dailySessions.map((dailySession) =>
    evaluateDailySessionGuard(dailySession, paperSessions, at),
  );
  const blockedIds = new Set(
    evaluatedDailySessions
      .filter((dailySession) => dailySession.status !== "active")
      .map((dailySession) => dailySession.id),
  );
  const timestamp = at.toISOString();
  return {
    dailySessions: evaluatedDailySessions,
    paperSessions: paperSessions.map((paperSession) =>
      paperSession.dailySessionId &&
      blockedIds.has(paperSession.dailySessionId) &&
      paperSession.pendingOrder &&
      paperSession.pendingOrder.action !== "close_position"
        ? cancelPaperOrder(paperSession, timestamp)
        : paperSession,
    ),
  };
}

export function paperEntryAccess(
  session: DailySession | null | undefined,
  guardRequired: boolean,
): PaperEntryAccess {
  if (!session)
    return guardRequired
      ? {
          allowed: false,
          reason:
            "Set today’s Session Guard in Lessons before opening simulated risk.",
        }
      : { allowed: true, reason: "" };
  if (session.status === "active") return { allowed: true, reason: "" };
  const reason = session.stopNote || stopReasonMessage(session.stopReason);
  if (session.status === "planned")
    return {
      allowed: false,
      reason:
        "Finish today’s readiness check and begin guarded practice first.",
    };
  return {
    allowed: false,
    reason:
      reason ||
      "Today’s Session Guard is review-only. New simulated entries are paused.",
  };
}

export function findDailySessionForDate(
  sessions: DailySession[] | undefined,
  date = new Date(),
) {
  const key = localDateKey(date);
  return sessions?.find((session) => session.sessionDate === key) ?? null;
}
