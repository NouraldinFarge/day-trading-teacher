import { useState } from "react";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ChevronLeft,
  Eye,
} from "lucide-react";
import {
  decisionScenarios,
  evaluateScenarioChoice,
} from "../../../domain/learning-tools";

export function DecisionDrill({ onPractice }: { onPractice(): void }) {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [practiced, setPracticed] = useState<Set<string>>(new Set());
  const scenario = decisionScenarios[scenarioIndex];
  const evaluation =
    revealed && selectedChoice
      ? evaluateScenarioChoice(scenario.id, selectedChoice)
      : null;

  const reveal = () => {
    if (!selectedChoice) return;
    setRevealed(true);
    if (!practiced.has(scenario.id)) {
      onPractice();
      setPracticed((current) => new Set(current).add(scenario.id));
    }
  };

  const move = (nextIndex: number) => {
    setScenarioIndex(nextIndex);
    setSelectedChoice("");
    setRevealed(false);
  };

  return (
    <section
      aria-labelledby="decision-drill-title"
      className="learning-tool-panel"
    >
      <header className="tool-panel-header">
        <span className="tool-panel-icon warning">
          <BrainCircuit size={21} />
        </span>
        <div>
          <span className="eyebrow accent">Decision drills</span>
          <h2 id="decision-drill-title">Choose before seeing the reasoning</h2>
          <p>
            Work through historical-style situations that reward eligibility,
            evidence, and restraint—not prediction or trade frequency.
          </p>
        </div>
      </header>

      <div className="drill-progress" aria-label="Scenario progress">
        <div
          className="progress-bar"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={decisionScenarios.length}
          aria-valuenow={scenarioIndex + 1}
          aria-label="Current scenario"
        >
          <span
            style={{
              width: `${((scenarioIndex + 1) / decisionScenarios.length) * 100}%`,
            }}
          />
        </div>
        <small>
          Scenario {scenarioIndex + 1} of {decisionScenarios.length} ·{" "}
          {practiced.size} reviewed this session
        </small>
      </div>

      <article className="scenario-card">
        <span className="eyebrow">Simulated decision</span>
        <h3>{scenario.title}</h3>
        <p>{scenario.context}</p>
        <strong className="scenario-question">{scenario.question}</strong>
        <div
          className="scenario-choices"
          role="radiogroup"
          aria-label={scenario.question}
        >
          {scenario.choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              role="radio"
              aria-checked={selectedChoice === choice.id}
              className={selectedChoice === choice.id ? "selected" : ""}
              disabled={revealed}
              onClick={() => setSelectedChoice(choice.id)}
            >
              <span />
              {choice.label}
            </button>
          ))}
        </div>
        <button
          className="button primary"
          type="button"
          disabled={!selectedChoice || revealed}
          onClick={reveal}
        >
          <Eye size={16} />
          {revealed ? "Reasoning revealed" : "Reveal the reasoning"}
        </button>

        {evaluation ? (
          <div
            className={`scenario-feedback ${evaluation.aligned ? "aligned" : "reconsider"}`}
            role="status"
          >
            <span>
              {evaluation.aligned ? (
                <CheckCircle2 size={19} />
              ) : (
                <BrainCircuit size={19} />
              )}
            </span>
            <div>
              <strong>
                {evaluation.aligned
                  ? "Aligned with the written process"
                  : "Reconsider the decision order"}
              </strong>
              <p>{evaluation.feedback}</p>
              <small>
                <b>Transfer principle:</b> {evaluation.principle}
              </small>
            </div>
          </div>
        ) : null}
      </article>

      <div className="tool-navigation">
        <button
          className="button secondary"
          type="button"
          disabled={scenarioIndex === 0}
          onClick={() => move(scenarioIndex - 1)}
        >
          <ChevronLeft size={16} />
          Previous
        </button>
        <button
          className="button secondary"
          type="button"
          disabled={!revealed || scenarioIndex === decisionScenarios.length - 1}
          onClick={() => move(scenarioIndex + 1)}
        >
          Next scenario
          <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}
