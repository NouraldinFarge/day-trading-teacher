import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  ChartNoAxesCombined,
  CircleDollarSign,
  Gauge,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";
import { dollars } from "../../domain/calculations";
import {
  generatedInsights,
  performanceMetrics,
  performanceSeries,
  tradesInRange,
  type JournalRange,
} from "../../domain/journal-analytics";
import type {
  JournalDashboardPreferences,
  Profile,
  Trade,
} from "../../domain/types";
import { MetricCard } from "../../components/MetricCard";
import { PerformanceChart, type ChartMetric } from "./PerformanceChart";

const ranges: Array<{ id: JournalRange; label: string }> = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "quarter", label: "Quarter" },
  { id: "year", label: "Year" },
  { id: "all", label: "All" },
];
const chartMetrics: Array<{ id: ChartMetric; label: string }> = [
  { id: "equity", label: "Equity" },
  { id: "pnl", label: "P&L" },
  { id: "drawdown", label: "Drawdown" },
  { id: "returns", label: "Returns" },
  { id: "winRate", label: "Win rate" },
];

export function JournalDashboard({
  trades,
  profile,
  preferences,
  onPreferences,
  onOpenTrade,
  onNavigate,
}: {
  trades: Trade[];
  profile: Profile;
  preferences: JournalDashboardPreferences;
  onPreferences(preferences: JournalDashboardPreferences): void;
  onOpenTrade(trade: Trade): void;
  onNavigate(tab: "trades" | "calendar" | "insights" | "goals"): void;
}) {
  const [chartMetric, setChartMetric] = useState<ChartMetric>("equity");
  const [customizing, setCustomizing] = useState(false);
  const range = preferences.defaultRange;
  const startingBalance = Number(profile.startingBalance) || 10_000;
  const filtered = useMemo(() => tradesInRange(trades, range), [trades, range]);
  const metrics = useMemo(
    () => performanceMetrics(filtered, startingBalance),
    [filtered, startingBalance],
  );
  const series = useMemo(
    () => performanceSeries(filtered, range, startingBalance),
    [filtered, range, startingBalance],
  );
  const insights = useMemo(
    () => generatedInsights(filtered, startingBalance),
    [filtered, startingBalance],
  );
  const bestTrade = [...filtered].sort(
    (left, right) => Number(right.netPnl) - Number(left.netPnl),
  )[0];
  const longestReflectionStreak = (() => {
    const dates = [
      ...new Set(
        trades
          .filter((trade) => trade.journal?.status === "reviewed")
          .map((trade) =>
            new Date(trade.journal!.reviewedAt ?? trade.occurredAt)
              .toISOString()
              .slice(0, 10),
          ),
      ),
    ].sort();
    let best = 0;
    let current = 0;
    let previous = "";
    dates.forEach((date) => {
      const prior = new Date(`${date}T12:00:00`);
      prior.setDate(prior.getDate() - 1);
      current = previous === prior.toISOString().slice(0, 10) ? current + 1 : 1;
      best = Math.max(best, current);
      previous = date;
    });
    return best;
  })();

  const widgets = preferences.visibleWidgets ?? [
    "performance",
    "insights",
    "records",
    "activity",
  ];
  const toggleWidget = (widget: (typeof widgets)[number]) =>
    onPreferences({
      ...preferences,
      visibleWidgets: widgets.includes(widget)
        ? widgets.filter((item) => item !== widget)
        : [...widgets, widget],
    });
  return (
    <div
      className={`journal-dashboard ${preferences.compactCards ? "compact-dashboard" : ""}`}
    >
      <div className="journal-control-row">
        <div
          className="segmented-control"
          role="group"
          aria-label="Performance time range"
        >
          {ranges.map((option) => (
            <button
              key={option.id}
              type="button"
              className={range === option.id ? "active" : ""}
              aria-pressed={range === option.id}
              onClick={() =>
                onPreferences({ ...preferences, defaultRange: option.id })
              }
            >
              {option.label}
            </button>
          ))}
        </div>
        <span>
          {filtered.length} recorded trade{filtered.length === 1 ? "" : "s"} in
          view
        </span>
        <button
          className="button secondary compact"
          onClick={() => setCustomizing((value) => !value)}
        >
          <Settings2 size={15} />
          Customize
        </button>
      </div>
      {customizing ? (
        <div className="dashboard-customizer">
          <strong>Dashboard widgets</strong>
          {(["performance", "insights", "records", "activity"] as const).map(
            (widget) => (
              <label key={widget}>
                <input
                  type="checkbox"
                  checked={widgets.includes(widget)}
                  onChange={() => toggleWidget(widget)}
                />
                {widget[0].toUpperCase() + widget.slice(1)}
              </label>
            ),
          )}
          <label>
            <input
              type="checkbox"
              checked={preferences.compactCards}
              onChange={(event) =>
                onPreferences({
                  ...preferences,
                  compactCards: event.target.checked,
                })
              }
            />
            Compact spacing
          </label>
        </div>
      ) : null}
      <div className="metrics-grid journal-kpis">
        <MetricCard
          label="Net P&L"
          value={dollars(metrics.netPnl.toFixed(2))}
          note={`${metrics.cumulativeReturn >= 0 ? "+" : ""}${metrics.cumulativeReturn.toFixed(2)}% cumulative return`}
          icon={<CircleDollarSign size={19} />}
          tone={metrics.netPnl >= 0 ? "positive" : "warning"}
        />
        <MetricCard
          label="Win rate"
          value={`${metrics.winRate.toFixed(0)}%`}
          note={`${metrics.tradeCount} trade sample`}
          icon={<Gauge size={19} />}
        />
        <MetricCard
          label="Expectancy"
          value={dollars(metrics.expectancy.toFixed(2))}
          note="Average per recorded trade"
          icon={<Activity size={19} />}
          tone={metrics.expectancy >= 0 ? "positive" : "warning"}
        />
        <MetricCard
          label="Maximum drawdown"
          value={dollars(metrics.maximumDrawdown.toFixed(2))}
          note="Recorded peak-to-trough"
          icon={<ChartNoAxesCombined size={19} />}
          tone="warning"
        />
      </div>
      {widgets.includes("performance") ? (
        <section className="card performance-stage">
          <div className="card-header">
            <div>
              <h2>Performance explorer</h2>
              <p>
                Outcome and process data, calculated only from recorded trades
              </p>
            </div>
            <div
              className="chart-metric-tabs"
              role="group"
              aria-label="Chart metric"
            >
              {chartMetrics.map((option) => (
                <button
                  key={option.id}
                  className={chartMetric === option.id ? "active" : ""}
                  aria-pressed={chartMetric === option.id}
                  onClick={() => setChartMetric(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="card-body">
            <PerformanceChart points={series} metric={chartMetric} />
            <div className="analytics-strip">
              <div>
                <span>Realized reward:risk</span>
                <strong>
                  {metrics.realizedRiskReward === null
                    ? "—"
                    : `${metrics.realizedRiskReward.toFixed(2)}:1`}
                </strong>
              </div>
              <div>
                <span>Profit factor</span>
                <strong>
                  {metrics.profitFactor === null
                    ? "—"
                    : metrics.profitFactor.toFixed(2)}
                </strong>
              </div>
              <div>
                <span>Plan coverage</span>
                <strong>{metrics.planCoverage.toFixed(0)}%</strong>
              </div>
              <div>
                <span>Rule adherence</span>
                <strong>{metrics.ruleAdherence.toFixed(0)}%</strong>
              </div>
            </div>
          </div>
        </section>
      ) : null}
      <div className="journal-overview-grid section-gap">
        {widgets.includes("insights") ? (
          <section className="card insight-stack">
            <div className="card-header">
              <div>
                <h2>What the evidence suggests</h2>
                <p>
                  Deterministic observations—not predictions or trade signals
                </p>
              </div>
              <Sparkles size={19} />
            </div>
            <div className="card-body">
              {insights.map((insight) => (
                <article
                  className={`insight-row ${insight.tone}`}
                  key={insight.title}
                >
                  <span aria-hidden="true" />
                  <div>
                    <strong>{insight.title}</strong>
                    <p>{insight.body}</p>
                  </div>
                </article>
              ))}
              <button
                className="text-button"
                onClick={() => onNavigate("insights")}
              >
                Open full analysis <ArrowRight size={14} />
              </button>
            </div>
          </section>
        ) : null}
        {widgets.includes("records") ? (
          <section className="card">
            <div className="card-header">
              <div>
                <h2>Personal records</h2>
                <p>Records describe evidence; they are never targets</p>
              </div>
              <Trophy size={19} />
            </div>
            <div className="card-body record-board">
              <div>
                <span>Best recorded result</span>
                <strong>{bestTrade ? dollars(bestTrade.netPnl) : "—"}</strong>
                <small>{bestTrade?.symbol ?? "No sample"}</small>
              </div>
              <div>
                <span>Reflection rhythm</span>
                <strong>
                  {longestReflectionStreak} day
                  {longestReflectionStreak === 1 ? "" : "s"}
                </strong>
                <small>Longest completed-journal streak</small>
              </div>
              <div>
                <span>Journal coverage</span>
                <strong>{metrics.reflectionRate.toFixed(0)}%</strong>
                <small>Reflection, not trade frequency</small>
              </div>
            </div>
          </section>
        ) : null}
      </div>
      {widgets.includes("activity") ? (
        <section className="card section-gap">
          <div className="card-header">
            <div>
              <h2>Recent activity</h2>
              <p>Trades and reflections in one learning timeline</p>
            </div>
            <CalendarDays size={19} />
          </div>
          <div className="card-body activity-feed">
            {trades.length ? (
              [...trades]
                .sort(
                  (a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt),
                )
                .slice(0, 8)
                .map((trade) => (
                  <button
                    key={trade.id}
                    className="activity-feed-row"
                    onClick={() => onOpenTrade(trade)}
                  >
                    <span
                      className={
                        Number(trade.netPnl) >= 0
                          ? "event-dot positive"
                          : "event-dot negative"
                      }
                    />
                    <div>
                      <strong>
                        {trade.symbol} {trade.side} · {dollars(trade.netPnl)}
                      </strong>
                      <small>
                        {new Date(trade.occurredAt).toLocaleString()} ·{" "}
                        {trade.journal?.status === "reviewed"
                          ? "Reflection complete"
                          : "Reflection needed"}
                      </small>
                    </div>
                    <span>
                      {trade.journal?.status === "reviewed" ? (
                        <BookOpenCheck size={16} />
                      ) : (
                        <ShieldCheck size={16} />
                      )}
                    </span>
                  </button>
                ))
            ) : (
              <div className="compact-empty">
                <ChartNoAxesCombined size={24} />
                <strong>No activity yet</strong>
                <p>Import completed trades or add one manually to begin.</p>
                <button
                  className="button primary"
                  onClick={() => onNavigate("trades")}
                >
                  Open trade log
                </button>
              </div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
