# Trade-derived learning system

Status: current for v0.37.0.

The Trade Lessons workspace converts matched, validated Trading Records evidence into a structured retrospective curriculum. It starts with the newest execution, works backward through every matched record, and uses older trades to test and refine the newest conclusion. It does not modify the original trade, journal reflection, external-AI hypothesis, or original lesson.

## Product flow

1. The Evidence inbox reconstructs completed long positions from sanitized Fidelity Orders exports and pairs same-day, same-symbol one-minute charts.
2. The learner explicitly exports a redacted evidence package and asks an external AI for schema-constrained journal drafts.
3. The app validates package identity, trade identity, evidence citations, confidence, mental-state boundaries, and prohibited directives.
4. When the learner chooses drafts to import, the app stores them as `needs_review` and builds the Trade Lessons system locally.
5. The learning system sorts matched entries by entry timestamp descending, audits the newest trade most urgently, connects recurring mechanisms, and creates a focused practice plan.
6. The learner compares each audit with personal memory. Marking a lesson reviewed records reflection only; it does not mark the trade journal reviewed, complete a curriculum lesson, award mastery, or erase uncertainty.

No AI model runs inside the application and no record uploads automatically.

## Evidence hierarchy

Every trade is divided into five lanes:

| Lane | Meaning |
| --- | --- |
| Known before entry | Contemporaneous plan evidence linked to the trade; when none exists, the absence is stated directly |
| Observed at entry | Fill facts and calculations available at or through the entry timestamp |
| During the trade | Later fills, position duration, and the recorded exit sequence |
| Known only afterward | P&L and full-window chart measures that require later bars or the completed execution |
| Missing | Thesis, intent, risk plan, private thoughts, news context, sub-minute path, or other facts not supported by the package |

Full-session range position, cumulative VWAP comparison, one-minute maximum favorable excursion, and one-minute maximum adverse excursion are useful retrospective measurements. They are never treated as proof that the trader knew the later range, used VWAP, could execute at a candle extreme, or acted from a particular emotion.

## Per-trade audit contract

Every matched trade receives:

- a visible date, symbol, generated display identifier, and source linkage;
- a factual execution summary that does not use P&L as a process grade;
- the original thesis or an explicit statement that no contemporaneous thesis exists;
- defensible strengths and specific failures or unscorable areas;
- the original lesson preserved verbatim;
- a quality audit of specificity, evidence, actionability, measurement, generalizability, hindsight, and cross-trade consistency;
- a revised lesson with observation, decision error or strength, underlying cause, correct principle, future rule, exact trigger, verification artifact, and deliberate practice;
- one pre-entry question, one in-trade checkpoint, and one post-trade review question;
- evidence references, confidence, priority, and relationships to relevant older or newer records.

The engine may call a psychological explanation unconfirmed or name it as an unsupported alternative. It cannot convert orders and candles into a diagnosis or claimed memory.

## Cross-trade synthesis

Patterns are grouped by shared observable mechanism, not similar chart appearance. Each pattern stores occurrence count, supporting source IDs, earliest and most recent dates, older-versus-newer frequency direction, typical trigger, typical consequence, existing rule, implementation evidence, best correction, and confidence.

The current pattern vocabulary covers:

- missing timestamped decision evidence;
- later lower-priced adds without preserved scale governance;
- rapid same-symbol re-entry without a documented reset;
- favorable one-minute excursion followed by a negative gross result without a stored exit rule;
- decisions too short for full one-minute evidence resolution;
- fill relationships requiring reconciliation before statistics;
- complete chart pairing as an evidence strength.

Strategy labels based on entry range or calculated VWAP location remain hypotheses. They organize conditional practice; they do not certify a setup or become a live signal.

## Knowledge and rule hierarchy

The final synthesis separates:

1. Foundational principles that apply across outcomes and setups.
2. Strategy-specific rules that are valid only when the setup was actually planned.
3. Situational adjustments for timing, evidence resolution, scaling, and data quality.
4. Personal behavioral safeguards tied to repeated observable decisions.

Every consolidated rule states why it exists, when it applies, when it does not, which source records support it, and how prospective compliance will be measured. Similar rules are consolidated instead of repeated under new wording.

## Focus plan and deliberate practice

The system chooses one immediate behavior, one concept, and one rule. It names older records to revisit, an outcome-hidden review exercise, a measurable evidence gate, and the next focus after the gate is met. Current practice routes connect to the Decision Card, Chart Replay and local paper practice, Journal, and Learning Lab.

The focus gate measures process artifacts such as pre-entry plan coverage, combined-risk calculation, reset notes, and zero unplanned adds. It never requires live trades, profit, larger size, longer screen time, or uninterrupted streaks.

## Persistence, privacy, and export

The system is an optional bounded field in local application state. Review timestamps survive regeneration when the same source trade is present. The full audit can be downloaded as Markdown. Portable activation preserves the learner-owned `data/` directory, while clean release ZIPs and source archives must not include the learner's detailed audit, journal, order history, or chart files.

Implementation is in [`trade-learning.ts`](../apps/day-trading-teacher/desktop/src/domain/trade-learning.ts), rendering is in [`TradeLessonsPage.tsx`](../apps/day-trading-teacher/desktop/src/features/learning/TradeLessonsPage.tsx), schema enforcement is in [`app-state-validation.ts`](../apps/day-trading-teacher/desktop/src/state/app-state-validation.ts), and deterministic coverage is in [`trade-learning.test.ts`](../apps/day-trading-teacher/desktop/src/domain/trade-learning.test.ts).
