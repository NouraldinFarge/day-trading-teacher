import type {
  ChartTemplateId,
  ChartWorkspacePreferences,
  MarketBar,
} from "./types";

export const defaultChartWorkspace: ChartWorkspacePreferences = {
  templateId: "price_action",
  style: "candles",
  lowerStudy: "volume",
  scaleMode: "linear",
  crosshair: true,
  gridLines: true,
  extremeLabels: true,
  extendedHours: true,
  overlays: {
    fast: true,
    slow: true,
    ema: false,
    vwap: false,
    bollinger: false,
    recorded: true,
    simulation: true,
    paper: true,
  },
};

export const chartTemplates: Array<{
  id: Exclude<ChartTemplateId, "custom">;
  label: string;
  description: string;
  windowSize: number;
  preferences: ChartWorkspacePreferences;
}> = [
  {
    id: "price_action",
    label: "Price action",
    description: "Clean structure with volume and core moving averages.",
    windowSize: 100,
    preferences: defaultChartWorkspace,
  },
  {
    id: "trend",
    label: "Trend structure",
    description: "Hollow candles, EMA/SMA structure, and MACD confirmation.",
    windowSize: 100,
    preferences: {
      ...defaultChartWorkspace,
      templateId: "trend",
      style: "hollow",
      lowerStudy: "macd",
      overlays: {
        ...defaultChartWorkspace.overlays,
        fast: false,
        ema: true,
      },
    },
  },
  {
    id: "momentum",
    label: "Momentum focus",
    description: "A tighter view with EMA, VWAP, Bollinger Bands, and RSI.",
    windowSize: 50,
    preferences: {
      ...defaultChartWorkspace,
      templateId: "momentum",
      lowerStudy: "rsi",
      overlays: {
        ...defaultChartWorkspace.overlays,
        fast: false,
        slow: false,
        ema: true,
        vwap: true,
        bollinger: true,
      },
    },
  },
  {
    id: "risk_review",
    label: "Risk review",
    description: "Trade events, paper levels, and ATR without signal clutter.",
    windowSize: 100,
    preferences: {
      ...defaultChartWorkspace,
      templateId: "risk_review",
      lowerStudy: "atr",
      overlays: {
        ...defaultChartWorkspace.overlays,
        fast: false,
        slow: false,
      },
    },
  },
];

export function chartTemplate(
  id: Exclude<ChartTemplateId, "custom">,
): (typeof chartTemplates)[number] {
  return chartTemplates.find((template) => template.id === id)!;
}

export function isIntradayTimeframe(timeframe: string) {
  const normalized = timeframe.trim().toLowerCase();
  return (
    /^(?:\d+\s*)?(?:m|min|mins|minute|minutes|h|hr|hrs|hour|hours)$/.test(
      normalized,
    ) || normalized.includes("intraday")
  );
}

export function isRegularMarketTimestamp(timestamp: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return true;
  const minutes = hour * 60 + minute;
  return minutes >= 9 * 60 + 30 && minutes < 16 * 60;
}

export function normalizedComparisonSeries(
  primaryBars: MarketBar[],
  comparisonBars: MarketBar[],
): Array<number | null> {
  const comparisonByTime = new Map(
    comparisonBars.map((bar) => [bar.timestamp, bar.close]),
  );
  const aligned = primaryBars.map(
    (bar) => comparisonByTime.get(bar.timestamp) ?? null,
  );
  const base = aligned.find(
    (value): value is number => value !== null && value > 0,
  );
  if (!base) return aligned.map(() => null);
  return aligned.map((value) =>
    value === null ? null : Number(((value / base - 1) * 100).toFixed(8)),
  );
}
