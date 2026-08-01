import { parseCsvRows, parseFlexibleNumber } from "./csv";
import type { MarketBar, MarketDataSet } from "./types";

const MAX_FILE_SIZE = 12_000_000;
export const MAX_MARKET_BARS = 20_000;

export type MarketDataImport = {
  bars: MarketBar[];
  timeframe: string;
  skippedRows: number;
  firstTimestamp: string;
  lastTimestamp: string;
  indicatorColumns: string[];
  discontinuityCount: number;
  warnings: string[];
};

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function zonedTimestamp(parts: number[], timeZone: string) {
  const [year, month, day, hour = 0, minute = 0, second = 0] = parts;
  const guess = Date.UTC(year, month - 1, day, hour, minute, second);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  let resolved = guess;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const displayed = Object.fromEntries(
      formatter
        .formatToParts(new Date(resolved))
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, Number(part.value)]),
    ) as Record<string, number>;
    const offset =
      Date.UTC(
        displayed.year,
        displayed.month - 1,
        displayed.day,
        displayed.hour,
        displayed.minute,
        displayed.second,
      ) - resolved;
    resolved = guess - offset;
  }
  return new Date(resolved).toISOString();
}

function parseTimestamp(value: string, assumeTimeZone?: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{10,13}$/.test(trimmed)) {
    const numeric = Number(trimmed);
    const milliseconds = trimmed.length === 10 ? numeric * 1000 : numeric;
    const date = new Date(milliseconds);
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  }
  const localParts = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (assumeTimeZone && localParts)
    return zonedTimestamp(localParts.slice(1).map(Number), assumeTimeZone);
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(trimmed)
    ? trimmed.replace(" ", "T")
    : trimmed;
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function inferTimeframe(bars: MarketBar[]) {
  if (bars.length < 2) return "Unknown";
  const gaps = bars
    .slice(1)
    .map(
      (bar, index) =>
        (new Date(bar.timestamp).getTime() -
          new Date(bars[index].timestamp).getTime()) /
        1000,
    )
    .filter((gap) => gap > 0)
    .sort((a, b) => a - b);
  // Use the lower quartile so weekends and missing bars do not inflate the base interval.
  const seconds = gaps[Math.floor(Math.max(0, gaps.length - 1) * 0.25)] ?? 0;
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))}s`;
  if (seconds < 3_600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.round(seconds / 3_600)}h`;
  return `${Math.round(seconds / 86_400)}d`;
}

export function inferMarketDataSymbol(fileName: string, raw: string) {
  const rows = parseCsvRows(raw.replace(/^\uFEFF/, ""));
  const headerIndex = rows.findIndex((row) => {
    const headers = row.map(normalizeHeader);
    return headers.includes("symbol") || headers.includes("ticker");
  });
  if (headerIndex >= 0) {
    const headers = rows[headerIndex].map(normalizeHeader);
    const symbolIndex = Math.max(
      headers.indexOf("symbol"),
      headers.indexOf("ticker"),
    );
    const symbols = [
      ...new Set(
        rows
          .slice(headerIndex + 1, headerIndex + 101)
          .map((row) => row[symbolIndex]?.trim().toUpperCase())
          .filter((value) => value && /^[A-Z0-9.-]{1,16}$/.test(value)),
      ),
    ];
    if (symbols.length === 1) return symbols[0];
  }

  const stem = fileName.replace(/\.[^.]+$/, "").trim();
  const match = stem.match(/^([A-Za-z][A-Za-z0-9.-]{0,15})(?=[\s_(-]|$)/);
  const candidate = match?.[1]?.toUpperCase() ?? "";
  const genericNames = new Set([
    "CHART",
    "DATA",
    "EXPORT",
    "HISTORY",
    "HISTORICAL",
    "MARKET",
    "OHLC",
    "OHLCV",
    "PRICES",
  ]);
  return candidate && !genericNames.has(candidate) ? candidate : null;
}

export function parseMarketDataCsv(
  raw: string,
  options?: { assumeTimeZone?: string },
): MarketDataImport {
  if (raw.length > MAX_FILE_SIZE)
    throw new Error(
      "The historical data file is larger than the 12 MB safety limit.",
    );
  const rows = parseCsvRows(raw.replace(/^\uFEFF/, ""));
  const headerIndex = rows.findIndex((row) => {
    const headers = row.map(normalizeHeader);
    const hasTime = headers.some((header) =>
      ["timestamp", "datetime", "date", "time"].includes(header),
    );
    return (
      hasTime &&
      ["open", "high", "low", "close"].every((required) =>
        headers.includes(required),
      )
    );
  });
  if (headerIndex < 0)
    throw new Error(
      "Use a CSV with Timestamp (or Date), Open, High, Low, and Close columns.",
    );

  const headers = rows[headerIndex].map(normalizeHeader);
  const indexOf = (...names: string[]) =>
    names.map((name) => headers.indexOf(name)).find((index) => index >= 0) ??
    -1;
  const timestampIndex = indexOf("timestamp", "datetime");
  const dateIndex = indexOf("date");
  const timeIndex = indexOf("time");
  const openIndex = indexOf("open");
  const highIndex = indexOf("high");
  const lowIndex = indexOf("low");
  const closeIndex = indexOf("close");
  const volumeIndex = indexOf("volume", "vol");
  const coreColumnIndexes = new Set(
    [
      timestampIndex,
      dateIndex,
      timeIndex,
      openIndex,
      highIndex,
      lowIndex,
      closeIndex,
      volumeIndex,
    ].filter((index) => index >= 0),
  );
  const indicatorColumns = rows[headerIndex]
    .filter((_, index) => !coreColumnIndexes.has(index))
    .map((header) => header.trim())
    .filter(Boolean);
  const byTimestamp = new Map<string, MarketBar>();
  let skippedRows = 0;
  let duplicateRows = 0;

  for (const row of rows.slice(headerIndex + 1)) {
    const rawTimestamp =
      timestampIndex >= 0
        ? row[timestampIndex]
        : `${row[dateIndex] ?? ""}${timeIndex >= 0 ? ` ${row[timeIndex] ?? ""}` : ""}`;
    const timestamp = parseTimestamp(
      rawTimestamp ?? "",
      options?.assumeTimeZone,
    );
    const open = parseFlexibleNumber(row[openIndex] ?? "");
    const high = parseFlexibleNumber(row[highIndex] ?? "");
    const low = parseFlexibleNumber(row[lowIndex] ?? "");
    const close = parseFlexibleNumber(row[closeIndex] ?? "");
    const volumeValue =
      volumeIndex >= 0
        ? parseFlexibleNumber(row[volumeIndex] ?? "")
        : Number.NaN;
    const pricesValid = [open, high, low, close].every(
      (price) => Number.isFinite(price) && price > 0,
    );
    const rangeValid =
      pricesValid &&
      high >= Math.max(open, close, low) &&
      low <= Math.min(open, close, high);
    if (!timestamp || !rangeValid) {
      skippedRows += 1;
      continue;
    }
    if (byTimestamp.has(timestamp)) duplicateRows += 1;
    byTimestamp.set(timestamp, {
      timestamp,
      open,
      high,
      low,
      close,
      volume:
        Number.isFinite(volumeValue) && volumeValue >= 0 ? volumeValue : null,
    });
  }

  let bars = [...byTimestamp.values()].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp),
  );
  if (bars.length < 3)
    throw new Error(
      "The file needs at least three valid, chronological price bars.",
    );
  const warnings: string[] = [];
  if (skippedRows)
    warnings.push(
      `${skippedRows} row${skippedRows === 1 ? " was" : "s were"} skipped because the timestamp or OHLC range was invalid.`,
    );
  if (duplicateRows)
    warnings.push(
      `${duplicateRows} duplicate timestamp${duplicateRows === 1 ? " was" : "s were"} replaced by the last row.`,
    );
  if (bars.length > MAX_MARKET_BARS) {
    warnings.push(
      `Only the newest ${MAX_MARKET_BARS.toLocaleString()} bars were kept to protect app performance.`,
    );
    bars = bars.slice(-MAX_MARKET_BARS);
  }
  const positiveGaps = bars
    .slice(1)
    .map(
      (bar, index) =>
        new Date(bar.timestamp).getTime() -
        new Date(bars[index].timestamp).getTime(),
    )
    .filter((gap) => gap > 0)
    .sort((left, right) => left - right);
  const baseGap =
    positiveGaps[Math.floor(Math.max(0, positiveGaps.length - 1) * 0.25)] ?? 0;
  const discontinuityCount = baseGap
    ? positiveGaps.filter((gap) => gap > baseGap * 1.5).length
    : 0;
  if (indicatorColumns.length)
    warnings.push(
      `${indicatorColumns.length} supplemental study column${indicatorColumns.length === 1 ? " was" : "s were"} detected. Price bars were imported; the original study names are preserved in the dataset details.`,
    );
  return {
    bars,
    timeframe: inferTimeframe(bars),
    skippedRows,
    firstTimestamp: bars[0].timestamp,
    lastTimestamp: bars.at(-1)!.timestamp,
    indicatorColumns,
    discontinuityCount,
    warnings,
  };
}

export function createGuidedSampleData(): MarketDataSet {
  const bars: MarketBar[] = [];
  let priorClose = 98.4;
  let day = new Date(Date.UTC(2025, 0, 2, 21));
  while (bars.length < 220) {
    if (day.getUTCDay() !== 0 && day.getUTCDay() !== 6) {
      const index = bars.length;
      const drift = 0.055 + Math.sin(index / 13) * 0.12;
      const open = priorClose + Math.sin(index * 1.7) * 0.28;
      const close = Math.max(20, open + drift + Math.sin(index / 3.9) * 0.48);
      const spread = 0.62 + Math.abs(Math.cos(index / 5)) * 0.35;
      bars.push({
        timestamp: day.toISOString(),
        open: Number(open.toFixed(2)),
        high: Number((Math.max(open, close) + spread).toFixed(2)),
        low: Number((Math.min(open, close) - spread * 0.82).toFixed(2)),
        close: Number(close.toFixed(2)),
        volume: Math.round(850_000 + Math.abs(Math.sin(index / 8)) * 1_300_000),
      });
      priorClose = close;
    }
    day = new Date(day.getTime() + 86_400_000);
  }
  return {
    id: crypto.randomUUID(),
    name: "Guided chart sample",
    symbol: "DEMO",
    timeframe: "1d",
    sourceType: "sample",
    sourceFile: "Built-in synthetic practice data",
    importedAt: new Date().toISOString(),
    bars,
  };
}
