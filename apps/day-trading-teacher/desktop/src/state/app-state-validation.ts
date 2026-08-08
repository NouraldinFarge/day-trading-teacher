import { z } from "zod";
import { storedLessonPlanSchema } from "../domain/lesson-plan-schema";
import type { AppState } from "../domain/types";
import { findSensitiveStateFields } from "./state-data-security";

export const MAX_STATE_IMPORT_BYTES = 64_000_000;

const shortText = z.string().max(500);
const longText = z.string().max(20_000);
const numericText = z
  .string()
  .max(100)
  .refine(
    (value) => value.trim() !== "" && Number.isFinite(Number(value)),
    "Must be a valid number",
  );
const nonnegativeNumericText = numericText.refine(
  (value) => Number(value) >= 0,
  "Must be zero or greater",
);
const positiveNumericText = numericText.refine(
  (value) => Number(value) > 0,
  "Must be greater than zero",
);
const dateText = z
  .string()
  .max(80)
  .refine(
    (value) => Number.isFinite(Date.parse(value)),
    "Must be a valid date",
  );
const optionalDate = dateText.nullable();
const localImageDataUrl = z
  .string()
  .max(3_000_000)
  .refine(
    (value) => /^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(value),
    "Must be a locally stored image",
  );
const checklistSchema = z
  .record(z.string().max(80), z.boolean())
  .refine(
    (value) => Object.keys(value).length <= 40,
    "Too many checklist items",
  );

const profileSchema = z
  .object({
    displayName: z.string().min(1).max(40),
    experience: z.enum(["beginner", "developing", "advanced"]),
    broker: shortText,
    accountType: z.enum(["cash", "margin", "paper"]),
    maxRiskPerTrade: positiveNumericText,
    dailyLossLimit: positiveNumericText,
    studyMinutes: z.union([
      z.literal(10),
      z.literal(20),
      z.literal(45),
      z.literal(90),
    ]),
    plainLanguage: z.boolean(),
    reducedMotion: z.boolean(),
    theme: z.enum(["system", "light", "dark"]),
    startingBalance: positiveNumericText.optional(),
    standaloneTools: z.boolean().optional(),
  })
  .passthrough();

const planSchema = z
  .object({
    id: shortText,
    symbol: shortText,
    side: z.enum(["long", "short"]),
    setup: longText,
    thesis: longText,
    trigger: longText.optional(),
    entry: positiveNumericText,
    stop: positiveNumericText,
    target: z.union([z.literal(""), positiveNumericText]),
    executionPlan: longText.optional(),
    exitPlan: longText.optional(),
    timeStop: longText.optional(),
    maximumRisk: positiveNumericText,
    slippagePerUnit: nonnegativeNumericText,
    plannedQuantity: z.number().finite().nonnegative(),
    plannedRisk: nonnegativeNumericText,
    noTradeConditions: longText,
    sourceLessonId: shortText.optional(),
    sourceLessonTitle: longText.optional(),
    createdAt: dateText,
    lockedAt: optionalDate,
  })
  .passthrough();

const reviewSchema = z
  .object({
    processClassification: z.enum([
      "strong",
      "adequate",
      "weak",
      "not_scorable",
    ]),
    outcome: z.enum(["profitable", "losing", "flat"]),
    processScore: z.number().finite().min(0).max(100).nullable(),
    dataQuality: z.enum(["complete", "partial"]),
    strength: longText,
    primaryCorrection: longText,
    evidence: z.array(longText).max(100),
    assignedLessonId: shortText,
  })
  .passthrough();

const journalSchema = z
  .object({
    status: z.enum(["needs_review", "reviewed"]),
    setup: longText,
    marketContext: longText,
    entryReason: longText,
    exitReason: longText,
    whatWentWell: longText,
    whatToImprove: longText,
    emotionBefore: longText,
    emotionAfter: longText,
    focusRating: z.number().finite().min(1).max(5).nullable(),
    tags: z.array(shortText).max(100),
    reviewedAt: optionalDate,
    strategy: longText.optional(),
    mistakes: z.array(longText).max(100).optional(),
    lessonsLearned: longText.optional(),
    confidenceRating: z.number().finite().min(1).max(5).nullable().optional(),
    preTradeChecklist: checklistSchema.optional(),
    postTradeChecklist: checklistSchema.optional(),
    screenshotRefs: z.array(localImageDataUrl).max(3).optional(),
  })
  .passthrough();

const tradeSchema = z
  .object({
    id: shortText,
    symbol: shortText,
    side: z.enum(["long", "short"]),
    entry: positiveNumericText,
    exit: positiveNumericText,
    quantity: positiveNumericText,
    fees: nonnegativeNumericText,
    planId: shortText.nullable(),
    followedPlan: z.boolean(),
    respectedStop: z.boolean(),
    notes: longText,
    occurredAt: dateText,
    grossPnl: numericText,
    netPnl: numericText,
    rMultiple: numericText.nullable(),
    review: reviewSchema,
    importSource: z.enum(["manual", "fidelity_csv"]).optional(),
    sourceId: shortText.optional(),
    entryAt: dateText.optional(),
    exitAt: dateText.optional(),
    holdingSeconds: z.number().finite().nonnegative().optional(),
    orderType: shortText.optional(),
    journal: journalSchema.optional(),
  })
  .passthrough();

const marketBarSchema = z
  .object({
    timestamp: dateText,
    open: z.number().finite().positive(),
    high: z.number().finite().positive(),
    low: z.number().finite().positive(),
    close: z.number().finite().positive(),
    volume: z.number().finite().nonnegative().nullable(),
  })
  .strict()
  .refine(
    (bar) =>
      bar.high >= Math.max(bar.open, bar.close, bar.low) &&
      bar.low <= Math.min(bar.open, bar.close, bar.high),
    "OHLC values are inconsistent",
  );

const providerSchema = z.enum([
  "massive",
  "alpaca",
  "tradier",
  "alpha_vantage",
]);
const marketDataSetSchema = z
  .object({
    id: shortText,
    name: shortText,
    symbol: shortText,
    timeframe: shortText,
    sourceType: z.enum(["csv", "sample", "provider"]),
    sourceFile: shortText,
    importedAt: dateText,
    bars: z.array(marketBarSchema).min(3).max(20_000),
    provider: providerSchema.optional(),
    feed: shortText.optional(),
    freshness: shortText.optional(),
    session: z.enum(["regular", "extended"]).optional(),
    adjusted: z.boolean().optional(),
    importSummary: z
      .object({
        firstTimestamp: dateText,
        lastTimestamp: dateText,
        indicatorColumns: z.array(shortText).max(32),
        discontinuityCount: z.number().int().nonnegative(),
        matchedTradeCount: z.number().int().nonnegative(),
      })
      .strict()
      .optional(),
  })
  .passthrough();

const chartAcquisitionSchema = z
  .object({
    provider: providerSchema.optional(),
    subscriptions: z
      .array(
        z
          .object({
            provider: providerSchema,
            symbol: shortText,
            interval: z.enum(["daily", "1min"]),
          })
          .strict(),
      )
      .max(5)
      .optional(),
    symbols: z.array(shortText).max(5).optional(),
    oneMinuteSymbols: z.array(shortText).max(5).optional(),
    autoRefresh: z.boolean().optional(),
    refreshIntervalHours: z.number().finite().positive().optional(),
    intradayRefreshMinutes: z.number().finite().positive().optional(),
    lastRefreshAt: optionalDate.optional(),
    lastDailyRefreshAt: optionalDate.optional(),
    lastOneMinuteRefreshAt: optionalDate.optional(),
    lastRefreshMessage: longText.optional(),
  })
  .passthrough();

const chartWorkspaceSchema = z
  .object({
    templateId: z.enum([
      "price_action",
      "trend",
      "momentum",
      "risk_review",
      "custom",
    ]),
    style: z.enum(["candles", "hollow", "line"]),
    lowerStudy: z.enum(["volume", "rsi", "macd", "atr", "none"]),
    scaleMode: z.enum(["linear", "log"]),
    crosshair: z.boolean(),
    gridLines: z.boolean(),
    extremeLabels: z.boolean(),
    extendedHours: z.boolean(),
    overlays: z
      .object({
        fast: z.boolean(),
        slow: z.boolean(),
        ema: z.boolean(),
        vwap: z.boolean(),
        bollinger: z.boolean(),
        recorded: z.boolean(),
        simulation: z.boolean(),
        paper: z.boolean(),
      })
      .strict(),
  })
  .strict();

const paperTradingOrderSchema = z
  .object({
    id: shortText,
    action: z.enum(["open_long", "open_short", "close_position"]),
    type: z.enum(["market", "limit"]),
    quantity: z.number().int().positive(),
    limitPrice: z.number().finite().positive().nullable(),
    stopPrice: z.number().finite().positive().nullable(),
    targetPrice: z.number().finite().positive().nullable(),
    submittedAt: dateText,
    submittedBarIndex: z.number().int().nonnegative(),
  })
  .strict();

const paperTradingPositionSchema = z
  .object({
    id: shortText,
    side: z.enum(["long", "short"]),
    quantity: z.number().int().positive(),
    entryPrice: z.number().finite().positive(),
    entryAt: dateText,
    entryBarIndex: z.number().int().nonnegative(),
    stopPrice: z.number().finite().positive(),
    targetPrice: z.number().finite().positive().nullable(),
    initialRisk: z.number().finite().nonnegative(),
    entryFee: z.number().finite().nonnegative(),
  })
  .strict();

const paperTradingTradeSchema = z
  .object({
    id: shortText,
    side: z.enum(["long", "short"]),
    quantity: z.number().int().positive(),
    entryPrice: z.number().finite().positive(),
    exitPrice: z.number().finite().positive(),
    entryAt: dateText,
    exitAt: dateText,
    entryBarIndex: z.number().int().nonnegative(),
    exitBarIndex: z.number().int().nonnegative(),
    grossPnl: z.number().finite(),
    netPnl: z.number().finite(),
    rMultiple: z.number().finite(),
    exitReason: z.enum([
      "stop",
      "target",
      "manual",
      "session_end",
      "ambiguous_stop_first",
    ]),
  })
  .strict();

const paperTradingEventSchema = z
  .object({
    id: shortText,
    kind: z.enum(["session", "order", "fill", "risk", "exit"]),
    at: dateText,
    barIndex: z.number().int().nonnegative(),
    message: longText,
  })
  .strict();

const paperTradingSessionSchema = z
  .object({
    id: shortText,
    dataSetId: shortText,
    symbol: shortText,
    timeframe: shortText,
    status: z.enum(["active", "completed"]),
    createdAt: dateText,
    updatedAt: dateText,
    endedAt: optionalDate,
    startingBalance: z.number().finite().positive(),
    realizedPnl: z.number().finite(),
    feesPaid: z.number().finite().nonnegative(),
    peakEquity: z.number().finite(),
    maxDrawdown: z.number().finite().nonnegative(),
    maxRiskPerTrade: z.number().finite().positive(),
    dailyLossLimit: z.number().finite().positive(),
    slippagePerShare: z.number().finite().nonnegative(),
    commissionPerOrder: z.number().finite().nonnegative(),
    replayIndex: z.number().int().nonnegative(),
    lastProcessedBarIndex: z.number().int().nonnegative(),
    pendingOrder: paperTradingOrderSchema.nullable(),
    position: paperTradingPositionSchema.nullable(),
    trades: z.array(paperTradingTradeSchema).max(500),
    events: z.array(paperTradingEventSchema).max(100),
  })
  .passthrough();

const appStateSchema = z
  .object({
    schemaVersion: z.literal(1),
    onboardingComplete: z.boolean().optional(),
    profile: profileSchema,
    plans: z.array(planSchema).max(10_000),
    trades: z.array(tradeSchema).max(50_000),
    customLessonPlans: z.array(storedLessonPlanSchema).max(100),
    progress: z
      .object({
        completedLessonIds: z.array(shortText).max(10_000),
        practiceAttempts: z.number().int().nonnegative(),
        lessonConfidence: z
          .record(
            z.string().max(500),
            z.union([z.literal(1), z.literal(2), z.literal(3)]),
          )
          .optional(),
        lessonActivityByDate: z
          .record(z.string().max(20), z.number().int().nonnegative())
          .optional(),
        lessonLastPracticed: z
          .record(z.string().max(500), dateText)
          .refine(
            (value) => Object.keys(value).length <= 10_000,
            "Too many lesson practice records",
          )
          .optional(),
        lessonMastery: z
          .record(
            z.string().max(500),
            z
              .object({
                lessonVersion: z.string().max(40),
                attempts: z.number().int().nonnegative(),
                lastPracticedAt: dateText,
                objectiveChecks: z.number().int().nonnegative(),
                firstTryCorrect: z.number().int().nonnegative(),
                correctionsCompleted: z.number().int().nonnegative(),
                bestFirstTryPercent: z.number().int().min(0).max(100),
                practiceDays: z
                  .array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
                  .max(366)
                  .optional(),
                totalCorrectionsCompleted: z
                  .number()
                  .int()
                  .nonnegative()
                  .optional(),
                standardPracticeDays: z
                  .array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
                  .max(366)
                  .optional(),
                lastStandardMet: z.boolean().optional(),
                lastIndependentCases: z.number().int().nonnegative().optional(),
                lastSuccessfulCases: z.number().int().nonnegative().optional(),
                bestRubricAverage: z.number().min(0).max(3).optional(),
              })
              .strict(),
          )
          .refine(
            (value) => Object.keys(value).length <= 10_000,
            "Too many lesson mastery records",
          )
          .optional(),
        toolPracticeAttempts: z.number().int().nonnegative().optional(),
        toolActivityByDate: z
          .record(z.string().max(20), z.number().int().nonnegative())
          .optional(),
        toolLastPracticed: z
          .record(z.string().max(100), dateText)
          .refine((value) => Object.keys(value).length <= 100, "Too many tools")
          .optional(),
        conceptRecall: z
          .record(
            z.string().max(100),
            z
              .object({
                strength: z.union([
                  z.literal(0),
                  z.literal(1),
                  z.literal(2),
                  z.literal(3),
                ]),
                attempts: z.number().int().nonnegative(),
                lastReviewedAt: dateText,
                nextReviewAt: dateText,
                lastRating: z.enum(["again", "hard", "good"]),
              })
              .strict(),
          )
          .refine(
            (value) => Object.keys(value).length <= 100,
            "Too many recall records",
          )
          .optional(),
      })
      .passthrough(),
    fidelityImport: z
      .object({
        folderPath: longText,
        autoScan: z.boolean(),
        lastScanAt: optionalDate,
        lastFileKey: longText.nullable(),
      })
      .passthrough()
      .optional(),
    journalGoals: z
      .array(
        z
          .object({
            id: shortText,
            title: shortText,
            metric: z.enum([
              "reflection_rate",
              "plan_coverage",
              "rule_adherence",
              "weekly_reflections",
              "maximum_daily_loss",
              "focused_execution",
            ]),
            target: z.number().finite().nonnegative(),
            period: z.enum(["weekly", "monthly"]),
            createdAt: dateText,
            archivedAt: optionalDate,
          })
          .passthrough(),
      )
      .max(1_000)
      .optional(),
    journalDashboard: z
      .object({
        defaultRange: z.enum([
          "day",
          "week",
          "month",
          "quarter",
          "year",
          "all",
        ]),
        calendarMetric: z.enum(["pnl", "activity", "reflection", "discipline"]),
        compactCards: z.boolean(),
        visibleWidgets: z
          .array(z.enum(["performance", "insights", "records", "activity"]))
          .max(4),
      })
      .passthrough()
      .optional(),
    achievementUnlocks: z.record(z.string().max(200), dateText).optional(),
    marketDataSets: z.array(marketDataSetSchema).max(8).optional(),
    chartAcquisition: chartAcquisitionSchema.optional(),
    chartWorkspace: chartWorkspaceSchema.optional(),
    paperTradingSessions: z.array(paperTradingSessionSchema).max(50).optional(),
  })
  .passthrough();

export type AppStateValidation =
  | { valid: true; state: AppState; errors: [] }
  | { valid: false; errors: string[] };

export function validateAppState(value: unknown): AppStateValidation {
  const sensitiveFields = findSensitiveStateFields(value);
  if (sensitiveFields.length)
    return {
      valid: false,
      errors: [
        `State exports cannot contain credentials or secrets: ${sensitiveFields.slice(0, 4).join(", ")}`,
      ],
    };
  const result = appStateSchema.safeParse(value);
  if (result.success)
    return { valid: true, state: result.data as AppState, errors: [] };
  return {
    valid: false,
    errors: result.error.issues
      .slice(0, 8)
      .map((issue) => `${issue.path.join(".") || "state"}: ${issue.message}`),
  };
}
