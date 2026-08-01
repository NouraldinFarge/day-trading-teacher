import { describe, expect, it } from "vitest";
import { parseFidelityOrdersCsv } from "./fidelity-import";

const exportText = `"Orders
All Accounts
as of 07/16/2026 at 10:15:08 AM"

Symbol,Action,Amount,Order Type,Status,Filled,Order Time,Account
VEEE,Sell,0.282,Market,Filled at $35.155,0.282 / 0.282,9:38:36 AM ET Jul-16-2026,Individual *0000
VEEE,Buy,10,Market,Filled at $35.42,9.99 / 10,9:37:43 AM ET Jul-16-2026,Individual *0000

Disclosure
"Not for tax reporting"`;

describe("Fidelity Orders CSV import", () => {
  it("reconciles a dollar buy with its fractional-share exit", () => {
    const preview = parseFidelityOrdersCsv(exportText);
    expect(preview.filledOrderCount).toBe(2);
    expect(preview.trades).toHaveLength(1);
    expect(preview.trades[0]).toMatchObject({
      symbol: "VEEE",
      entry: "35.42",
      exit: "35.155",
      holdingSeconds: 53,
      orderType: "Market → Market",
    });
    expect(Number(preview.trades[0].quantity)).toBeCloseTo(0.282, 3);
    expect(JSON.stringify(preview)).not.toContain("Individual *0000");
  });

  it("rejects unrelated CSV files", () => {
    expect(() => parseFidelityOrdersCsv("name,value\nhello,1")).toThrow(
      /supported Fidelity Orders header/,
    );
  });

  it("does not convert an unmatched order into a completed trade", () => {
    const preview = parseFidelityOrdersCsv(
      exportText.replace(/VEEE,Sell.*\n/, ""),
    );
    expect(preview.trades).toHaveLength(0);
    expect(preview.warnings.join(" ")).toMatch(/unmatched buy/i);
  });

  it("reconstructs multiple entries and partial exits as one completed position", () => {
    const preview =
      parseFidelityOrdersCsv(`Symbol,Action,Amount,Order Type,Status,Filled,Order Time,Account
TEST,Buy,10,Market,Filled at $10,10 / 10,9:30:00 AM ET Jul-27-2026,Individual *0000
TEST,Buy,20,Limit,Filled at $10,20 / 20,9:30:10 AM ET Jul-27-2026,Individual *0000
TEST,Sell,1,Limit,Filled at $11,1 / 1,9:31:00 AM ET Jul-27-2026,Individual *0000
TEST,Sell,2,Market,Filled at $12,2 / 2,9:32:00 AM ET Jul-27-2026,Individual *0000
Disclosure`);

    expect(preview.trades).toHaveLength(1);
    expect(preview.trades[0]).toMatchObject({
      symbol: "TEST",
      quantity: "3",
      entry: "10",
      exit: "11.6667",
      entryFillCount: 2,
      exitFillCount: 2,
      reconciliationConfidence: "high",
      quantityBasis: "dollar_filled",
    });
    expect(preview.unmatchedOrderCount).toBe(0);
  });
});
