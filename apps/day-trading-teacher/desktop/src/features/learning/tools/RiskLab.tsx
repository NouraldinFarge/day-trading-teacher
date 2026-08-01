import { useState, type FormEvent } from "react";
import { Calculator, CheckCircle2, RotateCcw, ShieldCheck } from "lucide-react";
import { calculatePositionSize, dollars } from "../../../domain/calculations";
import { calculateRewardRisk } from "../../../domain/learning-tools";
import type { TradeSide } from "../../../domain/types";

type RiskResult = ReturnType<typeof calculatePositionSize> & {
  rewardPerUnit: number;
  rewardRiskRatio: number;
};

export function RiskLab({ onPractice }: { onPractice(): void }) {
  const [side, setSide] = useState<TradeSide>("long");
  const [entry, setEntry] = useState("100");
  const [stop, setStop] = useState("99.50");
  const [target, setTarget] = useState("101");
  const [maximumRisk, setMaximumRisk] = useState("25");
  const [slippage, setSlippage] = useState("0.02");
  const [result, setResult] = useState<RiskResult | null>(null);
  const [error, setError] = useState("");
  const [recorded, setRecorded] = useState(false);

  const invalidate = () => {
    setResult(null);
    setError("");
    setRecorded(false);
  };

  const calculate = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      const position = calculatePositionSize({
        entry,
        stop,
        maximum_risk: maximumRisk,
        slippage_per_unit: slippage,
        side,
      });
      const rewardRisk = calculateRewardRisk({
        entry: Number(entry),
        stop: Number(stop),
        target: Number(target),
        side,
      });
      setResult({
        ...position,
        rewardPerUnit: rewardRisk.rewardPerUnit,
        rewardRiskRatio: rewardRisk.rewardRiskRatio,
      });
    } catch (reason) {
      setResult(null);
      setError(
        reason instanceof Error
          ? reason.message
          : "The example could not be calculated.",
      );
    }
  };

  const record = () => {
    if (!result || recorded) return;
    onPractice();
    setRecorded(true);
  };

  return (
    <section aria-labelledby="risk-lab-title" className="learning-tool-panel">
      <header className="tool-panel-header">
        <span className="tool-panel-icon">
          <Calculator size={21} />
        </span>
        <div>
          <span className="eyebrow accent">Risk sandbox</span>
          <h2 id="risk-lab-title">Size from invalidation—not conviction</h2>
          <p>
            Change one assumption at a time and see how stop distance, friction,
            and the loss boundary constrain quantity.
          </p>
        </div>
      </header>

      <div className="tool-workspace-grid">
        <form className="tool-form" onSubmit={calculate} noValidate>
          <label>
            Example direction
            <select
              value={side}
              onChange={(event) => {
                setSide(event.target.value as TradeSide);
                invalidate();
              }}
            >
              <option value="long">Long example</option>
              <option value="short">Short example</option>
            </select>
          </label>
          <div className="form-grid two">
            <label>
              Entry
              <input
                inputMode="decimal"
                value={entry}
                onChange={(event) => {
                  setEntry(event.target.value);
                  invalidate();
                }}
              />
            </label>
            <label>
              Evidence-based stop
              <input
                inputMode="decimal"
                value={stop}
                onChange={(event) => {
                  setStop(event.target.value);
                  invalidate();
                }}
              />
            </label>
            <label>
              Example target
              <input
                inputMode="decimal"
                value={target}
                onChange={(event) => {
                  setTarget(event.target.value);
                  invalidate();
                }}
              />
            </label>
            <label>
              Maximum planned loss
              <input
                inputMode="decimal"
                value={maximumRisk}
                onChange={(event) => {
                  setMaximumRisk(event.target.value);
                  invalidate();
                }}
              />
            </label>
          </div>
          <label>
            Estimated slippage per share
            <input
              inputMode="decimal"
              value={slippage}
              onChange={(event) => {
                setSlippage(event.target.value);
                invalidate();
              }}
            />
          </label>
          {error ? (
            <div className="error-message" role="alert">
              {error}
            </div>
          ) : null}
          <button className="button primary" type="submit">
            <Calculator size={16} />
            Calculate the constraint
          </button>
        </form>

        <div className="tool-result" aria-live="polite">
          {result ? (
            <>
              <div className="tool-result-heading">
                <span>
                  <ShieldCheck size={18} />
                </span>
                <div>
                  <small>Maximum quantity</small>
                  <strong>{result.quantity} shares</strong>
                </div>
              </div>
              <dl className="tool-result-list">
                <div>
                  <dt>Technical risk/share</dt>
                  <dd>{dollars(result.technical_risk_per_unit)}</dd>
                </div>
                <div>
                  <dt>Risk with friction</dt>
                  <dd>{dollars(result.risk_per_unit)}</dd>
                </div>
                <div>
                  <dt>Planned loss at size</dt>
                  <dd>{dollars(result.planned_risk)}</dd>
                </div>
                <div>
                  <dt>Reward/risk example</dt>
                  <dd>{result.rewardRiskRatio.toFixed(2)}R</dd>
                </div>
              </dl>
              <p className="tool-explanation">
                Quantity rounds down because exceeding the boundary is not an
                acceptable rounding error. The target does not change the
                maximum loss or position size.
              </p>
              <button
                className="button secondary"
                type="button"
                disabled={recorded}
                onClick={record}
              >
                <CheckCircle2 size={16} />
                {recorded ? "Practice recorded" : "Record this practice"}
              </button>
            </>
          ) : (
            <div className="tool-placeholder">
              <RotateCcw size={24} />
              <strong>Build a what-if example</strong>
              <p>
                Results will explain the binding constraint. They are not an
                order suggestion or a live market calculation.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
