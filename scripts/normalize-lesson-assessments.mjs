import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const corePath = path.join(
  workspaceRoot,
  "apps",
  "day-trading-teacher",
  "desktop",
  "src",
  "domain",
  "builtin-lessons.ts",
);
const bundledPath = path.join(
  workspaceRoot,
  "content",
  "lesson-plans",
  "trading-records-deliberate-execution-v2.dtlesson.json",
);

function moveCorrectOption(options, currentIndex, targetIndex) {
  const reordered = [...options];
  const [correct] = reordered.splice(currentIndex, 1);
  reordered.splice(targetIndex, 0, correct);
  return reordered;
}

function normalizeCorePositions() {
  const source = fs.readFileSync(corePath, "utf8");
  let questionIndex = 0;
  const pattern =
    /(\n(?<indent>\s*)options:\s*)(?<array>\[(?:\s*"(?:\\.|[^"\\])*",?)+\s*\])(?<between>,\s*\n\s*correctOption:\s*)(?<correct>\d+)/g;
  const normalized = source.replace(
    pattern,
    (
      match,
      prefix,
      _indentCapture,
      arrayText,
      between,
      correctText,
      offset,
      full,
      groups,
    ) => {
      const options = JSON.parse(arrayText.replace(/,\s*]/, "]"));
      const currentIndex = Number(correctText);
      const targetIndex = questionIndex % options.length;
      questionIndex += 1;
      const reordered = moveCorrectOption(options, currentIndex, targetIndex);
      const indent = groups.indent;
      const itemIndent = indent + "  ";
      const formatted =
        "[\n" +
        reordered
          .map((option) => itemIndent + JSON.stringify(option) + ",")
          .join("\n") +
        "\n" +
        indent +
        "]";
      return prefix + formatted + between + targetIndex;
    },
  );
  if (questionIndex !== 27) {
    throw new Error(
      "Expected 27 core objective checks; normalized " + questionIndex + ".",
    );
  }
  fs.writeFileSync(corePath, normalized, "utf8");
}

const extensions = {
  "records-20260717-evidence-clock": {
    extension_of: "builtin-tr-002",
    extension_focus:
      "Resolve conflicting clocks, missing intent, partial evidence, and position states across six unfamiliar records.",
    remediation:
      "Reconcile the two least complete timelines in the Evidence Journal and retry new records without choosing the more convenient timestamp.",
    minutes: 30,
  },
  "records-20260717-execution-friction": {
    extension_of: "builtin-oe-006",
    extension_focus:
      "Compare changing spread, displayed liquidity, partial fills, dollar orders, and no-fill tradeoffs across six execution conditions.",
    remediation:
      "Replay the weakest execution case with a partial-fill branch and a changed-liquidity branch, then explain the accepted failure mode.",
    minutes: 34,
  },
  "records-20260717-fast-mover-gate": {
    extension_of: "builtin-vc-001",
    extension_focus:
      "Calibrate passing, borderline, and failing gates across quiet, opening, fast, and deteriorating liquidity conditions.",
    remediation:
      "Compare one passing and two borderline gates, identify the unsupported threshold, and retry under a different volatility regime.",
    minutes: 34,
  },
  "records-20260717-reentry-reset": {
    extension_of: "builtin-pb-006",
    extension_focus:
      "Prove reset independence after a win, loss, missed move, partial fill, and immediate reappearance of the setup.",
    remediation:
      "Repeat the reset after three different prior outcomes and repair the first field still anchored to the previous attempt.",
    minutes: 30,
  },
  "records-20260717-exit-sentence": {
    extension_of: "builtin-tp-003",
    extension_focus:
      "Expand the exit sentence into invalidation, objective, time failure, gap or halt, partial-fill, and cancellation contingencies.",
    remediation:
      "Rewrite the weakest exit plan as separate structural, objective, time, and operational clauses, then test a gap or partial-fill case.",
    minutes: 34,
  },
  "records-20260717-process-review": {
    extension_of: "builtin-tf-009",
    extension_focus:
      "Score ambiguous winners and losses with an analytic rubric, preserve not-scorable dimensions, and route one correction.",
    remediation:
      "Re-score one winner and one loser without outcome language, then test whether the chosen correction changes a later artifact.",
    minutes: 30,
  },
  "records-20260717-session-guardrail": {
    extension_of: "builtin-pb-006",
    extension_focus:
      "Apply the earliest of risk, attention, and process boundaries across competing stop conditions without using a profit target as a quota.",
    remediation:
      "Rebuild the session rule with independent risk, attention, and process triggers and apply it to three reordered event sequences.",
    minutes: 28,
  },
  "records-20260717-replay-lab": {
    extension_of: "builtin-capstone-001",
    extension_focus:
      "Complete a harder six-case assessment with incomplete evidence, changed regimes, fixed reveals, and two eligible wait or no-trade decisions.",
    remediation:
      "Route the lowest rubric dimension to its core lesson, repair one bounded case, and retry a later unseen timestamp without editing prior evidence.",
    minutes: 50,
  },
};

function normalizeBundledPlan() {
  const plan = JSON.parse(fs.readFileSync(bundledPath, "utf8"));
  plan.version = "3.0.0";
  plan.title = "Deliberate Execution: Advanced Trading Records Transfer Lab";
  plan.created_at = "2026-07-22T00:00:00.000Z";
  let questionIndex = 0;
  for (const lesson of plan.lessons) {
    const extension = extensions[lesson.lesson_id];
    if (!extension) {
      throw new Error("Missing extension metadata for " + lesson.lesson_id + ".");
    }
    lesson.version = "3.0.0";
    lesson.estimated_minutes = extension.minutes;
    lesson.curriculum_role = "extension";
    lesson.extension_of = extension.extension_of;
    lesson.extension_focus = extension.extension_focus;
    lesson.mastery_standard = {
      minimum_first_try_correct: 2,
      unseen_cases_required: 6,
      minimum_successful_cases: 5,
      minimum_rubric_level: 2,
      retention_practice_dates: 2,
      remediation: extension.remediation,
    };
    if (lesson.lesson_id === "records-20260717-replay-lab") {
      lesson.session_blocks = [
        {
          title: "Calibration",
          minutes: 12,
          focus:
            "Retrieve the evidence chain and inspect one model that does not count toward the assessment.",
        },
        {
          title: "Independent assessment",
          minutes: 26,
          focus:
            "Complete six fixed-reveal cases with incomplete evidence and at least two eligible wait or no-trade decisions.",
        },
        {
          title: "Review and remediation",
          minutes: 12,
          focus:
            "Score the analytic rubric, preserve the original artifacts, and route the lowest dimension.",
        },
      ];
      lesson.sections.forEach((section, index) => {
        section.assessment_phase =
          index <= 2
            ? "instruction"
            : index <= 5
              ? "independent_performance"
              : "review";
      });
    }
    for (const section of lesson.sections) {
      if (!section.check) continue;
      const targetIndex = questionIndex % section.check.options.length;
      section.check.options = moveCorrectOption(
        section.check.options,
        section.check.correctOption,
        targetIndex,
      );
      section.check.correctOption = targetIndex;
      questionIndex += 1;
    }
  }
  if (questionIndex !== 24) {
    throw new Error(
      "Expected 24 bundled objective checks; normalized " + questionIndex + ".",
    );
  }
  fs.writeFileSync(bundledPath, JSON.stringify(plan, null, 2) + "\n", "utf8");
}

normalizeCorePositions();
normalizeBundledPlan();
console.log(
  "Balanced 27 core and 24 bundled objective checks; refreshed extension metadata.",
);
