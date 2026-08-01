import type { AppState } from "./types";
import { achievementXp } from "./achievements";

export const xpRules = {
  lessonPractice: 80,
  uniqueLesson: 40,
  confidenceReflection: 20,
  writtenPlan: 30,
  completedReview: 50,
} as const;

const levels = [
  { name: "Process Apprentice", threshold: 0 },
  { name: "Intentional Planner", threshold: 250 },
  { name: "Risk Steward", threshold: 600 },
  { name: "Process Builder", threshold: 1000 },
  { name: "Mentor Mindset", threshold: 1600 },
] as const;

export function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function calculateXp(state: AppState) {
  const completedReviews = state.trades.filter(
    (trade) => trade.journal?.status === "reviewed",
  ).length;
  return (
    state.progress.practiceAttempts * xpRules.lessonPractice +
    state.progress.completedLessonIds.length * xpRules.uniqueLesson +
    Object.keys(state.progress.lessonConfidence ?? {}).length *
      xpRules.confidenceReflection +
    state.plans.length * xpRules.writtenPlan +
    completedReviews * xpRules.completedReview +
    achievementXp(state)
  );
}

export function engagementLevel(xp: number) {
  let index = levels.length - 1;
  while (index > 0 && xp < levels[index].threshold) index -= 1;
  const current = levels[index];
  const next = levels[index + 1] ?? null;
  const progress = next
    ? Math.round(
        ((xp - current.threshold) / (next.threshold - current.threshold)) * 100,
      )
    : 100;
  return {
    index: index + 1,
    name: current.name,
    xp,
    next,
    progress: Math.max(0, Math.min(progress, 100)),
  };
}

export function dailyMissions(state: AppState, now = new Date()) {
  const today = localDateKey(now);
  const completedLesson =
    (state.progress.lessonActivityByDate?.[today] ?? 0) > 0;
  const wrotePlan = state.plans.some(
    (plan) => localDateKey(new Date(plan.createdAt)) === today,
  );
  const reviewedTrade = state.trades.some(
    (trade) =>
      trade.journal?.reviewedAt &&
      localDateKey(new Date(trade.journal.reviewedAt)) === today,
  );
  return [
    {
      id: "learn",
      title: "Strengthen one skill",
      description: "Complete a focused lesson practice.",
      complete: completedLesson,
      xp: xpRules.lessonPractice,
      to: "/learn" as const,
    },
    {
      id: "plan",
      title: "Decide before outcome",
      description: "Write and timestamp one trade plan.",
      complete: wrotePlan,
      xp: xpRules.writtenPlan,
      to: "/plan" as const,
    },
    {
      id: "review",
      title: "Close the learning loop",
      description: "Record and review one completed trade.",
      complete: reviewedTrade,
      xp: xpRules.completedReview,
      to: "/trades" as const,
    },
  ];
}
