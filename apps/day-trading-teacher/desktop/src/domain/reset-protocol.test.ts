import { describe, expect, it } from "vitest";
import { recommendResetAction } from "./reset-protocol";

describe("reset protocol", () => {
  it("makes fixed session boundaries non-negotiable", () => {
    expect(
      recommendResetAction({
        activation: 1,
        signals: [],
        boundaryReached: true,
        planStillValid: true,
      }).recommendation,
    ).toBe("review_only");
  });

  it("routes outcome-repair urges directly to review", () => {
    expect(
      recommendResetAction({
        activation: 2,
        signals: ["recover_outcome"],
        boundaryReached: false,
        planStillValid: true,
      }).recommendation,
    ).toBe("review_only");
  });

  it("allows calm review without creating a requirement to act", () => {
    expect(
      recommendResetAction({
        activation: 1,
        signals: [],
        boundaryReached: false,
        planStillValid: true,
      }).recommendation,
    ).toBe("continue_review");
  });
});
