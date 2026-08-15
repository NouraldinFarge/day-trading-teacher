import { describe, expect, it } from "vitest";
import type { Trade } from "./types";
import {
  createAiJournalEvidencePackage,
  mergeExternalAiJournalDraft,
  validateExternalAiJournalResponse,
} from "./ai-journal";
import { analyzeTradingRecordsScan } from "./trading-records";

const orderCsv = `Symbol,Action,Amount,Order Type,Status,Filled,Order Time,Account
TEST,Buy,10,Market,Filled at $5,10 / 10,9:30:10 AM ET Jul-16-2026,Individual *0000
TEST,Sell,2,Market,Filled at $5.25,2 / 2,9:32:10 AM ET Jul-16-2026,Individual *0000
Disclosure`;
const chartCsv = `Date,Open,High,Low,Close,Volume
2026-07-16T13:30:00.000Z,5,5.1,4.95,5.05,1000
2026-07-16T13:31:00.000Z,5.05,5.3,5.01,5.25,2000
2026-07-16T13:32:00.000Z,5.25,5.35,5.2,5.3,1500`;

function fixture() {
  return analyzeTradingRecordsScan({
    files: [
      {
        name: "Orders_All_Accounts.csv",
        relativePath: "2026-07-16\\Orders_All_Accounts.csv",
        modifiedAt: 1,
        sizeBytes: orderCsv.length,
        kind: "orders" as const,
        folderDate: "2026-07-16",
        content: orderCsv,
      },
      {
        name: "TEST chart.csv",
        relativePath: "2026-07-16\\TEST chart.csv",
        modifiedAt: 2,
        sizeBytes: chartCsv.length,
        kind: "chart" as const,
        folderDate: "2026-07-16",
        content: chartCsv,
      },
    ],
    discoveredCsvCount: 2,
    unsupportedCsvCount: 0,
    oversizedCsvCount: 0,
    unreadableCsvCount: 0,
    truncatedCsvCount: 0,
    totalBytes: orderCsv.length + chartCsv.length,
    warnings: [],
  });
}

function importedTrade(sourceId: string): Trade {
  return {
    id: "trade-1",
    symbol: "TEST",
    side: "long",
    entry: "5",
    exit: "5.25",
    quantity: "2",
    fees: "0",
    planId: null,
    followedPlan: false,
    respectedStop: false,
    notes: "",
    occurredAt: "2026-07-16T13:32:10.000Z",
    grossPnl: "0.5",
    netPnl: "0.5",
    rMultiple: null,
    review: {
      processClassification: "not_scorable",
      outcome: "profitable",
      processScore: null,
      dataQuality: "partial",
      strength: "Execution imported.",
      primaryCorrection: "Review context.",
      evidence: [],
      assignedLessonId: "builtin-tr-002",
    },
    importSource: "fidelity_csv",
    sourceId,
  };
}

function responseForPackage(
  pkg: ReturnType<typeof createAiJournalEvidencePackage>,
) {
  const day = pkg.days[0];
  const trade = day.trades[0];
  const orderRef = day.observed.orders[0].evidenceRef;
  const inference = (
    statement: string,
    evidenceRefs = [trade.evidenceRef],
  ) => ({
    statement,
    confidence: "medium" as const,
    evidenceRefs,
    alternatives: [
      "The same sequence could have resulted from a prewritten plan.",
    ],
  });
  return {
    schema: "day-trading-teacher.ai-journal-response",
    schemaVersion: 1,
    sourcePackageId: pkg.packageId,
    generatedAt: "2026-08-15T12:00:00.000Z",
    aiProvider: "Test AI",
    entries: [
      {
        tradeSourceId: trade.tradeSourceId,
        tradingDate: day.date,
        symbol: trade.symbol,
        strategy: inference("Possible short-duration momentum attempt."),
        behaviorPatterns: [
          inference("The position was opened and closed within minutes."),
        ],
        mentalStateHypotheses: [
          {
            ...inference("The rapid sequence may be consistent with urgency.", [
              orderRef,
            ]),
            confidence: "low" as const,
            phase: "during" as const,
            nonDiagnostic: true as const,
          },
        ],
        marketContext: inference("The matching chart shows an intraday rise.", [
          trade.chartContext.evidenceRef,
        ]),
        entryReason: inference("The entry may have followed upward momentum."),
        exitReason: inference("The exit may have been a rapid profit capture."),
        whatWentWell: "The completed round trip was recorded and kept small.",
        whatToImprove: "Write the trigger and invalidation before entry.",
        lessonsLearned: "Require a bounded thesis before the first buy.",
        mistakes: ["No recorded pre-trade thesis"],
        tags: ["momentum-hypothesis", "rapid-exit"],
        uncertainty: ["The export does not reveal the actual intent."],
      },
    ],
  };
}

describe("external AI journal handoff", () => {
  it("creates a redacted, evidence-labeled package with the Fidelity dollar-buy rule", () => {
    const analysis = fixture();
    const trade = importedTrade(analysis.trades[0].sourceId);
    const pkg = createAiJournalEvidencePackage(
      analysis,
      [trade],
      "2026-08-15T12:00:00.000Z",
    );
    const serialized = JSON.stringify(pkg);

    expect(pkg.privacy).toMatchObject({
      automaticUpload: false,
      accountIdentifiersIncluded: false,
      absolutePathsIncluded: false,
    });
    expect(pkg.interpretationRules.join(" ")).toMatch(
      /Buy 10 at \$5\.1768 means \$10 invested/i,
    );
    expect(serialized).not.toContain("Individual *0000");
    expect(serialized).not.toContain("D:\\");
    expect(pkg.days[0].trades[0].chartContext.available).toBe(true);
  });

  it("validates cited hypotheses and imports them as an unreviewed draft", () => {
    const analysis = fixture();
    const trade = importedTrade(analysis.trades[0].sourceId);
    trade.journal = {
      status: "needs_review",
      setup: "",
      strategy: "",
      marketContext: "My own market note",
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
      reviewedAt: null,
    };
    const pkg = createAiJournalEvidencePackage(analysis, [trade]);
    const validation = validateExternalAiJournalResponse(
      JSON.stringify(responseForPackage(pkg)),
      pkg,
    );

    expect(validation.valid).toBe(true);
    const merged = mergeExternalAiJournalDraft(
      trade,
      validation.entries[0],
      pkg.packageId,
      "2026-08-15T12:05:00.000Z",
    );
    expect(merged.journal).toMatchObject({
      status: "needs_review",
      marketContext: "My own market note",
      whatToImprove: "Write the trigger and invalidation before entry.",
      aiDraft: {
        source: "external_ai",
        reviewStatus: "awaiting_user_review",
      },
    });
    expect(merged.journal?.emotionBefore).toMatch(
      /AI hypothesis · low confidence/,
    );
  });

  it("rejects uncited evidence and high-confidence mental-state claims", () => {
    const analysis = fixture();
    const trade = importedTrade(analysis.trades[0].sourceId);
    const pkg = createAiJournalEvidencePackage(analysis, [trade]);
    const response = responseForPackage(pkg);
    response.entries[0].mentalStateHypotheses[0].confidence = "high" as "low";
    response.entries[0].strategy.evidenceRefs = ["invented:evidence"];

    const validation = validateExternalAiJournalResponse(
      JSON.stringify(response),
      pkg,
    );
    expect(validation.valid).toBe(false);
    expect(validation.errors.join(" ")).toMatch(/unknown evidence reference/i);
    expect(validation.errors.join(" ")).toMatch(
      /mental-state hypotheses cannot/i,
    );
  });
});
