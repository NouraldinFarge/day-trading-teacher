import { useEffect, useMemo, useRef, useState } from "react";
import { CirclePause, HeartPulse, RotateCcw, ShieldX } from "lucide-react";
import {
  recommendResetAction,
  type ResetRecommendation,
  type ResetSignal,
} from "../../../domain/reset-protocol";

const signals: Array<{ id: ResetSignal; label: string }> = [
  { id: "urgency", label: "Urgency to act immediately" },
  { id: "tunnel_vision", label: "Tunnel vision or narrowed attention" },
  {
    id: "physical_activation",
    label: "Racing heart, tension, or clammy hands",
  },
  {
    id: "recover_outcome",
    label: "Need to recover or protect the last outcome",
  },
  { id: "euphoria", label: "Euphoria or unusual certainty after a win" },
  { id: "focus_drop", label: "Noticeable drop in focus" },
];

const titles: Record<ResetRecommendation, string> = {
  continue_review: "Return to observation—not automatic action",
  pause: "Pause and rebuild the decision",
  review_only: "Move the session to review-only",
};

export function ResetDrill({
  canMoveSessionToReview,
  onMoveSessionToReview,
  onPractice,
}: {
  canMoveSessionToReview: boolean;
  onMoveSessionToReview(): void;
  onPractice(): void;
}) {
  const [activation, setActivation] = useState(1);
  const [selectedSignals, setSelectedSignals] = useState<ResetSignal[]>([]);
  const [boundaryReached, setBoundaryReached] = useState(false);
  const [planStillValid, setPlanStillValid] = useState(true);
  const [facts, setFacts] = useState("");
  const [story, setStory] = useState("");
  const [recommendation, setRecommendation] = useState<ReturnType<
    typeof recommendResetAction
  > | null>(null);
  const [seconds, setSeconds] = useState(90);
  const practiced = useRef(false);

  useEffect(() => {
    if (
      !recommendation ||
      recommendation.recommendation !== "pause" ||
      seconds <= 0
    )
      return;
    const timer = window.setInterval(
      () => setSeconds((current) => Math.max(0, current - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [recommendation, seconds]);

  const factStoryReady = useMemo(
    () => facts.trim().length >= 8 && story.trim().length >= 8,
    [facts, story],
  );

  const toggleSignal = (signal: ResetSignal) =>
    setSelectedSignals((current) =>
      current.includes(signal)
        ? current.filter((item) => item !== signal)
        : [...current, signal],
    );

  const run = () => {
    setRecommendation(
      recommendResetAction({
        activation,
        signals: selectedSignals,
        boundaryReached,
        planStillValid,
      }),
    );
    setSeconds(90);
    if (!practiced.current) {
      practiced.current = true;
      onPractice();
    }
  };

  const reset = () => {
    setActivation(1);
    setSelectedSignals([]);
    setBoundaryReached(false);
    setPlanStillValid(true);
    setFacts("");
    setStory("");
    setRecommendation(null);
    setSeconds(90);
    practiced.current = false;
  };

  return (
    <section className="card learning-tool-card reset-drill">
      <div className="card-header">
        <div>
          <span className="eyebrow accent">Between-decision reset</span>
          <h2>Notice escalation before it becomes another decision</h2>
          <p>
            Name activation, separate observable facts from the story in your
            head, then let the strongest safety boundary choose the next mode.
          </p>
        </div>
        <HeartPulse size={22} />
      </div>

      <div className="reset-grid">
        <div className="reset-step">
          <span className="reset-step-number">1</span>
          <div>
            <h3>Check activation</h3>
            <label className="activation-slider">
              <span>
                Current intensity <strong>{activation}/5</strong>
              </span>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={activation}
                onChange={(event) => setActivation(Number(event.target.value))}
              />
              <small>1 = settled · 3 = activated · 5 = overwhelmed</small>
            </label>
            <div className="reset-signal-list">
              {signals.map((signal) => (
                <label key={signal.id}>
                  <input
                    type="checkbox"
                    checked={selectedSignals.includes(signal.id)}
                    onChange={() => toggleSignal(signal.id)}
                  />
                  {signal.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="reset-step">
          <span className="reset-step-number">2</span>
          <div>
            <h3>Separate fact from story</h3>
            <label>
              <span>Observable facts</span>
              <textarea
                rows={3}
                value={facts}
                onChange={(event) => setFacts(event.target.value)}
                placeholder="What the plan, fill record, limit, and chart actually show"
              />
            </label>
            <label>
              <span>The story or urge</span>
              <textarea
                rows={3}
                value={story}
                onChange={(event) => setStory(event.target.value)}
                placeholder="What you feel compelled to make happen next"
              />
            </label>
          </div>
        </div>

        <div className="reset-step">
          <span className="reset-step-number">3</span>
          <div>
            <h3>Apply hard boundaries</h3>
            <label className="reset-check">
              <input
                type="checkbox"
                checked={boundaryReached}
                onChange={(event) => setBoundaryReached(event.target.checked)}
              />
              A daily loss, trade-count, consecutive-loss, or personal stop
              boundary has been reached
            </label>
            <label className="reset-check">
              <input
                type="checkbox"
                checked={planStillValid}
                onChange={(event) => setPlanStillValid(event.target.checked)}
              />
              The original written plan is still valid without being edited
            </label>
            <button
              type="button"
              className="button primary"
              disabled={!factStoryReady}
              onClick={run}
            >
              <CirclePause size={16} /> Run the reset
            </button>
          </div>
        </div>
      </div>

      {recommendation ? (
        <div
          className={`reset-recommendation ${recommendation.recommendation}`}
          aria-live="polite"
        >
          <div>
            {recommendation.recommendation === "review_only" ? (
              <ShieldX size={22} />
            ) : (
              <CirclePause size={22} />
            )}
            <div>
              <span>Recommended next mode</span>
              <strong>{titles[recommendation.recommendation]}</strong>
            </div>
          </div>
          <p>{recommendation.reason}</p>
          {recommendation.recommendation === "pause" ? (
            <div className="reset-timer">
              <strong>{seconds}s</strong>
              <span>
                {seconds > 0
                  ? "Look away from the outcome. Breathe normally and reread only the locked rules."
                  : "Pause complete. Reassess; waiting or review-only remains a complete choice."}
              </span>
            </div>
          ) : null}
          <div className="reset-actions">
            {recommendation.recommendation !== "continue_review" &&
            canMoveSessionToReview ? (
              <button
                type="button"
                className="button primary"
                onClick={onMoveSessionToReview}
              >
                <ShieldX size={16} /> End paper decisions and review
              </button>
            ) : null}
            <button type="button" className="button secondary" onClick={reset}>
              <RotateCcw size={16} /> Start a fresh reset
            </button>
          </div>
        </div>
      ) : null}

      <p className="analysis-boundary">
        This tool supports self-observation; it is not medical care. A reset
        never requires another trade. If distress feels difficult to manage,
        step away and seek appropriate support.
      </p>
    </section>
  );
}
