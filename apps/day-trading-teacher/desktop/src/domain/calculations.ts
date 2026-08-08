import type { PositionSizeResult, TradeSide } from "./types";

const SCALE = 1_000_000n;
const MAX_SAFE_QUANTITY = BigInt(Number.MAX_SAFE_INTEGER);

function parseFixed(value: string, field: string): bigint {
  const normalized = value.trim();
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(normalized);
  if (!match) throw new Error(`${field} must be a valid number`);
  const [, sign, whole, fraction = ""] = match;
  if (fraction.length > 6)
    throw new Error(`${field} may contain at most six decimal places`);
  if (`${whole}${fraction}`.replace(/^0+/, "").length > 28)
    throw new Error(`${field} exceeds the supported numeric range`);
  const padded = `${fraction}000000`.slice(0, 6);
  const parsed = BigInt(whole) * SCALE + BigInt(padded);
  return sign ? -parsed : parsed;
}

function assertSide(side: unknown): asserts side is TradeSide {
  if (side !== "long" && side !== "short")
    throw new Error("Side must be either long or short");
}

function divideRounded(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new Error("The calculation is invalid");
  const negative = numerator < 0n;
  const absolute = negative ? -numerator : numerator;
  const result = (absolute + denominator / 2n) / denominator;
  return negative ? -result : result;
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

function formatPrecise(value: bigint): string {
  return formatFixed(value, 6).replace(/0+$/, "").replace(/\.$/, "");
}

export function calculatePositionSize(input: {
  entry: string;
  stop: string;
  maximum_risk: string;
  slippage_per_unit: string;
  side: TradeSide;
}): PositionSizeResult {
  assertSide(input.side);
  const entry = parseFixed(input.entry, "Entry");
  const stop = parseFixed(input.stop, "Stop");
  const maximumRisk = parseFixed(input.maximum_risk, "Maximum risk");
  const slippage = parseFixed(
    input.slippage_per_unit || "0",
    "Slippage per unit",
  );
  if (entry <= 0n || stop <= 0n)
    throw new Error("Entry and stop prices must be positive");
  if (maximumRisk <= 0n) throw new Error("Maximum risk must be positive");
  if (slippage < 0n)
    throw new Error("Slippage per unit must be zero or greater");

  const technicalRisk = input.side === "short" ? stop - entry : entry - stop;
  if (technicalRisk <= 0n) {
    throw new Error(
      "Stop must be below entry for a long plan and above entry for a short plan",
    );
  }
  const riskPerUnit = technicalRisk + slippage;
  const quantityValue = maximumRisk / riskPerUnit;
  if (quantityValue > MAX_SAFE_QUANTITY)
    throw new Error("The calculated whole-unit quantity is too large");
  const quantity = Number(quantityValue);
  const plannedRisk = quantityValue * riskPerUnit;

  return {
    technical_risk_per_unit: formatPrecise(technicalRisk),
    risk_per_unit: formatPrecise(riskPerUnit),
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
  assertSide(input.side);
  const entry = parseFixed(input.entry, "Entry");
  const exit = parseFixed(input.exit, "Exit");
  const quantity = parseFixed(input.quantity, "Quantity");
  const fees = parseFixed(input.fees || "0", "Fees");
  const multiplier = parseFixed(input.multiplier || "1", "Multiplier");
  if (entry <= 0n || exit <= 0n)
    throw new Error("Entry and exit prices must be positive");
  if (quantity <= 0n) throw new Error("Quantity must be positive");
  if (fees < 0n) throw new Error("Fees must be zero or greater");
  if (multiplier <= 0n) throw new Error("Multiplier must be positive");

  const difference = input.side === "short" ? entry - exit : exit - entry;
  const gross = divideRounded(
    difference * quantity * multiplier,
    SCALE * SCALE,
  );
  const net = gross - fees;
  const hasPlannedRisk = Boolean(input.planned_risk?.trim());
  const plannedRisk = hasPlannedRisk
    ? parseFixed(input.planned_risk!, "Planned risk")
    : null;
  if (plannedRisk !== null && plannedRisk <= 0n)
    throw new Error("Planned risk must be positive when supplied");
  const rMultiple =
    plannedRisk === null ? null : divideRounded(net * SCALE, plannedRisk);

  return {
    gross_pnl: formatFixed(gross),
    net_pnl: formatFixed(net),
    r_multiple: rMultiple === null ? null : formatPrecise(rMultiple),
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
