import { describe, expect, it } from "vitest";
import { builtInLessons } from "./builtin-lessons";
import type { AppState } from "./types";
import {
  nextResponsibleAction,
  pendingReflections,
  reviewedTradeCount,
  workflowSteps,
} from "./workflow";

const state = {
  schemaVersion: 1,
  onboardingComplete: true,
  profile: {
    displayName: "Learner",
    experience: "beginner",
    broker: "Fidelity",
    accountType: "paper",
    maxRiskPerTrade: "25",
    dailyLossLimit: "75",
    studyMinutes: 20,
    plainLanguage: true,
    reducedMotion: false,
    theme: "dark",
  },
  plans: [],
  trades: [],
  customLessonPlans: [],
  progress: {
    completedLessonIds: [],
    practiceAttempts: 0,
    lessonConfidence: {},
    lessonActivityByDate: {},
  },
} satisfies AppState;

describe("responsible workflow", () => {
  it("starts with deliberate practice when no evidence is waiting", () => {
    expect(nextResponsibleAction(state, builtInLessons)).toMatchObject({
      id: "learn",
      to: "/learn",
    });
    expect(workflowSteps(state).every((step) => !step.hasEvidence)).toBe(true);
  });

  it("prioritizes an unfinished reflection over another activity", () => {
    const withTrade: AppState = {
      ...state,
      trades: [
        {
          id: "trade-1",
          symbol: "SPY",
          side: "long",
          entry: "1",
          exit: "2",
          quantity: "1",
          fees: "0",
          planId: null,
          followedPlan: false,
          respectedStop: false,
          notes: "",
          occurredAt: "2026-07-17T00:00:00Z",
          grossPnl: "1",
          netPnl: "1",
          rMultiple: null,
          review: {
            processClassification: "not_scorable",
            outcome: "profitable",
            processScore: null,
            dataQuality: "partial",
            strength: "",
            primaryCorrection: "",
            evidence: [],
            assignedLessonId: "builtin-tr-002",
          },
          journal: {
            status: "needs_review",
            setup: "",
            marketContext: "",
            entryReason: "",
            exitReason: "",
            whatWentWell: "",
            whatToImprove: "",
            emotionBefore: "",
            emotionAfter: "",
            focusRating: null,
            tags: [],
            reviewedAt: null,
          },
        },
      ],
    };
    expect(pendingReflections(withTrade)).toHaveLength(1);
    expect(reviewedTradeCount(withTrade)).toBe(0);
    expect(nextResponsibleAction(withTrade, builtInLessons)).toMatchObject({
      id: "reflect",
      to: "/trades",
    });
  });
});
