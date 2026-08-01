import type {
  MarketBar,
  PaperOrderType,
  PaperTradingEvent,
  PaperTradingOrder,
  PaperTradingPosition,
  PaperTradingSession,
  PaperTradingTrade,
  TradeSide,
} from "./types";

export type PaperSessionDefaults = {
  startingBalance: number;
  maxRiskPerTrade: number;
  dailyLossLimit: number;
  slippagePerShare: number;
  commissionPerOrder: number;
};

export type PaperEntryRequest = {
  side: TradeSide;
  orderType: PaperOrderType;
  quantity: number;
  limitPrice?: number | null;
  stopPrice: number;
  targetPrice?: number | null;
};

export type PaperRiskPreview = {
  estimatedEntry: number;
  riskPerShare: number;
  plannedRisk: number;
  notional: number;
  suggestedQuantity: number;
  withinRiskLimit: boolean;
  withinBuyingPower: boolean;
};

export type PaperSessionMetrics = {
  balance: number;
  equity: number;
  unrealizedPnl: number;
  realizedPnl: number;
  returnPercent: number;
  winRate: number;
  profitFactor: number | null;
  expectancy: number;
  remainingLossCapacity: number;
};

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function finitePositive(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0)
    throw new Error(`${label} must be greater than zero.`);
  return value;
}

function event(
  kind: PaperTradingEvent["kind"],
  barIndex: number,
  message: string,
  at = new Date().toISOString(),
): PaperTradingEvent {
  return { id: id("paper-event"), kind, at, barIndex, message };
}

function withEvent(
  session: PaperTradingSession,
  item: PaperTradingEvent,
): PaperTradingSession {
  return {
    ...session,
    updatedAt: item.at,
    events: [item, ...session.events].slice(0, 100),
  };
}

function adverseMarketPrice(
  side: TradeSide,
  action: "entry" | "exit",
  price: number,
  slippage: number,
) {
  const buying =
    (side === "long" && action === "entry") ||
    (side === "short" && action === "exit");
  return Math.max(0.0001, price + (buying ? slippage : -slippage));
}

function unrealizedPnl(position: PaperTradingPosition, price: number) {
  const perShare =
    position.side === "long"
      ? price - position.entryPrice
      : position.entryPrice - price;
  return perShare * position.quantity - position.entryFee;
}

export function createPaperTradingSession({
  dataSetId,
  symbol,
  timeframe,
  replayIndex,
  defaults,
  at = new Date().toISOString(),
}: {
  dataSetId: string;
  symbol: string;
  timeframe: string;
  replayIndex: number;
  defaults: PaperSessionDefaults;
  at?: string;
}): PaperTradingSession {
  const startingBalance = finitePositive(
    defaults.startingBalance,
    "Starting balance",
  );
  const session: PaperTradingSession = {
    id: id("paper-session"),
    dataSetId,
    symbol,
    timeframe,
    status: "active",
    createdAt: at,
    updatedAt: at,
    endedAt: null,
    startingBalance,
    realizedPnl: 0,
    feesPaid: 0,
    peakEquity: startingBalance,
    maxDrawdown: 0,
    maxRiskPerTrade: finitePositive(defaults.maxRiskPerTrade, "Maximum risk"),
    dailyLossLimit: finitePositive(
      defaults.dailyLossLimit,
      "Session loss limit",
    ),
    slippagePerShare: Math.max(0, defaults.slippagePerShare),
    commissionPerOrder: Math.max(0, defaults.commissionPerOrder),
    replayIndex,
    lastProcessedBarIndex: replayIndex,
    pendingOrder: null,
    position: null,
    trades: [],
    events: [],
  };
  return withEvent(
    session,
    event(
      "session",
      replayIndex,
      `Paper session started with $${startingBalance.toFixed(2)}. Future bars remain hidden.`,
      at,
    ),
  );
}

export function paperSessionMetrics(
  session: PaperTradingSession,
  currentPrice: number,
): PaperSessionMetrics {
  const unrealized = session.position
    ? unrealizedPnl(session.position, currentPrice)
    : 0;
  const balance = session.startingBalance + session.realizedPnl;
  const equity = balance + unrealized;
  const wins = session.trades.filter((trade) => trade.netPnl > 0);
  const losses = session.trades.filter((trade) => trade.netPnl < 0);
  const grossWins = wins.reduce((sum, trade) => sum + trade.netPnl, 0);
  const grossLosses = Math.abs(
    losses.reduce((sum, trade) => sum + trade.netPnl, 0),
  );
  return {
    balance,
    equity,
    unrealizedPnl: unrealized,
    realizedPnl: session.realizedPnl,
    returnPercent:
      ((equity - session.startingBalance) / session.startingBalance) * 100,
    winRate: session.trades.length
      ? (wins.length / session.trades.length) * 100
      : 0,
    profitFactor:
      grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? null : 0,
    expectancy: session.trades.length
      ? session.realizedPnl / session.trades.length
      : 0,
    remainingLossCapacity: Math.max(
      0,
      session.dailyLossLimit + Math.min(0, session.realizedPnl),
    ),
  };
}

export function previewPaperEntry(
  session: PaperTradingSession,
  request: PaperEntryRequest,
  currentBar: MarketBar,
): PaperRiskPreview {
  const quantity = Math.max(0, Math.floor(request.quantity));
  const estimatedEntry =
    request.orderType === "limit" && request.limitPrice
      ? request.limitPrice
      : adverseMarketPrice(
          request.side,
          "entry",
          currentBar.close,
          session.slippagePerShare,
        );
  const riskPerShare =
    Math.abs(estimatedEntry - request.stopPrice) + session.slippagePerShare;
  const plannedRisk = riskPerShare * quantity + session.commissionPerOrder * 2;
  const notional = estimatedEntry * quantity;
  const availableEquity =
    session.startingBalance +
    session.realizedPnl -
    session.commissionPerOrder * 2;
  const suggestedQuantity = Math.max(
    0,
    Math.min(
      Math.floor(
        (session.maxRiskPerTrade - session.commissionPerOrder * 2) /
          Math.max(riskPerShare, 0.0001),
      ),
      Math.floor(availableEquity / Math.max(estimatedEntry, 0.0001)),
    ),
  );
  return {
    estimatedEntry,
    riskPerShare,
    plannedRisk,
    notional,
    suggestedQuantity,
    withinRiskLimit: plannedRisk <= session.maxRiskPerTrade,
    withinBuyingPower: notional <= availableEquity,
  };
}

function validateProtection(
  side: TradeSide,
  referencePrice: number,
  stopPrice: number,
  targetPrice: number | null,
) {
  finitePositive(stopPrice, "Protective stop");
  if (
    (side === "long" && stopPrice >= referencePrice) ||
    (side === "short" && stopPrice <= referencePrice)
  )
    throw new Error(
      side === "long"
        ? "A long protective stop must be below the estimated entry."
        : "A short protective stop must be above the estimated entry.",
    );
  if (
    targetPrice !== null &&
    ((side === "long" && targetPrice <= referencePrice) ||
      (side === "short" && targetPrice >= referencePrice))
  )
    throw new Error(
      side === "long"
        ? "A long target must be above the estimated entry."
        : "A short target must be below the estimated entry.",
    );
}

export function submitPaperEntry(
  session: PaperTradingSession,
  request: PaperEntryRequest,
  currentBar: MarketBar,
  currentBarIndex: number,
  at = new Date().toISOString(),
): PaperTradingSession {
  if (session.status !== "active")
    throw new Error("Start a new paper session before placing an order.");
  if (session.position || session.pendingOrder)
    throw new Error("Only one simulated position or pending order is allowed.");
  if (session.realizedPnl <= -session.dailyLossLimit)
    throw new Error(
      "The session loss limit has been reached. End the session and review it.",
    );
  const quantity = Math.floor(
    finitePositive(request.quantity, "Share quantity"),
  );
  const limitPrice =
    request.orderType === "limit"
      ? finitePositive(request.limitPrice ?? 0, "Limit price")
      : null;
  if (
    limitPrice !== null &&
    ((request.side === "long" && limitPrice >= currentBar.close) ||
      (request.side === "short" && limitPrice <= currentBar.close))
  )
    throw new Error(
      request.side === "long"
        ? "A long limit entry must be below the current close."
        : "A short limit entry must be above the current close.",
    );
  const normalizedRequest = {
    ...request,
    quantity,
    limitPrice,
    targetPrice: request.targetPrice ?? null,
  };
  const preview = previewPaperEntry(session, normalizedRequest, currentBar);
  validateProtection(
    request.side,
    preview.estimatedEntry,
    request.stopPrice,
    normalizedRequest.targetPrice,
  );
  if (!preview.withinRiskLimit)
    throw new Error(
      `Planned risk is $${preview.plannedRisk.toFixed(2)}, above the $${session.maxRiskPerTrade.toFixed(2)} session limit.`,
    );
  if (!preview.withinBuyingPower)
    throw new Error("The order is larger than the simulated buying power.");

  const order: PaperTradingOrder = {
    id: id("paper-order"),
    action: request.side === "long" ? "open_long" : "open_short",
    type: request.orderType,
    quantity,
    limitPrice,
    stopPrice: request.stopPrice,
    targetPrice: normalizedRequest.targetPrice,
    submittedAt: at,
    submittedBarIndex: currentBarIndex,
  };
  return withEvent(
    { ...session, pendingOrder: order },
    event(
      "order",
      currentBarIndex,
      `${request.side === "long" ? "Long" : "Short"} ${request.orderType} order queued for ${quantity} share${quantity === 1 ? "" : "s"}.`,
      at,
    ),
  );
}

export function requestPaperClose(
  session: PaperTradingSession,
  currentBarIndex: number,
  at = new Date().toISOString(),
): PaperTradingSession {
  if (!session.position) throw new Error("There is no open position to close.");
  if (session.pendingOrder)
    throw new Error("Cancel the existing pending order first.");
  const order: PaperTradingOrder = {
    id: id("paper-order"),
    action: "close_position",
    type: "market",
    quantity: session.position.quantity,
    limitPrice: null,
    stopPrice: null,
    targetPrice: null,
    submittedAt: at,
    submittedBarIndex: currentBarIndex,
  };
  return withEvent(
    { ...session, pendingOrder: order },
    event(
      "order",
      currentBarIndex,
      "Close queued for the next revealed bar’s open.",
      at,
    ),
  );
}

export function cancelPaperOrder(
  session: PaperTradingSession,
  at = new Date().toISOString(),
): PaperTradingSession {
  if (!session.pendingOrder) return session;
  return withEvent(
    { ...session, pendingOrder: null },
    event("order", session.replayIndex, "Pending paper order cancelled.", at),
  );
}

export function updatePaperProtection(
  session: PaperTradingSession,
  stopPrice: number,
  targetPrice: number | null,
  currentPrice: number,
  at = new Date().toISOString(),
): PaperTradingSession {
  if (!session.position)
    throw new Error("There is no open position to protect.");
  validateProtection(
    session.position.side,
    currentPrice,
    stopPrice,
    targetPrice,
  );
  return withEvent(
    {
      ...session,
      position: { ...session.position, stopPrice, targetPrice },
    },
    event(
      "risk",
      session.replayIndex,
      `Protection updated: stop ${stopPrice.toFixed(2)}${targetPrice ? `, target ${targetPrice.toFixed(2)}` : ""}.`,
      at,
    ),
  );
}

function closePosition(
  session: PaperTradingSession,
  bar: MarketBar,
  barIndex: number,
  exitPrice: number,
  exitReason: PaperTradingTrade["exitReason"],
  at: string,
) {
  const position = session.position!;
  const grossPnl =
    (position.side === "long"
      ? exitPrice - position.entryPrice
      : position.entryPrice - exitPrice) * position.quantity;
  const exitFee = session.commissionPerOrder;
  const netPnl = grossPnl - position.entryFee - exitFee;
  const trade: PaperTradingTrade = {
    id: id("paper-trade"),
    side: position.side,
    quantity: position.quantity,
    entryPrice: position.entryPrice,
    exitPrice,
    entryAt: position.entryAt,
    exitAt: bar.timestamp,
    entryBarIndex: position.entryBarIndex,
    exitBarIndex: barIndex,
    grossPnl,
    netPnl,
    rMultiple: position.initialRisk > 0 ? netPnl / position.initialRisk : 0,
    exitReason,
  };
  const realizedPnl = session.realizedPnl + netPnl;
  const equity = session.startingBalance + realizedPnl;
  const peakEquity = Math.max(session.peakEquity, equity);
  return withEvent(
    {
      ...session,
      position: null,
      pendingOrder: null,
      trades: [trade, ...session.trades].slice(0, 500),
      realizedPnl,
      feesPaid: session.feesPaid + exitFee,
      peakEquity,
      maxDrawdown: Math.max(session.maxDrawdown, peakEquity - equity),
    },
    event(
      "exit",
      barIndex,
      `${position.side === "long" ? "Long" : "Short"} closed at ${exitPrice.toFixed(2)} for ${netPnl >= 0 ? "+" : "−"}$${Math.abs(netPnl).toFixed(2)} (${exitReason.replaceAll("_", " ")}).`,
      at,
    ),
  );
}

function fillEntry(
  session: PaperTradingSession,
  order: PaperTradingOrder,
  bar: MarketBar,
  barIndex: number,
  fillPrice: number,
  at: string,
) {
  const side: TradeSide = order.action === "open_long" ? "long" : "short";
  const entryFee = session.commissionPerOrder;
  const initialRisk =
    Math.abs(fillPrice - order.stopPrice!) * order.quantity +
    entryFee +
    session.commissionPerOrder;
  const position: PaperTradingPosition = {
    id: id("paper-position"),
    side,
    quantity: order.quantity,
    entryPrice: fillPrice,
    entryAt: bar.timestamp,
    entryBarIndex: barIndex,
    stopPrice: order.stopPrice!,
    targetPrice: order.targetPrice,
    initialRisk,
    entryFee,
  };
  return withEvent(
    {
      ...session,
      pendingOrder: null,
      position,
      feesPaid: session.feesPaid + entryFee,
    },
    event(
      "fill",
      barIndex,
      `${side === "long" ? "Long" : "Short"} filled at ${fillPrice.toFixed(2)} for ${order.quantity} share${order.quantity === 1 ? "" : "s"}.`,
      at,
    ),
  );
}

function processProtection(
  session: PaperTradingSession,
  bar: MarketBar,
  barIndex: number,
  at: string,
) {
  const position = session.position;
  if (!position || position.entryBarIndex > barIndex) return session;
  const stopHit =
    position.side === "long"
      ? bar.low <= position.stopPrice
      : bar.high >= position.stopPrice;
  const targetHit =
    position.targetPrice !== null &&
    (position.side === "long"
      ? bar.high >= position.targetPrice
      : bar.low <= position.targetPrice);
  if (!stopHit && !targetHit) return session;
  const ambiguous = stopHit && targetHit;
  const reason = ambiguous
    ? "ambiguous_stop_first"
    : stopHit
      ? "stop"
      : "target";
  const rawExit = stopHit ? position.stopPrice : position.targetPrice!;
  const exitPrice =
    reason === "target"
      ? rawExit
      : adverseMarketPrice(
          position.side,
          "exit",
          rawExit,
          session.slippagePerShare,
        );
  return closePosition(session, bar, barIndex, exitPrice, reason, at);
}

export function processPaperBar(
  session: PaperTradingSession,
  bar: MarketBar,
  barIndex: number,
  at = new Date().toISOString(),
): PaperTradingSession {
  if (session.status !== "active" || barIndex <= session.lastProcessedBarIndex)
    return session;
  let next: PaperTradingSession = {
    ...session,
    replayIndex: barIndex,
    lastProcessedBarIndex: barIndex,
    updatedAt: at,
  };
  const order = next.pendingOrder;
  if (order && order.submittedBarIndex < barIndex) {
    if (order.action === "close_position" && next.position) {
      const exitPrice = adverseMarketPrice(
        next.position.side,
        "exit",
        bar.open,
        next.slippagePerShare,
      );
      return closePosition(next, bar, barIndex, exitPrice, "manual", at);
    }
    if (order.action !== "close_position") {
      const side: TradeSide = order.action === "open_long" ? "long" : "short";
      const limitReached =
        order.type === "market" ||
        (side === "long"
          ? bar.low <= order.limitPrice!
          : bar.high >= order.limitPrice!);
      if (limitReached) {
        const fillPrice =
          order.type === "market"
            ? adverseMarketPrice(side, "entry", bar.open, next.slippagePerShare)
            : side === "long"
              ? Math.min(bar.open, order.limitPrice!)
              : Math.max(bar.open, order.limitPrice!);
        next = fillEntry(next, order, bar, barIndex, fillPrice, at);
      }
    }
  }
  return processProtection(next, bar, barIndex, at);
}

export function finishPaperSession(
  session: PaperTradingSession,
  currentBar: MarketBar,
  currentBarIndex: number,
  at = new Date().toISOString(),
): PaperTradingSession {
  let next: PaperTradingSession = { ...session, pendingOrder: null };
  if (next.position) {
    const exitPrice = adverseMarketPrice(
      next.position.side,
      "exit",
      currentBar.close,
      next.slippagePerShare,
    );
    next = closePosition(
      next,
      currentBar,
      currentBarIndex,
      exitPrice,
      "session_end",
      at,
    );
  }
  return withEvent(
    {
      ...next,
      status: "completed",
      endedAt: at,
      replayIndex: currentBarIndex,
      lastProcessedBarIndex: Math.max(
        next.lastProcessedBarIndex,
        currentBarIndex,
      ),
    },
    event(
      "session",
      currentBarIndex,
      `Paper session ended at ${currentBar.close.toFixed(2)}.`,
      at,
    ),
  );
}
