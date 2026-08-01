import type { Lesson } from "./types";

const lessonRationales: Record<string, string> = {
  "builtin-tr-002":
    "Orders and fills show what the account recorded, but they do not explain intent. Reconstructing the clock before judging the trade prevents hindsight from turning missing evidence into a confident story.",
  "builtin-ac-001":
    "A valid chart setup cannot override settlement, margin, firm-policy, cost, or suitability constraints. Verifying the specific account and dated broker behavior first prevents an outdated shortcut from becoming an execution assumption.",
  "builtin-rm-004":
    "Position size is a consequence of the loss boundary—not buying power, conviction, or hoped-for reward. Practicing the arithmetic until every input is visible makes risk repeatable when the chart feels urgent.",
  "builtin-vc-001":
    "Fast movement captures attention, but movement alone does not earn exposure. A fail-closed eligibility gate makes waiting and no trade complete, successful decisions when required evidence is weak or missing.",
  "builtin-tp-003":
    "Memory quietly rewrites a decision after the result is known. A timestamped decision card preserves the trigger, invalidation, risk, execution, exits, and cancellation logic needed for a fair review.",
  "builtin-oe-006":
    "Every order type exchanges one kind of certainty for another: price, execution, timing, or protection. Choosing by failure mode keeps a sound trade idea from being undermined by an unsuitable ticket.",
  "builtin-pb-006":
    "Recent profit, loss, urgency, and frustration can leak into the next decision without appearing in the chart. A complete reset forces the next attempt to earn its own evidence—or end with a disciplined stop.",
  "builtin-tf-009":
    "Profit and loss are noisy outcomes, not grades for decision quality. Separating evidence, process, and outcome produces a correction that can actually be tested instead of a story that changes with the result.",
  "builtin-capstone-001":
    "A no-click replay exposes the weakest link in the full workflow without financial pressure. It tests whether evidence, risk, eligibility, planning, execution, reset, and review still work together before speed matters.",
  "records-20260717-evidence-clock":
    "A short export can look complete while still omitting the trigger, quote, stop, and intent. Building an evidence clock teaches you to use each source for what it can prove and preserve the rest as unknown.",
  "records-20260717-execution-friction":
    "Spread, slippage, and fill uncertainty can erase the edge of a fast decision even when the direction is right. Pricing those frictions first makes waiting, limiting the price, or taking no trade legitimate choices.",
  "records-20260717-fast-mover-gate":
    "A sharply moving chart creates urgency before it creates evidence. Turning the moment into an observable gate protects the decision from chase behavior and makes every missing requirement visible before exposure.",
  "records-20260717-reentry-reset":
    "Several orders in one symbol can feel like one continuing idea, even though each new exposure needs a fresh reason. The independence reset prevents a previous outcome from becoming evidence for the next entry.",
  "records-20260717-exit-sentence":
    "Improvised exits turn uncertainty into inconsistent risk. Saying invalidation, profit logic, time failure, and maximum loss before entry gives later price movement fewer opportunities to negotiate with the plan.",
  "records-20260717-process-review":
    "Outcome bias makes a lucky win look skilled and a disciplined loss look wrong. A source-based review protects the original decision from hindsight and routes one specific weakness into the next practice session.",
  "records-20260717-session-guardrail":
    "Risk capacity and attention can deteriorate before the next setup appears. Preset stop-work rules protect both, while still allowing calm study and review without creating a quota for trades or screen time.",
  "records-20260717-replay-lab":
    "Outcome-hidden rehearsal turns chart reading into a testable decision process. Locking the timestamp and plan before each reveal shows whether the method transfers without rewarding prediction, clicking, or overtrading.",
  "v7-scope-entry-diagnostic":
    "A demanding course is only useful when its boundary and prerequisites are explicit. Confirming the simulation-only scope and repairing weak unit, source, and risk-per-share skills first keeps later difficulty from being confused with missing foundations.",
  "v7-evidence-timeline":
    "A plausible story can still contradict the account record. A source-labeled timeline makes position state auditable, exposes unsupported assumptions, and gives every later judgment a factual clock instead of a reconstructed narrative.",
  "v7-cash-settlement":
    "Displayed buying power does not by itself explain whether cash is settled or a purchase is supportable. Working from a dated ledger turns settlement from a remembered slogan into a verifiable account constraint.",
  "v7-margin-suitability":
    "Broker permission, regulatory or firm margin treatment, and personal capacity for loss are different gates. Separating them prevents account access from being misread as evidence that a trade is affordable or appropriate.",
  "v7-broker-ticket-rules":
    "A correct idea can still fail through the wrong units, session, time in force, or fractional-share assumption. Reading the complete ticket against current broker documentation makes firm-specific behavior visible before it becomes execution risk.",
  "v7-market-data-readiness":
    "A stale quote, trading halt, source disagreement, or reconnect can invalidate otherwise careful analysis. A readiness check protects the decision from acting on a market or account state the platform can no longer prove.",
  "v7-risk-boundary":
    "Quantity is safe only after invalidation distance, execution allowance, remaining session risk, and correlated exposure are known. Applying all four constraints keeps a locally correct size from creating an unacceptable portfolio-level loss.",
  "v7-setup-eligibility":
    "Loose criteria become easiest to reinterpret when a setup is exciting or almost qualifies. A simultaneous, unit-labeled gate makes borderline and missing evidence fail consistently and turns no trade into a complete decision.",
  "v7-strategy-evidence":
    "A small or repeatedly tuned backtest can look persuasive without surviving new data or realistic costs. Freezing the protocol and separating development from evaluation reveals uncertainty before the playbook is trusted.",
  "v7-decision-card":
    "Opening the ticket changes attention and makes missing premises easier to excuse. Completing the decision card first preserves the trigger, cancellation logic, and execution assumptions that a fair post-trade review needs.",
  "v7-order-failure-modes":
    "No order type removes uncertainty; each redistributes it among price, fill, trigger, gap, and cancellation risk. Choosing the failure the plan can tolerate makes wait or cancel as legitimate as sending an order.",
  "v7-short-sale-gate":
    "A displayed shortable indicator is not the same as a completed locate, stable borrow terms, unrestricted execution, or a supported cover plan. The operational gate prevents a directional thesis from hiding short-specific constraints.",
  "v7-reset-session-stop":
    "The next chart can appear before risk capacity, attention, or platform state has recovered. Rebuilding the evidence and honoring the first stop condition protects the session from turning urgency into a chain of dependent decisions.",
  "v7-process-review":
    "Review loses value when missing evidence is silently scored or a profitable outcome upgrades weak process. Observable anchors and an explicit not-scorable state keep the correction neutral, specific, and testable.",
  "v7-guided-replay":
    "A modeled case shows the workflow; a coached case reveals whether you can use it with less support. Locking both decisions before reveal makes waiting and no trade visible competencies instead of missed opportunities.",
  "v7-independent-capstone":
    "Independent transfer is stronger evidence than repeating a familiar case once. Spacing outcome-hidden decisions across dates, contexts, and valid action classes tests whether the full workflow survives without coaching or hindsight.",
};

export function lessonRationaleFor(
  lesson: Pick<Lesson, "lesson_id" | "objective">,
) {
  return (
    lessonRationales[lesson.lesson_id] ??
    `${lesson.objective.replace(/[.]$/, "")} matters because it turns an idea into observable practice. Attempt the decision before revealing guidance, then leave with one rule you can test again on different evidence.`
  );
}

export function hasAuthoredLessonRationale(lessonId: string) {
  return Boolean(lessonRationales[lessonId]);
}
