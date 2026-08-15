# Trading Journal product design

Status: current for v0.36.0. This document distinguishes implemented behavior from advanced enhancements.

## Product principle

The Journal is a local-first performance laboratory. It rewards complete evidence, pre-trade planning, risk discipline, emotional awareness, and thoughtful review. It must never turn trade count, time in market, profit, streak preservation, or achievement collection into pressure to trade.

## 1. Product structure and navigation

In the default lesson-guided workspace, primary navigation is **Lessons**, **Progress**, and **Settings**. A lesson opens the Journal with its evidence mission and a direct return path. Learners who enable **Show tools separately** in Settings also receive standalone Plan, Journal, and Chart navigation without changing or duplicating data.

Journal has six task-oriented sections:

1. Overview — performance snapshot, interactive chart, records, recommendations, and activity feed.
2. Evidence inbox — recursive Trading Records scan, Orders reconstruction, chart pairing, day-level coverage, and privacy-safe external-AI journal handoff.
3. Trades — manual capture, searchable records, reviewable journal drafts, decision replay, notes, screenshots, and tags.
4. Calendar — monthly/yearly P&L calendar, daily drill-down, filters, and process heatmap.
5. Patterns — weekly/monthly summaries and breakdowns by asset, strategy, setup, direction, session, weekday, and time.
6. Goals — process-based goals for reflection, planning, risk adherence, focus, and daily-loss boundaries.

Achievements are a dedicated vault reached from Progress. Each achievement has its own URL and detail page.

After a validated external-AI draft import, **Lessons → Trade Lessons** provides a separate newest-to-oldest learning surface. It preserves the Journal as the factual/reflection record while auditing lesson quality, separating hindsight, connecting recurring mechanisms, and routing the learner into a focused Decision Card, replay, or learning exercise.

## 2. Main dashboard layout

- Header: Journal purpose, Evidence inbox, chart handoff, one-file import fallback, and manual-entry fallback.
- Sticky Journal section navigation.
- Time-range control: day, week, month, quarter, year, all.
- Four primary KPIs: net P&L, win rate, expectancy, and maximum drawdown.
- Performance laboratory: equity, period P&L, drawdown, cumulative return, and win-rate modes.
- Secondary analytics: realized reward:risk, profit factor, plan coverage, and rule adherence.
- Evidence-based recommendations and personal records.
- Activity timeline for trades and completed reflections.

## 3. Calendar and process heatmap

Monthly calendar cells show date, net P&L, trade count, win rate, reflection completion, and notable behavior. Positive and negative results use separate semantic colors plus text; color is never the only signal. Selecting a day opens its trades.

Year view shows twelve comparable month summaries and drills into a month. Filters support asset and reflected-only views.

The 52-week heatmap can encode P&L, activity, journal completion, or discipline. Rest days and no-trade days are neutral and never break a streak. Every cell has a keyboard-accessible label and native tooltip containing the date and metrics.

## 4. Charts and analytics

Essential charts:

- Period P&L bars.
- Cumulative equity curve.
- Peak-to-trough drawdown.
- Cumulative return using the user’s analytics starting balance.
- Period win rate.

Essential metrics:

- Net/gross P&L, win rate, average win/loss, realized reward:risk, profit factor, expectancy, maximum drawdown, cumulative return, reflection rate, plan coverage, and rule adherence.
- Breakdowns by symbol, strategy, setup, direction, market session, weekday, and time of day.
- Weekly and monthly summaries with best/worst recorded trades, sample quality, and process coverage.

All calculations are descriptive, local, and deterministic. Missing risk data produces an unavailable value instead of an invented estimate.

## 5. Achievement and progression system

The vault contains tiered Bronze, Silver, Gold, Platinum, and Diamond achievements across:

- Journaling
- Consistency
- Discipline
- Risk management
- Emotional control
- Strategy mastery
- Profitability evidence
- Long-term improvement

Profitability achievements are badge-only and require reviewed samples; they award no XP. Hidden achievements reward a good loss, candid mistake correction, calm reflection after a loss, and consecutive risk adherence. Hidden requirements remain concealed until earned.

Each detail page includes category, tier, progress, transparent requirement, reward, safety framing, local unlock date, and completion history. Rest days never break consistency milestones. XP comes from process evidence rather than trade frequency.

## 6. Key flows

### Fidelity import

Place dated Orders and chart CSVs under the selected `Trading_Records/` root → the portable app detects or scans the root recursively → apply Fidelity's dollar-buy/share-sell interpretation → reconstruct and deduplicate completed positions → pair chart sessions by New York date and symbol → review unresolved evidence → open an exact day/symbol chart replay or continue to journal drafting.

### External-AI journal draft

Scan Trading Records → create a sanitized evidence JSON package locally → explicitly upload it to an AI chosen by the learner → paste the app's bounded request → save the AI's response JSON → import it → validate package identity, trade identity, evidence references, confidence, non-diagnostic mental-state rules, and prohibited live-trading directives → choose drafts → import only into incomplete reflections → generate newest-to-oldest Trade Lessons locally → compare every hypothesis and revised lesson against personal memory → explicitly save the reflection.

No automatic upload occurs. The package excludes Fidelity account columns, credentials, screenshots, and absolute file paths. A returned strategy or mental-state statement is labeled as an AI hypothesis, does not overwrite learner-authored text, cannot replace a completed reflection, and never becomes a clinical diagnosis or a claimed memory.

### Post-trade reflection

Open an unreviewed entry → inspect execution snapshot → classify strategy/setup → record market context, entry/exit reason, focus, confidence, emotions, mistakes, strengths, correction, and lesson → complete pre/post checklists → attach sanitized screenshots → save → analytics, goals, XP, and achievements update.

### Calendar drill-down

Choose month/year → filter asset or reflection state → select a populated date → inspect trades → open the chosen trade’s decision replay.

### Process goal

Choose a behavior → set weekly/monthly target → view current evidence → complete through normal review behavior → archive when no longer useful.

## 7. Desktop and mobile UX

Desktop uses a wide chart stage, four-column KPIs, two-column insight areas, and a seven-column calendar. Narrow layouts collapse KPIs and summaries, keep Journal tabs compact, scroll wide charts/calendars safely, stack reflection fields, and preserve import/add actions near the top. The Windows desktop remains the supported production target; responsive behavior protects resized and touch-capable Windows layouts rather than claiming a separate mobile application. All controls use native keyboard order, visible focus states, descriptive labels, and reduced-motion preferences.

## 8. Microinteractions and feedback

- Chart values update on hover or keyboard focus.
- Range and metric changes animate only the changed chart geometry.
- Calendar cells raise slightly on hover and show a clear selected state.
- Progress bars transition once after evidence changes and never loop.
- Achievement unlock feedback is celebratory but brief; no confetti loops, countdowns, loss aversion, or urgency.
- Empty states explain the next evidence-building action without encouraging a trade.
- Import states distinguish scanning, parsing, warnings, duplicates, success, and unsupported records.
- All animation honors reduced-motion settings.

## 9. Additional feature ideas

- Native screenshot library with annotation and automatic account-number redaction.
- Chart-data import for candle-by-candle replay with entry, exit, stop, and decision annotations.
- No-trade decision journal so restraint and avoided rule violations become visible evidence.
- Session shutdown ritual when the daily-loss boundary is reached.
- Tag taxonomy manager to merge duplicates and preserve stable analytics.
- Exportable weekly review document with selected screenshots and process goals.
- Rule templates per strategy and setup.
- Offline encrypted backup and optional user-controlled sync.
- Accessibility presets for high contrast, larger charts, and simplified analytics.

## 10. Prioritized implementation plan

### Essential — implemented in the current release

- Five-section Journal navigation and responsive dashboard.
- Range-aware performance charts and core metrics.
- Asset/strategy/setup/direction/session/day/time breakdowns.
- Monthly/yearly calendar, daily drill-down, and four-mode heatmap.
- Deterministic summaries and personalized recommendations.
- Process goals and progress tracking.
- Trade reflection expansion, checklists, screenshots, tags, emotions, confidence, mistakes, and replay timeline.
- Tiered achievement vault, hidden achievements, unlock history, and detail pages.
- Accessibility, dark mode, reduced motion, mobile layouts, and polished empty states.
- Newest-to-oldest trade lesson audits with preserved originals, temporal evidence lanes, pattern synthesis, knowledge hierarchy, rules, checklist, focus plan, and Markdown export.

### Advanced enhancements

1. Persist screenshots as encrypted native attachments rather than compact in-state images.
2. Link a reflection to a saved candle-visible decision snapshot with annotations and provenance.
3. Add a no-trade and session-shutdown journal.
4. Add dashboard widget ordering and per-widget visibility.
5. Add PDF/HTML weekly review exports.
6. Add user-controlled encrypted sync and multi-device restore.
7. Add options, multi-leg, position-flip, and partial-fill reconciliation after dedicated validation engines exist.
