import { describe, expect, it } from "vitest";
import {
  calculateExpectancy,
  calculateRewardRisk,
  buildRecallRecord,
  conceptCards,
  decisionScenarios,
  dueConceptCards,
  evaluateScenarioChoice,
} from "./learning-tools";

describe("learning tools", () => {
  it("calculates expectancy and the break-even win rate in R", () => {
    const result = calculateExpectancy({
      winRatePercent: 45,
      averageWinR: 2,
      averageLossR: 1,
    });
    expect(result.expectancyR).toBeCloseTo(0.35);
    expect(result.breakEvenWinRate).toBeCloseTo(33.3333);
    expect(result.expectedRPer100Observations).toBeCloseTo(35);
  });

  it("keeps negative expectancy visible instead of rounding it away", () => {
    expect(
      calculateExpectancy({
        winRatePercent: 40,
        averageWinR: 1,
        averageLossR: 1,
      }).expectancyR,
    ).toBeCloseTo(-0.2);
  });

  it("rounds repeating expectancy values deterministically to six decimals", () => {
    expect(
      calculateExpectancy({
        winRatePercent: 33.333333,
        averageWinR: 2,
        averageLossR: 1,
      }).expectancyR,
    ).toBe(0);
  });

  it("rejects impossible expectancy inputs", () => {
    expect(() =>
      calculateExpectancy({
        winRatePercent: 101,
        averageWinR: 2,
        averageLossR: 1,
      }),
    ).toThrow("between 0% and 100%");
    expect(() =>
      calculateExpectancy({
        winRatePercent: 33.3333333,
        averageWinR: 2,
        averageLossR: 1,
      }),
    ).toThrow("at most six decimal places");
  });

  it("calculates long and short reward-to-risk examples", () => {
    expect(
      calculateRewardRisk({ entry: 100, stop: 99.5, target: 101, side: "long" })
        .rewardRiskRatio,
    ).toBe(2);
    expect(
      calculateRewardRisk({
        entry: 100,
        stop: 100.5,
        target: 99,
        side: "short",
      }).rewardRiskRatio,
    ).toBe(2);
  });

  it("rejects a target on the wrong side of entry", () => {
    expect(() =>
      calculateRewardRisk({ entry: 100, stop: 99.5, target: 99, side: "long" }),
    ).toThrow("target belongs above entry");
  });

  it("evaluates a scenario choice using explicit process evidence", () => {
    const scenario = decisionScenarios[0];
    const alignedChoice = scenario.choices.find((choice) => choice.aligned);
    expect(alignedChoice).toBeDefined();
    expect(
      evaluateScenarioChoice(scenario.id, alignedChoice?.id ?? ""),
    ).toMatchObject({ aligned: true });
  });

  it("rejects unknown scenario choices", () => {
    expect(() => evaluateScenarioChoice("missing", "missing")).toThrow(
      "not available",
    );
  });

  it("schedules successful recall farther apart over time", () => {
    const now = new Date("2026-07-18T12:00:00.000Z");
    const first = buildRecallRecord(undefined, "good", now);
    const second = buildRecallRecord(first, "good", now);
    expect(first.strength).toBe(1);
    expect(first.nextReviewAt).toBe("2026-07-21T12:00:00.000Z");
    expect(second.strength).toBe(2);
    expect(second.nextReviewAt).toBe("2026-07-25T12:00:00.000Z");
  });

  it("returns new and due concepts without claiming mastery", () => {
    const now = new Date("2026-07-18T12:00:00.000Z");
    const firstCard = conceptCards[0];
    const due = dueConceptCards(
      {
        [firstCard.id]: {
          strength: 1,
          attempts: 1,
          lastReviewedAt: "2026-07-10T12:00:00.000Z",
          nextReviewAt: "2026-07-11T12:00:00.000Z",
          lastRating: "good",
        },
      },
      now,
    );
    expect(due.some((card) => card.id === firstCard.id)).toBe(true);
    expect(due).toHaveLength(conceptCards.length);
  });
});
