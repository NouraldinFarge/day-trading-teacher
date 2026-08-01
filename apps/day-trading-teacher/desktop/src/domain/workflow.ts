import type { AppState, Lesson } from "./types";

export type ResponsibleAction = {
  id: "learn" | "plan" | "record" | "reflect";
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  to: "/learn" | "/plan" | "/trades";
};

export type WorkflowStep = {
  id: ResponsibleAction["id"];
  label: string;
  description: string;
  to: ResponsibleAction["to"];
  hasEvidence: boolean;
};

export function pendingReflections(state: AppState) {
  return state.trades.filter((trade) => trade.journal?.status !== "reviewed");
}

export function reviewedTradeCount(state: AppState) {
  return state.trades.filter((trade) => trade.journal?.status === "reviewed")
    .length;
}

export function nextResponsibleAction(
  state: AppState,
  lessons: Lesson[],
): ResponsibleAction {
  const pending = pendingReflections(state);
  if (pending.length) {
    return {
      id: "reflect",
      eyebrow: "Close the learning loop",
      title: `Reflect on ${pending[0].symbol} before adding more analysis`,
      description: `${pending.length} completed ${pending.length === 1 ? "trade needs" : "trades need"} decision context. Preserve what happened, what you noticed, and one observable correction.`,
      cta: "Review the next trade",
      to: "/trades",
    };
  }

  const nextLesson = lessons.find(
    (lesson) => !state.progress.completedLessonIds.includes(lesson.lesson_id),
  );
  if (nextLesson) {
    return {
      id: "learn",
      eyebrow: "Next deliberate practice",
      title: nextLesson.title,
      description: `${nextLesson.estimated_minutes} focused minutes. Attempt the decisions, inspect the reasoning, and transfer the skill without placing a trade.`,
      cta: state.progress.practiceAttempts
        ? "Continue the core path"
        : "Start the core path",
      to: "/learn",
    };
  }

  if (!state.plans.length) {
    return {
      id: "plan",
      eyebrow: "Put the learning into a decision",
      title: "Write a complete no-click practice plan",
      description:
        "Define eligibility, invalidation, risk, exit logic, and the conditions that make no trade the correct result.",
      cta: "Write a practice plan",
      to: "/plan",
    };
  }

  return {
    id: "learn",
    eyebrow: "Retrieve before repeating",
    title: "Revisit the core path without hints",
    description:
      "A completed pass is not permanent mastery. Return to an earlier lesson and explain the decision process from memory.",
    cta: "Choose a retrieval lesson",
    to: "/learn",
  };
}

export function workflowSteps(state: AppState): WorkflowStep[] {
  return [
    {
      id: "learn",
      label: "Learn",
      description: "Practice one decision skill",
      to: "/learn",
      hasEvidence: state.progress.practiceAttempts > 0,
    },
    {
      id: "plan",
      label: "Plan",
      description: "Decide before the outcome",
      to: "/plan",
      hasEvidence: state.plans.length > 0,
    },
    {
      id: "record",
      label: "Record",
      description: "Import or enter the facts",
      to: "/trades",
      hasEvidence: state.trades.length > 0,
    },
    {
      id: "reflect",
      label: "Reflect",
      description: "Preserve context and correction",
      to: "/trades",
      hasEvidence: reviewedTradeCount(state) > 0,
    },
  ];
}
