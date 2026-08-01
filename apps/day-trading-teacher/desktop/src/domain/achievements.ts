import type { AppState, Trade } from "./types";

export type AchievementTier =
  "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";
export type AchievementCategory =
  | "Learning"
  | "Journaling"
  | "Consistency"
  | "Discipline"
  | "Risk"
  | "Emotional control"
  | "Strategy mastery"
  | "Profitability"
  | "Long-term improvement";
export type AchievementKind =
  | "Milestone"
  | "Mastery"
  | "Exploration"
  | "Persistence"
  | "Collection"
  | "Capstone"
  | "Surprise";
export type AchievementActionPath =
  "/learn" | "/learn/tools" | "/plan" | "/trades" | "/progress" | "/chart";

type Metric =
  | "reflections"
  | "review_days"
  | "plan_coverage"
  | "rule_adherence"
  | "focus_logs"
  | "emotion_logs"
  | "strategy_labels"
  | "setup_depth"
  | "historical_datasets"
  | "positive_expectancy"
  | "active_months"
  | "good_loss"
  | "honest_correction"
  | "calm_loss"
  | "consecutive_rules"
  | "core_lessons"
  | "lesson_days"
  | "corrected_lessons"
  | "spaced_lessons"
  | "retained_lessons"
  | "lesson_artifacts";

export type AchievementDefinition = {
  id: string;
  title: string;
  category: AchievementCategory;
  tier: AchievementTier;
  description: string;
  requirement: string;
  purpose: string;
  achievementType: AchievementKind;
  criteriaVersion: string;
  actionPath: AchievementActionPath;
  metric: Metric;
  target: number;
  lessonId?: string;
  minimumSample?: number;
  hidden?: boolean;
  hiddenHint?: string;
  rewardXp: number;
};
export type AchievementProgress = AchievementDefinition & {
  current: number;
  progress: number;
  unlocked: boolean;
  unlockedAt: string | null;
};

const tierRewards: Record<AchievementTier, number> = {
  Bronze: 20,
  Silver: 40,
  Gold: 75,
  Platinum: 125,
  Diamond: 200,
};
const defaultTypeByCategory: Record<AchievementCategory, AchievementKind> = {
  Learning: "Mastery",
  Journaling: "Persistence",
  Consistency: "Persistence",
  Discipline: "Mastery",
  Risk: "Mastery",
  "Emotional control": "Mastery",
  "Strategy mastery": "Exploration",
  Profitability: "Milestone",
  "Long-term improvement": "Persistence",
};
const defaultPathByCategory: Record<
  AchievementCategory,
  AchievementActionPath
> = {
  Learning: "/learn",
  Journaling: "/trades",
  Consistency: "/progress",
  Discipline: "/plan",
  Risk: "/plan",
  "Emotional control": "/trades",
  "Strategy mastery": "/chart",
  Profitability: "/trades",
  "Long-term improvement": "/progress",
};
type AchievementInput = Omit<
  AchievementDefinition,
  "rewardXp" | "purpose" | "achievementType" | "criteriaVersion" | "actionPath"
> & {
  rewardXp?: number;
  purpose?: string;
  achievementType?: AchievementKind;
  criteriaVersion?: string;
  actionPath?: AchievementActionPath;
};
const make = (definition: AchievementInput): AchievementDefinition => ({
  ...definition,
  purpose: definition.purpose ?? definition.requirement,
  achievementType:
    definition.achievementType ??
    (definition.hidden
      ? "Surprise"
      : defaultTypeByCategory[definition.category]),
  criteriaVersion: definition.criteriaVersion ?? "1.0",
  actionPath:
    definition.actionPath ?? defaultPathByCategory[definition.category],
  rewardXp: definition.rewardXp ?? tierRewards[definition.tier],
});

const lessonArtifacts = [
  {
    lessonId: "builtin-tr-002",
    id: "learn-evidence-cartographer",
    title: "Evidence Cartographer",
    tier: "Bronze" as const,
    target: 2,
    purpose:
      "Recognizes returning to reconstruct messy execution evidence without inventing intent.",
  },
  {
    lessonId: "builtin-ac-001",
    id: "learn-account-boundary-verifier",
    title: "Account Boundary Verifier",
    tier: "Silver" as const,
    target: 2,
    purpose:
      "Recognizes verifying settled funds, current margin treatment, costs, suitability, and broker-specific fractional behavior before relying on a ticket.",
  },
  {
    lessonId: "builtin-rm-004",
    id: "learn-boundary-architect",
    title: "Boundary Architect",
    tier: "Silver" as const,
    target: 2,
    purpose:
      "Recognizes repeated risk decisions that place size beneath invalidation and total exposure.",
  },
  {
    lessonId: "builtin-vc-001",
    id: "learn-eligibility-gatekeeper",
    title: "Eligibility Gatekeeper",
    tier: "Silver" as const,
    target: 2,
    purpose:
      "Recognizes using measurable gates and letting missing evidence produce a valid no-trade decision.",
  },
  {
    lessonId: "builtin-tp-003",
    id: "learn-decision-card-builder",
    title: "Decision Card Builder",
    tier: "Gold" as const,
    target: 2,
    purpose:
      "Recognizes separating playbook quality, plan quality, and adherence before outcome is known.",
  },
  {
    lessonId: "builtin-oe-006",
    id: "learn-failure-mode-reader",
    title: "Failure-Mode Reader",
    tier: "Gold" as const,
    target: 2,
    purpose:
      "Recognizes choosing order behavior by the consequence a plan can tolerate, not by speed or excitement.",
  },
  {
    lessonId: "builtin-pb-006",
    id: "learn-independent-mind",
    title: "Independent Mind",
    tier: "Gold" as const,
    target: 2,
    purpose:
      "Recognizes rebuilding evidence and risk between decisions after wins, losses, and missed trades.",
  },
  {
    lessonId: "builtin-tf-009",
    id: "learn-uncertainty-steward",
    title: "Uncertainty Steward",
    tier: "Platinum" as const,
    target: 2,
    purpose:
      "Recognizes preserving uncertainty while reviewing evidence, process, outcome, and samples separately.",
  },
  {
    lessonId: "builtin-capstone-001",
    id: "learn-replay-integrator",
    title: "Replay Integrator",
    tier: "Diamond" as const,
    target: 4,
    purpose:
      "Recognizes four separated capstone passes through the complete outcome-hidden decision chain.",
  },
] as const;

export function lessonAchievementIdFor(lessonId: string) {
  return lessonArtifacts.find((artifact) => artifact.lessonId === lessonId)?.id;
}

const learningAchievements: AchievementDefinition[] = [
  make({
    id: "learn-first-pass",
    title: "First Deliberate Pass",
    category: "Learning",
    tier: "Bronze",
    description: "Complete one core lesson through feedback and reflection.",
    requirement:
      "Complete every activity, correct every objective check, review guided feedback, and record confidence in one built-in lesson.",
    purpose:
      "Introduces the learning loop without claiming that one completion equals mastery.",
    achievementType: "Milestone",
    metric: "core_lessons",
    target: 1,
    rewardXp: 20,
  }),
  make({
    id: "learn-correction-courage",
    title: "Correction Courage",
    category: "Learning",
    tier: "Bronze",
    description: "Identify and repair a reasoning gap in one core lesson.",
    requirement:
      "Mark a guided response as having a gap and write the corrected rule before completing the lesson.",
    purpose:
      "Treats honest error correction as evidence of learning rather than failure.",
    achievementType: "Mastery",
    metric: "corrected_lessons",
    target: 1,
    rewardXp: 20,
  }),
  make({
    id: "learn-core-atlas",
    title: "Decision-Chain Atlas",
    category: "Learning",
    tier: "Gold",
    description: "Complete a deliberate pass through all nine core lessons.",
    requirement:
      "Complete each current built-in lesson at least once; prior or imported lesson IDs do not count.",
    purpose:
      "Creates a coherent record of exploring the full evidence-to-review curriculum.",
    achievementType: "Collection",
    metric: "core_lessons",
    target: 9,
    rewardXp: 0,
  }),
  make({
    id: "learn-spaced-evidence",
    title: "Return With Evidence",
    category: "Learning",
    tier: "Gold",
    description: "Practice three different core lessons on separated dates.",
    requirement:
      "Record deliberate lesson passes on at least two different local calendar dates for three built-in lessons.",
    purpose:
      "Recognizes spacing and return visits without punishing rest days or creating a streak.",
    achievementType: "Persistence",
    metric: "spaced_lessons",
    target: 3,
    rewardXp: 0,
  }),
  make({
    id: "learn-retained-reasoning",
    title: "Reasoning That Returned",
    category: "Learning",
    tier: "Platinum",
    description:
      "Show clean first-try objective checks after spacing in four core lessons.",
    requirement:
      "For four built-in lessons, practice on at least two dates and reach 100% best first-try objective-check accuracy.",
    purpose:
      "Recognizes retrieval that remained available later instead of familiarity during one sitting.",
    achievementType: "Mastery",
    metric: "retained_lessons",
    target: 4,
    rewardXp: 0,
  }),
  ...lessonArtifacts.map((artifact) =>
    make({
      id: artifact.id,
      title: artifact.title,
      category: "Learning",
      tier: artifact.tier,
      description: `Build a separated practice record for this lesson across ${artifact.target} different local calendar dates.`,
      requirement: `Meet the linked lesson's first-try, unseen-case, and analytic-rubric standard on ${artifact.target} different local calendar dates. Guided completion remains recorded, but only a standard-qualified pass advances this artifact; repeated passes on one date count once.`,
      purpose: artifact.purpose,
      achievementType:
        artifact.lessonId === "builtin-capstone-001" ? "Capstone" : "Mastery",
      metric: "lesson_days",
      target: artifact.target,
      lessonId: artifact.lessonId,
      rewardXp: 0,
      criteriaVersion: "2.0",
    }),
  ),
  make({
    id: "learn-complete-artifact-set",
    title: "Process Constellation",
    category: "Learning",
    tier: "Diamond",
    description: "Earn all nine lesson-specific mastery artifacts.",
    requirement:
      "Meet each lesson's quantitative evidence standard on at least two dates and the capstone standard on at least four dates. Rest days never break progress.",
    purpose:
      "Creates a long-horizon record of the complete decision process without requiring a live trade.",
    achievementType: "Capstone",
    metric: "lesson_artifacts",
    target: 9,
    rewardXp: 0,
  }),
];

export const achievementDefinitions: AchievementDefinition[] = [
  ...learningAchievements,
  ...([1, 5, 20, 50, 100] as const).map((target, index) =>
    make({
      id: `journal-${target}`,
      title: [
        "First Debrief",
        "Reflection Builder",
        "Journal Practitioner",
        "Evidence Curator",
        "Journal Steward",
      ][index],
      category: "Journaling",
      tier: (
        ["Bronze", "Silver", "Gold", "Platinum", "Diamond"] as AchievementTier[]
      )[index],
      description: `Complete ${target} thoughtful trade reflection${target === 1 ? "" : "s"}.`,
      requirement:
        "A reflection must preserve decision context, not merely P&L.",
      metric: "reflections",
      target,
    }),
  ),
  ...([3, 7, 30, 90, 180] as const).map((target, index) =>
    make({
      id: `consistency-${target}`,
      title: [
        "Return to Review",
        "Weekly Rhythm",
        "Thirty Evidence Days",
        "Quarterly Practice",
        "Long-Horizon Learner",
      ][index],
      category: "Consistency",
      tier: (
        ["Bronze", "Silver", "Gold", "Platinum", "Diamond"] as AchievementTier[]
      )[index],
      description: `Complete reflections on ${target} different days.`,
      requirement: "Rest days and no-trade days never break this record.",
      metric: "review_days",
      target,
    }),
  ),
  ...([60, 75, 85, 92, 98] as const).map((target, index) =>
    make({
      id: `discipline-${target}`,
      title: [
        "Plan Linker",
        "Plan Habit",
        "Intentional Executor",
        "Plan Guardian",
        "Process Anchor",
      ][index],
      category: "Discipline",
      tier: (
        ["Bronze", "Silver", "Gold", "Platinum", "Diamond"] as AchievementTier[]
      )[index],
      description: `Link at least ${target}% of a reviewed sample to pre-trade plans.`,
      requirement: `Requires at least ${[3, 10, 20, 40, 75][index]} reviewed trades; taking more trades is never a goal.`,
      metric: "plan_coverage",
      target,
      minimumSample: [3, 10, 20, 40, 75][index],
    }),
  ),
  ...([60, 75, 85, 92, 98] as const).map((target, index) =>
    make({
      id: `risk-${target}`,
      title: [
        "Stop Recorder",
        "Risk Routine",
        "Boundary Keeper",
        "Risk Guardian",
        "Capital Steward",
      ][index],
      category: "Risk",
      tier: (
        ["Bronze", "Silver", "Gold", "Platinum", "Diamond"] as AchievementTier[]
      )[index],
      description: `Record at least ${target}% risk-rule adherence.`,
      requirement: `Requires at least ${[3, 10, 20, 40, 75][index]} trades with risk evidence.`,
      metric: "rule_adherence",
      target,
      minimumSample: [3, 10, 20, 40, 75][index],
    }),
  ),
  ...([3, 10, 25, 50] as const).map((target, index) =>
    make({
      id: `focus-${target}`,
      title: [
        "State Check",
        "Focused Observer",
        "Emotional Cartographer",
        "Self-Regulation Practice",
      ][index],
      category: "Emotional control",
      tier: (["Bronze", "Silver", "Gold", "Platinum"] as AchievementTier[])[
        index
      ],
      description: `Record focus and emotional state in ${target} reflections.`,
      requirement: "Honest ratings matter more than high ratings.",
      metric: index % 2 ? "emotion_logs" : "focus_logs",
      target,
    }),
  ),
  ...([3, 10, 25, 50] as const).map((target, index) =>
    make({
      id: `strategy-${target}`,
      title: [
        "Name the Play",
        "Strategy Catalog",
        "Setup Specialist",
        "Strategy Historian",
      ][index],
      category: "Strategy mastery",
      tier: (["Bronze", "Silver", "Gold", "Platinum"] as AchievementTier[])[
        index
      ],
      description: `Classify ${target} reviewed trades by strategy.`,
      requirement:
        "Use stable strategy labels so comparisons remain meaningful.",
      metric: "strategy_labels",
      target,
    }),
  ),
  make({
    id: "setup-depth-5",
    title: "Setup Student",
    category: "Strategy mastery",
    tier: "Silver",
    description: "Build five reviewed examples of one setup.",
    requirement:
      "The achievement rewards evidence depth, not taking trades to fill a quota.",
    metric: "setup_depth",
    target: 5,
  }),
  make({
    id: "setup-depth-15",
    title: "Setup Researcher",
    category: "Strategy mastery",
    tier: "Platinum",
    description: "Build fifteen reviewed examples of one setup.",
    requirement: "Every example must include a completed reflection.",
    metric: "setup_depth",
    target: 15,
  }),
  make({
    id: "historical-context-1",
    title: "Historical Context",
    category: "Strategy mastery",
    tier: "Bronze",
    description: "Load one historical chart dataset for deliberate replay.",
    requirement:
      "Synthetic practice data also qualifies; placing a trade is never required.",
    metric: "historical_datasets",
    target: 1,
  }),
  make({
    id: "expectancy-5",
    title: "Positive Sample",
    category: "Profitability",
    tier: "Bronze",
    description:
      "Maintain positive recorded expectancy across five reviewed trades.",
    requirement:
      "A descriptive milestone only; it is not a forecast or a reason to trade more.",
    metric: "positive_expectancy",
    target: 1,
    minimumSample: 5,
    rewardXp: 0,
  }),
  make({
    id: "expectancy-20",
    title: "Established Positive Sample",
    category: "Profitability",
    tier: "Gold",
    description:
      "Maintain positive recorded expectancy across twenty reviewed trades.",
    requirement: "Outcomes never override risk or process quality.",
    metric: "positive_expectancy",
    target: 1,
    minimumSample: 20,
    rewardXp: 0,
  }),
  make({
    id: "expectancy-50",
    title: "Longer Positive Sample",
    category: "Profitability",
    tier: "Platinum",
    description:
      "Maintain positive recorded expectancy across fifty reviewed trades.",
    requirement: "This remains historical evidence, not predictive certainty.",
    metric: "positive_expectancy",
    target: 1,
    minimumSample: 50,
    rewardXp: 0,
  }),
  ...([2, 3, 6, 12] as const).map((target, index) =>
    make({
      id: `months-${target}`,
      title: [
        "Multi-Month Learner",
        "Quarterly Perspective",
        "Half-Year Review",
        "Year in Evidence",
      ][index],
      category: "Long-term improvement",
      tier: (["Silver", "Gold", "Platinum", "Diamond"] as AchievementTier[])[
        index
      ],
      description: `Complete reflections across ${target} different calendar months.`,
      requirement:
        "Consistency is measured by reflection months, never continuous trading.",
      metric: "active_months",
      target,
    }),
  ),
  make({
    id: "hidden-good-loss",
    title: "The Good Loss",
    category: "Discipline",
    tier: "Gold",
    description:
      "Record a losing trade that followed its plan and respected risk.",
    requirement: "Unlocked when a loss contains strong process evidence.",
    metric: "good_loss",
    target: 1,
    hidden: true,
    hiddenHint:
      "Some of the strongest process evidence can appear on a losing trade.",
  }),
  make({
    id: "hidden-honest",
    title: "Radical Honesty",
    category: "Journaling",
    tier: "Gold",
    description: "Document a specific mistake and an observable correction.",
    requirement: "Unlocked through candid reflection, not outcome.",
    metric: "honest_correction",
    target: 1,
    hidden: true,
    hiddenHint:
      "Candidly naming a mistake and an observable repair is worth recognizing.",
  }),
  make({
    id: "hidden-calm-loss",
    title: "Calm Under Pressure",
    category: "Emotional control",
    tier: "Platinum",
    description:
      "Complete a focused, emotionally aware reflection after a losing trade.",
    requirement:
      "Unlocked by preserving self-awareness during an adverse outcome.",
    metric: "calm_loss",
    target: 1,
    hidden: true,
    hiddenHint:
      "Self-awareness matters most when the recorded outcome feels adverse.",
  }),
  make({
    id: "hidden-ten-rules",
    title: "Quiet Discipline",
    category: "Risk",
    tier: "Diamond",
    description: "Record ten consecutive risk-adherent reviewed trades.",
    requirement:
      "The sequence breaks on a documented rule violation, not on a rest day.",
    metric: "consecutive_rules",
    target: 10,
    hidden: true,
    hiddenHint:
      "Quiet sequences of documented rule adherence are worth noticing.",
  }),
];

function reviewedTrades(state: AppState) {
  return state.trades.filter((trade) => trade.journal?.status === "reviewed");
}
function percentage(numerator: number, denominator: number) {
  return denominator ? (numerator / denominator) * 100 : 0;
}
function longestRuleSequence(trades: Trade[]) {
  let current = 0;
  let best = 0;
  [...trades]
    .sort((a, b) => +new Date(a.occurredAt) - +new Date(b.occurredAt))
    .forEach((trade) => {
      current = trade.respectedStop ? current + 1 : 0;
      best = Math.max(best, current);
    });
  return best;
}

function lessonPracticeDays(state: AppState, lessonId: string) {
  const record = state.progress?.lessonMastery?.[lessonId];
  if (!record) return [];
  const standardDays = record.standardPracticeDays;
  return Array.from(
    new Set(
      standardDays
        ? standardDays
        : record.practiceDays?.length
          ? record.practiceDays
          : record.lastPracticedAt
            ? [record.lastPracticedAt.slice(0, 10)]
            : [],
    ),
  );
}

function lessonRecordCount(predicate: (lessonId: string) => boolean) {
  return lessonArtifacts.filter((artifact) => predicate(artifact.lessonId))
    .length;
}

function metricValue(definition: AchievementDefinition, state: AppState) {
  const reviewed = reviewedTrades(state);
  if (definition.metric === "core_lessons")
    return lessonRecordCount(
      (lessonId) =>
        (state.progress?.lessonMastery?.[lessonId]?.attempts ?? 0) > 0,
    );
  if (definition.metric === "lesson_days")
    return definition.lessonId
      ? lessonPracticeDays(state, definition.lessonId).length
      : 0;
  if (definition.metric === "corrected_lessons")
    return lessonRecordCount(
      (lessonId) =>
        (state.progress?.lessonMastery?.[lessonId]?.totalCorrectionsCompleted ??
          state.progress?.lessonMastery?.[lessonId]?.correctionsCompleted ??
          0) > 0,
    );
  if (definition.metric === "spaced_lessons")
    return lessonRecordCount(
      (lessonId) => lessonPracticeDays(state, lessonId).length >= 2,
    );
  if (definition.metric === "retained_lessons")
    return lessonRecordCount(
      (lessonId) =>
        lessonPracticeDays(state, lessonId).length >= 2 &&
        (state.progress?.lessonMastery?.[lessonId]?.bestFirstTryPercent ?? 0) >=
          100,
    );
  if (definition.metric === "lesson_artifacts")
    return lessonArtifacts.filter(
      (artifact) =>
        lessonPracticeDays(state, artifact.lessonId).length >= artifact.target,
    ).length;
  if (definition.metric === "reflections") return reviewed.length;
  if (definition.metric === "review_days")
    return new Set(
      reviewed.map((trade) =>
        (trade.journal?.reviewedAt ?? trade.occurredAt).slice(0, 10),
      ),
    ).size;
  if (definition.metric === "plan_coverage")
    return reviewed.length >= (definition.minimumSample ?? 0)
      ? percentage(
          reviewed.filter((trade) => trade.planId).length,
          reviewed.length,
        )
      : 0;
  if (definition.metric === "rule_adherence") {
    const evidence = reviewed.filter(
      (trade) => trade.planId || trade.journal?.postTradeChecklist,
    );
    return evidence.length >= (definition.minimumSample ?? 0)
      ? percentage(
          evidence.filter((trade) => trade.respectedStop).length,
          evidence.length,
        )
      : 0;
  }
  if (definition.metric === "focus_logs")
    return reviewed.filter((trade) => trade.journal?.focusRating).length;
  if (definition.metric === "emotion_logs")
    return reviewed.filter(
      (trade) => trade.journal?.emotionBefore && trade.journal?.emotionAfter,
    ).length;
  if (definition.metric === "strategy_labels")
    return reviewed.filter((trade) => trade.journal?.strategy?.trim()).length;
  if (definition.metric === "setup_depth") {
    const setups = new Map<string, number>();
    reviewed.forEach((trade) => {
      const setup = trade.journal?.setup?.trim();
      if (setup) setups.set(setup, (setups.get(setup) ?? 0) + 1);
    });
    return Math.max(0, ...setups.values());
  }
  if (definition.metric === "historical_datasets")
    return state.marketDataSets?.length ?? 0;
  if (definition.metric === "positive_expectancy")
    return reviewed.length >= (definition.minimumSample ?? 0) &&
      reviewed.reduce((total, trade) => total + Number(trade.netPnl), 0) /
        Math.max(1, reviewed.length) >
        0
      ? 1
      : 0;
  if (definition.metric === "active_months")
    return new Set(
      reviewed.map((trade) =>
        (trade.journal?.reviewedAt ?? trade.occurredAt).slice(0, 7),
      ),
    ).size;
  if (definition.metric === "good_loss")
    return reviewed.some(
      (trade) =>
        Number(trade.netPnl) < 0 && trade.followedPlan && trade.respectedStop,
    )
      ? 1
      : 0;
  if (definition.metric === "honest_correction")
    return reviewed.some(
      (trade) =>
        (trade.journal?.mistakes?.length ?? 0) > 0 &&
        (trade.journal?.whatToImprove.length ?? 0) >= 20,
    )
      ? 1
      : 0;
  if (definition.metric === "calm_loss")
    return reviewed.some(
      (trade) =>
        Number(trade.netPnl) < 0 &&
        (trade.journal?.focusRating ?? 0) >= 4 &&
        trade.journal?.emotionAfter,
    )
      ? 1
      : 0;
  return longestRuleSequence(reviewed);
}

export function evaluateAchievements(state: AppState): AchievementProgress[] {
  return achievementDefinitions.map((definition) => {
    const current = metricValue(definition, state);
    const unlockedAt = state.achievementUnlocks?.[definition.id] ?? null;
    const unlocked = current >= definition.target || Boolean(unlockedAt);
    const progress = unlocked
      ? 100
      : Math.min(100, (current / definition.target) * 100);
    return { ...definition, current, progress, unlocked, unlockedAt };
  });
}

export function achievementXp(state: AppState) {
  return evaluateAchievements(state)
    .filter((achievement) => achievement.unlocked)
    .reduce((total, achievement) => total + achievement.rewardXp, 0);
}
