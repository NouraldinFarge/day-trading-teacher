import type { Trade } from "./types";

export type JournalRange =
  "day" | "week" | "month" | "quarter" | "year" | "all";
export type BreakdownDimension =
  | "symbol"
  | "strategy"
  | "setup"
  | "direction"
  | "session"
  | "weekday"
  | "time";

export type PerformancePoint = {
  key: string;
  label: string;
  pnl: number;
  cumulativePnl: number;
  equity: number;
  cumulativeReturn: number;
  drawdown: number;
  winRate: number;
  tradeCount: number;
};

export type PerformanceMetrics = {
  netPnl: number;
  cumulativeReturn: number;
  winRate: number;
  expectancy: number;
  realizedRiskReward: number | null;
  profitFactor: number | null;
  maximumDrawdown: number;
  averageWin: number;
  averageLoss: number;
  reflectionRate: number;
  planCoverage: number;
  ruleAdherence: number;
  tradeCount: number;
};

export type BreakdownRow = {
  key: string;
  trades: number;
  wins: number;
  winRate: number;
  pnl: number;
  expectancy: number;
};
export type CalendarDay = {
  key: string;
  pnl: number;
  trades: number;
  wins: number;
  winRate: number;
  reflected: number;
  ruleEvidence: number;
  ruleAdherent: number;
  notable: string[];
};

const rangeDays: Record<Exclude<JournalRange, "all">, number> = {
  day: 1,
  week: 7,
  month: 31,
  quarter: 92,
  year: 366,
};

export function localDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export function tradesInRange(
  trades: Trade[],
  range: JournalRange,
  now = new Date(),
) {
  if (range === "all") return [...trades];
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - rangeDays[range] + 1);
  return trades.filter(
    (trade) =>
      new Date(trade.occurredAt) >= start && new Date(trade.occurredAt) <= now,
  );
}

function bucketKey(date: Date, range: JournalRange) {
  if (range === "day")
    return `${localDateKey(date)}-${String(date.getHours()).padStart(2, "0")}`;
  if (range === "week" || range === "month") return localDateKey(date);
  if (range === "quarter") {
    const start = new Date(date.getFullYear(), 0, 1);
    const week = Math.floor((date.getTime() - start.getTime()) / 604_800_000);
    return `${date.getFullYear()}-W${String(week + 1).padStart(2, "0")}`;
  }
  if (range === "year")
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  return `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
}

function bucketLabel(key: string, range: JournalRange) {
  if (range === "day")
    return `${Number(key.slice(-2)) % 12 || 12}${Number(key.slice(-2)) < 12 ? "a" : "p"}`;
  if (range === "week" || range === "month")
    return new Date(`${key}T12:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  if (range === "year")
    return new Date(`${key}-01T12:00:00`).toLocaleDateString("en-US", {
      month: "short",
    });
  return key.replace(/^\d{4}-/, "");
}

export function performanceMetrics(
  trades: Trade[],
  startingBalance = 10_000,
): PerformanceMetrics {
  const pnls = trades
    .map((trade) => Number(trade.netPnl))
    .filter(Number.isFinite);
  const wins = pnls.filter((value) => value > 0);
  const losses = pnls.filter((value) => value < 0);
  const netPnl = pnls.reduce((total, value) => total + value, 0);
  const averageWin = wins.length
    ? wins.reduce((total, value) => total + value, 0) / wins.length
    : 0;
  const averageLoss = losses.length
    ? losses.reduce((total, value) => total + value, 0) / losses.length
    : 0;
  const winRate = pnls.length ? (wins.length / pnls.length) * 100 : 0;
  const expectancy = pnls.length ? netPnl / pnls.length : 0;
  const grossProfit = wins.reduce((total, value) => total + value, 0);
  const grossLoss = Math.abs(losses.reduce((total, value) => total + value, 0));
  let equity = startingBalance;
  let peak = startingBalance;
  let maximumDrawdown = 0;
  [...trades]
    .sort(
      (left, right) => +new Date(left.occurredAt) - +new Date(right.occurredAt),
    )
    .forEach((trade) => {
      equity += Number(trade.netPnl) || 0;
      peak = Math.max(peak, equity);
      maximumDrawdown = Math.max(maximumDrawdown, peak - equity);
    });
  const reviewed = trades.filter(
    (trade) => trade.journal?.status === "reviewed",
  ).length;
  const ruleEvidence = trades.filter(
    (trade) => trade.planId || trade.journal?.postTradeChecklist,
  );
  return {
    netPnl,
    cumulativeReturn:
      startingBalance > 0 ? (netPnl / startingBalance) * 100 : 0,
    winRate,
    expectancy,
    realizedRiskReward:
      averageLoss < 0 ? averageWin / Math.abs(averageLoss) : null,
    profitFactor:
      grossLoss > 0 ? grossProfit / grossLoss : wins.length ? null : 0,
    maximumDrawdown,
    averageWin,
    averageLoss,
    reflectionRate: trades.length ? (reviewed / trades.length) * 100 : 0,
    planCoverage: trades.length
      ? (trades.filter((trade) => trade.planId).length / trades.length) * 100
      : 0,
    ruleAdherence: ruleEvidence.length
      ? (ruleEvidence.filter((trade) => trade.respectedStop).length /
          ruleEvidence.length) *
        100
      : 0,
    tradeCount: trades.length,
  };
}

export function performanceSeries(
  trades: Trade[],
  range: JournalRange,
  startingBalance = 10_000,
): PerformancePoint[] {
  const buckets = new Map<string, Trade[]>();
  [...trades]
    .sort(
      (left, right) => +new Date(left.occurredAt) - +new Date(right.occurredAt),
    )
    .forEach((trade) => {
      const key = bucketKey(new Date(trade.occurredAt), range);
      buckets.set(key, [...(buckets.get(key) ?? []), trade]);
    });
  let cumulativePnl = 0;
  let peak = startingBalance;
  return [...buckets.entries()].map(([key, bucket]) => {
    const pnl = bucket.reduce(
      (total, trade) => total + (Number(trade.netPnl) || 0),
      0,
    );
    cumulativePnl += pnl;
    const equity = startingBalance + cumulativePnl;
    peak = Math.max(peak, equity);
    return {
      key,
      label: bucketLabel(key, range),
      pnl,
      cumulativePnl,
      equity,
      cumulativeReturn:
        startingBalance > 0 ? (cumulativePnl / startingBalance) * 100 : 0,
      drawdown: Math.max(0, peak - equity),
      winRate: bucket.length
        ? (bucket.filter((trade) => Number(trade.netPnl) > 0).length /
            bucket.length) *
          100
        : 0,
      tradeCount: bucket.length,
    };
  });
}

function easternParts(date: Date) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
      weekday: "long",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return {
    hour: Number(values.hour) % 24,
    minute: Number(values.minute),
    weekday: values.weekday,
  };
}

function sessionFor(date: Date) {
  const eastern = easternParts(date);
  const minutes = eastern.hour * 60 + eastern.minute;
  if (minutes < 9 * 60 + 30) return "Pre-market";
  if (minutes < 11 * 60) return "Opening drive";
  if (minutes < 14 * 60) return "Midday";
  if (minutes < 16 * 60) return "Power hour";
  return "After-hours";
}

function dimensionKey(trade: Trade, dimension: BreakdownDimension) {
  const date = new Date(trade.entryAt ?? trade.occurredAt);
  if (dimension === "symbol") return trade.symbol;
  if (dimension === "strategy")
    return trade.journal?.strategy?.trim() || "Unclassified";
  if (dimension === "setup")
    return trade.journal?.setup?.trim() || "Unclassified";
  if (dimension === "direction")
    return trade.side === "long" ? "Long" : "Short";
  if (dimension === "session") return sessionFor(date);
  if (dimension === "weekday") return easternParts(date).weekday;
  const hour = easternParts(date).hour;
  return `${hour % 12 || 12} ${hour < 12 ? "AM" : "PM"} ET`;
}

export function performanceBreakdown(
  trades: Trade[],
  dimension: BreakdownDimension,
): BreakdownRow[] {
  const groups = new Map<string, Trade[]>();
  trades.forEach((trade) => {
    const key = dimensionKey(trade, dimension);
    groups.set(key, [...(groups.get(key) ?? []), trade]);
  });
  return [...groups.entries()]
    .map(([key, group]) => {
      const pnl = group.reduce(
        (total, trade) => total + (Number(trade.netPnl) || 0),
        0,
      );
      const wins = group.filter((trade) => Number(trade.netPnl) > 0).length;
      return {
        key,
        trades: group.length,
        wins,
        winRate: group.length ? (wins / group.length) * 100 : 0,
        pnl,
        expectancy: group.length ? pnl / group.length : 0,
      };
    })
    .sort((left, right) => right.pnl - left.pnl);
}

export function calendarDays(trades: Trade[]) {
  const days = new Map<string, CalendarDay>();
  trades.forEach((trade) => {
    const key = localDateKey(new Date(trade.occurredAt));
    const current = days.get(key) ?? {
      key,
      pnl: 0,
      trades: 0,
      wins: 0,
      winRate: 0,
      reflected: 0,
      ruleEvidence: 0,
      ruleAdherent: 0,
      notable: [],
    };
    current.pnl += Number(trade.netPnl) || 0;
    current.trades += 1;
    current.wins += Number(trade.netPnl) > 0 ? 1 : 0;
    current.reflected += trade.journal?.status === "reviewed" ? 1 : 0;
    const hasRuleEvidence = Boolean(
      trade.planId || trade.journal?.postTradeChecklist,
    );
    current.ruleEvidence += hasRuleEvidence ? 1 : 0;
    current.ruleAdherent += hasRuleEvidence && trade.respectedStop ? 1 : 0;
    if (trade.journal?.tags.includes("chase"))
      current.notable.push("Chase tag recorded");
    if (trade.journal?.focusRating && trade.journal.focusRating <= 2)
      current.notable.push("Low focus recorded");
    days.set(key, current);
  });
  days.forEach((day) => {
    day.winRate = day.trades ? (day.wins / day.trades) * 100 : 0;
    day.notable = [...new Set(day.notable)];
  });
  return days;
}

export function generatedInsights(trades: Trade[], startingBalance = 10_000) {
  const metrics = performanceMetrics(trades, startingBalance);
  const insights: Array<{
    tone: "positive" | "attention" | "neutral";
    title: string;
    body: string;
  }> = [];
  if (!trades.length)
    return [
      {
        tone: "neutral" as const,
        title: "Build the evidence base",
        body: "Import or record completed trades, then add reflections. Insights appear only when local evidence exists.",
      },
    ];
  if (metrics.reflectionRate < 80)
    insights.push({
      tone: "attention",
      title: "Close the reflection gap",
      body: `${Math.round(100 - metrics.reflectionRate)}% of entries still lack a complete reflection. Finish context before adding more analysis.`,
    });
  else
    insights.push({
      tone: "positive",
      title: "Strong journal coverage",
      body: `${Math.round(metrics.reflectionRate)}% of recorded trades include a completed reflection.`,
    });
  if (metrics.planCoverage < 60)
    insights.push({
      tone: "attention",
      title: "Strengthen pre-trade evidence",
      body: `Only ${Math.round(metrics.planCoverage)}% of trades link to a timestamped plan. Record the trigger, invalidation, and risk before entry.`,
    });
  if (metrics.maximumDrawdown > Math.max(25, startingBalance * 0.02))
    insights.push({
      tone: "attention",
      title: "Review the drawdown sequence",
      body: `The largest recorded peak-to-trough decline is $${metrics.maximumDrawdown.toFixed(2)}. Inspect the trades immediately before the trough for repeated tags or rule breaks.`,
    });
  const tags = new Map<string, { count: number; pnl: number }>();
  trades.forEach((trade) =>
    trade.journal?.tags.forEach((tag) => {
      const value = tags.get(tag) ?? { count: 0, pnl: 0 };
      value.count += 1;
      value.pnl += Number(trade.netPnl) || 0;
      tags.set(tag, value);
    }),
  );
  const repeatedNegative = [...tags.entries()]
    .filter(([, value]) => value.count >= 2 && value.pnl < 0)
    .sort((left, right) => left[1].pnl - right[1].pnl)[0];
  if (repeatedNegative)
    insights.push({
      tone: "attention",
      title: `Pattern to study: #${repeatedNegative[0]}`,
      body: `${repeatedNegative[1].count} tagged trades total ${repeatedNegative[1].pnl.toFixed(2)}. Review the shared decision process; this is evidence, not a prediction.`,
    });
  if (metrics.expectancy > 0 && trades.length >= 5)
    insights.push({
      tone: "positive",
      title: "Positive recorded expectancy",
      body: `The current sample averages $${metrics.expectancy.toFixed(2)} per recorded trade across ${trades.length} trades. Preserve the process and avoid treating a small sample as certainty.`,
    });
  return insights.slice(0, 4);
}

export function periodSummary(
  trades: Trade[],
  label: string,
  startingBalance = 10_000,
) {
  const metrics = performanceMetrics(trades, startingBalance);
  const best = [...trades].sort(
    (a, b) => Number(b.netPnl) - Number(a.netPnl),
  )[0];
  const worst = [...trades].sort(
    (a, b) => Number(a.netPnl) - Number(b.netPnl),
  )[0];
  return {
    label,
    metrics,
    best,
    worst,
    headline: trades.length
      ? `${trades.length} recorded trades · ${metrics.winRate.toFixed(0)}% win rate · ${metrics.netPnl >= 0 ? "+" : ""}$${metrics.netPnl.toFixed(2)}`
      : "No recorded trades in this period",
  };
}
