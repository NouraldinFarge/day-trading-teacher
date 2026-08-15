# Documentation hub

This directory explains the current Day-Trading Teacher product, its safety boundaries, and the implementation decisions behind it. Start with the current documents below; the development records are retained to show how the system evolved and should not be mistaken for the latest specification.

## Start here

| Question | Document |
| --- | --- |
| What is the product and how do I review it quickly? | [Repository overview](../README.md) |
| How do the desktop, web, Rust, state, curriculum, and release layers fit together? | [Architecture overview](architecture/overview.md) |
| Why are Lessons the center of the interface? | [Lesson-first product architecture](development/lesson-first-product-architecture.md) |
| How does the Journal define metrics, calendars, goals, and safe gamification? | [Trading Journal product design](trading-journal-product-design.md) |
| How do Trading Records become externally generated, reviewable journal drafts without embedded AI? | [External-AI journal workflow](external-ai-journal-workflow.md) |
| How are the original trade lessons audited newest-to-oldest and consolidated without inventing intent? | [Trade-derived learning system](trade-derived-learning-system.md) |
| How are external lesson plans created and imported without embedded AI? | [External lesson-plan workflow](development/lesson-plan-import.md) |
| What are the application and financial-safety boundaries? | [Security policy](../SECURITY.md) |
| What is planned—and explicitly not planned? | [Roadmap](../ROADMAP.md) |

## Current reference

| Area | Purpose | Status |
| --- | --- | --- |
| [Architecture](architecture/overview.md) | Current runtime layers, trust boundaries, data flow, and repository map | Current |
| [Lesson-first product model](development/lesson-first-product-architecture.md) | Navigation modes, workspace contracts, resumable handoffs, and UX invariants | Current |
| [Trading Journal design](trading-journal-product-design.md) | Implemented information architecture, analytics, calendars, achievements, and future enhancements | Current |
| [External-AI journal workflow](external-ai-journal-workflow.md) | Redacted evidence packaging, response validation, mental-state limits, and review-before-apply behavior | Current |
| [Trade-derived learning system](trade-derived-learning-system.md) | Per-trade lesson audit, temporal evidence lanes, cross-trade patterns, rules, checklists, and deliberate-practice focus | Current |
| [External lesson-plan workflow](development/lesson-plan-import.md) | JSON authoring, local validation, quality review, approval, and provenance | Current |
| [Curriculum v7 integration](curriculum-v7-integration.md) | Learner-safe normalization and deliberate exclusion of facilitator material | Current audit record |
| [Stock Day Trading source integration](audits/stock-day-trading-source-integration.md) | Full-media audit, feature mapping, exclusions, source identities, and removal gate | Current audit record |
| [Dependency audit](dependency-audit.md) | Latest JavaScript and Rust advisory analysis for the published release | Current audit record |
| [Product media](images/README.md) | Screenshot provenance, privacy rules, social preview source, and refresh checklist | Current |

## Historical implementation records

These documents preserve the reasoning that led to the current system. Counts, version labels, and “remaining” recommendations describe the named milestone, not necessarily the current release.

| Record | What it captures |
| --- | --- |
| [Core curriculum v3 critique](development/curriculum-v3-lesson-critique.md) | Transition from participation-style completion to correction, transfer, and evidence |
| [Curriculum 4.0 assessment integrity](development/curriculum-v4-assessment-integrity.md) | Answer-position balance, realistic distractors, rubrics, account boundaries, and capstone controls |
| [Achievement-guided lesson critique](development/achievement-guided-lesson-critique.md) | Lesson-specific mastery artifacts, spacing, fairness, and non-coercive recognition |

## Repository policy and operations

- [Contributing](../CONTRIBUTING.md) — issue-first workflow, privacy expectations, verification, and review checklist.
- [Security](../SECURITY.md) — supported version, private reporting, trust boundaries, and safe evidence handling.
- [Dependency policy](../DEPENDENCY_POLICY.md) — update cadence, immutable Action pins, and exception requirements.
- [Changelog](../CHANGELOG.md) — release-by-release behavior changes.
- [Portable end-user guide](../release/PORTABLE-README.txt) — launch, storage, backup, Fidelity, and educational boundaries for the ZIP release.

## Documentation rules

1. Distinguish current behavior, historical record, and planned work explicitly.
2. Link a claim to code, a test, or a release artifact when a reviewer may reasonably ask for proof.
3. Use only synthetic or fully redacted screenshots and examples; never publish credentials, account identifiers, order histories, journal entries, or secure assessment material.
4. Keep the no-signals, no-orders, external-AI-only, and historical-data limitations visible wherever an integration is described.
5. Run `npm run docs:check` before publishing. It verifies local Markdown targets, image alternatives, media dimensions, and release-version references.
