import type { JournalReflection, Trade, TradeReview } from "./types";

type SampleSeed = {
  symbol: string;
  occurredAt: string;
  entry: number;
  exit: number;
  quantity: number;
  setup: string;
  strategy: string;
  followedPlan: boolean;
  respectedStop: boolean;
  reviewed: boolean;
};

const sampleSeeds: SampleSeed[] = [
  {
    symbol: "DMOA",
    occurredAt: "2026-05-22T14:48:00.000Z",
    entry: 100,
    exit: 100.5,
    quantity: 1,
    setup: "Opening-range pullback",
    strategy: "Trend continuation",
    followedPlan: true,
    respectedStop: true,
    reviewed: true,
  },
  {
    symbol: "DMOB",
    occurredAt: "2026-05-29T15:21:00.000Z",
    entry: 100,
    exit: 99.6,
    quantity: 1,
    setup: "Failed breakout",
    strategy: "Breakout",
    followedPlan: true,
    respectedStop: true,
    reviewed: true,
  },
  {
    symbol: "DMOC",
    occurredAt: "2026-06-05T15:02:00.000Z",
    entry: 50,
    exit: 50.3,
    quantity: 2,
    setup: "VWAP reclaim",
    strategy: "Trend continuation",
    followedPlan: true,
    respectedStop: true,
    reviewed: true,
  },
  {
    symbol: "DMOD",
    occurredAt: "2026-06-12T16:34:00.000Z",
    entry: 25,
    exit: 24.8,
    quantity: 4,
    setup: "Opening-range pullback",
    strategy: "Mean reversion",
    followedPlan: false,
    respectedStop: false,
    reviewed: true,
  },
  {
    symbol: "DMOE",
    occurredAt: "2026-06-19T14:57:00.000Z",
    entry: 20,
    exit: 20.24,
    quantity: 5,
    setup: "VWAP reclaim",
    strategy: "Trend continuation",
    followedPlan: true,
    respectedStop: true,
    reviewed: true,
  },
  {
    symbol: "DMOF",
    occurredAt: "2026-06-26T15:46:00.000Z",
    entry: 40,
    exit: 40.18,
    quantity: 2.5,
    setup: "Range expansion",
    strategy: "Breakout",
    followedPlan: true,
    respectedStop: true,
    reviewed: true,
  },
  {
    symbol: "DMOG",
    occurredAt: "2026-07-03T15:05:00.000Z",
    entry: 10,
    exit: 9.92,
    quantity: 10,
    setup: "Range expansion",
    strategy: "Breakout",
    followedPlan: false,
    respectedStop: true,
    reviewed: true,
  },
  {
    symbol: "DMOH",
    occurredAt: "2026-07-10T15:58:00.000Z",
    entry: 80,
    exit: 80.64,
    quantity: 1.25,
    setup: "Opening-range pullback",
    strategy: "Trend continuation",
    followedPlan: true,
    respectedStop: true,
    reviewed: true,
  },
  {
    symbol: "DMOI",
    occurredAt: "2026-07-17T14:54:00.000Z",
    entry: 16,
    exit: 15.88,
    quantity: 6.25,
    setup: "Failed breakout",
    strategy: "Mean reversion",
    followedPlan: true,
    respectedStop: true,
    reviewed: true,
  },
  {
    symbol: "DMOJ",
    occurredAt: "2026-07-24T16:26:00.000Z",
    entry: 32,
    exit: 32.4,
    quantity: 3.125,
    setup: "VWAP reclaim",
    strategy: "Trend continuation",
    followedPlan: true,
    respectedStop: true,
    reviewed: true,
  },
  {
    symbol: "DMOK",
    occurredAt: "2026-07-31T16:03:00.000Z",
    entry: 12.5,
    exit: 12.62,
    quantity: 8,
    setup: "Opening-range pullback",
    strategy: "Trend continuation",
    followedPlan: true,
    respectedStop: true,
    reviewed: false,
  },
  {
    symbol: "DMOL",
    occurredAt: "2026-08-07T15:14:00.000Z",
    entry: 50,
    exit: 50.55,
    quantity: 2,
    setup: "Range expansion",
    strategy: "Breakout",
    followedPlan: true,
    respectedStop: true,
    reviewed: false,
  },
];

function sampleReview(seed: SampleSeed, netPnl: number): TradeReview {
  const strongProcess = seed.followedPlan && seed.respectedStop;
  return {
    processClassification: strongProcess ? "strong" : "weak",
    outcome: netPnl > 0 ? "profitable" : netPnl < 0 ? "losing" : "flat",
    processScore: strongProcess ? 90 : 55,
    dataQuality: "complete",
    strength: strongProcess
      ? "The synthetic case preserved the written risk boundary through the exit."
      : "The synthetic case preserves enough evidence to identify the decision break.",
    primaryCorrection: strongProcess
      ? "Repeat the same evidence-first process on a different historical case."
      : "Pause after invalidation and require a new, timestamped plan before another decision.",
    evidence: [
      "Synthetic documentation case",
      `Plan followed: ${seed.followedPlan ? "yes" : "no"}`,
      `Risk boundary respected: ${seed.respectedStop ? "yes" : "no"}`,
    ],
    assignedLessonId: strongProcess ? "builtin-tf-009" : "builtin-pb-006",
  };
}

function sampleJournal(seed: SampleSeed): JournalReflection {
  if (!seed.reviewed)
    return {
      status: "needs_review",
      setup: seed.setup,
      strategy: seed.strategy,
      marketContext: "Synthetic historical practice context; no market claim.",
      entryReason:
        "A fictional trigger was recorded before the sample outcome.",
      exitReason: "The fictional exit followed the case boundary.",
      whatWentWell: "Execution facts and decision facts remain separate.",
      whatToImprove:
        "Complete the reflection before drawing a pattern conclusion.",
      emotionBefore: "Focused",
      emotionAfter: "Neutral",
      focusRating: 4,
      confidenceRating: 3,
      tags: ["synthetic", "practice"],
      mistakes: [],
      lessonsLearned: "A result is not enough to score a decision.",
      preTradeChecklist: { triggerWritten: true, riskDefined: true },
      postTradeChecklist: { respectedRisk: seed.respectedStop },
      screenshotRefs: [],
      reviewedAt: null,
    };

  return {
    status: "reviewed",
    setup: seed.setup,
    strategy: seed.strategy,
    marketContext: "Synthetic historical practice context; no market claim.",
    entryReason: "The fictional case met its written eligibility gate.",
    exitReason: seed.respectedStop
      ? "The fictional exit followed the prewritten boundary."
      : "The fictional exit occurred after the boundary should have ended the decision.",
    whatWentWell:
      "The review separates process quality from the recorded outcome.",
    whatToImprove: seed.followedPlan
      ? "Test the same rule on an unseen historical case."
      : "Require a fresh plan after invalidation instead of carrying the earlier thesis forward.",
    emotionBefore: "Focused",
    emotionAfter: seed.respectedStop ? "Neutral" : "Frustrated",
    focusRating: seed.respectedStop ? 4 : 3,
    confidenceRating: 3,
    tags: ["synthetic", seed.strategy.toLowerCase().replaceAll(" ", "-")],
    mistakes: seed.followedPlan ? [] : ["Departed from the fictional plan"],
    lessonsLearned:
      "Process evidence remains useful whether the fictional outcome wins or loses.",
    preTradeChecklist: { triggerWritten: true, riskDefined: true },
    postTradeChecklist: {
      followedEntry: seed.followedPlan,
      respectedRisk: seed.respectedStop,
    },
    screenshotRefs: [],
    reviewedAt: seed.occurredAt,
  };
}

export function guidedJournalSample(): Trade[] {
  return sampleSeeds.map((seed, index) => {
    const netPnl = (seed.exit - seed.entry) * seed.quantity;
    return {
      id: `guided-journal-${index + 1}`,
      symbol: seed.symbol,
      side: "long",
      entry: seed.entry.toString(),
      exit: seed.exit.toString(),
      quantity: seed.quantity.toString(),
      fees: "0",
      planId: seed.followedPlan ? `guided-plan-${index + 1}` : null,
      followedPlan: seed.followedPlan,
      respectedStop: seed.respectedStop,
      notes:
        "Synthetic guided-journal example. Not a brokerage record or market-data claim.",
      occurredAt: seed.occurredAt,
      grossPnl: netPnl.toFixed(2),
      netPnl: netPnl.toFixed(2),
      rMultiple: netPnl.toFixed(2),
      review: sampleReview(seed, netPnl),
      importSource: "manual",
      sourceId: `synthetic-guided-journal-${index + 1}`,
      entryAt: seed.occurredAt,
      exitAt: seed.occurredAt,
      holdingSeconds: 900 + index * 90,
      orderType: "Synthetic limit → limit",
      journal: sampleJournal(seed),
    };
  });
}
