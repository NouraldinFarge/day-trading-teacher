import { useMemo, useState } from "react";
import { ArrowRight, ChartCandlestick, Eye, EyeOff } from "lucide-react";
import {
  evaluateContextDecision,
  patternContextScenarios,
  type ContextDecision,
  type PatternPracticeBar,
} from "../../../domain/pattern-context";

const decisions: Array<{ id: ContextDecision; label: string; note: string }> = [
  {
    id: "plan_replay",
    label: "Plan the replay",
    note: "Evidence is complete enough to lock a practice decision",
  },
  {
    id: "wait",
    label: "Wait for evidence",
    note: "The idea remains unresolved or not scorable",
  },
  {
    id: "no_trade",
    label: "No trade",
    note: "A written boundary or disqualifier already failed",
  },
];

function MiniContextChart({
  bars,
  visibleBars,
  revealed,
}: {
  bars: PatternPracticeBar[];
  visibleBars: number;
  revealed: boolean;
}) {
  const plotted = bars.slice(0, revealed ? bars.length : visibleBars);
  const width = 760;
  const height = 330;
  const priceTop = 20;
  const priceBottom = 245;
  const volumeTop = 266;
  const volumeBottom = 318;
  const low = Math.min(...bars.map((bar) => bar.low));
  const high = Math.max(...bars.map((bar) => bar.high));
  const range = Math.max(0.01, high - low);
  const maxVolume = Math.max(...bars.map((bar) => bar.volume));
  const step = width / Math.max(12, bars.length + 1);
  const x = (index: number) => step * (index + 1);
  const y = (price: number) =>
    priceTop + ((high - price) / range) * (priceBottom - priceTop);

  return (
    <svg
      className="context-mini-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${plotted.length} synthetic candles. ${revealed ? "Later bars revealed." : `${bars.length - visibleBars} later bars hidden.`}`}
    >
      <rect
        width={width}
        height={height}
        rx={18}
        className="context-chart-bg"
      />
      {[0.25, 0.5, 0.75].map((fraction) => (
        <line
          key={fraction}
          x1={0}
          x2={width}
          y1={priceTop + (priceBottom - priceTop) * fraction}
          y2={priceTop + (priceBottom - priceTop) * fraction}
          className="context-chart-grid"
        />
      ))}
      {plotted.map((bar, index) => {
        const rising = bar.close >= bar.open;
        const bodyTop = Math.min(y(bar.open), y(bar.close));
        const bodyHeight = Math.max(3, Math.abs(y(bar.open) - y(bar.close)));
        const candleWidth = Math.max(7, Math.min(18, step * 0.52));
        const volumeHeight =
          (bar.volume / maxVolume) * (volumeBottom - volumeTop);
        return (
          <g
            key={index}
            className={
              rising ? "context-candle rising" : "context-candle falling"
            }
          >
            <line
              x1={x(index)}
              x2={x(index)}
              y1={y(bar.high)}
              y2={y(bar.low)}
            />
            <rect
              x={x(index) - candleWidth / 2}
              y={bodyTop}
              width={candleWidth}
              height={bodyHeight}
              rx={2}
            />
            <rect
              className="context-volume"
              x={x(index) - candleWidth / 2}
              y={volumeBottom - volumeHeight}
              width={candleWidth}
              height={volumeHeight}
              rx={2}
            />
          </g>
        );
      })}
      {!revealed ? (
        <g className="context-hidden-zone">
          <rect
            x={x(visibleBars) - step / 2}
            y={priceTop}
            width={width - (x(visibleBars) - step / 2)}
            height={volumeBottom - priceTop}
            rx={14}
          />
          <text x={x(visibleBars) + 12} y={priceTop + 30}>
            OUTCOME HIDDEN
          </text>
        </g>
      ) : null}
      <text x={12} y={volumeTop + 13} className="context-chart-label">
        SYNTHETIC VOLUME
      </text>
    </svg>
  );
}

export function ContextReadingLab({ onPractice }: { onPractice(): void }) {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [choice, setChoice] = useState<ContextDecision | null>(null);
  const [revealed, setRevealed] = useState(false);
  const scenario = patternContextScenarios[scenarioIndex];
  const result = useMemo(
    () => (choice ? evaluateContextDecision(scenario.id, choice) : null),
    [choice, scenario.id],
  );

  const decide = (decision: ContextDecision) => {
    if (choice) return;
    setChoice(decision);
    onPractice();
  };

  const next = () => {
    setScenarioIndex(
      (current) => (current + 1) % patternContextScenarios.length,
    );
    setChoice(null);
    setRevealed(false);
  };

  return (
    <section className="card learning-tool-card context-reading-lab">
      <div className="card-header">
        <div>
          <span className="eyebrow accent">Incomplete-chart practice</span>
          <h2>Read context without guessing the next candle</h2>
          <p>
            Decide whether the evidence earns a replay plan, requires waiting,
            or fails the gate. Later synthetic bars stay hidden until you
            commit.
          </p>
        </div>
        <ChartCandlestick size={22} />
      </div>

      <div className="context-scenario-heading">
        <span>
          Case {scenarioIndex + 1} of {patternContextScenarios.length}
        </span>
        <h3>{scenario.title}</h3>
        <p>{scenario.brief}</p>
      </div>

      <MiniContextChart
        bars={scenario.bars}
        visibleBars={scenario.visibleBars}
        revealed={revealed}
      />

      <div className="context-evidence-grid">
        <div>
          <strong>Visible evidence</strong>
          <ul>
            {scenario.evidence.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <strong>Still unknown</strong>
          <ul>
            {scenario.unknowns.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <fieldset className="context-decision-grid">
        <legend>What should happen next in the learning workflow?</legend>
        {decisions.map((decision) => (
          <button
            type="button"
            key={decision.id}
            className={choice === decision.id ? "active" : ""}
            aria-pressed={choice === decision.id}
            disabled={Boolean(choice)}
            onClick={() => decide(decision.id)}
          >
            <strong>{decision.label}</strong>
            <small>{decision.note}</small>
          </button>
        ))}
      </fieldset>

      {result ? (
        <div
          className={`context-result ${result.aligned ? "aligned" : "repair"}`}
          aria-live="polite"
        >
          <strong>
            {result.aligned ? "Process aligned" : "Repair the decision order"}
          </strong>
          <p>{result.explanation}</p>
          <p>
            <b>Transfer:</b> {result.transfer}
          </p>
          <div>
            <button
              type="button"
              className="button secondary"
              onClick={() => setRevealed((value) => !value)}
            >
              {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
              {revealed ? "Hide later bars" : "Reveal later bars"}
            </button>
            <button type="button" className="button primary" onClick={next}>
              Next unseen case <ArrowRight size={16} />
            </button>
          </div>
        </div>
      ) : (
        <p className="analysis-boundary">
          Your answer is graded against the evidence policy, not whether the
          next synthetic candle rises or falls.
        </p>
      )}
    </section>
  );
}
