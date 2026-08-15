import { parseCsvRows, parseFlexibleNumber } from "./csv";

export type FidelityRoundTrip = {
  sourceId: string;
  symbol: string;
  side: "long";
  entry: string;
  exit: string;
  quantity: string;
  entryAt: string;
  exitAt: string;
  holdingSeconds: number;
  orderType: string;
  entryFillCount: number;
  exitFillCount: number;
  reconciliationConfidence: "high" | "review";
  quantityBasis: "dollar_filled" | "share_filled" | "mixed";
  tradingDate: string;
  orderEvidenceRefs: string[];
  investedDollars: number;
  grossExitProceeds: number;
  unmatchedShareEstimate: number;
};

export type FidelityOrderEvidence = {
  evidenceRef: string;
  symbol: string;
  action: "buy" | "sell";
  amount: number;
  amountMeaning: "dollars_invested" | "shares_sold";
  filled: number;
  filledMeaning: "dollars_invested" | "shares_sold";
  price: number;
  orderType: string;
  occurredAt: string;
};

export type FidelityImportPreview = {
  trades: FidelityRoundTrip[];
  filledOrderCount: number;
  skippedOrderCount: number;
  unmatchedOrderCount: number;
  warnings: string[];
  orders: FidelityOrderEvidence[];
  symbols: string[];
  tradingDates: string[];
  observedBuyDollars: number;
  calculatedSellProceeds: number;
};

type FidelityOrder = {
  evidenceRef: string;
  symbol: string;
  action: string;
  amount: number;
  filled: number;
  price: number;
  orderType: string;
  orderTime: string;
  occurredAt: string;
  timestamp: number;
};

type QuantityCandidate = {
  shares: number;
  basis: "dollar_filled" | "share_filled";
};

function parseOrderTime(
  value: string,
): { iso: string; timestamp: number } | null {
  const match = value.match(
    /(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)\s+ET\s+([A-Za-z]{3})-(\d{1,2})-(\d{4})/i,
  );
  if (!match) return null;
  const months: Record<string, number> = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  };
  const month = months[match[5].toLowerCase()];
  if (month === undefined) return null;
  let hour = Number(match[1]) % 12;
  if (match[4].toUpperCase() === "PM") hour += 12;
  const year = Number(match[7]);
  const day = Number(match[6]);
  const secondSundayInMarch =
    8 + ((7 - new Date(Date.UTC(year, 2, 8)).getUTCDay()) % 7);
  const firstSundayInNovember =
    1 + ((7 - new Date(Date.UTC(year, 10, 1)).getUTCDay()) % 7);
  const daylight =
    (month > 2 && month < 10) ||
    (month === 2 &&
      (day > secondSundayInMarch ||
        (day === secondSundayInMarch && hour >= 2))) ||
    (month === 10 &&
      (day < firstSundayInNovember ||
        (day === firstSundayInNovember && hour < 2)));
  const timestamp = Date.UTC(
    year,
    month,
    day,
    hour + (daylight ? 4 : 5),
    Number(match[2]),
    Number(match[3]),
  );
  return { iso: new Date(timestamp).toISOString(), timestamp };
}

function stableSourceId(
  entries: FidelityOrder[],
  exits: FidelityOrder[],
  quantity: number,
): string {
  if (entries.length === 1 && exits.length === 1)
    return [
      "fidelity",
      entries[0].symbol,
      entries[0].orderTime,
      exits[0].orderTime,
      entries[0].price.toFixed(6),
      exits[0].price.toFixed(6),
      quantity.toFixed(6),
    ].join(":");
  return [
    "fidelity",
    entries[0].symbol,
    ...entries.map(
      (entry) =>
        `b:${entry.orderTime}:${entry.price.toFixed(6)}:${entry.filled.toFixed(6)}`,
    ),
    ...exits.map(
      (exit) =>
        `s:${exit.orderTime}:${exit.price.toFixed(6)}:${exit.filled.toFixed(6)}`,
    ),
    quantity.toFixed(6),
  ].join(":");
}

function reconcileBuyQuantities(
  buys: FidelityOrder[],
  targetShares: number,
): {
  candidates: QuantityCandidate[];
  relativeMismatch: number;
} {
  // Fidelity's fractional-dollar Orders export uses Amount and Filled as
  // dollars for buys. The share quantity is therefore filled dollars divided
  // by the execution price. Do not reinterpret "Buy 10" as ten shares.
  const candidates = buys.map((order) => ({
    shares: order.filled / order.price,
    basis: "dollar_filled" as const,
  }));
  const total = candidates.reduce(
    (sum, candidate) => sum + candidate.shares,
    0,
  );
  return {
    candidates,
    relativeMismatch:
      Math.abs(total - targetShares) / Math.max(total, targetShares, 0.000_001),
  };
}

function evidenceRef(order: Omit<FidelityOrder, "evidenceRef">) {
  return [
    "order",
    order.symbol,
    order.action,
    order.occurredAt,
    order.price.toFixed(6),
    order.filled.toFixed(6),
  ].join(":");
}

function easternDate(timestamp: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(new Date(timestamp))
    .reduce<Record<string, string>>((result, part) => {
      if (part.type !== "literal") result[part.type] = part.value;
      return result;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function weightedPrice(
  orders: FidelityOrder[],
  quantities: number[],
  matchedShares: number,
) {
  let remaining = matchedShares;
  let notional = 0;
  let usedShares = 0;
  let lastUsed = -1;
  for (let index = 0; index < orders.length && remaining > 0; index += 1) {
    const used = Math.min(quantities[index], remaining);
    if (used <= 0) continue;
    notional += used * orders[index].price;
    usedShares += used;
    remaining -= used;
    lastUsed = index;
  }
  return {
    price: notional / Math.max(usedShares, 0.000_001),
    lastUsed,
  };
}

export function parseFidelityOrdersCsv(raw: string): FidelityImportPreview {
  if (raw.length > 10_000_000)
    throw new Error(
      "The Fidelity export is larger than the 10 MB safety limit.",
    );
  const rows = parseCsvRows(raw.replace(/^\uFEFF/, ""));
  const headerIndex = rows.findIndex(
    (row) =>
      row[0]?.toLowerCase() === "symbol" &&
      row.some((cell) => cell.toLowerCase() === "order time"),
  );
  if (headerIndex < 0)
    throw new Error(
      "This file does not contain a supported Fidelity Orders header.",
    );
  const headers = rows[headerIndex].map((header) => header.toLowerCase());
  const column = (name: string) => headers.indexOf(name.toLowerCase());
  const required = [
    "symbol",
    "action",
    "amount",
    "order type",
    "status",
    "filled",
    "order time",
  ];
  if (required.some((name) => column(name) < 0))
    throw new Error("The Fidelity Orders export is missing required columns.");

  const orders: FidelityOrder[] = [];
  let skippedOrderCount = 0;
  for (const row of rows.slice(headerIndex + 1)) {
    const symbol = row[column("symbol")]?.trim().toUpperCase();
    if (!symbol || symbol.toLowerCase() === "disclosure") break;
    const action = row[column("action")]?.trim().toLowerCase();
    if (action !== "buy" && action !== "sell") {
      skippedOrderCount += 1;
      continue;
    }
    const status = row[column("status")] ?? "";
    const priceMatch = status.match(/Filled at \$([\d,.]+)/i);
    if (!priceMatch) {
      skippedOrderCount += 1;
      continue;
    }
    const time = parseOrderTime(row[column("order time")] ?? "");
    const amount = parseFlexibleNumber(row[column("amount")] ?? "");
    const filledText = (row[column("filled")] ?? "").split("/")[0];
    const filled = parseFlexibleNumber(filledText);
    const price = parseFlexibleNumber(priceMatch[1]);
    if (
      !time ||
      !Number.isFinite(amount) ||
      !Number.isFinite(filled) ||
      !Number.isFinite(price) ||
      amount <= 0 ||
      filled <= 0 ||
      price <= 0
    ) {
      skippedOrderCount += 1;
      continue;
    }
    const order = {
      symbol,
      action,
      amount,
      filled,
      price,
      orderType: row[column("order type")]?.trim() || "Unknown",
      orderTime: row[column("order time")],
      occurredAt: time.iso,
      timestamp: time.timestamp,
    } satisfies Omit<FidelityOrder, "evidenceRef">;
    orders.push({ ...order, evidenceRef: evidenceRef(order) });
  }

  orders.sort((left, right) => left.timestamp - right.timestamp);
  const trades: FidelityRoundTrip[] = [];
  const warnings: string[] = [];
  let unmatchedOrderCount = 0;
  const bySymbol = new Map<string, FidelityOrder[]>();
  for (const order of orders)
    bySymbol.set(order.symbol, [...(bySymbol.get(order.symbol) ?? []), order]);
  for (const [symbol, symbolOrders] of bySymbol) {
    let index = 0;
    while (index < symbolOrders.length) {
      if (symbolOrders[index].action === "sell") {
        unmatchedOrderCount += 1;
        warnings.push(
          `${symbol}: a sell could not be matched to an earlier buy and was not imported.`,
        );
        index += 1;
        continue;
      }

      const buys: FidelityOrder[] = [];
      while (
        index < symbolOrders.length &&
        symbolOrders[index].action === "buy"
      ) {
        buys.push(symbolOrders[index]);
        index += 1;
      }
      const exits: FidelityOrder[] = [];
      while (
        index < symbolOrders.length &&
        symbolOrders[index].action === "sell"
      ) {
        exits.push(symbolOrders[index]);
        index += 1;
      }
      if (!exits.length) {
        unmatchedOrderCount += buys.length;
        warnings.push(
          `${symbol}: ${buys.length} open or unmatched buy order${buys.length === 1 ? " was" : "s were"} not imported as a completed trade.`,
        );
        continue;
      }

      const exitQuantities = exits.map((exit) => exit.filled);
      const totalExitShares = exitQuantities.reduce(
        (sum, quantity) => sum + quantity,
        0,
      );
      const reconciliation = reconcileBuyQuantities(buys, totalExitShares);
      const buyQuantities = reconciliation.candidates.map(
        (candidate) => candidate.shares,
      );
      const totalBuyShares = buyQuantities.reduce(
        (sum, quantity) => sum + quantity,
        0,
      );
      const reconciledQuantity = Math.min(totalBuyShares, totalExitShares);
      const entry = weightedPrice(buys, buyQuantities, reconciledQuantity);
      const exit = weightedPrice(exits, exitQuantities, reconciledQuantity);
      const usedBuys = buys.slice(0, entry.lastUsed + 1);
      const usedExits = exits.slice(0, exit.lastUsed + 1);
      const entryTime = new Date(usedBuys[0].timestamp);
      const exitTime = new Date(usedExits.at(-1)!.timestamp);
      const bases = new Set(
        reconciliation.candidates
          .slice(0, entry.lastUsed + 1)
          .map((candidate) => candidate.basis),
      );
      const confidence =
        reconciliation.relativeMismatch <= 0.01 ? "high" : "review";

      if (reconciliation.relativeMismatch > 0.05)
        warnings.push(
          `${symbol}: the entry and exit quantities differed by more than 5%. The matched portion was imported for review and the remaining quantity was left unresolved.`,
        );
      if (reconciliation.relativeMismatch > 0.01) unmatchedOrderCount += 1;

      const entryTypes = [...new Set(usedBuys.map((order) => order.orderType))];
      const exitTypes = [...new Set(usedExits.map((order) => order.orderType))];
      trades.push({
        sourceId: stableSourceId(usedBuys, usedExits, reconciledQuantity),
        symbol,
        side: "long",
        entry: entry.price.toFixed(4).replace(/0+$/, "").replace(/\.$/, ""),
        exit: exit.price.toFixed(4).replace(/0+$/, "").replace(/\.$/, ""),
        quantity: reconciledQuantity
          .toFixed(6)
          .replace(/0+$/, "")
          .replace(/\.$/, ""),
        entryAt: entryTime.toISOString(),
        exitAt: exitTime.toISOString(),
        holdingSeconds: Math.max(
          0,
          Math.round((exitTime.getTime() - entryTime.getTime()) / 1000),
        ),
        orderType: `${entryTypes.join(" + ")} → ${exitTypes.join(" + ")}`,
        entryFillCount: usedBuys.length,
        exitFillCount: usedExits.length,
        reconciliationConfidence: confidence,
        quantityBasis:
          bases.size > 1
            ? "mixed"
            : (bases.values().next().value ?? "share_filled"),
        tradingDate: easternDate(entryTime.getTime()),
        orderEvidenceRefs: [...usedBuys, ...usedExits].map(
          (order) => order.evidenceRef,
        ),
        investedDollars: Number((reconciledQuantity * entry.price).toFixed(6)),
        grossExitProceeds: Number((reconciledQuantity * exit.price).toFixed(6)),
        unmatchedShareEstimate: Number(
          Math.abs(totalBuyShares - totalExitShares).toFixed(6),
        ),
      });
    }
  }
  if (!trades.length)
    warnings.push("No supported completed long equity round trips were found.");
  return {
    trades: trades.reverse(),
    filledOrderCount: orders.length,
    skippedOrderCount,
    unmatchedOrderCount,
    warnings: [...new Set(warnings)],
    orders: orders.map((order) => ({
      evidenceRef: order.evidenceRef,
      symbol: order.symbol,
      action: order.action as "buy" | "sell",
      amount: order.amount,
      amountMeaning:
        order.action === "buy" ? "dollars_invested" : "shares_sold",
      filled: order.filled,
      filledMeaning:
        order.action === "buy" ? "dollars_invested" : "shares_sold",
      price: order.price,
      orderType: order.orderType,
      occurredAt: order.occurredAt,
    })),
    symbols: [...bySymbol.keys()].sort(),
    tradingDates: [
      ...new Set(orders.map((order) => easternDate(order.timestamp))),
    ].sort(),
    observedBuyDollars: Number(
      orders
        .filter((order) => order.action === "buy")
        .reduce((sum, order) => sum + order.filled, 0)
        .toFixed(6),
    ),
    calculatedSellProceeds: Number(
      orders
        .filter((order) => order.action === "sell")
        .reduce((sum, order) => sum + order.filled * order.price, 0)
        .toFixed(6),
    ),
  };
}
