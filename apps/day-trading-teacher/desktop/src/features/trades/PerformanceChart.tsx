import { useState } from "react";
import type { PerformancePoint } from "../../domain/journal-analytics";

export type ChartMetric = "pnl" | "equity" | "drawdown" | "returns" | "winRate";

const labels: Record<ChartMetric, string> = {
  pnl: "Period P&L",
  equity: "Equity curve",
  drawdown: "Drawdown",
  returns: "Cumulative return",
  winRate: "Rolling win rate",
};

function valueFor(point: PerformancePoint, metric: ChartMetric) {
  if (metric === "pnl") return point.pnl;
  if (metric === "equity") return point.equity;
  if (metric === "drawdown") return -point.drawdown;
  if (metric === "returns") return point.cumulativeReturn;
  return point.winRate;
}

function formatValue(value: number, metric: ChartMetric) {
  if (metric === "returns" || metric === "winRate")
    return `${value.toFixed(1)}%`;
  if (metric === "equity") return `$${value.toFixed(2)}`;
  return `${value < 0 ? "−" : value > 0 ? "+" : ""}$${Math.abs(value).toFixed(2)}`;
}

export function PerformanceChart({
  points,
  metric,
}: {
  points: PerformancePoint[];
  metric: ChartMetric;
}) {
  const [active, setActive] = useState<number | null>(null);
  const width = 820;
  const height = 280;
  const margin = { top: 22, right: 22, bottom: 42, left: 62 };
  const values = points.map((point) => valueFor(point, metric));
  const rawMinimum = Math.min(...values);
  const rawMaximum = Math.max(...values);
  const equityPadding = Math.max(
    1,
    (rawMaximum - rawMinimum) * 0.1,
    Math.abs(rawMaximum) * 0.002,
  );
  const minimum =
    metric === "equity" ? rawMinimum - equityPadding : Math.min(0, ...values);
  const maximum =
    metric === "equity"
      ? rawMaximum + equityPadding
      : Math.max(metric === "winRate" ? 100 : 0, ...values);
  const span = Math.max(1, maximum - minimum);
  const x = (index: number) =>
    margin.left +
    (points.length <= 1
      ? (width - margin.left - margin.right) / 2
      : (index / (points.length - 1)) * (width - margin.left - margin.right));
  const y = (value: number) =>
    margin.top +
    ((maximum - value) / span) * (height - margin.top - margin.bottom);
  const zeroY = y(0);
  const areaBaseY = metric === "equity" ? height - margin.bottom : zeroY;
  const linePath = points
    .map(
      (point, index) =>
        `${index ? "L" : "M"}${x(index).toFixed(1)},${y(valueFor(point, metric)).toFixed(1)}`,
    )
    .join(" ");
  const selected = active === null ? points.at(-1) : points[active];
  const selectedValue = selected ? valueFor(selected, metric) : 0;

  if (!points.length)
    return (
      <div className="chart-empty">
        <span aria-hidden="true">⌁</span>
        <strong>No chartable trades in this range</strong>
        <p>Choose another time range or import completed trades.</p>
      </div>
    );

  return (
    <div className="performance-chart-wrap">
      <div className="chart-current" aria-live="polite">
        <span>{selected?.label}</span>
        <strong>{formatValue(selectedValue, metric)}</strong>
        <small>
          {selected?.tradeCount} trade{selected?.tradeCount === 1 ? "" : "s"} ·{" "}
          {selected?.winRate.toFixed(0)}% win rate
        </small>
      </div>
      <svg
        className="performance-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${labels[metric]} chart with ${points.length} periods`}
      >
        <title>{labels[metric]}</title>
        <desc>
          Interactive local performance history. Use Tab to inspect individual
          periods.
        </desc>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const value = maximum - span * ratio;
          const rowY = y(value);
          return (
            <g key={ratio}>
              <line
                x1={margin.left}
                x2={width - margin.right}
                y1={rowY}
                y2={rowY}
                className="chart-gridline"
              />
              <text
                x={margin.left - 10}
                y={rowY + 4}
                textAnchor="end"
                className="chart-axis-label"
              >
                {metric === "winRate" || metric === "returns"
                  ? `${value.toFixed(0)}%`
                  : `$${Math.abs(value).toFixed(0)}`}
              </text>
            </g>
          );
        })}
        {metric === "pnl" ? (
          points.map((point, index) => {
            const value = point.pnl;
            const barWidth = Math.max(
              5,
              Math.min(
                30,
                ((width - margin.left - margin.right) / points.length) * 0.62,
              ),
            );
            const top = Math.min(y(value), zeroY);
            return (
              <rect
                key={point.key}
                x={x(index) - barWidth / 2}
                y={top}
                width={barWidth}
                height={Math.max(2, Math.abs(y(value) - zeroY))}
                rx="3"
                className={
                  value >= 0 ? "chart-bar positive" : "chart-bar negative"
                }
                tabIndex={0}
                aria-label={`${point.label}: ${formatValue(value, metric)}, ${point.tradeCount} trades`}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
              />
            );
          })
        ) : (
          <>
            <path
              d={`${linePath} L${x(points.length - 1)},${areaBaseY} L${x(0)},${areaBaseY} Z`}
              className={`chart-area ${metric}`}
            />
            <path d={linePath} className={`chart-line ${metric}`} />
            {points.map((point, index) => (
              <circle
                key={point.key}
                cx={x(index)}
                cy={y(valueFor(point, metric))}
                r={active === index ? 6 : 3.5}
                className="chart-point"
                tabIndex={0}
                aria-label={`${point.label}: ${formatValue(valueFor(point, metric), metric)}, ${point.tradeCount} trades`}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
              />
            ))}
          </>
        )}
        {points.map((point, index) =>
          index === 0 ||
          index === points.length - 1 ||
          index % Math.max(1, Math.ceil(points.length / 6)) === 0 ? (
            <text
              key={point.key}
              x={x(index)}
              y={height - 15}
              textAnchor={
                index === 0
                  ? "start"
                  : index === points.length - 1
                    ? "end"
                    : "middle"
              }
              className="chart-axis-label"
            >
              {point.label}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}
