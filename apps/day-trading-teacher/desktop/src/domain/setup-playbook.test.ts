import { describe, expect, it } from "vitest";
import {
  blankSetupPlaybook,
  cleanPlaybookLines,
  evaluateSetupPlaybook,
} from "./setup-playbook";

describe("setup playbooks", () => {
  it("fails closed until every decision field is observable", () => {
    const playbook = blankSetupPlaybook(new Date("2026-08-13T12:00:00Z"));
    expect(evaluateSetupPlaybook(playbook)).toMatchObject({
      completed: 0,
      total: 10,
      percent: 0,
      readyForReplay: false,
    });
  });

  it("allows complete hypotheses into replay without claiming validation", () => {
    const playbook = {
      ...blankSetupPlaybook(new Date("2026-08-13T12:00:00Z")),
      title: "Orderly pullback study",
      market: "US equities",
      timeframe: "1-minute",
      contextRequirements: ["Data source and session are known"],
      confirmationRequirements: ["The pullback remains orderly"],
      trigger: "A prewritten observable event occurs",
      invalidation: "The chosen structure fails",
      liquidityRule: "Spread remains inside the written practice limit",
      disqualifiers: ["Required volume evidence is missing"],
      managementRule: "Use the locked exit architecture",
      reviewQuestions: ["Was every requirement visible before reveal?"],
      reviewedExamples: 12,
      status: "practice_only" as const,
    };
    expect(evaluateSetupPlaybook(playbook)).toEqual({
      completed: 10,
      total: 10,
      percent: 100,
      readyForReplay: true,
      missing: [],
      cautions: [],
    });
  });

  it("normalizes repeated multiline rules", () => {
    expect(cleanPlaybookLines(["  Wait  ", "", "Wait", "Stop"])).toEqual([
      "Wait",
      "Stop",
    ]);
  });
});
