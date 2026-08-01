import type { Lesson } from "./types";

export const builtInLessons: Lesson[] = [
  {
    lesson_id: "builtin-tr-002",
    version: "4.0.0",
    title: "Reconstruct before you judge",
    skill_ids: ["TR-001", "TR-002", "OE-005"],
    objective:
      "Reconstruct an execution timeline from orders and fills while separating observed facts, calculations, reported intent, and unknowns.",
    estimated_minutes: 24,
    sections: [
      {
        type: "retrieval",
        title: "Name what the record can prove",
        body: "A record shows a dollar-denominated market buy, a later fractional-share market sell, and 53 seconds between the two fills.",
        prompt:
          "List three facts this proves and three decisions or motives it cannot prove.",
        answer:
          "It proves the recorded order sequence, fill details, and approximate holding interval. It cannot prove the setup, intended stop, reason for exit, emotional state, or whether a rule was followed unless those were captured separately before or during the decision.",
      },
      {
        type: "explanation",
        title: "Use four evidence lanes",
        body: "Observed evidence appears directly in a source. Calculated evidence is derived from those facts, such as elapsed time or position arithmetic. Reported intent is a contemporaneous plan or note. Unknown means the available record does not support the claim. Honest unknowns prevent hindsight from becoming false certainty.",
      },
      {
        type: "worked_example",
        title: "Build the position chronologically",
        body: "Sort fills from earliest to latest and preserve source timestamps. Apply every partial fill, cancellation, replacement, scale-out, fee, and direction change as its own event. Use executed quantities for position state and weighted-average price; requested dollars and order labels remain separate evidence. If timestamps conflict, label the chronology uncertain and seek confirmations rather than silently choosing one source.",
        prompt:
          "A buy request for $100 receives fills of 2 shares at $30 and 1 share at $31. Which position fact is supported before fees?",
        answer:
          "The supported position is 3 shares with a $30.33 weighted-average entry: (($30 × 2) + ($31 × 1)) ÷ 3. The $100 request is intent, not executed quantity, and the remaining requested value does not prove another fill.",
        check: {
          kind: "single_choice",
          options: [
            "3 shares at a $30.33 weighted-average entry",
            "3.33 shares at a $30.00 entry",
            "2 shares because only the first fill counts",
            "$100 of exposure with an unknown share count",
          ],
          correctOption: 0,
          success:
            "You used both executed fills and weighted them by quantity while keeping the original request separate.",
          correction:
            "Update position state from every executed fill. Requested value does not replace fill quantity, and an average of prices must be weighted by shares.",
        },
      },
      {
        type: "practice",
        title: "Write a six-event evidence clock",
        body: "Create six lines: context captured, trigger reported, order submitted, fill received, exit condition reported, and exit filled. Write unknown wherever the record does not support an event.",
        prompt:
          "What is the correct entry for a trigger when the export contains fills but no pre-trade plan?",
        answer:
          "Unknown. The fill proves execution, not the reasoning that preceded it. The missing trigger becomes a concrete evidence-capture goal for the next replay or paper-practice session.",
      },
      {
        type: "transfer",
        title: "Handle an unmatched order",
        body: "A second export contains a buy fill, a canceled sell order, and no later closing fill. Do not force a round trip. Record the open quantity, the canceled instruction, and the missing closing evidence separately.",
        prompt:
          "What process question can you ask without inventing the final position?",
        answer:
          "Ask which additional record is needed to reconcile the position, such as later orders, positions, or confirmations. Do not assume the canceled order closed anything.",
        check: {
          kind: "single_choice",
          options: [
            "Treat the canceled sell as a closing fill",
            "Record the buy fill as open, record the cancellation, and request later position or confirmation evidence",
            "Assume the position closed at the last visible quote",
            "Pair the buy with the canceled sell because both refer to the same requested quantity",
          ],
          correctOption: 1,
          success:
            "You preserved the open quantity and converted missing evidence into a concrete reconciliation step.",
          correction:
            "A cancellation proves an instruction did not remain active; it does not prove execution. Preserve the unmatched state and seek another source.",
        },
      },
      {
        type: "practice",
        title: "Reconcile the app evidence chain",
        body: "The Evidence Journal records a buy fill at 10:01:14 and a sell fill at 10:02:07. Chart Replay has one-minute bars but no order-submission timestamp or pre-trade note. The chart and journal are related sources, not interchangeable proof.",
        prompt:
          "Which reconstruction uses both workspaces without assigning either source facts it cannot prove?",
        answer:
          "Use the journal for the recorded fill sequence and holding interval. Use the chart for the price range and volume of the corresponding one-minute windows. Keep the exact trigger, submission-time quote, motive, and intrabar path unknown unless a timestamped plan or recording supplies them.",
        check: {
          kind: "single_choice",
          options: [
            "Use the candle high as the exact buy trigger because the fill occurred during that minute",
            "Use the fill-price candle body to infer the trigger while keeping only the exact quote unknown",
            "Use journal fills for execution facts, chart bars for interval context, and preserve unsupported trigger and intrabar details as unknown",
            "Discard the journal because one-minute candles contain more price information",
          ],
          correctOption: 2,
          success:
            "You joined the sources by timestamp while preserving the different claims each one can support.",
          correction:
            "Source alignment does not expand source authority. Fills support execution; bars support interval price context; intent requires contemporaneous plan evidence.",
        },
      },
      {
        type: "transfer",
        title: "Resolve a clock that disagrees",
        body: "A broker export timestamps a fill at 10:02:03, while a screen recording appears to show the position changing near 10:01:58. The devices may use different clocks, and neither source exposes a synchronization record.",
        prompt:
          "How would you preserve this conflict in the timeline, and what would you refuse to infer from it?",
        answer:
          "Keep both timestamps with their source labels, record the five-second conflict as unresolved, and use only the ordering supported within each source. Do not select the timestamp that makes the trade look better or infer the exact submission sequence until a shared clock or third source reconciles it.",
      },
      {
        type: "commitment",
        title: "Preserve the audit trail",
        body: "I will reconstruct facts first, label calculations and unknowns, and only then evaluate process. I will not let a profitable or losing outcome rewrite what the source actually shows.",
      },
    ],
    mastery_standard: {
      minimum_first_try_correct: 2,
      unseen_cases_required: 5,
      minimum_successful_cases: 4,
      minimum_rubric_level: 2,
      retention_practice_dates: 2,
      remediation:
        "Rebuild the weakest timeline in the Evidence Journal, label every source and unknown, then retry a different incomplete record without the guide.",
    },
    mastery_criteria: [
      "Distinguishes orders, fills, positions, and reported intent",
      "Reconstructs position quantity in chronological order",
      "Calculates weighted-average entry and keeps fees, cancellations, replacements, and conflicting timestamps visible",
      "Labels observations, calculations, reports, and unknowns without hindsight",
    ],
  },
  {
    lesson_id: "builtin-ac-001",
    version: "4.0.0",
    title: "Know the account before the setup",
    skill_ids: ["AC-001", "AC-002", "AC-003", "OE-007"],
    objective:
      "Distinguish cash and margin constraints, verify the broker's current implementation, account for costs and taxes, and assess fractional-share behavior and personal suitability before practice becomes execution.",
    estimated_minutes: 36,
    curriculum_role: "core",
    sources: [
      {
        title: "FINRA Regulatory Notice 26-10 — Intraday Margin Standards",
        url: "https://www.finra.org/rules-guidance/notices/26-10",
        last_verified: "2026-07-22",
      },
      {
        title: "FINRA — Frequent Intraday Trading: Understanding the Basics",
        url: "https://www.finra.org/investors/insights/frequent-intraday-trading",
        last_verified: "2026-07-22",
      },
      {
        title: "FINRA — Investing in Fractional Shares",
        url: "https://www.finra.org/investors/insights/investing-fractional-shares",
        last_verified: "2026-07-22",
      },
    ],
    sections: [
      {
        type: "retrieval",
        title: "Name the constraint before the opportunity",
        body: "A ticket can be technically available while the funding, settlement, margin, broker-policy, cost, or suitability boundary remains unknown.",
        prompt:
          "Before judging a setup, list what must be verified for a cash account, a margin account, and a fractional-share order.",
        answer:
          "For cash, verify settled funds and the settlement consequences of the planned sequence. For margin, verify current intraday and house requirements, available equity, deficit handling, and the firm's implementation date. For fractional shares, verify eligible securities, sessions, order types, execution timing, aggregation, and liquidation or transfer limits. In every account, include costs, taxes, resources, experience, and risk tolerance.",
      },
      {
        type: "explanation",
        title: "Treat account rules as current evidence",
        body: "Most equity trades currently settle T+1. Cash-account purchases need sufficient settled funds for the intended sequence; free-riding and good-faith violations can cause restrictions. Margin can lose more than the original deposit, and a firm may impose house requirements above regulatory minimums. FINRA's new intraday margin standards became effective June 4, 2026, while firms may phase in implementation through October 20, 2027. Therefore, an old pattern-day-trader shortcut or another broker's screen is not enough: record the dated rule source and verify the policy currently applied to the specific account.",
      },
      {
        type: "worked_example",
        title: "Separate settled cash from sale proceeds",
        body: "A cash account begins with $800 of settled cash and uses $600 to buy shares. The learner considers selling those fully paid shares the same day, while a second proposed purchase would rely on proceeds from a different sale that have not settled.",
        prompt:
          "Which review is supported without inventing a universal broker rule?",
        answer:
          "The first purchase was funded by the stated settled cash. The second sequence needs a settlement check because it relies on unsettled proceeds. Preserve both funding paths, verify the firm's settled-cash display and restrictions, and do not classify every same-day sale as the same violation.",
        check: {
          kind: "single_choice",
          options: [
            "Treat every same-day sale in any cash account as free-riding",
            "Assume sale proceeds settle immediately whenever the symbol is liquid",
            "Use buying-power wording as proof that every planned sequence is settlement-safe",
            "Separate the fully paid purchase from the unsettled-proceeds sequence and verify the firm's current settled-cash treatment",
          ],
          correctOption: 3,
          success:
            "You traced the source of funds for each transaction and kept the firm-specific settlement check visible.",
          correction:
            "Cash-account analysis follows the funding sequence. Distinguish settled cash from unsettled proceeds and confirm current firm treatment before relying on the displayed amount.",
        },
      },
      {
        type: "practice",
        title: "Verify the margin transition",
        body: "In 2026, one firm's account screen still applies a legacy day-trading control while another describes an intraday margin calculation. Both screens are dated, but neither proves what a third firm currently applies.",
        prompt:
          "What is the defensible planning rule during the implementation window?",
        answer:
          "Use the requirements actually disclosed for the specific account on that date, confirm ambiguous controls with the firm, and preserve the source. Do not assume the old $25,000 pattern-day-trader framework or the new calculation is universally implemented at every firm during the phase-in window.",
        check: {
          kind: "single_choice",
          options: [
            "Verify the dated requirements applied by the specific firm and fail closed when the account treatment is unclear",
            "Use whichever rule allows the larger position because both have existed",
            "Assume every firm switched on June 4, 2026 with identical monitoring and house requirements",
            "Use FINRA's effective date as the sole rule source without confirming the firm's phase-in status",
          ],
          correctOption: 0,
          success:
            "You treated the transition and house requirements as current, account-specific evidence rather than a memorized shortcut.",
          correction:
            "The rule change has an implementation window, and firms can apply their own disclosed controls and house requirements. Verify the account actually being used.",
        },
      },
      {
        type: "practice",
        title: "Price the activity after friction",
        body: "A replay strategy has a small gross expectancy before spread, slippage, commissions, regulatory or exchange fees, market-data costs, borrow costs when applicable, and taxes. Frequent activity also consumes attention.",
        prompt:
          "Write the calculation and suitability questions that must be answered before increasing practice frequency.",
        answer:
          "Recalculate net expectancy after every applicable cost, test worse-but-plausible friction, and keep tax treatment as a question for a qualified professional. Separately ask whether the capital is nonessential, potential loss fits resources and tolerance, the workload is sustainable, and the learner has enough experience to understand the account and execution risks. More trades cannot repair negative net expectancy or poor suitability.",
      },
      {
        type: "transfer",
        title: "Assess fractional execution as a broker feature",
        body: "Two firms both accept dollar-denominated stock orders. One executes eligible fractional orders in real time during defined sessions; another may aggregate customer fractions and supports a different security and order-type list.",
        prompt:
          "Which statement belongs in a transferable fractional-share plan?",
        answer:
          "The plan must verify the selected firm's eligible securities, sessions, order types, timing or aggregation process, pricing implications, and handling of residual fractions. A dollar amount does not prove a universal fractional quantity or execution path.",
        check: {
          kind: "single_choice",
          options: [
            "Use the displayed quote to estimate the fraction and assume immediate execution during any supported session",
            "Verify the firm's eligible symbols, sessions, order types, execution process, and residual-share handling before relying on the order",
            "Fractional policies differ only when transferring an account, not during execution",
            "Displayed fractional buying power proves the fraction is immediately executable in every session",
          ],
          correctOption: 1,
          success:
            "You treated fractional execution as a disclosed firm process with observable constraints.",
          correction:
            "Fractional availability and execution handling vary by firm. Verify the actual security, session, order type, timing, aggregation, and residual-share policy.",
        },
      },
      {
        type: "transfer",
        title: "Run the suitability stop check",
        body: "A learner would need rent money, emergency savings, or borrowed funds to satisfy a deficit or continue frequent trading. Their written process is incomplete and the daily workload is already impairing attention.",
        prompt:
          "What is the responsible educational outcome even if a replay strategy recently looked profitable?",
        answer:
          "Stop before execution. Recent simulated profit does not make essential assets, borrowed funds, insufficient experience, low risk tolerance, or unsustainable attention suitable. Keep learning in bounded replay or paper practice, review the strategy's fit with financial goals, and seek the appropriate broker, investment, or tax professional for account-specific questions.",
      },
      {
        type: "commitment",
        title: "Verify before relying",
        body: "I will record my account type, settled-fund or margin boundary, dated broker policy, expected costs, fractional-share constraints, and suitability stop before treating any setup as executable. Unknown account treatment means pause and verify—not improvise.",
      },
    ],
    mastery_standard: {
      minimum_first_try_correct: 2,
      unseen_cases_required: 5,
      minimum_successful_cases: 4,
      minimum_rubric_level: 2,
      retention_practice_dates: 2,
      remediation:
        "Rebuild one cash, one margin, and one fractional scenario from dated firm evidence, explain the funding or execution path, and retry two changed cases.",
    },
    mastery_criteria: [
      "Correctly distinguishes settled cash, unsettled proceeds, and margin equity in at least four of five new account scenarios",
      "Identifies when the firm's current implementation or house requirement must be verified instead of applying a memorized PDT shortcut",
      "Explains costs, possible tax implications, and suitability without treating simulated profitability as permission",
      "Assesses broker-specific fractional eligibility, sessions, order types, timing, aggregation, and residual-share behavior",
    ],
  },
  {
    lesson_id: "builtin-rm-004",
    version: "4.0.0",
    title: "Set the loss boundary first",
    skill_ids: ["RM-001", "RM-002", "RM-004"],
    objective:
      "Define maximum dollar risk, calculate risk per share with slippage, and round position size down before considering buying power.",
    estimated_minutes: 26,
    sections: [
      {
        type: "retrieval",
        title: "Calculate before reviewing",
        body: "A historical long plan has entry $32.40, structural invalidation at $32.12, maximum risk $28, and estimated adverse slippage of $0.02 per share.",
        prompt:
          "What is total risk per share, maximum whole-share quantity, and planned dollar risk?",
        answer:
          "Technical risk is $0.28. Including $0.02 slippage gives $0.30 per share. Divide $28 by $0.30 and round down to 93 shares. Planned risk is $27.90 before fees or a worse-than-estimated fill.",
        check: {
          kind: "single_choice",
          options: [
            "$0.28 per share, 100 shares, $28.00 planned risk because slippage is assessed only after the fill",
            "$0.30 per share, 94 shares, $28.20 planned risk",
            "$0.30 per share, 93 shares, $27.90 planned risk",
            "$0.02 per share, 1,400 shares, $28.00 planned risk",
          ],
          correctOption: 2,
          success:
            "You included adverse slippage, rounded quantity down, and described the result as planned risk rather than a guaranteed loss.",
          correction:
            "Use |entry − invalidation| + adverse slippage, divide the maximum risk by that amount, and round shares down. A stop and slippage estimate cannot guarantee the realized loss.",
        },
      },
      {
        type: "explanation",
        title: "Risk determines size",
        body: "The stop belongs where the setup premise becomes false. A chosen risk budget must also fit the daily loss limit, current open risk, correlated exposure, account constraints, and the chance of gaps, halts, overnight moves, fees, borrow costs, or liquidity producing a larger realized loss. Position size is the output: planned risk divided by estimated risk per share, rounded down. Moving invalidation merely to obtain a larger position reverses the logic.",
      },
      {
        type: "worked_example",
        title: "Keep every constraint visible",
        body: "Write the chain in order: entry, invalidation, technical distance, slippage allowance, total risk per share, maximum dollar risk, raw quantity, rounded quantity, and planned risk. If the resulting size is zero or impractical, no trade is a valid result.",
      },
      {
        type: "practice",
        title: "Size a changed example",
        body: "Entry is $18.70, invalidation is $18.42, maximum risk is $18, and estimated slippage is $0.03 per share.",
        prompt:
          "Calculate total risk per share, maximum whole-share quantity, and planned risk.",
        answer:
          "Technical risk is $0.28 and total risk is $0.31 per share. $18 divided by $0.31 is about 58.06, so the maximum is 58 shares. Planned risk is $17.98.",
      },
      {
        type: "practice",
        title: "Fit the trade inside total risk",
        body: "The written daily loss limit has $36 remaining. Two correlated open positions already carry $22 of planned risk. A new setup would require $20 of planned risk, before fees.",
        prompt:
          "What is the disciplined decision if the plan prohibits combined planned risk above the remaining daily boundary?",
        answer:
          "The $20 setup does not fit: $22 open risk plus $20 new risk would be $42, above the $36 remaining boundary. Reduce size only if every other constraint still works, wait for risk to close, or take no trade. Do not count unrealized profit as permission unless the written policy explicitly and safely defines it.",
        check: {
          kind: "single_choice",
          options: [
            "Take the full trade because each position is below $36 by itself",
            "Move the stop closer without changing the setup premise",
            "Net the positions mentally because they point in different directions, without a written offset policy",
            "Reduce, wait, or take no trade because combined planned risk would exceed the remaining boundary",
          ],
          correctOption: 3,
          success:
            "You treated risk as a portfolio-and-session constraint, not an isolated ticket calculation.",
          correction:
            "Add current open risk to proposed planned risk and compare the total with the remaining written boundary. Individual position limits do not erase combined exposure.",
        },
      },
      {
        type: "practice",
        title: "Use the workspaces in risk order",
        body: "A replay chart shows an appealing setup, but no invalidation has been named. The Risk Sandbox is open and the Decision Card is still blank.",
        prompt:
          "What is the correct cross-app sequence before a quantity can become evidence?",
        answer:
          "First choose structural invalidation from the paused chart. Then calculate technical distance, slippage allowance, and maximum whole-share quantity in the Risk Sandbox. Finally copy the supported inputs and result into a locked Decision Card. Starting with desired size would reverse the risk logic.",
        check: {
          kind: "single_choice",
          options: [
            "Chart invalidation → Risk Sandbox calculation → locked Decision Card",
            "Desired quantity → move the chart stop → save the larger plan",
            "Decision Card maximum risk → estimate quantity from a typical stop distance → refine invalidation after preview",
            "Backtest profit → raise maximum risk → choose quantity",
          ],
          correctOption: 0,
          success:
            "You preserved the causal order: structure defines distance, risk defines size, and the plan preserves the evidence.",
          correction:
            "Quantity is an output. Establish invalidation from structure, calculate from the written risk boundary, then save the supported decision.",
        },
      },
      {
        type: "transfer",
        title: "Transfer to a short plan",
        body: "A historical short plan uses entry $80.00, invalidation $80.35, $0.05 slippage, and maximum risk $50.",
        prompt:
          "Calculate size without applying the long-side subtraction blindly.",
        answer:
          "Technical risk is $80.35 minus $80.00, or $0.35. Add $0.05 slippage for $0.40 per share. $50 divided by $0.40 permits 125 shares.",
      },
      {
        type: "commitment",
        title: "Accept the size the plan allows",
        body: "I will calculate risk from structural invalidation and a written slippage allowance before opening the ticket. If the permitted quantity feels too small, I will not move the stop or raise the risk limit to manufacture a larger trade.",
      },
    ],
    mastery_standard: {
      minimum_first_try_correct: 2,
      unseen_cases_required: 5,
      minimum_successful_cases: 4,
      minimum_rubric_level: 2,
      retention_practice_dates: 2,
      remediation:
        "Return to Risk Lab for one adverse-fill and one combined-exposure case, explain every input, and retry with changed prices and direction.",
    },
    mastery_criteria: [
      "Defines maximum dollar risk before sizing",
      "Calculates long and short risk per share with slippage",
      "Rounds quantity down and accepts zero or no trade as valid outputs",
      "Distinguishes planned risk from realized loss and checks combined, correlated, and daily exposure",
    ],
  },
  {
    lesson_id: "builtin-vc-001",
    version: "4.0.0",
    title: "Make the setup earn eligibility",
    skill_ids: ["VC-001", "PB-005", "OE-004", "TP-001"],
    objective:
      "Convert excitement on a fast chart into a written eligibility gate using structure, extension, spread, liquidity, and an objective trigger.",
    estimated_minutes: 26,
    sections: [
      {
        type: "retrieval",
        title: "Separate movement from permission",
        body: "A symbol is up more than 40%, candles are large, volume expanded, and price is pulling back after a sharp run.",
        prompt:
          "Which details describe context, and what evidence is still missing before an entry can be planned?",
        answer:
          "The percentage move, candle range, volume, and pullback describe context. Eligibility still requires a named setup, observable trigger, structural invalidation, acceptable spread and liquidity, exit logic, and no-trade conditions.",
      },
      {
        type: "explanation",
        title: "Use an eligibility gate",
        body: "A gate is completed before the ticket opens. Each threshold needs a measurement, source, timestamp, pass/fail rule, and missing-data result. It asks whether the pattern is named, the trigger is visible in advance, the invalidation is structural, the timestamped spread fits the risk distance, recent volume and displayed liquidity can support the planned size, and measured extension has not destroyed the reward-to-risk logic. Unknown required evidence fails closed.",
      },
      {
        type: "worked_example",
        title: "Respect the timestamp of evidence",
        body: "A quote in an order export may be a later snapshot rather than the quote at fill time. Use it as export-time context unless a timestamped recording confirms the execution-time quote. Evidence quality is part of eligibility review, not a footnote.",
        prompt:
          "Can a later bid-ask snapshot prove the exact spread when an earlier order was submitted?",
        answer:
          "No. It can show the quote when the export captured it. The execution-time spread remains unknown unless another timestamped source establishes it.",
        check: {
          kind: "single_choice",
          options: [
            "Yes; any quote in the same export proves the earlier spread",
            "No; label it export-time context and mark execution-time spread unknown",
            "Yes; use the midpoint as the exact fill-time spread",
            "Use the later quote as execution-time evidence when it falls within the same one-minute candle",
          ],
          correctOption: 1,
          success:
            "You preserved useful context without assigning it to a timestamp it cannot prove.",
          correction:
            "A value supports the moment attached to its timestamp. Keep it as context, but do not move it backward in time to fill an evidence gap.",
        },
      },
      {
        type: "practice",
        title: "Build a six-part gate",
        body: "For a paused historical chart, write: setup name, trigger, invalidation, maximum spread, liquidity requirement, and no-trade condition.",
        prompt:
          "What should happen when five fields are complete but the trigger still says 'looks strong'?",
        answer:
          "The setup remains ineligible. Replace the vague phrase with an observable event or record no trade. Visible movement does not waive a missing requirement.",
      },
      {
        type: "transfer",
        title: "Test the gate on a quieter chart",
        body: "Move to a different historical symbol with smaller candles and a tighter spread. Keep the six questions, but recalculate every threshold from the new context instead of copying the prior values.",
        prompt: "Which part stays constant when the symbol changes?",
        answer:
          "The decision workflow stays constant. The trigger, invalidation, spread threshold, liquidity judgment, and size must come from the new evidence.",
        check: {
          kind: "single_choice",
          options: [
            "The exact spread and volume thresholds from the first symbol",
            "The prediction that the same pattern must have the same outcome",
            "The workflow; every price, threshold, and liquidity judgment must be rebuilt",
            "The position size, because risk is independent of price",
          ],
          correctOption: 2,
          success:
            "You transferred the decision method while recalibrating the inputs that belong to the new market context.",
          correction:
            "Transfer the questions, not the old answers. Thresholds and size are measurements from the current symbol and timestamp.",
        },
      },
      {
        type: "practice",
        title: "Carry eligibility from chart to plan",
        body: "Chart Replay supplies a named structure, objective trigger, structural invalidation, and measured spread. Displayed liquidity is unavailable for the decision timestamp, while the written gate requires it.",
        prompt:
          "What should the Decision Card record, and what should the learner do next?",
        answer:
          "Record the supported fields and label liquidity unknown. Because required evidence fails closed, record wait or no trade. Do not convert a missing field into a pass merely because the visible chart looks clean.",
        check: {
          kind: "single_choice",
          options: [
            "Mark liquidity acceptable because the spread is narrow",
            "Remove liquidity from the gate after seeing the trigger",
            "Enter smaller size so missing evidence no longer matters",
            "Record the supported evidence, mark liquidity unknown, and complete a wait or no-trade decision",
          ],
          correctOption: 3,
          success:
            "You let the required unknown fail closed and used the Decision Card to preserve a successful no-trade decision.",
          correction:
            "A required field needs its own timestamped evidence. Another field cannot substitute for it, and smaller size does not turn unknown eligibility into permission.",
        },
      },
      {
        type: "transfer",
        title: "Recalibrate instead of copying thresholds",
        body: "A gate built for a liquid large-cap used a five-cent spread ceiling and a specific relative-volume threshold. A different symbol and session have a wider normal spread and different liquidity behavior.",
        prompt:
          "Which parts of the eligibility method transfer, and which parts must be measured again?",
        answer:
          "Transfer the questions, evidence sources, timestamps, fail-closed rule, and requirement for an objective trigger. Re-measure spread, liquidity, extension, volatility, and time-failure thresholds for the new symbol and session. Reusing the old numbers would imitate a plan rather than transfer the reasoning.",
      },
      {
        type: "commitment",
        title: "Let no trade complete the decision",
        body: "I will finish the eligibility gate before opening a ticket. If a required field fails or remains unknown, I will record no trade as a successful process decision rather than improvising.",
      },
    ],
    mastery_standard: {
      minimum_first_try_correct: 2,
      unseen_cases_required: 6,
      minimum_successful_cases: 5,
      minimum_rubric_level: 2,
      retention_practice_dates: 2,
      remediation:
        "Compare one passing, one borderline, and one failing gate across different volatility conditions; rewrite only the threshold that lacked evidence.",
    },
    mastery_criteria: [
      "Separates volatility context from setup evidence",
      "Writes an observable trigger and structural invalidation",
      "Uses spread, liquidity, extension, and missing evidence as no-trade conditions",
      "Defines every eligibility field with a source, timestamp, threshold, and missing-data rule",
    ],
  },
  {
    lesson_id: "builtin-tp-003",
    version: "4.0.0",
    title: "Write the decision before the ticket",
    skill_ids: ["TP-001", "TP-002", "TP-003", "RM-001"],
    objective:
      "Produce a complete pre-trade decision with a trigger, invalidation, position risk, exit architecture, and cancellation conditions.",
    estimated_minutes: 40,
    session_blocks: [
      {
        title: "Instruction and model",
        minutes: 14,
        focus:
          "Retrieve the plan fields and inspect one complete worked Decision Card.",
      },
      {
        title: "Independent planning",
        minutes: 16,
        focus:
          "Write and lock plans for new paused cases without the worked answer.",
      },
      {
        title: "Review and repair",
        minutes: 10,
        focus:
          "Score the artifacts, repair the weakest field, and schedule a later transfer case.",
      },
    ],
    sections: [
      {
        type: "retrieval",
        title: "Name the plan fields",
        body: "A complete decision exists before exposure begins.",
        prompt:
          "Without looking ahead, list the minimum fields needed to make an entry reviewable later.",
        answer:
          "At minimum: context or setup, objective trigger, structural invalidation, maximum risk, planned quantity, execution method, profit or management logic, time-based failure, and conditions that cancel the idea or prohibit re-entry.",
      },
      {
        type: "explanation",
        title: "Give each field one job",
        body: "The trigger says when evidence permits entry. Invalidation says when the premise is false. Maximum risk limits damage. Exit logic covers strength, weakness, and stagnation. Cancellation conditions keep a valid idea from becoming a late chase after the original opportunity changes.",
      },
      {
        type: "worked_example",
        title: "Build an auditable decision card",
        body: "Historical replay card: named playbook and version; the market regime it was built for; the sample and cost assumptions supporting it; trigger written as an observable event; invalidation tied to structure; quantity calculated from risk; maximum acceptable spread; chosen order behavior and failure response; target or management rule; time stop; and no-trade or re-entry conditions. A plan can be followed perfectly even when the playbook itself lacks evidence, so plan quality and adherence must be reviewed separately.",
      },
      {
        type: "practice",
        title: "Complete execution and exit architecture",
        body: "A Decision Card contains setup, trigger, invalidation, size, and target. It does not state order behavior, response to a partial fill, management during strength or stagnation, or time-based failure.",
        prompt: "Is the card ready to lock? Choose the most complete response.",
        answer:
          "No. Add the intended order behavior and accepted failure mode, partial-or-missing-fill response, exit rules for strength and invalidation, and a time-based failure or reassessment condition. A target alone is not exit architecture.",
        check: {
          kind: "single_choice",
          options: [
            "No; add execution failure response, partial-fill handling, exit rules, and time-based failure before locking",
            "Yes; a target makes every later exit decision objective",
            "Yes; order behavior belongs only in the journal after the trade",
            "No; remove the target and use discretion instead",
          ],
          correctOption: 0,
          success:
            "You required a plan for execution uncertainty and multiple exit conditions, not merely an entry and target.",
          correction:
            "A reviewable plan says how the order can fail and how the position will be managed in strength, weakness, and stagnation before the outcome exists.",
        },
      },
      {
        type: "practice",
        title: "Repair a vague plan",
        body: "Draft: 'Buy the breakout and sell when it turns.'",
        prompt:
          "Rewrite the draft by naming at least six observable decisions that are currently missing.",
        answer:
          "A complete rewrite identifies the exact trigger, structural invalidation, maximum risk, calculated quantity, maximum spread, execution method, profit or management rule, time failure, and cancellation or re-entry conditions. The values must come from a paused historical chart or paper-practice scenario.",
      },
      {
        type: "practice",
        title: "Separate plan quality from adherence",
        body: "A replay decision follows every field in its card, but the card names no playbook version, has no historical sample, ignores spread costs, and was copied from a different market regime.",
        prompt: "How should the review classify this result before seeing P&L?",
        answer:
          "Execution adherence can be strong because the written card was followed. Plan or playbook quality is weak or not yet validated because the method, sample, costs, and regime evidence are missing. One score must not hide the other.",
        check: {
          kind: "single_choice",
          options: [
            "Strong plan quality because every instruction was followed",
            "Strong adherence, but weak or unvalidated plan quality",
            "Weak adherence because the plan later lost money",
            "Both axes are unimportant if the trigger was objective",
          ],
          correctOption: 1,
          success:
            "You kept faithful execution distinct from whether the underlying decision method deserved trust.",
          correction:
            "Adherence asks whether the learner followed the written card. Plan quality asks whether that card and playbook were valid, complete, cost-aware, and suitable for the regime.",
        },
      },
      {
        type: "transfer",
        title: "Respond when context changes",
        body: "After the decision card is written, the spread widens beyond the maximum and price reaches the trigger in one extended candle.",
        prompt:
          "Does the trigger alone keep the trade eligible? Explain the process response.",
        answer:
          "No. The plan is a set of simultaneous constraints. The failed spread and extension conditions cancel eligibility, so the correct response is wait or no trade unless a genuinely new plan is built from later evidence.",
        check: {
          kind: "single_choice",
          options: [
            "Enter because the trigger overrides spread and extension",
            "Double the stop distance so the spread looks smaller",
            "Cancel eligibility; all required constraints must still hold together",
            "Enter half size without recalculating the full plan",
          ],
          correctOption: 2,
          success:
            "You treated the plan as simultaneous constraints and let cancellation complete the decision.",
          correction:
            "A trigger is necessary but not sufficient. A failed required condition cancels the old plan; it does not grant permission to improvise.",
        },
      },
      {
        type: "commitment",
        title: "Plan, read back, then decide",
        body: "I will complete and read back the decision card before opening the order ticket. Missing exit or cancellation logic means the plan is unfinished, not that I should decide faster.",
      },
    ],
    mastery_standard: {
      minimum_first_try_correct: 2,
      unseen_cases_required: 4,
      minimum_successful_cases: 3,
      minimum_rubric_level: 2,
      retention_practice_dates: 2,
      remediation:
        "Use Plan Coach on the lowest-scoring field, repair the locked plan in a separate copy, and test a new paused case without reopening the model.",
    },
    mastery_criteria: [
      "Writes an objective trigger and structural invalidation",
      "Connects maximum risk, quantity, execution, and exit logic",
      "Cancels a planned trade when any required eligibility condition fails",
      "Separates playbook evidence and plan quality from execution adherence",
    ],
  },
  {
    lesson_id: "builtin-oe-006",
    version: "4.0.0",
    title: "Choose the order by its failure mode",
    skill_ids: ["OE-001", "OE-002", "OE-003", "OE-004", "OE-005", "OE-006"],
    objective:
      "Read the complete ticket, estimate execution friction, and choose market, limit, stop, or stop-limit behavior by the uncertainty the plan can accept.",
    estimated_minutes: 29,
    sources: [
      {
        title: "Investor.gov — Types of Orders",
        url: "https://www.investor.gov/introduction-investing/investing-basics/how-stock-markets-work/types-orders",
        last_verified: "2026-07-22",
      },
    ],
    sections: [
      {
        type: "retrieval",
        title: "Match each order to its uncertainty",
        body: "Four risks matter: uncertain execution price, no fill, a stop becoming a market order, and a triggered stop-limit remaining unfilled.",
        prompt:
          "Match those risks to market, limit, stop, and stop-limit orders.",
        answer:
          "Market prioritizes execution but the final price is not guaranteed. Limit sets a price boundary but may not fill. A stop becomes a market order after triggering, so the execution price remains uncertain. A stop-limit becomes a limit order and can remain unfilled after triggering.",
        check: {
          kind: "single_choice",
          options: [
            "Market: price boundary; limit: execution priority; stop: no trigger risk; stop-limit: market-price uncertainty after trigger",
            "Market: price uncertainty; limit: no fill; stop: fixed execution at the trigger; stop-limit: market execution after trigger",
            "Market: price uncertainty; limit: partial-fill risk only; stop: market-price uncertainty after trigger; stop-limit: guaranteed exit once triggered",
            "Market: price uncertainty; limit: no fill; stop: market-price uncertainty after trigger; stop-limit: can remain unfilled",
          ],
          correctOption: 3,
          success:
            "You matched each order to the consequence the plan must be able to tolerate.",
          correction:
            "Separate execution priority from price control. Triggering does not make a stop price a guaranteed execution price, and a limit boundary can leave an order unfilled.",
        },
      },
      {
        type: "explanation",
        title: "Read number and unit together",
        body: "An Amount of 10 can mean $10 or 10 shares. A dollar buy may create a fractional-share position, while the closing sell uses shares. Read action, symbol, unit, amount, order type, time in force, session eligibility, account, and current position as one instruction. Broker labels, routing rules, extended-hours behavior, odd-lot handling, and available order types can differ; confirm the current ticket and broker documentation rather than assuming another platform behaves identically.",
      },
      {
        type: "worked_example",
        title: "Price the visible spread",
        body: "A quote shows $38.02 bid and $38.35 ask. The visible spread is $0.33, about 0.86% of the midpoint. An immediate market round trip can lose approximately the spread before further slippage or fees, although displayed quotes and size can change before execution.",
        prompt:
          "Why must a $0.33 spread be compared with the stop distance rather than viewed alone?",
        answer:
          "The spread's significance depends on the planned risk. If invalidation is only $0.25 away, visible crossing friction already exceeds the technical distance and can consume the risk budget before the thesis is tested.",
      },
      {
        type: "practice",
        title: "Use the four-door decision",
        body: "For a historical quote, write one condition that could support each option: market, limit, wait, and no trade. Include urgency, maximum acceptable price, fill uncertainty, spread, and the consequence of no fill.",
        prompt:
          "Which option is automatically correct whenever price is moving quickly?",
        answer:
          "None. Speed alone does not choose the order. The plan, liquidity, spread, price tolerance, urgency, and consequence of remaining unfilled determine which options remain acceptable.",
      },
      {
        type: "practice",
        title: "Plan for partial or missing fills",
        body: "A limit entry fills only part of the requested quantity and price moves away.",
        prompt: "What should have been written before submission?",
        answer:
          "The plan should state whether partial fills are acceptable, how risk is recalculated, how long the order remains valid, whether the remainder is canceled, and that chasing the unfilled quantity is not automatic.",
      },
      {
        type: "transfer",
        title: "Transfer to protective orders",
        body: "A fast move reaches a sell-stop trigger while the next available bids are lower. A stop-limit at a higher boundary might not fill at all.",
        prompt:
          "Explain the distinct failure mode of each order without calling either universally safer.",
        answer:
          "The stop can execute at a worse price because it becomes a market order. The stop-limit can preserve its price boundary but leave the position open. The plan must decide which consequence it can tolerate.",
        check: {
          kind: "single_choice",
          options: [
            "Stop: possible worse execution; stop-limit: possible unfilled exposure after triggering",
            "Stop: possible worse execution only outside regular hours; stop-limit: guaranteed fill once triggered",
            "Stop and stop-limit both become market orders after triggering; the limit changes only the displayed estimate",
            "Stop-limit preserves a price boundary and therefore removes the exposure if price gaps through it",
          ],
          correctOption: 0,
          success:
            "You described both tradeoffs without presenting either order as universally safer.",
          correction:
            "A stop gives up price certainty for execution priority after triggering. A stop-limit preserves a boundary but may leave the risk open.",
        },
      },
      {
        type: "practice",
        title: "Audit a partial fill across the app",
        body: "A locked Decision Card permits 80 shares with a limit entry and says partial fills are acceptable only while total planned risk remains within the boundary. The Journal later imports a 35-share fill; Chart Replay shows price moving away before the remainder fills.",
        prompt: "Which review is supported without rewriting the plan?",
        answer:
          "Record the 35 executed shares, keep the remaining 45 unfilled, recalculate risk for the actual position, and compare the cancellation timing with the locked partial-fill rule. Do not record 80 shares, chase the remainder, or edit the original card.",
        check: {
          kind: "single_choice",
          options: [
            "Record all 80 because the plan authorized that maximum",
            "Record 35 filled and 45 unfilled, recalculate actual risk, and compare cancellation with the locked rule",
            "Edit the locked plan to 35 so adherence becomes perfect",
            "Use the later chart move as proof that the remainder should have been chased",
          ],
          correctOption: 1,
          success:
            "You preserved the original plan, actual execution, and later chart context as separate evidence.",
          correction:
            "Planned maximum, executed quantity, and later market movement are different facts. Preserve each and review the prewritten partial-fill response.",
        },
      },
      {
        type: "commitment",
        title: "Perform the seven-field readback",
        body: "Before previewing any simulated ticket, I will say: account, action, symbol, unit, amount, order type, and maximum acceptable consequence. If I cannot explain the failure mode, I will wait.",
      },
    ],
    mastery_standard: {
      minimum_first_try_correct: 2,
      unseen_cases_required: 6,
      minimum_successful_cases: 5,
      minimum_rubric_level: 2,
      retention_practice_dates: 2,
      remediation:
        "Rehearse the failure mode that scored lowest, including a partial-fill response and the broker's current fractional/session behavior, then retry a changed-liquidity case.",
    },
    mastery_criteria: [
      "Distinguishes dollar amounts, share quantities, and executed fractional shares",
      "Calculates visible spread and relates it to planned risk",
      "Explains the price and fill uncertainty of market, limit, stop, and stop-limit orders",
      "Plans for partial fills, no fills, and no trade",
      "Checks broker-specific ticket, session, routing, and time-in-force behavior before relying on an order",
    ],
  },
  {
    lesson_id: "builtin-pb-006",
    version: "4.0.0",
    title: "Make the next decision independent",
    skill_ids: ["PB-005", "PB-006", "TF-009", "TP-001"],
    objective:
      "Use an evidence reset between rapid attempts so each new decision has its own trigger, invalidation, and reason to exist.",
    estimated_minutes: 24,
    sections: [
      {
        type: "retrieval",
        title: "State facts without diagnosing motive",
        body: "Seven completed round trips occur in one symbol over roughly 33 minutes, and most positions are held for less than two minutes.",
        prompt: "What does this prove, and what can it only suggest?",
        answer:
          "It proves repeated decisions and short holding intervals. It can prompt questions about planning time or outcome-driven re-entry, but it does not prove emotion, intent, setup quality, or rule violations without contemporaneous evidence.",
      },
      {
        type: "explanation",
        title: "Recognize decision compression",
        body: "After an exit, attention can remain anchored to the prior fill, missed move, or result. Observe, plan, execute, and review can collapse into one urgent loop. A reset restores the missing evidence steps; it is not a punishment or a timer designed to create pressure.",
      },
      {
        type: "worked_example",
        title: "Use the 90-second evidence reset",
        body: "Close the ticket. Record why the prior trade ended and update realized, open, and remaining daily risk. Name current emotion and physical activation without treating either as proof of motive. Label the result without judging it. Reassess current structure, spread, and eligibility from evidence independent of the last outcome. Write what materially changed. Then create a new trigger, invalidation, exit, and risk calculation—or stop for the session.",
      },
      {
        type: "practice",
        title: "Score re-entry independence",
        body: "Give one point each for a new trigger, new invalidation, new exit plan, new context evidence, and a stated reason the prior attempt ended.",
        prompt:
          "A proposed re-entry has four points but no new trigger. Is it independent?",
        answer:
          "No. All five elements are required in this practice. Without a new observable trigger, the next order may be a continuation of urgency rather than a new reviewable decision.",
        check: {
          kind: "single_choice",
          options: [
            "Yes; four of five points is close enough after a quick exit",
            "Yes; the previous trigger remains valid until the session ends",
            "No; a new observable trigger is mandatory for an independent decision",
            "No; require a fixed 15-minute pause even when the written reset rule specifies different evidence",
          ],
          correctOption: 2,
          success:
            "You required new evidence without turning the reset into a blanket ban on re-entry.",
          correction:
            "Independence is not a majority vote. The next decision needs a new observable trigger as well as current context, risk, invalidation, and exit logic.",
        },
      },
      {
        type: "transfer",
        title: "Reset after a profitable outcome",
        body: "The previous trade followed the plan and made money. Confidence and urgency rise as the symbol moves again.",
        prompt: "Why does the same reset still apply?",
        answer:
          "Profit can compress decisions through overconfidence or fear of missing another move. Process rules remain independent of outcome, so the next attempt must earn its own evidence.",
        check: {
          kind: "single_choice",
          options: [
            "A win proves the setup works, so the reset can be skipped once",
            "Only losses affect decision quality",
            "The reset is used to wait for the same trigger to return, not to reassess risk",
            "A win can also compress judgment; the next decision must earn independent evidence",
          ],
          correctOption: 3,
          success:
            "You kept the reset outcome-neutral and focused on the quality of the next decision.",
          correction:
            "Both wins and losses can anchor attention. The reset exists to rebuild evidence, eligibility, risk, and a plan independently of the prior outcome.",
        },
      },
      {
        type: "transfer",
        title: "Know when reset becomes stop-work",
        body: "After an exit, the Evidence Journal shows the daily loss boundary has been reached and the learner reports high activation and declining focus. A new chart timestamp later presents a valid-looking setup.",
        prompt:
          "Should the learner complete another reset and plan because the new setup appears eligible?",
        answer:
          "No. The written daily boundary has already ended execution practice. Record the state and stop-work decision, then use the Learning Lab or review tools only if calm study remains appropriate. A new chart cannot override a session guardrail.",
        check: {
          kind: "single_choice",
          options: [
            "Stop execution practice, record the boundary decision, and use only calm study or review if appropriate",
            "Reset and enter because a new trigger makes the daily boundary irrelevant",
            "Raise the loss boundary because the next setup is higher quality",
            "Paper trade repeatedly until confidence returns",
          ],
          correctOption: 0,
          success:
            "You distinguished an independence reset from a stop-work boundary and kept learning available without requiring another trade.",
          correction:
            "A reset rebuilds a decision only while the session remains eligible. A reached stop-work boundary ends execution practice regardless of the next chart.",
        },
      },
      {
        type: "practice",
        title: "Name the evidence that is genuinely new",
        body: "A replay exit is followed by another apparent trigger three bars later. Price is near the prior entry, but structure, spread, remaining risk, and attention may have changed.",
        prompt:
          "Write the minimum fresh evidence the second decision needs before it can be called independent.",
        answer:
          "Record the new decision timestamp, current structure and trigger, current invalidation, current spread and eligibility, remaining session risk, and a brief attention or activation check. If the only reason is that price returned or the prior trade won or lost, the second decision has not earned independence.",
      },
      {
        type: "commitment",
        title: "Close the ticket between decisions",
        body: "After every replay or paper-practice exit, I will close the ticket and complete the five-point independence check. I do not earn learning credit for speed or another trade; I earn it for a complete decision, including the choice to stop.",
      },
    ],
    mastery_standard: {
      minimum_first_try_correct: 2,
      unseen_cases_required: 5,
      minimum_successful_cases: 4,
      minimum_rubric_level: 2,
      retention_practice_dates: 2,
      remediation:
        "Run the five-point reset after a win, loss, and missed move; identify the first observable field that remained outcome-dependent and repeat later.",
    },
    mastery_criteria: [
      "Separates observed frequency from inferred motive",
      "Completes the five-point independence reset",
      "Applies the same reset after wins, losses, and missed trades",
      "Checks emotion, physiology, and remaining daily risk without using them as invented explanations",
    ],
  },
  {
    lesson_id: "builtin-tf-009",
    version: "4.0.0",
    title: "Score process and preserve uncertainty",
    skill_ids: ["TF-009", "TR-001", "TR-002"],
    objective:
      "Review a trade on separate process and outcome axes, adjust confidence for missing evidence, and choose one testable correction.",
    estimated_minutes: 26,
    sections: [
      {
        type: "retrieval",
        title: "Judge before the result persuades you",
        body: "Trade A followed its written plan and lost 1R. Trade B doubled the planned size, ignored invalidation, and happened to make 2R.",
        prompt: "Classify each trade on the process axis and the outcome axis.",
        answer:
          "Trade A can be strong process with a losing outcome. Trade B is weak process with a profitable outcome. Profit does not repair a rule violation, and loss does not prove a planned decision was poor.",
        check: {
          kind: "single_choice",
          options: [
            "A: weak process/loss; B: strong process/profit",
            "A: strong process/loss; B: weak process/profit",
            "A and B are both strong because each produced a measurable outcome",
            "Neither can be classified because P&L and process are the same axis",
          ],
          correctOption: 1,
          success:
            "You prevented outcome bias from rewriting decision quality.",
          correction:
            "Grade adherence and decision quality from contemporaneous evidence. Record P&L separately; it does not repair or invalidate the process by itself.",
        },
      },
      {
        type: "explanation",
        title: "Score evidence quality first",
        body: "A review cannot confidently score an unrecorded trigger or stop. Mark the data complete, partial, or not scorable before evaluating process. This prevents a later chart from supplying a plan that did not exist in the record.",
      },
      {
        type: "worked_example",
        title: "Use one neutral review card",
        body: "Record seven separate dimensions: evidence completeness, playbook validity, plan quality, risk compliance, execution adherence, outcome, and review completeness. Then record the strongest decision, primary correction, and evidence for each judgment. Across a meaningful sample, add win rate, average win and loss, expectancy after costs, drawdown, regime, and rule-adherence rates; do not promote a strategy from one memorable trade.",
      },
      {
        type: "practice",
        title: "Replace a trait judgment",
        body: "Draft correction: 'I am bad at exits.'",
        prompt:
          "Rewrite it as one small behavior that can be verified next time.",
        answer:
          "Example: 'Before the next replay entry, I will write one structural exit and one time-based exit, then compare the simulated exit with those rules.' This is specific, observable, and not a judgment about identity.",
      },
      {
        type: "practice",
        title: "Keep a small sample uncertain",
        body: "A playbook has three reviewed trades: two wins and one loss. The sample excludes fees, slippage, and market regime, and all examples were selected after the outcomes were known.",
        prompt: "What conclusion is supported?",
        answer:
          "The three records can generate a hypothesis and reveal process questions, but they do not validate the playbook. Costs, selection bias, regime, and sample size remain unresolved; gather pre-specified, out-of-sample evidence before increasing confidence.",
        check: {
          kind: "single_choice",
          options: [
            "Declare the playbook validated because its observed win rate is above 50%",
            "Discard the losing trade because it weakens the result",
            "Treat it as a hypothesis and gather pre-specified, cost-aware, out-of-sample evidence",
            "Increase risk to collect a larger sample faster",
          ],
          correctOption: 2,
          success:
            "You resisted small-sample certainty and chose better evidence rather than more risk.",
          correction:
            "Three outcome-selected examples without costs or regime controls can generate questions, not validate an edge. Define the test before seeing outcomes.",
        },
      },
      {
        type: "transfer",
        title: "Review an unscorable win",
        body: "A trade made money, but no trigger, invalidation, or pre-trade plan was captured.",
        prompt:
          "How should the reviewer classify it without either celebrating or condemning the process?",
        answer:
          "Record the profitable outcome and mark key process dimensions not scorable because the evidence is missing. The next correction is better pre-trade evidence capture, not a claim that the undocumented process was strong or weak.",
      },
      {
        type: "practice",
        title: "Route the correction to the smallest useful tool",
        body: "A journal review finds that position sizing was correct, but the trigger remained vague and was repeatedly rewritten after later candles appeared.",
        prompt:
          "Which next practice targets the primary gap without rewarding more trading?",
        answer:
          "Use the Plan Coach to repair the trigger language, then test one locked trigger on outcome-hidden Chart Replay. Risk Sandbox practice is not the priority because sizing already held, and another live or paper trade is unnecessary.",
        check: {
          kind: "single_choice",
          options: [
            "Repeat the Risk Sandbox because every correction should begin with sizing",
            "Place more paper trades until one trigger produces a profit",
            "Edit the old plan after replay so it matches the later candles",
            "Repair the trigger in Plan Coach, then test one locked version in outcome-hidden Chart Replay",
          ],
          correctOption: 3,
          success:
            "You routed the documented weakness to focused plan and transfer practice instead of adding trade volume.",
          correction:
            "Choose the smallest tool that trains the failed dimension, then test it without outcome leakage. Do not practice a skill that already held or use more trades as the default remedy.",
        },
      },
      {
        type: "commitment",
        title: "Close the learning loop",
        body: "I will not count a practice decision as reviewed until I have reconstructed the facts, scored evidence quality, separated process from outcome, and written one testable correction.",
      },
    ],
    mastery_standard: {
      minimum_first_try_correct: 2,
      unseen_cases_required: 5,
      minimum_successful_cases: 4,
      minimum_rubric_level: 2,
      retention_practice_dates: 2,
      remediation:
        "Re-score one winner and one loser with the seven-axis rubric, mark unsupported dimensions not scorable, and test the correction on a later case.",
    },
    mastery_criteria: [
      "Classifies process independently from profit or loss",
      "Uses not scorable when the evidence does not support a judgment",
      "Writes one neutral, specific, and testable correction",
      "Separates seven review dimensions and treats small samples as hypotheses rather than proof",
    ],
  },
  {
    lesson_id: "builtin-capstone-001",
    version: "4.0.0",
    title: "Run the complete no-click replay",
    skill_ids: [
      "TR-001",
      "RM-001",
      "VC-001",
      "TP-001",
      "TP-002",
      "TP-003",
      "OE-004",
      "PB-006",
    ],
    objective:
      "Integrate evidence, risk, eligibility, planning, execution, reset, and review on historical recordings without placing an order.",
    estimated_minutes: 48,
    curriculum_role: "assessment",
    session_blocks: [
      {
        title: "Instruction calibration",
        minutes: 12,
        focus:
          "Retrieve the workflow and compare one model without counting it as assessment evidence.",
      },
      {
        title: "Independent performance",
        minutes: 24,
        focus:
          "Complete six outcome-hidden cases with locked plans and at least two eligible wait or no-trade decisions.",
      },
      {
        title: "Review and remediation",
        minutes: 12,
        focus:
          "Score all four rubric dimensions, route the weakest one, and preserve the original artifacts.",
      },
    ],
    sections: [
      {
        type: "retrieval",
        title: "Recall the full decision chain",
        assessment_phase: "instruction",
        body: "Pause a historical recording before the next candle completes.",
        prompt:
          "List the decisions that must be written before playback resumes.",
        answer:
          "Record the evidence and unknowns, setup or no-setup decision, eligibility gate, trigger, invalidation, maximum risk, position size, spread or liquidity concern, order behavior and failure response, exit logic, time failure, and no-trade conditions.",
      },
      {
        type: "explanation",
        title: "Remove the click, preserve the skill",
        assessment_phase: "instruction",
        body: "No-click replay isolates observation, planning, and review from execution stimulation. The goal is not perfect prediction. The goal is a complete decision that can be audited against the information available at that moment.",
      },
      {
        type: "worked_example",
        title: "Pause, plan, reveal, review",
        assessment_phase: "instruction",
        body: "Pause at a decision point selected without knowing the later outcome. Write the plan without seeing later candles. Commit to enter, wait, or no trade. Lock the response, then resume for a fixed interval. Compare later evidence with the untouched plan. Score evidence, playbook quality, plan quality, risk, adherence, and outcome separately. Preserve every unknown and route any failed dimension to a specific remedial lesson.",
      },
      {
        type: "practice",
        title: "Prevent outcome leakage",
        assessment_phase: "independent_performance",
        body: "A learner picks only timestamps that produced large later moves and edits the trigger after revealing the next candles. The final plans look accurate.",
        prompt:
          "What must change before these cases can count as assessment evidence?",
        answer:
          "Select cases without knowing the outcome, lock the pre-reveal response and timestamp, keep the reveal window fixed, and preserve the original answer. Accuracy after editing is hindsight, not transfer evidence.",
        check: {
          kind: "single_choice",
          options: [
            "Hide outcomes during case selection, lock the response, fix the reveal window, and preserve the original",
            "Keep the cases because accurate plans are sufficient regardless of when they were written",
            "Reveal more candles so the correct trigger becomes clearer",
            "Remove every no-trade case so the assessment contains enough action",
          ],
          correctOption: 0,
          success:
            "You protected the assessment from hindsight and selection bias.",
          correction:
            "Assessment evidence must be produced before the outcome is visible and remain unchanged afterward. Otherwise it measures editing, not decision skill.",
        },
      },
      {
        type: "practice",
        title: "Complete a six-case assessment pass",
        assessment_phase: "independent_performance",
        body: "Use six outcome-hidden timestamps from authorized recordings or chart replay: different volatility, direction, liquidity, and time-of-day conditions. At least two decisions must remain eligible to be wait or no trade. Save the timestamp, evidence lanes, complete plan, locked reveal window, seven-axis process review, and remediation choice for each. Repeat this lesson across four spaced passes to build a 24-case evidence set instead of relying on one short session.",
        prompt: "What determines success in this capstone?",
        answer:
          "Success is complete pre-reveal reasoning, honest uncertainty, fixed risk and eligibility rules, an explicit no-trade option, and a neutral review. Prediction accuracy, P&L, and number of simulated trades do not determine mastery.",
      },
      {
        type: "transfer",
        title: "Change the context",
        assessment_phase: "independent_performance",
        body: "Repeat one decision on a different symbol or a later session. Keep the workflow unchanged while recalculating trigger, invalidation, spread, liquidity, and size from the new evidence.",
        prompt: "What should transfer, and what must be rebuilt?",
        answer:
          "The evidence-to-review workflow transfers. Market context, thresholds, prices, and the resulting decision must be rebuilt from the new historical moment.",
        check: {
          kind: "single_choice",
          options: [
            "Transfer the exact entry, stop distance, and size to preserve consistency",
            "Transfer the workflow; rebuild every context-dependent threshold and decision",
            "Transfer the expected outcome and change only the symbol",
            "Rebuild the workflow from scratch so no principle stays constant",
          ],
          correctOption: 1,
          success:
            "You transferred the invariant decision process while reconstructing every market-dependent input.",
          correction:
            "The sequence of evidence, risk, eligibility, planning, and review is stable. Prices, thresholds, liquidity, regime, and the resulting decision belong to the new case.",
        },
      },
      {
        type: "practice",
        title: "Close the four-workspace evidence chain",
        assessment_phase: "review",
        body: "A capstone pass begins with Recall Deck retrieval, uses Chart Replay to lock an unseen timestamp, saves the decision in the Decision Card, and closes in the Evidence Journal. The chart outcome is profitable, but the journal finds a missing cancellation rule.",
        prompt: "What counts as success, and what should happen next?",
        answer:
          "Success is the preserved pre-reveal chain and honest identification of the missing rule, not the profitable outcome. Route the cancellation-rule gap to Plan Coach or the decision-planning lesson, repair it, and test a later unseen case without editing the original plan.",
        check: {
          kind: "single_choice",
          options: [
            "Award provisional mastery because six of seven process dimensions passed despite the missing cancellation rule",
            "Edit the locked card so the missing cancellation rule appears present",
            "Preserve the chain, record the gap, route it to planning practice, and retest on a later unseen case",
            "Retest the same revealed chart until the cancellation response becomes consistent",
          ],
          correctOption: 2,
          success:
            "You used all four workspaces as one audit trail and let the weakest process dimension choose the next lesson.",
          correction:
            "The cross-app chain exists to preserve timing and expose gaps. Outcome does not erase a missing rule, and locked evidence must remain unchanged.",
        },
      },
      {
        type: "commitment",
        title: "Train judgment before speed",
        assessment_phase: "review",
        body: "I will complete three high-quality no-click decisions and their reviews before adding execution practice. A correct decision to wait, stop, or take no trade completes the exercise fully.",
      },
    ],
    mastery_standard: {
      minimum_first_try_correct: 2,
      unseen_cases_required: 6,
      minimum_successful_cases: 5,
      minimum_rubric_level: 2,
      retention_practice_dates: 4,
      remediation:
        "Route the lowest rubric dimension to its specific core lesson, complete one bounded repair, and retry a later outcome-hidden case without editing the original.",
    },
    mastery_criteria: [
      "Completes the full decision chain before revealing later price action",
      "Includes at least one evidence-based wait or no-trade decision",
      "Transfers the workflow to a changed context without copying thresholds",
      "Reviews process without using simulated outcome as the grade",
      "Builds at least 24 outcome-hidden, varied cases across four spaced passes with remediation for weak dimensions",
    ],
  },
];
