import type { Lesson } from "./types";

export type LessonWorkspaceId = "plan" | "chart" | "journal" | "lab";
export type LessonWorkspacePhase = "prepare" | "apply" | "reflect";
export type LessonLabToolId =
  "risk" | "expectancy" | "decisions" | "plan" | "recall";
export type LessonJournalTab = "overview" | "trades" | "insights";

export type LessonWorkspace = {
  id: LessonWorkspaceId;
  route: "/plan" | "/chart" | "/trades" | "/learn/tools";
  title: string;
  action: string;
  purpose: string;
};

export type LessonWorkspaceMission = LessonWorkspace & {
  phase: LessonWorkspacePhase;
  artifact: string;
  checkpointAfter: number;
  labTool?: LessonLabToolId;
  journalTab?: LessonJournalTab;
};

const workspaces: Record<
  LessonWorkspaceId,
  Omit<LessonWorkspace, "purpose">
> = {
  plan: {
    id: "plan",
    route: "/plan",
    title: "Decision Card",
    action: "Build the plan",
  },
  chart: {
    id: "chart",
    route: "/chart",
    title: "Chart Replay",
    action: "Practice on a chart",
  },
  journal: {
    id: "journal",
    route: "/trades",
    title: "Evidence Journal",
    action: "Review the evidence",
  },
  lab: {
    id: "lab",
    route: "/learn/tools",
    title: "Learning Lab",
    action: "Run a focused drill",
  },
};

const mission = (
  id: LessonWorkspaceId,
  phase: LessonWorkspacePhase,
  purpose: string,
  artifact: string,
  checkpointAfter: number,
  options: Pick<LessonWorkspaceMission, "labTool" | "journalTab"> = {},
): LessonWorkspaceMission => ({
  ...workspaces[id],
  phase,
  purpose,
  artifact,
  checkpointAfter,
  ...options,
});

const lessonWorkspaceUses: Record<string, LessonWorkspaceMission[]> = {
  "builtin-tr-002": [
    mission(
      "journal",
      "prepare",
      "Import or record fills, then separate observed facts from missing intent.",
      "A chronological evidence record with every unknown preserved",
      2,
      { journalTab: "trades" },
    ),
    mission(
      "chart",
      "apply",
      "Place the recorded execution on historical bars without inventing context.",
      "A chart timestamp that agrees—or conflicts—with the execution record",
      3,
    ),
    mission(
      "lab",
      "reflect",
      "Retrieve the evidence-lane rules again after the reconstruction is complete.",
      "A spaced-recall rating for the weakest evidence concept",
      5,
      { labTool: "recall" },
    ),
  ],
  "builtin-ac-001": [
    mission(
      "plan",
      "prepare",
      "Record the account type, settled-fund or margin boundary, dated firm policy, and fractional-order constraints before setup analysis.",
      "An account-constraint Decision Card with every unknown marked fail closed",
      2,
    ),
    mission(
      "lab",
      "apply",
      "Recalculate expectancy after spread, slippage, fees, and other applicable costs instead of using gross results.",
      "A cost-aware expectancy scenario",
      4,
      { labTool: "expectancy" },
    ),
    mission(
      "journal",
      "reflect",
      "Compare recorded whole and fractional executions with the dated firm policy without assuming universal timing or pricing.",
      "One broker-specific execution or settlement evidence note",
      6,
      { journalTab: "trades" },
    ),
  ],
  "builtin-rm-004": [
    mission(
      "lab",
      "prepare",
      "Repeat deterministic risk sizing until every input and rounding decision is explainable.",
      "A checked position-size calculation",
      1,
      { labTool: "risk" },
    ),
    mission(
      "chart",
      "apply",
      "Choose structural invalidation on historical bars before calculating quantity.",
      "A visible invalidation level tied to chart structure",
      3,
    ),
    mission(
      "plan",
      "reflect",
      "Apply the loss boundary to a saved, timestamped decision card.",
      "A locked plan whose quantity stays within the risk boundary",
      6,
    ),
  ],
  "builtin-vc-001": [
    mission(
      "chart",
      "prepare",
      "Pause historical bars and test whether the setup actually earns eligibility.",
      "A pre-reveal chart decision: eligible, wait, or no trade",
      1,
    ),
    mission(
      "plan",
      "apply",
      "Convert the trigger, invalidation, spread, liquidity, and fail-closed rule into evidence.",
      "A locked eligibility gate with observable cancellation conditions",
      3,
    ),
    mission(
      "lab",
      "reflect",
      "Test the same gate against a changed scenario without copying the old thresholds.",
      "A reviewed decision drill with reasoning revealed",
      5,
      { labTool: "decisions" },
    ),
  ],
  "builtin-tp-003": [
    mission(
      "lab",
      "prepare",
      "Audit a draft for vague or missing evidence before turning it into a saved plan.",
      "A Plan Coach gap list",
      2,
      { labTool: "plan" },
    ),
    mission(
      "plan",
      "apply",
      "Build the complete decision card before opening a simulated ticket.",
      "A locked trigger, risk, execution, exit, and cancellation record",
      3,
    ),
    mission(
      "chart",
      "apply",
      "Use replay to test whether every plan field remains observable as context changes.",
      "A pre-reveal wait, enter, or no-trade decision",
      5,
    ),
    mission(
      "journal",
      "reflect",
      "Compare plan quality with later adherence without letting P&L merge the two scores.",
      "A separate plan-quality and adherence note",
      6,
      { journalTab: "trades" },
    ),
  ],
  "builtin-oe-006": [
    mission(
      "chart",
      "prepare",
      "Inspect spread, candle range, and liquidity context before choosing order behavior.",
      "A timestamped execution-friction estimate",
      2,
    ),
    mission(
      "lab",
      "apply",
      "Practice choosing by failure mode rather than by speed or hoped-for outcome.",
      "A reviewed execution scenario",
      3,
      { labTool: "decisions" },
    ),
    mission(
      "plan",
      "apply",
      "Read back symbol, side, quantity, order behavior, exits, and cancellation conditions together.",
      "A locked seven-field ticket readback",
      5,
    ),
    mission(
      "journal",
      "reflect",
      "Inspect recorded order type, partial-fill evidence, and execution friction after the fact.",
      "One evidence-based execution correction",
      6,
      { journalTab: "trades" },
    ),
  ],
  "builtin-pb-006": [
    mission(
      "journal",
      "prepare",
      "Find a compressed sequence, then describe frequency, emotion, and focus without inventing motive.",
      "A neutral pattern note based on recorded evidence",
      1,
      { journalTab: "insights" },
    ),
    mission(
      "lab",
      "apply",
      "Practice the reset sequence without needing another trade or favorable outcome.",
      "A reviewed independence decision",
      3,
      { labTool: "decisions" },
    ),
    mission(
      "chart",
      "apply",
      "Move to a fresh timestamp and rebuild context instead of carrying the prior outcome forward.",
      "A new trigger and invalidation from current evidence",
      4,
    ),
    mission(
      "plan",
      "reflect",
      "Save a genuinely independent next decision—or a complete no-trade decision.",
      "A new locked card that does not reuse stale evidence",
      5,
    ),
  ],
  "builtin-tf-009": [
    mission(
      "journal",
      "prepare",
      "Score evidence quality, process, and outcome on separate axes.",
      "A completed reflection with one neutral correction",
      1,
      { journalTab: "trades" },
    ),
    mission(
      "chart",
      "apply",
      "Replay the decision with recorded trades and every uncertainty kept visible.",
      "A chart-based check of what was knowable at the decision time",
      3,
    ),
    mission(
      "plan",
      "apply",
      "Compare the locked decision with the later record without editing the original.",
      "A documented plan-versus-execution gap",
      4,
    ),
    mission(
      "lab",
      "reflect",
      "Test expectancy and sample-size reasoning without increasing trading frequency.",
      "A cost-aware expectancy scenario",
      6,
      { labTool: "expectancy" },
    ),
  ],
  "builtin-capstone-001": [
    mission(
      "lab",
      "prepare",
      "Retrieve the full decision chain before seeing the historical case.",
      "A recall rating for the weakest prerequisite",
      1,
      { labTool: "recall" },
    ),
    mission(
      "chart",
      "apply",
      "Run the complete outcome-hidden replay and paper-decision workflow.",
      "A locked timestamp and reveal window",
      2,
    ),
    mission(
      "plan",
      "apply",
      "Write the decision before revealing the next bar or opening a simulated ticket.",
      "A complete pre-reveal decision card",
      4,
    ),
    mission(
      "journal",
      "reflect",
      "Close the loop with evidence quality, process review, and one testable correction.",
      "A seven-axis review and routed remedial lesson",
      6,
      { journalTab: "trades" },
    ),
  ],
  "records-20260717-evidence-clock": [
    mission(
      "journal",
      "prepare",
      "Use imported or manual executions to build the factual order-and-fill clock before explaining intent.",
      "A timestamped timeline labeled observed, calculated, reported, or unknown",
      2,
      { journalTab: "trades" },
    ),
    mission(
      "chart",
      "apply",
      "Align the recorded fills with historical one-minute bars and mark where the record cannot prove context.",
      "A chart timestamp that confirms or challenges the execution timeline",
      4,
    ),
    mission(
      "lab",
      "reflect",
      "Retrieve the evidence lanes after the chart and journal records have been reconciled.",
      "A spaced-recall rating for the weakest evidence distinction",
      7,
      { labTool: "recall" },
    ),
  ],
  "records-20260717-execution-friction": [
    mission(
      "chart",
      "prepare",
      "Pause historical bars and measure spread, candle range, and visible price movement before choosing order behavior.",
      "A timestamped execution-friction snapshot",
      2,
    ),
    mission(
      "plan",
      "apply",
      "Write maximum acceptable price, order behavior, partial-fill response, and the consequence of no fill.",
      "A locked execution plan chosen by failure mode",
      4,
    ),
    mission(
      "lab",
      "apply",
      "Vary liquidity and urgency while keeping the price-risk boundary explicit.",
      "A reviewed decision-order scenario",
      5,
      { labTool: "decisions" },
    ),
    mission(
      "journal",
      "reflect",
      "Compare the intended order behavior with recorded fill evidence and preserve quote uncertainty.",
      "One execution correction supported by the record",
      7,
      { journalTab: "trades" },
    ),
  ],
  "records-20260717-fast-mover-gate": [
    mission(
      "chart",
      "prepare",
      "Pause a fast historical move and separate visible context from evidence that actually earns eligibility.",
      "A pre-reveal eligible, wait, or no-trade decision",
      2,
    ),
    mission(
      "plan",
      "apply",
      "Lock the setup, objective trigger, invalidation, spread limit, time failure, and cancellation conditions.",
      "A complete fail-closed eligibility gate",
      4,
    ),
    mission(
      "lab",
      "apply",
      "Test whether the same gate survives changed volatility and liquidity without copying stale thresholds.",
      "A reviewed eligibility decision under changed context",
      6,
      { labTool: "decisions" },
    ),
    mission(
      "journal",
      "reflect",
      "Record whether later execution evidence followed the gate without letting outcome rewrite eligibility.",
      "A gate-versus-behavior review",
      7,
      { journalTab: "trades" },
    ),
  ],
  "records-20260717-reentry-reset": [
    mission(
      "journal",
      "prepare",
      "Find a compressed same-symbol sequence and describe the recorded pattern without assigning a motive.",
      "A neutral re-entry pattern note",
      1,
      { journalTab: "insights" },
    ),
    mission(
      "chart",
      "apply",
      "Move to the second decision timestamp and identify only the evidence that changed after the prior exit.",
      "A fresh context, trigger, and invalidation record",
      3,
    ),
    mission(
      "plan",
      "apply",
      "Build an independent decision card—or document a complete no-trade decision—without carrying the prior outcome forward.",
      "A newly justified and locked decision",
      5,
    ),
    mission(
      "lab",
      "reflect",
      "Practice the reset order after both favorable and unfavorable outcomes.",
      "A reviewed independence decision",
      7,
      { labTool: "decisions" },
    ),
  ],
  "records-20260717-exit-sentence": [
    mission(
      "lab",
      "prepare",
      "Verify that structural risk, slippage, and quantity fit the preset loss boundary before writing exits.",
      "A checked risk-per-unit and quantity calculation",
      2,
      { labTool: "risk" },
    ),
    mission(
      "plan",
      "apply",
      "Write structural invalidation, profit logic, time failure, maximum loss, and cancellation conditions before exposure.",
      "A locked four-part exit architecture",
      4,
    ),
    mission(
      "chart",
      "apply",
      "Use replay to test whether each exit clause remains observable as bars unfold.",
      "A pre-reveal exit decision tied to visible evidence",
      6,
    ),
    mission(
      "journal",
      "reflect",
      "Compare the original exit architecture with recorded behavior without editing the plan after the fact.",
      "One plan-versus-exit evidence gap",
      7,
      { journalTab: "trades" },
    ),
  ],
  "records-20260717-process-review": [
    mission(
      "journal",
      "prepare",
      "Complete the factual timeline, data-quality label, process score, outcome label, and one neutral correction.",
      "A review whose judgments cite specific evidence",
      2,
      { journalTab: "trades" },
    ),
    mission(
      "chart",
      "apply",
      "Replay the decision timestamp and keep later outcome information separated from what was knowable then.",
      "A chart-based knowable-versus-later evidence check",
      4,
    ),
    mission(
      "plan",
      "apply",
      "Compare the locked decision card with the execution record without repairing missing fields retrospectively.",
      "A documented plan-versus-behavior gap",
      5,
    ),
    mission(
      "lab",
      "reflect",
      "Test process-versus-outcome classification and sample-size reasoning on a different case.",
      "A reviewed expectancy or decision scenario",
      7,
      { labTool: "expectancy" },
    ),
  ],
  "records-20260717-session-guardrail": [
    mission(
      "journal",
      "prepare",
      "Use activity and discipline views to identify recorded risk, rule, or attention deterioration without setting a trade quota.",
      "A neutral session pattern supported by journal evidence",
      2,
      { journalTab: "insights" },
    ),
    mission(
      "lab",
      "prepare",
      "Check maximum per-trade and session risk arithmetic before choosing a fixed stopping boundary.",
      "A deterministic risk-boundary calculation",
      3,
      { labTool: "risk" },
    ),
    mission(
      "plan",
      "apply",
      "Write the fixed risk limit, process-violation limit, attention signal, and shutdown actions before practice begins.",
      "A saved no-trade and stop-work policy",
      5,
    ),
    mission(
      "chart",
      "reflect",
      "Review a paper-practice session and identify the first timestamp where a preset stopping rule should have ended execution.",
      "A marked stop-work timestamp with no additional order required",
      7,
    ),
  ],
  "records-20260717-replay-lab": [
    mission(
      "lab",
      "prepare",
      "Retrieve the complete evidence-to-review sequence before opening the historical case.",
      "A recall rating for the weakest prerequisite",
      1,
      { labTool: "recall" },
    ),
    mission(
      "chart",
      "apply",
      "Pause historical bars, hide the outcome, and record the exact decision timestamp and reveal window.",
      "A locked pre-reveal chart state and paper decision",
      3,
    ),
    mission(
      "plan",
      "apply",
      "Complete the trigger, invalidation, risk, order behavior, exits, and no-trade conditions before revealing another bar.",
      "A complete pre-reveal decision card",
      5,
    ),
    mission(
      "journal",
      "reflect",
      "Preserve the original plan, compare it with later evidence, and record one correction for the next replay.",
      "A closed evidence loop including one disciplined no-trade case",
      7,
      { journalTab: "trades" },
    ),
  ],
};

function inferredUses(skillIds: string[]): LessonWorkspaceMission[] {
  const prefixes = new Set(skillIds.map((skillId) => skillId.split("-")[0]));
  const uses: LessonWorkspaceMission[] = [];
  if (
    prefixes.has("TR") ||
    prefixes.has("TF") ||
    prefixes.has("OE") ||
    prefixes.has("PB") ||
    prefixes.has("TP")
  )
    uses.push(
      mission(
        "journal",
        "prepare",
        "Connect the lesson to recorded facts, reflections, and process evidence.",
        "A journal note that separates evidence from interpretation",
        1,
        { journalTab: "trades" },
      ),
    );
  if (
    prefixes.has("VC") ||
    prefixes.has("OE") ||
    prefixes.has("TR") ||
    prefixes.has("TP") ||
    prefixes.has("PB") ||
    prefixes.has("TF") ||
    prefixes.has("RM")
  )
    uses.push(
      mission(
        "chart",
        "apply",
        "Test the lesson rule on paused historical bars before revealing the outcome.",
        "A timestamped pre-reveal decision",
        2,
      ),
    );
  if (
    prefixes.has("RM") ||
    prefixes.has("TP") ||
    prefixes.has("VC") ||
    prefixes.has("PB") ||
    prefixes.has("OE")
  )
    uses.push(
      mission(
        "plan",
        "apply",
        "Turn the lesson reasoning into a locked and auditable decision card.",
        "A saved pre-outcome plan",
        3,
      ),
    );
  uses.push(
    mission(
      "lab",
      "reflect",
      "Retrieve and vary the lesson principle with a focused drill.",
      "A deliberate-practice attempt recorded without requiring a trade",
      4,
      {
        labTool: prefixes.has("RM")
          ? "risk"
          : prefixes.has("TP")
            ? "plan"
            : prefixes.has("TF")
              ? "expectancy"
              : "decisions",
      },
    ),
  );
  return uses;
}

export function lessonWorkspacesFor(
  lesson: string | Pick<Lesson, "lesson_id" | "skill_ids">,
): LessonWorkspaceMission[] {
  const lessonId = typeof lesson === "string" ? lesson : lesson.lesson_id;
  const exact = lessonWorkspaceUses[lessonId];
  if (exact) return exact;
  return typeof lesson === "string" ? [] : inferredUses(lesson.skill_ids);
}

export const lessonPracticeWorkspaces: LessonWorkspace[] = [
  {
    ...workspaces.plan,
    purpose:
      "Write eligibility, invalidation, risk, execution, exits, and cancellation conditions before outcome information exists.",
  },
  {
    ...workspaces.chart,
    purpose:
      "Study historical bars, recorded trades, backtests, and paper decisions without live signals.",
  },
  {
    ...workspaces.journal,
    purpose:
      "Import execution facts, reconstruct decisions, reflect, and discover process patterns.",
  },
  {
    ...workspaces.lab,
    purpose:
      "Practice risk, expectancy, decision order, plan quality, and spaced recall on demand.",
  },
];
