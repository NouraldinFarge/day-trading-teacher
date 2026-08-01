import { z } from "zod";
import { allowedSkillIds } from "./skills";
import { calculatePositionSize } from "./calculations";
import type { CustomLessonPlan } from "./types";
import { importedLessonPlanQualityWarnings } from "./imported-lesson-plan";

const sectionSchema = z
  .object({
    type: z.enum([
      "retrieval",
      "explanation",
      "worked_example",
      "practice",
      "transfer",
      "commitment",
      "remediation",
    ]),
    title: z.string().min(1).max(120),
    body: z.string().min(1).max(8_000),
    assessment_phase: z
      .enum([
        "instruction",
        "independent_performance",
        "review",
        "retention",
        "remediation",
      ])
      .optional(),
    prompt: z.string().max(4_000).optional(),
    answer: z.string().max(4_000).optional(),
    check: z
      .object({
        kind: z.literal("single_choice"),
        options: z.array(z.string().min(1).max(500)).min(2).max(6),
        correctOption: z.number().int().nonnegative(),
        success: z.string().min(1).max(1_000),
        correction: z.string().min(1).max(1_000),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((section, context) => {
    if (!section.check) return;
    if (!section.prompt)
      context.addIssue({
        code: "custom",
        path: ["prompt"],
        message: "An objective check requires a prompt.",
      });
    if (section.check.correctOption >= section.check.options.length)
      context.addIssue({
        code: "custom",
        path: ["check", "correctOption"],
        message: "The correct option must refer to an available choice.",
      });
  });

const calculationExampleSchema = z
  .object({
    entry: z.string(),
    stop: z.string(),
    maximum_risk: z.string(),
    slippage_per_unit: z.string().default("0"),
    side: z.enum(["long", "short"]),
    expected_quantity: z.number().int().nonnegative(),
  })
  .strict();

const masteryStandardSchema = z
  .object({
    minimum_first_try_correct: z.number().int().min(0).max(20),
    unseen_cases_required: z.number().int().min(1).max(100),
    minimum_successful_cases: z.number().int().min(1).max(100),
    minimum_rubric_level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    retention_practice_dates: z.number().int().min(1).max(30),
    remediation: z.string().min(10).max(1_000),
  })
  .strict()
  .refine(
    (standard) =>
      standard.minimum_successful_cases <= standard.unseen_cases_required,
    "Successful cases cannot exceed required cases.",
  );

const sessionBlockSchema = z
  .object({
    title: z.string().min(2).max(100),
    minutes: z.number().int().min(1).max(90),
    focus: z.string().min(5).max(500),
  })
  .strict();

const lessonSourceSchema = z
  .object({
    title: z.string().min(1).max(240),
    url: z.string().url().optional(),
    last_verified: z.string().max(40).optional(),
    currency_note: z.string().min(10).max(1_000).optional(),
  })
  .strict();

const timeModelSchema = z
  .object({
    required_instruction_and_initial_minutes: z
      .number()
      .int()
      .min(1)
      .max(240)
      .optional(),
    required_two_session_capstone_minutes: z
      .number()
      .int()
      .min(1)
      .max(240)
      .optional(),
    required_delayed_retention_minutes: z.number().int().min(1).max(120),
    conditional_remediation_minutes: z
      .number()
      .int()
      .min(1)
      .max(120)
      .optional(),
    conditional_remediation_minutes_per_form: z
      .number()
      .int()
      .min(1)
      .max(120)
      .optional(),
  })
  .strict()
  .superRefine((timeModel, context) => {
    const initialMinutes =
      timeModel.required_instruction_and_initial_minutes ??
      timeModel.required_two_session_capstone_minutes;
    if (!initialMinutes) {
      context.addIssue({
        code: "custom",
        message:
          "A time model requires instruction/initial minutes or two-session capstone minutes.",
      });
    }
    if (
      timeModel.required_instruction_and_initial_minutes &&
      timeModel.required_two_session_capstone_minutes
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Use one initial-practice time field; do not supply both time-model variants.",
      });
    }
  });

const assessmentAdministrationSchema = z
  .object({
    minimum_case_minutes: z.number().int().min(1).max(120).optional(),
    scoring_target: z.string().min(3).max(500).optional(),
    key_separation: z.string().min(10).max(1_000),
    not_scorable_policy: z
      .record(z.string().min(1).max(80), z.string().min(1).max(1_000))
      .optional(),
    packet_release: z.string().min(10).max(1_000),
    replacement_policy: z.string().min(10).max(1_000),
    active_case_bank: z.string().min(10).max(1_000),
  })
  .strict();

const lessonSchema = z
  .object({
    lesson_id: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,79}$/),
    version: z.string().min(1).max(40),
    title: z.string().min(3).max(160),
    skill_ids: z.array(z.string()).min(1).max(8),
    objective: z.string().min(10).max(1_000),
    estimated_minutes: z.number().int().min(1).max(240),
    sections: z.array(sectionSchema).min(1).max(20),
    mastery_criteria: z.array(z.string().min(3).max(500)).min(1).max(10),
    mastery_standard: masteryStandardSchema.optional(),
    curriculum_role: z
      .enum(["core", "extension", "remediation", "assessment"])
      .optional(),
    extension_of: z.string().max(80).optional(),
    extension_focus: z.string().max(1_000).optional(),
    session_blocks: z.array(sessionBlockSchema).min(2).max(12).optional(),
    sources: z.array(lessonSourceSchema).max(20).optional(),
    calculation_examples: z.array(calculationExampleSchema).max(12).optional(),
    materials_index: z.string().min(3).max(500).optional(),
    time_model: timeModelSchema.optional(),
    delivery_schedule: z
      .array(z.string().min(3).max(500))
      .min(1)
      .max(12)
      .optional(),
    mastery_evidence: z
      .array(z.string().min(3).max(500))
      .min(1)
      .max(20)
      .optional(),
    assessment_administration: assessmentAdministrationSchema.optional(),
    assessment_rule: z.string().min(10).max(1_000).optional(),
  })
  .strict()
  .superRefine((lesson, context) => {
    const checkCount = lesson.sections.filter(
      (section) => section.check,
    ).length;
    if (
      lesson.mastery_standard &&
      lesson.mastery_standard.minimum_first_try_correct > checkCount
    ) {
      context.addIssue({
        code: "custom",
        path: ["mastery_standard", "minimum_first_try_correct"],
        message:
          "The first-try threshold cannot exceed the number of objective checks.",
      });
    }
    if (lesson.curriculum_role === "extension" && !lesson.extension_of) {
      context.addIssue({
        code: "custom",
        path: ["extension_of"],
        message:
          "An extension lesson must identify the core lesson it extends.",
      });
    }
    if (lesson.session_blocks) {
      const blockMinutes = lesson.session_blocks.reduce(
        (total, block) => total + block.minutes,
        0,
      );
      if (blockMinutes !== lesson.estimated_minutes) {
        context.addIssue({
          code: "custom",
          path: ["session_blocks"],
          message: "Session-block minutes must equal estimated_minutes.",
        });
      }
    }
  });

export const importedLessonPlanSchema = z
  .object({
    schema_version: z.literal("1.0"),
    plan_id: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,79}$/),
    version: z.string().min(1).max(40),
    title: z.string().min(3).max(160),
    origin: z
      .object({
        type: z.enum(["external_generated", "user_authored"]),
        provider: z.string().min(1).max(80),
        model: z.string().max(80).optional(),
      })
      .strict(),
    target_skill_ids: z.array(z.string()).min(1).max(20),
    prerequisites: z.array(z.string()).max(20),
    lessons: z.array(lessonSchema).min(1).max(24),
    sources: z
      .array(
        z
          .object({
            title: z.string().min(1).max(240),
            url: z.string().url().optional(),
            last_verified: z.string().optional(),
            currency_note: z.string().min(10).max(1_000).optional(),
          })
          .strict(),
      )
      .max(40)
      .default([]),
    created_at: z.string().datetime(),
    scope_boundary: z
      .object({
        included: z.array(z.string().min(3).max(500)).min(1).max(30),
        excluded: z.array(z.string().min(2).max(500)).min(1).max(30),
        certification_boundary: z.string().min(10).max(1_000),
      })
      .strict()
      .optional(),
    required_program_minutes: z.number().int().min(1).max(20_000).optional(),
    conditional_remediation_minutes: z.string().min(5).max(1_000).optional(),
    assessment_security: z
      .object({
        learner_distribution: z.string().min(10).max(2_000),
        outcome_hiding: z.string().min(10).max(2_000),
        replacement_forms: z.string().min(10).max(2_000),
        certification_boundary: z.string().min(10).max(2_000),
        public_exposure_rule: z.string().min(10).max(2_000),
      })
      .strict()
      .optional(),
  })
  .strict();

export const storedLessonPlanSchema = importedLessonPlanSchema.extend({
  importedAt: z.string().max(80),
  fileHash: z.string().regex(/^[a-f0-9]{64}$/i),
});

export type ImportValidation = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  plan?: Omit<CustomLessonPlan, "importedAt" | "fileHash">;
};

function collectStrings(value: unknown, values: string[] = []): string[] {
  if (typeof value === "string") values.push(value);
  else if (Array.isArray(value))
    value.forEach((item) => collectStrings(item, values));
  else if (value && typeof value === "object")
    Object.values(value).forEach((item) => collectStrings(item, values));
  return values;
}

function collectFacilitatorOnlyKeys(
  value: unknown,
  path = "file",
  findings: string[] = [],
): string[] {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectFacilitatorOnlyKeys(item, `${path}.${index}`, findings),
    );
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (
        /^(capstone_blueprint|required_outcome|accepted_decision|outcome_class|scoring_key|answer_key|reveal_material)$/i.test(
          key,
        )
      )
        findings.push(`${path}.${key}`);
      collectFacilitatorOnlyKeys(item, `${path}.${key}`, findings);
    }
  }
  return findings;
}

export function validateImportedLessonPlan(raw: string): ImportValidation {
  if (raw.length > 500_000)
    return {
      valid: false,
      errors: ["The file exceeds the 500 KB limit."],
      warnings: [],
    };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return {
      valid: false,
      errors: ["The selected file is not valid JSON."],
      warnings: [],
    };
  }

  const facilitatorOnlyKeys = collectFacilitatorOnlyKeys(value);
  if (facilitatorOnlyKeys.length)
    return {
      valid: false,
      errors: [
        `Learner plans cannot include facilitator-only outcome or scoring fields: ${facilitatorOnlyKeys.join(", ")}.`,
      ],
      warnings: [],
    };

  const result = importedLessonPlanSchema.safeParse(value);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map(
        (issue) => `${issue.path.join(".") || "file"}: ${issue.message}`,
      ),
      warnings: [],
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const known = new Set<string>(allowedSkillIds);
  for (const skillId of [
    ...result.data.target_skill_ids,
    ...result.data.prerequisites,
  ]) {
    if (!known.has(skillId)) errors.push(`Unknown skill ID: ${skillId}`);
  }
  const lessonIds = new Set<string>();
  for (const lesson of result.data.lessons) {
    if (lessonIds.has(lesson.lesson_id))
      errors.push(`Duplicate lesson ID: ${lesson.lesson_id}`);
    lessonIds.add(lesson.lesson_id);
    for (const skillId of lesson.skill_ids) {
      if (!known.has(skillId))
        errors.push(`Unknown skill ID ${skillId} in ${lesson.title}`);
    }
    for (const example of lesson.calculation_examples ?? []) {
      try {
        const calculated = calculatePositionSize(example);
        if (calculated.quantity !== example.expected_quantity) {
          errors.push(
            `${lesson.title}: expected quantity ${example.expected_quantity} does not match deterministic result ${calculated.quantity}.`,
          );
        }
      } catch (error) {
        errors.push(
          `${lesson.title}: invalid calculation example — ${error instanceof Error ? error.message : "unknown error"}`,
        );
      }
    }
  }

  const unsafe = /<script|javascript:|data:text\/html|onerror\s*=|onload\s*=/i;
  if (collectStrings(result.data).some((text) => unsafe.test(text))) {
    errors.push("The lesson contains executable HTML or an unsafe URL scheme.");
  }
  warnings.push(...importedLessonPlanQualityWarnings(result.data));
  if (result.data.origin.type === "external_generated") {
    warnings.push(
      "Externally generated content must be reviewed before installation.",
    );
  }

  return { valid: errors.length === 0, errors, warnings, plan: result.data };
}

export async function sha256(raw: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(raw),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
