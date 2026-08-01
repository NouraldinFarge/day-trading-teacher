# Core curriculum v3: lesson-by-lesson critique and response

This review maps the supplied curriculum audit and evidence-based learning-system research to the eight built-in lessons. The course remains a decision-quality foundation, not a claim that completing lessons alone establishes a profitable trading edge.

## Course-level findings

The existing sequence was strong: evidence → risk → eligibility → plan → execution → reset → review → integration. It treated no-trade decisions as valid, resisted hindsight, kept process separate from outcome, and did not depend on AI or live signals.

The central weakness was that completion measured participation. A learner could type anything, reveal the guide, and finish. Version 3 adds an error-correction loop: retrieval, model, attempt, specific feedback, correction, retry, transfer, and later spaced retrieval. Objective checks must be corrected before advancing. Open responses require the learner to compare the constraint in their reasoning with the guide and write a repair when a gap is found. Only compact mastery evidence is stored locally; private free-text answers are not retained.

The course also now distinguishes planned risk from realized loss; plan quality from plan adherence; hypothesis generation from strategy validation; and a useful source from evidence that actually belongs to the decision timestamp.

## 1. Reconstruct before you judge

**What worked:** Strong evidence lanes, honest unknowns, chronological reconstruction, and refusal to turn a cancellation into a fill.

**What was missing:** The examples were too clean. They did not test weighted-average price, multiple partial fills, replacements, fees, reversals, or conflicting timestamps.

**Version 3 response:** The worked case now requires weighted-average entry from partial fills. The method explicitly preserves cancellations, replacements, scale-outs, fees, direction changes, and source conflicts. Two objective checks test position arithmetic and unmatched-order reconciliation.

**Remaining boundary:** A future replay dataset should provide messy broker exports so chronology can be graded from real rows rather than prose alone.

## 2. Set the loss boundary first

**What worked:** Correct long/short risk-per-share arithmetic, slippage allowance, round-down sizing, and acceptance of zero size.

**What was missing:** The lesson treated the per-trade maximum as given and could imply the planned stop caps realized loss. It did not integrate daily limits, correlated/open risk, gaps, halts, overnight exposure, fees, or borrow costs.

**Version 3 response:** Language now says “planned risk,” explicitly warns that realized loss can be larger, and places position risk inside combined and remaining daily exposure. A new objective scenario requires reducing, waiting, or taking no trade when proposed plus open risk exceeds the boundary.

**Remaining boundary:** Account-specific margin, settlement, short-sale, and broker rules change; the app should link to currently verified broker/regulator material rather than hard-code volatile requirements.

## 3. Make the setup earn eligibility

**What worked:** Clear separation of volatility from permission and strong use of unknown/missing evidence as a no-trade condition.

**What was missing:** “Liquidity,” “extension,” and “acceptable spread” were conceptually correct but not operational enough to score consistently.

**Version 3 response:** Every gate field now requires a measurement, source, timestamp, threshold, pass/fail rule, and missing-data result. Objective checks test timestamp integrity and transfer of the workflow without copying thresholds.

**Remaining boundary:** Future chart-linked exercises should capture spread, recent volume, relative extension, and planned size automatically at the replay cursor.

## 4. Write the decision before the ticket

**What worked:** A strong auditable decision card with trigger, invalidation, risk, execution, exits, and cancellation.

**What was missing:** A complete card could still sit on an unvalidated playbook. The lesson did not separate following a plan from whether the plan deserved confidence.

**Version 3 response:** The card now names a playbook version, regime, historical sample, and cost assumptions. A dedicated check requires “strong adherence but weak/unvalidated plan quality” when a learner follows a poorly supported card. A second check enforces simultaneous eligibility constraints.

**Remaining boundary:** A future strategy-validation module should teach pre-specified hypotheses, samples, costs, out-of-sample tests, walk-forward analysis, bias, overfitting, regime stability, and adverse excursion.

## 5. Choose the order by its failure mode

**What worked:** Excellent framing of market, limit, stop, and stop-limit orders by uncertainty rather than a universal ranking. Spread was tied to risk distance.

**What was missing:** Market microstructure and broker-specific semantics were too shallow.

**Version 3 response:** Objective checks test order failure modes. The lesson now calls out time in force, session eligibility, routing, odd lots, displayed liquidity, and platform differences, while directing the learner to verify the current ticket and broker documentation.

**Remaining boundary:** A future simulator should present ambiguous partial-fill, gap-through, thin-book, and extended-hours cases with realistic choices and consequences.

## 6. Make the next decision independent

**What worked:** Outcome-neutral reset, five-point independence test, and a refusal to reward more trades or speed.

**What was missing:** Reset quality was not connected to remaining daily risk or the learner’s emotional and physiological state, and the app did not objectively confirm independence.

**Version 3 response:** The reset now updates realized, open, and remaining risk; names emotion/activation without inventing motive; requires independent context; and permits stopping the session. Objective checks cover a missing new trigger and post-win decision compression.

**Remaining boundary:** The journal can later compare reset records with subsequent rule adherence without making causal claims about emotion.

## 7. Score process and preserve uncertainty

**What worked:** Strong separation of process and outcome, “not scorable” for missing evidence, and behavior-level corrections rather than identity judgments.

**What was missing:** The review collapsed too many dimensions and stopped at one trade. It did not teach aggregate expectancy or sample limitations.

**Version 3 response:** Reviews now separate evidence completeness, playbook validity, plan quality, risk compliance, execution adherence, outcome, and review completeness. A new small-sample case requires treating three selected trades as a hypothesis and gathering pre-specified, cost-aware, out-of-sample evidence.

**Remaining boundary:** The journal analytics should expose sample size and cost assumptions beside aggregate metrics, with warnings when comparisons are too sparse.

## 8. Run the complete no-click replay

**What worked:** Excellent integration, locked pre-reveal reasoning, a valid no-trade outcome, and process rather than prediction as the grade.

**What was missing:** Three self-selected cases were too few, easy to cherry-pick, and not sufficient for transfer or stable scoring.

**Version 3 response:** One pass now contains six varied, outcome-hidden cases. Four spaced passes build at least 24 cases. Responses must be locked before a fixed reveal window, original answers remain visible, review axes stay separate, and weak dimensions route to remediation. Objective checks test outcome leakage and transfer to a changed context.

**Remaining boundary:** The chart replay should eventually draw randomized cases from a tagged bank and score decision records with a documented rubric.

## Progress and privacy model

The app stores lesson version, pass count, latest practice time, objective-check count, first-try correctness, completed corrections, and best first-try percentage. It does not retain lesson free-text responses. This supports spacing and longitudinal progress without silently building a sensitive narrative archive. Completion is labeled as a deliberate pass, not permanent mastery.

## Next curriculum layer

The highest-value additions after this core path are: strategy and edge validation; drawdown, risk-of-ruin, and correlated-exposure reasoning; deeper market mechanics; and chart-linked randomized assessment. These should be separate modules rather than overloading the decision-foundation lessons.
