export const skillRegistry = [
  {
    id: "AC-001",
    title: "Distinguish cash-account settlement constraints",
    module: "Accounts and suitability",
  },
  {
    id: "AC-002",
    title: "Verify intraday margin and firm requirements",
    module: "Accounts and suitability",
  },
  {
    id: "AC-003",
    title: "Evaluate trading costs, taxes, and suitability",
    module: "Accounts and suitability",
  },
  {
    id: "TF-009",
    title: "Separate process quality from outcome",
    module: "Trading foundations",
  },
  {
    id: "RM-001",
    title: "Define maximum dollar risk",
    module: "Risk management",
  },
  {
    id: "RM-002",
    title: "Calculate technical risk per share",
    module: "Risk management",
  },
  {
    id: "RM-004",
    title: "Size a position with slippage",
    module: "Risk management",
  },
  {
    id: "OE-001",
    title: "Explain market-order behavior",
    module: "Orders and execution",
  },
  {
    id: "OE-002",
    title: "Explain limit-order behavior",
    module: "Orders and execution",
  },
  {
    id: "OE-003",
    title: "Distinguish dollar and share quantities",
    module: "Orders and execution",
  },
  {
    id: "OE-004",
    title: "Measure spread and slippage",
    module: "Orders and execution",
  },
  {
    id: "OE-005",
    title: "Interpret fractional and partial fills",
    module: "Orders and execution",
  },
  {
    id: "OE-006",
    title: "Choose among market, limit, stop, and stop-limit orders",
    module: "Orders and execution",
  },
  {
    id: "OE-007",
    title: "Verify fractional-share execution behavior",
    module: "Orders and execution",
  },
  {
    id: "TP-001",
    title: "Write an objective trade trigger",
    module: "Trade planning",
  },
  {
    id: "TP-002",
    title: "Define invalidation before entry",
    module: "Trade planning",
  },
  {
    id: "TP-003",
    title: "Design an exit before entry",
    module: "Trade planning",
  },
  {
    id: "TR-001",
    title: "Reconstruct a factual timeline",
    module: "Journaling and review",
  },
  {
    id: "TR-002",
    title: "Reconcile orders, fills, and positions",
    module: "Journaling and review",
  },
  {
    id: "PB-005",
    title: "Recognize a chase entry",
    module: "Psychology and behavior",
  },
  {
    id: "PB-006",
    title: "Reset before a re-entry decision",
    module: "Psychology and behavior",
  },
  {
    id: "VC-001",
    title: "Assess volatility and liquidity context",
    module: "Market context",
  },
] as const;

export const allowedSkillIds = skillRegistry.map((skill) => skill.id);

export function getSkillTitle(skillId: string) {
  return skillRegistry.find((skill) => skill.id === skillId)?.title ?? skillId;
}
