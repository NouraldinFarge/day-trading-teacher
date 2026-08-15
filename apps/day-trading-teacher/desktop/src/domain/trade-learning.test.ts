import { describe, expect, it } from "vitest";
import type {
  AiJournalEvidencePackage,
  ExternalAiJournalEntry,
} from "./ai-journal";
import {
  buildTradeLearningSystem,
  tradeLearningSystemMarkdown,
} from "./trade-learning";
import type { Trade } from "./types";

function journal(
  tradeSourceId: string,
  tradingDate: string,
  symbol: string,
  evidenceRef: string,
  lesson: string,
): ExternalAiJournalEntry {
  const inference = (statement: string) => ({
    statement,
    confidence: "low" as const,
    evidenceRefs: [evidenceRef],
    alternatives: ["The exports do not reveal the trader's actual intent."],
  });
  return {
    tradeSourceId,
    tradingDate,
    symbol,
    strategy: inference(
      "Possible intraday setup; learner confirmation required.",
    ),
    behaviorPatterns: [inference("A completed round trip is observable.")],
    mentalStateHypotheses: [],
    marketContext: inference(
      "Only the supplied one-minute chart is available.",
    ),
    entryReason: inference("The entry reason is not present in the export."),
    exitReason: inference("The exit reason is not present in the export."),
    whatWentWell: "The execution record is complete enough to replay.",
    whatToImprove: "Write the decision before entry.",
    lessonsLearned: lesson,
    mistakes: ["No contemporaneous decision card"],
    tags: ["test-evidence"],
    uncertainty: ["Intent and emotion are unknown."],
  };
}

function order(
  ref: string,
  action: "buy" | "sell",
  filled: number,
  price: number,
  occurredAt: string,
) {
  return {
    evidenceRef: ref,
    symbol: "TEST",
    action,
    amount: filled,
    amountMeaning:
      action === "buy"
        ? ("dollars_invested" as const)
        : ("shares_sold" as const),
    filled,
    filledMeaning:
      action === "buy"
        ? ("dollars_invested" as const)
        : ("shares_sold" as const),
    price,
    orderType: "Market",
    occurredAt,
  };
}

function evidenceFixture() {
  const olderSource = "fidelity:TEST:older";
  const newestSource = "fidelity:TEST:newest";
  const olderTradeRef = `trade:${olderSource}`;
  const newestTradeRef = `trade:${newestSource}`;
  const orders = [
    order("order:older-buy", "buy", 10, 5, "2026-07-16T13:30:00.000Z"),
    order("order:older-sell", "sell", 2, 5.1, "2026-07-16T13:31:00.000Z"),
    order("order:new-buy-1", "buy", 5, 5, "2026-07-16T13:32:00.000Z"),
    order("order:new-buy-2", "buy", 5, 4, "2026-07-16T13:33:00.000Z"),
    order("order:new-sell", "sell", 2.25, 3.8, "2026-07-16T13:35:00.000Z"),
  ];
  const journals = [
    journal(
      olderSource,
      "2026-07-16",
      "TEST",
      olderTradeRef,
      "Original older lesson remains verbatim.",
    ),
    journal(
      newestSource,
      "2026-07-16",
      "TEST",
      newestTradeRef,
      "Original newest lesson remains verbatim.",
    ),
  ];
  const pkg: AiJournalEvidencePackage = {
    schema: "day-trading-teacher.ai-journal-evidence",
    schemaVersion: 1,
    packageId: "test-package",
    generatedAt: "2026-08-15T12:00:00.000Z",
    purpose: "Test evidence",
    privacy: {
      automaticUpload: false,
      accountIdentifiersIncluded: false,
      absolutePathsIncluded: false,
      contents: "Sanitized test evidence",
    },
    interpretationRules: ["Buy filled values are dollars invested."],
    evidenceLabels: {
      observed: "Observed",
      calculated: "Calculated",
      inferred: "Inferred",
      unknown: "Unknown",
    },
    instructionsForAi: [],
    responseContract: {
      schema: "day-trading-teacher.ai-journal-response",
      schemaVersion: 1,
      requiredTopLevelFields: [],
      requiredEntryFields: [],
      confidenceValues: ["low", "medium", "high"],
      mentalStateRule: "Non-diagnostic only",
      exampleEntry: journals[0],
    },
    days: [
      {
        date: "2026-07-16",
        dayEvidenceRef: "day:2026-07-16:summary",
        observed: {
          symbols: ["TEST"],
          orderCount: orders.length,
          orderFilesRead: 1,
          chartFilesRead: 1,
          firstOrderAt: orders[0].occurredAt,
          lastOrderAt: orders.at(-1)!.occurredAt,
          orders,
        },
        calculated: {
          reconstructedTradeCount: 2,
          unresolvedOrderCount: 0,
          observedBuyDollars: 20,
          calculatedSellProceeds: 18.75,
          calculatedNetCashFlow: -1.25,
          sessionSpanMinutes: 5,
          medianHoldingSeconds: 120,
          rapidReentryCount: 1,
          chartMatchedTradeCount: 2,
        },
        unknown: ["No timestamped plan"],
        trades: [
          {
            evidenceRef: olderTradeRef,
            tradeSourceId: olderSource,
            symbol: "TEST",
            side: "long",
            observed: {
              entryAt: "2026-07-16T13:30:00.000Z",
              exitAt: "2026-07-16T13:31:00.000Z",
              orderType: "Market",
              entryFillCount: 1,
              exitFillCount: 1,
              orderEvidenceRefs: ["order:older-buy", "order:older-sell"],
            },
            calculated: {
              entryPrice: 5,
              exitPrice: 5.1,
              quantityShares: 2,
              investedDollars: 10,
              grossExitProceeds: 10.2,
              grossPnl: 0.2,
              holdingSeconds: 60,
              reconciliationConfidence: "high",
              unmatchedShareEstimate: 0,
            },
            chartContext: {
              evidenceRef: "chart:2026-07-16:TEST",
              available: true,
              barCount: 390,
              entryBarTimestamp: "2026-07-16T13:30:00.000Z",
              exitBarTimestamp: "2026-07-16T13:31:00.000Z",
              entryLocationPercent: 70,
              entryVwap: 5,
              maximumFavorableExcursionPercent: 3,
              maximumAdverseExcursionPercent: -1,
              dayHigh: 5.4,
              dayLow: 4.5,
              warning: null,
            },
          },
          {
            evidenceRef: newestTradeRef,
            tradeSourceId: newestSource,
            symbol: "TEST",
            side: "long",
            observed: {
              entryAt: "2026-07-16T13:32:00.000Z",
              exitAt: "2026-07-16T13:35:00.000Z",
              orderType: "Market",
              entryFillCount: 2,
              exitFillCount: 1,
              orderEvidenceRefs: [
                "order:new-buy-1",
                "order:new-buy-2",
                "order:new-sell",
              ],
            },
            calculated: {
              entryPrice: 4.444444,
              exitPrice: 3.8,
              quantityShares: 2.25,
              investedDollars: 10,
              grossExitProceeds: 8.55,
              grossPnl: -1.45,
              holdingSeconds: 180,
              reconciliationConfidence: "high",
              unmatchedShareEstimate: 0,
            },
            chartContext: {
              evidenceRef: "chart:2026-07-16:TEST",
              available: true,
              barCount: 390,
              entryBarTimestamp: "2026-07-16T13:32:00.000Z",
              exitBarTimestamp: "2026-07-16T13:35:00.000Z",
              entryLocationPercent: 20,
              entryVwap: 4.8,
              maximumFavorableExcursionPercent: 4,
              maximumAdverseExcursionPercent: -15,
              dayHigh: 5.4,
              dayLow: 3.7,
              warning: null,
            },
          },
        ],
      },
    ],
  };
  const trades: Trade[] = journals.map((entry, index) => ({
    id: `trade-${index}`,
    symbol: "TEST",
    side: "long",
    entry: index ? "4.444444" : "5",
    exit: index ? "3.8" : "5.1",
    quantity: index ? "2.25" : "2",
    fees: "0",
    planId: null,
    followedPlan: false,
    respectedStop: false,
    notes: "",
    occurredAt: index ? "2026-07-16T13:35:00.000Z" : "2026-07-16T13:31:00.000Z",
    grossPnl: index ? "-1.45" : "0.2",
    netPnl: index ? "-1.45" : "0.2",
    rMultiple: null,
    review: {
      processClassification: "not_scorable",
      outcome: index ? "losing" : "profitable",
      processScore: null,
      dataQuality: "partial",
      strength: "Execution recorded.",
      primaryCorrection: "Add a plan.",
      evidence: [],
      assignedLessonId: "builtin-tr-002",
    },
    importSource: "fidelity_csv",
    sourceId: entry.tradeSourceId,
  }));
  return { pkg, journals, trades, olderSource, newestSource };
}

describe("trade-derived learning system", () => {
  it("processes every matched trade newest to oldest and preserves the original lesson", () => {
    const fixture = evidenceFixture();
    const system = buildTradeLearningSystem(
      fixture.pkg,
      fixture.journals,
      fixture.trades,
      "2026-08-15T13:00:00.000Z",
    );

    expect(system.processingOrder).toBe("newest_to_oldest");
    expect(system.tradeAudits.map((audit) => audit.tradeSourceId)).toEqual([
      fixture.newestSource,
      fixture.olderSource,
    ]);
    expect(system.tradeAudits[0]).toMatchObject({
      sequence: 1,
      originalLesson: "Original newest lesson remains verbatim.",
      priority: "Critical immediate correction",
    });
    expect(system.tradeAudits[1].originalLesson).toBe(
      "Original older lesson remains verbatim.",
    );
  });

  it("separates hindsight, detects the shared mechanism, and avoids inventing intent", () => {
    const fixture = evidenceFixture();
    const system = buildTradeLearningSystem(
      fixture.pkg,
      fixture.journals,
      fixture.trades,
    );
    const newest = system.tradeAudits[0];

    expect(newest.patternIds).toEqual(
      expect.arrayContaining([
        "lower-priced-add",
        "rapid-reentry",
        "favorable-to-loss",
      ]),
    );
    expect(newest.temporalEvidence.knownOnlyAfterward.join(" ")).toMatch(
      /hindsight|later measured/i,
    );
    expect(newest.temporalEvidence.missing.join(" ")).toMatch(
      /thoughts|emotion|actual thesis/i,
    );
    expect(newest.revisedLesson.underlyingCause).toMatch(/does not prove/i);
    expect(newest.connections[0]).toMatchObject({
      tradeSourceId: fixture.olderSource,
    });
    expect(
      system.patterns.find((pattern) => pattern.id === "lower-priced-add"),
    ).toMatchObject({ occurrences: 1 });
  });

  it("exports the complete requested audit structure and preserves review state on regeneration", () => {
    const fixture = evidenceFixture();
    const first = buildTradeLearningSystem(
      fixture.pkg,
      fixture.journals,
      fixture.trades,
      "2026-08-15T13:00:00.000Z",
    );
    first.tradeAudits[0].reviewedAt = "2026-08-15T13:05:00.000Z";
    const rebuilt = buildTradeLearningSystem(
      fixture.pkg,
      fixture.journals,
      fixture.trades,
      "2026-08-15T14:00:00.000Z",
      first,
    );
    const report = tradeLearningSystemMarkdown(rebuilt);

    expect(rebuilt.tradeAudits[0].reviewedAt).toBe("2026-08-15T13:05:00.000Z");
    expect(report).toContain("## Trade-by-trade audit · newest to oldest");
    expect(report).toContain("**Original thesis**");
    expect(report).toContain("**Lesson audit**");
    expect(report).toContain("**Pre-trade checklist question**");
    expect(report).toContain("## Recurring pattern map");
    expect(report).toContain("## Knowledge hierarchy");
    expect(report).toContain("## Focus plan");
  });
});
