import type {
  AiJournalEvidencePackage,
  ExternalAiJournalEntry,
} from "./ai-journal";
import type { FidelityOrderEvidence } from "./fidelity-import";
import type {
  ConsolidatedTradingRule,
  Trade,
  TradeLearningKnowledgeItem,
  TradeLearningPattern,
  TradeLearningSystem,
  TradeLessonAudit,
  TradeLessonConfidence,
  TradeLessonConnection,
  TradeLessonPriority,
} from "./types";

type EvidenceDay = AiJournalEvidencePackage["days"][number];
type EvidenceTrade = EvidenceDay["trades"][number];

type TradeSignal = {
  day: EvidenceDay;
  evidence: EvidenceTrade;
  journal: ExternalAiJournalEntry;
  appTrade: Trade | null;
  buyOrders: FidelityOrderEvidence[];
  sellOrders: FidelityOrderEvidence[];
  priorSameSymbol: TradeSignal | null;
  rapidReentry: boolean;
  reentryGapSeconds: number | null;
  multiBuy: boolean;
  lowerPricedAdd: boolean;
  favorableToLoss: boolean;
  ultraShort: boolean;
  strategyCohort: "lower-range" | "upper-range" | "vwap-area" | "other";
  patternIds: string[];
};

const priorityOrder: Record<TradeLessonPriority, number> = {
  "Critical immediate correction": 0,
  "High-priority improvement": 1,
  "Important reinforcement": 2,
  "Minor refinement": 3,
  "Informational only": 4,
};

function round(value: number, precision = 2) {
  return Number(value.toFixed(precision));
}

function dollars(value: number) {
  return `${value < 0 ? "-" : ""}$${Math.abs(value).toFixed(2)}`;
}

function signedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function duration(seconds: number) {
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes < 60) return `${minutes}m${remainder ? ` ${remainder}s` : ""}`;
  const hours = Math.floor(minutes / 60);
  const minuteRemainder = minutes % 60;
  return `${hours}h${minuteRemainder ? ` ${minuteRemainder}m` : ""}`;
}

function timeParts(timestamp: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
}

function compactTime(timestamp: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(new Date(timestamp))
    .reduce<Record<string, string>>((result, part) => {
      if (part.type !== "literal") result[part.type] = part.value;
      return result;
    }, {});
  return `${parts.hour}${parts.minute}${parts.second}`;
}

function displayId(evidence: EvidenceTrade, date: string) {
  return `${evidence.symbol}-${date.replaceAll("-", "")}-${compactTime(evidence.observed.entryAt)}`;
}

function grossReturnPercent(evidence: EvidenceTrade) {
  return evidence.calculated.investedDollars
    ? round(
        (evidence.calculated.grossPnl / evidence.calculated.investedDollars) *
          100,
      )
    : 0;
}

function vwapDeltaPercent(evidence: EvidenceTrade) {
  const vwap = evidence.chartContext.entryVwap;
  if (!vwap) return null;
  return round(((evidence.calculated.entryPrice - vwap) / vwap) * 100);
}

function strategyCohort(
  evidence: EvidenceTrade,
): TradeSignal["strategyCohort"] {
  const location = evidence.chartContext.entryLocationPercent;
  const vwapDelta = vwapDeltaPercent(evidence);
  if (
    (location !== null && location <= 30) ||
    (vwapDelta !== null && vwapDelta <= -1)
  )
    return "lower-range";
  if (
    (location !== null && location >= 70) ||
    (vwapDelta !== null && vwapDelta >= 1)
  )
    return "upper-range";
  if (vwapDelta !== null && Math.abs(vwapDelta) < 1) return "vwap-area";
  return "other";
}

function buildSignals(
  evidencePackage: AiJournalEvidencePackage,
  journalEntries: ExternalAiJournalEntry[],
  appTrades: Trade[],
) {
  const entryBySourceId = new Map(
    journalEntries.map((entry) => [entry.tradeSourceId, entry]),
  );
  const appTradeBySourceId = new Map(
    appTrades
      .filter((trade) => trade.sourceId)
      .map((trade) => [trade.sourceId!, trade]),
  );
  const signals: TradeSignal[] = [];
  for (const day of evidencePackage.days) {
    const orderByRef = new Map(
      day.observed.orders.map((order) => [order.evidenceRef, order]),
    );
    for (const evidence of day.trades) {
      const journal = entryBySourceId.get(evidence.tradeSourceId);
      if (!journal) continue;
      const linkedOrders = evidence.observed.orderEvidenceRefs.flatMap(
        (ref) => {
          const order = orderByRef.get(ref);
          return order ? [order] : [];
        },
      );
      const buyOrders = linkedOrders
        .filter((order) => order.action === "buy")
        .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
      const sellOrders = linkedOrders
        .filter((order) => order.action === "sell")
        .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
      const firstBuyPrice =
        buyOrders[0]?.price ?? evidence.calculated.entryPrice;
      const lowerPricedAdd = buyOrders
        .slice(1)
        .some((order) => order.price < firstBuyPrice * 0.995);
      const favorableToLoss =
        evidence.calculated.grossPnl < 0 &&
        (evidence.chartContext.maximumFavorableExcursionPercent ?? 0) > 0.25;
      signals.push({
        day,
        evidence,
        journal,
        appTrade: appTradeBySourceId.get(evidence.tradeSourceId) ?? null,
        buyOrders,
        sellOrders,
        priorSameSymbol: null,
        rapidReentry: false,
        reentryGapSeconds: null,
        multiBuy: buyOrders.length > 1,
        lowerPricedAdd,
        favorableToLoss,
        ultraShort: evidence.calculated.holdingSeconds <= 30,
        strategyCohort: strategyCohort(evidence),
        patternIds: [],
      });
    }
  }
  const chronological = [...signals].sort((left, right) =>
    left.evidence.observed.entryAt.localeCompare(
      right.evidence.observed.entryAt,
    ),
  );
  const latestByDayAndSymbol = new Map<string, TradeSignal>();
  for (const signal of chronological) {
    const key = `${signal.day.date}|${signal.evidence.symbol}`;
    const previous = latestByDayAndSymbol.get(key) ?? null;
    signal.priorSameSymbol = previous;
    if (previous) {
      const gap = Math.round(
        (new Date(signal.evidence.observed.entryAt).getTime() -
          new Date(previous.evidence.observed.exitAt).getTime()) /
          1_000,
      );
      signal.reentryGapSeconds = gap;
      signal.rapidReentry = gap >= 0 && gap <= 300;
    }
    latestByDayAndSymbol.set(key, signal);
  }
  for (const signal of signals) {
    const patterns = ["decision-record-missing", "complete-chart-evidence"];
    if (signal.lowerPricedAdd) patterns.push("lower-priced-add");
    if (signal.rapidReentry) patterns.push("rapid-reentry");
    if (signal.favorableToLoss) patterns.push("favorable-to-loss");
    if (signal.ultraShort) patterns.push("ultra-short-decision");
    if (signal.evidence.calculated.reconciliationConfidence === "review")
      patterns.push("reconciliation-review");
    patterns.push(`strategy-${signal.strategyCohort}`);
    signal.patternIds = patterns;
  }
  return signals.sort((left, right) =>
    right.evidence.observed.entryAt.localeCompare(
      left.evidence.observed.entryAt,
    ),
  );
}

function riskObservation(signal: TradeSignal) {
  const { evidence } = signal;
  const parts = [
    `No timestamped pre-trade thesis, stop, invalidation, target, or maximum planned loss is linked to this record, so risk-to-reward and plan adherence cannot be scored.`,
  ];
  if (signal.lowerPricedAdd) {
    const first = signal.buyOrders[0];
    const lower = signal.buyOrders.find(
      (order, index) => index > 0 && order.price < first.price * 0.995,
    );
    parts.push(
      `A later buy occurred below the first recorded buy${lower ? ` (${first.price.toFixed(4)} to ${lower.price.toFixed(4)})` : ""}, but no prewritten tranche schedule or shared invalidation is available to show that the add was planned.`,
    );
  }
  if (signal.rapidReentry && signal.priorSameSymbol)
    parts.push(
      `The position reopened ${signal.reentryGapSeconds} seconds after the previous ${evidence.symbol} exit without a stored reset note or new-thesis record.`,
    );
  if (signal.favorableToLoss)
    parts.push(
      `The one-minute replay later measured ${signedPercent(evidence.chartContext.maximumFavorableExcursionPercent ?? 0)} favorable excursion before a ${signedPercent(grossReturnPercent(evidence))} gross result, but no contemporaneous exit rule is available to explain whether that path followed the plan.`,
    );
  if (signal.evidence.calculated.reconciliationConfidence === "review")
    parts.push(
      "The quantity relationship remains marked for reconciliation, so quantity and P&L should not be treated as final until the fills are checked.",
    );
  return parts;
}

function priorityFor(
  signal: TradeSignal,
  sequence: number,
): TradeLessonPriority {
  if (sequence === 1) return "Critical immediate correction";
  if (
    signal.lowerPricedAdd ||
    signal.favorableToLoss ||
    signal.evidence.calculated.reconciliationConfidence === "review" ||
    (signal.rapidReentry &&
      (signal.priorSameSymbol?.evidence.calculated.grossPnl ?? 0) < 0)
  )
    return "High-priority improvement";
  if (signal.rapidReentry || signal.ultraShort)
    return "Important reinforcement";
  return "Minor refinement";
}

function revisedLesson(signal: TradeSignal, isNewest: boolean) {
  const { evidence } = signal;
  const returnPercent = grossReturnPercent(evidence);
  const firstBuy = signal.buyOrders[0];
  const lowerBuy = signal.buyOrders.find(
    (order, index) =>
      index > 0 && firstBuy && order.price < firstBuy.price * 0.995,
  );
  const observationParts = [
    `${dollars(evidence.calculated.investedDollars)} was reconstructed into ${evidence.calculated.quantityShares.toFixed(6)} shares, held for ${duration(evidence.calculated.holdingSeconds)}, and closed for ${dollars(evidence.calculated.grossPnl)} gross P&L (${signedPercent(returnPercent)}) before fees.`,
  ];
  if (lowerBuy && firstBuy)
    observationParts.push(
      `The order evidence contains ${signal.buyOrders.length} buy fills, including a later fill at ${lowerBuy.price.toFixed(4)} below the first fill at ${firstBuy.price.toFixed(4)}.`,
    );
  if (signal.favorableToLoss)
    observationParts.push(
      `Retrospective one-minute replay measured ${signedPercent(evidence.chartContext.maximumFavorableExcursionPercent ?? 0)} MFE and ${signedPercent(evidence.chartContext.maximumAdverseExcursionPercent ?? 0)} MAE; those are after-the-fact review measurements, not proof that either candle extreme was executable.`,
    );

  let decisionErrorOrStrength =
    "The trade is not process-scorable because the exports contain no timestamped trigger, invalidation, maximum loss, or exit rule. The strength is that the fills and chart evidence make the missing decision record visible.";
  let underlyingCause =
    "The defensible root cause is a missing decision-evidence system, not a presumed emotion. Without a plan captured before the result, later review cannot distinguish discipline from improvisation.";
  let correctPrinciple =
    "Decision quality requires a falsifiable thesis, invalidation, risk limit, and management rule written before exposure. P&L cannot substitute for that evidence.";
  let futureRule =
    "No completed Decision Card means no new practice or live entry. The card must contain trigger, invalidation, maximum planned loss, exit response, and no-trade conditions before the first fill.";
  let trigger =
    "Apply whenever an order ticket is about to be submitted and no locked plan is linked to the symbol and setup.";
  let verification =
    "Compliance exists only when the plan timestamp precedes the first fill and every later action can be mapped to a prewritten condition.";
  let practice = `Replay ${evidence.symbol} with the outcome hidden, lock a Decision Card before the entry bar, and score trigger, invalidation, risk, and exit adherence separately from the synthetic result.`;

  if (signal.lowerPricedAdd) {
    decisionErrorOrStrength =
      "The later lower-priced buy is not automatically wrong, but it is unscorable because no prewritten tranche map, total risk cap, or shared invalidation was captured. A lower price alone cannot validate an add.";
    underlyingCause =
      "The evidence points to missing scale-in governance: the position was managed as multiple transactions without a preserved one-position risk plan. It does not prove hope, revenge, or loss aversion.";
    correctPrinciple =
      "Scaling creates one combined position with one maximum loss and one invalidation. A cheaper fill changes cost basis; it does not create confirming evidence.";
    futureRule =
      "Do not add below the first fill unless every tranche, the total dollar cap, the combined stop, and the evidence required for the add were written before the first order.";
    trigger =
      "Apply before any second buy in the same position, especially when the proposed fill is below the first fill or the thesis is already under pressure.";
    verification =
      "The original timestamped plan must name the additional tranche and the post-add maximum loss; otherwise the add is classified as unplanned and the correct action is no add.";
    practice = `Use Chart Replay on ${evidence.symbol}; write a two-tranche plan before reveal, reject every add that lacks fresh confirming evidence, and calculate combined risk before allowing the simulated order.`;
  }
  if (signal.rapidReentry) {
    futureRule +=
      " After an exit, a same-symbol re-entry is a new decision and requires a completed reset line stating what changed, whether the thesis is new, and how much risk budget remains.";
    verification +=
      " Re-entry compliance requires a timestamped reset note created after the prior exit and before the next fill.";
  }
  if (signal.favorableToLoss) {
    correctPrinciple +=
      " MFE is a retrospective diagnostic, not a demand to sell at the high; the actionable correction is to predefine what happens at target, invalidation, and time stop.";
    futureRule +=
      " Before entry, choose the objective exit response for target, invalidation, and time expiration; do not invent the response after price has moved.";
    practice +=
      " Mark the first bar that satisfied the planned exit condition, then compare the actual exit without using the later candle extreme as an assumed fill.";
  }
  if (isNewest) {
    underlyingCause +=
      " This latest record deserves immediate attention because it combines lower-priced adding, a long holding window, and a favorable-to-negative path in the newest available evidence.";
  }
  return {
    observation: observationParts.join(" "),
    decisionErrorOrStrength,
    underlyingCause,
    correctPrinciple,
    futureRule,
    trigger,
    verification,
    practice,
  };
}

function checklistQuestions(signal: TradeSignal) {
  if (signal.lowerPricedAdd)
    return {
      preTrade:
        "Are every planned tranche, the combined invalidation, and the maximum total loss written before the first fill?",
      inTrade:
        "Before this add, is fresh confirming evidence present and does combined risk remain inside the original cap?",
      postTrade:
        "Can I point to a timestamped pre-entry line that authorized each fill and the final exit?",
    };
  if (signal.rapidReentry)
    return {
      preTrade:
        "Is this a genuinely new thesis, and have I written what changed since the previous exit?",
      inTrade:
        "Does this position still satisfy the new trigger without borrowing justification from the previous attempt?",
      postTrade:
        "Was the reset note completed before the re-entry, regardless of the second outcome?",
    };
  if (signal.favorableToLoss)
    return {
      preTrade:
        "What exact target, invalidation, and time-stop response will govern this position?",
      inTrade:
        "Which prewritten exit condition is currently active, and has it objectively fired?",
      postTrade:
        "Did the exit follow the written rule, or am I evaluating it only against hindsight MFE?",
    };
  return {
    preTrade:
      "Can I state the trigger, invalidation, maximum loss, and exit response before submitting the order?",
    inTrade:
      "Is the original evidence still valid, and which written condition governs the next action?",
    postTrade:
      "Would I score this decision the same way if the P&L were hidden?",
  };
}

function confidenceFor(signal: TradeSignal): {
  confidence: TradeLessonConfidence;
  rationale: string;
} {
  if (signal.evidence.calculated.reconciliationConfidence === "review")
    return {
      confidence: "Strongly supported",
      rationale:
        "The order sequence, timing, chart pairing, and reconciliation warning are directly present, but exact quantity conclusions remain conditional on resolving the fills.",
    };
  if (signal.lowerPricedAdd || signal.rapidReentry || signal.favorableToLoss)
    return {
      confidence: "Strongly supported",
      rationale:
        "The observable order timing and calculated chart measurements support the process gap. Strategy intent and psychology remain unconfirmed.",
    };
  return {
    confidence: "Possible",
    rationale:
      "Execution and chart facts are available, but the missing contemporaneous plan prevents a confident conclusion about strategy quality, intent, or emotion.",
  };
}

function initialAudit(signal: TradeSignal, sequence: number): TradeLessonAudit {
  const { evidence, day, journal } = signal;
  const returnPercent = grossReturnPercent(evidence);
  const questions = checklistQuestions(signal);
  const revised = revisedLesson(signal, sequence === 1);
  const confidence = confidenceFor(signal);
  const firstBuy = signal.buyOrders[0];
  const laterBuys = signal.buyOrders.slice(1);
  const entryVwapDelta = vwapDeltaPercent(evidence);
  const atEntry = [
    `${dollars(evidence.calculated.investedDollars)} total invested dollars were reconstructed at an average entry of ${evidence.calculated.entryPrice.toFixed(4)}.`,
  ];
  if (firstBuy)
    atEntry.push(
      `The first linked buy filled at ${firstBuy.price.toFixed(4)} at ${timeParts(firstBuy.occurredAt)} ET.`,
    );
  if (entryVwapDelta !== null)
    atEntry.push(
      `A retrospective calculation using one-minute bars through entry places average entry ${signedPercent(entryVwapDelta)} relative to cumulative VWAP; the export does not prove the trader used VWAP.`,
    );
  const during = [
    `The reconstructed position remained open for ${duration(evidence.calculated.holdingSeconds)} with ${evidence.observed.entryFillCount} entry fill(s) and ${evidence.observed.exitFillCount} exit fill(s).`,
  ];
  if (laterBuys.length)
    during.push(
      ...laterBuys.map(
        (order) =>
          `An additional buy filled for ${dollars(order.filled)} at ${order.price.toFixed(4)} at ${timeParts(order.occurredAt)} ET.`,
      ),
    );
  if (signal.sellOrders.length)
    during.push(
      `Linked sell evidence spans ${signal.sellOrders.length} fill(s), ending at ${timeParts(evidence.observed.exitAt)} ET.`,
    );
  const afterward = [
    `Calculated gross P&L was ${dollars(evidence.calculated.grossPnl)} (${signedPercent(returnPercent)}) before fees.`,
    `The full-session chart later placed the average entry at ${evidence.chartContext.entryLocationPercent?.toFixed(1) ?? "an unknown"}% of the day range; this is hindsight context and was not fully knowable at entry.`,
    `The reconstructed holding window later measured ${evidence.chartContext.maximumFavorableExcursionPercent === null ? "unknown" : signedPercent(evidence.chartContext.maximumFavorableExcursionPercent)} MFE and ${evidence.chartContext.maximumAdverseExcursionPercent === null ? "unknown" : signedPercent(evidence.chartContext.maximumAdverseExcursionPercent)} MAE on one-minute candles.`,
  ];
  const well = [
    "The Fidelity orders were preserved and paired with a same-day one-minute chart, making the execution replayable.",
    "The position has a reconstructed closing transaction rather than an unbounded open record.",
  ];
  if (evidence.calculated.reconciliationConfidence === "high")
    well.push(
      "The share relationship reconciles with high confidence, which improves the reliability of the calculated position facts.",
    );
  else
    well.push(
      "The reconciliation limitation is exposed instead of being hidden behind false precision.",
    );
  const poor = riskObservation(signal);
  const patternFocus = signal.lowerPricedAdd
    ? "lower-priced adding and combined-position risk"
    : signal.rapidReentry
      ? "rapid re-entry without a documented reset gate"
      : signal.favorableToLoss
        ? "exit governance after favorable movement"
        : signal.ultraShort
          ? "decision evidence for a sub-minute holding window"
          : "the missing pre-trade decision record";
  const originalLesson =
    signal.appTrade?.journal?.lessonsLearned?.trim() || journal.lessonsLearned;
  return {
    id: `trade-lesson:${evidence.tradeSourceId}`,
    sequence,
    tradeSourceId: evidence.tradeSourceId,
    appTradeId: signal.appTrade?.id ?? null,
    displayId: displayId(evidence, day.date),
    tradingDate: day.date,
    symbol: evidence.symbol,
    entryAt: evidence.observed.entryAt,
    exitAt: evidence.observed.exitAt,
    reviewedAt: null,
    priority: priorityFor(signal, sequence),
    patternIds: signal.patternIds,
    facts: {
      investedDollars: round(evidence.calculated.investedDollars, 6),
      calculatedQuantityShares: round(evidence.calculated.quantityShares, 6),
      entryPrice: round(evidence.calculated.entryPrice, 6),
      exitPrice: round(evidence.calculated.exitPrice, 6),
      calculatedGrossPnl: round(evidence.calculated.grossPnl, 6),
      calculatedGrossReturnPercent: returnPercent,
      holdingSeconds: evidence.calculated.holdingSeconds,
      entryFillCount: evidence.observed.entryFillCount,
      exitFillCount: evidence.observed.exitFillCount,
      reconciliationConfidence: evidence.calculated.reconciliationConfidence,
      entryLocationPercent: evidence.chartContext.entryLocationPercent,
      entryVwap: evidence.chartContext.entryVwap,
      maximumFavorableExcursionPercent:
        evidence.chartContext.maximumFavorableExcursionPercent,
      maximumAdverseExcursionPercent:
        evidence.chartContext.maximumAdverseExcursionPercent,
    },
    temporalEvidence: {
      knownBeforeEntry: signal.appTrade?.planId
        ? [
            "A linked pre-trade plan exists in the application; review its timestamp and fields against the fills.",
          ]
        : [
            "No timestamped pre-trade thesis, trigger, invalidation, stop, target, scale plan, or maximum planned loss is stored with this trade.",
          ],
      observedAtEntry: atEntry,
      occurredDuringTrade: during,
      knownOnlyAfterward: afterward,
      missing: [
        "The trader’s actual thesis, confirmation, stop, target, planned risk, and intended holding period are not present in the Fidelity exports.",
        "The exports do not reveal private thoughts, emotion, broader-market screens, news, spread, Level II, or whether a chart-derived strategy label matches the trader’s intent.",
        "One-minute candles do not reveal the exact sub-minute path or guarantee execution at candle extremes.",
      ],
    },
    tradeSummary: `Long ${evidence.symbol} opened at ${timeParts(evidence.observed.entryAt)} ET, used ${dollars(evidence.calculated.investedDollars)}, held ${duration(evidence.calculated.holdingSeconds)}, and closed at ${timeParts(evidence.observed.exitAt)} ET for ${dollars(evidence.calculated.grossPnl)} calculated gross P&L before fees. The result does not score the decision process.`,
    originalThesis: `No contemporaneous thesis was recorded. The existing external-AI journal draft offers this low-confidence interpretation for learner review: ${journal.entryReason.statement}`,
    whatWasDoneWell: well,
    whatWasDonePoorly: poor,
    originalLesson,
    lessonAudit: `The original lesson is specific to ${evidence.symbol} and its timestamps, asks for outcome-hidden replay, and correctly tells the learner to verify the suggested strategy label. It is incomplete because it uses a repeated replay template, does not isolate ${patternFocus}, does not define measurable compliance, and does not connect this occurrence to the wider history. The revised lesson keeps the replay strength while replacing vague reflection with an observable rule and verification artifact.`,
    revisedLesson: revised,
    actionableTradingRule: revised.futureRule,
    preTradeChecklistQuestion: questions.preTrade,
    inTradeCheckpoint: questions.inTrade,
    postTradeReviewQuestion: questions.postTrade,
    evidenceAndConfidence: {
      ...confidence,
      evidenceRefs: [
        evidence.evidenceRef,
        ...evidence.observed.orderEvidenceRefs,
        ...(evidence.chartContext.available
          ? [evidence.chartContext.evidenceRef]
          : []),
        day.dayEvidenceRef,
      ],
    },
    connections: [],
  };
}

function meaningfulPatterns(signal: TradeSignal) {
  return signal.patternIds.filter(
    (pattern) =>
      !["decision-record-missing", "complete-chart-evidence"].includes(
        pattern,
      ) && !pattern.startsWith("strategy-"),
  );
}

function connectionBetween(
  current: TradeSignal,
  candidate: TradeSignal,
): TradeLessonConnection {
  const currentPatterns = new Set(meaningfulPatterns(current));
  const shared = meaningfulPatterns(candidate).filter((pattern) =>
    currentPatterns.has(pattern),
  );
  const outcomesDiffer =
    Math.sign(current.evidence.calculated.grossPnl) !==
    Math.sign(candidate.evidence.calculated.grossPnl);
  const relationship: TradeLessonConnection["relationship"] = shared.length
    ? outcomesDiffer
      ? "refines"
      : "reinforces"
    : "adds context";
  const labels = shared.map((pattern) => pattern.replaceAll("-", " "));
  return {
    tradeSourceId: candidate.evidence.tradeSourceId,
    displayId: displayId(candidate.evidence, candidate.day.date),
    tradingDate: candidate.day.date,
    symbol: candidate.evidence.symbol,
    relationship,
    explanation: shared.length
      ? `Both records contain ${labels.join(" and ")}. ${outcomesDiffer ? "Their different gross outcomes show why the rule must be judged by prewritten process evidence rather than P&L." : "The repeated mechanism supports treating this as a process pattern rather than an isolated result."}`
      : `This ${candidate.evidence.symbol} record adds nearby sequence context, but the available evidence does not justify calling it the same mistake.`,
  };
}

function connectAudits(audits: TradeLessonAudit[], signals: TradeSignal[]) {
  return audits.map((audit, index) => {
    const current = signals[index];
    const currentPatterns = new Set(meaningfulPatterns(current));
    const score = (candidate: TradeSignal) => {
      const shared = meaningfulPatterns(candidate).filter((pattern) =>
        currentPatterns.has(pattern),
      ).length;
      return (
        shared * 10 +
        (candidate.evidence.symbol === current.evidence.symbol ? 2 : 0)
      );
    };
    const choose = (candidates: TradeSignal[]) =>
      [...candidates]
        .map((candidate) => ({ candidate, score: score(candidate) }))
        .filter((item) => item.score > 0)
        .sort((left, right) => right.score - left.score)[0]?.candidate ?? null;
    const newer = choose(signals.slice(0, index));
    const older = choose(signals.slice(index + 1));
    const selected: TradeSignal[] = [];
    if (newer) selected.push(newer);
    if (older && older !== newer) selected.push(older);
    if (index === 0 && current.lowerPricedAdd) {
      const earliestLowerAdd = [...signals]
        .reverse()
        .find((signal) => signal.lowerPricedAdd);
      if (
        earliestLowerAdd &&
        earliestLowerAdd !== current &&
        !selected.includes(earliestLowerAdd)
      )
        selected.push(earliestLowerAdd);
    }
    if (!selected.length) {
      const adjacent = signals[index + 1] ?? signals[index - 1];
      if (adjacent) selected.push(adjacent);
    }
    return {
      ...audit,
      connections: selected
        .slice(0, 3)
        .map((candidate) => connectionBetween(current, candidate)),
    };
  });
}

type PatternDefinition = Omit<
  TradeLearningPattern,
  | "occurrences"
  | "tradeSourceIds"
  | "earliestOccurrence"
  | "mostRecentOccurrence"
  | "frequencyDirection"
> & {
  matches(signal: TradeSignal): boolean;
};

function trendFor(matches: TradeSignal[], allSignals: TradeSignal[]) {
  if (allSignals.length < 10 || matches.length < 2)
    return "insufficient" as const;
  const chronological = [...allSignals].reverse();
  const middle = Math.floor(chronological.length / 2);
  const older = chronological.slice(0, middle);
  const newer = chronological.slice(middle);
  const ids = new Set(matches.map((signal) => signal.evidence.tradeSourceId));
  const olderRate =
    older.filter((signal) => ids.has(signal.evidence.tradeSourceId)).length /
    older.length;
  const newerRate =
    newer.filter((signal) => ids.has(signal.evidence.tradeSourceId)).length /
    newer.length;
  if (newerRate - olderRate >= 0.1) return "increasing" as const;
  if (olderRate - newerRate >= 0.1) return "decreasing" as const;
  return "stable" as const;
}

function buildPatterns(signals: TradeSignal[]): TradeLearningPattern[] {
  const definitions: PatternDefinition[] = [
    {
      id: "decision-record-missing",
      title: "No timestamped decision record",
      category: "planning",
      sharedMechanism:
        "Execution exists without a linked pre-entry thesis, trigger, invalidation, maximum planned loss, and exit response.",
      typicalTrigger: "An order is submitted before a Decision Card is locked.",
      typicalConsequence:
        "The decision becomes unscorable, and hindsight or outcome can replace process evidence during review.",
      existingLessonOrRule:
        "The current journal drafts repeatedly ask for trigger, invalidation, and exit evidence during replay.",
      implementationEvidence:
        "No record in this evidence package contains a linked timestamped plan. Because the lessons were generated retrospectively, the history cannot prove that a known rule was deliberately ignored.",
      bestCorrectiveAction:
        "Require a locked Decision Card before every new entry and measure plan coverage, not intention.",
      confidence: "Confirmed",
      matches: (signal) => !signal.appTrade?.planId,
    },
    {
      id: "lower-priced-add",
      title: "Lower-priced adding without preserved scale governance",
      category: "risk",
      sharedMechanism:
        "A later buy fills below the first linked buy while no prewritten tranche schedule, combined stop, or total loss cap is stored.",
      typicalTrigger:
        "Price moves below the initial fill and another buy is submitted.",
      typicalConsequence:
        "Cost basis improves while exposure and decision ambiguity increase; a losing thesis can become a recovery project.",
      existingLessonOrRule:
        "Treat all tranches as one position with one invalidation and one maximum loss.",
      implementationEvidence:
        "The behavior is concentrated in the newer half of the history, so there is no evidence yet that the scale-in rule has been implemented consistently.",
      bestCorrectiveAction:
        "Prohibit any unplanned add below the first fill; practice prewritten two-tranche plans in replay before applying them elsewhere.",
      confidence: "Strongly supported",
      matches: (signal) => signal.lowerPricedAdd,
    },
    {
      id: "rapid-reentry",
      title: "Rapid same-symbol re-entry without a documented reset",
      category: "behavior",
      sharedMechanism:
        "The same symbol is reopened within five minutes of an exit without a stored explanation of what changed.",
      typicalTrigger:
        "A recent exit is followed by another perceived opportunity in the same symbol.",
      typicalConsequence:
        "Separate setups can blur into one continuous episode, making risk budget, thesis identity, and learning evidence unclear.",
      existingLessonOrRule:
        "Every re-entry is a new decision and requires a reset note, fresh trigger, and remaining-risk check.",
      implementationEvidence:
        "The rate is similar across the older and newer halves, so no sustained reduction is visible.",
      bestCorrectiveAction:
        "Block re-entry until the reset line is completed; elapsed time alone does not count as a reset.",
      confidence: "Confirmed",
      matches: (signal) => signal.rapidReentry,
    },
    {
      id: "favorable-to-loss",
      title: "Favorable excursion followed by a negative result",
      category: "management",
      sharedMechanism:
        "A one-minute replay shows positive excursion during the reconstructed hold, but the completed trade closes negative and no exit rule is stored.",
      typicalTrigger:
        "The position moves favorably and then retraces while management criteria are missing or unavailable.",
      typicalConsequence:
        "Review can devolve into hindsight demands to sell the high instead of testing whether a prewritten target, invalidation, or time stop was followed.",
      existingLessonOrRule:
        "Write target, invalidation, and time-stop responses before entry; use MFE/MAE only to evaluate the rule afterward.",
      implementationEvidence:
        "Frequency is lower in the newer half, but the pattern appears in the newest trade, so the improvement is incomplete.",
      bestCorrectiveAction:
        "Practice outcome-hidden exit rules and score the first objective trigger rather than the best later candle price.",
      confidence: "Strongly supported",
      matches: (signal) => signal.favorableToLoss,
    },
    {
      id: "ultra-short-decision",
      title: "Sub-30-second decisions without sub-minute evidence",
      category: "management",
      sharedMechanism:
        "The position opens and closes within 30 seconds while the available chart evidence is one-minute resolution.",
      typicalTrigger:
        "A fast price response or immediate perceived invalidation follows entry.",
      typicalConsequence:
        "The exact decision path cannot be reconstructed from the chart, so emotion, confirmation, and exit quality remain unscorable.",
      existingLessonOrRule:
        "Either preserve suitable sub-minute evidence and a fast-playbook rule, or classify the process as insufficient evidence.",
      implementationEvidence:
        "The count declined in the newer half, but longer holding time is not automatically better execution.",
      bestCorrectiveAction:
        "Define the permitted fast-exit trigger before entry and capture the evidence source required to audit it.",
      confidence: "Confirmed",
      matches: (signal) => signal.ultraShort,
    },
    {
      id: "reconciliation-review",
      title: "Complex fills require reconciliation before performance claims",
      category: "data-quality",
      sharedMechanism:
        "The reconstructed quantity retains a material unmatched relationship across filled orders.",
      typicalTrigger:
        "Multiple partial entries and exits create an ambiguous position boundary.",
      typicalConsequence:
        "Quantity, cost basis, and P&L can appear more precise than the source supports.",
      existingLessonOrRule:
        "Resolve fill relationships before using the record in performance statistics or strategy conclusions.",
      implementationEvidence:
        "All current warnings are visibly labeled; that transparency is good, but the source relationship remains unresolved.",
      bestCorrectiveAction:
        "Compare the Fidelity fill list with the reconstructed position and confirm every share before final review.",
      confidence: "Confirmed",
      matches: (signal) =>
        signal.evidence.calculated.reconciliationConfidence === "review",
    },
    {
      id: "complete-chart-evidence",
      title: "Orders are consistently paired with replay evidence",
      category: "strength",
      sharedMechanism:
        "Each reconstructed trade has a matching same-day one-minute chart reference.",
      typicalTrigger:
        "The dated Fidelity folder contains both Orders and chart exports for the symbol.",
      typicalConsequence:
        "The trade can be reviewed against timing, VWAP, range, and excursion context without relying only on memory.",
      existingLessonOrRule:
        "Preserve an Orders export and same-day chart for every completed position.",
      implementationEvidence:
        "Coverage is present across the complete current evidence set.",
      bestCorrectiveAction:
        "Retain this evidence habit and add contemporaneous plans so execution becomes fully process-scorable.",
      confidence: "Confirmed",
      matches: (signal) => signal.evidence.chartContext.available,
    },
  ];
  return definitions.flatMap((definition) => {
    const matches = signals.filter(definition.matches);
    if (!matches.length) return [];
    const chronological = [...matches].sort((left, right) =>
      left.evidence.observed.entryAt.localeCompare(
        right.evidence.observed.entryAt,
      ),
    );
    const { matches: _matches, ...base } = definition;
    return [
      {
        ...base,
        occurrences: matches.length,
        tradeSourceIds: matches.map((signal) => signal.evidence.tradeSourceId),
        earliestOccurrence: chronological[0].day.date,
        mostRecentOccurrence: chronological.at(-1)!.day.date,
        frequencyDirection: trendFor(matches, signals),
      },
    ];
  });
}

function knowledgeHierarchy(counts: {
  total: number;
  lowerRange: number;
  upperRange: number;
  vwap: number;
  lowerAdds: number;
  rapid: number;
  ultra: number;
}) {
  const foundationalPrinciples: TradeLearningKnowledgeItem[] = [
    {
      id: "foundation-decision-evidence",
      title: "A decision must be scorable before it can be improved",
      rule: "Record thesis, trigger, invalidation, maximum planned loss, and exit response before the first fill.",
      appliesWhen: "Every new position or materially new thesis.",
      exception:
        "Emergency action to close accidental or unauthorized exposure does not require delaying the protective exit.",
      evidence: `${counts.total}/${counts.total} current trades lack a linked timestamped plan.`,
    },
    {
      id: "foundation-risk-not-investment",
      title: "Invested dollars are not planned risk",
      rule: "Calculate planned loss from quantity, invalidation distance, slippage, and fees; do not treat the amount invested as the stop-defined loss.",
      appliesWhen: "Sizing every planned equity or ETF position.",
      exception:
        "A deliberately defined total-loss scenario still needs to be written explicitly; it must not be assumed from investment size.",
      evidence:
        "Fidelity exports reveal invested dollars but contain no stop or maximum planned loss for the current trades.",
    },
    {
      id: "foundation-outcome-blind",
      title: "Outcome does not certify the process",
      rule: "Score only information and rules available at decision time; conceal P&L during the first replay pass.",
      appliesWhen: "Every post-trade review.",
      exception:
        "None; outcome may inform statistics after process scoring is complete.",
      evidence:
        "The sample contains positive and negative outcomes across the same recurring execution mechanisms.",
    },
  ];
  const strategySpecificRules: TradeLearningKnowledgeItem[] = [
    {
      id: "strategy-lower-range",
      title: "Lower-range location needs reversal evidence",
      rule: "A lower price or below-VWAP location is context, not a trigger. Name the reversal evidence and structural invalidation before entry.",
      appliesWhen:
        "A proposed long is in the lower portion of the session or below calculated VWAP.",
      exception:
        "A different documented playbook may use another trigger, but it still requires falsifiable evidence and risk.",
      evidence: `${counts.lowerRange} trades fall into the retrospective lower-range cohort.`,
    },
    {
      id: "strategy-upper-range",
      title: "Upper-range momentum needs an extension gate",
      rule: "Define confirmation, acceptable extension, and failed-breakout invalidation before treating upper-range strength as actionable.",
      appliesWhen:
        "A proposed long is near the upper session range or materially above cumulative VWAP.",
      exception:
        "A non-momentum strategy should not inherit this label merely because the entry was high in the later full-day range.",
      evidence: `${counts.upperRange} trades fall into the retrospective upper-range cohort.`,
    },
    {
      id: "strategy-vwap",
      title: "VWAP matters only if it was part of the plan",
      rule: "Name whether VWAP is support, resistance, reclaim, rejection, or irrelevant before using it to justify an entry.",
      appliesWhen: "The planned setup explicitly uses VWAP.",
      exception:
        "Do not retroactively assign a VWAP setup because average entry happened to be near the calculated line.",
      evidence: `${counts.vwap} trades fall into the retrospective VWAP-area cohort.`,
    },
  ];
  const situationalAdjustments: TradeLearningKnowledgeItem[] = [
    {
      id: "situation-scale-in",
      title: "Multiple fills require one position-level risk map",
      rule: "Predefine each tranche and recompute combined risk before allowing an add.",
      appliesWhen: "More than one buy may belong to the same position.",
      exception:
        "A broker correction or accidental duplicate should be closed and documented, not rationalized as a tranche.",
      evidence: `${counts.lowerAdds} records contain a later buy below the first linked buy.`,
    },
    {
      id: "situation-fast-trade",
      title: "Fast decisions need matching evidence resolution",
      rule: "Use a written fast-playbook trigger and retain evidence fine enough to audit the decision; otherwise mark it not scorable.",
      appliesWhen:
        "The intended holding window can be shorter than one minute.",
      exception:
        "An emergency protective exit can occur immediately and should be labeled as such.",
      evidence: `${counts.ultra} trades lasted 30 seconds or less.`,
    },
  ];
  const personalBehavioralSafeguards: TradeLearningKnowledgeItem[] = [
    {
      id: "safeguard-no-unplanned-add",
      title: "A cheaper price cannot authorize an add",
      rule: "No additional buy below the first fill unless the original locked plan authorized the tranche and total risk remains inside the cap.",
      appliesWhen: "Considering any lower-priced add.",
      exception:
        "Only a preplanned scale with fresh confirming evidence and a shared invalidation qualifies.",
      evidence: `${counts.lowerAdds} lower-priced add relationships appear, concentrated in recent records.`,
    },
    {
      id: "safeguard-reentry-reset",
      title: "Re-entry is a new decision",
      rule: "Do not reopen the same symbol until a reset note states what changed, whether the thesis is new, and the remaining risk budget.",
      appliesWhen:
        "Any same-symbol entry after an exit, especially within five minutes.",
      exception:
        "A prewritten multi-attempt playbook still requires the attempt number and remaining loss budget to be logged.",
      evidence: `${counts.rapid} trades reopened the same symbol within five minutes.`,
    },
  ];
  return {
    foundationalPrinciples,
    strategySpecificRules,
    situationalAdjustments,
    personalBehavioralSafeguards,
  };
}

function consolidatedRules(signals: TradeSignal[]): ConsolidatedTradingRule[] {
  const refs = (predicate: (signal: TradeSignal) => boolean) =>
    signals.filter(predicate).map((signal) => signal.evidence.tradeSourceId);
  return [
    {
      id: "rule-plan-before-entry",
      rule: "No locked Decision Card, no new entry.",
      whyItExists:
        "Every current record lacks enough contemporaneous decision evidence to score thesis, risk, and adherence without hindsight.",
      appliesWhen: "Before the first order for every new position or thesis.",
      doesNotApplyWhen:
        "Closing accidental exposure or executing an urgent protective exit; document the exception afterward.",
      supportingTradeSourceIds: refs((signal) => !signal.appTrade?.planId),
      complianceMeasure:
        "100% of new entries have a plan timestamp earlier than the first fill and contain trigger, invalidation, maximum loss, and exit response.",
    },
    {
      id: "rule-one-position-one-risk",
      rule: "No lower-priced add unless the original plan named the tranche, combined invalidation, and total maximum loss.",
      whyItExists:
        "Recent records increasingly combine multiple lower fills without preserved evidence that exposure expansion was planned.",
      appliesWhen:
        "Before any second or later buy in an existing long position.",
      doesNotApplyWhen:
        "A preplanned scale remains valid, fresh confirmation is present, and combined risk is still below the locked cap.",
      supportingTradeSourceIds: refs((signal) => signal.lowerPricedAdd),
      complianceMeasure:
        "Zero unplanned lower-priced adds across ten outcome-hidden replay or paper cases on at least three separate days.",
    },
    {
      id: "rule-reentry-new-decision",
      rule: "Every same-symbol re-entry requires a completed reset note.",
      whyItExists:
        "Rapid entries repeatedly follow exits, making separate theses and the remaining risk budget unclear.",
      appliesWhen:
        "The symbol has already been exited during the current session.",
      doesNotApplyWhen:
        "There is no exception to recording the attempt; even a preplanned multi-attempt setup must identify the attempt number and remaining budget.",
      supportingTradeSourceIds: refs((signal) => signal.rapidReentry),
      complianceMeasure:
        "100% of re-entries have a note timestamped between prior exit and new entry that states what changed and remaining risk.",
    },
    {
      id: "rule-exit-before-outcome",
      rule: "Write target, invalidation, and time-stop responses before entry; score the first fired condition, not hindsight MFE.",
      whyItExists:
        "Multiple positions show favorable one-minute excursion before a negative close, but no contemporaneous exit rule is available.",
      appliesWhen: "Every planned position.",
      doesNotApplyWhen:
        "An emergency protective exit may occur earlier than planned and should be recorded as a safety exception.",
      supportingTradeSourceIds: refs((signal) => signal.favorableToLoss),
      complianceMeasure:
        "Every review names the prewritten exit condition, the first bar it fired, and whether the actual exit followed it before P&L is revealed.",
    },
    {
      id: "rule-no-lookahead",
      rule: "Separate contemporaneous evidence from full-day range, MFE, MAE, and other post-outcome measurements.",
      whyItExists:
        "Full-session chart measurements are useful for review but were not fully available when the entry decision was made.",
      appliesWhen: "Every chart replay and lesson audit.",
      doesNotApplyWhen:
        "Post-trade statistics may use the full session if they are clearly labeled retrospective and not used to rewrite the entry thesis.",
      supportingTradeSourceIds: refs(
        (signal) => signal.evidence.chartContext.available,
      ),
      complianceMeasure:
        "Every audit labels each fact as before entry, at entry, during trade, afterward, or missing.",
    },
    {
      id: "rule-reconcile-before-statistics",
      rule: "Resolve ambiguous fills before using the trade in performance claims.",
      whyItExists:
        "Complex partial fills can make quantity, basis, and P&L appear more precise than the source supports.",
      appliesWhen: "Reconciliation confidence is marked review.",
      doesNotApplyWhen:
        "High-confidence records may be analyzed, while still treating fees and missing plans as unknown.",
      supportingTradeSourceIds: refs(
        (signal) =>
          signal.evidence.calculated.reconciliationConfidence === "review",
      ),
      complianceMeasure:
        "Every linked buy dollar and sell share is reconciled and the warning is cleared before the record enters strategy statistics.",
    },
  ];
}

function buildConsolidated(signals: TradeSignal[]) {
  const chronological = [...signals].reverse();
  const middle = Math.floor(chronological.length / 2);
  const older = chronological.slice(0, middle);
  const newer = chronological.slice(middle);
  const count = (
    items: TradeSignal[],
    predicate: (signal: TradeSignal) => boolean,
  ) => items.filter(predicate).length;
  const lowerAdds = count(signals, (signal) => signal.lowerPricedAdd);
  const rapid = count(signals, (signal) => signal.rapidReentry);
  const favorable = count(signals, (signal) => signal.favorableToLoss);
  const ultra = count(signals, (signal) => signal.ultraShort);
  const multiBuy = count(signals, (signal) => signal.multiBuy);
  const reconciliation = count(
    signals,
    (signal) =>
      signal.evidence.calculated.reconciliationConfidence === "review",
  );
  return {
    mostUrgentLessons: [
      `Stop unplanned exposure expansion first: ${lowerAdds} trades contain a later lower-priced buy, with ${count(newer, (signal) => signal.lowerPricedAdd)} in the newer half versus ${count(older, (signal) => signal.lowerPricedAdd)} in the older half.`,
      `Make every trade process-scorable: ${count(signals, (signal) => !signal.appTrade?.planId)}/${signals.length} records lack a linked timestamped plan.`,
      `Require a re-entry reset: ${rapid}/${signals.length} positions reopened the same symbol within five minutes of the preceding exit.`,
      `Predefine exit management: ${favorable} positions had positive one-minute excursion before a negative gross close; MFE is a review tool, not an assumed available exit.`,
      `Reconcile complex fills before statistics: ${reconciliation} records remain marked for quantity review.`,
    ],
    recurringStrengths: [
      `${count(signals, (signal) => signal.evidence.chartContext.available)}/${signals.length} reconstructed positions are paired with same-day one-minute charts.`,
      "The records preserve both completed entries and exits, enabling outcome-hidden replay instead of relying only on memory.",
      "Quantity ambiguity is surfaced explicitly rather than silently converted into false precision.",
      `Favorable-to-negative paths declined from ${count(older, (signal) => signal.favorableToLoss)} in the older half to ${count(newer, (signal) => signal.favorableToLoss)} in the newer half, although the newest trade shows the correction is not yet stable.`,
    ],
    recurringMistakes: [
      `Missing timestamped decision evidence (${signals.length} records).`,
      `Rapid same-symbol re-entry without a preserved reset artifact (${rapid} records).`,
      `Lower-priced adding without a preserved combined-risk plan (${lowerAdds} records; ${multiBuy} records contain multiple linked buys).`,
      `Favorable one-minute excursion followed by a negative close without a stored exit rule (${favorable} records).`,
      `Sub-30-second decisions that cannot be fully audited with one-minute evidence (${ultra} records).`,
    ],
    lessonsRecognizedButNotImplemented: [
      "The current AI-generated lessons repeatedly request a trigger, invalidation, and exit rule, but all were created retrospectively in the same import cycle. The evidence is therefore insufficient to claim the trader previously knew and ignored those lessons.",
      "Future implementation must be measured prospectively with plan timestamps, reset notes, and reviewed trade-lesson artifacts; intention and retrospective wording do not count as compliance.",
    ],
    improvementsOverTime: [
      `Favorable-to-negative paths declined from ${count(older, (signal) => signal.favorableToLoss)}/${older.length} in the older half to ${count(newer, (signal) => signal.favorableToLoss)}/${newer.length} in the newer half.`,
      `Ultra-short holds declined from ${count(older, (signal) => signal.ultraShort)} to ${count(newer, (signal) => signal.ultraShort)}. This is a cadence change, not proof of better decisions, until plan adherence is available.`,
      "Chart evidence coverage is complete across the current sample, providing a stronger foundation for deliberate replay.",
    ],
    regressionsOverTime: [
      `Multiple linked buys increased from ${count(older, (signal) => signal.multiBuy)} in the older half to ${count(newer, (signal) => signal.multiBuy)} in the newer half.`,
      `Lower-priced add relationships increased from ${count(older, (signal) => signal.lowerPricedAdd)} in the older half to ${count(newer, (signal) => signal.lowerPricedAdd)} in the newer half.`,
      `Rapid re-entry remains persistent (${count(older, (signal) => signal.rapidReentry)} older-half occurrences versus ${count(newer, (signal) => signal.rapidReentry)} newer-half occurrences).`,
      "The newest trade again shows favorable excursion followed by a negative result, so the earlier frequency improvement has not become a durable exit process.",
    ],
    missingKnowledge: [
      "How to convert a thesis into a falsifiable trigger, structural invalidation, and stop-defined maximum loss.",
      "How multiple dollar-funded tranches combine into one share position and one total risk budget.",
      "How to distinguish lower-range location from actual reversal confirmation.",
      "How to define target, invalidation, and time-stop responses before seeing the outcome.",
      "How to classify re-entry as a new setup, a planned second attempt, or continuation of an invalid thesis.",
      "How to separate contemporaneous chart evidence from full-session hindsight metrics.",
      "How to reconcile partial fills before using a trade in performance or strategy statistics.",
    ],
  };
}

export function buildTradeLearningSystem(
  evidencePackage: AiJournalEvidencePackage,
  journalEntries: ExternalAiJournalEntry[],
  appTrades: Trade[],
  generatedAt = new Date().toISOString(),
  previous?: TradeLearningSystem,
): TradeLearningSystem {
  const signals = buildSignals(evidencePackage, journalEntries, appTrades);
  if (!signals.length)
    throw new Error(
      "At least one matched journal entry is required to build trade lessons.",
    );
  const previousReviewed = new Map(
    previous?.tradeAudits
      .filter((audit) => audit.reviewedAt)
      .map((audit) => [audit.tradeSourceId, audit.reviewedAt]) ?? [],
  );
  const initial = signals.map((signal, index) => {
    const audit = initialAudit(signal, index + 1);
    return {
      ...audit,
      reviewedAt: previousReviewed.get(audit.tradeSourceId) ?? null,
    };
  });
  const tradeAudits = connectAudits(initial, signals).sort((left, right) => {
    const date = right.entryAt.localeCompare(left.entryAt);
    return date || priorityOrder[left.priority] - priorityOrder[right.priority];
  });
  tradeAudits.forEach((audit, index) => {
    audit.sequence = index + 1;
  });
  const patterns = buildPatterns(signals);
  const counts = {
    total: signals.length,
    lowerRange: signals.filter(
      (signal) => signal.strategyCohort === "lower-range",
    ).length,
    upperRange: signals.filter(
      (signal) => signal.strategyCohort === "upper-range",
    ).length,
    vwap: signals.filter((signal) => signal.strategyCohort === "vwap-area")
      .length,
    lowerAdds: signals.filter((signal) => signal.lowerPricedAdd).length,
    rapid: signals.filter((signal) => signal.rapidReentry).length,
    ultra: signals.filter((signal) => signal.ultraShort).length,
  };
  const lowerAddSignals = signals.filter((signal) => signal.lowerPricedAdd);
  const olderExamples = lowerAddSignals
    .filter((signal) => signal !== signals[0])
    .slice(0, 5)
    .map((signal) => signal.evidence.tradeSourceId);
  const earliestLowerAdd = lowerAddSignals.at(-1)?.evidence.tradeSourceId;
  if (earliestLowerAdd && !olderExamples.includes(earliestLowerAdd))
    olderExamples.push(earliestLowerAdd);
  return {
    schema: "day-trading-teacher.trade-learning-system",
    schemaVersion: 1,
    sourcePackageId: evidencePackage.packageId,
    generatedAt,
    processingOrder: "newest_to_oldest",
    tradeAudits,
    patterns,
    knowledgeHierarchy: knowledgeHierarchy(counts),
    consolidated: buildConsolidated(signals),
    consolidatedRules: consolidatedRules(signals),
    checklist: {
      beforeEntry: [
        "What is the falsifiable thesis and exact trigger?",
        "What price or evidence invalidates the thesis?",
        "What is the maximum planned loss after slippage and fees?",
        "Are every tranche and the combined risk cap written before the first fill?",
        "What context is contemporaneous, and what information is still missing?",
        "Which condition makes this a no-trade?",
      ],
      atEntry: [
        "Does the live evidence still match the locked trigger?",
        "Does actual fill price keep stop-defined loss inside the cap?",
        "Is the exit response ready without needing an improvised decision?",
      ],
      duringTrade: [
        "Is the original thesis still valid, or am I replacing it with a new narrative?",
        "Before any add: was this tranche prewritten, is fresh confirmation present, and is combined risk still valid?",
        "Before any re-entry: what changed, is this a new thesis, and how much risk budget remains?",
      ],
      beforeExit: [
        "Which prewritten condition fired: target, invalidation, time stop, or emergency protection?",
        "Am I responding to objective evidence or judging against a candle extreme visible only in hindsight?",
      ],
      afterTrade: [
        "Do all buy dollars, sell shares, fees, and partial fills reconcile?",
        "Score the process with P&L hidden before reviewing the outcome.",
        "Separate what was known before entry, during the trade, afterward, and what remains unknown.",
        "Write one rule, one verification artifact, and one outcome-hidden practice case.",
      ],
    },
    focusPlan: {
      firstBehaviorToCorrect:
        "Eliminate lower-priced adds that were not explicitly authorized before the first fill.",
      firstConceptToStudy:
        "Position-level risk across multiple dollar-funded tranches: calculated shares, combined average price, shared invalidation, and total maximum loss.",
      firstRuleToPractice:
        "No lower-priced add without a locked tranche map, fresh confirming evidence, shared invalidation, and remaining risk capacity.",
      measurableReviewMethod:
        "Complete ten outcome-hidden Chart Replay or paper-trading cases across at least three separate days. Require a timestamped Decision Card before reveal and score zero unplanned adds.",
      olderTradeSourceIdsToRevisit: olderExamples,
      evidenceRequiredToAdvance:
        "Ten completed cases with 100% pre-entry plan coverage, zero unplanned lower adds, combined-risk calculations recorded, and an independent review that hides outcome until process scoring is complete.",
      nextFocusArea:
        "After the scale-in gate holds, train the same-symbol re-entry reset, then exit management using target, invalidation, and time-stop rules.",
    },
  };
}

function markdownList(items: string[]) {
  return items.map((item) => `- ${item}`).join("\n") || "- None recorded.";
}

function knowledgeMarkdown(title: string, items: TradeLearningKnowledgeItem[]) {
  return [
    `### ${title}`,
    "",
    ...items.flatMap((item) => [
      `#### ${item.title}`,
      "",
      `- Rule: ${item.rule}`,
      `- Applies when: ${item.appliesWhen}`,
      `- Exception: ${item.exception}`,
      `- Evidence: ${item.evidence}`,
      "",
    ]),
  ].join("\n");
}

export function tradeLearningSystemMarkdown(system: TradeLearningSystem) {
  const auditMarkdown = system.tradeAudits.flatMap((audit) => [
    `### Trade ${audit.sequence}: ${audit.tradingDate} · ${audit.displayId}`,
    "",
    `**Trade summary**  \n${audit.tradeSummary}`,
    "",
    `**Original thesis**  \n${audit.originalThesis}`,
    "",
    `**What was done well**  \n${markdownList(audit.whatWasDoneWell)}`,
    "",
    `**What was done poorly**  \n${markdownList(audit.whatWasDonePoorly)}`,
    "",
    `**Original lesson**  \n${audit.originalLesson}`,
    "",
    `**Lesson audit**  \n${audit.lessonAudit}`,
    "",
    "**Revised lesson**",
    "",
    `- Observation: ${audit.revisedLesson.observation}`,
    `- Decision error or strength: ${audit.revisedLesson.decisionErrorOrStrength}`,
    `- Underlying cause: ${audit.revisedLesson.underlyingCause}`,
    `- Correct principle: ${audit.revisedLesson.correctPrinciple}`,
    `- Future rule: ${audit.revisedLesson.futureRule}`,
    `- Trigger: ${audit.revisedLesson.trigger}`,
    `- Verification: ${audit.revisedLesson.verification}`,
    `- Practice: ${audit.revisedLesson.practice}`,
    "",
    `**Actionable trading rule**  \n${audit.actionableTradingRule}`,
    "",
    `**Pre-trade checklist question**  \n${audit.preTradeChecklistQuestion}`,
    "",
    `**In-trade checkpoint**  \n${audit.inTradeCheckpoint}`,
    "",
    `**Post-trade review question**  \n${audit.postTradeReviewQuestion}`,
    "",
    `**Evidence and confidence**  \n${audit.evidenceAndConfidence.confidence}: ${audit.evidenceAndConfidence.rationale}`,
    "",
    `**Connection to other trades**  \n${markdownList(
      audit.connections.map(
        (connection) =>
          `${connection.displayId} (${connection.relationship}): ${connection.explanation}`,
      ),
    )}`,
    "",
    `**Priority**  \n${audit.priority}`,
    "",
  ]);
  return [
    "# Trade-derived learning system",
    "",
    `Generated: ${system.generatedAt}`,
    `Source package: ${system.sourcePackageId}`,
    `Processing order: newest to oldest (${system.tradeAudits.length} trades)`,
    "",
    "This report preserves observed and calculated trade facts separately from hypotheses. Strategy and mental-state interpretations are not treated as confirmed intent, and full-day chart measures are labeled retrospective.",
    "",
    "## Most urgent lessons from recent trades",
    "",
    markdownList(system.consolidated.mostUrgentLessons),
    "",
    "## Recurring strengths",
    "",
    markdownList(system.consolidated.recurringStrengths),
    "",
    "## Recurring mistakes",
    "",
    markdownList(system.consolidated.recurringMistakes),
    "",
    "## Lessons recognized but not implemented",
    "",
    markdownList(system.consolidated.lessonsRecognizedButNotImplemented),
    "",
    "## Improvements over time",
    "",
    markdownList(system.consolidated.improvementsOverTime),
    "",
    "## Regressions over time",
    "",
    markdownList(system.consolidated.regressionsOverTime),
    "",
    "## Missing knowledge",
    "",
    markdownList(system.consolidated.missingKnowledge),
    "",
    "## Recurring pattern map",
    "",
    ...system.patterns.flatMap((pattern) => [
      `### ${pattern.title} · ${pattern.occurrences} occurrence${pattern.occurrences === 1 ? "" : "s"}`,
      "",
      `- Earliest: ${pattern.earliestOccurrence}`,
      `- Most recent: ${pattern.mostRecentOccurrence}`,
      `- Frequency: ${pattern.frequencyDirection}`,
      `- Mechanism: ${pattern.sharedMechanism}`,
      `- Typical trigger: ${pattern.typicalTrigger}`,
      `- Typical consequence: ${pattern.typicalConsequence}`,
      `- Existing rule: ${pattern.existingLessonOrRule}`,
      `- Implementation evidence: ${pattern.implementationEvidence}`,
      `- Best correction: ${pattern.bestCorrectiveAction}`,
      "",
    ]),
    "## Knowledge hierarchy",
    "",
    knowledgeMarkdown(
      "Foundational principles",
      system.knowledgeHierarchy.foundationalPrinciples,
    ),
    knowledgeMarkdown(
      "Strategy-specific rules",
      system.knowledgeHierarchy.strategySpecificRules,
    ),
    knowledgeMarkdown(
      "Situational adjustments",
      system.knowledgeHierarchy.situationalAdjustments,
    ),
    knowledgeMarkdown(
      "Personal behavioral safeguards",
      system.knowledgeHierarchy.personalBehavioralSafeguards,
    ),
    "## Consolidated trading rules",
    "",
    ...system.consolidatedRules.flatMap((rule) => [
      `### ${rule.rule}`,
      "",
      `- Why: ${rule.whyItExists}`,
      `- Applies when: ${rule.appliesWhen}`,
      `- Does not apply when: ${rule.doesNotApplyWhen}`,
      `- Compliance: ${rule.complianceMeasure}`,
      `- Supporting trades: ${rule.supportingTradeSourceIds.length}`,
      "",
    ]),
    "## Updated trading checklist",
    "",
    "### Before entry",
    markdownList(system.checklist.beforeEntry),
    "",
    "### At entry",
    markdownList(system.checklist.atEntry),
    "",
    "### During the trade",
    markdownList(system.checklist.duringTrade),
    "",
    "### Before exit",
    markdownList(system.checklist.beforeExit),
    "",
    "### After the trade",
    markdownList(system.checklist.afterTrade),
    "",
    "## Focus plan",
    "",
    `- First behavior: ${system.focusPlan.firstBehaviorToCorrect}`,
    `- First concept: ${system.focusPlan.firstConceptToStudy}`,
    `- First rule: ${system.focusPlan.firstRuleToPractice}`,
    `- Review method: ${system.focusPlan.measurableReviewMethod}`,
    `- Evidence to advance: ${system.focusPlan.evidenceRequiredToAdvance}`,
    `- Next focus: ${system.focusPlan.nextFocusArea}`,
    "",
    "## Trade-by-trade audit · newest to oldest",
    "",
    ...auditMarkdown,
  ].join("\n");
}
