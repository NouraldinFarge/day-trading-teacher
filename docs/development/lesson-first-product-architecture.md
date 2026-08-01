# Lesson-first product architecture

## Product decision

Lessons are the primary information architecture. Planning, charting, paper trading, journaling, analytics, Fidelity imports, and focused drills are practice workspaces used by lessons—not competing destinations learners must understand before they can begin.

The default navigation therefore contains:

1. **Lessons** — curriculum, the next spaced practice, connected workspaces, custom lesson import, and the full deliberate-practice path.
2. **Progress** — durable practice evidence, achievements, activity rhythm, and mastery artifacts.
3. **Settings** — workspace mode, learning preferences, Fidelity companion settings, local data, and privacy.

The root route and `/learn` both open the lesson workspace so launching the application always starts with learning context.

## Two workspace modes

### Lesson-guided mode (default)

- Plan, Journal, and Charts are removed from primary navigation.
- They remain fully available from the lesson practice hub, lesson briefings, completion handoffs, and quick actions.
- Each workspace displays a lesson-context banner, a concise learning purpose, and a direct return to Lessons.
- The top-bar action is **Continue lesson**.
- Routes and persisted data remain unchanged, which preserves old bookmarks and exports.

### Standalone feature navigation

- Enabled in Settings with **Show tools separately**.
- Adds Plan, Journal, and Charts to primary navigation.
- Removes lesson-context banners from those pages and restores standalone page language.
- The top-bar action becomes **New plan**.
- The setting changes presentation and navigation only. It never migrates, copies, deletes, or resets records.

## Lesson-to-workspace contract

Every built-in lesson must map to at least three feasible workspaces. Each
mission must declare its phase, the specific task, the evidence artifact to
produce, and a sensible activity checkpoint. Features are not forced into a
lesson when they do not strengthen its objective.

| Lesson | Prepare | Apply | Reflect |
| --- | --- | --- | --- |
| Reconstruct before you judge | Evidence Journal | Chart Replay | Recall deck |
| Know the account before the setup | Decision Card | Expectancy Lab | Evidence Journal |
| Set the loss boundary first | Risk Sandbox | Chart Replay | Decision Card |
| Make the setup earn eligibility | Chart Replay | Decision Card | Decision drill |
| Write the decision before the ticket | Plan Coach | Decision Card and Chart Replay | Evidence Journal |
| Choose the order by its failure mode | Chart Replay | Decision drill and Decision Card | Evidence Journal |
| Make the next decision independent | Journal Patterns | Decision drill and Chart Replay | Decision Card |
| Score process and preserve uncertainty | Evidence Journal | Chart Replay and Decision Card | Expectancy Lab |
| Run the complete no-click replay | Recall deck | Chart Replay and Decision Card | Evidence Journal |

The mapping lives in `src/domain/lesson-workspaces.ts` and is covered by an
automated contract test. Known included imported lessons receive tailored
evidence missions; other imports infer conservative missions from validated
skill IDs. New lessons should not ship with generic links such as “open tool”;
a handoff must name the evidence or behavior the learner should produce.

Imported plans stay grouped by plan with sequence, progress, version, origin,
prerequisites, source provenance, practice-quality notes, and one plan-level
removal action. The external generation guideline is curriculum version 5.0.
It asks for 7–9 purposeful activities and 2–3 objective checks per lesson while
naming the evidence each app workspace can support. Local validation reports
instructional quality warnings separately from schema and safety validity.

## Resumable lesson handoffs

Workspace handoffs are available in the lesson briefing, at selected optional
activity checkpoints, and after reflection. Before navigation, the app stores a
bounded session snapshot containing the lesson ID, activity, revealed feedback,
objective-check state, written attempt, and correction state. The destination
shows the lesson mission and evidence target. **Resume lesson** consumes the
snapshot and restores the modal at the exact activity.

The snapshot uses browser-session storage only, expires after four hours, and is
cleared when the lesson is deliberately closed. It is not part of portable
state, exports, mastery evidence, analytics, or achievement calculations.

## UX principles

- **Context before controls:** a learner sees why a workspace is relevant before encountering its forms and charts.
- **Focus during retrieval:** activity checkpoints appear only after a relevant explanation or attempt, remain explicitly optional, and preserve the learner's place so tool use does not become a penalty.
- **One source of truth:** guided and standalone views reuse the same routes, records, calculations, and components.
- **Reversible personalization:** the mode switch is safe, visible, and reversible; data is never coupled to navigation.
- **No engagement pressure:** workspaces support practice and reflection without rewarding trade frequency, screen time, speed, position size, or continuous streaks.
- **Local-first boundaries:** lesson responses remain session-only, resumable handoffs expire, app records remain local, Fidelity interaction remains manual, and custom ChatGPT lessons remain external-file imports.

## Validation requirements

Before release, verify both modes at desktop and 420 px widths:

- correct navigation destinations and active state;
- ordered lesson mission maps, optional activity checkpoints, evidence targets, and exact-place resume;
- lesson-specific Journal view and Learning Lab tool selection;
- six-area Decision Card fields and lesson provenance;
- guided banners and return paths on Plan, Journal, and Chart;
- absence of guided banners in standalone mode;
- mode persistence after saving Settings;
- no horizontal page overflow;
- keyboard-operable switch, links, modal dismissal, and quick actions;
- zero console warnings or errors;
- existing plans, trades, market data, achievements, and progress unchanged after mode switching.
