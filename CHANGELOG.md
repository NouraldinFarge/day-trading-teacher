# Changelog

## 0.32.4 — 2026-08-01

- Publish verified release assets from the workflow's explicit GitHub repository context.

## 0.32.3 — 2026-08-01

- Track the portable launcher and end-user README required by clean GitHub release runners.
- Publish the verified workflow and Rust maintenance build with its Windows ZIP, checksum, SBOM, and provenance attestation.

## 0.32.2 — 2026-08-01

- Publish the verified workflow and Rust maintenance build under a fresh immutable release tag.
- Include the portable Windows ZIP, SHA-256 checksum, SPDX SBOM, and provenance attestation.

## 0.32.0 — 2026-07-27

- Added GitHub CI, CodeQL, dependency updates, private security reporting guidance, an explicit portfolio-review license, and contributor workflows.
- Replaced one-buy/one-sell Fidelity pairing with position-level reconstruction that supports multiple entry fills and partial exits while preserving stable IDs for previously supported single-fill imports.
- Added explicit reconciliation confidence, fill counts, quantity-unit provenance, unresolved-quantity reporting, and a clearer local import preview instead of silently forcing ambiguous Fidelity dollar/share interpretations.
- Expanded the Fidelity export inbox to scan dated subfolders, process up to 100 recent supported exports oldest-first, deduplicate executions across copied exports, and keep individual malformed files from blocking the rest of the inbox.
- Added automatic chart-symbol detection for Fidelity-style filenames such as `DFNS (...)`, making the symbol field an optional override instead of a prerequisite.
- Added chart-window matching for imported journal positions, first/last timestamp and continuity summaries, supplemental study-column detection, and a visible evidence bridge between the chart and matching journal records.
- Verified the upgraded reconciliation against all three supplied Fidelity Orders exports: 22 completed positions reconstructed with high confidence.

## 0.31.0 — 2026-07-26

- Integrated the learner-safe Evidence to Execution v7.1.1 curriculum as a second reviewed bundled plan with 16 lessons, 1,245 minutes, 152 activities, 48 objective checks, 20 registered skills, and 11 open-practice cases.
- Added a purpose-written “why this matters” rationale for every v7 lesson so the opening guidance explains the decision value instead of repeating imported objectives.
- Added schema, type, state-validation, and lesson-reader support for multi-date time models, delayed retention, fresh-form remediation, delivery schedules, mastery evidence, assessment-administration controls, curriculum boundaries, and programs longer than 90 minutes.
- Added explicit learner/facilitator security explanations throughout plan review, the imported-plan library, lesson briefings, and portable documentation.
- Removed a learner-visible capstone blueprint that exposed secure case outcome classes and added web/native validation that rejects facilitator-only outcome, decision, scoring-key, answer-key, and reveal fields.
- Bundled the open practice bank, glossary, accessible visual examples, worksheets, and the normalized import file under portable `assets/curriculum-v7` while intentionally excluding secure assessment packets and scoring keys.
- Debounced local state persistence, retained the newest dirty state after a failed write, added bounded automatic retry with visible status, and added an explicit retry action instead of disabling autosave for the remainder of the session.
- Added curriculum provenance and normalization documentation, expanded curriculum regression coverage, and synchronized the source, desktop, native, lockfile, and release version identities.

## 0.30.0 — 2026-07-22

- Reworked the curriculum from participation-based practice into a measurable learning system: every core and included lesson now declares first-try, unseen-case, successful-case, four-dimension rubric, retention-date, and remediation requirements.
- Added a complete account-and-regulation unit covering settled cash, current intraday-margin implementation, broker house requirements, costs, tax and suitability boundaries, and broker-specific fractional-share execution, with dated FINRA sources visible in the lesson.
- Balanced authored correct-answer positions across all 27 core and 24 included-plan checks, randomized displayed choice order for every new lesson attempt, and replaced giveaway distractors with realistic professional errors.
- Expanded the core path from eight to nine lessons, 72 activities, and 27 objective checks, with a ninth process-only mastery artifact for verifying account boundaries.
- Reclassified the eight included lessons as explicit advanced extensions of the relevant core lessons, raised the plan to version 3.0 and 270 focused minutes, and required harder six-case transfer evidence.
- Split the planning lesson and both capstones into bounded sessions; capstones now distinguish instruction, independent performance, and review so worked examples cannot count as transfer evidence.
- Added a responsive mastery scorecard that distinguishes guided completion from independent standard, records only standard-qualified artifact dates, preserves legacy achievements conservatively, and resumes assessment order, cases, and rubric state across lesson handoffs.
- Updated the external ChatGPT authoring guideline to curriculum version 5.0 with balanced answers, plausible distractors, quantitative rubrics, extension links, and session blocks for long lessons.
- Completed hands-on dark-mode QA of the briefing, correction loop, shuffled choices, account-specific sources, fractional execution check, and mastery scorecard at desktop and 420 px with no browser warnings or horizontal overflow.

## 0.29.1 — 2026-07-22

- Verify a selected portable or source ZIP against its single registered SHA-256 before activation or historical-source restoration, stopping on missing, duplicate, malformed, or mismatched checksum records.
- Detect an incomplete `node_modules` tree using required build-tool sentinels and rerun the locked dependency restore, allowing the one-click build to recover safely after an interrupted first install.

## 0.29.0 — 2026-07-22

- Rebuilt the double-click build launcher around a semantic-version inventory covering the current workspace source, historical source ZIPs, immutable portable ZIPs, and the extracted active build.
- Added a clear interactive menu that builds or activates the newest available version by default, lets the user select any discovered version, targets the current workspace directly, or performs a read-only inventory check.
- Reuses and validates an existing portable ZIP instead of overwriting it, builds the current workspace only when needed, and can restore and build a selected historical source ZIP inside an isolated temporary workspace.
- Added explicit downgrade confirmation, safe refusal for unavailable or active-only versions, transactional release registration, isolated-build cleanup, and unchanged data/config migration through the existing active-build deployment path.
- Added non-interactive flags for automation and forwarded command-line options through `BUILD-LATEST.bat` while preserving the readable paused result window for double-click use.

## 0.28.0 — 2026-07-21

- Reworked the chart entry around the active lesson mission. A compact outcome-hidden coach now names the pause, decision, and evidence-return steps for timeline reconstruction, execution friction, eligibility, invalidation, re-entry independence, stop-work boundaries, and general replay practice.
- Moved provider credentials and automatic data acquisition behind an explicit Data sources control in lesson-guided mode, so the current dataset and chart practice appear before setup work while every free, account-included, CSV, and one-minute route remains available.
- Added a session-only Evidence ready handoff to Decision Card, Chart Replay, Evidence Journal, and Learning Lab. Learners can explicitly mark the named artifact ready, resume the exact lesson state, and see what evidence should be compared with the lesson reasoning.
- Replaced the repeated generic lesson-purpose copy with 16 authored, decision-specific rationales covering every core lesson and every lesson in the included imported plan. Newly imported lessons retain a safe objective-based fallback.
- Expanded the three shorter core lessons—evidence reconstruction, eligibility, and re-entry independence—to eight purposeful activities each, adding conflicting-clock reconciliation, threshold recalibration, and fresh-evidence practice. Core curriculum 3.2 now contains 64 activities and 24 objective checks.
- Added enforceable quality contracts for all eight core and all eight bundled imported lessons: eight unique activities, retrieval, explanation, worked example, application, transfer, commitment, at least three mastery criteria, and exactly three objective checks.
- Hardened the Windows development workflow by using Vite's runner-based config loader for builds and tests, avoiding temporary config-file contention while retaining the same production output.
- Deeply exercised chart acquisition disclosure, dataset controls, replay, drawing and display tools, paper practice, lesson-specific guidance, imported and core briefings, uncertainty recovery, evidence marking, exact-session resume, and dark-mode visual hierarchy.

## 0.27.0 — 2026-07-21

- Rebuilt imported lessons as plan-scoped curricula instead of a flat card collection. Every plan now keeps its sequence, version, author, imported date, progress, total time, activity and check counts, target skills, prerequisites, declared sources, and file fingerprint together.
- Expanded the included Deliberate Execution plan from 118 to 208 focused minutes and from 43 to 64 activities, with three reasoning-based objective checks in every lesson for 24 checks overall.
- Added tailored Prepare → Apply → Reflect evidence routes for all eight included imported lessons. Six lessons use all four app workspaces, the evidence lesson uses the three relevant workspaces, and every mission names its purpose, expected artifact, and in-lesson checkpoint.
- Added imported-plan quality analysis that reports missing objective checks, retrieval, application, target-skill coverage, or sources separately from schema and safety validity.
- Expanded the local import review with plan author/version, total time, activities, checks, declared source count, and a lesson-by-lesson preview of inferred Decision Card, Chart Replay, Evidence Journal, and Learning Lab practice.
- Added an optional included-plan review flow and a visible v2 update action for the previously installed v1 plan. Updates still require explicit local approval, replace only the matching plan ID, retain stable lesson IDs and prior practice records, and never enable runtime AI.
- Updated the external ChatGPT authoring guideline to curriculum version 4.1 with 7–9 purposeful sections, 2–3 objective checks per lesson, and artifact-aware guidance for every feasible app workspace.
- Added imported-plan provenance inside lesson briefings, moved removal to one plan-level action, added repeat-practice and best-first-try status, and lazy-loaded the expanded plan and library to protect initial lesson-page performance.
- Deeply exercised the included-plan install, grouped library, source review, lesson briefing, Journal handoff, exact-position resume, written comparison, optional chart checkpoint, wrong-answer correction, and successful retry in dark mode.

## 0.26.0 — 2026-07-21

- Expanded all eight core lessons to curriculum version 3.1 with one new cross-feature application activity and objective check per lesson, raising the path to 24 objective checks and 215 focused minutes.
- Reworked lesson tool links into ordered Prepare → Apply → Reflect missions with a concrete evidence artifact, a relevant app destination, and three or four feasible workspace missions for every built-in lesson.
- Added optional hands-on checkpoints inside focused lessons. Moving into Decision Card, Chart Replay, Evidence Journal, or Learning Lab now preserves the current activity, written attempt, revealed reasoning, correction state, and objective-check progress for the current app session.
- Added lesson-aware workspace banners with an evidence target and Resume lesson action; the Evidence Journal opens the relevant Trades or Patterns view, while Learning Lab opens the lesson-specific Risk, Expectancy, Decision, Plan, or Recall tool.
- Added skill-based workspace inference for imported lessons so compatible custom lessons participate in the same cross-app learning system instead of receiving generic or missing handoffs.
- Expanded the Decision Card from four to six readiness areas with an objective trigger, execution behavior, partial/no-fill response, exit architecture, time-based failure, and saved lesson provenance.
- Added explicit lessons on journal-to-chart evidence reconciliation, cross-app risk order, fail-closed eligibility, execution and exit architecture, partial-fill audits, stop-work boundaries, targeted remediation, and the complete four-workspace capstone chain.
- Preserved the responsible engagement boundary: app checkpoints are optional, no trade is required, free-text lesson work remains session-only, and no progress depends on P&L, frequency, speed, or position size.
- Verified resumable lesson handoffs, lesson-specific Lab routing, the six-area Decision Card, dark-mode desktop layouts, and 420 px lesson and planning layouts; the frontend suite now contains 99 passing tests.

## 0.25.0 — 2026-07-21

- Recentered the entire application on Lessons: the app now opens on the lesson workspace, the default navigation contains only Lessons, Progress, and Settings, and the primary top-bar action continues learning instead of opening an isolated plan form.
- Moved planning into the guided learning system as the Decision Card workspace, with explicit lesson context, a return-to-lessons path, auditable eligibility and risk evidence, and the existing safe Fidelity Trader+ manual handoff.
- Added a connected practice hub for Decision Card, Chart Replay, Evidence Journal, and Learning Lab so learners can see how every major app capability supports the curriculum before opening it.
- Connected every core lesson to at least two purpose-specific practice workspaces; lesson briefings and completion states now offer contextual applications for planning, chart replay, paper trading, Fidelity evidence, journaling, analysis, risk drills, or recall.
- Added a Settings switch for standalone feature navigation. Enabling it exposes Plan, Journal, and Charts as separate destinations; disabling it restores lesson-guided navigation without deleting, moving, duplicating, or resetting saved data.
- Reframed planning, charting, and journaling pages dynamically: lesson-guided mode explains the learning purpose and offers a return path, while standalone mode retains direct professional workspace language and navigation.
- Reworked quick actions for both modes, added responsive three-item and six-item navigation, refined desktop and 420 px layouts, and fixed a hidden switch input that could create horizontal overflow.
- Added migration and restore validation for the workspace preference plus a complete lesson-to-workspace contract test; the full frontend suite now contains 96 passing tests.
- Completed hands-on dark-mode QA of the lesson home, lesson briefing, Decision Card handoff, mode switching, standalone navigation, Settings controls, and compact layouts with zero browser warnings or errors.

## 0.24.0 — 2026-07-21

- Applied the supplied achievement-system research to a second, lesson-by-lesson UX critique focused on meaning, legibility, appropriate challenge, fairness, reliability, autonomy, and non-controlling recognition.
- Added eight named mastery artifacts—Evidence Cartographer, Boundary Architect, Eligibility Gatekeeper, Decision Card Builder, Failure-Mode Reader, Independent Mind, Uncertainty Steward, and Replay Integrator—whose exact purpose and criteria are visible inside the linked lesson.
- Required lessons one through seven to record deliberate practice on two different local dates and the capstone on four dates; same-day repetition counts once, rest days never erase progress, and no learning artifact depends on P&L, live trades, trade count, position size, speed, or a continuous streak.
- Added six cross-curriculum milestones for first deliberate practice, honest correction, complete path exploration, spaced return, retained objective reasoning, and the complete lesson-artifact set, while keeping stretch recognition badge-only instead of using XP as pressure.
- Reworked the learning path and lesson player to show exact artifact progress before practice, explain why the evidence matters, and distinguish advanced, earned, and retained artifact states after reflection.
- Expanded the achievement vault with Learning as a category; Milestone, Mastery, Exploration, Persistence, Collection, Capstone, and Surprise types; exact current/target values; purpose-and-requirement search; a type filter; useful empty states; healthy-behavior hints for surprises; and profitability-neutral recommendations.
- Expanded achievement detail pages with purpose, criteria version, exact local evidence, relevant next actions, and explicit safeguards against frequency, size, and streak pressure.
- Added distinct practice-date and cumulative-correction persistence with strict boundary validation and conservative migration from existing mastery records.
- Added automated coverage for same-day deduplication, spaced lesson evidence, capstone requirements, cumulative corrections, legacy migration, and visible lesson-artifact progress; the full suite now contains 92 passing tests.
- Added a durable achievement-guided critique documenting the response and remaining content, replay, broker-specific, and privacy boundaries for every lesson.

## 0.23.0 — 2026-07-21

- Reworked all eight core lessons against the supplied lesson-by-lesson audit and evidence-based learning guideline while preserving the process-first evidence → risk → eligibility → plan → execution → reset → review sequence.
- Replaced participation-only completion with an error-correction loop: objective checks provide constraint-specific retry feedback, guided responses require comparison, identified gaps require a written repair, and advancement waits for feedback review.
- Added 16 lesson-specific objective checks covering partial fills and weighted-average price, combined risk, timestamped eligibility evidence, plan quality versus adherence, order failure modes, independent resets, small-sample uncertainty, and outcome-hidden transfer.
- Deepened each lesson individually with partial fills, cancellations, replacements, fees, conflicting timestamps, planned-versus-realized risk, correlated/open exposure, operational eligibility thresholds, playbook validation, broker-specific execution behavior, physiological resets, seven-axis review, and cost-aware sample analysis.
- Expanded the capstone from three self-selected decisions to six varied, outcome-hidden cases per pass and four spaced passes, creating a 24-case evidence target with locked responses, fixed reveal windows, separate scoring dimensions, and remediation.
- Added compact local mastery records for lesson version, pass count, first-try checks, completed corrections, and best result while keeping lesson free-text responses session-only.
- Corrected lesson XP feedback to include the confidence-reflection award when it is actually earned and surfaced deliberate-pass history in the learning path without describing completion as permanent mastery.
- Improved dark and light lesson presentation, responsive objective choices, feedback states, comparison controls, correction fields, mastery summaries, and mobile layouts.
- Fixed activity and stage transitions retaining the previous modal scroll position, removed a redundant disabled reveal control from objective checks, and made an explicit uncertainty response enter the correction path instead of allowing a false “matched” claim.
- Added a durable lesson-by-lesson critique and future-work boundary document, expanded imported lesson validation for optional objective checks, and retained the non-AI runtime and external ChatGPT import workflow.

## 0.22.0 — 2026-07-21

- Reworked pointer inspection and drag panning to commit at most once per animation frame, eliminating raw-event render storms while keeping crosshair price and candle context responsive.
- Removed the individual hover and click handler from every candle through delegated hit testing, memoized stable candle geometry and expensive indicator/comparison paths, and kept the wheel listener stable across inspection renders.
- Added horizontal trackpad panning, reduced wheel latency, and improved pointer-anchored zoom so the exact candle beneath the pointer remains the anchor when regular-session compression is active.
- Fixed saved regular-session preferences incorrectly hiding daily charts, excluded hidden extended-hours bars from study scales and measurement counts, and prevented hidden drawing anchors from rendering at misleading fallback positions.
- Made Indicator, Event, and Display menus mutually exclusive; prevented Space on a focused trade marker from toggling chart replay; and improved displayed-session time-axis cadence.
- Sharpened the visual system with non-scaling SVG strokes, geometric rendering, larger price/time/study labels, a dedicated selected-candle outline, an explicit grab cursor, and stronger drawing-tool keyboard focus.
- Added regression coverage for coalesced pointer inspection, daily-chart session safety, horizontal trackpad panning, delegated candle selection, exclusive menus, and marker keyboard isolation.
- Repeated hands-on dark-mode QA across focused and standard layouts, all chart styles and lower studies, fine zoom, panning, scale and display settings, event and indicator menus, drawings, measurement, markers, and keyboard controls.

## 0.21.0 — 2026-07-21

- Reworked chart inspection so pointer movement maps directly to the nearest plotted candle, the selected bar receives a precise full-height highlight and close marker, and every candle exposes timestamp, OHLC, and volume detail.
- Made journal, simulation, and paper-trade markers directly inspectable by click, Enter, or Space with visible hover and keyboard-focus feedback.
- Corrected regular-session filtering to compress visible candles across the full chart width, navigate only plotted bars, and report the inspection position against displayed rather than hidden extended-hours bars.
- Fixed compact intraday interval recognition for values such as `1m`, `5 min`, and `1 hour`, restoring one-minute axis labels and the extended-hours control.
- Improved dark- and light-theme crosshair contrast, prevented crosshair and last-price labels from overlapping, and strengthened candle hover and selection feedback without obscuring price structure.
- Corrected focus-mode toolbar sizing so wrapped Replay, Paper trade, and Focus controls remain visible and usable at constrained widths.
- Added semantic Indicator and Event menu controls plus regression coverage for pointer tracking, candle detail, marker keyboard access, regular-session compression, one-minute recognition, and displayed-bar navigation.
- Repeated hands-on QA across all 100 visible candles, granular zoom, keyboard inspection, styles, studies, overlays, display controls, drawings, replay, templates, paper trading, trade markers, and dark/light presentation.

## 0.20.0 — 2026-07-21

- Rebuilt the chart into a compact Fidelity Trader+–inspired workspace with a market-style instrument header, dense navigation, separate Indicators and Events menus, display settings, a left-edge drawing dock, and clearer feed, replay, paper, and session context.
- Added four persistent chart templates—Price action, Trend structure, Momentum focus, and Risk review—that restore chart style, visible bars, overlays, lower study, scaling, crosshair, grid, high/low labels, and extended-hours preferences across launches.
- Added hollow candles, linear and logarithmic price scales, optional grid and high/low labels, intraday extended-hours shading or regular-session-only filtering, and independent normalized symbol comparison for datasets with shared timestamps.
- Improved inspection with a six-part context ribbon, dedicated comparison and scale legends, more precise accessible chart descriptions, compact responsive controls, a mobile-friendly horizontal drawing dock, and no-op behavior when an already-selected chart style is clicked.
- Made the paper-trading workbench collapsible so traders can return to the full chart without ending a local session, while retaining all safeguards, future-hidden replay state, chart levels, and local-only execution boundaries.
- Corrected full-screen focus sizing so the candle canvas and lower studies no longer extend beneath timeline, zoom, and inspection controls; verified templates, MACD, hollow candles, paper mode, persistence, and responsive behavior in the running app.
- Added deterministic tests for chart templates, New York regular-session classification, exact-timestamp comparison normalization, display customization, comparison rendering, migration, and strict saved-state validation.

## 0.19.0 — 2026-07-21

- Added a persistent, local historical paper-trading account with future-hidden replay, market and limit entries, next-bar fills, configurable slippage and fees, buying-power checks, required protective stops, optional targets, and one-position-at-a-time discipline.
- Added process-first guardrails: risk-sized share suggestions, per-trade risk ceilings, a session loss lock, conservative stop-first handling for ambiguous bars, explicit end-session confirmation, and clear separation from Fidelity or any live brokerage account.
- Added live paper-account equity, realized and open P&L, remaining loss capacity, closed-trade drawdown, win rate, expectancy, profit factor, session history, and a timestamped decision tape.
- Added paper entry/exit markers and pending-entry, position, stop, and target levels directly on the chart, with accessible labels and persistent session recovery.
- Expanded lower chart studies with MACD 12/26/9 and ATR 14 alongside volume and RSI, including dedicated scaling and polished light/dark presentation.
- Improved desktop and mobile order-ticket layouts, recent-session visibility, price input correctness, responsive account metrics, responsible onboarding, and explicit simulation limitations.
- Added deterministic paper-execution, risk-control, session-finalization, MACD, state-validation, migration, and interaction coverage, plus a full browser-verified queue → fill → close → review workflow.

## 0.18.0 — 2026-07-21

- Rebuilt Chart & Backtest into a professional review workstation with denser market context, adaptive axes, high/low and prior-close references, precise pointer pricing, accessible OHLCV inspection, and a dedicated lower-study pane.
- Added EMA 9, session-aware VWAP, Bollinger Bands, ATR 14, RSI 14, relative volume, directional volume, independent overlay controls, and reusable deterministic indicator calculations.
- Added future-hidden bar replay with one-bar stepping, play/pause, 1×/2×/4× speeds, explicit reveal-all control, and keyboard operation so strategy review cannot see unrevealed candles.
- Added two-point trend lines, faster price-level and measurement workflows, direct zoom controls, 25/50/100/200/400 presets, timeline/zoom/inspection sliders, line and candle modes, and retained fine pointer-anchored wheel zoom.
- Improved full-screen focus, touch behavior, responsive tool wrapping, horizontally pannable mobile charts, visual hierarchy, empty states, reduced-motion compatibility, and concise interaction guidance.
- Added deterministic analytics tests plus expanded chart interaction coverage and verified indicator layering, replay progression, two-percent zoom, desktop focus, and compact rendering.

## 0.17.2 — 2026-07-18

- Replaced large preset-to-preset wheel jumps with fine, roughly two-percent increments across a 10–800 bar zoom range while retaining 50/100/200/400-bar buttons for quick navigation.
- Preserved the candle beneath the pointer through every fine zoom step and kept the surrounding page stationary during wheel input.
- Reproduced repeated gestures in the browser: 100 → 98 → 96 → 98 bars retained the selected September 2 candle at 108.59 while page scroll position remained unchanged.

## 0.17.1 — 2026-07-18

- Corrected chart-wheel handling shown in the July 18 screen recording so a zoom gesture over the plot no longer scrolls the surrounding page.
- Anchored wheel and preset zoom to the candle under the pointer or current inspector selection, preserving the same timestamp and price as the visible bar count changes.
- Added wheel-input throttling for controlled one-step zoom, updated the interaction guidance, and added a regression test for cancelled page scrolling and retained chart context.
- Reproduced the reported gesture in the browser: zooming from 100 to 50 bars retained the selected September 2 candle at 108.59 while page scroll position remained unchanged.

## 0.17.0 — 2026-07-18

- Added a dedicated Learning Lab with deterministic risk and expectancy sandboxes, six process-decision scenarios, a seven-point plan-quality coach, and a 12-card spaced concept-recall deck.
- Added confidence-aware lesson scheduling that prioritizes due retrieval, separates low-confidence reviews, introduces new lessons only when appropriate, and recommends stopping when spacing is more useful than repetition.
- Combined lesson and lab activity in the learning calendar and study-practice summary while deliberately withholding XP, profit-style rewards, and trade-count incentives from tool use.
- Rebuilt the historical chart as a polished review workspace with candle and line styles, 50/100/200/400-bar presets, scroll zoom, drag pan, keyboard inspection, a precision crosshair, OHLCV change readouts, configurable overlays, and responsive navigation.
- Added focus mode, price-and-time measurement, review price levels, improved volume and moving-average presentation, journal and simulation visibility controls, accessible instructions, and a readable horizontally pannable mobile plot.
- Connected the Learning Lab to Learn, Progress, the practice calendar, routing, and quick actions; added safe state migration and validation for practice history and recall scheduling.
- Added deterministic learning-tool and scheduling coverage, chart interaction tests, desktop and compact browser verification, formatting, type checks, full frontend tests, production build checks, Rust linting, and Rust tests.

## 0.16.0 — 2026-07-18

- Hardened local data persistence with queued saves, atomic native writes, a recoverable previous-state backup, browser fallback recovery, clear failure feedback, and a fresh-state reset that cannot silently reuse stale memory.
- Added complete schema validation and size limits for restored backups, lesson plans, Fidelity CSVs, chart CSVs, numeric fields, OHLC bars, dates, watchlists, and image references before imported data can replace working records.
- Rebuilt journal screenshot handling to accept only safe raster formats, reject extreme dimensions and oversized files, resize and compress attachments locally, and cap both attachment count and stored payload size.
- Corrected analytics trust issues so reflected-only calendars, reflection XP, achievement history, and risk-discipline percentages use only the evidence they claim to measure.
- Improved form and recovery behavior with clearer invalid-number guidance, bounded percentage goals, duplicate-goal prevention, safe destructive-action confirmation, invalid-route recovery, and readable restore previews.
- Strengthened keyboard and assistive-technology support with stable modal focus, focus trapping, semantic progress bars and insight tables, lower calendar tab-stop density, accurate pressed-state controls, and clearer disabled states.
- Fixed compact Progress-page overflow, raised the native app's supported minimum to 420 pixels, improved small-text legibility and mobile controls, and verified all primary routes at desktop and compact sizes in persistent dark mode.
- Added frontend formatting enforcement, stricter Rust linting to the production gate, targeted regression tests for validation, persistence-related analytics, modal focus, achievements, and image safety, and updated the only safe patch-level dependency.

## 0.15.0 — 2026-07-18

- Rebuilt automatic chart acquisition around four clearly labeled sources: Massive, Alpaca Basic, Tradier Brokerage, and Alpha Vantage, with Massive selected by default for free consolidated historical one-minute backtests.
- Added native daily and one-minute downloads for Massive, Alpaca, and Tradier while preserving Alpha Vantage compatibility; provider responses are normalized into the same local OHLCV format used by chart replay and backtesting.
- Added feed, freshness, session, adjustment, and provider provenance to every downloaded dataset so IEX, consolidated, delayed, and premium sources are never presented as interchangeable.
- Made every automatic watch provider-bound, including safe migration of legacy Alpha Vantage watches, provider-specific refresh schedules, and same-symbol comparisons without silent source replacement.
- Added local provider-specific credential storage with Alpaca secret support, export exclusion, sanitized errors, bounded response handling, legacy-key compatibility, and one-click credential removal through local-data erasure.
- Added a Fidelity-specific one-minute path explaining when Active Trader Pro Classic chart CSV can be imported and why Fidelity order-history exports cannot reconstruct candles.
- Improved the chart acquisition onboarding, free-access labels, responsive watchlist, empty states, safety language, and dark-mode coverage, including window-level color-scheme application that prevents light startup and overscroll flashes.
- Added deterministic native coverage for provider response normalization and expanded frontend coverage for provider-specific dataset IDs, subscriptions, migration, and refresh behavior.

## 0.14.0 — 2026-07-18

- Added native one-minute OHLCV acquisition through Alpha Vantage's documented intraday endpoint, alongside the existing daily acquisition path.
- Added an interval selector, distinct daily and one-minute datasets for the same symbol, clear premium-access guidance, provider-aware badges, and independent watchlist controls.
- Added separate automatic schedules: daily series remain limited to one check every 24 hours, while watched one-minute series are checked every 30 minutes while the app is open.
- Interpreted Alpha Vantage's offset-free intraday timestamps as New York market time so charts stay correct on this Central-time installation, including daylight-saving changes.
- Preserved legacy daily watchlists and refresh history through state migration, retained the five-series safety limit, and kept every downloaded dataset available offline for chart replay and backtesting.
- Added automated coverage for stable interval-specific dataset IDs, same-symbol multi-interval watches, subscription limits, New York timestamp conversion, and v0.13 state migration.

## 0.13.0 — 2026-07-18

- Added credential-safe automatic chart acquisition through Alpha Vantage’s official daily OHLCV endpoint, using a user-supplied API key and the latest 100 daily bars per symbol.
- Added a five-symbol chart watchlist with one-click download, stable dataset replacement, manual refresh, and automatic refresh no more than once every 24 hours while the app is open.
- Stored the provider key separately in the portable `config/` directory so it is excluded from app-state exports, hidden from the interface after saving, preserved with the portable folder, and removed by Erase Everything.
- Added sanitized provider, connectivity, symbol, format, size, and request-limit error handling without exposing the saved key or raw provider response.
- Added responsive acquisition onboarding, watchlist controls, clear offline/no-key states, local refresh history, and provider-aware dataset badges across dark and light themes.
- Added state migration and automated coverage for stable provider datasets, symbol validation, bounded watchlists, provider-key validation, CSV response acceptance, and provider-error sanitization.

## 0.12.0 — 2026-07-18

- Added a local-first Chart & Backtest workspace for importing up to 20,000 historical OHLCV bars, inspecting candlesticks and volume, and viewing journaled trades in market context.
- Added a transparent moving-average crossover simulator with long, short, and combined directions; configurable capital, risk, stop, reward, slippage, and fees; and next-bar execution to prevent look-ahead bias.
- Added zoom, pan, bar inspection, moving-average overlays, simulated entry/exit markers, auditable trade logs, drawdown, expectancy, profit factor, win-rate, cumulative-return, and ending-balance results.
- Added conservative stop-first handling for bars that touch both stop and target, clearly labeled synthetic practice data, local dataset deletion, and explicit limitations that distinguish historical simulation from prediction.
- Connected chart replay to Today, Journal, and quick actions; added a responsible Historical Context achievement; improved mobile layouts, dark-mode presentation, accessibility labels, feedback, and empty-state onboarding.
- Added shared quoted-CSV parsing, state migration for existing installs, and automated coverage for OHLCV import, timeframe inference, sizing, no-look-ahead execution, conservative ambiguous-bar handling, and legacy stored data.
- Corrected native number-field increments that could silently block valid default back-test assumptions.

## 0.11.0 — 2026-07-17

- Connected Today, Learn, Plan, Journal, and Progress with one state-aware learn → plan → record → reflect workflow that never requires trading to advance.
- Added a keyboard-accessible quick-actions palette and clearer route context so the next useful destination is always close at hand.
- Reworked trade reflection into a focused three-prompt flow with optional deep review, visible completion guidance, and responsible reflection-first recommendations.
- Added plan-readiness evidence, required eligibility and no-trade conditions, and a live audit checklist before a plan can be saved.
- Improved journal terminology, reflection queues, progress recommendations, settings navigation, unsaved-change feedback, mobile layouts, and supporting-text readability throughout the app.
- Corrected reflection and pending-review counts so unreviewed trades are represented accurately on Today and Progress.

## 0.10.0 — 2026-07-17

- Rebuilt the core curriculum as eight deeper lessons across six deliberate phases: evidence literacy, risk and eligibility, decision planning, execution judgment, behavioral reset, and review and transfer.
- Made the improved lesson-plan guideline the curriculum contract: every lesson now combines retrieval, explanation or worked reasoning, independent practice, transfer or commitment, and observable mastery criteria.
- Moved factual reconstruction to the beginning of the path, added a complete no-click historical replay capstone, and made wait or no trade a successful decision when eligibility evidence fails.
- Added phase milestones, visible learning principles, current-phase guidance, remaining-time context, and open access to every lesson without artificial locks.
- Required an honest written attempt before advancing from a prompted activity, while providing an explicit “I’m not sure yet” path that preserves uncertainty without blocking learning.
- Corrected progress displays to count only lessons in the current built-in and imported libraries while preserving historical practice records and XP.
- Updated the external ChatGPT lesson request to curriculum version 4.0 while keeping lesson generation external, local import human-approved, and runtime AI disabled.

## 0.9.6 — 2026-07-17

- Added an eight-lesson deliberate-execution plan based on two Fidelity order exports and four Trader+ recordings, with account identifiers excluded and unknown intent labeled explicitly.
- Replaced the minimal external ChatGPT request with a strict, responsible lesson-authoring prompt aligned to the app's JSON schema, known skill registry, attempt-before-answer flow, and no-overtrading safeguards.
- Added automated validation for the personalized plan and external prompt contract while preserving the local, human-approved import model and keeping runtime AI disabled.
- Reworked the lesson-plan master document into a concise, parameterized, archive-first workflow with exact app limits, privacy controls, validation steps, and safe installation guidance.

## 0.9.5 — 2026-07-17

- Fixed portable releases opening `localhost:1420` by compiling the Tauri executable with its `custom-protocol` release feature so bundled frontend assets load offline.
- Added build preflight checks that reject a portable release when the native feature declaration or release command is missing.
- Kept `devUrl` limited to development while preserving the installer-free Cargo release workflow and root-level `active-build/` deployment.

## 0.9.4 — 2026-07-17

- Moved the single extracted portable app to the stable root-level `active-build/` directory with executable, launcher, version, and portable data folders directly inside it.
- Updated the build command to deploy through validated temporary storage, migrate `data/` and user configuration, and roll back safely if replacement fails.
- Returned `portable-builds/` to immutable ZIP-only storage and removed obsolete version-named extracted folders after successful deployment.

## 0.9.3 — 2026-07-17

- Made one matching versioned extracted app folder a required, validated output of every successful portable ZIP build.
- Updated the build command to migrate portable data and user configuration forward, then remove all older extracted folders.
- Kept historical ZIPs immutable and added the extracted folder name and latest-only policy to release metadata.

## 0.9.2 — 2026-07-17

- Removed an obsolete duplicate achievement gallery and its redundant test/CSS while retaining the expanded achievement vault.
- Reduced the Windows-only Tauri icon set to the single icon used by the portable executable.
- Moved original planning inputs into project documentation, removed stale duplicate release notes, and clarified generated-directory ownership.
- Expanded ignore rules for test coverage, tool caches, editor metadata, and operating-system clutter.
- Removed reproducible dependency, compiler, web-build, staging, cache, and log output from the clean source workspace after full validation.

## 0.9.1 — 2026-07-17

- Expanded source snapshots to include project-level archive, verification, restoration, architecture, and portability documentation in addition to the active workspace.
- Strengthened archive validation so a restored snapshot contains both the buildable workspace and the project-level recovery workflow.

## 0.9.0 — 2026-07-17

- Converted the application to a portable-only Windows release workflow; active build scripts no longer invoke or configure MSI, NSIS, MSIX, AppX, or setup targets.
- Added `BUILD-LATEST.bat` as the one-click portable build entry point with environment validation, tests, release compilation, staging, ZIP packaging, checksums, and structured metadata.
- Moved desktop-controlled state from the Windows application-data directory to `data/state.json` beside the executable.
- Added local `config`, `data`, `logs`, and `cache` directories at application startup so moving or renaming the extracted folder preserves application-controlled state.
- Added portable folder and ZIP validation that rejects installer artifacts and verifies required runtime files.
- Added source archive creation, verification, listing, and non-overwriting restoration scripts.
- Added the required root-level portable build, automation, documentation, shared-resource, checksum, and release-metadata responsibilities.

## 0.8.0 — 2026-07-16

- Redesigned the Journal as a five-part performance laboratory: Overview, Trade log, Calendar, Insights, and Goals.
- Added interactive daily, weekly, monthly, quarterly, yearly, and all-history performance ranges with P&L, equity, drawdown, cumulative-return, and win-rate charts.
- Added expectancy, realized reward:risk, profit factor, plan coverage, rule adherence, breakdowns by asset, strategy, setup, direction, session, weekday, and time of day, plus deterministic weekly and monthly observations.
- Added detailed month/year calendars, day drill-down, asset and reflection filters, and a one-year contribution heatmap for P&L, activity, journal completion, or discipline.
- Added process-based goals for reflection, planning, risk adherence, focus, reviews, and personal daily-loss boundaries without profit or trade-count quotas.
- Expanded the achievement vault to 41 milestones across eight categories and five tiers, including concealed positive-process achievements, rarity, rewards, requirements, progress, and local completion history.
- Added richer journal replay evidence: strategy, mistakes, lessons learned, confidence, pre/post checklists, notes, tags, emotions, and small local screenshot attachments.
- Added customizable dashboard widgets and spacing, responsive mobile navigation, accessible chart marks, polished empty states, and reduced-motion support.
- Corrected reflection analytics so unjournaled imports never count as completed reflections, and corrected the equity curve to show starting balance plus cumulative P&L.
- Added journal analytics and achievement integrity tests, bringing the automated suite to 24 passing tests.

## 0.7.0 — 2026-07-16

- Rebuilt Trades as a structured trading Journal with execution facts, reflections, emotions, focus rating, repeatable corrections, and pattern tags.
- Added local Fidelity Orders CSV parsing for filled long stock and ETF round trips, including dollar-order to fractional-share reconciliation, holding time, order path, duplicate detection, and import warnings.
- Added an opt-in Fidelity export inbox that scans the selected folder on Journal open and every 60 seconds while the page remains open.
- Added a native folder picker and a read-only scanner with canonical-path, file-type, file-size, and non-recursive safety boundaries.
- Added journal metrics for net result, win rate, reflection rate, and completion status while keeping outcome separate from decision quality.
- Changed XP and daily review missions so imported executions earn nothing until the user completes a decision-focused reflection.
- Expanded the achievement collection with Reflection Habit and Pattern Librarian milestones.
- Added importer tests covering Fidelity preambles, dollar-based buys, fractional exits, unsupported files, unmatched orders, and account-identifier exclusion.

## 0.6.0 — 2026-07-16

- Deeply reviewed three Fidelity Trader+ recordings and a 14-order export while excluding account identifiers from application content.
- Added seven detailed lessons tailored to the observed workflow, expanding the built-in curriculum from 3 to 10 lessons.
- Added dedicated instruction for dollar-versus-share ticket units, fractional fills, bid-ask spread, execution slippage, market/limit/stop/stop-limit behavior, volatility eligibility, exit architecture, deliberate re-entry resets, and order reconstruction.
- Added eight new registered curriculum skills across execution, planning, review, behavior, and market context.
- Added a complete opening briefing to every built-in and imported lesson: summary, practical purpose, time and skill scope, detailed activity route, mastery outcomes, and local-only privacy reminder.
- Added curriculum integrity tests requiring unique lesson IDs, registered skills, meaningful objectives, multi-stage practice, and mastery criteria.
- Kept the new curriculum educational and retrospective; it does not recommend a security, predict prices, automate orders, or infer motivation from execution records.

## 0.5.1 — 2026-07-16

- Fixed Fidelity Trader+ detection for the Microsoft packaged-app installation used on this computer.
- Added current-user, OneDrive, and public Desktop shortcut discovery.
- Confirmed compatibility with the installed Fidelity Trader+ Desktop shortcut and Windows App ID registration.

## 0.5.0 — 2026-07-16

- Converted the Windows executable to a GUI subsystem so startup no longer creates a terminal window.
- Added local Fidelity Trader+ Desktop detection and one-click launch with no hidden shell window.
- Added a privacy-first Fidelity setup area with installation status, recheck, official setup access, and a four-step companion workflow.
- Added manual Trader+ ticket checklists to every saved plan, including symbol, side, maximum quantity, entry, stop, target, risk, and pre-submission checks.
- Kept Fidelity credentials, account data, order entry, preview, confirmation, and final submission exclusively inside Fidelity.
- Expanded the learning calendar from 16 weeks to a full year with GitHub-style intensity squares, weekly goals, current rhythm, longest rhythm, month labels, and accessible day details.
- Expanded achievements from 10 to 19 across learning, consistency, retrieval, planning, review, risk discipline, and whole-process evidence.
- Added a closest-milestone spotlight, percentage ring, categories, richer rarity treatments, and exact requirement progress.
- Kept all rewards deterministic and independent from P&L, trade frequency, market activity, and random reinforcement.

## 0.4.0 — 2026-07-16

- Added five app-wide learning levels with transparent, deterministic process XP.
- Added a persistent level and XP indicator to the application header.
- Added three daily learning missions covering focused study, pre-trade planning, and process-first review.
- Added immediate XP feedback after lessons, saved plans, and completed reviews.
- Expanded the achievement system from six to ten achievements across learning, planning, review, repetition, reflection, and multi-day practice.
- Added Bronze, Silver, Gold, and Platinum achievement rarity tiers.
- Added exact requirement counters and progress bars to every locked achievement.
- Added richer earned-achievement treatments, level progress, hover feedback, and responsive mission layouts.
- Kept rewards independent from P&L, trade volume, securities, and live-market behavior.
- Explicitly excluded random rewards, streak punishment, artificial urgency, and other manipulative retention mechanics.

## 0.3.0 — 2026-07-16

- Added a recommended-focus learning-path hero and automatic next-lesson selection.
- Added cinematic lesson openings with session roadmaps, activity counts, skill targets, and privacy reassurance.
- Added phase-specific coaching cues for retrieval, explanation, examples, practice, transfer, and commitment.
- Added a required confidence reflection and mastery-target review before practice completion.
- Added an immersive completion celebration with session evidence and practiced skills.
- Added six behavior-based learning achievements that never reward P&L or trading frequency.
- Added a GitHub-style 16-week lesson-practice calendar with activity intensity, active-day count, and study-day streak.
- Added local migration support for confidence and calendar activity while preserving existing records.
- Moved external ChatGPT lesson-generation tools into a secondary, collapsible workflow so core learning remains the primary focus.

## 0.2.0 — 2026-07-16

- Added a guided, privacy-first first-run setup.
- Added Light, Dark, and Follow system appearance modes.
- Rebuilt lessons as focused, step-by-step practice sessions with progress, written attempts, answer gates, mastery checks, and completion feedback.
- Clarified the external ChatGPT lesson-request and local-import workflow.
- Added numbered planning stages, required-field guidance, save confirmations, and direct next actions.
- Added plan-to-trade autofill, clearer evidence scoring states, trade filtering, and improved empty states.
- Added safer dialogs with focus containment, Escape handling, focus restoration, and confirmation for destructive lesson removal.
- Improved mobile navigation, responsive dialogs, touch targets, text sizing, keyboard focus, screen-reader labels, and no-data progress reporting.
- Added preference validation, restore confirmation, and broader accessibility coverage.

## 0.1.0 — 2026-07-16

- Created the local-first React and Tauri application.
- Added learner preferences and visible risk guardrails.
- Added timestamped and optionally locked trade plans.
- Added deterministic position-size, P&L, and R-multiple calculations.
- Added manual completed-trade capture and process/outcome review.
- Added built-in lessons and practice completion tracking.
- Added external lesson-plan request export, local import validation, preview, approval, and rollback.
- Added local data export, restore, and deletion controls.
- Added browser-preview storage and Rust-owned desktop storage.
