export type CorePathStage = {
  id: string;
  phase: number;
  title: string;
  description: string;
  milestone: string;
  lessonIds: string[];
};

export const corePathStages: CorePathStage[] = [
  {
    id: "evidence",
    phase: 1,
    title: "Evidence literacy",
    description:
      "Establish what happened before judging why it happened or whether it was good.",
    milestone:
      "Reconstruct a factual timeline and preserve every meaningful unknown.",
    lessonIds: ["builtin-tr-002"],
  },
  {
    id: "risk-eligibility",
    phase: 2,
    title: "Risk and eligibility",
    description:
      "Verify the account boundary, define the loss boundary, then decide whether the opportunity deserves a plan at all.",
    milestone:
      "Explain the current account constraints, size from invalidation, and make a disciplined no-trade decision when evidence fails the gate.",
    lessonIds: ["builtin-ac-001", "builtin-rm-004", "builtin-vc-001"],
  },
  {
    id: "planning",
    phase: 3,
    title: "Decision planning",
    description:
      "Write the trigger, invalidation, exit logic, and cancellation conditions before the ticket opens.",
    milestone:
      "Produce a complete, observable plan that another person could audit.",
    lessonIds: ["builtin-tp-003"],
  },
  {
    id: "execution",
    phase: 4,
    title: "Execution judgment",
    description:
      "Choose units and order behavior by their failure modes, spread, and fill uncertainty.",
    milestone:
      "Read back the whole ticket and explain the accepted execution trade-off.",
    lessonIds: ["builtin-oe-006"],
  },
  {
    id: "reset",
    phase: 5,
    title: "Behavioral reset",
    description:
      "Restore observation and planning between attempts, regardless of the previous result.",
    milestone:
      "Make the next decision independent of urgency, frustration, and recent P&L.",
    lessonIds: ["builtin-pb-006"],
  },
  {
    id: "review-transfer",
    phase: 6,
    title: "Review and transfer",
    description:
      "Score the process without hindsight, then prove the workflow on unseen historical moments.",
    milestone:
      "Complete the full learning loop, including one correct decision not to trade.",
    lessonIds: ["builtin-tf-009", "builtin-capstone-001"],
  },
];
