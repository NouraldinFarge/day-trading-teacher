import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Expand,
  EyeOff,
  LayoutTemplate,
  Maximize2,
  Minimize2,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Ruler,
  Settings2,
  StepBack,
  StepForward,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";
import {
  simpleMovingAverage,
  type BacktestSettings,
  type BacktestTrade,
} from "../../domain/backtest";
import type {
  ChartLowerStudy,
  ChartOverlayPreferences,
  ChartStylePreference,
  ChartWorkspacePreferences,
  MarketDataSet,
  PaperTradingSession,
  Trade,
} from "../../domain/types";
import {
  createPaperTradingSession,
  processPaperBar,
  type PaperSessionDefaults,
} from "../../domain/paper-trading";
import {
  averageTrueRange,
  bollingerBands,
  compactVolume,
  exponentialMovingAverage,
  movingAverageConvergenceDivergence,
  relativeStrengthIndex,
  volumeWeightedAveragePrice,
} from "./chart-analysis";
import {
  chartTemplate,
  chartTemplates,
  defaultChartWorkspace,
  isIntradayTimeframe,
  isRegularMarketTimestamp,
  normalizedComparisonSeries,
} from "../../domain/chart-workspace";
import { PaperTradingPanel } from "./PaperTradingPanel";

type Marker = {
  id: string;
  index: number;
  price: number;
  kind:
    | "recorded-entry"
    | "recorded-exit"
    | "sim-entry"
    | "sim-exit"
    | "paper-entry"
    | "paper-exit";
  label: string;
};

type OverlayKey = keyof ChartOverlayPreferences;
type TrendAnchor = { index: number; price: number };
type TrendLine = { id: string; start: TrendAnchor; end: TrendAnchor };

const quickWindows = [25, 50, 100, 200, 400];
const minimumZoomWindow = 10;
const maximumZoomWindow = 800;
const granularZoomRatio = 0.02;
const chartWidth = 1120;
const chartHeight = 590;
const chartMargin = { top: 28, right: 88, bottom: 58, left: 22 } as const;
const chartStudyTop = 422;
const chartStudyBottom = 512;

function nearestBarIndex(bars: MarketDataSet["bars"], timestamp?: string) {
  if (!timestamp || !bars.length) return -1;
  const target = new Date(timestamp).getTime();
  if (!Number.isFinite(target)) return -1;
  const first = new Date(bars[0].timestamp).getTime();
  const last = new Date(bars.at(-1)!.timestamp).getTime();
  if (target < first - 86_400_000 || target > last + 86_400_000) return -1;
  let best = 0;
  let distance = Math.abs(new Date(bars[0].timestamp).getTime() - target);
  for (let index = 1; index < bars.length; index += 1) {
    const candidate = Math.abs(
      new Date(bars[index].timestamp).getTime() - target,
    );
    if (candidate < distance) {
      best = index;
      distance = candidate;
    }
  }
  return best;
}

function formatPrice(value: number) {
  return value >= 1000
    ? value.toFixed(0)
    : value >= 10
      ? value.toFixed(2)
      : value.toFixed(4);
}

function formatSigned(value: number, digits = 2) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function formatAxisTime(timestamp: string, timeframe: string) {
  const intraday = isIntradayTimeframe(timeframe);
  return new Date(timestamp).toLocaleString([], {
    month: "short",
    day: "numeric",
    ...(intraday ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

export function MarketChart({
  dataSet,
  recordedTrades,
  simulationTrades,
  settings,
  comparisonDataSets = [],
  chartPreferences,
  onChartPreferencesChange,
  paperSession = null,
  paperHistory = [],
  paperDefaults,
  onPaperSessionChange,
}: {
  dataSet: MarketDataSet;
  recordedTrades: Trade[];
  simulationTrades: BacktestTrade[];
  settings: BacktestSettings;
  comparisonDataSets?: MarketDataSet[];
  chartPreferences?: ChartWorkspacePreferences;
  onChartPreferencesChange?(preferences: ChartWorkspacePreferences): void;
  paperSession?: PaperTradingSession | null;
  paperHistory?: PaperTradingSession[];
  paperDefaults?: PaperSessionDefaults;
  onPaperSessionChange?(session: PaperTradingSession): void;
}) {
  const [windowSize, setWindowSize] = useState(100);
  const [endIndex, setEndIndex] = useState(dataSet.bars.length);
  const [activeRelative, setActiveRelative] = useState(-1);
  const [localChartPreferences, setLocalChartPreferences] =
    useState<ChartWorkspacePreferences>(defaultChartWorkspace);
  const [comparisonId, setComparisonId] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [measurementStart, setMeasurementStart] = useState<number | null>(null);
  const [priceLevels, setPriceLevels] = useState<number[]>([]);
  const [trendDrawing, setTrendDrawing] = useState(false);
  const [trendStart, setTrendStart] = useState<TrendAnchor | null>(null);
  const [trendLines, setTrendLines] = useState<TrendLine[]>([]);
  const [crosshairPrice, setCrosshairPrice] = useState<number | null>(null);
  const [replayIndex, setReplayIndex] = useState<number | null>(null);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState<1 | 2 | 4>(1);
  const [paperOpen, setPaperOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const preferences = chartPreferences ?? localChartPreferences;
  const chartStyle = preferences.style;
  const study = preferences.lowerStudy;
  const overlays = preferences.overlays;
  const drag = useRef<{ clientX: number; endIndex: number } | null>(null);
  const chart = useRef<SVGSVGElement | null>(null);
  const lastWheelZoomAt = useRef(Number.NEGATIVE_INFINITY);
  const wheelHandler = useRef<(event: WheelEvent) => void>(() => undefined);
  const pointerFrame = useRef<number | null>(null);
  const pendingPointer = useRef<{
    relative: number;
    price: number | null;
  } | null>(null);
  const panFrame = useRef<number | null>(null);
  const pendingPanEnd = useRef<number | null>(null);
  const resolvedPaperDefaults: PaperSessionDefaults = paperDefaults ?? {
    startingBalance: settings.initialCapital,
    maxRiskPerTrade: settings.riskPerTrade,
    dailyLossLimit: settings.riskPerTrade * 3,
    slippagePerShare: settings.slippagePerShare,
    commissionPerOrder: settings.feePerTrade / 2,
  };

  useEffect(() => {
    setEndIndex(dataSet.bars.length);
    setActiveRelative(-1);
    setMeasurementStart(null);
    setPriceLevels([]);
    setTrendLines([]);
    setTrendStart(null);
    setTrendDrawing(false);
    setReplayIndex(null);
    setReplayPlaying(false);
    setPaperOpen(false);
    setDragging(false);
    drag.current = null;
  }, [dataSet.id, dataSet.bars.length]);

  useEffect(() => {
    if (
      comparisonId &&
      !comparisonDataSets.some((candidate) => candidate.id === comparisonId)
    )
      setComparisonId("");
  }, [comparisonDataSets, comparisonId]);

  useEffect(() => {
    if (!paperSession || paperSession.status !== "active") return;
    setPaperOpen(true);
    setReplayIndex(paperSession.replayIndex);
    setEndIndex(paperSession.replayIndex + 1);
    setWindowSize((current) => Math.min(current, paperSession.replayIndex + 1));
  }, [paperSession?.id]);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [expanded]);

  useEffect(
    () => () => {
      if (pointerFrame.current !== null)
        window.cancelAnimationFrame(pointerFrame.current);
      if (panFrame.current !== null)
        window.cancelAnimationFrame(panFrame.current);
    },
    [],
  );

  useEffect(() => {
    if (!replayPlaying || replayIndex === null) return;
    if (replayIndex >= dataSet.bars.length - 1) {
      setReplayPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => {
      const next = Math.min(dataSet.bars.length - 1, replayIndex + 1);
      if (paperSession && paperSession.status === "active")
        onPaperSessionChange?.(
          processPaperBar(
            paperSession,
            dataSet.bars[next],
            next,
            dataSet.bars[next].timestamp,
          ),
        );
      setReplayIndex(next);
      setEndIndex(next + 1);
      setActiveRelative(-1);
      if (next >= dataSet.bars.length - 1) setReplayPlaying(false);
    }, 650 / replaySpeed);
    return () => window.clearTimeout(timer);
  }, [
    dataSet.bars,
    onPaperSessionChange,
    paperSession,
    replayIndex,
    replayPlaying,
    replaySpeed,
  ]);

  const availableLength =
    replayIndex === null ? dataSet.bars.length : replayIndex + 1;
  const actualWindow = Math.min(windowSize, availableLength);
  const startIndex = Math.max(
    0,
    Math.min(endIndex - actualWindow, availableLength - actualWindow),
  );
  const visible = useMemo(
    () => dataSet.bars.slice(startIndex, startIndex + actualWindow),
    [actualWindow, dataSet.bars, startIndex],
  );
  const intraday = isIntradayTimeframe(dataSet.timeframe);
  const visibleEntries = useMemo(
    () => visible.map((bar, relative) => ({ bar, relative })),
    [visible],
  );
  const sessionEntries = useMemo(
    () =>
      !intraday || preferences.extendedHours
        ? visibleEntries
        : visibleEntries.filter(({ bar }) =>
            isRegularMarketTimestamp(bar.timestamp),
          ),
    [intraday, preferences.extendedHours, visibleEntries],
  );
  const displayedEntries = sessionEntries.length
    ? sessionEntries
    : visibleEntries;
  const width = chartWidth;
  const height = chartHeight;
  const margin = chartMargin;
  const studyTop = chartStudyTop;
  const studyBottom = chartStudyBottom;
  const priceBottom = study === "none" ? 500 : 390;
  const plotWidth = width - margin.left - margin.right;
  const plottedIndexByRelative = useMemo(
    () =>
      new Map(displayedEntries.map((entry, index) => [entry.relative, index])),
    [displayedEntries],
  );
  const step = plotWidth / Math.max(1, displayedEntries.length);
  const candleWidth = Math.max(1.5, Math.min(11, step * 0.68));
  const chartId = useMemo(
    () => `chart-${dataSet.id.replace(/[^a-z0-9_-]/gi, "-")}`,
    [dataSet.id],
  );

  const fast = useMemo(
    () => simpleMovingAverage(dataSet.bars, settings.fastPeriod),
    [dataSet.bars, settings.fastPeriod],
  );
  const slow = useMemo(
    () => simpleMovingAverage(dataSet.bars, settings.slowPeriod),
    [dataSet.bars, settings.slowPeriod],
  );
  const ema = useMemo(
    () => exponentialMovingAverage(dataSet.bars, 9),
    [dataSet.bars],
  );
  const vwap = useMemo(
    () => volumeWeightedAveragePrice(dataSet.bars, 20),
    [dataSet.bars],
  );
  const bands = useMemo(
    () => bollingerBands(dataSet.bars, 20, 2),
    [dataSet.bars],
  );
  const atr = useMemo(() => averageTrueRange(dataSet.bars, 14), [dataSet.bars]);
  const rsi = useMemo(
    () => relativeStrengthIndex(dataSet.bars, 14),
    [dataSet.bars],
  );
  const macd = useMemo(
    () => movingAverageConvergenceDivergence(dataSet.bars),
    [dataSet.bars],
  );

  const paperLevels = useMemo(() => {
    const levels: Array<{
      key: string;
      kind: "entry" | "stop" | "target" | "pending";
      price: number;
      label: string;
    }> = [];
    if (paperOpen && paperSession?.position) {
      levels.push(
        {
          key: "paper-entry",
          kind: "entry",
          price: paperSession.position.entryPrice,
          label: `Entry · ${formatPrice(paperSession.position.entryPrice)}`,
        },
        {
          key: "paper-stop",
          kind: "stop",
          price: paperSession.position.stopPrice,
          label: `Stop · ${formatPrice(paperSession.position.stopPrice)}`,
        },
      );
      if (paperSession.position.targetPrice)
        levels.push({
          key: "paper-target",
          kind: "target",
          price: paperSession.position.targetPrice,
          label: `Target · ${formatPrice(paperSession.position.targetPrice)}`,
        });
    } else if (
      paperOpen &&
      paperSession?.pendingOrder?.action !== "close_position" &&
      paperSession?.pendingOrder?.limitPrice
    ) {
      levels.push({
        key: "paper-pending",
        kind: "pending",
        price: paperSession.pendingOrder.limitPrice,
        label: `Pending · ${formatPrice(paperSession.pendingOrder.limitPrice)}`,
      });
    }
    return levels;
  }, [paperOpen, paperSession]);
  const priceScale = useMemo(() => {
    const scaleValues = displayedEntries.flatMap(({ bar, relative }) => {
      const index = startIndex + relative;
      const values = [bar.low, bar.high];
      if (overlays.bollinger) {
        if (bands.lower[index] !== null) values.push(bands.lower[index]!);
        if (bands.upper[index] !== null) values.push(bands.upper[index]!);
      }
      return values;
    });
    scaleValues.push(...paperLevels.map((level) => level.price));
    const rawMin = Math.min(...scaleValues);
    const rawMax = Math.max(...scaleValues);
    const padding = Math.max((rawMax - rawMin) * 0.09, rawMax * 0.001);
    const minimum =
      preferences.scaleMode === "log"
        ? Math.max(0.0000001, rawMin - padding)
        : rawMin - padding;
    const maximum = rawMax + padding;
    const span = Math.max(0.0001, maximum - minimum);
    const logMinimum = Math.log(Math.max(minimum, 0.0000001));
    const logMaximum = Math.log(Math.max(maximum, 0.0000002));
    const logSpan = Math.max(0.0000001, logMaximum - logMinimum);
    return { minimum, maximum, span, logMinimum, logMaximum, logSpan };
  }, [
    bands.lower,
    bands.upper,
    displayedEntries,
    overlays.bollinger,
    paperLevels,
    preferences.scaleMode,
    startIndex,
  ]);
  const { minimum, maximum, span, logMaximum, logSpan } = priceScale;
  const x = useCallback(
    (relative: number) =>
      margin.left +
      step *
        (plottedIndexByRelative.get(relative) ??
          clamp(relative, 0, displayedEntries.length - 1)) +
      step / 2,
    [displayedEntries.length, margin.left, plottedIndexByRelative, step],
  );
  const y = useCallback(
    (price: number) => {
      const ratio =
        preferences.scaleMode === "log" && minimum > 0
          ? (logMaximum - Math.log(Math.max(price, 0.0000001))) / logSpan
          : (maximum - price) / span;
      return margin.top + ratio * (priceBottom - margin.top);
    },
    [
      logMaximum,
      logSpan,
      margin.top,
      maximum,
      minimum,
      preferences.scaleMode,
      priceBottom,
      span,
    ],
  );
  const priceAtY = useCallback(
    (position: number) => {
      const ratio = clamp(
        (position - margin.top) / (priceBottom - margin.top),
        0,
        1,
      );
      return preferences.scaleMode === "log" && minimum > 0
        ? Math.exp(logMaximum - ratio * logSpan)
        : maximum - ratio * span;
    },
    [
      logMaximum,
      logSpan,
      margin.top,
      maximum,
      minimum,
      preferences.scaleMode,
      priceBottom,
      span,
    ],
  );
  const yRsi = useCallback(
    (value: number) =>
      studyTop + ((100 - value) / 100) * (studyBottom - studyTop),
    [studyBottom, studyTop],
  );
  const showsRelative = useCallback(
    (relative: number) =>
      !intraday ||
      preferences.extendedHours ||
      isRegularMarketTimestamp(visible[relative].timestamp),
    [intraday, preferences.extendedHours, visible],
  );
  const visibleStudyValues = useMemo(
    () =>
      study === "macd"
        ? displayedEntries.flatMap(({ relative }) => {
            const index = startIndex + relative;
            return [
              macd.macd[index],
              macd.signal[index],
              macd.histogram[index],
            ].filter((value): value is number => value !== null);
          })
        : study === "atr"
          ? displayedEntries
              .map(({ relative }) => atr[startIndex + relative])
              .filter((value): value is number => value !== null)
          : [],
    [
      atr,
      displayedEntries,
      macd.histogram,
      macd.macd,
      macd.signal,
      startIndex,
      study,
    ],
  );
  const studyScale = useMemo(() => {
    const rawStudyMinimum =
      study === "macd"
        ? Math.min(0, ...visibleStudyValues)
        : Math.min(...visibleStudyValues, 0);
    const rawStudyMaximum = Math.max(...visibleStudyValues, 0.0001);
    const studyPadding = Math.max(
      (rawStudyMaximum - rawStudyMinimum) * 0.12,
      0.0001,
    );
    const studyMinimum = study === "atr" ? 0 : rawStudyMinimum - studyPadding;
    const studyMaximum = rawStudyMaximum + studyPadding;
    return {
      studyMinimum,
      studyMaximum,
      studySpan: Math.max(0.0001, studyMaximum - studyMinimum),
    };
  }, [study, visibleStudyValues]);
  const { studyMaximum, studySpan } = studyScale;
  const yStudy = useCallback(
    (value: number) =>
      studyTop +
      ((studyMaximum - value) / studySpan) * (studyBottom - studyTop),
    [studyBottom, studyMaximum, studySpan, studyTop],
  );
  const maxVolume = useMemo(
    () => Math.max(1, ...displayedEntries.map(({ bar }) => bar.volume ?? 0)),
    [displayedEntries],
  );

  const seriesPath = useCallback(
    (values: Array<number | null>) =>
      visible
        .map((_, relative) => ({
          relative,
          value: values[startIndex + relative],
        }))
        .filter(
          (point): point is { relative: number; value: number } =>
            point.value !== null && showsRelative(point.relative),
        )
        .map(
          (point, index) =>
            `${index ? "L" : "M"}${x(point.relative).toFixed(1)},${y(point.value).toFixed(1)}`,
        )
        .join(" "),
    [showsRelative, startIndex, visible, x, y],
  );
  const closeLine = useMemo(
    () =>
      visible
        .map((bar, relative) => ({ bar, relative }))
        .filter(({ relative }) => showsRelative(relative))
        .map(
          ({ bar, relative }, index) =>
            `${index ? "L" : "M"}${x(relative).toFixed(1)},${y(bar.close).toFixed(1)}`,
        )
        .join(" "),
    [showsRelative, visible, x, y],
  );
  const firstDisplayedRelative = displayedEntries[0].relative;
  const lastDisplayedRelative = displayedEntries.at(-1)!.relative;
  const closeArea = closeLine
    ? `${closeLine} L${x(lastDisplayedRelative).toFixed(1)},${priceBottom} L${x(firstDisplayedRelative).toFixed(1)},${priceBottom} Z`
    : "";
  const rsiLine = useMemo(
    () =>
      visible
        .map((_, relative) => ({
          relative,
          value: rsi[startIndex + relative],
        }))
        .filter(
          (point): point is { relative: number; value: number } =>
            point.value !== null && showsRelative(point.relative),
        )
        .map(
          (point, index) =>
            `${index ? "L" : "M"}${x(point.relative).toFixed(1)},${yRsi(point.value).toFixed(1)}`,
        )
        .join(" "),
    [rsi, showsRelative, startIndex, visible, x, yRsi],
  );
  const studyLine = useCallback(
    (values: Array<number | null>) =>
      visible
        .map((_, relative) => ({
          relative,
          value: values[startIndex + relative],
        }))
        .filter(
          (point): point is { relative: number; value: number } =>
            point.value !== null && showsRelative(point.relative),
        )
        .map(
          (point, index) =>
            `${index ? "L" : "M"}${x(point.relative).toFixed(1)},${yStudy(point.value).toFixed(1)}`,
        )
        .join(" "),
    [showsRelative, startIndex, visible, x, yStudy],
  );
  const bandPoints = useMemo(
    () =>
      visible
        .map((_, relative) => ({
          relative,
          upper: bands.upper[startIndex + relative],
          lower: bands.lower[startIndex + relative],
        }))
        .filter(
          (
            point,
          ): point is { relative: number; upper: number; lower: number } =>
            point.upper !== null &&
            point.lower !== null &&
            showsRelative(point.relative),
        ),
    [bands.lower, bands.upper, showsRelative, startIndex, visible],
  );
  const bollingerArea = useMemo(
    () =>
      bandPoints.length
        ? `${bandPoints
            .map(
              (point, index) =>
                `${index ? "L" : "M"}${x(point.relative).toFixed(1)},${y(point.upper).toFixed(1)}`,
            )
            .join(" ")} ${[...bandPoints]
            .reverse()
            .map(
              (point) =>
                `L${x(point.relative).toFixed(1)},${y(point.lower).toFixed(1)}`,
            )
            .join(" ")} Z`
        : "",
    [bandPoints, x, y],
  );
  const fastPath = useMemo(() => seriesPath(fast), [fast, seriesPath]);
  const slowPath = useMemo(() => seriesPath(slow), [seriesPath, slow]);
  const emaPath = useMemo(() => seriesPath(ema), [ema, seriesPath]);
  const vwapPath = useMemo(() => seriesPath(vwap), [seriesPath, vwap]);
  const bollingerUpperPath = useMemo(
    () => seriesPath(bands.upper),
    [bands.upper, seriesPath],
  );
  const bollingerLowerPath = useMemo(
    () => seriesPath(bands.lower),
    [bands.lower, seriesPath],
  );
  const macdLinePath = useMemo(
    () => studyLine(macd.macd),
    [macd.macd, studyLine],
  );
  const macdSignalPath = useMemo(
    () => studyLine(macd.signal),
    [macd.signal, studyLine],
  );
  const atrPath = useMemo(() => studyLine(atr), [atr, studyLine]);
  const candleElements = useMemo(
    () =>
      displayedEntries.map(({ bar, relative }) => {
        const rising = bar.close >= bar.open;
        const candleY = Math.min(y(bar.open), y(bar.close));
        const bodyHeight = Math.max(1.5, Math.abs(y(bar.open) - y(bar.close)));
        return (
          <g
            key={bar.timestamp}
            className={rising ? "candle rising" : "candle falling"}
          >
            <title>
              {new Date(bar.timestamp).toLocaleString()} · O{" "}
              {formatPrice(bar.open)} · H {formatPrice(bar.high)} · L{" "}
              {formatPrice(bar.low)} · C {formatPrice(bar.close)} · Vol{" "}
              {compactVolume(bar.volume)}
            </title>
            {(chartStyle === "candles" || chartStyle === "hollow") && (
              <>
                <line
                  x1={x(relative)}
                  x2={x(relative)}
                  y1={y(bar.high)}
                  y2={y(bar.low)}
                />
                <rect
                  x={x(relative) - candleWidth / 2}
                  y={candleY}
                  width={candleWidth}
                  height={bodyHeight}
                  rx="0.8"
                />
              </>
            )}
            <rect
              className="candle-hit"
              data-relative={relative}
              x={x(relative) - step / 2}
              y={margin.top}
              width={Math.max(2, step)}
              height={priceBottom - margin.top}
            />
          </g>
        );
      }),
    [
      candleWidth,
      chartStyle,
      displayedEntries,
      margin.top,
      priceBottom,
      step,
      x,
      y,
    ],
  );

  const markers = useMemo(() => {
    const result: Marker[] = [];
    for (const trade of recordedTrades.filter(
      (trade) => trade.symbol.toUpperCase() === dataSet.symbol.toUpperCase(),
    )) {
      const entryIndex = nearestBarIndex(
        dataSet.bars,
        trade.entryAt ?? trade.occurredAt,
      );
      const exitIndex = nearestBarIndex(
        dataSet.bars,
        trade.exitAt ?? trade.occurredAt,
      );
      const entryPrice = Number(trade.entry);
      const exitPrice = Number(trade.exit);
      if (entryIndex >= 0 && Number.isFinite(entryPrice))
        result.push({
          id: `${trade.id}-entry`,
          index: entryIndex,
          price: entryPrice,
          kind: "recorded-entry",
          label: `${trade.symbol} recorded entry ${trade.entry}`,
        });
      if (exitIndex >= 0 && Number.isFinite(exitPrice))
        result.push({
          id: `${trade.id}-exit`,
          index: exitIndex,
          price: exitPrice,
          kind: "recorded-exit",
          label: `${trade.symbol} recorded exit ${trade.exit}`,
        });
    }
    for (const trade of simulationTrades) {
      const entryIndex = nearestBarIndex(dataSet.bars, trade.entryAt);
      const exitIndex = nearestBarIndex(dataSet.bars, trade.exitAt);
      if (entryIndex >= 0)
        result.push({
          id: `${trade.id}-entry`,
          index: entryIndex,
          price: trade.entryPrice,
          kind: "sim-entry",
          label: `Simulation ${trade.side} entry ${formatPrice(trade.entryPrice)}`,
        });
      if (exitIndex >= 0)
        result.push({
          id: `${trade.id}-exit`,
          index: exitIndex,
          price: trade.exitPrice,
          kind: "sim-exit",
          label: `Simulation exit ${formatPrice(trade.exitPrice)}`,
        });
    }
    for (const session of paperHistory) {
      if (session.dataSetId !== dataSet.id) continue;
      for (const trade of session.trades) {
        result.push(
          {
            id: `${trade.id}-paper-entry`,
            index: trade.entryBarIndex,
            price: trade.entryPrice,
            kind: "paper-entry",
            label: `Paper ${trade.side} entry ${formatPrice(trade.entryPrice)}`,
          },
          {
            id: `${trade.id}-paper-exit`,
            index: trade.exitBarIndex,
            price: trade.exitPrice,
            kind: "paper-exit",
            label: `Paper exit ${formatPrice(trade.exitPrice)} · ${formatSigned(trade.netPnl)}`,
          },
        );
      }
    }
    return result;
  }, [
    dataSet.bars,
    dataSet.id,
    dataSet.symbol,
    paperHistory,
    recordedTrades,
    simulationTrades,
  ]);
  const visibleMarkers = useMemo(
    () =>
      markers.filter(
        (marker) =>
          marker.index >= startIndex &&
          marker.index < startIndex + visible.length &&
          marker.index < availableLength &&
          (!intraday ||
            preferences.extendedHours ||
            isRegularMarketTimestamp(dataSet.bars[marker.index].timestamp)) &&
          ((marker.kind.startsWith("recorded") && overlays.recorded) ||
            (marker.kind.startsWith("sim") && overlays.simulation) ||
            (marker.kind.startsWith("paper") && overlays.paper)),
      ),
    [
      availableLength,
      dataSet.bars,
      intraday,
      markers,
      overlays.paper,
      overlays.recorded,
      overlays.simulation,
      preferences.extendedHours,
      startIndex,
      visible.length,
    ],
  );
  const requestedRelative = Math.min(
    visible.length - 1,
    Math.max(0, activeRelative < 0 ? visible.length - 1 : activeRelative),
  );
  const selectedRelative = showsRelative(requestedRelative)
    ? requestedRelative
    : displayedEntries.reduce(
        (closest, entry) =>
          Math.abs(entry.relative - requestedRelative) <
          Math.abs(closest - requestedRelative)
            ? entry.relative
            : closest,
        displayedEntries[0].relative,
      );
  const selectedPlottedIndex =
    plottedIndexByRelative.get(selectedRelative) ??
    Math.max(0, displayedEntries.length - 1);
  const selectedIndex = startIndex + selectedRelative;
  const selected = visible[selectedRelative];
  const selectedChange = selected.close - selected.open;
  const selectedChangePercent = selected.open
    ? (selectedChange / selected.open) * 100
    : 0;
  const selectedRangePercent = selected.open
    ? ((selected.high - selected.low) / selected.open) * 100
    : 0;
  const selectedAtr = atr[selectedIndex];
  const selectedRsi = rsi[selectedIndex];
  const comparisonDataSet = useMemo(
    () => comparisonDataSets.find((candidate) => candidate.id === comparisonId),
    [comparisonDataSets, comparisonId],
  );
  const comparisonValues = useMemo(
    () =>
      comparisonDataSet
        ? normalizedComparisonSeries(visible, comparisonDataSet.bars)
        : [],
    [comparisonDataSet, visible],
  );
  const availableComparisonValues = comparisonValues.filter(
    (value): value is number => value !== null,
  );
  const comparisonMinimum = Math.min(0, ...availableComparisonValues);
  const comparisonMaximum = Math.max(0, ...availableComparisonValues);
  const comparisonPadding = Math.max(
    (comparisonMaximum - comparisonMinimum) * 0.1,
    0.25,
  );
  const comparisonSpan = Math.max(
    0.0001,
    comparisonMaximum - comparisonMinimum + comparisonPadding * 2,
  );
  const yComparison = useCallback(
    (value: number) =>
      margin.top +
      ((comparisonMaximum + comparisonPadding - value) / comparisonSpan) *
        (priceBottom - margin.top),
    [
      comparisonMaximum,
      comparisonPadding,
      comparisonSpan,
      margin.top,
      priceBottom,
    ],
  );
  const comparisonPath = useMemo(
    () =>
      comparisonValues
        .map((value, relative) => ({ value, relative }))
        .filter(
          (point): point is { value: number; relative: number } =>
            point.value !== null && showsRelative(point.relative),
        )
        .map(
          (point, index) =>
            `${index ? "L" : "M"}${x(point.relative).toFixed(1)},${yComparison(point.value).toFixed(1)}`,
        )
        .join(" "),
    [comparisonValues, showsRelative, x, yComparison],
  );
  const comparisonLast = availableComparisonValues.at(-1) ?? null;
  const averageVisibleVolume =
    displayedEntries.reduce((sum, { bar }) => sum + (bar.volume ?? 0), 0) /
    Math.max(
      1,
      displayedEntries.filter(({ bar }) => bar.volume !== null).length,
    );
  const selectedVolumeRatio = selected.volume
    ? selected.volume / Math.max(1, averageVisibleVolume)
    : null;
  const firstDisplayedBar = displayedEntries[0].bar;
  const lastDisplayedBar = displayedEntries.at(-1)!.bar;
  const visibleChangePercent = firstDisplayedBar.open
    ? ((lastDisplayedBar.close - firstDisplayedBar.open) /
        firstDisplayedBar.open) *
      100
    : 0;
  const visibleHighIndex = displayedEntries.reduce(
    (best, entry) =>
      entry.bar.high > visible[best].high ? entry.relative : best,
    displayedEntries[0].relative,
  );
  const visibleLowIndex = displayedEntries.reduce(
    (best, entry) =>
      entry.bar.low < visible[best].low ? entry.relative : best,
    displayedEntries[0].relative,
  );
  const canOlder = startIndex > 0;
  const canNewer = startIndex + visible.length < availableLength;
  const crosshairValue = crosshairPrice ?? selected.close;
  const lastAvailableClose = dataSet.bars[availableLength - 1].close;
  const priorAvailableClose =
    availableLength > 1 ? dataSet.bars[availableLength - 2].close : null;
  const latestChange = priorAvailableClose
    ? lastAvailableClose - priorAvailableClose
    : 0;
  const latestChangePercent = priorAvailableClose
    ? (latestChange / priorAvailableClose) * 100
    : 0;
  const referenceClose =
    startIndex > 0 ? dataSet.bars[startIndex - 1].close : null;
  const hiddenBars = dataSet.bars.length - availableLength;
  const replayFloor = Math.min(29, dataSet.bars.length - 1);
  const paperBarIndex = replayIndex ?? dataSet.bars.length - 1;
  const paperBar = dataSet.bars[paperBarIndex];
  const maximumAvailableWindow = Math.min(maximumZoomWindow, availableLength);
  const minimumAvailableWindow = Math.min(
    minimumZoomWindow,
    maximumAvailableWindow,
  );

  const setViewEnd = (next: number) => {
    pendingPointer.current = null;
    if (pointerFrame.current !== null) {
      window.cancelAnimationFrame(pointerFrame.current);
      pointerFrame.current = null;
    }
    setEndIndex(clamp(next, actualWindow, availableLength));
    setActiveRelative(-1);
    setCrosshairPrice(null);
  };
  const shift = (direction: -1 | 1) =>
    setViewEnd(
      endIndex + direction * Math.max(5, Math.floor(actualWindow / 4)),
    );
  const applyWindowSize = (
    nextSize: number,
    anchorRatio?: number,
    requestedAnchorIndex?: number,
  ) => {
    const nextWindow = clamp(
      Math.round(nextSize),
      minimumAvailableWindow,
      maximumAvailableWindow,
    );
    const ratio = clamp(
      anchorRatio ??
        selectedPlottedIndex / Math.max(1, displayedEntries.length - 1),
      0,
      1,
    );
    const anchorIndex = clamp(
      requestedAnchorIndex ?? startIndex + selectedRelative,
      0,
      availableLength - 1,
    );
    const nextStart = clamp(
      Math.round(anchorIndex - ratio * Math.max(0, nextWindow - 1)),
      0,
      Math.max(0, availableLength - nextWindow),
    );
    setWindowSize(nextWindow);
    setEndIndex(nextStart + nextWindow);
    setActiveRelative(clamp(anchorIndex - nextStart, 0, nextWindow - 1));
  };
  const zoom = (
    direction: -1 | 1,
    anchorRatio?: number,
    anchorIndex?: number,
  ) => {
    const granularStep = Math.max(
      1,
      Math.round(actualWindow * granularZoomRatio),
    );
    applyWindowSize(
      actualWindow + direction * granularStep,
      anchorRatio,
      anchorIndex,
    );
  };

  const queuePointerInspection = (relative: number, price: number | null) => {
    pendingPointer.current = { relative, price };
    if (pointerFrame.current !== null) return;
    pointerFrame.current = window.requestAnimationFrame(() => {
      pointerFrame.current = null;
      const pending = pendingPointer.current;
      pendingPointer.current = null;
      if (!pending) return;
      setActiveRelative((current) =>
        current === pending.relative ? current : pending.relative,
      );
      setCrosshairPrice((current) =>
        current === pending.price ? current : pending.price,
      );
    });
  };
  const queuePanEnd = (next: number) => {
    pendingPanEnd.current = next;
    if (panFrame.current !== null) return;
    panFrame.current = window.requestAnimationFrame(() => {
      panFrame.current = null;
      const pending = pendingPanEnd.current;
      pendingPanEnd.current = null;
      if (pending !== null) setViewEnd(pending);
    });
  };

  wheelHandler.current = (event: WheelEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.deltaY === 0 && event.deltaX === 0) return;
    const now = performance.now();
    if (now - lastWheelZoomAt.current < 32) return;
    lastWheelZoomAt.current = now;
    const element = chart.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    const svgX = bounds.width
      ? ((event.clientX - bounds.left) / bounds.width) * width
      : x(selectedRelative);
    const anchorRatio = clamp((svgX - margin.left) / plotWidth, 0, 1);
    const horizontalGesture = Math.abs(event.deltaX) > Math.abs(event.deltaY);
    if (event.shiftKey || horizontalGesture) {
      const panDelta = horizontalGesture ? event.deltaX : event.deltaY;
      shift(panDelta < 0 ? -1 : 1);
    } else {
      const plottedIndex = clamp(
        Math.floor(anchorRatio * displayedEntries.length),
        0,
        displayedEntries.length - 1,
      );
      const anchorIndex = startIndex + displayedEntries[plottedIndex].relative;
      zoom(event.deltaY < 0 ? -1 : 1, anchorRatio, anchorIndex);
    }
  };

  useEffect(() => {
    const element = chart.current;
    if (!element) return;
    const handleWheel = (event: WheelEvent) => wheelHandler.current(event);
    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleWheel);
  }, []);

  const resetView = () => {
    const nextWindow = Math.min(100, availableLength);
    setWindowSize(nextWindow);
    setEndIndex(availableLength);
    setActiveRelative(-1);
    setMeasurementStart(null);
    setCrosshairPrice(null);
  };
  const saveChartPreferences = (next: ChartWorkspacePreferences) => {
    if (onChartPreferencesChange) onChartPreferencesChange(next);
    else setLocalChartPreferences(next);
  };
  const updateChartPreferences = (
    patch: Partial<Omit<ChartWorkspacePreferences, "overlays">>,
  ) => {
    const hasChange = Object.entries(patch).some(
      ([key, value]) =>
        preferences[key as keyof ChartWorkspacePreferences] !== value,
    );
    if (!hasChange) return;
    saveChartPreferences({
      ...preferences,
      ...patch,
      templateId: patch.templateId ?? "custom",
    });
  };
  const toggleOverlay = (key: OverlayKey) =>
    saveChartPreferences({
      ...preferences,
      templateId: "custom",
      overlays: { ...overlays, [key]: !overlays[key] },
    });
  const closeOtherChartMenus = (current: HTMLDetailsElement) => {
    current.parentElement
      ?.querySelectorAll<HTMLDetailsElement>(
        'details[name="chart-toolbar-menu"][open]',
      )
      .forEach((menu) => {
        if (menu !== current) menu.open = false;
      });
  };
  const applyChartTemplate = (
    id: Exclude<ChartWorkspacePreferences["templateId"], "custom">,
  ) => {
    const template = chartTemplate(id);
    saveChartPreferences(structuredClone(template.preferences));
    applyWindowSize(Math.min(template.windowSize, availableLength));
  };
  const clearDrawings = () => {
    setPriceLevels([]);
    setTrendLines([]);
    setTrendStart(null);
    setTrendDrawing(false);
    setMeasurementStart(null);
  };
  const replayStartIndex = () =>
    Math.max(
      replayFloor,
      dataSet.bars.length - Math.min(100, dataSet.bars.length) - 1,
    );
  const beginReplay = (requestedIndex?: number) => {
    const revealIndex = Math.max(
      replayFloor,
      Math.min(requestedIndex ?? replayStartIndex(), dataSet.bars.length - 1),
    );
    setReplayIndex(revealIndex);
    setReplayPlaying(false);
    setEndIndex(revealIndex + 1);
    setWindowSize(Math.min(100, revealIndex + 1));
    setActiveRelative(-1);
    setMeasurementStart(null);
    setCrosshairPrice(null);
    return revealIndex;
  };
  const stepReplay = (direction: -1 | 1) => {
    if (replayIndex === null) return;
    if (direction < 0 && paperSession && paperSession.status === "active")
      return;
    const next = clamp(
      replayIndex + direction,
      replayFloor,
      dataSet.bars.length - 1,
    );
    if (
      direction > 0 &&
      next > replayIndex &&
      paperSession &&
      paperSession.status === "active"
    )
      onPaperSessionChange?.(
        processPaperBar(
          paperSession,
          dataSet.bars[next],
          next,
          dataSet.bars[next].timestamp,
        ),
      );
    setReplayIndex(next);
    setEndIndex(next + 1);
    setActiveRelative(-1);
    if (next >= dataSet.bars.length - 1) setReplayPlaying(false);
  };
  const exitReplay = () => {
    if (paperSession && paperSession.status === "active") return;
    setReplayIndex(null);
    setReplayPlaying(false);
    setWindowSize(Math.min(100, dataSet.bars.length));
    setEndIndex(dataSet.bars.length);
    setActiveRelative(-1);
  };
  const togglePaperTrading = () => {
    if (paperOpen) {
      setPaperOpen(false);
      return;
    }
    setPaperOpen(true);
    if (paperSession && paperSession.status === "active")
      beginReplay(paperSession.replayIndex);
    else if (replayIndex === null) beginReplay();
  };
  const startPaperTrading = () => {
    const index = replayIndex ?? beginReplay();
    onPaperSessionChange?.(
      createPaperTradingSession({
        dataSetId: dataSet.id,
        symbol: dataSet.symbol,
        timeframe: dataSet.timeframe,
        replayIndex: index,
        defaults: resolvedPaperDefaults,
        at: dataSet.bars[index].timestamp,
      }),
    );
  };

  const measurementBar =
    measurementStart === null ? null : dataSet.bars[measurementStart];
  const sessionOrdinals = useMemo(() => {
    let ordinal = 0;
    return dataSet.bars.map((bar) => {
      if (
        !intraday ||
        preferences.extendedHours ||
        isRegularMarketTimestamp(bar.timestamp)
      )
        ordinal += 1;
      return ordinal;
    });
  }, [dataSet.bars, intraday, preferences.extendedHours]);
  const measuredPrice = measurementBar
    ? selected.close - measurementBar.close
    : 0;
  const measuredPercent = measurementBar?.close
    ? (measuredPrice / measurementBar.close) * 100
    : 0;
  const measuredBars =
    measurementStart === null
      ? 0
      : sessionOrdinals[selectedIndex] - sessionOrdinals[measurementStart];
  const measurementRelative =
    measurementStart === null ? -1 : measurementStart - startIndex;
  const selectedTimeLabel = formatAxisTime(
    selected.timestamp,
    dataSet.timeframe,
  );

  const selectBar = (relative: number) => {
    setActiveRelative(relative);
    if (!trendDrawing) return;
    const anchor = {
      index: startIndex + relative,
      price: visible[relative].close,
    };
    if (!trendStart) setTrendStart(anchor);
    else {
      setTrendLines((current) => [
        ...current,
        {
          id: `${trendStart.index}-${anchor.index}-${Date.now()}`,
          start: trendStart,
          end: anchor,
        },
      ]);
      setTrendStart(null);
      setTrendDrawing(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<SVGSVGElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      setActiveRelative((current) => {
        const currentPlotted =
          current < 0
            ? displayedEntries.length - 1
            : (plottedIndexByRelative.get(current) ?? selectedPlottedIndex);
        const nextPlotted = clamp(
          currentPlotted + direction,
          0,
          displayedEntries.length - 1,
        );
        return displayedEntries[nextPlotted].relative;
      });
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoom(-1);
    } else if (event.key === "-") {
      event.preventDefault();
      zoom(1);
    } else if (event.key === "PageUp" && canOlder) {
      event.preventDefault();
      shift(-1);
    } else if (event.key === "PageDown" && canNewer) {
      event.preventDefault();
      shift(1);
    } else if (event.key === "Home") {
      event.preventDefault();
      resetView();
    } else if (event.key === "]" && replayIndex !== null) {
      event.preventDefault();
      stepReplay(1);
    } else if (event.key === " " && replayIndex !== null) {
      event.preventDefault();
      setReplayPlaying((current) => !current);
    }
  };

  const activeIndicatorCount = (
    ["fast", "slow", "ema", "vwap", "bollinger"] as OverlayKey[]
  ).filter((key) => overlays[key]).length;
  const activeTemplate = chartTemplates.find(
    (template) => template.id === preferences.templateId,
  );

  return (
    <section
      className={`market-chart-card card${expanded ? " market-chart-expanded" : ""}`}
      aria-labelledby="market-chart-title"
    >
      <header className="market-chart-header">
        <div className="chart-instrument-block">
          <span className="chart-link-status" title="Local chart context">
            <BarChart3 size={16} />
          </span>
          <div>
            <div className="chart-title-row">
              <h2 id="market-chart-title">{dataSet.symbol}</h2>
              <span className="chart-timeframe-badge">{dataSet.timeframe}</span>
              <span className="chart-source-badge">
                {dataSet.feed ?? dataSet.sourceType}
              </span>
              {replayIndex !== null && (
                <span className="chart-replay-badge">Replay</span>
              )}
              {paperOpen && (
                <span className="chart-paper-badge">Paper account</span>
              )}
            </div>
            <p>
              {dataSet.name} · {visible.length.toLocaleString()} of{" "}
              {availableLength.toLocaleString()} bars ·{" "}
              {new Date(visible[0].timestamp).toLocaleDateString()}–
              {new Date(visible.at(-1)!.timestamp).toLocaleDateString()}
              {hiddenBars > 0 && (
                <span className="chart-hidden-bars">
                  {` · ${hiddenBars} future hidden`}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="chart-header-quote" aria-live="polite">
          <strong>{formatPrice(lastAvailableClose)}</strong>
          <span
            className={latestChange >= 0 ? "positive-text" : "negative-text"}
          >
            {formatSigned(latestChange, 4)} ·{" "}
            {formatSigned(latestChangePercent)}%
          </span>
        </div>
        <div className="chart-navigation" aria-label="Chart navigation">
          <button
            className="icon-button"
            disabled={!canOlder}
            onClick={() => shift(-1)}
            aria-label="Show older bars"
            title="Older bars (Page Up)"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="icon-button"
            disabled={actualWindow <= minimumAvailableWindow}
            onClick={() => zoom(-1)}
            aria-label="Zoom in"
            title="Zoom in (+)"
          >
            <Plus size={17} />
          </button>
          <output className="chart-window-output" aria-live="polite">
            {actualWindow}
          </output>
          <button
            className="icon-button"
            disabled={actualWindow >= maximumAvailableWindow}
            onClick={() => zoom(1)}
            aria-label="Zoom out"
            title="Zoom out (-)"
          >
            <Minus size={17} />
          </button>
          <button
            className="icon-button"
            onClick={resetView}
            aria-label="Fit latest 100 bars"
            title="Fit latest 100 bars (Home)"
          >
            <RotateCcw size={16} />
          </button>
          <button
            className="icon-button"
            disabled={!canNewer}
            onClick={() => shift(1)}
            aria-label="Show newer bars"
            title="Newer bars (Page Down)"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

      <div className="chart-pro-toolbar" aria-label="Chart tools">
        <label
          className="chart-compact-select chart-template-select"
          title={activeTemplate?.description ?? "Custom chart workspace"}
        >
          <LayoutTemplate size={14} />
          <span>Template</span>
          <select
            aria-label="Chart template"
            value={preferences.templateId}
            onChange={(event) => {
              const id = event.target
                .value as ChartWorkspacePreferences["templateId"];
              if (id !== "custom") applyChartTemplate(id);
            }}
          >
            {chartTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.label}
              </option>
            ))}
            {preferences.templateId === "custom" && (
              <option value="custom">Custom</option>
            )}
          </select>
        </label>
        <div className="chart-segmented" aria-label="Chart style">
          {(["candles", "hollow", "line"] as ChartStylePreference[]).map(
            (style) => (
              <button
                key={style}
                aria-pressed={chartStyle === style}
                onClick={() => updateChartPreferences({ style })}
              >
                {style === "candles"
                  ? "Candles"
                  : style === "hollow"
                    ? "Hollow"
                    : "Line"}
              </button>
            ),
          )}
        </div>
        <div
          className="chart-segmented chart-range-picker"
          aria-label="Visible bars"
        >
          {quickWindows.map((size) => (
            <button
              key={size}
              aria-pressed={windowSize === size}
              disabled={size > availableLength}
              onClick={() => applyWindowSize(size)}
              title={`Show ${size} bars`}
            >
              {size}
            </button>
          ))}
        </div>
        <details className="chart-overlay-menu" name="chart-toolbar-menu">
          <summary
            role="button"
            aria-label="Technical indicators"
            onClick={(event) =>
              closeOtherChartMenus(
                event.currentTarget.parentElement as HTMLDetailsElement,
              )
            }
          >
            Indicators
            <span className="chart-active-count">{activeIndicatorCount}</span>
          </summary>
          <div>
            {(
              [
                ["fast", `Fast SMA ${settings.fastPeriod}`],
                ["slow", `Slow SMA ${settings.slowPeriod}`],
                ["ema", "EMA 9"],
                ["vwap", "VWAP / rolling VWAP"],
                ["bollinger", "Bollinger Bands 20, 2"],
              ] as Array<[OverlayKey, string]>
            ).map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={overlays[key]}
                  onChange={() => toggleOverlay(key)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </details>
        <details
          className="chart-overlay-menu chart-events-menu"
          name="chart-toolbar-menu"
        >
          <summary
            role="button"
            aria-label="Trade events"
            onClick={(event) =>
              closeOtherChartMenus(
                event.currentTarget.parentElement as HTMLDetailsElement,
              )
            }
          >
            Events
            <span className="chart-active-count">
              {
                (["recorded", "simulation", "paper"] as OverlayKey[]).filter(
                  (key) => overlays[key],
                ).length
              }
            </span>
          </summary>
          <div>
            {(
              [
                ["recorded", "Journal trades"],
                ["simulation", "Backtest trades"],
                ["paper", "Paper trades"],
              ] as Array<[OverlayKey, string]>
            ).map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={overlays[key]}
                  onChange={() => toggleOverlay(key)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </details>
        <label className="chart-study-select">
          <Activity size={14} />
          <span>Study</span>
          <select
            aria-label="Lower chart study"
            value={study}
            onChange={(event) =>
              updateChartPreferences({
                lowerStudy: event.target.value as ChartLowerStudy,
              })
            }
          >
            <option value="volume">Volume</option>
            <option value="rsi">RSI 14</option>
            <option value="macd">MACD 12, 26, 9</option>
            <option value="atr">ATR 14</option>
            <option value="none">None</option>
          </select>
        </label>
        <label className="chart-compact-select chart-compare-select">
          <span>Compare</span>
          <select
            aria-label="Compare symbol"
            value={comparisonId}
            onChange={(event) => setComparisonId(event.target.value)}
          >
            <option value="">None</option>
            {comparisonDataSets.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.symbol} · {candidate.timeframe}
              </option>
            ))}
          </select>
        </label>
        <details
          className="chart-overlay-menu chart-settings-menu"
          name="chart-toolbar-menu"
        >
          <summary
            aria-label="Chart appearance settings"
            role="button"
            onClick={(event) =>
              closeOtherChartMenus(
                event.currentTarget.parentElement as HTMLDetailsElement,
              )
            }
          >
            <Settings2 size={14} />
            Display
          </summary>
          <div>
            <div className="chart-setting-row">
              <span>Price scale</span>
              <div className="chart-mini-segmented">
                {(["linear", "log"] as const).map((scaleMode) => (
                  <button
                    key={scaleMode}
                    type="button"
                    aria-pressed={preferences.scaleMode === scaleMode}
                    onClick={() => updateChartPreferences({ scaleMode })}
                  >
                    {scaleMode === "linear" ? "Linear" : "Log"}
                  </button>
                ))}
              </div>
            </div>
            {(
              [
                ["crosshair", "Crosshair"],
                ["gridLines", "Grid lines"],
                ["extremeLabels", "High / low labels"],
              ] as Array<["crosshair" | "gridLines" | "extremeLabels", string]>
            ).map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={preferences[key]}
                  onChange={() =>
                    updateChartPreferences({ [key]: !preferences[key] })
                  }
                />
                <span>{label}</span>
              </label>
            ))}
            {intraday && (
              <label>
                <input
                  type="checkbox"
                  checked={preferences.extendedHours}
                  disabled={Boolean(paperSession?.status === "active")}
                  onChange={() =>
                    updateChartPreferences({
                      extendedHours: !preferences.extendedHours,
                    })
                  }
                />
                <span>Extended-hours bars</span>
              </label>
            )}
          </div>
        </details>
        <div className="chart-tool-actions">
          {replayIndex === null && (
            <button
              onClick={() => beginReplay()}
              title="Hide future bars and replay"
            >
              <EyeOff size={15} />
              Replay
            </button>
          )}
          {onPaperSessionChange && (
            <button
              className={paperOpen ? "active" : ""}
              onClick={togglePaperTrading}
              aria-pressed={paperOpen}
              title={`${paperOpen ? "Hide" : "Open"} the local paper-trading replay account`}
            >
              <WalletCards size={15} />
              Paper trade
            </button>
          )}
          <button
            onClick={() => setExpanded((current) => !current)}
            aria-pressed={expanded}
            title={expanded ? "Exit focus view (Escape)" : "Open focus view"}
          >
            {expanded ? <Minimize2 size={15} /> : <Expand size={15} />}
            {expanded ? "Exit focus" : "Focus"}
          </button>
        </div>
      </div>

      {replayIndex !== null && (
        <div className="chart-replay-deck" aria-live="polite">
          <div>
            <span className="chart-replay-dot" aria-hidden="true" />
            <div>
              <strong>Future-hidden replay</strong>
              <small>
                {new Date(dataSet.bars[replayIndex].timestamp).toLocaleString()}{" "}
                · {hiddenBars} bar{hiddenBars === 1 ? "" : "s"} hidden
              </small>
            </div>
          </div>
          <div className="chart-replay-controls">
            <button
              className="icon-button"
              onClick={() => stepReplay(-1)}
              disabled={
                replayIndex <= replayFloor ||
                Boolean(paperSession && paperSession.status === "active")
              }
              aria-label="Replay previous bar"
              title={
                paperSession && paperSession.status === "active"
                  ? "Paper sessions cannot move backward"
                  : "Previous bar"
              }
            >
              <StepBack size={16} />
            </button>
            <button
              className="button compact primary"
              onClick={() => setReplayPlaying((current) => !current)}
              disabled={replayIndex >= dataSet.bars.length - 1}
            >
              {replayPlaying ? <Pause size={15} /> : <Play size={15} />}
              {replayPlaying ? "Pause" : "Play"}
            </button>
            <button
              className="icon-button"
              onClick={() => stepReplay(1)}
              disabled={replayIndex >= dataSet.bars.length - 1}
              aria-label="Reveal next bar"
              title="Next bar (])"
            >
              <StepForward size={16} />
            </button>
            <button
              className="chart-speed-button"
              onClick={() =>
                setReplaySpeed((current) =>
                  current === 1 ? 2 : current === 2 ? 4 : 1,
                )
              }
              aria-label={`Replay speed ${replaySpeed} times`}
              title="Change replay speed"
            >
              {replaySpeed}×
            </button>
            {!(paperSession && paperSession.status === "active") && (
              <button className="button compact ghost" onClick={exitReplay}>
                Reveal all
              </button>
            )}
          </div>
        </div>
      )}

      <div className="market-chart-inspector" aria-live="polite">
        <div>
          <span>{new Date(selected.timestamp).toLocaleString()}</span>
          <div className="chart-selected-price">
            <strong>{formatPrice(selected.close)}</strong>
            <small className={selectedChange >= 0 ? "positive" : "negative"}>
              {formatSigned(selectedChange, 4)} ·{" "}
              {formatSigned(selectedChangePercent)}%
            </small>
          </div>
        </div>
        <dl>
          <div>
            <dt>Open</dt>
            <dd>{formatPrice(selected.open)}</dd>
          </div>
          <div>
            <dt>High</dt>
            <dd>{formatPrice(selected.high)}</dd>
          </div>
          <div>
            <dt>Low</dt>
            <dd>{formatPrice(selected.low)}</dd>
          </div>
          <div>
            <dt>Volume</dt>
            <dd title={selected.volume?.toLocaleString() ?? "No volume"}>
              {compactVolume(selected.volume)}
            </dd>
          </div>
          <div>
            <dt>Range</dt>
            <dd>{selectedRangePercent.toFixed(2)}%</dd>
          </div>
          <div>
            <dt>ATR 14</dt>
            <dd>{selectedAtr === null ? "—" : formatPrice(selectedAtr)}</dd>
          </div>
          <div>
            <dt>RSI 14</dt>
            <dd>{selectedRsi === null ? "—" : selectedRsi.toFixed(1)}</dd>
          </div>
          <div>
            <dt>Rel. volume</dt>
            <dd>
              {selectedVolumeRatio === null
                ? "—"
                : `${selectedVolumeRatio.toFixed(2)}×`}
            </dd>
          </div>
        </dl>
      </div>

      <div className="chart-context-ribbon">
        <span>
          <small>Visible change</small>
          <strong
            className={
              visibleChangePercent >= 0 ? "positive-text" : "negative-text"
            }
          >
            {formatSigned(visibleChangePercent)}%
          </strong>
        </span>
        <span>
          <small>Visible high</small>
          <strong>{formatPrice(visible[visibleHighIndex].high)}</strong>
        </span>
        <span>
          <small>Visible low</small>
          <strong>{formatPrice(visible[visibleLowIndex].low)}</strong>
        </span>
        <span>
          <small>Average volume</small>
          <strong>{compactVolume(averageVisibleVolume)}</strong>
        </span>
        <span>
          <small>Feed context</small>
          <strong>{dataSet.feed ?? dataSet.sourceType}</strong>
        </span>
        <span>
          <small>Compare</small>
          <strong>
            {comparisonDataSet
              ? comparisonLast === null
                ? "No shared bars"
                : `${comparisonDataSet.symbol} ${formatSigned(comparisonLast)}%`
              : "Off"}
          </strong>
        </span>
      </div>

      {paperOpen && onPaperSessionChange && (
        <PaperTradingPanel
          session={paperSession?.status === "active" ? paperSession : null}
          history={paperHistory}
          currentBar={paperBar}
          currentBarIndex={paperBarIndex}
          defaults={resolvedPaperDefaults}
          onStart={startPaperTrading}
          onChange={onPaperSessionChange}
        />
      )}

      {measurementBar && (
        <div className="chart-measure-readout" aria-live="polite">
          <Ruler size={14} />
          <strong>
            {formatSigned(measuredPrice, 4)} ({formatSigned(measuredPercent)}%)
          </strong>
          <span>
            {Math.abs(measuredBars)} bar
            {Math.abs(measuredBars) === 1 ? "" : "s"}{" "}
            {measuredBars < 0 ? "back" : "forward"}
          </span>
        </div>
      )}

      {trendDrawing && (
        <div className="chart-drawing-prompt" role="status">
          <TrendingUp size={14} />
          {trendStart
            ? "Select the ending candle for the trend line."
            : "Select the starting candle for the trend line."}
        </div>
      )}

      <div className="chart-plot-shell">
        <nav className="chart-drawing-dock" aria-label="Chart drawing tools">
          <button
            type="button"
            className={preferences.crosshair ? "active" : ""}
            aria-label="Crosshair"
            aria-pressed={preferences.crosshair}
            title="Toggle crosshair"
            onClick={() =>
              updateChartPreferences({ crosshair: !preferences.crosshair })
            }
          >
            <Crosshair size={17} />
          </button>
          <button
            type="button"
            className={measurementStart === null ? "" : "active"}
            aria-label="Measure"
            aria-pressed={measurementStart !== null}
            title="Measure price and bar change from the selected candle"
            onClick={() =>
              setMeasurementStart((current) =>
                current === null ? selectedIndex : null,
              )
            }
          >
            <Ruler size={17} />
          </button>
          <button
            type="button"
            className={trendDrawing ? "active" : ""}
            aria-label="Trend line"
            aria-pressed={trendDrawing}
            title="Select two candle closes to draw a trend line"
            onClick={() => {
              setTrendDrawing((current) => !current);
              setTrendStart(null);
            }}
          >
            <TrendingUp size={17} />
          </button>
          <button
            type="button"
            aria-label="Price level"
            title="Mark the selected close as a review level"
            onClick={() =>
              setPriceLevels((current) =>
                current.some(
                  (price) => Math.abs(price - selected.close) < span * 0.001,
                )
                  ? current
                  : [...current, selected.close],
              )
            }
          >
            <Maximize2 size={17} />
          </button>
          {(priceLevels.length > 0 || trendLines.length > 0) && (
            <button
              type="button"
              aria-label="Clear"
              onClick={clearDrawings}
              title="Clear chart drawings"
            >
              <X size={17} />
            </button>
          )}
        </nav>
        <div className="market-chart-scroll">
          <svg
            ref={chart}
            className={`market-chart${chartStyle === "hollow" ? " hollow" : ""}${measurementStart !== null ? " measuring" : ""}${trendDrawing ? " drawing" : ""}${dragging ? " panning" : ""}`}
            viewBox={`0 0 ${width} ${height}`}
            role="group"
            aria-label={`${dataSet.symbol} interactive ${chartStyle} chart with ${study} study and recorded and simulated trade markers, including paper trades, ${preferences.scaleMode} scale${comparisonDataSet ? `, compared with ${comparisonDataSet.symbol}` : ""}`}
            aria-describedby="chart-interaction-guide"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onDoubleClick={resetView}
            onClick={(event) => {
              const target = event.target as Element;
              const hit = target.closest?.(".candle-hit");
              const relative = Number(hit?.getAttribute("data-relative"));
              if (Number.isInteger(relative)) selectBar(relative);
            }}
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              drag.current = { clientX: event.clientX, endIndex };
              setDragging(true);
            }}
            onPointerMove={(event) => {
              const bounds = event.currentTarget.getBoundingClientRect();
              const svgX = bounds.width
                ? ((event.clientX - bounds.left) / bounds.width) * width
                : 0;
              const svgY = bounds.height
                ? ((event.clientY - bounds.top) / bounds.height) * height
                : 0;
              if (!drag.current) {
                if (svgX >= margin.left && svgX <= width - margin.right) {
                  const plottedIndex = clamp(
                    Math.floor((svgX - margin.left) / step),
                    0,
                    displayedEntries.length - 1,
                  );
                  const price =
                    preferences.crosshair &&
                    svgY >= margin.top &&
                    svgY <= priceBottom
                      ? priceAtY(svgY)
                      : null;
                  queuePointerInspection(
                    displayedEntries[plottedIndex].relative,
                    price,
                  );
                } else {
                  queuePointerInspection(selectedRelative, null);
                }
                return;
              }
              const delta = event.clientX - drag.current.clientX;
              if (Math.abs(delta) < 3) return;
              const barShift = Math.round(
                (-delta / Math.max(320, event.currentTarget.clientWidth)) *
                  actualWindow,
              );
              queuePanEnd(drag.current.endIndex + barShift);
            }}
            onPointerUp={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId))
                event.currentTarget.releasePointerCapture(event.pointerId);
              drag.current = null;
              setDragging(false);
            }}
            onPointerCancel={() => {
              drag.current = null;
              pendingPanEnd.current = null;
              if (panFrame.current !== null) {
                window.cancelAnimationFrame(panFrame.current);
                panFrame.current = null;
              }
              setDragging(false);
            }}
            onPointerLeave={() => {
              pendingPointer.current = null;
              if (pointerFrame.current !== null) {
                window.cancelAnimationFrame(pointerFrame.current);
                pointerFrame.current = null;
              }
              setCrosshairPrice(null);
            }}
          >
            <title>{dataSet.symbol} professional historical chart</title>
            <desc>
              Filled or hollow candles or a close line with chart templates,
              linear or logarithmic scaling, optional moving averages, EMA,
              VWAP, Bollinger Bands, journal and simulation events, comparison
              performance, volume, RSI, MACD or ATR, future-hidden replay, local
              paper-trade levels, drawings, precise zoom, and keyboard
              navigation.
            </desc>
            <defs>
              <linearGradient
                id={`${chartId}-line-fill`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" className="line-fill-start" />
                <stop offset="100%" className="line-fill-end" />
              </linearGradient>
              <linearGradient
                id={`${chartId}-band-fill`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" className="band-fill-start" />
                <stop offset="100%" className="band-fill-end" />
              </linearGradient>
              <clipPath id={`${chartId}-price-clip`}>
                <rect
                  x={margin.left}
                  y={margin.top}
                  width={plotWidth}
                  height={priceBottom - margin.top}
                />
              </clipPath>
              <clipPath id={`${chartId}-study-clip`}>
                <rect
                  x={margin.left}
                  y={studyTop}
                  width={plotWidth}
                  height={studyBottom - studyTop}
                />
              </clipPath>
            </defs>

            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio) => {
              const price =
                preferences.scaleMode === "log" && minimum > 0
                  ? Math.exp(logMaximum - logSpan * ratio)
                  : maximum - span * ratio;
              const row = y(price);
              return (
                <g key={ratio}>
                  {preferences.gridLines && (
                    <line
                      x1={margin.left}
                      x2={width - margin.right}
                      y1={row}
                      y2={row}
                      className="market-gridline"
                    />
                  )}
                  <text
                    x={width - margin.right + 9}
                    y={row + 4}
                    className="market-axis market-price-axis"
                  >
                    {formatPrice(price)}
                  </text>
                </g>
              );
            })}
            {preferences.gridLines &&
              [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1].map((ratio) => (
                <line
                  key={`vertical-${ratio}`}
                  x1={margin.left + plotWidth * ratio}
                  x2={margin.left + plotWidth * ratio}
                  y1={margin.top}
                  y2={study === "none" ? priceBottom : studyBottom}
                  className="market-gridline vertical"
                />
              ))}

            <rect
              className="chart-selected-column"
              x={x(selectedRelative) - step / 2}
              y={margin.top}
              width={Math.max(1, step)}
              height={
                (study === "none" ? priceBottom : studyBottom) - margin.top
              }
              aria-hidden="true"
            />

            <g clipPath={`url(#${chartId}-price-clip)`}>
              {intraday &&
                preferences.extendedHours &&
                visible.map((bar, relative) =>
                  isRegularMarketTimestamp(bar.timestamp) ? null : (
                    <rect
                      key={`extended-${bar.timestamp}`}
                      className="chart-extended-session"
                      x={x(relative) - step / 2}
                      y={margin.top}
                      width={Math.max(1, step)}
                      height={priceBottom - margin.top}
                    />
                  ),
                )}
              {overlays.bollinger && bollingerArea && (
                <>
                  <path
                    d={bollingerArea}
                    className="bollinger-area"
                    style={{ fill: `url(#${chartId}-band-fill)` }}
                  />
                  <path
                    d={bollingerUpperPath}
                    className="indicator-line bollinger"
                  />
                  <path
                    d={bollingerLowerPath}
                    className="indicator-line bollinger"
                  />
                </>
              )}

              {chartStyle === "line" && (
                <>
                  <path
                    d={closeArea}
                    className="market-close-area"
                    style={{ fill: `url(#${chartId}-line-fill)` }}
                  />
                  <path d={closeLine} className="market-close-line" />
                </>
              )}

              {comparisonDataSet && comparisonPath && (
                <path d={comparisonPath} className="chart-comparison-line">
                  <title>
                    {comparisonDataSet.symbol} normalized performance comparison
                  </title>
                </path>
              )}

              {candleElements}

              {overlays.fast && (
                <path d={fastPath} className="indicator-line fast" />
              )}
              {overlays.slow && (
                <path d={slowPath} className="indicator-line slow" />
              )}
              {overlays.ema && (
                <path d={emaPath} className="indicator-line ema" />
              )}
              {overlays.vwap && (
                <path d={vwapPath} className="indicator-line vwap" />
              )}

              {chartStyle !== "line" && (
                <g className="chart-selected-candle" aria-hidden="true">
                  <line
                    x1={x(selectedRelative)}
                    x2={x(selectedRelative)}
                    y1={y(selected.high)}
                    y2={y(selected.low)}
                  />
                  <rect
                    x={x(selectedRelative) - candleWidth / 2 - 1.5}
                    y={Math.min(y(selected.open), y(selected.close)) - 1.5}
                    width={candleWidth + 3}
                    height={
                      Math.max(
                        1.5,
                        Math.abs(y(selected.open) - y(selected.close)),
                      ) + 3
                    }
                    rx="2"
                  />
                </g>
              )}

              <circle
                className="chart-selected-point"
                cx={x(selectedRelative)}
                cy={y(selected.close)}
                r="3.5"
                aria-hidden="true"
              />

              {referenceClose !== null &&
                referenceClose >= minimum &&
                referenceClose <= maximum && (
                  <line
                    x1={margin.left}
                    x2={width - margin.right}
                    y1={y(referenceClose)}
                    y2={y(referenceClose)}
                    className="chart-reference-line"
                  />
                )}

              {priceLevels.map((price, index) => {
                if (price < minimum || price > maximum) return null;
                return (
                  <g key={`${price}-${index}`} className="chart-price-level">
                    <line
                      x1={margin.left}
                      x2={width - margin.right}
                      y1={y(price)}
                      y2={y(price)}
                    />
                    <text
                      x={width - margin.right - 7}
                      y={y(price) - 6}
                      textAnchor="end"
                    >
                      Review · {formatPrice(price)}
                    </text>
                  </g>
                );
              })}

              {paperLevels.map((level) => {
                if (level.price < minimum || level.price > maximum) return null;
                return (
                  <g
                    key={level.key}
                    className={`chart-paper-level ${level.kind}`}
                  >
                    <line
                      x1={margin.left}
                      x2={width - margin.right}
                      y1={y(level.price)}
                      y2={y(level.price)}
                    />
                    <rect
                      x={width - margin.right - 132}
                      y={y(level.price) - 17}
                      width="124"
                      height="17"
                      rx="4"
                    />
                    <text
                      x={width - margin.right - 14}
                      y={y(level.price) - 5}
                      textAnchor="end"
                    >
                      {level.label}
                    </text>
                  </g>
                );
              })}

              {trendLines.map((line) => {
                const startRelative = line.start.index - startIndex;
                const endRelative = line.end.index - startIndex;
                if (
                  startRelative < 0 ||
                  endRelative < 0 ||
                  startRelative >= visible.length ||
                  endRelative >= visible.length ||
                  !showsRelative(startRelative) ||
                  !showsRelative(endRelative)
                )
                  return null;
                return (
                  <g key={line.id} className="chart-trend-line">
                    <line
                      x1={x(startRelative)}
                      y1={y(line.start.price)}
                      x2={x(endRelative)}
                      y2={y(line.end.price)}
                    />
                    <circle
                      cx={x(startRelative)}
                      cy={y(line.start.price)}
                      r="3"
                    />
                    <circle cx={x(endRelative)} cy={y(line.end.price)} r="3" />
                  </g>
                );
              })}
              {trendStart &&
                trendStart.index >= startIndex &&
                trendStart.index < startIndex + visible.length &&
                showsRelative(trendStart.index - startIndex) && (
                  <circle
                    className="chart-trend-anchor"
                    cx={x(trendStart.index - startIndex)}
                    cy={y(trendStart.price)}
                    r="5"
                  />
                )}

              {measurementBar &&
                measurementRelative >= 0 &&
                measurementRelative < visible.length &&
                showsRelative(measurementRelative) && (
                  <g className="chart-measure-line">
                    <line
                      x1={x(measurementRelative)}
                      y1={y(measurementBar.close)}
                      x2={x(selectedRelative)}
                      y2={y(selected.close)}
                    />
                    <circle
                      cx={x(measurementRelative)}
                      cy={y(measurementBar.close)}
                      r="4"
                    />
                    <circle
                      cx={x(selectedRelative)}
                      cy={y(selected.close)}
                      r="4"
                    />
                  </g>
                )}

              {visibleMarkers.map((marker) => {
                const relative = marker.index - startIndex;
                const markerY = y(marker.price);
                const entry = marker.kind.endsWith("entry");
                const points = entry
                  ? `${x(relative)},${markerY - 13} ${x(relative) - 7},${markerY - 3} ${x(relative) + 7},${markerY - 3}`
                  : `${x(relative)},${markerY + 13} ${x(relative) - 7},${markerY + 3} ${x(relative) + 7},${markerY + 3}`;
                return (
                  <polygon
                    key={marker.id}
                    points={points}
                    className={`trade-marker ${marker.kind}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${marker.label}. Inspect this bar.`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveRelative(relative);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        event.stopPropagation();
                        setActiveRelative(relative);
                      }
                    }}
                  >
                    <title>{marker.label}</title>
                  </polygon>
                );
              })}

              {preferences.extremeLabels && (
                <g className="chart-extreme-label" aria-hidden="true">
                  <text
                    x={x(visibleHighIndex)}
                    y={Math.max(
                      margin.top + 11,
                      y(visible[visibleHighIndex].high) - 7,
                    )}
                    textAnchor="middle"
                  >
                    H {formatPrice(visible[visibleHighIndex].high)}
                  </text>
                  <text
                    x={x(visibleLowIndex)}
                    y={Math.min(
                      priceBottom - 5,
                      y(visible[visibleLowIndex].low) + 15,
                    )}
                    textAnchor="middle"
                  >
                    L {formatPrice(visible[visibleLowIndex].low)}
                  </text>
                </g>
              )}
            </g>

            {lastAvailableClose >= minimum &&
              lastAvailableClose <= maximum &&
              (!preferences.crosshair ||
                Math.abs(y(crosshairValue) - y(lastAvailableClose)) > 24) && (
                <g className="chart-last-price" aria-hidden="true">
                  <line
                    x1={margin.left}
                    x2={width - margin.right}
                    y1={y(lastAvailableClose)}
                    y2={y(lastAvailableClose)}
                  />
                  <rect
                    x={width - margin.right}
                    y={y(lastAvailableClose) - 11}
                    width={margin.right - 5}
                    height="22"
                    rx="4"
                  />
                  <text
                    x={width - margin.right + 8}
                    y={y(lastAvailableClose) + 4}
                  >
                    {formatPrice(lastAvailableClose)}
                  </text>
                </g>
              )}

            {study === "volume" && (
              <g clipPath={`url(#${chartId}-study-clip)`}>
                <rect
                  x={margin.left}
                  y={studyTop}
                  width={plotWidth}
                  height={studyBottom - studyTop}
                  className="chart-study-background"
                />
                {visible.map((bar, relative) => {
                  if (!showsRelative(relative)) return null;
                  const volumeHeight =
                    ((bar.volume ?? 0) / maxVolume) *
                    (studyBottom - studyTop - 12);
                  return (
                    <rect
                      key={`volume-${bar.timestamp}`}
                      className={`chart-volume-bar ${bar.close >= bar.open ? "rising" : "falling"}`}
                      x={x(relative) - candleWidth / 2}
                      y={studyBottom - volumeHeight}
                      width={candleWidth}
                      height={Math.max(1, volumeHeight)}
                    />
                  );
                })}
              </g>
            )}
            {study === "rsi" && (
              <g clipPath={`url(#${chartId}-study-clip)`}>
                <rect
                  x={margin.left}
                  y={yRsi(70)}
                  width={plotWidth}
                  height={yRsi(30) - yRsi(70)}
                  className="chart-rsi-zone"
                />
                {[30, 50, 70].map((value) => (
                  <line
                    key={value}
                    x1={margin.left}
                    x2={width - margin.right}
                    y1={yRsi(value)}
                    y2={yRsi(value)}
                    className={`chart-rsi-guide${value === 50 ? " midpoint" : ""}`}
                  />
                ))}
                <path d={rsiLine} className="chart-rsi-line" />
              </g>
            )}
            {study === "macd" && (
              <g clipPath={`url(#${chartId}-study-clip)`}>
                <rect
                  x={margin.left}
                  y={studyTop}
                  width={plotWidth}
                  height={studyBottom - studyTop}
                  className="chart-study-background"
                />
                <line
                  x1={margin.left}
                  x2={width - margin.right}
                  y1={yStudy(0)}
                  y2={yStudy(0)}
                  className="chart-study-zero"
                />
                {visible.map((_, relative) => {
                  if (!showsRelative(relative)) return null;
                  const value = macd.histogram[startIndex + relative];
                  if (value === null) return null;
                  const zero = yStudy(0);
                  const valueY = yStudy(value);
                  return (
                    <rect
                      key={`macd-${startIndex + relative}`}
                      className={`chart-macd-bar ${value >= 0 ? "positive" : "negative"}`}
                      x={x(relative) - Math.max(1, candleWidth * 0.42)}
                      y={Math.min(zero, valueY)}
                      width={Math.max(2, candleWidth * 0.84)}
                      height={Math.max(1, Math.abs(zero - valueY))}
                    />
                  );
                })}
                <path d={macdLinePath} className="chart-macd-line" />
                <path d={macdSignalPath} className="chart-macd-signal" />
              </g>
            )}
            {study === "atr" && (
              <g clipPath={`url(#${chartId}-study-clip)`}>
                <rect
                  x={margin.left}
                  y={studyTop}
                  width={plotWidth}
                  height={studyBottom - studyTop}
                  className="chart-study-background"
                />
                <path d={atrPath} className="chart-atr-line" />
              </g>
            )}
            {study !== "none" && (
              <g className="chart-study-label" aria-hidden="true">
                <text x={margin.left + 7} y={studyTop + 13}>
                  {study === "volume"
                    ? `VOLUME · ${compactVolume(selected.volume)}`
                    : study === "rsi"
                      ? `RSI 14 · ${selectedRsi === null ? "—" : selectedRsi.toFixed(1)}`
                      : study === "macd"
                        ? `MACD 12, 26, 9 · ${macd.macd[selectedIndex]?.toFixed(3) ?? "—"}`
                        : `ATR 14 · ${selectedAtr === null ? "—" : formatPrice(selectedAtr)}`}
                </text>
                {study === "rsi" && (
                  <>
                    <text x={width - margin.right + 9} y={yRsi(70) + 4}>
                      70
                    </text>
                    <text x={width - margin.right + 9} y={yRsi(30) + 4}>
                      30
                    </text>
                  </>
                )}
              </g>
            )}

            {preferences.crosshair && (
              <g className="chart-crosshair" aria-hidden="true">
                <line
                  x1={x(selectedRelative)}
                  x2={x(selectedRelative)}
                  y1={margin.top}
                  y2={study === "none" ? priceBottom : studyBottom}
                />
                <line
                  x1={margin.left}
                  x2={width - margin.right}
                  y1={y(crosshairValue)}
                  y2={y(crosshairValue)}
                />
                <rect
                  x={width - margin.right}
                  y={y(crosshairValue) - 11}
                  width={margin.right - 5}
                  height="22"
                  rx="4"
                />
                <text
                  x={width - margin.right + 8}
                  y={y(crosshairValue) + 4}
                  className="chart-crosshair-label"
                >
                  {formatPrice(crosshairValue)}
                </text>
                <rect
                  x={clamp(
                    x(selectedRelative) - 70,
                    margin.left,
                    width - margin.right - 140,
                  )}
                  y={height - 43}
                  width="140"
                  height="23"
                  rx="4"
                />
                <text
                  x={clamp(
                    x(selectedRelative),
                    margin.left + 70,
                    width - margin.right - 70,
                  )}
                  y={height - 27}
                  textAnchor="middle"
                  className="chart-crosshair-label"
                >
                  {selectedTimeLabel}
                </text>
              </g>
            )}

            {displayedEntries.map(({ bar, relative }, plottedIndex) =>
              plottedIndex === 0 ||
              plottedIndex === displayedEntries.length - 1 ||
              plottedIndex %
                Math.max(1, Math.ceil(displayedEntries.length / 7)) ===
                0 ? (
                <text
                  key={`label-${bar.timestamp}`}
                  x={x(relative)}
                  y={height - 7}
                  textAnchor={
                    plottedIndex === 0
                      ? "start"
                      : plottedIndex === displayedEntries.length - 1
                        ? "end"
                        : "middle"
                  }
                  className="market-axis chart-time-axis"
                >
                  {formatAxisTime(bar.timestamp, dataSet.timeframe)}
                </text>
              ) : null,
            )}
          </svg>
        </div>
      </div>

      <div className="chart-control-deck">
        <label>
          <span>
            Timeline
            <output>
              {formatAxisTime(visible.at(-1)!.timestamp, dataSet.timeframe)}
            </output>
          </span>
          <input
            type="range"
            min={actualWindow}
            max={availableLength}
            value={endIndex}
            disabled={availableLength <= actualWindow}
            onChange={(event) => setViewEnd(Number(event.target.value))}
            aria-label="Pan chart timeline"
          />
        </label>
        <label>
          <span>
            Zoom
            <output>{actualWindow} bars</output>
          </span>
          <input
            type="range"
            min={minimumAvailableWindow}
            max={maximumAvailableWindow}
            value={actualWindow}
            onChange={(event) => applyWindowSize(Number(event.target.value))}
            aria-label="Zoom visible bars"
          />
        </label>
        <label>
          <span>
            Inspect
            <output>
              {selectedPlottedIndex + 1} / {displayedEntries.length}
            </output>
          </span>
          <input
            id="bar-inspector"
            type="range"
            min="0"
            max={Math.max(0, displayedEntries.length - 1)}
            value={selectedPlottedIndex}
            onChange={(event) =>
              setActiveRelative(
                displayedEntries[Number(event.target.value)].relative,
              )
            }
            aria-label="Inspect visible bar"
          />
        </label>
      </div>

      <div className="chart-legend">
        {overlays.fast && (
          <span className="legend-fast">Fast SMA {settings.fastPeriod}</span>
        )}
        {overlays.slow && (
          <span className="legend-slow">Slow SMA {settings.slowPeriod}</span>
        )}
        {overlays.ema && <span className="legend-ema">EMA 9</span>}
        {overlays.vwap && <span className="legend-vwap">VWAP</span>}
        {overlays.bollinger && (
          <span className="legend-bollinger">Bollinger 20, 2</span>
        )}
        {overlays.recorded && (
          <span className="legend-recorded">Recorded trade</span>
        )}
        {overlays.simulation && (
          <span className="legend-simulated">Simulation</span>
        )}
        {overlays.paper && <span className="legend-paper">Paper trade</span>}
        {comparisonDataSet && comparisonLast !== null && (
          <span className="legend-comparison">
            {comparisonDataSet.symbol} {formatSigned(comparisonLast)}%
          </span>
        )}
        <span className="chart-legend-mode">
          {preferences.scaleMode === "log" ? "Log scale" : "Linear scale"}
        </span>
        {intraday && !preferences.extendedHours && (
          <span className="chart-legend-mode">Regular session only</span>
        )}
      </div>
      <p id="chart-interaction-guide" className="chart-interaction-hint">
        Move across candles to inspect · click a candle or trade marker to keep
        its context · drawing tools stay at the left edge · scroll for
        pointer-anchored zoom · Shift+scroll or drag to pan · double-click to
        fit · arrows inspect · +/- zoom · Page Up/Down pan · Space plays replay
      </p>
    </section>
  );
}
