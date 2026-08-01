import type { ConceptRecallRecord, TradeSide } from "./types";

export type ExpectancyResult = {
  expectancyR: number;
  breakEvenWinRate: number;
  expectedRPer100Observations: number;
};

export function calculateExpectancy(input: {
  winRatePercent: number;
  averageWinR: number;
  averageLossR: number;
}): ExpectancyResult {
  const { winRatePercent, averageWinR, averageLossR } = input;
  if (
    !Number.isFinite(winRatePercent) ||
    winRatePercent < 0 ||
    winRatePercent > 100
  ) {
    throw new Error("Win rate must be between 0% and 100%.");
  }
  if (!Number.isFinite(averageWinR) || averageWinR < 0) {
    throw new Error("Average win must be zero or greater.");
  }
  if (!Number.isFinite(averageLossR) || averageLossR <= 0) {
    throw new Error("Average loss must be greater than zero.");
  }

  const winProbability = winRatePercent / 100;
  const expectancyR =
    winProbability * averageWinR - (1 - winProbability) * averageLossR;
  const breakEvenWinRate =
    averageWinR + averageLossR === 0
      ? 0
      : (averageLossR / (averageWinR + averageLossR)) * 100;

  return {
    expectancyR,
    breakEvenWinRate,
    expectedRPer100Observations: expectancyR * 100,
  };
}

export function calculateRewardRisk(input: {
  entry: number;
  stop: number;
  target: number;
  side: TradeSide;
}) {
  const { entry, stop, target, side } = input;
  if (![entry, stop, target].every(Number.isFinite)) {
    throw new Error("Entry, stop, and target must be valid numbers.");
  }
  const riskPerUnit = side === "long" ? entry - stop : stop - entry;
  const rewardPerUnit = side === "long" ? target - entry : entry - target;
  if (riskPerUnit <= 0) {
    throw new Error(
      "For a long example the stop belongs below entry; for a short example it belongs above entry.",
    );
  }
  if (rewardPerUnit <= 0) {
    throw new Error(
      "For a long example the target belongs above entry; for a short example it belongs below entry.",
    );
  }
  return {
    riskPerUnit,
    rewardPerUnit,
    rewardRiskRatio: rewardPerUnit / riskPerUnit,
  };
}

export type DecisionScenario = {
  id: string;
  title: string;
  context: string;
  question: string;
  choices: Array<{
    id: string;
    label: string;
    feedback: string;
    aligned: boolean;
  }>;
  principle: string;
};

export const decisionScenarios: DecisionScenario[] = [
  {
    id: "event-window",
    title: "The event window",
    context:
      "A simulated setup looks familiar, but a scheduled market-moving release is three minutes away. Your written playbook excludes new entries around scheduled events.",
    question: "Which response best follows the process?",
    choices: [
      {
        id: "enter-smaller",
        label: "Enter with a smaller position",
        feedback:
          "Smaller size changes exposure, but it does not make an ineligible setup eligible.",
        aligned: false,
      },
      {
        id: "wait",
        label: "Wait until the exclusion window passes",
        feedback:
          "Correct. Eligibility is decided before sizing, and waiting is a complete decision.",
        aligned: true,
      },
      {
        id: "widen-stop",
        label: "Use a wider stop for volatility",
        feedback:
          "Changing the stop does not resolve the conflict with the written event rule.",
        aligned: false,
      },
    ],
    principle:
      "A risk adjustment cannot repair a failed eligibility condition. Apply exclusions before entry and sizing decisions.",
  },
  {
    id: "missing-trigger",
    title: "The attractive chart",
    context:
      "The chart is near your planned area, but the exact confirmation written in the plan has not occurred. Nothing else in the plan has changed.",
    question: "What is the strongest process choice?",
    choices: [
      {
        id: "anticipate",
        label: "Anticipate the trigger",
        feedback:
          "Anticipation replaces the testable plan with an outcome-driven guess.",
        aligned: false,
      },
      {
        id: "wait-trigger",
        label: "Wait for the written trigger",
        feedback:
          "Correct. A near-match is not the same as the condition that was planned.",
        aligned: true,
      },
      {
        id: "remove-trigger",
        label: "Delete the trigger from the plan",
        feedback:
          "Rewriting a plan at the decision point destroys the value of deciding in advance.",
        aligned: false,
      },
    ],
    principle:
      "A plan is useful because it separates prior reasoning from in-the-moment pressure. Preserve the written trigger.",
  },
  {
    id: "risk-sizing",
    title: "Size after invalidation",
    context:
      "A simulated plan has an entry at $50.00, an evidence-based invalidation at $49.50, a $25 maximum loss, and $0.05 estimated slippage per share.",
    question: "What should determine quantity?",
    choices: [
      {
        id: "round-lot",
        label: "Use a familiar round lot",
        feedback:
          "A familiar quantity is unrelated to the actual distance to invalidation.",
        aligned: false,
      },
      {
        id: "risk-first",
        label: "Divide the risk budget by $0.55 per share",
        feedback:
          "Correct. Technical risk plus estimated slippage defines the per-share risk before rounding down.",
        aligned: true,
      },
      {
        id: "move-stop",
        label: "Move the stop closer to buy more shares",
        feedback:
          "The invalidation should come from the thesis, not the desired position size.",
        aligned: false,
      },
    ],
    principle:
      "Define invalidation from evidence, add realistic friction, then round quantity down to stay within the loss limit.",
  },
  {
    id: "daily-limit",
    title: "The daily boundary",
    context:
      "Two reviewed decisions have already reached the daily loss limit written before the session. A new setup appears afterward.",
    question: "Which action protects the learning process?",
    choices: [
      {
        id: "recover",
        label: "Take one more to recover the loss",
        feedback:
          "Trying to recover changes the goal from process quality to immediate outcome repair.",
        aligned: false,
      },
      {
        id: "stop-session",
        label: "End execution and begin review",
        feedback:
          "Correct. The precommitted boundary protects capital and creates space for a calmer review.",
        aligned: true,
      },
      {
        id: "double-check",
        label: "Continue if the setup looks unusually strong",
        feedback:
          "A subjective exception after reaching the limit weakens the purpose of the boundary.",
        aligned: false,
      },
    ],
    principle:
      "A daily limit is a precommitment, not a suggestion. Stopping can be the highest-quality decision of the session.",
  },
  {
    id: "outcome-process",
    title: "Profit without discipline",
    context:
      "A historical example finished profitable, but the entry was unplanned and the invalidation was ignored.",
    question: "How should the review classify it?",
    choices: [
      {
        id: "good-profit",
        label: "Strong because it made money",
        feedback:
          "Outcome alone cannot establish whether the decision process was repeatable or controlled.",
        aligned: false,
      },
      {
        id: "separate",
        label: "Profitable outcome, weak process",
        feedback:
          "Correct. Outcome and process are separate fields and can point in different directions.",
        aligned: true,
      },
      {
        id: "ignore",
        label: "Skip the review because no loss occurred",
        feedback:
          "Profitable rule violations are important evidence because the outcome can conceal the behavior.",
        aligned: false,
      },
    ],
    principle:
      "Judge outcome and decision quality separately. A favorable result does not make an unrepeatable process strong.",
  },
  {
    id: "missing-evidence",
    title: "The incomplete record",
    context:
      "A journal entry has execution prices, but the original plan, market context, and reason for entry were not recorded.",
    question: "What is the most honest conclusion?",
    choices: [
      {
        id: "infer",
        label: "Infer the missing intent from the chart",
        feedback:
          "A later chart view cannot prove what was known or intended at the decision point.",
        aligned: false,
      },
      {
        id: "not-scorable",
        label: "Mark the process not scorable",
        feedback:
          "Correct. Preserve the known facts and label the missing evidence instead of inventing certainty.",
        aligned: true,
      },
      {
        id: "average",
        label: "Assign an average process score",
        feedback:
          "A neutral-looking number would still claim evidence that the record does not contain.",
        aligned: false,
      },
    ],
    principle:
      "Evidence quality limits the strength of a conclusion. Unknown is a valid and useful label.",
  },
];

export function evaluateScenarioChoice(scenarioId: string, choiceId: string) {
  const scenario = decisionScenarios.find((item) => item.id === scenarioId);
  const choice = scenario?.choices.find((item) => item.id === choiceId);
  if (!scenario || !choice) {
    throw new Error("That practice choice is not available.");
  }
  return {
    aligned: choice.aligned,
    feedback: choice.feedback,
    principle: scenario.principle,
  };
}

export type ConceptCard = {
  id: string;
  term: string;
  prompt: string;
  answer: string;
  transfer: string;
};

export const conceptCards: ConceptCard[] = [
  {
    id: "invalidation",
    term: "Invalidation",
    prompt: "What makes an invalidation different from an arbitrary stop?",
    answer:
      "Invalidation is the observable evidence that the original thesis no longer holds. A stop is the order or price boundary used to act on that evidence.",
    transfer:
      "Before calculating quantity, state what new evidence would prove the planned idea wrong.",
  },
  {
    id: "risk-unit",
    term: "R unit",
    prompt: "What does 1R represent in a review?",
    answer:
      "One R is the amount deliberately placed at risk according to the plan. Expressing outcomes in R separates process comparison from account size.",
    transfer:
      "Compare two historical outcomes in R before comparing their dollar values.",
  },
  {
    id: "expectancy",
    term: "Expectancy",
    prompt: "What does expectancy describe—and what can it not promise?",
    answer:
      "Expectancy estimates the average result per observation from win frequency and average win and loss sizes. It cannot promise the next result or remove sample uncertainty.",
    transfer:
      "State both the estimated expectancy and the sample size whenever reviewing a strategy record.",
  },
  {
    id: "drawdown",
    term: "Drawdown",
    prompt: "What is drawdown measuring?",
    answer:
      "Drawdown measures the decline from a prior equity peak to a later trough. It describes the path of results, not only the ending total.",
    transfer:
      "Compare two result sequences with the same ending balance but different peak-to-trough paths.",
  },
  {
    id: "eligibility",
    term: "Eligibility before entry",
    prompt: "Why should eligibility be decided before entry precision?",
    answer:
      "Eligibility asks whether the situation belongs to the tested playbook at all. Entry precision matters only after the setup passes those conditions.",
    transfer:
      "Name one condition that makes a familiar-looking setup an automatic wait.",
  },
  {
    id: "slippage",
    term: "Slippage",
    prompt: "Why include slippage in a position-size exercise?",
    answer:
      "The planned order price and actual fill can differ. Adding a conservative estimate prevents quantity from using the entire risk budget before execution friction.",
    transfer:
      "Recalculate a sample quantity with and without estimated slippage and compare the planned risk.",
  },
  {
    id: "process-outcome",
    term: "Process versus outcome",
    prompt: "Can a profitable outcome come from a weak process?",
    answer:
      "Yes. A favorable outcome can follow an unplanned or rule-breaking decision, just as a controlled decision can have an unfavorable outcome.",
    transfer:
      "Write separate sentences for what happened and how the decision was made.",
  },
  {
    id: "sample-size",
    term: "Sample size",
    prompt: "Why is a small sample dangerous when reading performance?",
    answer:
      "A small sample is highly sensitive to chance and outliers. It can support description of the recorded cases but not a stable general conclusion.",
    transfer:
      "Add an explicit early-sample warning to any conclusion drawn from only a few records.",
  },
  {
    id: "lookahead",
    term: "Look-ahead bias",
    prompt: "What creates look-ahead bias in a backtest?",
    answer:
      "Look-ahead bias occurs when a simulated decision uses information that would not have been known at that decision time.",
    transfer:
      "Explain why a signal calculated at a bar close should not receive a fill earlier in that same bar.",
  },
  {
    id: "ambiguous-bar",
    term: "Ambiguous intrabar order",
    prompt: "Why can one OHLC bar hide the order of events?",
    answer:
      "A bar shows its open, high, low, and close but not the exact path between them. If both stop and target were touched, the bar alone cannot prove which happened first.",
    transfer:
      "Use a conservative rule and label the limitation instead of inventing an intrabar sequence.",
  },
  {
    id: "no-trade",
    term: "No-trade condition",
    prompt: "What makes a no-trade condition useful?",
    answer:
      "It is observable, written before the moment, and strong enough to cancel the setup. It reduces improvisation under pressure.",
    transfer:
      "Rewrite a vague warning such as “bad market” into a condition another person could verify.",
  },
  {
    id: "data-quality",
    term: "Not scorable",
    prompt: "When is “not scorable” more accurate than a neutral score?",
    answer:
      "When the evidence required to judge the process is missing. A neutral number still implies a measurement that was never supported.",
    transfer:
      "List the missing facts before deciding whether a historical record can support a process score.",
  },
];

export type RecallRating = "again" | "hard" | "good";

export function buildRecallRecord(
  previous: ConceptRecallRecord | undefined,
  rating: RecallRating,
  now = new Date(),
): ConceptRecallRecord {
  const previousStrength = previous?.strength ?? 0;
  const strength: ConceptRecallRecord["strength"] =
    rating === "again"
      ? 0
      : rating === "hard"
        ? (Math.min(1, previousStrength) as 0 | 1)
        : (Math.min(3, previousStrength + 1) as 1 | 2 | 3);
  const intervalDays =
    rating === "again" ? 1 : rating === "hard" ? 2 : [1, 3, 7, 21][strength];
  const next = new Date(now);
  next.setDate(next.getDate() + intervalDays);
  return {
    strength,
    attempts: (previous?.attempts ?? 0) + 1,
    lastReviewedAt: now.toISOString(),
    nextReviewAt: next.toISOString(),
    lastRating: rating,
  };
}

export function dueConceptCards(
  records: Record<string, ConceptRecallRecord> | undefined,
  now = new Date(),
) {
  const current = records ?? {};
  return conceptCards
    .filter((card) => {
      const record = current[card.id];
      return !record || new Date(record.nextReviewAt) <= now;
    })
    .sort((left, right) => {
      const leftRecord = current[left.id];
      const rightRecord = current[right.id];
      if (!leftRecord && rightRecord) return -1;
      if (leftRecord && !rightRecord) return 1;
      return (leftRecord?.nextReviewAt ?? "").localeCompare(
        rightRecord?.nextReviewAt ?? "",
      );
    });
}
