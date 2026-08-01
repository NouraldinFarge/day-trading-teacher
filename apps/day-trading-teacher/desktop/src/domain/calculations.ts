import type { PositionSizeResult, TradeSide } from "./types";

const SCALE = 1_000_000n;

function parseFixed(value: string): bigint {
  const normalized = value.trim();
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("Enter a valid number");
  }
  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [whole, fraction = ""] = unsigned.split(".");
  const padded = `${fraction}000000`.slice(0, 6);
  const parsed = BigInt(whole) * SCALE + BigInt(padded);
  return negative ? -parsed : parsed;
}

function formatFixed(value: bigint, decimals = 2): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const rounded =
    decimals === 6 ? absolute : ((absolute + 5_000n) / 10_000n) * 10_000n;
  const whole = rounded / SCALE;
  const fraction = (rounded % SCALE)
    .toString()
    .padStart(6, "0")
    .slice(0, decimals);
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

export function calculatePositionSize(input: {
  entry: string;
  stop: string;
  maximum_risk: string;
  slippage_per_unit: string;
  side: TradeSide;
}): PositionSizeResult {
  const entry = parseFixed(input.entry);
  const stop = parseFixed(input.stop);
  const maximumRisk = parseFixed(input.maximum_risk);
  const slippage = parseFixed(input.slippage_per_unit || "0");
  if (maximumRisk <= 0n) throw new Error("Maximum risk must be positive");

  const technicalRisk = input.side === "short" ? stop - entry : entry - stop;
  if (technicalRisk <= 0n) {
    throw new Error(
      "Stop must be below entry for a long plan and above entry for a short plan",
    );
  }
  const riskPerUnit = technicalRisk + slippage;
  if (riskPerUnit <= 0n) throw new Error("Risk per share must be positive");
  const quantity = Number(maximumRisk / riskPerUnit);
  const plannedRisk = BigInt(quantity) * riskPerUnit;

  return {
    technical_risk_per_unit: formatFixed(technicalRisk, 6)
      .replace(/0+$/, "")
      .replace(/\.$/, ""),
    risk_per_unit: formatFixed(riskPerUnit, 6)
      .replace(/0+$/, "")
      .replace(/\.$/, ""),
    quantity,
    planned_risk: formatFixed(plannedRisk),
    binding_constraint: "maximum_risk",
  };
}

export function calculateTradeResult(input: {
  entry: string;
  exit: string;
  quantity: string;
  fees: string;
  multiplier?: string;
  side: TradeSide;
  planned_risk?: string | null;
}) {
  const entry = parseFixed(input.entry);
  const exit = parseFixed(input.exit);
  const quantity = parseFixed(input.quantity);
  const fees = parseFixed(input.fees || "0");
  const multiplier = parseFixed(input.multiplier || "1");
  if (quantity <= 0n) throw new Error("Quantity must be positive");

  const difference = input.side === "short" ? entry - exit : exit - entry;
  const gross = (((difference * quantity) / SCALE) * multiplier) / SCALE;
  const net = gross - fees;
  const plannedRisk = input.planned_risk ? parseFixed(input.planned_risk) : 0n;
  const rMultiple = plannedRisk > 0n ? Number(net) / Number(plannedRisk) : null;

  return {
    gross_pnl: formatFixed(gross),
    net_pnl: formatFixed(net),
    r_multiple:
      rMultiple === null ? null : rMultiple.toFixed(2).replace(/\.00$/, ""),
    outcome:
      net > 0n
        ? ("profitable" as const)
        : net < 0n
          ? ("losing" as const)
          : ("flat" as const),
  };
}

export function dollars(value: string | number) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(parsed);
}
