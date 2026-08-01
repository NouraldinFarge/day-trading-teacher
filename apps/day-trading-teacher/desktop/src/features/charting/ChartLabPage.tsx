import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BarChart3,
  BookOpenCheck,
  CandlestickChart,
  CheckCircle2,
  CloudDownload,
  Database,
  ExternalLink,
  FileUp,
  FlaskConical,
  KeyRound,
  Play,
  RefreshCw,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { EmptyState } from "../../components/EmptyState";
import { LessonWorkspaceBanner } from "../../components/LessonWorkspaceBanner";
import { MetricCard } from "../../components/MetricCard";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import {
  runMovingAverageBacktest,
  type BacktestSettings,
} from "../../domain/backtest";
import {
  createGuidedSampleData,
  inferMarketDataSymbol,
  parseMarketDataCsv,
} from "../../domain/market-data";
import {
  addAcquisitionSubscription,
  createProviderMarketDataSet,
  MARKET_DATA_PROVIDERS,
  normalizeMarketSymbol,
  providerDetails,
  providerRefreshMinutes,
  removeAcquisitionSubscription,
  type MarketDataInterval,
} from "../../domain/market-data-acquisition";
import { readLessonWorkspaceContext } from "../../domain/lesson-session";
import type { MarketDataProvider, MarketDataSet } from "../../domain/types";
import {
  clearMarketDataProviderCredentials,
  fetchMarketData,
  getMarketDataProviderStatus,
  isTauri,
  openMarketDataProviderPage,
  saveMarketDataProviderCredentials,
  type MarketDataProviderStatus,
} from "../../platform/bridge";
import { useAppState } from "../../state/AppStateContext";
import { MarketChart } from "./MarketChart";

function dollars(value: number) {
  return `${value < 0 ? "−" : ""}$${Math.abs(value).toFixed(2)}`;
}

function defaultSettings(
  initialCapital: string,
  risk: string,
): BacktestSettings {
  return {
    fastPeriod: 10,
    slowPeriod: 30,
    direction: "long",
    initialCapital: Number(initialCapital) || 10_000,
    riskPerTrade: Number(risk) || 25,
    stopPercent: 1,
    rewardMultiple: 2,
    slippagePerShare: 0.01,
    feePerTrade: 0,
  };
}

function chartPracticeCue(purpose: string) {
  const instruction = purpose.toLowerCase();
  if (instruction.includes("spread") || instruction.includes("friction"))
    return "Measure the visible range and price movement, label any missing quote or liquidity evidence, then choose market, limit, wait, or no trade before revealing another bar.";
  if (instruction.includes("eligib") || instruction.includes("earn"))
    return "Hide the future, name only the context you can see, then record eligible, wait, or no trade with the evidence that made the gate pass or fail.";
  if (instruction.includes("exit") || instruction.includes("invalidation"))
    return "Mark structural invalidation and any planned exit level before replay advances. Reveal bars only after every exit clause is observable and unambiguous.";
  if (instruction.includes("reset") || instruction.includes("fresh"))
    return "Move to the new decision timestamp and rebuild structure, trigger, invalidation, spread, remaining risk, and attention without carrying the prior result forward.";
  if (instruction.includes("stop") || instruction.includes("boundary"))
    return "Use replay or the paper account to find the first timestamp where the preset boundary ended execution. Stop there; do not create another order to prove the rule.";
  if (instruction.includes("clock") || instruction.includes("recorded"))
    return "Pin the execution timestamp, compare the journal facts with the matching bar, and label anything the one-minute candle cannot prove as unknown.";
  return "Start future-hidden replay, make one timestamped decision from visible evidence, then reveal bars only to review the process—not to grade the prediction.";
}

export function ChartLabPage() {
  const {
    state,
    addMarketDataSet,
    removeMarketDataSet,
    updateChartAcquisition,
    updateChartWorkspace,
    upsertPaperTradingSession,
  } = useAppState();
  const guidedByLesson = !state.profile.standaloneTools;
  const dataSets = state.marketDataSets ?? [];
  const [lessonContext] = useState(() => readLessonWorkspaceContext("chart"));
  const [showAcquisition, setShowAcquisition] = useState(
    () => !guidedByLesson && dataSets.length === 0,
  );
  const acquisition = state.chartAcquisition!;
  const [selectedId, setSelectedId] = useState(dataSets[0]?.id ?? "");
  const [symbol, setSymbol] = useState("");
  const [acquisitionSymbol, setAcquisitionSymbol] = useState(
    state.trades[0]?.symbol ?? "SPY",
  );
  const [acquisitionInterval, setAcquisitionInterval] =
    useState<MarketDataInterval>("daily");
  const [providerKey, setProviderKey] = useState("");
  const [providerSecret, setProviderSecret] = useState("");
  const [keyStatus, setKeyStatus] = useState<MarketDataProviderStatus | null>(
    null,
  );
  const [acquisitionBusy, setAcquisitionBusy] = useState(false);
  const [acquisitionMessage, setAcquisitionMessage] = useState("");
  const [acquisitionError, setAcquisitionError] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [importError, setImportError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<MarketDataSet | null>(null);
  const [draft, setDraft] = useState<BacktestSettings>(() =>
    defaultSettings(
      state.profile.startingBalance ?? "10000",
      state.profile.maxRiskPerTrade,
    ),
  );
  const [applied, setApplied] = useState(draft);
  const [settingsError, setSettingsError] = useState("");
  const [runMessage, setRunMessage] = useState(
    "Using the default practice assumptions.",
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const selected =
    dataSets.find((dataSet) => dataSet.id === selectedId) ??
    dataSets[0] ??
    null;
  const activeProvider = providerDetails(acquisition.provider);

  useEffect(() => {
    if (!selected && dataSets[0]) setSelectedId(dataSets[0].id);
    if (selectedId && !dataSets.some((dataSet) => dataSet.id === selectedId))
      setSelectedId(dataSets[0]?.id ?? "");
  }, [dataSets, selected, selectedId]);

  useEffect(() => {
    setKeyStatus(null);
    setProviderKey("");
    setProviderSecret("");
    void getMarketDataProviderStatus(acquisition.provider)
      .then(setKeyStatus)
      .catch((reason) =>
        setAcquisitionError(
          reason instanceof Error ? reason.message : String(reason),
        ),
      );
  }, [acquisition.provider]);

  const result = useMemo(
    () => (selected ? runMovingAverageBacktest(selected.bars, applied) : null),
    [selected, applied],
  );
  const matchingRecorded = selected
    ? state.trades.filter((trade) => {
        if (trade.symbol.toUpperCase() !== selected.symbol.toUpperCase())
          return false;
        const firstBar = new Date(selected.bars[0].timestamp).getTime();
        const lastBar = new Date(selected.bars.at(-1)!.timestamp).getTime();
        const entry = new Date(trade.entryAt ?? trade.occurredAt).getTime();
        const exit = new Date(trade.exitAt ?? trade.occurredAt).getTime();
        return (
          Number.isFinite(entry) &&
          Number.isFinite(exit) &&
          entry >= firstBar &&
          exit <= lastBar
        );
      })
    : [];
  const paperHistory = selected
    ? (state.paperTradingSessions ?? []).filter(
        (session) => session.dataSetId === selected.id,
      )
    : [];
  const activePaperSession =
    paperHistory.find((session) => session.status === "active") ?? null;
  const paperDefaults = {
    startingBalance: Number(state.profile.startingBalance) || 10_000,
    maxRiskPerTrade: Number(state.profile.maxRiskPerTrade) || 25,
    dailyLossLimit: Number(state.profile.dailyLossLimit) || 75,
    slippagePerShare: applied.slippagePerShare,
    commissionPerOrder: applied.feePerTrade / 2,
  };
  const settingsChanged = JSON.stringify(draft) !== JSON.stringify(applied);
  const updateSetting = <K extends keyof BacktestSettings>(
    field: K,
    value: BacktestSettings[K],
  ) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setSettingsError("");
  };

  const storeProviderKey = async () => {
    setAcquisitionBusy(true);
    setAcquisitionError("");
    setAcquisitionMessage("");
    try {
      const status = await saveMarketDataProviderCredentials(
        acquisition.provider,
        providerKey,
        providerSecret,
      );
      setKeyStatus(status);
      setProviderKey("");
      setProviderSecret("");
      setAcquisitionMessage(
        `${activeProvider.shortName} credentials saved locally. They are excluded from app-state exports.`,
      );
    } catch (reason) {
      setAcquisitionError(
        reason instanceof Error ? reason.message : String(reason),
      );
    } finally {
      setAcquisitionBusy(false);
    }
  };

  const removeProviderKey = async () => {
    setAcquisitionBusy(true);
    setAcquisitionError("");
    setAcquisitionMessage("");
    try {
      setKeyStatus(
        await clearMarketDataProviderCredentials(acquisition.provider),
      );
      setProviderKey("");
      setProviderSecret("");
      setAcquisitionMessage(
        `${activeProvider.shortName} credentials removed. Existing chart data remains available offline.`,
      );
    } catch (reason) {
      setAcquisitionError(
        reason instanceof Error ? reason.message : String(reason),
      );
    } finally {
      setAcquisitionBusy(false);
    }
  };

  const downloadSymbol = async () => {
    setAcquisitionBusy(true);
    setAcquisitionError("");
    setAcquisitionMessage("");
    try {
      const normalized = normalizeMarketSymbol(acquisitionSymbol);
      const subscriptions = addAcquisitionSubscription(
        acquisition.subscriptions,
        acquisition.provider,
        normalized,
        acquisitionInterval,
      );
      const dataSet = createProviderMarketDataSet(
        acquisition.provider,
        normalized,
        await fetchMarketData(
          acquisition.provider,
          normalized,
          acquisitionInterval,
        ),
        acquisitionInterval,
      );
      addMarketDataSet(dataSet);
      setSelectedId(dataSet.id);
      setAcquisitionSymbol(normalized);
      const checkedAt = new Date().toISOString();
      updateChartAcquisition({
        ...acquisition,
        subscriptions,
        autoRefresh: true,
        lastRefreshAt: checkedAt,
        lastDailyRefreshAt:
          acquisitionInterval === "daily"
            ? checkedAt
            : acquisition.lastDailyRefreshAt,
        lastOneMinuteRefreshAt:
          acquisitionInterval === "1min"
            ? checkedAt
            : acquisition.lastOneMinuteRefreshAt,
        lastRefreshMessage: `${normalized} ${acquisitionInterval === "1min" ? "one-minute" : "daily"} bars downloaded from ${activeProvider.shortName} and added to automatic refresh.`,
      });
      setAcquisitionMessage(
        `${dataSet.bars.length.toLocaleString()} ${acquisitionInterval === "1min" ? "one-minute" : "daily"} ${normalized} bars downloaded from ${activeProvider.shortName}. Automatic refresh is on.`,
      );
    } catch (reason) {
      setAcquisitionError(
        reason instanceof Error ? reason.message : String(reason),
      );
    } finally {
      setAcquisitionBusy(false);
    }
  };

  const refreshWatchlist = async () => {
    if (!acquisition.subscriptions.length) return;
    setAcquisitionBusy(true);
    setAcquisitionError("");
    setAcquisitionMessage("");
    let refreshed = 0;
    const failures: string[] = [];
    for (const request of acquisition.subscriptions) {
      try {
        addMarketDataSet(
          createProviderMarketDataSet(
            request.provider,
            request.symbol,
            await fetchMarketData(
              request.provider,
              request.symbol,
              request.interval,
            ),
            request.interval,
          ),
        );
        refreshed += 1;
      } catch {
        failures.push(
          `${providerDetails(request.provider).shortName} ${request.symbol} ${request.interval === "1min" ? "1m" : "1d"}`,
        );
      }
    }
    const checkedAt = new Date().toISOString();
    const message = failures.length
      ? `Refreshed ${refreshed}; could not update ${failures.join(", ")}.`
      : `Refreshed ${refreshed} chart${refreshed === 1 ? "" : "s"}.`;
    updateChartAcquisition({
      ...acquisition,
      lastRefreshAt: checkedAt,
      lastDailyRefreshAt: acquisition.subscriptions.some(
        (item) => item.interval === "daily",
      )
        ? checkedAt
        : acquisition.lastDailyRefreshAt,
      lastOneMinuteRefreshAt: acquisition.subscriptions.some(
        (item) => item.interval === "1min",
      )
        ? checkedAt
        : acquisition.lastOneMinuteRefreshAt,
      lastRefreshMessage: message,
    });
    if (failures.length)
      setAcquisitionError(
        `${message} Check the provider key, connection, or request limit.`,
      );
    else setAcquisitionMessage(message);
    setAcquisitionBusy(false);
  };

  const chooseFile = () => {
    fileRef.current?.click();
  };

  const importFile = async (file?: File) => {
    if (!file) return;
    setImportError("");
    setImportMessage("");
    try {
      if (file.size > 12_000_000)
        throw new Error(
          "The historical data file is larger than the 12 MB safety limit.",
        );
      const raw = await file.text();
      const parsed = parseMarketDataCsv(raw);
      const inferredSymbol = inferMarketDataSymbol(file.name, raw);
      const normalizedSymbol = (
        symbol.trim() ||
        inferredSymbol ||
        ""
      ).toUpperCase();
      if (!normalizedSymbol)
        throw new Error(
          "The symbol could not be detected from this file. Enter it in Symbol override, then import the file again.",
        );
      const firstBar = new Date(parsed.firstTimestamp).getTime();
      const lastBar = new Date(parsed.lastTimestamp).getTime();
      const matchedTrades = state.trades.filter((trade) => {
        if (trade.symbol.toUpperCase() !== normalizedSymbol) return false;
        const entry = new Date(trade.entryAt ?? trade.occurredAt).getTime();
        const exit = new Date(trade.exitAt ?? trade.occurredAt).getTime();
        return entry >= firstBar && exit <= lastBar;
      });
      const dataSet: MarketDataSet = {
        id: crypto.randomUUID(),
        name: `${normalizedSymbol} historical data`,
        symbol: normalizedSymbol,
        timeframe: parsed.timeframe,
        sourceType: "csv",
        sourceFile: file.name,
        importedAt: new Date().toISOString(),
        bars: parsed.bars,
        importSummary: {
          firstTimestamp: parsed.firstTimestamp,
          lastTimestamp: parsed.lastTimestamp,
          indicatorColumns: parsed.indicatorColumns,
          discontinuityCount: parsed.discontinuityCount,
          matchedTradeCount: matchedTrades.length,
        },
      };
      addMarketDataSet(dataSet);
      setSelectedId(dataSet.id);
      setSymbol(normalizedSymbol);
      setImportMessage(
        `${parsed.bars.length.toLocaleString()} ${parsed.timeframe} bars imported for ${normalizedSymbol}${inferredSymbol && !symbol.trim() ? " (symbol detected automatically)" : ""}. ${matchedTrades.length} completed journal position${matchedTrades.length === 1 ? "" : "s"} fit entirely inside this chart window.${parsed.warnings.length ? ` ${parsed.warnings.join(" ")}` : ""}`,
      );
    } catch (reason) {
      setImportError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const loadSample = () => {
    const existing = dataSets.find(
      (dataSet) => dataSet.sourceType === "sample",
    );
    if (existing) {
      setSelectedId(existing.id);
      setImportMessage("The guided sample is ready to explore.");
      return;
    }
    const sample = createGuidedSampleData();
    addMarketDataSet(sample);
    setSelectedId(sample.id);
    setSymbol(sample.symbol);
    setImportMessage(
      "Loaded 220 synthetic daily bars for guided practice. They are not market data.",
    );
  };

  const runTest = (event: FormEvent) => {
    event.preventDefault();
    if (draft.fastPeriod < 2)
      return setSettingsError("Fast average must be at least 2 bars.");
    if (draft.slowPeriod <= draft.fastPeriod)
      return setSettingsError(
        "Slow average must be greater than the fast average.",
      );
    if (draft.initialCapital <= 0 || draft.riskPerTrade <= 0)
      return setSettingsError(
        "Starting balance and maximum risk must be greater than zero.",
      );
    if (draft.riskPerTrade > draft.initialCapital)
      return setSettingsError(
        "Maximum risk cannot exceed the simulated starting balance.",
      );
    if (draft.stopPercent <= 0 || draft.rewardMultiple <= 0)
      return setSettingsError(
        "Stop distance and reward multiple must be greater than zero.",
      );
    setApplied(draft);
    setRunMessage(
      `Simulation refreshed at ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`,
    );
  };

  return (
    <div className="chart-lab-page">
      <LessonWorkspaceBanner workspace="chart" />
      <PageHeader
        eyebrow={
          guidedByLesson
            ? "Lesson practice · Chart Replay"
            : "Standalone chart, replay, and backtest"
        }
        title={
          guidedByLesson
            ? "Transfer the lesson onto historical evidence"
            : "Test ideas against historical bars"
        }
        description={
          guidedByLesson
            ? "Pause, annotate, backtest, and paper trade historical bars to practice eligibility, execution, and review. Results remain evidence—not forecasts."
            : "View your recorded trades in context and run one transparent simulation at a time. Data stays local; results are educational evidence, not forecasts."
        }
        actions={
          <Link
            to={guidedByLesson ? "/learn" : "/trades"}
            className="button secondary"
          >
            <ArrowLeft size={16} />
            {guidedByLesson ? "Back to lessons" : "Back to Journal"}
          </Link>
        }
      />

      {lessonContext ? (
        <section
          className="chart-lesson-coach card"
          aria-labelledby="chart-lesson-coach-title"
        >
          <div className="chart-lesson-coach-heading">
            <span className="chart-lesson-coach-icon">
              <Play size={21} />
            </span>
            <div>
              <span className="eyebrow accent">
                Outcome-hidden lesson practice
              </span>
              <h2 id="chart-lesson-coach-title">
                Produce evidence for this lesson
              </h2>
              <p>{lessonContext.purpose}</p>
            </div>
          </div>
          <ol className="chart-lesson-steps">
            <li>
              <span>1</span>
              <p>
                <strong>Pause before outcome.</strong> Choose a historical
                timestamp and turn on Replay before inspecting future bars.
              </p>
            </li>
            <li>
              <span>2</span>
              <p>
                <strong>Make the lesson decision.</strong>{" "}
                {chartPracticeCue(lessonContext.purpose)}
              </p>
            </li>
            <li>
              <span>3</span>
              <p>
                <strong>Return with evidence.</strong> {lessonContext.artifact}
              </p>
            </li>
          </ol>
          <div className="chart-lesson-coach-actions">
            {selected ? (
              <a className="button primary compact" href="#historical-chart">
                <CandlestickChart size={15} /> Open current chart
              </a>
            ) : (
              <button
                className="button primary compact"
                type="button"
                onClick={loadSample}
              >
                <BookOpenCheck size={15} /> Load guided sample
              </button>
            )}
            <button
              className="button ghost compact"
              type="button"
              onClick={() => setShowAcquisition((current) => !current)}
            >
              <CloudDownload size={15} />
              {showAcquisition ? "Hide data sources" : "Data sources"}
            </button>
          </div>
        </section>
      ) : null}

      {showAcquisition ? (
        <section
          className="chart-acquisition-card card"
          aria-labelledby="chart-acquisition-title"
        >
          <div className="chart-acquisition-heading">
            <div className="chart-acquisition-title">
              <span>
                <CloudDownload size={22} />
              </span>
              <div>
                <span className="eyebrow accent">
                  Free and account-included chart acquisition
                </span>
                <h2 id="chart-acquisition-title">
                  Choose the right feed for the job
                </h2>
                <p>
                  Download provider-labeled daily or one-minute OHLCV bars
                  without mixing feeds. Each watched series remembers its
                  provider, interval, freshness, and session context.
                </p>
              </div>
            </div>
            <div className="chart-acquisition-heading-actions">
              <span
                className={`badge ${keyStatus?.configured ? "badge-strong" : "badge-partial"}`}
              >
                {keyStatus?.configured
                  ? `${activeProvider.shortName} connected`
                  : "Credentials required"}
              </span>
              {guidedByLesson ? (
                <button
                  className="button ghost compact"
                  type="button"
                  onClick={() => setShowAcquisition(false)}
                >
                  <X size={14} /> Hide sources
                </button>
              ) : null}
            </div>
          </div>
          <div className="chart-acquisition-grid">
            <div className="provider-key-panel">
              <div className="field provider-select">
                <label htmlFor="market-data-provider">Market-data source</label>
                <select
                  id="market-data-provider"
                  disabled={acquisitionBusy}
                  value={acquisition.provider}
                  onChange={(event) => {
                    setAcquisitionError("");
                    setAcquisitionMessage("");
                    updateChartAcquisition({
                      ...acquisition,
                      provider: event.target.value as MarketDataProvider,
                    });
                  }}
                >
                  {MARKET_DATA_PROVIDERS.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                      {provider.freeOneMinute ? " · free 1m" : " · paid 1m"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="provider-line">
                <KeyRound size={18} />
                <div>
                  <strong>{activeProvider.name}</strong>
                  <span>
                    {keyStatus?.message ??
                      "Checking local provider configuration…"}
                  </span>
                </div>
              </div>
              <p className="provider-description">
                {activeProvider.description}
              </p>
              <div className="provider-trust-grid">
                <span>
                  <strong>
                    {activeProvider.freeOneMinute ? "Free 1m" : "Premium 1m"}
                  </strong>
                  <small>one-minute access</small>
                </span>
                <span>
                  <strong>{activeProvider.feed}</strong>
                  <small>feed</small>
                </span>
                <span>
                  <strong>{activeProvider.freshness}</strong>
                  <small>freshness</small>
                </span>
              </div>
              <div
                className={`provider-key-form ${activeProvider.secretLabel ? "has-secret" : ""}`}
              >
                <div className="field">
                  <label htmlFor="market-data-key">
                    {keyStatus?.configured
                      ? `Replace ${activeProvider.credentialLabel}`
                      : activeProvider.credentialLabel}
                  </label>
                  <input
                    id="market-data-key"
                    type="password"
                    autoComplete="off"
                    disabled={!isTauri() || acquisitionBusy}
                    value={providerKey}
                    onChange={(event) =>
                      setProviderKey(event.target.value.trim())
                    }
                    placeholder={
                      keyStatus?.configured
                        ? "Enter a replacement only"
                        : "Stored outside app-state exports"
                    }
                  />
                </div>
                {activeProvider.secretLabel ? (
                  <div className="field">
                    <label htmlFor="market-data-secret">
                      {activeProvider.secretLabel}
                    </label>
                    <input
                      id="market-data-secret"
                      type="password"
                      autoComplete="off"
                      disabled={!isTauri() || acquisitionBusy}
                      value={providerSecret}
                      onChange={(event) =>
                        setProviderSecret(event.target.value.trim())
                      }
                      placeholder="Stored locally"
                    />
                  </div>
                ) : null}
                <button
                  className="button secondary"
                  type="button"
                  disabled={
                    !isTauri() ||
                    acquisitionBusy ||
                    providerKey.length < 8 ||
                    Boolean(
                      activeProvider.secretLabel && providerSecret.length < 8,
                    )
                  }
                  onClick={() => void storeProviderKey()}
                >
                  {keyStatus?.configured ? "Replace" : "Save locally"}
                </button>
              </div>
              <div className="provider-key-actions">
                <button
                  className="text-button"
                  type="button"
                  onClick={() =>
                    void openMarketDataProviderPage(acquisition.provider)
                  }
                >
                  <ExternalLink size={14} />
                  Get provider access
                </button>
                {keyStatus?.configured ? (
                  <button
                    className="text-button danger-text"
                    type="button"
                    disabled={acquisitionBusy}
                    onClick={() => void removeProviderKey()}
                  >
                    Remove saved credentials
                  </button>
                ) : null}
              </div>
              <small>
                Credentials stay in <strong>active-build/config</strong>,
                outside app-state exports. Requests go only to the selected
                market-data provider. The app never receives trading permission
                or places orders.
              </small>
            </div>
            <div className="watchlist-panel">
              <div className="watchlist-download">
                <div className="field">
                  <label htmlFor="acquisition-symbol">Symbol</label>
                  <input
                    id="acquisition-symbol"
                    maxLength={16}
                    disabled={acquisitionBusy}
                    value={acquisitionSymbol}
                    onChange={(event) =>
                      setAcquisitionSymbol(event.target.value.toUpperCase())
                    }
                    placeholder="SPY"
                  />
                </div>
                <div className="field">
                  <label htmlFor="acquisition-interval">Bars</label>
                  <select
                    id="acquisition-interval"
                    disabled={acquisitionBusy}
                    value={acquisitionInterval}
                    onChange={(event) =>
                      setAcquisitionInterval(
                        event.target.value as MarketDataInterval,
                      )
                    }
                  >
                    <option value="daily">Daily</option>
                    <option value="1min">
                      1 minute ·{" "}
                      {activeProvider.freeOneMinute ? "free" : "premium"}
                    </option>
                  </select>
                </div>
                <button
                  className="button primary"
                  type="button"
                  disabled={
                    !keyStatus?.configured ||
                    acquisitionBusy ||
                    !acquisitionSymbol.trim()
                  }
                  onClick={() => void downloadSymbol()}
                >
                  {acquisitionBusy ? (
                    <RefreshCw className="spin" size={16} />
                  ) : (
                    <CloudDownload size={16} />
                  )}
                  {acquisitionBusy ? "Working…" : "Download & watch"}
                </button>
              </div>
              {acquisitionInterval === "1min" ? (
                <div
                  className={`intraday-entitlement-note ${activeProvider.freeOneMinute ? "informational" : ""}`}
                >
                  <ShieldAlert size={15} />
                  <span>{activeProvider.oneMinuteNote}</span>
                </div>
              ) : null}
              <div className="chart-watchlist">
                <div>
                  <strong>Provider-bound refresh watchlist</strong>
                  <span>{acquisition.subscriptions.length}/5 chart series</span>
                </div>
                {acquisition.subscriptions.length ? (
                  <div className="watchlist-chips">
                    {acquisition.subscriptions.map((subscription) => (
                      <span
                        key={`${subscription.provider}-${subscription.symbol}-${subscription.interval}`}
                      >
                        {subscription.symbol}
                        <em>
                          {subscription.interval === "1min" ? "1m" : "1d"}
                        </em>
                        <small>
                          {providerDetails(subscription.provider).shortName}
                        </small>
                        <button
                          type="button"
                          aria-label={`Stop refreshing ${subscription.symbol} ${subscription.interval} bars from ${providerDetails(subscription.provider).shortName}`}
                          onClick={() =>
                            updateChartAcquisition({
                              ...acquisition,
                              subscriptions: removeAcquisitionSubscription(
                                acquisition.subscriptions,
                                subscription,
                              ),
                            })
                          }
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p>
                    No watched series yet. The same symbol may be watched
                    through different providers without overwriting its
                    provenance.
                  </p>
                )}
              </div>
              <div className="watchlist-controls">
                <label className="compact-toggle">
                  <input
                    type="checkbox"
                    checked={acquisition.autoRefresh}
                    disabled={!acquisition.subscriptions.length}
                    onChange={(event) =>
                      updateChartAcquisition({
                        ...acquisition,
                        autoRefresh: event.target.checked,
                      })
                    }
                  />
                  <span>
                    Provider-aware automatic refresh · selected 1m cadence:{" "}
                    {providerRefreshMinutes(acquisition.provider, "1min") >=
                    1440
                      ? "daily"
                      : `${providerRefreshMinutes(acquisition.provider, "1min")} min`}
                  </span>
                </label>
                <button
                  className="button ghost compact"
                  type="button"
                  disabled={
                    acquisitionBusy || !acquisition.subscriptions.length
                  }
                  onClick={() => void refreshWatchlist()}
                >
                  <RefreshCw size={14} />
                  Refresh all now
                </button>
              </div>
              <small>
                {acquisition.lastRefreshAt
                  ? `Last checked ${new Date(acquisition.lastRefreshAt).toLocaleString()} · `
                  : ""}
                {acquisition.lastRefreshMessage ||
                  "Historical chart context only; not an execution-quality real-time quote feed."}
              </small>
            </div>
          </div>
          {acquisitionMessage ? (
            <div className="success-message acquisition-feedback" role="status">
              <span>
                <CheckCircle2 size={16} />
                {acquisitionMessage}
              </span>
            </div>
          ) : null}
          {acquisitionError ? (
            <div className="error-message acquisition-feedback" role="alert">
              {acquisitionError}
            </div>
          ) : null}
        </section>
      ) : (
        <section
          className="chart-source-compact"
          aria-label="Historical chart data sources"
        >
          <span>
            <CloudDownload size={17} />
            <strong>Need different bars?</strong>
            <small>
              Import a local CSV or connect a provider when the lesson needs
              another symbol or one-minute context.
            </small>
          </span>
          <button
            className="button ghost compact"
            type="button"
            onClick={() => setShowAcquisition(true)}
          >
            Open data sources
          </button>
        </section>
      )}

      <section
        className="chart-data-toolbar card"
        aria-label="Historical chart data"
      >
        <div className="chart-data-select">
          <label htmlFor="chart-dataset">Chart dataset</label>
          <select
            id="chart-dataset"
            value={selected?.id ?? ""}
            disabled={!dataSets.length}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            <option value="">No dataset loaded</option>
            {dataSets.map((dataSet) => (
              <option key={dataSet.id} value={dataSet.id}>
                {dataSet.symbol} · {dataSet.timeframe} ·{" "}
                {dataSet.bars.length.toLocaleString()} bars
              </option>
            ))}
          </select>
        </div>
        <div className="chart-import-symbol">
          <label htmlFor="chart-symbol">Symbol override</label>
          <input
            id="chart-symbol"
            maxLength={12}
            value={symbol}
            onChange={(event) => setSymbol(event.target.value.toUpperCase())}
            placeholder="Auto-detected"
          />
        </div>
        <div className="chart-data-actions">
          <button className="button secondary" onClick={chooseFile}>
            <FileUp size={16} />
            Import OHLCV CSV
          </button>
          <input
            ref={fileRef}
            className="file-input"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => void importFile(event.target.files?.[0])}
          />
          <button className="button secondary" onClick={loadSample}>
            <BookOpenCheck size={16} />
            Guided sample
          </button>
          {selected ? (
            <button
              className="icon-button danger-icon"
              onClick={() => setDeleteTarget(selected)}
              aria-label={`Delete ${selected.name}`}
            >
              <Trash2 size={17} />
            </button>
          ) : null}
        </div>
      </section>
      <div className="callout chart-import-guidance">
        <BookOpenCheck size={18} />
        <p>
          <strong>Fidelity one-minute route:</strong> In Active Trader Pro
          Classic, export the chart as CSV and import it here. The symbol is
          detected from supported filenames such as “DFNS (…)”; use the override
          only when detection is uncertain. Matching Fidelity orders imported in
          the Journal appear automatically on the chart.
        </p>
      </div>
      {importMessage ? (
        <div className="success-message" role="status">
          <span>
            <CheckCircle2 size={16} />
            {importMessage}
          </span>
        </div>
      ) : null}
      {importError ? (
        <div className="error-message" role="alert">
          {importError}
        </div>
      ) : null}

      {!selected ? (
        <section className="chart-empty-hero card">
          <div className="chart-empty-visual" aria-hidden="true">
            <CandlestickChart size={58} />
          </div>
          <div>
            <span className="eyebrow accent">Start without pressure</span>
            <h2>Bring historical bars into context</h2>
            <p>
              Use a free provider above, import an OHLCV export from Fidelity
              Active Trader Pro Classic or another vendor, or learn the controls
              with the clearly labeled synthetic sample.
            </p>
            <div className="hero-actions">
              <button className="button primary" onClick={chooseFile}>
                <FileUp size={16} />
                Import historical CSV
              </button>
              <button className="button secondary" onClick={loadSample}>
                <FlaskConical size={16} />
                Use guided sample
              </button>
            </div>
            <small>
              Required CSV columns: Timestamp or Date, Open, High, Low, Close.
              Volume is optional. The newest 20,000 valid bars are stored
              locally.
            </small>
          </div>
        </section>
      ) : null}

      {selected && result ? (
        <>
          <section className="dataset-context-strip" id="historical-chart">
            <div>
              <Database size={18} />
              <span>
                <strong>{selected.name}</strong>
                <small>
                  {selected.sourceFile} · updated{" "}
                  {new Date(selected.importedAt).toLocaleDateString()}
                  {selected.freshness ? ` · ${selected.freshness}` : ""}
                </small>
              </span>
            </div>
            <div>
              <strong>{matchingRecorded.length}</strong>
              <small>
                matching journal{" "}
                {matchingRecorded.length === 1 ? "trade" : "trades"}
              </small>
            </div>
            <div>
              <strong>{result.trades.length}</strong>
              <small>simulated trades</small>
            </div>
            <div>
              <strong>
                {paperHistory.reduce(
                  (count, session) => count + session.trades.length,
                  0,
                )}
              </strong>
              <small>paper trades</small>
            </div>
            <span
              className={`badge ${selected.sourceType === "sample" ? "badge-partial" : "badge-strong"}`}
            >
              {selected.sourceType === "sample"
                ? "Synthetic practice data"
                : selected.sourceType === "provider"
                  ? `${selected.feed ?? "Provider"} · ${selected.timeframe === "1m" ? "1 minute" : "daily"}`
                  : "Imported locally"}
            </span>
          </section>
          {selected.importSummary ? (
            <section
              className="chart-evidence-bridge"
              aria-label="Imported session evidence"
            >
              <div>
                <span className="eyebrow">Session evidence</span>
                <strong>
                  {matchingRecorded.length
                    ? `${matchingRecorded.length} completed position${matchingRecorded.length === 1 ? "" : "s"} aligned`
                    : "Chart ready for evidence"}
                </strong>
                <small>
                  {new Date(
                    selected.importSummary.firstTimestamp,
                  ).toLocaleString()}{" "}
                  →{" "}
                  {new Date(
                    selected.importSummary.lastTimestamp,
                  ).toLocaleString()}
                </small>
              </div>
              <div>
                <strong>
                  {selected.importSummary.discontinuityCount
                    ? `${selected.importSummary.discontinuityCount} time gap${selected.importSummary.discontinuityCount === 1 ? "" : "s"}`
                    : "Continuous timeline"}
                </strong>
                <small>
                  {selected.importSummary.indicatorColumns.length
                    ? `${selected.importSummary.indicatorColumns.length} source study column${selected.importSummary.indicatorColumns.length === 1 ? "" : "s"} detected`
                    : "OHLCV source"}
                </small>
              </div>
              <Link to="/trades" className="button secondary compact">
                <BookOpenCheck size={15} />
                Review matched trades
              </Link>
            </section>
          ) : null}
          <MarketChart
            dataSet={selected}
            recordedTrades={state.trades}
            simulationTrades={result.trades}
            settings={applied}
            comparisonDataSets={dataSets.filter(
              (dataSet) =>
                dataSet.id !== selected.id &&
                dataSet.timeframe === selected.timeframe,
            )}
            chartPreferences={state.chartWorkspace}
            onChartPreferencesChange={updateChartWorkspace}
            paperSession={activePaperSession}
            paperHistory={paperHistory}
            paperDefaults={paperDefaults}
            onPaperSessionChange={upsertPaperTradingSession}
          />

          <section className="chart-lab-grid section-gap">
            <form className="card backtest-form" onSubmit={runTest}>
              <div className="card-header">
                <div>
                  <h2>Simulation assumptions</h2>
                  <p>
                    Moving-average crossover · signal at close, execution at the
                    next open
                  </p>
                </div>
                <FlaskConical size={20} />
              </div>
              <div className="card-body">
                <div className="form-grid three">
                  <div className="field">
                    <label htmlFor="fast-period">Fast SMA</label>
                    <input
                      id="fast-period"
                      type="number"
                      min="2"
                      max="500"
                      value={draft.fastPeriod}
                      onChange={(event) =>
                        updateSetting("fastPeriod", Number(event.target.value))
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="slow-period">Slow SMA</label>
                    <input
                      id="slow-period"
                      type="number"
                      min="3"
                      max="1000"
                      value={draft.slowPeriod}
                      onChange={(event) =>
                        updateSetting("slowPeriod", Number(event.target.value))
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="test-direction">Direction</label>
                    <select
                      id="test-direction"
                      value={draft.direction}
                      onChange={(event) =>
                        updateSetting(
                          "direction",
                          event.target.value as BacktestSettings["direction"],
                        )
                      }
                    >
                      <option value="long">Long only</option>
                      <option value="short">Short only</option>
                      <option value="both">Long and short</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="test-capital">Starting balance</label>
                    <input
                      id="test-capital"
                      type="number"
                      min="1"
                      step=".01"
                      value={draft.initialCapital}
                      onChange={(event) =>
                        updateSetting(
                          "initialCapital",
                          Number(event.target.value),
                        )
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="test-risk">Maximum risk / trade</label>
                    <input
                      id="test-risk"
                      type="number"
                      min=".01"
                      step=".01"
                      value={draft.riskPerTrade}
                      onChange={(event) =>
                        updateSetting(
                          "riskPerTrade",
                          Number(event.target.value),
                        )
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="test-stop">Stop distance</label>
                    <div className="input-suffix">
                      <input
                        id="test-stop"
                        type="number"
                        min=".05"
                        step=".05"
                        value={draft.stopPercent}
                        onChange={(event) =>
                          updateSetting(
                            "stopPercent",
                            Number(event.target.value),
                          )
                        }
                      />
                      <span>%</span>
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="test-reward">Reward multiple</label>
                    <div className="input-suffix">
                      <input
                        id="test-reward"
                        type="number"
                        min=".25"
                        step=".25"
                        value={draft.rewardMultiple}
                        onChange={(event) =>
                          updateSetting(
                            "rewardMultiple",
                            Number(event.target.value),
                          )
                        }
                      />
                      <span>R</span>
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="test-slippage">Slippage / share</label>
                    <input
                      id="test-slippage"
                      type="number"
                      min="0"
                      step=".01"
                      value={draft.slippagePerShare}
                      onChange={(event) =>
                        updateSetting(
                          "slippagePerShare",
                          Number(event.target.value),
                        )
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="test-fee">Fees / round trip</label>
                    <input
                      id="test-fee"
                      type="number"
                      min="0"
                      step=".01"
                      value={draft.feePerTrade}
                      onChange={(event) =>
                        updateSetting("feePerTrade", Number(event.target.value))
                      }
                    />
                  </div>
                </div>
                {settingsError ? (
                  <div className="error-message" role="alert">
                    {settingsError}
                  </div>
                ) : null}
                <div className="backtest-run-row">
                  <span className={settingsChanged ? "stale" : ""}>
                    {settingsChanged
                      ? "Assumptions changed—run again to update the chart."
                      : runMessage}
                  </span>
                  <button className="button primary" type="submit">
                    <Play size={16} />
                    Run backtest
                  </button>
                </div>
              </div>
            </form>

            <aside className="stack backtest-results">
              <article className="card">
                <div className="card-header">
                  <div>
                    <h2>What this run produced</h2>
                    <p>Recorded simulation output—not a prediction</p>
                  </div>
                  <BarChart3 size={20} />
                </div>
                <div className="card-body backtest-stat-list">
                  <div>
                    <span>Ending balance</span>
                    <strong>{dollars(result.endingCapital)}</strong>
                  </div>
                  <div>
                    <span>Cumulative return</span>
                    <strong
                      className={
                        result.cumulativeReturn >= 0
                          ? "positive-text"
                          : "negative-text"
                      }
                    >
                      {result.cumulativeReturn.toFixed(2)}%
                    </strong>
                  </div>
                  <div>
                    <span>Maximum drawdown</span>
                    <strong>{dollars(result.maxDrawdown)}</strong>
                  </div>
                  <div>
                    <span>Average hold</span>
                    <strong>{result.averageBarsHeld.toFixed(1)} bars</strong>
                  </div>
                  <div>
                    <span>Profit factor</span>
                    <strong>
                      {result.profitFactor === null
                        ? "No losses"
                        : result.profitFactor.toFixed(2)}
                    </strong>
                  </div>
                </div>
              </article>
              <div className="callout warning">
                <ShieldAlert size={18} />
                <p>
                  Historical fit is not future evidence. This run does not model
                  liquidity, gaps beyond bar OHLC, taxes, changing spreads,
                  partial fills, short availability, or market impact.
                </p>
              </div>
            </aside>
          </section>

          <section className="metrics-grid section-gap">
            <MetricCard
              label="Simulation net"
              value={dollars(result.netPnl)}
              note={`${result.trades.length} closed simulated trades`}
              icon={<CandlestickChart size={19} />}
              tone={result.netPnl >= 0 ? "positive" : "warning"}
            />
            <MetricCard
              label="Win rate"
              value={`${result.winRate.toFixed(1)}%`}
              note="Outcome frequency, not process quality"
              icon={<BarChart3 size={19} />}
            />
            <MetricCard
              label="Expectancy"
              value={dollars(result.expectancy)}
              note="Average per simulated trade"
              icon={<FlaskConical size={19} />}
            />
            <MetricCard
              label="Recorded overlays"
              value={`${matchingRecorded.length}`}
              note={`Journal trades matching ${selected.symbol}`}
              icon={<BookOpenCheck size={19} />}
              tone="positive"
            />
          </section>

          <section className="card section-gap">
            <div className="card-header">
              <div>
                <h2>Simulation trade log</h2>
                <p>
                  Inspect each generated entry and exit instead of trusting the
                  headline result
                </p>
              </div>
              <span className="badge badge-strong">
                {result.trades.length} trades
              </span>
            </div>
            <div className="backtest-table-wrap">
              {result.trades.length ? (
                <table className="backtest-table">
                  <thead>
                    <tr>
                      <th>Entry</th>
                      <th>Side</th>
                      <th>Entry → exit</th>
                      <th>Size</th>
                      <th>Result</th>
                      <th>R</th>
                      <th>Exit rule</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.trades
                      .slice()
                      .reverse()
                      .slice(0, 50)
                      .map((trade) => (
                        <tr key={trade.id}>
                          <td>
                            {new Date(trade.entryAt).toLocaleDateString()}
                          </td>
                          <td>
                            <span className="side-marker">{trade.side}</span>
                          </td>
                          <td>
                            {trade.entryPrice.toFixed(2)} →{" "}
                            {trade.exitPrice.toFixed(2)}
                          </td>
                          <td>{trade.quantity}</td>
                          <td
                            className={
                              trade.netPnl >= 0
                                ? "positive-text"
                                : "negative-text"
                            }
                          >
                            {dollars(trade.netPnl)}
                          </td>
                          <td>{trade.returnOnRisk.toFixed(2)}R</td>
                          <td>{trade.exitReason.replaceAll("_", " ")}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState
                  icon={<CandlestickChart size={23} />}
                  title="No completed signals in this run"
                  body="The selected averages did not create a complete crossover trade in this dataset. Change one assumption deliberately or choose a wider sample—do not optimize until the past looks perfect."
                />
              )}
            </div>
          </section>
          <div className="chart-method-note section-gap">
            <ShieldAlert size={18} />
            <div>
              <strong>Transparent method</strong>
              <p>
                Signals use closing data and execute at the next bar’s open.
                Position size is rounded down from maximum risk and available
                simulated cash. If a single bar touches both stop and target,
                the stop is assumed to occur first.
              </p>
            </div>
          </div>
        </>
      ) : null}

      {deleteTarget ? (
        <Modal
          title="Remove historical dataset?"
          description={`${deleteTarget.name} and its ${deleteTarget.bars.length.toLocaleString()} locally stored bars will be removed.${deleteTarget.sourceType === "provider" ? " Its matching provider-bound refresh subscription will also stop." : ""} Journal trades are not affected.`}
          onClose={() => setDeleteTarget(null)}
        >
          <div className="form-actions">
            <button
              className="button secondary"
              onClick={() => setDeleteTarget(null)}
            >
              Keep dataset
            </button>
            <button
              className="button danger"
              onClick={() => {
                removeMarketDataSet(deleteTarget.id);
                if (deleteTarget.sourceType === "provider") {
                  const target = {
                    provider:
                      deleteTarget.provider ?? ("alpha_vantage" as const),
                    symbol: deleteTarget.symbol,
                    interval:
                      deleteTarget.timeframe === "1m"
                        ? ("1min" as const)
                        : ("daily" as const),
                  };
                  updateChartAcquisition({
                    ...acquisition,
                    subscriptions: removeAcquisitionSubscription(
                      acquisition.subscriptions,
                      target,
                    ),
                  });
                }
                setDeleteTarget(null);
                setImportMessage(
                  "Historical dataset removed. Journal trades were left unchanged.",
                );
              }}
            >
              <Trash2 size={16} />
              Remove dataset
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
