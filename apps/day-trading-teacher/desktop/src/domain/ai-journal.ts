import { z } from "zod";
import type {
  FidelityOrderEvidence,
  FidelityRoundTrip,
} from "./fidelity-import";
import type { JournalReflection, Trade } from "./types";
import type {
  TradingRecordChartContext,
  TradingRecordsAnalysis,
} from "./trading-records";

export type AiInferenceConfidence = "low" | "medium" | "high";

export type AiJournalInference = {
  statement: string;
  confidence: AiInferenceConfidence;
  evidenceRefs: string[];
  alternatives: string[];
};

export type ExternalAiJournalEntry = {
  tradeSourceId: string;
  tradingDate: string;
  symbol: string;
  strategy: AiJournalInference;
  behaviorPatterns: AiJournalInference[];
  mentalStateHypotheses: Array<
    AiJournalInference & {
      phase: "before" | "during" | "after";
      nonDiagnostic: true;
    }
  >;
  marketContext: AiJournalInference;
  entryReason: AiJournalInference;
  exitReason: AiJournalInference;
  whatWentWell: string;
  whatToImprove: string;
  lessonsLearned: string;
  mistakes: string[];
  tags: string[];
  uncertainty: string[];
};

export type AiJournalEvidencePackage = {
  schema: "day-trading-teacher.ai-journal-evidence";
  schemaVersion: 1;
  packageId: string;
  generatedAt: string;
  purpose: string;
  privacy: {
    automaticUpload: false;
    accountIdentifiersIncluded: false;
    absolutePathsIncluded: false;
    contents: string;
  };
  interpretationRules: string[];
  evidenceLabels: Record<
    "observed" | "calculated" | "inferred" | "unknown",
    string
  >;
  instructionsForAi: string[];
  responseContract: {
    schema: "day-trading-teacher.ai-journal-response";
    schemaVersion: 1;
    requiredTopLevelFields: string[];
    requiredEntryFields: string[];
    confidenceValues: AiInferenceConfidence[];
    mentalStateRule: string;
    exampleEntry: ExternalAiJournalEntry;
  };
  days: Array<{
    date: string;
    dayEvidenceRef: string;
    observed: {
      symbols: string[];
      orderCount: number;
      orderFilesRead: number;
      chartFilesRead: number;
      firstOrderAt: string | null;
      lastOrderAt: string | null;
      orders: FidelityOrderEvidence[];
    };
    calculated: {
      reconstructedTradeCount: number;
      unresolvedOrderCount: number;
      observedBuyDollars: number;
      calculatedSellProceeds: number;
      calculatedNetCashFlow: number;
      sessionSpanMinutes: number | null;
      medianHoldingSeconds: number | null;
      rapidReentryCount: number;
      chartMatchedTradeCount: number;
    };
    unknown: string[];
    trades: Array<{
      evidenceRef: string;
      tradeSourceId: string;
      symbol: string;
      side: "long";
      observed: {
        entryAt: string;
        exitAt: string;
        orderType: string;
        entryFillCount: number;
        exitFillCount: number;
        orderEvidenceRefs: string[];
      };
      calculated: {
        entryPrice: number;
        exitPrice: number;
        quantityShares: number;
        investedDollars: number;
        grossExitProceeds: number;
        grossPnl: number;
        holdingSeconds: number;
        reconciliationConfidence: "high" | "review";
        unmatchedShareEstimate: number;
      };
      chartContext: TradingRecordChartContext;
    }>;
  }>;
};

export type ExternalAiJournalValidation = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  entries: ExternalAiJournalEntry[];
  aiProvider: string | null;
  generatedAt: string | null;
};

const boundedText = z.string().trim().min(1).max(4_000);
const shortText = z.string().trim().min(1).max(500);
const evidenceRefSchema = z.string().trim().min(1).max(1_000);
const inferenceSchema = z
  .object({
    statement: boundedText,
    confidence: z.enum(["low", "medium", "high"]),
    evidenceRefs: z.array(evidenceRefSchema).min(1).max(30),
    alternatives: z.array(boundedText).max(6).default([]),
  })
  .strict();
const mentalStateSchema = inferenceSchema
  .extend({
    phase: z.enum(["before", "during", "after"]),
    nonDiagnostic: z.literal(true),
  })
  .strict();
const responseEntrySchema = z
  .object({
    tradeSourceId: evidenceRefSchema,
    tradingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    symbol: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9.-]{1,16}$/),
    strategy: inferenceSchema,
    behaviorPatterns: z.array(inferenceSchema).max(8),
    mentalStateHypotheses: z.array(mentalStateSchema).max(6),
    marketContext: inferenceSchema,
    entryReason: inferenceSchema,
    exitReason: inferenceSchema,
    whatWentWell: boundedText,
    whatToImprove: boundedText,
    lessonsLearned: boundedText,
    mistakes: z.array(shortText).max(20),
    tags: z.array(z.string().trim().min(1).max(80)).max(20),
    uncertainty: z.array(boundedText).max(20),
  })
  .strict();
const responseSchema = z
  .object({
    schema: z.literal("day-trading-teacher.ai-journal-response"),
    schemaVersion: z.literal(1),
    sourcePackageId: z.string().trim().min(1).max(200),
    generatedAt: z.string().datetime(),
    aiProvider: z.string().trim().min(1).max(100).optional(),
    entries: z.array(responseEntrySchema).min(1).max(2_000),
  })
  .strict();

function stablePackageId(values: string[]) {
  let hash = 2_166_136_261;
  for (const character of values.sort().join("|")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return `trading-records-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function rapidReentries(trades: FidelityRoundTrip[]) {
  const ordered = [...trades].sort((left, right) =>
    left.entryAt.localeCompare(right.entryAt),
  );
  let count = 0;
  for (let index = 1; index < ordered.length; index += 1) {
    if (ordered[index].symbol !== ordered[index - 1].symbol) continue;
    const gap =
      new Date(ordered[index].entryAt).getTime() -
      new Date(ordered[index - 1].exitAt).getTime();
    if (gap >= 0 && gap <= 5 * 60_000) count += 1;
  }
  return count;
}

function tradePackageEvidence(
  trade: FidelityRoundTrip,
  chartContext: TradingRecordChartContext,
) {
  const quantity = Number(trade.quantity);
  const entry = Number(trade.entry);
  const exit = Number(trade.exit);
  return {
    evidenceRef: `trade:${trade.sourceId}`,
    tradeSourceId: trade.sourceId,
    symbol: trade.symbol,
    side: trade.side,
    observed: {
      entryAt: trade.entryAt,
      exitAt: trade.exitAt,
      orderType: trade.orderType,
      entryFillCount: trade.entryFillCount,
      exitFillCount: trade.exitFillCount,
      orderEvidenceRefs: trade.orderEvidenceRefs,
    },
    calculated: {
      entryPrice: entry,
      exitPrice: exit,
      quantityShares: quantity,
      investedDollars: trade.investedDollars,
      grossExitProceeds: trade.grossExitProceeds,
      grossPnl: Number(((exit - entry) * quantity).toFixed(6)),
      holdingSeconds: trade.holdingSeconds,
      reconciliationConfidence: trade.reconciliationConfidence,
      unmatchedShareEstimate: trade.unmatchedShareEstimate,
    },
    chartContext,
  };
}

export function createAiJournalEvidencePackage(
  analysis: TradingRecordsAnalysis,
  importedTrades: Trade[],
  generatedAt = new Date().toISOString(),
): AiJournalEvidencePackage {
  const importedSourceIds = new Set(
    importedTrades.map((trade) => trade.sourceId).filter(Boolean),
  );
  const includedTrades = analysis.trades.filter((trade) =>
    importedSourceIds.has(trade.sourceId),
  );
  if (!includedTrades.length)
    throw new Error(
      "Import at least one reconstructed Fidelity trade before creating an AI journal package.",
    );
  const packageId = stablePackageId([
    ...includedTrades.map((trade) => trade.sourceId),
    ...analysis.chartSessions.map((session) => session.evidenceRef),
  ]);
  const days = analysis.days.flatMap((day) => {
    const trades = includedTrades.filter(
      (trade) => trade.tradingDate === day.date,
    );
    if (!trades.length) return [];
    const orders = analysis.orders.filter(
      (order) =>
        order.occurredAt && dateInNewYork(order.occurredAt) === day.date,
    );
    const orderedTimes = orders
      .map((order) => new Date(order.occurredAt).getTime())
      .sort((left, right) => left - right);
    const unknown = [
      "The exports do not reveal the trader's private thoughts, intent, emotions, outside stressors, or pre-trade plan.",
      "A profitable outcome does not prove a sound process, and a loss does not prove a poor process.",
    ];
    if (day.unresolvedOrderCount)
      unknown.push(
        `${day.unresolvedOrderCount} order or quantity relationship remains unresolved; do not invent the missing cost basis.`,
      );
    if (day.chartMatchedTradeCount < trades.length)
      unknown.push(
        "At least one trade lacks a matching same-day one-minute chart; chart-based claims must be marked unavailable.",
      );
    return [
      {
        date: day.date,
        dayEvidenceRef: `day:${day.date}:summary`,
        observed: {
          symbols: day.symbols,
          orderCount: orders.length,
          orderFilesRead: day.orderFiles.length,
          chartFilesRead: day.chartFiles.length,
          firstOrderAt: orderedTimes.length
            ? new Date(orderedTimes[0]).toISOString()
            : null,
          lastOrderAt: orderedTimes.length
            ? new Date(orderedTimes.at(-1)!).toISOString()
            : null,
          orders,
        },
        calculated: {
          reconstructedTradeCount: trades.length,
          unresolvedOrderCount: day.unresolvedOrderCount,
          observedBuyDollars: day.observedBuyDollars,
          calculatedSellProceeds: day.calculatedSellProceeds,
          calculatedNetCashFlow: day.calculatedNetCashFlow,
          sessionSpanMinutes:
            orderedTimes.length > 1
              ? Math.round((orderedTimes.at(-1)! - orderedTimes[0]) / 60_000)
              : null,
          medianHoldingSeconds: median(
            trades.map((trade) => trade.holdingSeconds),
          ),
          rapidReentryCount: rapidReentries(trades),
          chartMatchedTradeCount: day.chartMatchedTradeCount,
        },
        unknown,
        trades: trades.map((trade) =>
          tradePackageEvidence(
            trade,
            analysis.chartContextByTrade[trade.sourceId],
          ),
        ),
      },
    ];
  });
  const exampleTrade = days[0].trades[0];
  const exampleDay = days[0];
  const exampleOrderRef =
    exampleDay.observed.orders[0]?.evidenceRef ?? exampleTrade.evidenceRef;
  const exampleInference = (
    statement: string,
    evidenceRefs = [exampleTrade.evidenceRef],
  ): AiJournalInference => ({
    statement,
    confidence: "low",
    evidenceRefs,
    alternatives: [
      "State another plausible explanation supported by the same limited evidence.",
    ],
  });
  return {
    schema: "day-trading-teacher.ai-journal-evidence",
    schemaVersion: 1,
    packageId,
    generatedAt,
    purpose:
      "Create reviewable journal drafts from historical Fidelity order and chart evidence. This package is educational and retrospective; it is not a trade signal, diagnosis, or brokerage instruction.",
    privacy: {
      automaticUpload: false,
      accountIdentifiersIncluded: false,
      absolutePathsIncluded: false,
      contents:
        "Sanitized filled-order facts, reconstructed round trips, same-day chart measurements, uncertainties, and a strict response contract.",
    },
    interpretationRules: [
      "In Fidelity fractional-dollar exports, Buy Amount and Buy Filled are dollars invested. For example, Buy 10 at $5.1768 means $10 invested, not 10 shares.",
      "Sell Amount and Sell Filled are shares. Buy shares are calculated as filled dollars divided by fill price.",
      "Observed fields come directly from sanitized exports; calculated fields are arithmetic derived from those observations.",
      "Do not claim that orders or candles reveal intent, emotion, discipline, or a named strategy with certainty.",
      "Treat mental-state language as a non-clinical behavioral hypothesis, include plausible alternatives, and use low or medium confidence only.",
    ],
    evidenceLabels: {
      observed: "Directly present in a sanitized Fidelity export.",
      calculated: "Arithmetic or timing derived from observed values.",
      inferred:
        "A tentative interpretation that must cite evidence and alternatives.",
      unknown:
        "Not supported by the supplied records and must not be invented.",
    },
    instructionsForAi: [
      "Analyze each reconstructed trade independently and in the context of its trading day.",
      "Identify plausible strategy and behavior patterns, but distinguish evidence from interpretation.",
      "Mental-state hypotheses must be non-diagnostic, low or medium confidence, evidence-cited, and paired with alternative explanations. It is valid to provide no mental-state hypothesis.",
      "Focus improvements on planning, risk limits, execution quality, reflection, and deliberate practice. Do not recommend more trades, specific securities, live entries, price targets, or profit promises.",
      "Return JSON only, exactly matching the response contract. Use only evidenceRef values contained in this package.",
      "Write journal content as an AI hypothesis for the learner to review; never write unsupported first-person memories as fact.",
    ],
    responseContract: {
      schema: "day-trading-teacher.ai-journal-response",
      schemaVersion: 1,
      requiredTopLevelFields: [
        "schema",
        "schemaVersion",
        "sourcePackageId",
        "generatedAt",
        "entries",
      ],
      requiredEntryFields: [
        "tradeSourceId",
        "tradingDate",
        "symbol",
        "strategy",
        "behaviorPatterns",
        "mentalStateHypotheses",
        "marketContext",
        "entryReason",
        "exitReason",
        "whatWentWell",
        "whatToImprove",
        "lessonsLearned",
        "mistakes",
        "tags",
        "uncertainty",
      ],
      confidenceValues: ["low", "medium", "high"],
      mentalStateRule:
        "Every item requires phase, statement, low or medium confidence, evidenceRefs, alternatives, and nonDiagnostic: true.",
      exampleEntry: {
        tradeSourceId: exampleTrade.tradeSourceId,
        tradingDate: exampleDay.date,
        symbol: exampleTrade.symbol,
        strategy: exampleInference(
          "Illustrative strategy hypothesis—replace this with an evidence-based statement.",
        ),
        behaviorPatterns: [
          exampleInference(
            "Illustrative observable behavior pattern—replace this text.",
          ),
        ],
        mentalStateHypotheses: [
          {
            ...exampleInference(
              "Illustrative non-clinical hypothesis—omit this item if evidence is insufficient.",
              [exampleOrderRef],
            ),
            phase: "during",
            nonDiagnostic: true,
          },
        ],
        marketContext: exampleInference(
          "Illustrative market-context statement—replace this text.",
          [
            exampleTrade.chartContext.available
              ? exampleTrade.chartContext.evidenceRef
              : exampleTrade.evidenceRef,
          ],
        ),
        entryReason: exampleInference(
          "Illustrative entry-reason hypothesis—replace this text.",
        ),
        exitReason: exampleInference(
          "Illustrative exit-reason hypothesis—replace this text.",
        ),
        whatWentWell:
          "State one process behavior worth repeating; do not infer quality from profit alone.",
        whatToImprove:
          "State one process-based correction grounded in the supplied evidence.",
        lessonsLearned:
          "State one bounded lesson the learner can deliberately practice.",
        mistakes: [
          "List only defensible process gaps; an empty list is allowed.",
        ],
        tags: ["lowercase-process-tag"],
        uncertainty: [
          "Explicitly list what the exports cannot reveal for this trade.",
        ],
      },
    },
    days,
  };
}

function dateInNewYork(timestamp: string) {
  const values = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(new Date(timestamp))
    .reduce<Record<string, string>>((parts, part) => {
      if (part.type !== "literal") parts[part.type] = part.value;
      return parts;
    }, {});
  return `${values.year}-${values.month}-${values.day}`;
}

function stripJsonFence(raw: string) {
  const trimmed = raw.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match?.[1] ?? trimmed;
}

function packageEvidenceRefs(pkg: AiJournalEvidencePackage) {
  const refs = new Set<string>();
  for (const day of pkg.days) {
    refs.add(day.dayEvidenceRef);
    for (const order of day.observed.orders) refs.add(order.evidenceRef);
    for (const trade of day.trades) {
      refs.add(trade.evidenceRef);
      if (trade.chartContext.available)
        refs.add(trade.chartContext.evidenceRef);
    }
  }
  return refs;
}

function inferenceValues(entry: ExternalAiJournalEntry) {
  return [
    entry.strategy,
    ...entry.behaviorPatterns,
    ...entry.mentalStateHypotheses,
    entry.marketContext,
    entry.entryReason,
    entry.exitReason,
  ];
}

const diagnosticClaim =
  /\b(?:diagnosed with|has|suffers from|is clinically)\s+(?:adhd|bipolar|depression|anxiety disorder|ocd|mania|addiction)\b/i;
const liveTradingDirective =
  /\b(?:buy now|sell now|guaranteed profit|risk[- ]free|must buy|must sell)\b/i;

export function validateExternalAiJournalResponse(
  raw: string,
  pkg: AiJournalEvidencePackage,
): ExternalAiJournalValidation {
  if (raw.length > 8_000_000)
    return {
      valid: false,
      errors: ["The AI response exceeds the 8 MB safety limit."],
      warnings: [],
      entries: [],
      aiProvider: null,
      generatedAt: null,
    };
  let value: unknown;
  try {
    value = JSON.parse(stripJsonFence(raw));
  } catch {
    return {
      valid: false,
      errors: ["The selected file is not valid JSON."],
      warnings: [],
      entries: [],
      aiProvider: null,
      generatedAt: null,
    };
  }
  const parsed = responseSchema.safeParse(value);
  if (!parsed.success)
    return {
      valid: false,
      errors: parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "response"}: ${issue.message}`,
      ),
      warnings: [],
      entries: [],
      aiProvider: null,
      generatedAt: null,
    };
  const errors: string[] = [];
  const warnings: string[] = [];
  if (parsed.data.sourcePackageId !== pkg.packageId)
    errors.push(
      "This response was created from a different or older evidence package. Create a fresh package and analyze that package before importing.",
    );
  const knownTrades = new Map(
    pkg.days.flatMap((day) =>
      day.trades.map((trade) => [
        trade.tradeSourceId,
        { ...trade, date: day.date },
      ]),
    ),
  );
  const knownRefs = packageEvidenceRefs(pkg);
  const seen = new Set<string>();
  for (const entry of parsed.data.entries) {
    const evidence = knownTrades.get(entry.tradeSourceId);
    if (!evidence) {
      errors.push(
        `${entry.symbol}: tradeSourceId is not present in this package.`,
      );
      continue;
    }
    if (seen.has(entry.tradeSourceId))
      errors.push(
        `${entry.symbol}: the response contains a duplicate journal entry.`,
      );
    seen.add(entry.tradeSourceId);
    if (entry.symbol !== evidence.symbol || entry.tradingDate !== evidence.date)
      errors.push(
        `${entry.symbol}: symbol or trading date does not match the referenced trade.`,
      );
    for (const inference of inferenceValues(entry)) {
      for (const ref of inference.evidenceRefs)
        if (!knownRefs.has(ref))
          errors.push(`${entry.symbol}: unknown evidence reference ${ref}.`);
      if (diagnosticClaim.test(inference.statement))
        errors.push(
          `${entry.symbol}: a clinical diagnostic claim is not allowed in a journal draft.`,
        );
      if (liveTradingDirective.test(inference.statement))
        errors.push(
          `${entry.symbol}: a live-trading directive or profit claim is not allowed.`,
        );
    }
    if (
      entry.mentalStateHypotheses.some(
        (hypothesis) => hypothesis.confidence === "high",
      )
    )
      errors.push(
        `${entry.symbol}: mental-state hypotheses cannot use high confidence because exports do not reveal private experience.`,
      );
    if (!entry.mentalStateHypotheses.length)
      warnings.push(
        `${entry.symbol}: no mental-state hypothesis was supplied. This is acceptable when the evidence is insufficient.`,
      );
  }
  return {
    valid: errors.length === 0,
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
    entries: errors.length ? [] : parsed.data.entries,
    aiProvider: parsed.data.aiProvider ?? null,
    generatedAt: parsed.data.generatedAt,
  };
}

function emptyJournal(): JournalReflection {
  return {
    status: "needs_review",
    setup: "",
    strategy: "",
    marketContext: "",
    entryReason: "",
    exitReason: "",
    whatWentWell: "",
    whatToImprove: "",
    emotionBefore: "",
    emotionAfter: "",
    focusRating: null,
    confidenceRating: null,
    tags: [],
    mistakes: [],
    lessonsLearned: "",
    preTradeChecklist: {},
    postTradeChecklist: {},
    screenshotRefs: [],
    reviewedAt: null,
  };
}

function inferenceText(inference: AiJournalInference) {
  return `AI hypothesis · ${inference.confidence} confidence: ${inference.statement}`;
}

function preserve(existing: string | undefined, proposed: string) {
  return existing?.trim() ? existing : proposed;
}

export function mergeExternalAiJournalDraft(
  trade: Trade,
  entry: ExternalAiJournalEntry,
  packageId: string,
  importedAt = new Date().toISOString(),
): Trade {
  if (!trade.sourceId || trade.sourceId !== entry.tradeSourceId)
    throw new Error("The AI journal draft does not match this trade.");
  if (trade.journal?.status === "reviewed")
    throw new Error(
      "A reviewed reflection was preserved. Reopen it manually if you want to change it.",
    );
  const existing = trade.journal ?? emptyJournal();
  const mentalBefore = entry.mentalStateHypotheses
    .filter((item) => item.phase === "before" || item.phase === "during")
    .map(inferenceText)
    .join("\n");
  const mentalAfter = entry.mentalStateHypotheses
    .filter((item) => item.phase === "after")
    .map(inferenceText)
    .join("\n");
  const evidenceRefs = [
    ...new Set(inferenceValues(entry).flatMap((item) => item.evidenceRefs)),
  ];
  return {
    ...trade,
    journal: {
      ...existing,
      status: "needs_review",
      reviewedAt: null,
      setup: preserve(existing.setup, entry.strategy.statement),
      strategy: preserve(existing.strategy, inferenceText(entry.strategy)),
      marketContext: preserve(
        existing.marketContext,
        inferenceText(entry.marketContext),
      ),
      entryReason: preserve(
        existing.entryReason,
        inferenceText(entry.entryReason),
      ),
      exitReason: preserve(
        existing.exitReason,
        inferenceText(entry.exitReason),
      ),
      whatWentWell: preserve(existing.whatWentWell, entry.whatWentWell),
      whatToImprove: preserve(existing.whatToImprove, entry.whatToImprove),
      emotionBefore: preserve(existing.emotionBefore, mentalBefore),
      emotionAfter: preserve(existing.emotionAfter, mentalAfter),
      tags: [
        ...new Set([
          ...existing.tags,
          ...entry.tags.map((tag) => tag.toLowerCase()),
          "ai-draft",
        ]),
      ],
      mistakes: [...new Set([...(existing.mistakes ?? []), ...entry.mistakes])],
      lessonsLearned: preserve(existing.lessonsLearned, entry.lessonsLearned),
      aiDraft: {
        source: "external_ai",
        sourcePackageId: packageId,
        importedAt,
        reviewStatus: "awaiting_user_review",
        evidenceRefs,
        inferenceNotice:
          "AI-generated hypotheses are not memories or diagnoses. Review every claim against your own recollection before accepting it.",
      },
    },
  };
}

export function aiJournalRequestText(pkg: AiJournalEvidencePackage) {
  return [
    "Analyze the attached Day-Trading Teacher evidence package.",
    "Follow instructionsForAi and interpretationRules exactly.",
    "Create one journal draft per reconstructed trade.",
    "Return JSON only using responseContract, with sourcePackageId set to:",
    pkg.packageId,
    "Do not diagnose the trader, invent private thoughts, provide live trade signals, or encourage additional trading.",
  ].join("\n");
}
