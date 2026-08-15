export type ContextDecision = "plan_replay" | "wait" | "no_trade";

export type PatternPracticeBar = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type PatternContextScenario = {
  id: string;
  title: string;
  brief: string;
  visibleBars: number;
  bars: PatternPracticeBar[];
  evidence: string[];
  unknowns: string[];
  correctDecision: ContextDecision;
  explanation: string;
  transfer: string;
};

export const patternContextScenarios: PatternContextScenario[] = [
  {
    id: "doji-without-context",
    title: "A familiar candle without a story",
    brief:
      "A small-body candle appears after several mixed bars. Volume is available, but the session, spread, and higher-timeframe structure are not.",
    visibleBars: 8,
    bars: [
      { open: 10.0, high: 10.18, low: 9.94, close: 10.12, volume: 44 },
      { open: 10.12, high: 10.19, low: 10.02, close: 10.05, volume: 39 },
      { open: 10.05, high: 10.21, low: 10.0, close: 10.17, volume: 42 },
      { open: 10.17, high: 10.23, low: 10.08, close: 10.1, volume: 34 },
      { open: 10.1, high: 10.2, low: 10.04, close: 10.16, volume: 31 },
      { open: 10.16, high: 10.22, low: 10.07, close: 10.11, volume: 32 },
      { open: 10.11, high: 10.18, low: 10.06, close: 10.13, volume: 27 },
      { open: 10.13, high: 10.27, low: 10.0, close: 10.14, volume: 55 },
      { open: 10.14, high: 10.2, low: 9.96, close: 10.01, volume: 61 },
      { open: 10.01, high: 10.08, low: 9.88, close: 9.93, volume: 68 },
    ],
    evidence: ["The candle has a small body", "Volume increased on the candle"],
    unknowns: ["Trend context", "Spread and liquidity", "Named playbook"],
    correctDecision: "wait",
    explanation:
      "A doji describes that interval; it does not predict the next one. Missing context makes the process unscorable, so the correct learning action is to wait and gather evidence.",
    transfer:
      "Find the same candle shape after a clear trend and compare what the surrounding bars change—and what remains unknown.",
  },
  {
    id: "orderly-pullback-complete",
    title: "Context earns a replay plan",
    brief:
      "A synthetic series expands, pauses on lighter participation, and remains above the preselected structural level. The practice spread and session source are documented.",
    visibleBars: 9,
    bars: [
      { open: 20.0, high: 20.15, low: 19.96, close: 20.1, volume: 30 },
      { open: 20.1, high: 20.42, low: 20.08, close: 20.37, volume: 72 },
      { open: 20.37, high: 20.71, low: 20.32, close: 20.65, volume: 88 },
      { open: 20.65, high: 20.96, low: 20.61, close: 20.9, volume: 96 },
      { open: 20.9, high: 21.02, low: 20.76, close: 20.82, volume: 51 },
      { open: 20.82, high: 20.88, low: 20.69, close: 20.74, volume: 38 },
      { open: 20.74, high: 20.82, low: 20.66, close: 20.71, volume: 29 },
      { open: 20.71, high: 20.79, low: 20.67, close: 20.76, volume: 25 },
      { open: 20.76, high: 20.86, low: 20.72, close: 20.81, volume: 35 },
      { open: 20.81, high: 21.08, low: 20.78, close: 21.02, volume: 74 },
      { open: 21.02, high: 21.14, low: 20.93, close: 20.98, volume: 57 },
    ],
    evidence: [
      "Expansion and pullback are both visible",
      "Participation contracts during the pause",
      "Structural invalidation is identifiable",
      "Session and spread rules are documented",
    ],
    unknowns: ["Later outcome"],
    correctDecision: "plan_replay",
    explanation:
      "The evidence is complete enough to write a replay-only plan. That is permission to define a trigger, invalidation, and risk before reveal—not a prediction and not permission for live execution.",
    transfer:
      "Lock a Decision Card, reveal one bar at a time, and score adherence separately from the synthetic outcome.",
  },
  {
    id: "late-extension",
    title: "A late move fails the gate",
    brief:
      "Range and volume accelerate after an already extended sequence. The nearest structural invalidation would exceed the preset practice risk boundary.",
    visibleBars: 9,
    bars: [
      { open: 5.0, high: 5.1, low: 4.96, close: 5.08, volume: 28 },
      { open: 5.08, high: 5.22, low: 5.06, close: 5.19, volume: 36 },
      { open: 5.19, high: 5.37, low: 5.16, close: 5.34, volume: 48 },
      { open: 5.34, high: 5.58, low: 5.31, close: 5.54, volume: 66 },
      { open: 5.54, high: 5.88, low: 5.49, close: 5.82, volume: 91 },
      { open: 5.82, high: 6.31, low: 5.77, close: 6.22, volume: 133 },
      { open: 6.22, high: 6.58, low: 6.04, close: 6.51, volume: 159 },
      { open: 6.51, high: 6.72, low: 6.15, close: 6.28, volume: 171 },
      { open: 6.28, high: 6.7, low: 6.2, close: 6.62, volume: 184 },
      { open: 6.62, high: 6.68, low: 5.96, close: 6.04, volume: 207 },
      { open: 6.04, high: 6.16, low: 5.71, close: 5.82, volume: 164 },
    ],
    evidence: [
      "Large late ranges",
      "Increasing participation",
      "Distant invalidation",
    ],
    unknowns: ["Whether momentum continues"],
    correctDecision: "no_trade",
    explanation:
      "The written risk boundary already fails. More excitement cannot repair an invalid setup, and smaller size does not make the structural distance acceptable if the playbook excludes it.",
    transfer:
      "Mark the first bar where the prewritten extension rule failed, then compare it with an earlier, less extended timestamp.",
  },
  {
    id: "hammer-needs-confirmation",
    title: "Shape present, confirmation absent",
    brief:
      "A long lower wick follows a decline, but the next bar has not confirmed a change and liquidity evidence is incomplete.",
    visibleBars: 8,
    bars: [
      { open: 30.0, high: 30.08, low: 29.72, close: 29.79, volume: 48 },
      { open: 29.79, high: 29.84, low: 29.51, close: 29.58, volume: 52 },
      { open: 29.58, high: 29.64, low: 29.29, close: 29.35, volume: 61 },
      { open: 29.35, high: 29.42, low: 29.08, close: 29.14, volume: 69 },
      { open: 29.14, high: 29.2, low: 28.83, close: 28.91, volume: 78 },
      { open: 28.91, high: 29.0, low: 28.57, close: 28.66, volume: 91 },
      { open: 28.66, high: 28.74, low: 28.41, close: 28.5, volume: 103 },
      { open: 28.5, high: 28.68, low: 27.96, close: 28.59, volume: 137 },
      { open: 28.59, high: 28.64, low: 28.31, close: 28.38, volume: 126 },
      { open: 28.38, high: 28.43, low: 28.14, close: 28.2, volume: 111 },
    ],
    evidence: ["Downtrend context", "Long lower wick", "Elevated volume"],
    unknowns: ["Confirmation", "Spread and executable liquidity"],
    correctDecision: "wait",
    explanation:
      "The wick is evidence of a rejected price excursion, not proof of reversal. The missing confirmation and liquidity evidence require waiting.",
    transfer:
      "Reveal the next bar only after writing the exact confirmation and cancellation conditions you would need.",
  },
  {
    id: "volume-conflict",
    title: "Price shape and participation disagree",
    brief:
      "The pause looks orderly by price, but selling participation expands on each pullback bar and the prewritten playbook excludes that condition.",
    visibleBars: 9,
    bars: [
      { open: 14.0, high: 14.18, low: 13.97, close: 14.16, volume: 42 },
      { open: 14.16, high: 14.39, low: 14.12, close: 14.34, volume: 58 },
      { open: 14.34, high: 14.62, low: 14.3, close: 14.57, volume: 75 },
      { open: 14.57, high: 14.76, low: 14.53, close: 14.71, volume: 84 },
      { open: 14.71, high: 14.74, low: 14.58, close: 14.62, volume: 73 },
      { open: 14.62, high: 14.66, low: 14.49, close: 14.54, volume: 82 },
      { open: 14.54, high: 14.59, low: 14.41, close: 14.47, volume: 96 },
      { open: 14.47, high: 14.53, low: 14.36, close: 14.42, volume: 113 },
      { open: 14.42, high: 14.51, low: 14.38, close: 14.48, volume: 107 },
      { open: 14.48, high: 14.52, low: 14.23, close: 14.27, volume: 144 },
      { open: 14.27, high: 14.32, low: 14.05, close: 14.11, volume: 131 },
    ],
    evidence: [
      "Orderly-looking price bars",
      "Increasing sell-side participation",
    ],
    unknowns: ["Later outcome"],
    correctDecision: "no_trade",
    explanation:
      "A familiar outline cannot overrule a written disqualifier. Conflicting participation evidence fails this playbook even before later price is revealed.",
    transfer:
      "Compare price-only and price-plus-volume readings of the same timestamp and document why the conclusion changed.",
  },
  {
    id: "good-shape-missing-source",
    title: "Clean picture, incomplete evidence chain",
    brief:
      "The bars form a clean range and breakout attempt, but the dataset is delayed, the session filter is unknown, and no contemporaneous spread is available.",
    visibleBars: 9,
    bars: [
      { open: 40.0, high: 40.22, low: 39.92, close: 40.18, volume: 36 },
      { open: 40.18, high: 40.36, low: 40.11, close: 40.29, volume: 42 },
      { open: 40.29, high: 40.38, low: 40.2, close: 40.31, volume: 31 },
      { open: 40.31, high: 40.4, low: 40.23, close: 40.35, volume: 29 },
      { open: 40.35, high: 40.41, low: 40.25, close: 40.28, volume: 27 },
      { open: 40.28, high: 40.39, low: 40.24, close: 40.34, volume: 25 },
      { open: 40.34, high: 40.42, low: 40.29, close: 40.38, volume: 24 },
      { open: 40.38, high: 40.43, low: 40.31, close: 40.36, volume: 23 },
      { open: 40.36, high: 40.47, low: 40.33, close: 40.44, volume: 39 },
      { open: 40.44, high: 40.59, low: 40.39, close: 40.52, volume: 61 },
      { open: 40.52, high: 40.57, low: 40.34, close: 40.39, volume: 68 },
    ],
    evidence: ["Visible range", "Observable breakout attempt"],
    unknowns: ["Feed freshness", "Session", "Contemporaneous spread"],
    correctDecision: "wait",
    explanation:
      "A clean chart cannot expand the authority of an incomplete data source. Wait until the feed, session, and execution context can support the intended claim.",
    transfer:
      "Open Chart Replay's data-quality notes and identify which missing field blocks which conclusion.",
  },
];

export function evaluateContextDecision(
  scenarioId: string,
  decision: ContextDecision,
) {
  const scenario = patternContextScenarios.find(
    (item) => item.id === scenarioId,
  );
  if (!scenario) throw new Error("That context scenario is not available.");
  return {
    aligned: scenario.correctDecision === decision,
    correctDecision: scenario.correctDecision,
    explanation: scenario.explanation,
    transfer: scenario.transfer,
  };
}
