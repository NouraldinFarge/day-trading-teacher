import type { MarketBar, TradeSide } from "./types";

export type BacktestSettings = {
  fastPeriod: number;
  slowPeriod: number;
  direction: TradeSide | "both";
  initialCapital: number;
  riskPerTrade: number;
  stopPercent: number;
  rewardMultiple: number;
  slippagePerShare: number;
  feePerTrade: number;
};

export type BacktestTrade = {
  id: string;
  side: TradeSide;
  entryAt: string;
  exitAt: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  netPnl: number;
  returnOnRisk: number;
  barsHeld: number;
  exitReason:
    | "stop"
    | "target"
    | "opposite_signal"
    | "end_of_data"
    | "ambiguous_stop_first";
};

export type BacktestResult = {
  trades: BacktestTrade[];
  endingCapital: number;
  netPnl: number;
  cumulativeReturn: number;
  winRate: number;
  expectancy: number;
  maxDrawdown: number;
  profitFactor: number | null;
  averageBarsHeld: number;
};

type OpenPosition = {
  side: TradeSide;
  entryIndex: number;
  entryPrice: number;
  quantity: number;
  riskAmount: number;
  stopPrice: number;
  targetPrice: number;
};

export function simpleMovingAverage(
  bars: MarketBar[],
  period: number,
): Array<number | null> {
  const normalized = Math.max(1, Math.floor(period));
  let running = 0;
  return bars.map((bar, index) => {
    running += bar.close;
    if (index >= normalized) running -= bars[index - normalized].close;
    return index >= normalized - 1 ? running / normalized : null;
  });
}

function normalizedSettings(settings: BacktestSettings): BacktestSettings {
  const fastPeriod = Math.max(2, Math.floor(settings.fastPeriod));
  return {
    ...settings,
    fastPeriod,
    slowPeriod: Math.max(fastPeriod + 1, Math.floor(settings.slowPeriod)),
    initialCapital: Math.max(1, settings.initialCapital),
    riskPerTrade: Math.max(0.01, settings.riskPerTrade),
    stopPercent: Math.max(0.05, settings.stopPercent),
    rewardMultiple: Math.max(0.25, settings.rewardMultiple),
    slippagePerShare: Math.max(0, settings.slippagePerShare),
    feePerTrade: Math.max(0, settings.feePerTrade),
  };
}

function closePosition(
  position: OpenPosition,
  exitIndex: number,
  exitPrice: number,
  reason: BacktestTrade["exitReason"],
  bars: MarketBar[],
  fee: number,
): BacktestTrade {
  const gross =
    position.side === "long"
      ? (exitPrice - position.entryPrice) * position.quantity
      : (position.entryPrice - exitPrice) * position.quantity;
  const netPnl = gross - fee;
  return {
    id: `simulation-${position.entryIndex}-${exitIndex}-${position.side}`,
    side: position.side,
    entryAt: bars[position.entryIndex].timestamp,
    exitAt: bars[exitIndex].timestamp,
    entryPrice: position.entryPrice,
    exitPrice,
    quantity: position.quantity,
    netPnl,
    returnOnRisk: position.riskAmount > 0 ? netPnl / position.riskAmount : 0,
    barsHeld: Math.max(1, exitIndex - position.entryIndex + 1),
    exitReason: reason,
  };
}

export function runMovingAverageBacktest(
  bars: MarketBar[],
  rawSettings: BacktestSettings,
): BacktestResult {
  const settings = normalizedSettings(rawSettings);
  if (bars.length <= settings.slowPeriod + 1)
    return emptyResult(settings.initialCapital);
  const fast = simpleMovingAverage(bars, settings.fastPeriod);
  const slow = simpleMovingAverage(bars, settings.slowPeriod);
  const trades: BacktestTrade[] = [];
  let capital = settings.initialCapital;
  let position: OpenPosition | null = null;

  const record = (trade: BacktestTrade) => {
    trades.push(trade);
    capital += trade.netPnl;
  };

  for (let index = settings.slowPeriod; index < bars.length - 1; index += 1) {
    const currentFast = fast[index];
    const currentSlow = slow[index];
    const priorFast = fast[index - 1];
    const priorSlow = slow[index - 1];
    if (
      currentFast === null ||
      currentSlow === null ||
      priorFast === null ||
      priorSlow === null
    )
      continue;
    const crossedUp = priorFast <= priorSlow && currentFast > currentSlow;
    const crossedDown = priorFast >= priorSlow && currentFast < currentSlow;

    if (position && index >= position.entryIndex) {
      const bar = bars[index];
      const stopHit =
        position.side === "long"
          ? bar.low <= position.stopPrice
          : bar.high >= position.stopPrice;
      const targetHit =
        position.side === "long"
          ? bar.high >= position.targetPrice
          : bar.low <= position.targetPrice;
      if (stopHit || targetHit) {
        const ambiguous = stopHit && targetHit;
        const rawExit = stopHit ? position.stopPrice : position.targetPrice;
        const exitPrice =
          position.side === "long"
            ? rawExit - settings.slippagePerShare
            : rawExit + settings.slippagePerShare;
        record(
          closePosition(
            position,
            index,
            exitPrice,
            ambiguous ? "ambiguous_stop_first" : stopHit ? "stop" : "target",
            bars,
            settings.feePerTrade,
          ),
        );
        position = null;
        continue;
      }
      const oppositeSignal = position.side === "long" ? crossedDown : crossedUp;
      if (oppositeSignal) {
        const next = bars[index + 1];
        const exitPrice =
          position.side === "long"
            ? next.open - settings.slippagePerShare
            : next.open + settings.slippagePerShare;
        record(
          closePosition(
            position,
            index + 1,
            exitPrice,
            "opposite_signal",
            bars,
            settings.feePerTrade,
          ),
        );
        position = null;
        continue;
      }
    }

    if (!position) {
      const side: TradeSide | null =
        crossedUp && settings.direction !== "short"
          ? "long"
          : crossedDown && settings.direction !== "long"
            ? "short"
            : null;
      if (!side) continue;
      const entryIndex = index + 1;
      const rawEntry = bars[entryIndex].open;
      const entryPrice =
        side === "long"
          ? rawEntry + settings.slippagePerShare
          : rawEntry - settings.slippagePerShare;
      const stopDistance = (entryPrice * settings.stopPercent) / 100;
      const usableRisk = Math.max(
        0,
        Math.min(settings.riskPerTrade, capital) - settings.feePerTrade,
      );
      const riskPerShare = stopDistance + settings.slippagePerShare;
      const riskQuantity = Math.floor(usableRisk / riskPerShare);
      const cashQuantity = Math.floor(capital / Math.max(entryPrice, 0.01));
      const quantity = Math.max(0, Math.min(riskQuantity, cashQuantity));
      if (!quantity) continue;
      position = {
        side,
        entryIndex,
        entryPrice,
        quantity,
        riskAmount: stopDistance * quantity + settings.feePerTrade,
        stopPrice:
          side === "long"
            ? entryPrice - stopDistance
            : entryPrice + stopDistance,
        targetPrice:
          side === "long"
            ? entryPrice + stopDistance * settings.rewardMultiple
            : entryPrice - stopDistance * settings.rewardMultiple,
      };
    }
  }

  if (position) {
    const exitIndex = bars.length - 1;
    const rawExit = bars[exitIndex].close;
    const exitPrice =
      position.side === "long"
        ? rawExit - settings.slippagePerShare
        : rawExit + settings.slippagePerShare;
    record(
      closePosition(
        position,
        exitIndex,
        exitPrice,
        "end_of_data",
        bars,
        settings.feePerTrade,
      ),
    );
  }

  const wins = trades.filter((trade) => trade.netPnl > 0);
  const losses = trades.filter((trade) => trade.netPnl < 0);
  const grossWins = wins.reduce((sum, trade) => sum + trade.netPnl, 0);
  const grossLosses = Math.abs(
    losses.reduce((sum, trade) => sum + trade.netPnl, 0),
  );
  let peak = settings.initialCapital;
  let equity = settings.initialCapital;
  let maxDrawdown = 0;
  for (const trade of trades) {
    equity += trade.netPnl;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
  }
  const netPnl = capital - settings.initialCapital;
  return {
    trades,
    endingCapital: capital,
    netPnl,
    cumulativeReturn: (netPnl / settings.initialCapital) * 100,
    winRate: trades.length ? (wins.length / trades.length) * 100 : 0,
    expectancy: trades.length ? netPnl / trades.length : 0,
    maxDrawdown,
    profitFactor:
      grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? null : 0,
    averageBarsHeld: trades.length
      ? trades.reduce((sum, trade) => sum + trade.barsHeld, 0) / trades.length
      : 0,
  };
}

function emptyResult(initialCapital: number): BacktestResult {
  return {
    trades: [],
    endingCapital: initialCapital,
    netPnl: 0,
    cumulativeReturn: 0,
    winRate: 0,
    expectancy: 0,
    maxDrawdown: 0,
    profitFactor: 0,
    averageBarsHeld: 0,
  };
}
