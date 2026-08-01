import { useState, type FormEvent } from "react";
import { Activity, CheckCircle2, Scale, Sigma } from "lucide-react";
import { calculateExpectancy } from "../../../domain/learning-tools";

type ExpectancyResult = ReturnType<typeof calculateExpectancy>;

export function ExpectancyLab({ onPractice }: { onPractice(): void }) {
  const [winRate, setWinRate] = useState("45");
  const [averageWin, setAverageWin] = useState("2");
  const [averageLoss, setAverageLoss] = useState("1");
  const [result, setResult] = useState<ExpectancyResult | null>(null);
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
      setResult(
        calculateExpectancy({
          winRatePercent: Number(winRate),
          averageWinR: Number(averageWin),
          averageLossR: Number(averageLoss),
        }),
      );
    } catch (reason) {
      setResult(null);
      setError(
        reason instanceof Error
          ? reason.message
          : "The expectancy example could not be calculated.",
      );
    }
  };

  const record = () => {
    if (!result || recorded) return;
    onPractice();
    setRecorded(true);
  };

  return (
    <section
      aria-labelledby="expectancy-lab-title"
      className="learning-tool-panel"
    >
      <header className="tool-panel-header">
        <span className="tool-panel-icon blue">
          <Sigma size={21} />
        </span>
        <div>
          <span className="eyebrow accent">Expectancy explorer</span>
          <h2 id="expectancy-lab-title">Separate frequency from payoff</h2>
          <p>
            Explore how win rate and average outcome work together. All values
            use R so account size does not distort the lesson.
          </p>
        </div>
      </header>

      <div className="tool-workspace-grid">
        <form className="tool-form" onSubmit={calculate} noValidate>
          <label>
            Win rate
            <span className="input-with-suffix">
              <input
                inputMode="decimal"
                value={winRate}
                onChange={(event) => {
                  setWinRate(event.target.value);
                  invalidate();
                }}
              />
              <span>%</span>
            </span>
          </label>
          <div className="form-grid two">
            <label>
              Average win
              <span className="input-with-suffix">
                <input
                  inputMode="decimal"
                  value={averageWin}
                  onChange={(event) => {
                    setAverageWin(event.target.value);
                    invalidate();
                  }}
                />
                <span>R</span>
              </span>
            </label>
            <label>
              Average loss
              <span className="input-with-suffix">
                <input
                  inputMode="decimal"
                  value={averageLoss}
                  onChange={(event) => {
                    setAverageLoss(event.target.value);
                    invalidate();
                  }}
                />
                <span>R</span>
              </span>
            </label>
          </div>
          {error ? (
            <div className="error-message" role="alert">
              {error}
            </div>
          ) : null}
          <button className="button primary" type="submit">
            <Activity size={16} />
            Explain the relationship
          </button>
        </form>

        <div className="tool-result" aria-live="polite">
          {result ? (
            <>
              <div className="tool-result-heading">
                <span>
                  <Scale size={18} />
                </span>
                <div>
                  <small>Estimated average per observation</small>
                  <strong
                    className={
                      result.expectancyR >= 0
                        ? "positive-text"
                        : "negative-text"
                    }
                  >
                    {result.expectancyR >= 0 ? "+" : ""}
                    {result.expectancyR.toFixed(2)}R
                  </strong>
                </div>
              </div>
              <dl className="tool-result-list">
                <div>
                  <dt>Break-even win rate</dt>
                  <dd>{result.breakEvenWinRate.toFixed(1)}%</dd>
                </div>
                <div>
                  <dt>Arithmetic over 100 observations</dt>
                  <dd>
                    {result.expectedRPer100Observations >= 0 ? "+" : ""}
                    {result.expectedRPer100Observations.toFixed(1)}R
                  </dd>
                </div>
              </dl>
              <p className="tool-explanation">
                This is a long-run arithmetic estimate, not a forecast. Real
                sequences vary, and small samples can land far from this
                average.
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
              <Sigma size={24} />
              <strong>Try contrasting examples</strong>
              <p>
                Compare a high win rate with small wins against a lower win rate
                with larger wins. Neither input works alone.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
