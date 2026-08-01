import { describe, expect, it } from "vitest";
import {
  buildOptionOrder,
  emptyRubricScores,
  evaluateMasteryStandard,
} from "./lesson-assessment";

const standard = {
  minimum_first_try_correct: 2,
  unseen_cases_required: 5,
  minimum_successful_cases: 4,
  minimum_rubric_level: 2 as const,
  retention_practice_dates: 2,
  remediation: "Retry a new case after repairing the weakest dimension.",
};

describe("lesson assessment integrity", () => {
  it("creates stable permutations that change with an attempt seed", () => {
    const first = buildOptionOrder("lesson", "1.0.0", 2, 100, 4);
    const repeated = buildOptionOrder("lesson", "1.0.0", 2, 100, 4);
    const nextAttempt = buildOptionOrder("lesson", "1.0.0", 2, 101, 4);
    expect(first).toEqual(repeated);
    expect([...first].sort()).toEqual([0, 1, 2, 3]);
    expect(nextAttempt).not.toEqual(first);
  });

  it("requires first-try, unseen-case, and analytic-rubric evidence", () => {
    const guided = evaluateMasteryStandard(standard, 2, 5, 4, {
      ...emptyRubricScores(),
      Transfer: 1,
    });
    expect(guided).toMatchObject({ met: false, rubricMet: false });

    const independent = evaluateMasteryStandard(standard, 2, 5, 4, {
      "Evidence accuracy": 2,
      "Decision accuracy": 3,
      Transfer: 2,
      Explanation: 2,
    });
    expect(independent).toMatchObject({
      met: true,
      checksMet: true,
      casesMet: true,
      rubricMet: true,
      rubricAverage: 2.25,
    });
  });
});
