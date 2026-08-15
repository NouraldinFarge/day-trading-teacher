import { useMemo, useState, type CSSProperties } from "react";
import {
  BarChart3,
  BrainCircuit,
  CalendarRange,
  Lightbulb,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { dollars } from "../../domain/calculations";
import {
  generatedInsights,
  performanceBreakdown,
  periodSummary,
  tailRiskAudit,
  tradesInRange,
  type BreakdownDimension,
} from "../../domain/journal-analytics";
import type { Profile, Trade } from "../../domain/types";

const dimensions: Array<{ id: BreakdownDimension; label: string }> = [
  { id: "symbol", label: "Asset" },
  { id: "strategy", label: "Strategy" },
  { id: "setup", label: "Setup" },
  { id: "direction", label: "Direction" },
  { id: "session", label: "Session" },
  { id: "weekday", label: "Weekday" },
  { id: "time", label: "Time" },
];

export function JournalInsights({
  trades,
  profile,
}: {
  trades: Trade[];
  profile: Profile;
}) {
  const [dimension, setDimension] = useState<BreakdownDimension>("symbol");
  const [outcome, setOutcome] = useState<"all" | "wins" | "losses">("all");
  const startingBalance = Number(profile.startingBalance) || 10_000;
  const filtered = useMemo(
    () =>
      trades.filter(
        (trade) =>
          outcome === "all" ||
          (outcome === "wins" && Number(trade.netPnl) > 0) ||
          (outcome === "losses" && Number(trade.netPnl) < 0),
      ),
    [trades, outcome],
  );
  const rows = useMemo(
    () => performanceBreakdown(filtered, dimension),
    [filtered, dimension],
  );
  const maxAbs = Math.max(1, ...rows.map((row) => Math.abs(row.pnl)));
  const week = periodSummary(
    tradesInRange(trades, "week"),
    "This week",
    startingBalance,
  );
  const month = periodSummary(
    tradesInRange(trades, "month"),
    "Last 31 days",
    startingBalance,
  );
  const insights = generatedInsights(trades, startingBalance);
  const tails = tailRiskAudit(trades);

  return (
    <div className="journal-insights-page">
      <section className="summary-pair">
        <article className="card period-summary">
          <div>
            <CalendarRange size={19} />
            <span>{week.label}</span>
          </div>
          <strong>{week.headline}</strong>
          <p>
            {week.metrics.reflectionRate.toFixed(0)}% reflected ·{" "}
            {week.metrics.planCoverage.toFixed(0)}% linked to plans ·{" "}
            {dollars(week.metrics.maximumDrawdown)} max drawdown
          </p>
        </article>
        <article className="card period-summary">
          <div>
            <CalendarRange size={19} />
            <span>{month.label}</span>
          </div>
          <strong>{month.headline}</strong>
          <p>
            {month.metrics.reflectionRate.toFixed(0)}% reflected ·{" "}
            {month.metrics.planCoverage.toFixed(0)}% linked to plans ·{" "}
            {dollars(month.metrics.maximumDrawdown)} max drawdown
          </p>
        </article>
      </section>
      <section className="card section-gap">
        <div className="card-header">
          <div>
            <h2>Performance breakdown</h2>
            <p>Compare where results and process evidence differ</p>
          </div>
          <BarChart3 size={19} />
        </div>
        <div className="card-body">
          <div className="breakdown-toolbar">
            <div
              className="segmented-control dimension-tabs"
              role="group"
              aria-label="Breakdown dimension"
            >
              {dimensions.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={dimension === item.id ? "active" : ""}
                  aria-pressed={dimension === item.id}
                  onClick={() => setDimension(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <label>
              <span className="sr-only">Filter breakdown by outcome</span>
              <select
                value={outcome}
                onChange={(event) =>
                  setOutcome(event.target.value as typeof outcome)
                }
              >
                <option value="all">All outcomes</option>
                <option value="wins">Profitable only</option>
                <option value="losses">Losing only</option>
              </select>
            </label>
          </div>
          {rows.length ? (
            <div
              className="breakdown-table"
              role="table"
              aria-label={`Performance by ${dimension}`}
            >
              <div className="breakdown-header" role="row">
                <span role="columnheader">Group</span>
                <span role="columnheader">Trades</span>
                <span role="columnheader">Win rate</span>
                <span role="columnheader">Expectancy</span>
                <span role="columnheader">Net P&amp;L</span>
              </div>
              {rows.map((row) => (
                <div className="breakdown-row" role="row" key={row.key}>
                  <div role="cell">
                    <strong>{row.key}</strong>
                    <span
                      className={`breakdown-bar ${row.pnl >= 0 ? "positive" : "negative"}`}
                      style={
                        {
                          "--breakdown-width": `${(Math.abs(row.pnl) / maxAbs) * 100}%`,
                        } as CSSProperties
                      }
                    />
                  </div>
                  <span role="cell">{row.trades}</span>
                  <span role="cell">{row.winRate.toFixed(0)}%</span>
                  <span role="cell">{dollars(row.expectancy)}</span>
                  <strong
                    role="cell"
                    className={row.pnl >= 0 ? "positive-text" : "negative-text"}
                  >
                    {dollars(row.pnl)}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="compact-empty">
              <BarChart3 size={24} />
              <strong>No comparable groups</strong>
              <p>
                Add strategy and setup labels in journal reflections to unlock
                richer comparisons.
              </p>
            </div>
          )}
        </div>
      </section>
      <section className="card section-gap tail-audit-card">
        <div className="card-header">
          <div>
            <h2>Tail and outlier audit</h2>
            <p>Test whether the average depends on one unusual result</p>
          </div>
          <ShieldAlert size={19} />
        </div>
        <div className="card-body">
          <div className={`tail-audit-status ${tails.status}`}>
            <span>
              {tails.status === "insufficient"
                ? "Early sample"
                : tails.status === "fragile"
                  ? "Concentrated outcomes"
                  : "No dominant tail detected"}
            </span>
            <strong>{tails.sampleSize} recorded trades</strong>
          </div>
          <div className="tail-audit-metrics">
            <div>
              <span>Largest win / gross profit</span>
              <strong>{dollars(tails.largestWin)}</strong>
              <small>{tails.largestWinShareOfGrossProfit.toFixed(0)}%</small>
            </div>
            <div>
              <span>Largest loss / gross loss</span>
              <strong>{dollars(tails.largestLoss)}</strong>
              <small>{tails.largestLossShareOfGrossLoss.toFixed(0)}%</small>
            </div>
            <div>
              <span>Wins to recover largest loss</span>
              <strong>
                {tails.recoveryWinsNeeded === null
                  ? "Not scorable"
                  : tails.recoveryWinsNeeded.toFixed(1)}
              </strong>
              <small>Using the recorded average win</small>
            </div>
            <div>
              <span>Median result</span>
              <strong>{dollars(tails.medianPnl)}</strong>
              <small>Less sensitive to one extreme result</small>
            </div>
            <div>
              <span>Core net P&amp;L</span>
              <strong>{dollars(tails.coreNetPnl)}</strong>
              <small>After one largest win and loss are removed</small>
            </div>
          </div>
          <ul className="tail-audit-reasons">
            {tails.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <p className="analysis-boundary">
            This is a descriptive stress test of recorded outcomes, not proof of
            a strategy, a forecast, or advice to place more trades.
          </p>
        </div>
      </section>
      <section className="journal-overview-grid section-gap">
        <article className="card">
          <div className="card-header">
            <div>
              <h2>Pattern recommendations</h2>
              <p>Personalized from your local journal evidence</p>
            </div>
            <BrainCircuit size={19} />
          </div>
          <div className="card-body insight-stack">
            {insights.map((insight) => (
              <div
                className={`recommendation-card ${insight.tone}`}
                key={insight.title}
              >
                {insight.tone === "attention" ? (
                  <ShieldAlert size={17} />
                ) : insight.tone === "positive" ? (
                  <Sparkles size={17} />
                ) : (
                  <Lightbulb size={17} />
                )}
                <div>
                  <strong>{insight.title}</strong>
                  <p>{insight.body}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
        <article className="card">
          <div className="card-header">
            <div>
              <h2>Data quality</h2>
              <p>What the current analysis can support</p>
            </div>
          </div>
          <div className="card-body data-quality-list">
            <div>
              <span>Recorded sample</span>
              <strong>
                {trades.length < 20
                  ? "Early"
                  : trades.length < 50
                    ? "Developing"
                    : "Established"}
              </strong>
            </div>
            <div>
              <span>Classified strategies</span>
              <strong>
                {trades.filter((trade) => trade.journal?.strategy).length}/
                {trades.length}
              </strong>
            </div>
            <div>
              <span>Named setups</span>
              <strong>
                {trades.filter((trade) => trade.journal?.setup).length}/
                {trades.length}
              </strong>
            </div>
            <div>
              <span>Emotion captured</span>
              <strong>
                {trades.filter((trade) => trade.journal?.emotionBefore).length}/
                {trades.length}
              </strong>
            </div>
            <p className="analysis-boundary">
              Insights summarize recorded history. They do not predict future
              performance or recommend trades.
            </p>
          </div>
        </article>
      </section>
    </div>
  );
}
