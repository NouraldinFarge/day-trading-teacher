# Achievement-guided lesson critique

This audit applies the supplied achievement-system research to the eight built-in lessons. It complements `curriculum-v3-lesson-critique.md`, which critiques lesson content and pedagogy. This document focuses on meaning, legibility, challenge, fairness, reliability, and the learner experience across repeated practice.

## Overall verdict

The curriculum already has a coherent decision chain and an unusually responsible definition of success: reconstruct evidence, establish risk, test eligibility, write the plan, choose execution, reset independently, review without hindsight, and integrate the process. The lesson player also requires attempts before feedback, correction of objective checks, comparison of open responses, written repair of identified gaps, and confidence reflection.

The largest remaining weakness was recognition. Generic completion XP described attendance, not what the learner had actually become more capable of doing. The journal achievement vault was extensive, while the lesson path had no durable, lesson-specific record. A learner could not see how one pass related to later mastery or what a return visit would accomplish.

The revised model treats achievements as **evidence labels**, not prizes:

- Every core lesson has one evocatively named mastery artifact and one literal criterion.
- Lessons 1–7 require deliberate passes on two different local calendar dates.
- The capstone requires four different dates, producing at least 24 outcome-hidden cases under its six-case design.
- Repeating a lesson on one day counts once toward spacing; rest days never remove progress.
- Corrections are cumulative so honest error repair remains recognizable after later clean passes.
- Progress is stored locally and unlock processing remains idempotent through persistent achievement timestamps.
- No lesson achievement uses P&L, trade frequency, position size, buying power, lesson speed, a continuous streak, or live market participation.

This supports competence by showing evidence, autonomy by keeping all lessons available, and psychological safety by making uncertainty and correction legitimate forms of progress.

## Lesson-by-lesson critique and recognition map

### 1. Reconstruct before you judge

**Learning experience:** The lesson begins with source limits, then moves through evidence lanes, weighted partial fills, timeline construction, unmatched orders, and audit-trail commitment. This is the right first lesson because it teaches the learner not to build later analysis on invented facts.

**Prior UX gap:** One completion did not show whether the learner could reconstruct a different messy record later. Generic XP also failed to name the central competence: preserving the boundary between evidence and story.

**Implemented response:** The briefing and learning-path card now expose the **Evidence Cartographer** artifact. It recognizes two separated deliberate passes, not a fast completion. The exact `0/2`, `1/2`, or `2/2` date count is visible before starting and after finishing.

**Why the artifact is meaningful:** It interprets the behavior rather than merely restating “complete lesson twice.” The literal requirement remains visible, while the title makes the record memorable.

**Best future enhancement:** Connect the lesson to a graded, messy Fidelity export exercise with partial fills, cancellations, replacements, and conflicting timestamps.

### 2. Set the loss boundary first

**Learning experience:** The sequence correctly makes risk the input and quantity the output. It adds slippage, rounds down, integrates current open risk and the daily boundary, transfers to a short case, and permits zero size or no trade.

**Prior UX gap:** Risk arithmetic can feel like a one-time calculator task. A single correct example does not establish that the learner will preserve the hierarchy when prices, direction, or portfolio exposure changes.

**Implemented response:** The **Boundary Architect** artifact requires two separated passes. Its purpose text explicitly names the hierarchy—size beneath invalidation and total exposure—so the learner knows what the achievement claims and what it does not.

**Why the artifact is meaningful:** It rewards returning to the constraint system. It never rewards larger size, capital use, or actual trades.

**Best future enhancement:** Add generated calculation variants and require a short explanation of why moving invalidation to obtain more size reverses the reasoning.

### 3. Make the setup earn eligibility

**Learning experience:** This lesson operationalizes eligibility through measurements, sources, timestamps, thresholds, pass/fail rules, and explicit behavior when data is missing. It treats no trade as a complete decision.

**Prior UX gap:** “Passing the lesson” could be mistaken for knowing a setup. The important competence is refusing eligibility when evidence is missing or stale, not memorizing a particular threshold.

**Implemented response:** The **Eligibility Gatekeeper** artifact requires two separated passes and explains that missing evidence producing a valid no-trade decision is part of mastery.

**Why the artifact is meaningful:** It recognizes restraint and measurable gates without incentivizing ticket submission. The exact requirement is stable across accessibility preferences and does not depend on market availability.

**Best future enhancement:** Populate a replay ticket with cursor-time spread, volume, extension, and source timestamps, then ask the learner to pass, fail, or mark each gate unknown.

### 4. Write the decision before the ticket

**Learning experience:** The lesson builds an auditable decision card and distinguishes playbook quality, plan quality, and adherence before outcome is known. That distinction is one of the curriculum's most important defenses against hindsight.

**Prior UX gap:** A finished card could look like mastery even when its playbook evidence was weak. The old completion signal did not identify which kind of quality the learner had evaluated.

**Implemented response:** The **Decision Card Builder** artifact requires two separated passes. Its purpose names the three independent judgments so learners can understand the evidence the badge represents.

**Why the artifact is meaningful:** The title has identity, while the criterion remains literal. It rewards an auditable pre-trade process and can be earned entirely with historical or paper scenarios.

**Best future enhancement:** Add a decision-card comparison view that keeps the pre-reveal version immutable beside the later outcome and review.

### 5. Choose the order by its failure mode

**Learning experience:** The lesson avoids declaring one order type “best.” It asks which uncertainty and failure mode the plan can tolerate, and it surfaces ticket semantics that vary by broker and session.

**Prior UX gap:** Order mechanics are easy to recognize in prose but harder to transfer under changed liquidity, spread, gaps, partial fills, and extended-hours rules.

**Implemented response:** The **Failure-Mode Reader** artifact requires two separated passes. The purpose describes judgment under consequences rather than rewarding speed or a supposedly sophisticated order type.

**Why the artifact is meaningful:** It validates choosing behavior by tolerated failure, including the decision not to submit. It does not claim current Fidelity ticket semantics are permanently fixed.

**Best future enhancement:** Build an interactive fill simulator with partial-fill, gap-through, thin-book, and session-eligibility cases. Broker-specific facts should link to currently verified documentation.

### 6. Make the next decision independent

**Learning experience:** The reset updates realized, open, and remaining risk; names emotional state without inventing motives; demands fresh context and trigger evidence; and makes ending the session legitimate.

**Prior UX gap:** This lesson teaches a subtle behavioral skill that generic completion obscured. It is also especially vulnerable to harmful gamification if an app rewards more trades, daily streaks, or rapid re-entry.

**Implemented response:** The **Independent Mind** artifact requires two separated lesson dates and explicitly recognizes rebuilding evidence and risk between decisions after wins, losses, and missed trades.

**Why the artifact is meaningful:** It supports autonomy and self-regulation. No trade and stop-for-the-day outcomes advance the learning exercise just as validly as a hypothetical trade.

**Best future enhancement:** Add a paper-session reset checkpoint that must be completed before another simulated order, with an always-available “end session responsibly” path.

### 7. Score process and preserve uncertainty

**Learning experience:** The lesson separates evidence completeness, playbook validity, plan quality, risk compliance, execution adherence, outcome, and review completeness. It also teaches the limitations of small, selected samples.

**Prior UX gap:** Review can feel like administration, and a badge could easily distort it into box-checking. The desired competence is epistemic restraint: score only what the evidence supports and avoid turning a tiny sample into a conclusion.

**Implemented response:** The **Uncertainty Steward** artifact requires two separated passes. Its purpose names the separation among evidence, process, outcome, and samples.

**Why the artifact is meaningful:** It recognizes quality of interpretation, not profitability. The learning achievement remains separate from descriptive profitability badges, which award no XP.

**Best future enhancement:** Let journal analytics expose sample size, missing fields, and cost assumptions beside every aggregate, with drill-down to the supporting records.

### 8. Run the complete no-click replay

**Learning experience:** The capstone integrates the entire decision chain across six varied outcome-hidden cases, locks reasoning before reveal, preserves original answers, and routes weak dimensions back to focused practice.

**Prior UX gap:** One capstone pass could still reflect short-term familiarity. A normal two-date artifact would understate the breadth and transfer expected from a true capstone.

**Implemented response:** The **Replay Integrator** artifact requires four separated passes. It is a Diamond capstone, not another routine completion badge. Its `0/4` through `4/4` progress remains visible and exact.

**Why the artifact is meaningful:** Four dates match the curriculum design's minimum of 24 cases. The requirement tests sustained integration without a continuous streak and without requiring real money or live market access.

**Best future enhancement:** Draw randomized, tagged chart cases from a local bank and score locked decision records with a published rubric and remediation map.

## Cross-lesson achievement curve

The lesson artifacts sit inside a broader learning portfolio:

| Achievement                  | Type               | Evidence recognized                                           |
| ---------------------------- | ------------------ | ------------------------------------------------------------- |
| First Deliberate Pass        | Milestone          | One complete attempt-feedback-correction-reflection loop      |
| Correction Courage           | Mastery            | At least one honestly identified and written reasoning repair |
| Decision-Chain Atlas         | Collection         | One deliberate pass through all eight core lessons            |
| Return With Evidence         | Persistence        | Three core lessons practiced on at least two dates each       |
| Reasoning That Returned      | Mastery            | Four spaced lessons with 100% best first-try objective checks |
| Eight named lesson artifacts | Mastery / Capstone | Separated evidence for each specific judgment                 |
| Process Constellation        | Capstone           | All eight lesson-specific artifacts                           |

Entry recognition is intentionally light. Stretch achievements award no extra XP where an external reward could become controlling. The system's main value is the durable evidence label, exact progress, and personal history.

## UX changes driven by the critique

1. The core path shows each lesson's named artifact and exact separated-date progress.
2. Every built-in lesson briefing explains the artifact's purpose before practice begins.
3. The completion screen distinguishes artifact advanced, earned, and retained states.
4. Every result links to a detail page with purpose, exact criteria, type, tier, version, progress, local history, and the next relevant action.
5. The achievement vault can filter by category, tier, and achievement type, searches requirements and purpose, and shows current versus target values rather than percentage alone.
6. The “closest milestone” recommendation excludes profitability achievements so outcome never becomes the app's suggested behavioral goal.
7. Hidden achievements show a healthy-behavior hint while preserving the exact surprise trigger. No essential curriculum progress is hidden.
8. Legacy mastery records migrate to one dated evidence record, so existing learners keep credit without receiving unearned spacing.

## Reliability and fairness checks

- Unlock state is persistent: once earned, later edits cannot silently revoke an artifact.
- Progress is deduplicated by local calendar date.
- Stored dates and cumulative correction counts are validated at the state boundary.
- Achievement criteria carry a version field for future migrations.
- Existing saved lesson mastery migrates conservatively.
- Reduced motion, plain language, keyboard use, and alternate visual presentation do not change eligibility.
- All achievements remain attainable offline with built-in lessons and local data.

## Remaining risks

- A best-ever first-try percentage is evidence of a clean pass, not proof of long-term retention. The `Reasoning That Returned` label is therefore paired with a spacing requirement, but a future system should also retain per-date retrieval evidence.
- Local calendar dates can change when system time or time zone changes. This is acceptable for a private, noncompetitive learning app, but should be documented if cloud sync is introduced.
- Lesson artifact visuals currently share a system style. Unique illustrated artwork could improve memory, but should be added only after the meanings and criteria remain stable.
- Custom imported lessons do not receive built-in mastery artifacts because their criteria and quality vary. They retain the same attempt-feedback-reflection player but remain clearly labeled as external content.
- Relatedness and social achievement types are intentionally absent. Any future sharing should be opt-in and process-focused; global leaderboards would conflict with the product's responsible learning goals.

## Acceptance standard

The revision succeeds when a learner can answer, before beginning any core lesson:

1. What judgment am I practicing?
2. Why does it matter?
3. What will I do during this pass?
4. What exact evidence is stored?
5. What remains before the lesson-specific artifact is earned?

After completion, the learner should remember the decision experience represented by the artifact—not merely the icon or XP amount.
