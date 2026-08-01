import type { CustomLessonPlan } from "./types";
import { importedLessonPlanSchema } from "./lesson-plan-schema";

export type ReviewableLessonPlan = Omit<
  CustomLessonPlan,
  "importedAt" | "fileHash"
>;

export async function loadBundledLessonPlans(): Promise<
  ReviewableLessonPlan[]
> {
  const [tradingRecordsPlan, evidenceToExecutionPlan] = await Promise.all([
    import("../../../../../content/lesson-plans/trading-records-deliberate-execution-v2.dtlesson.json"),
    import("../../../../../content/lesson-plans/evidence-to-execution-v7.dtlesson.json"),
  ]);
  return [tradingRecordsPlan.default, evidenceToExecutionPlan.default].map(
    (plan) => importedLessonPlanSchema.parse(plan) as ReviewableLessonPlan,
  );
}
