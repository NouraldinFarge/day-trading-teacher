import { describe, expect, it } from "vitest";
import { calculatePositionSize, calculateTradeResult } from "./calculations";

describe("deterministic calculations", () => {
  it("sizes a long position with slippage and rounds down", () => {
    const result = calculatePositionSize({
      entry: "32.40",
      stop: "32.12",
      maximum_risk: "28",
      slippage_per_unit: "0.02",
      side: "long",
    });
    expect(result.quantity).toBe(93);
    expect(result.planned_risk).toBe("27.90");
  });

  it("calculates a short result without reversing the sign", () => {
    const result = calculateTradeResult({
      entry: "20",
      exit: "19.60",
      quantity: "50",
      fees: "0.50",
      side: "short",
      planned_risk: "10",
    });
    expect(result.net_pnl).toBe("19.50");
    expect(result.outcome).toBe("profitable");
  });

  it("rejects a stop on the wrong side", () => {
    expect(() =>
      calculatePositionSize({
        entry: "10",
        stop: "10.20",
        maximum_risk: "20",
        slippage_per_unit: "0",
        side: "long",
      }),
    ).toThrow(/Stop must be below/);
  });
});
