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
    expect(result.r_multiple).toBe("1.95");
    expect(result.outcome).toBe("profitable");
  });

  it("keeps six-decimal R-multiple precision aligned with the desktop core", () => {
    const result = calculateTradeResult({
      entry: "50",
      exit: "50.333333",
      quantity: "3",
      fees: "0",
      side: "long",
      planned_risk: "3",
    });
    expect(result.r_multiple).toBe("0.333333");
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

  it.each([
    ["invalid side", { side: "buy" }, /Side must be either/],
    ["zero entry", { entry: "0" }, /prices must be positive/],
    ["negative slippage", { slippage_per_unit: "-0.01" }, /zero or greater/],
    ["excess precision", { entry: "10.0000001" }, /six decimal/],
  ])("rejects %s", (_label, override, message) => {
    expect(() =>
      calculatePositionSize({
        entry: "10",
        stop: "9.50",
        maximum_risk: "20",
        slippage_per_unit: "0",
        side: "long",
        ...override,
      } as Parameters<typeof calculatePositionSize>[0]),
    ).toThrow(message);
  });

  it.each([
    ["negative fees", { fees: "-1" }, /zero or greater/],
    ["zero multiplier", { multiplier: "0" }, /Multiplier must be positive/],
    ["invalid planned risk", { planned_risk: "none" }, /valid number/],
    ["zero planned risk", { planned_risk: "0" }, /must be positive/],
  ])("rejects %s", (_label, override, message) => {
    expect(() =>
      calculateTradeResult({
        entry: "10",
        exit: "10.50",
        quantity: "10",
        fees: "0",
        side: "long",
        planned_risk: "5",
        ...override,
      }),
    ).toThrow(message);
  });

  it("rejects a position size that cannot be represented safely in the UI", () => {
    expect(() =>
      calculatePositionSize({
        entry: "10.000001",
        stop: "10",
        maximum_risk: "9999999999999999999999",
        slippage_per_unit: "0",
        side: "long",
      }),
    ).toThrow(/quantity is too large/);
  });
});
