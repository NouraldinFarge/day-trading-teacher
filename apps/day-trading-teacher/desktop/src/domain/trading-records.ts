import {
  parseFidelityOrdersCsv,
  type FidelityImportPreview,
  type FidelityOrderEvidence,
  type FidelityRoundTrip,
} from "./fidelity-import";
import {
  inferMarketDataSymbol,
  parseMarketDataCsv,
  type MarketDataImport,
} from "./market-data";
import type { MarketBar, MarketDataSet } from "./types";

export type TradingRecordsSourceFile = {
  name: string;
  relativePath: string;
  modifiedAt: number;
  sizeBytes: number;
  kind: "orders" | "chart";
  folderDate: string | null;
  content: string;
};

export type TradingRecordsScanInput = {
  files: TradingRecordsSourceFile[];
  discoveredCsvCount: number;
  unsupportedCsvCount: number;
  oversizedCsvCount: number;
  unreadableCsvCount: number;
  truncatedCsvCount: number;
  totalBytes: number;
  warnings: string[];
};

export type TradingRecordChartContext = {
  evidenceRef: string;
  available: boolean;
  barCount: number;
  entryBarTimestamp: string | null;
  exitBarTimestamp: string | null;
  entryLocationPercent: number | null;
  entryVwap: number | null;
  maximumFavorableExcursionPercent: number | null;
  maximumAdverseExcursionPercent: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  warning: string | null;
};

export type TradingRecordChartSession = {
  evidenceRef: string;
  date: string;
  symbol: string;
  sourceFile: string;
  modifiedAt: number;
  bars: MarketBar[];
  timeframe: string;
  firstTimestamp: string;
  lastTimestamp: string;
  indicatorColumns: string[];
  discontinuityCount: number;
  warnings: string[];
};

export type TradingRecordDay = {
  date: string;
  orderFiles: string[];
  chartFiles: string[];
  symbols: string[];
  orderCount: number;
  reconstructedTradeCount: number;
  unresolvedOrderCount: number;
  skippedOrderCount: number;
  observedBuyDollars: number;
  calculatedSellProceeds: number;
  calculatedNetCashFlow: number;
  chartSymbolCount: number;
  chartMatchedTradeCount: number;
  warnings: string[];
};

export type TradingRecordsAnalysis = {
  scannedAt: string;
  filesRead: number;
  discoveredCsvCount: number;
  orderFileCount: number;
  chartFileCount: number;
  unsupportedCsvCount: number;
  skippedCsvCount: number;
  totalBytes: number;
  days: TradingRecordDay[];
  trades: FidelityRoundTrip[];
  orders: FidelityOrderEvidence[];
  orderPreviews: Array<{
    sourceFile: string;
    folderDate: string | null;
    preview: FidelityImportPreview;
  }>;
  chartSessions: TradingRecordChartSession[];
  chartContextByTrade: Record<string, TradingRecordChartContext>;
  warnings: string[];
};

function dateInNewYork(timestamp: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(new Date(timestamp))
    .reduce<Record<string, string>>((result, part) => {
      if (part.type !== "literal") result[part.type] = part.value;
      return result;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function rounded(value: number, precision = 4) {
  return Number(value.toFixed(precision));
}

function chartSession(
  file: TradingRecordsSourceFile,
): TradingRecordChartSession {
  const symbol = inferMarketDataSymbol(file.name, file.content);
  if (!symbol)
    throw new Error(
      "The chart symbol could not be determined from its filename.",
    );
  const parsed = parseMarketDataCsv(file.content);
  const date = file.folderDate;
  if (!date)
    throw new Error(
      "Place the chart inside a YYYY-MM-DD folder before scanning.",
    );
  const bars = parsed.bars.filter(
    (bar) => dateInNewYork(bar.timestamp) === date,
  );
  if (bars.length < 3)
    throw new Error(
      `No usable ${date} one-minute session was found in this chart export.`,
    );
  return {
    evidenceRef: `chart:${date}:${symbol}`,
    date,
    symbol,
    sourceFile: file.relativePath,
    modifiedAt: file.modifiedAt,
    bars,
    timeframe: parsed.timeframe,
    firstTimestamp: bars[0].timestamp,
    lastTimestamp: bars.at(-1)!.timestamp,
    indicatorColumns: parsed.indicatorColumns,
    discontinuityCount: discontinuitiesForBars(bars, parsed),
    warnings: parsed.warnings,
  };
}

function discontinuitiesForBars(bars: MarketBar[], parsed: MarketDataImport) {
  if (bars.length === parsed.bars.length) return parsed.discontinuityCount;
  const gaps = bars
    .slice(1)
    .map(
      (bar, index) =>
        new Date(bar.timestamp).getTime() -
        new Date(bars[index].timestamp).getTime(),
    )
    .filter((gap) => gap > 0)
    .sort((left, right) => left - right);
  const base = gaps[Math.floor(Math.max(0, gaps.length - 1) * 0.25)] ?? 0;
  return base ? gaps.filter((gap) => gap > base * 1.5).length : 0;
}

function nearestBar(bars: MarketBar[], timestamp: number) {
  return bars.reduce<MarketBar | null>((nearest, bar) => {
    if (!nearest) return bar;
    return Math.abs(new Date(bar.timestamp).getTime() - timestamp) <
      Math.abs(new Date(nearest.timestamp).getTime() - timestamp)
      ? bar
      : nearest;
  }, null);
}

function chartContext(
  trade: FidelityRoundTrip,
  session?: TradingRecordChartSession,
): TradingRecordChartContext {
  const evidenceRef = `chart:${trade.tradingDate}:${trade.symbol}`;
  if (!session)
    return {
      evidenceRef,
      available: false,
      barCount: 0,
      entryBarTimestamp: null,
      exitBarTimestamp: null,
      entryLocationPercent: null,
      entryVwap: null,
      maximumFavorableExcursionPercent: null,
      maximumAdverseExcursionPercent: null,
      dayHigh: null,
      dayLow: null,
      warning: "No same-day chart export was available for this symbol.",
    };
  const entryTime = new Date(trade.entryAt).getTime();
  const exitTime = new Date(trade.exitAt).getTime();
  const entryPrice = Number(trade.entry);
  const entryBar = nearestBar(session.bars, entryTime);
  const exitBar = nearestBar(session.bars, exitTime);
  const replayBars = session.bars.filter((bar) => {
    const timestamp = new Date(bar.timestamp).getTime();
    return timestamp >= entryTime - 60_000 && timestamp <= exitTime + 60_000;
  });
  const dayHigh = Math.max(...session.bars.map((bar) => bar.high));
  const dayLow = Math.min(...session.bars.map((bar) => bar.low));
  const range = dayHigh - dayLow;
  const throughEntry = session.bars.filter(
    (bar) => new Date(bar.timestamp).getTime() <= entryTime + 60_000,
  );
  const vwapParts = throughEntry.reduce(
    (result, bar) => {
      const volume = bar.volume ?? 0;
      const typical = (bar.high + bar.low + bar.close) / 3;
      result.notional += typical * volume;
      result.volume += volume;
      return result;
    },
    { notional: 0, volume: 0 },
  );
  const favorableHigh = replayBars.length
    ? Math.max(...replayBars.map((bar) => bar.high))
    : null;
  const adverseLow = replayBars.length
    ? Math.min(...replayBars.map((bar) => bar.low))
    : null;
  return {
    evidenceRef: session.evidenceRef,
    available: true,
    barCount: replayBars.length,
    entryBarTimestamp: entryBar?.timestamp ?? null,
    exitBarTimestamp: exitBar?.timestamp ?? null,
    entryLocationPercent:
      range > 0 ? rounded(((entryPrice - dayLow) / range) * 100, 1) : null,
    entryVwap:
      vwapParts.volume > 0
        ? rounded(vwapParts.notional / vwapParts.volume)
        : null,
    maximumFavorableExcursionPercent:
      favorableHigh === null
        ? null
        : rounded(((favorableHigh - entryPrice) / entryPrice) * 100, 2),
    maximumAdverseExcursionPercent:
      adverseLow === null
        ? null
        : rounded(((adverseLow - entryPrice) / entryPrice) * 100, 2),
    dayHigh: rounded(dayHigh),
    dayLow: rounded(dayLow),
    warning:
      replayBars.length > 0
        ? null
        : "The chart exists, but no bars overlap the reconstructed holding window.",
  };
}

export function analyzeTradingRecordsScan(
  scan: TradingRecordsScanInput,
  scannedAt = new Date().toISOString(),
): TradingRecordsAnalysis {
  const warnings = [...scan.warnings];
  const orderPreviews: TradingRecordsAnalysis["orderPreviews"] = [];
  const chartSessionsByKey = new Map<string, TradingRecordChartSession>();

  for (const file of scan.files) {
    if (file.kind === "orders") {
      try {
        const preview = parseFidelityOrdersCsv(file.content);
        orderPreviews.push({
          sourceFile: file.relativePath,
          folderDate: file.folderDate,
          preview,
        });
        if (
          file.folderDate &&
          preview.tradingDates.some((date) => date !== file.folderDate)
        )
          warnings.push(
            `${file.relativePath}: at least one order date differs from its parent folder date.`,
          );
      } catch (reason) {
        warnings.push(
          `${file.relativePath}: ${reason instanceof Error ? reason.message : String(reason)}`,
        );
      }
      continue;
    }
    try {
      const session = chartSession(file);
      const key = `${session.date}|${session.symbol}`;
      const existing = chartSessionsByKey.get(key);
      if (
        !existing ||
        session.bars.length > existing.bars.length ||
        (session.bars.length === existing.bars.length &&
          session.modifiedAt > existing.modifiedAt)
      )
        chartSessionsByKey.set(key, session);
    } catch (reason) {
      warnings.push(
        `${file.relativePath}: ${reason instanceof Error ? reason.message : String(reason)}`,
      );
    }
  }

  const trades = orderPreviews.flatMap((item) => item.preview.trades);
  const orders = orderPreviews.flatMap((item) => item.preview.orders);
  const chartSessions = [...chartSessionsByKey.values()].sort((left, right) =>
    `${right.date}|${right.symbol}`.localeCompare(
      `${left.date}|${left.symbol}`,
    ),
  );
  const chartContextByTrade = Object.fromEntries(
    trades.map((trade) => {
      const session = chartSessionsByKey.get(
        `${trade.tradingDate}|${trade.symbol}`,
      );
      return [trade.sourceId, chartContext(trade, session)];
    }),
  );

  const dayDates = new Set<string>();
  for (const file of scan.files)
    if (file.folderDate) dayDates.add(file.folderDate);
  for (const preview of orderPreviews)
    for (const date of preview.preview.tradingDates) dayDates.add(date);
  const days = [...dayDates]
    .sort()
    .reverse()
    .map<TradingRecordDay>((date) => {
      const dayOrders = orderPreviews.filter(
        (item) =>
          item.folderDate === date || item.preview.tradingDates.includes(date),
      );
      const dayTrades = trades.filter((trade) => trade.tradingDate === date);
      const dayCharts = chartSessions.filter(
        (session) => session.date === date,
      );
      const dayWarnings = [
        ...dayOrders.flatMap((item) => item.preview.warnings),
        ...dayTrades.flatMap((trade) => {
          const context = chartContextByTrade[trade.sourceId];
          return context?.warning
            ? [`${trade.symbol}: ${context.warning}`]
            : [];
        }),
      ];
      const buyDollars = dayOrders.reduce(
        (sum, item) => sum + item.preview.observedBuyDollars,
        0,
      );
      const sellProceeds = dayOrders.reduce(
        (sum, item) => sum + item.preview.calculatedSellProceeds,
        0,
      );
      return {
        date,
        orderFiles: [...new Set(dayOrders.map((item) => item.sourceFile))],
        chartFiles: [
          ...new Set(dayCharts.map((session) => session.sourceFile)),
        ],
        symbols: [
          ...new Set([
            ...dayOrders.flatMap((item) => item.preview.symbols),
            ...dayCharts.map((session) => session.symbol),
          ]),
        ].sort(),
        orderCount: dayOrders.reduce(
          (sum, item) => sum + item.preview.filledOrderCount,
          0,
        ),
        reconstructedTradeCount: dayTrades.length,
        unresolvedOrderCount: dayOrders.reduce(
          (sum, item) => sum + item.preview.unmatchedOrderCount,
          0,
        ),
        skippedOrderCount: dayOrders.reduce(
          (sum, item) => sum + item.preview.skippedOrderCount,
          0,
        ),
        observedBuyDollars: rounded(buyDollars, 2),
        calculatedSellProceeds: rounded(sellProceeds, 2),
        calculatedNetCashFlow: rounded(sellProceeds - buyDollars, 2),
        chartSymbolCount: dayCharts.length,
        chartMatchedTradeCount: dayTrades.filter(
          (trade) => chartContextByTrade[trade.sourceId]?.available,
        ).length,
        warnings: [...new Set(dayWarnings)],
      };
    });

  return {
    scannedAt,
    filesRead: scan.files.length,
    discoveredCsvCount: scan.discoveredCsvCount,
    orderFileCount: scan.files.filter((file) => file.kind === "orders").length,
    chartFileCount: scan.files.filter((file) => file.kind === "chart").length,
    unsupportedCsvCount: scan.unsupportedCsvCount,
    skippedCsvCount:
      scan.oversizedCsvCount + scan.unreadableCsvCount + scan.truncatedCsvCount,
    totalBytes: scan.totalBytes,
    days,
    trades,
    orders,
    orderPreviews,
    chartSessions,
    chartContextByTrade,
    warnings: [...new Set(warnings)],
  };
}

export function marketDataSetForTradingRecord(
  session: TradingRecordChartSession,
  matchedTradeCount: number,
  importedAt = new Date().toISOString(),
): MarketDataSet {
  return {
    id: `fidelity-record:${session.date}:${session.symbol}`,
    name: `${session.symbol} · ${session.date} Fidelity record`,
    symbol: session.symbol,
    timeframe: session.timeframe,
    sourceType: "csv",
    sourceFile: session.sourceFile,
    importedAt,
    bars: session.bars,
    feed: "Fidelity Trader+ Desktop chart export",
    freshness: `Historical session ${session.date}`,
    session: "extended",
    adjusted: false,
    importSummary: {
      firstTimestamp: session.firstTimestamp,
      lastTimestamp: session.lastTimestamp,
      indicatorColumns: session.indicatorColumns,
      discontinuityCount: session.discontinuityCount,
      matchedTradeCount,
    },
  };
}
