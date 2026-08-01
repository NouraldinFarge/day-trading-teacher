import { describe, expect, it } from "vitest";
import { validateImportedLessonPlan } from "./lesson-plan-schema";

const validPlan = {
  schema_version: "1.0",
  plan_id: "custom-risk-plan",
  version: "1.0.0",
  title: "Custom risk practice",
  origin: { type: "external_generated", provider: "ChatGPT" },
  target_skill_ids: ["RM-004"],
  prerequisites: ["RM-002"],
  lessons: [
    {
      lesson_id: "custom-rm-004-a",
      version: "1.0.0",
      title: "Risk with slippage",
      skill_ids: ["RM-004"],
      objective:
        "Calculate risk-adjusted position size before entering a trade.",
      estimated_minutes: 8,
      sections: [
        {
          type: "retrieval",
          title: "Try",
          body: "Calculate before revealing the answer.",
        },
      ],
      mastery_criteria: ["Rounds quantity down"],
      calculation_examples: [
        {
          entry: "32.40",
          stop: "32.12",
          maximum_risk: "28",
          slippage_per_unit: "0.02",
          side: "long",
          expected_quantity: 93,
        },
      ],
    },
  ],
  sources: [],
  created_at: "2026-07-16T10:00:00.000Z",
};

describe("lesson plan import", () => {
  it("accepts a bounded plan and warns about missing sources", () => {
    const result = validateImportedLessonPlan(JSON.stringify(validPlan));
    expect(result.valid).toBe(true);
    expect(result.warnings.join(" ")).toMatch(/no objective checks/i);
    expect(result.warnings.join(" ")).toMatch(
      /missing a practice or transfer/i,
    );
    expect(result.warnings.join(" ")).toMatch(/No sources/i);
    expect(result.warnings.join(" ")).toMatch(/Externally generated/i);
  });

  it("rejects an incorrect calculation example", () => {
    const plan = structuredClone(validPlan);
    plan.lessons[0].calculation_examples[0].expected_quantity = 94;
    const result = validateImportedLessonPlan(JSON.stringify(plan));
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/does not match/);
  });

  it("rejects executable content", () => {
    const plan = structuredClone(validPlan);
    plan.lessons[0].sections[0].body = "<script>alert(1)</script>";
    expect(validateImportedLessonPlan(JSON.stringify(plan)).valid).toBe(false);
  });

  it("accepts bounded multi-session retention and remediation metadata", () => {
    const plan = structuredClone(validPlan) as Record<string, any>;
    plan.scope_boundary = {
      included: ["Simulation-only equities"],
      excluded: ["Live trade signals"],
      certification_boundary:
        "Completion is practice evidence and is not live-trading certification.",
    };
    plan.required_program_minutes = 200;
    plan.conditional_remediation_minutes = "Use a new unopened form.";
    plan.assessment_security = {
      learner_distribution:
        "Only open practice is included in the learner-facing plan.",
      outcome_hiding:
        "Outcome classes and scoring keys remain outside the learner plan.",
      replacement_forms:
        "An exposed form is replaced with a fresh equivalent form.",
      certification_boundary:
        "Certification requires separately scored facilitator artifacts.",
      public_exposure_rule:
        "Previously exposed scored forms are retired from active mastery.",
    };
    Object.assign(plan.lessons[0], {
      estimated_minutes: 200,
      session_blocks: [
        { title: "Instruction", minutes: 80, focus: "Build the process." },
        { title: "Practice", minutes: 60, focus: "Apply on unseen cases." },
        { title: "Retention", minutes: 60, focus: "Return on another date." },
      ],
      materials_index: "START-HERE.html#risk",
      time_model: {
        required_instruction_and_initial_minutes: 140,
        required_delayed_retention_minutes: 60,
        conditional_remediation_minutes_per_form: 20,
      },
      delivery_schedule: ["Date 1: instruction", "Date 2: retention"],
      mastery_evidence: ["Original response", "Delayed response"],
      assessment_administration: {
        key_separation: "Keys remain in the facilitator-only bundle.",
        packet_release: "Release one neutral packet at a time.",
        replacement_policy: "Never reuse an opened or exposed form.",
        active_case_bank: "Use only the current facilitator-controlled bank.",
      },
      assessment_rule:
        "Score the learner reasoning artifact rather than a fictional outcome.",
    });
    plan.lessons[0].sections.push({
      type: "remediation",
      assessment_phase: "remediation",
      title: "Repair",
      body: "Use a fresh form after targeted review.",
    });
    plan.lessons[0].sections.push({
      type: "transfer",
      assessment_phase: "retention",
      title: "Return",
      body: "Apply the same rule on a later date.",
    });

    expect(validateImportedLessonPlan(JSON.stringify(plan))).toMatchObject({
      valid: true,
      errors: [],
    });
  });

  it("rejects facilitator-only outcome blueprints from learner plans", () => {
    const plan = structuredClone(validPlan) as Record<string, any>;
    plan.lessons[0].capstone_blueprint = [
      { case_id: "SECURE-A", required_outcome: "PROCEED" },
    ];
    const result = validateImportedLessonPlan(JSON.stringify(plan));

    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/facilitator-only/i);
    expect(result.errors.join(" ")).toMatch(/capstone_blueprint/i);
  });
});
