import { describe, expect, it } from "vitest";
import {
  evaluateContextDecision,
  patternContextScenarios,
} from "./pattern-context";

describe("pattern context practice", () => {
  it("keeps later bars hidden in every scenario", () => {
    for (const scenario of patternContextScenarios) {
      expect(scenario.visibleBars).toBeGreaterThanOrEqual(3);
      expect(scenario.visibleBars).toBeLessThan(scenario.bars.length);
      expect(scenario.unknowns.length).toBeGreaterThan(0);
    }
  });

  it("grades the learning workflow instead of next-bar direction", () => {
    expect(
      evaluateContextDecision("doji-without-context", "wait"),
    ).toMatchObject({ aligned: true, correctDecision: "wait" });
    expect(
      evaluateContextDecision("late-extension", "plan_replay"),
    ).toMatchObject({ aligned: false, correctDecision: "no_trade" });
  });
});
