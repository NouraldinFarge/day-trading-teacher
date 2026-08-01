# Open learner practice bank v7

This public bank contains demonstrations, formative practice, and initial diagnostics only. Scored assessment, remediation, retention, and capstone forms are released individually by a facilitator.

## DEMO-CASH-01 — Cash-account decision case — Form DEMO-CASH-01

A cash account starts with $800 settled cash and makes a $600 purchase.

### Tasks

- Calculate remaining settled cash.
- State whether a second $300 purchase is fully supported.

### Records

| Timestamp | Source | Record |
| --- | --- | --- |
| Monday 09:00 | Account ledger | Settled cash 800; deposit hold 0. |
| Monday 10:00 | Trade record | Purchase 600 of SIMB; expected settlement Tuesday. |

## DEMO-DATA-01 — Market-readiness case — Form DEMO-DATA-01

Two quote sources disagree and one is stale.

### Tasks

- Choose READY, WAIT—VERIFY, or STOP—RECONCILE.
- Name the blocking facts.

### Records

| Timestamp | Source | Record |
| --- | --- | --- |
| 10:15:00 | Feed A | Bid 40.00 ask 40.04; age 1 second. |
| 10:15:00 | Feed B | Bid 39.70 ask 40.30; age 18 seconds. |
| 10:15:01 | Platform | Connection warning active. |

## DEMO-EVID-01 — Evidence reconstruction case — Form DEMO-EVID-01

A simple fictional record contains one order, two partial fills, and a canceled sell instruction.

### Tasks

- Build the six-event clock.
- Calculate average price.
- State open quantity and unknowns.

### Records

| Timestamp | Source | Record |
| --- | --- | --- |
| 10:01:00 | Learner note | Trigger reported: break above 30.00. |
| 10:01:10 | Order log | Buy 3 shares market submitted. |
| 10:01:14 | Fill log | 2 shares filled at 30.00. |
| 10:01:16 | Fill log | 1 share filled at 31.00. |
| 10:02:00 | Order log | Sell 3 shares submitted. |
| 10:02:04 | Order log | Sell order canceled; no fill shown. |

## DEMO-MARG-01 — Margin and suitability case — Form DEMO-MARG-01

A fictional broker method reports required intraday margin of $1,200 and available margin of $1,000.

### Tasks

- Calculate the deficit.
- Separate broker permission from personal suitability.

### Records

| Timestamp | Source | Record |
| --- | --- | --- |
| 09:35 | Broker rule card | Method effective 2026-07-01; house rules may exceed FINRA minimums. |
| 09:36 | Margin panel | Required intraday margin 1,200; available 1,000. |

## DEMO-RISK-01 — Risk-boundary case — Form DEMO-RISK-01

A fictional long plan has entry 52.40, stop 51.90, allowance 0.05, and maximum planned loss 50.00.

### Tasks

- Calculate planned risk per share.
- Calculate whole-share quantity.
- State planned loss at that quantity.

### Records

| Timestamp | Source | Record |
| --- | --- | --- |
| 11:00 | Risk worksheet | Entry 52.40; stop 51.90; allowance 0.05; max loss 50.00. |

## DEMO-TEST-01 — Strategy-evidence case — Form DEMO-TEST-01

A frozen fictional strategy has eight observations with gross R and total cost in R.

### Tasks

- Calculate net R per observation and mean net R.
- Report win count and sample limitation.

### Records

| Timestamp | Source | Record |
| --- | --- | --- |
| Dataset | Evaluation table | Gross R: 1.2,-1.0,0.8,-1.0,1.5,-1.0,0.4,1.1; costs: 0.10,0.08,0.12,0.09,0.11,0.10,0.13,0.10. |

## DIAG-01 — Prerequisite transfer check — Form DIAG-01

A fictional regular-hours ticket and quote are shown before any order action.

### Tasks

- Record all eight ticket fields.
- Calculate spread in dollars and as a percent of midpoint.
- State whether the quantity is dollars or shares.
- Complete and save every item in the Required artifacts checklist. A required artifact that is absent will be scored NS-MISSING.

### Records

| Timestamp | Source | Record |
| --- | --- | --- |
| 09:42:10 | Quote panel | Bid 24.98 x 900; ask 25.02 x 700; quote age 1 second. |
| 09:42:12 | Order ticket | Symbol SIMA; side Buy; quantity 25; unit shares; order type Limit; limit 25.02; session regular; time in force Day. |

## DIAG-02 — Prerequisite transfer check — Form DIAG-02

A fictional long plan uses entry 20.00, stop 19.60, execution allowance 0.05, and maximum planned loss 18.00.

### Tasks

- Calculate technical and planned risk per share.
- Calculate whole-share quantity.
- Name two excluded subjects.
- Complete and save every item in the Required artifacts checklist. A required artifact that is absent will be scored NS-MISSING.

### Records

| Timestamp | Source | Record |
| --- | --- | --- |
| 10:00:00 | Decision worksheet | Entry 20.00; invalidation 19.60; allowance 0.05; maximum planned loss 18.00. |
| 10:00:05 | Course scope card | Simulation-only U.S. listed stocks and ETFs; excluded: options, futures, forex, cryptoassets, taxes, non-U.S. rules, live signals. |

## GUIDE-01 — Integrated replay case — Form GUIDE-01

A fictional regular-hours momentum setup appears visually strong, but the data and spread gates fail.

### Tasks

- Apply readiness and eligibility gates.
- Write a complete WAIT decision card.
- Lock before reveal.

### Records

| Timestamp | Source | Record |
| --- | --- | --- |
| 10:20:00 | Playbook card | Quote age <=2 seconds; spread <=0.15% of midpoint; no unresolved feed conflict. |
| 10:20:03 | Feed A | Bid 19.90 ask 20.10; age 7 seconds. |
| 10:20:03 | Feed B | Last 20.04; bid/ask unavailable. |
| 10:20:04 | Chart text alternative | Price has risen for three bars and is near the session high. |

## GUIDE-02 — Integrated replay case — Form GUIDE-02

A fictional limit-entry plan receives a partial fill while the remainder stays open.

### Tasks

- Calculate current position and open remainder.
- Recalculate risk on filled quantity.
- Apply the remainder cancellation rule.
- Complete and save every item in the Required artifacts checklist. A required artifact that is absent will be scored NS-MISSING.

### Records

| Timestamp | Source | Record |
| --- | --- | --- |
| 13:14:00 | Decision card | Buy limit 32.10; maximum 60 shares; invalidation 31.80; cancel remainder if spread exceeds 0.20%. |
| 13:14:05 | Quote | Bid 32.06 ask 32.10; midpoint 32.08. |
| 13:14:08 | Fill log | 25 shares fill at 32.10; 35 shares remain open. |
| 13:14:10 | Quote | Bid 32.00 ask 32.14. |

## GUIDE-03 — Integrated replay case — Form GUIDE-03

A clean regular-hours ETF setup supplies complete readiness, risk, and plan inputs.

### Tasks

- Complete the full no-click workflow without coaching.
- Calculate size.
- Choose proceed or wait and include cancellation rules.

### Records

| Timestamp | Source | Record |
| --- | --- | --- |
| 10:05 | Readiness | Cash supported; two fresh matching sources; no halt; platform healthy. |
| 10:05 | Gate | Trigger 51.20; spread <=0.20%; ask size >=500; all pass. |
| 10:05 | Risk | Entry 51.22; invalidation 50.92; allowance 0.04; max loss $17. |
| 10:06 | Policy | Whole-share limit orders supported; Day. |
